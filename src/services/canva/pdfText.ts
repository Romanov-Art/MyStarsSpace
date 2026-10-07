/**
 * Pure helpers for the vector-text layer of the "Edit in Canva" PDF.
 * DOM measurement lives in editablePdf.ts; everything here is testable in Node.
 */

export interface CharBox {
  ch: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TextLine {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** [first, last] Unicode code point ranges, sorted and non-overlapping. */
export type Ranges = [number, number][];

const isSpace = (ch: string) => /\s/.test(ch);

/**
 * Group per-character boxes (in DOM order) into the visual lines the browser
 * wrapped them into. A new line starts when a character sits clearly lower
 * than the current line. Whitespace collapses to single spaces and is trimmed
 * at line edges, as in CSS `white-space: normal`.
 */
export function groupLines(chars: CharBox[]): TextLine[] {
  const lines: CharBox[][] = [];
  for (const c of chars) {
    const current = lines[lines.length - 1];
    const anchor = current?.find((x) => !isSpace(x.ch)) ?? current?.[0];
    if (!current || (anchor && c.top - anchor.top > anchor.height * 0.5 && !isSpace(c.ch))) lines.push([c]);
    else current.push(c);
  }
  const out: TextLine[] = [];
  for (const line of lines) {
    let text = '';
    for (const c of line) text += isSpace(c.ch) ? (text.endsWith(' ') ? '' : ' ') : c.ch;
    const visible = line.filter((c) => !isSpace(c.ch));
    if (!visible.length) continue;
    const first = visible[0];
    const last = visible[visible.length - 1];
    out.push({
      text: text.trim(),
      left: first.left,
      top: Math.min(...visible.map((c) => c.top)),
      width: last.left + last.width - first.left,
      height: Math.max(...visible.map((c) => c.height)),
    });
  }
  return out;
}

/** True when every non-whitespace code point of `text` is in `ranges`. */
export function covers(text: string, ranges: Ranges): boolean {
  for (const ch of text) {
    if (isSpace(ch)) continue;
    const cp = ch.codePointAt(0)!;
    let lo = 0;
    let hi = ranges.length - 1;
    let found = false;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (cp < ranges[mid][0]) hi = mid - 1;
      else if (cp > ranges[mid][1]) lo = mid + 1;
      else {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

/** The poster text uses weights 400 and 500; the PDF fonts exist for exactly those. */
export function pdfWeight(cssWeight: string | number): 400 | 500 {
  const w = typeof cssWeight === 'number' ? cssWeight : Number(cssWeight) || (cssWeight === 'bold' ? 700 : 400);
  return w >= 450 ? 500 : 400;
}

/** '"Cormorant Garamond", serif' → 'Cormorant Garamond' */
export function firstFamily(fontFamily: string): string {
  return fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
}

export function applyTextTransform(text: string, transform: string, lang?: string): string {
  if (transform === 'uppercase') return text.toLocaleUpperCase(lang || undefined);
  if (transform === 'lowercase') return text.toLocaleLowerCase(lang || undefined);
  if (transform === 'capitalize') return text.replace(/(^|\s)(\S)/gu, (_, sp: string, c: string) => sp + c.toLocaleUpperCase(lang || undefined));
  return text;
}

/** 'rgb(1, 2, 3)' / 'rgba(1, 2, 3, 0.5)' / 'rgb(1 2 3 / 50%)' → [1, 2, 3] */
export function parseRgb(color: string): [number, number, number] | null {
  const m = color.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  return m ? [Math.round(Number(m[1])), Math.round(Number(m[2])), Math.round(Number(m[3]))] : null;
}

/** CSS px on the on-screen poster → PDF points on the printed page. */
export function pxToPt(px: number, mmPerPx: number): number {
  return (px * mmPerPx * 72) / 25.4;
}
