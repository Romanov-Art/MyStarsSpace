/**
 * Builds the "Edit in Canva" PDF: the poster artwork as one full-page image
 * plus every poster text as real text in an embedded font, positioned where
 * the browser laid it out. Canva's Design Import turns those into editable
 * text boxes. Text the PDF fonts can't render (e.g. CJK, Arabic — not in our
 * font files) stays baked into the image instead, so it still looks right.
 */
import { renderPosterRaster, type PosterRasterOptions } from '../posterRaster.js';
import {
  applyTextTransform, covers, firstFamily, groupLines, parseRgb, pdfWeight, pxToPt,
  type CharBox, type Ranges, type TextLine,
} from './pdfText.js';

interface FontEntry { file: string; ps: string; ranges: Ranges }
interface Manifest { families: Record<string, Record<string, FontEntry>> }

const TEXT_SELECTOR = '.poster__phrase, .poster__subtitle-line';
// Canva imports are capped (and the KV hand-off at 24 MB): stay well under
const MAX_PDF_BYTES = 22 * 1024 * 1024;
const DPI_STEPS = [300, 200, 150];

let manifestPromise: Promise<Manifest> | null = null;
function loadManifest(): Promise<Manifest> {
  manifestPromise ??= fetch('/fonts/pdf/manifest.json').then((r) => {
    if (!r.ok) throw new Error(`PDF font manifest: HTTP ${r.status}`);
    return r.json() as Promise<Manifest>;
  });
  manifestPromise.catch(() => { manifestPromise = null; });
  return manifestPromise;
}

async function fontBase64(file: string): Promise<string> {
  const r = await fetch(`/fonts/pdf/${file}`);
  if (!r.ok) throw new Error(`PDF font ${file}: HTTP ${r.status}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Per-code-point boxes of an element's text, in DOM order. */
function charBoxes(el: HTMLElement): CharBox[] {
  const out: CharBox[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    let i = 0;
    for (const ch of text) {
      range.setStart(node, i);
      range.setEnd(node, i + ch.length);
      i += ch.length;
      const r = range.getClientRects()[0];
      if (r) out.push({ ch, left: r.left, top: r.top, width: r.width, height: r.height });
    }
  }
  return out;
}

/** Distance from a line box's top to its baseline, using the browser's own font metrics. */
function ascentPx(cs: CSSStyleDeclaration): number {
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return ctx.measureText('Hg').fontBoundingBoxAscent;
}

interface VectorText {
  el: HTMLElement;
  cs: CSSStyleDeclaration;
  font: FontEntry;
  fontName: string;
  lines: TextLine[];
}

export interface EditablePdf {
  blob: Blob;
  /** Text elements that stay editable in Canva */
  editableTexts: number;
  /** Text elements baked into the image (font lacks their script) */
  bakedTexts: number;
  dpi: number;
}

export async function buildEditablePdf(raster: Omit<PosterRasterOptions, 'dpi' | 'omit'>): Promise<EditablePdf> {
  const [manifest, { jsPDF }] = await Promise.all([loadManifest(), import('jspdf')]);
  await document.fonts.ready;
  const lang = document.documentElement.lang;

  // Decide per text element: vector (editable) or baked into the image
  const vector: VectorText[] = [];
  let baked = 0;
  for (const el of raster.posterEl.querySelectorAll<HTMLElement>(TEXT_SELECTOR)) {
    const cs = getComputedStyle(el);
    const lines = groupLines(charBoxes(el)).map((l) => ({ ...l, text: applyTextTransform(l.text, cs.textTransform, lang) }));
    if (!lines.length) continue;
    const family = firstFamily(cs.fontFamily);
    const weight = pdfWeight(cs.fontWeight);
    const font = manifest.families[family]?.[String(weight)];
    if (!font || !covers(lines.map((l) => l.text).join(''), font.ranges)) {
      baked += 1;
      continue;
    }
    // The PostScript name ends up as the PDF BaseFont, which Canva uses to match its own font
    vector.push({ el, cs, font, fontName: font.ps, lines });
  }
  const omit = new Set<Element>(vector.map((v) => v.el));

  const widthMM = raster.size.width * 10;
  const heightMM = raster.size.height * 10;
  const posterRect = raster.posterEl.getBoundingClientRect();
  const mmPerPx = widthMM / posterRect.width;

  const fontData = new Map<string, Promise<string>>();
  for (const v of vector) if (!fontData.has(v.font.file)) fontData.set(v.font.file, fontBase64(v.font.file));

  for (const dpi of DPI_STEPS) {
    const canvas = await renderPosterRaster({ ...raster, dpi, omit });
    const pdf = new jsPDF({
      orientation: widthMM > heightMM ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMM, heightMM],
      compress: true,
    });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, widthMM, heightMM);

    const registered = new Set<string>();
    for (const v of vector) {
      if (!registered.has(v.fontName)) {
        pdf.addFileToVFS(v.font.file, await fontData.get(v.font.file)!);
        pdf.addFont(v.font.file, v.fontName, 'normal');
        registered.add(v.fontName);
      }
      pdf.setFont(v.fontName, 'normal');
      pdf.setFontSize(pxToPt(parseFloat(v.cs.fontSize), mmPerPx));
      const [r, g, b] = parseRgb(v.cs.color) ?? [0, 0, 0];
      pdf.setTextColor(r, g, b);
      const charSpace = (parseFloat(v.cs.letterSpacing) || 0) * mmPerPx;
      const ascent = ascentPx(v.cs);
      for (const line of v.lines) {
        pdf.text(line.text, (line.left - posterRect.left) * mmPerPx, (line.top + ascent - posterRect.top) * mmPerPx, {
          baseline: 'alphabetic',
          charSpace,
        });
      }
    }

    const blob = pdf.output('blob');
    if (blob.size <= MAX_PDF_BYTES || dpi === DPI_STEPS[DPI_STEPS.length - 1]) {
      return { blob, editableTexts: vector.length, bakedTexts: baked, dpi };
    }
  }
  throw new Error('unreachable');
}
