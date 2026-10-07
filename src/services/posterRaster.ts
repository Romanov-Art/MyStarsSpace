/**
 * Renders the on-screen poster into a print-resolution canvas: the DOM capture
 * (background, texts, frames) at the export scale, with the compass frame and
 * the star map re-rendered at full resolution instead of upscaling the preview.
 * Shared by the PDF order and "Edit in Canva".
 */
import { getTheme } from '../config/themes.js';
import { getFrameForCompass } from '../config/frames.js';
import { renderStarMapToCanvas, drawPosterFrame } from '../components/PosterPreview.js';
import { zonedTimeToUtc } from '../core/timezone.js';
import type { City, PosterSize } from '../types/index.js';

export interface PosterRasterOptions {
  posterEl: HTMLElement;
  dpi: number;
  size: PosterSize;
  themeId: string;
  selectedCity: City;
  date: { day: number; month: number; year: number };
  time: { hours: number; minutes: number };
  layers: { constellationLines: boolean; constellationNames: boolean; milkyWay: boolean };
  starColors: boolean;
  gridStyle: 'hide' | 'flat' | 'spherical';
  compassStyle: 'none' | 'simple' | 'degrees' | 'cardinal';
  frameStyle: 'none' | 'line' | 'double' | 'border';
  locale: string;
  /**
   * Elements hidden in the capture (e.g. texts drawn as vector text in a PDF).
   * They keep their space, so everything else stays exactly where it was.
   */
  omit?: Set<Element>;
}

// Frame SVG text cache — avoids re-downloading the same frame on every export
const frameSvgCache = new Map<string, Promise<string>>();
function fetchFrameSvg(url: string): Promise<string> {
  let promise = frameSvgCache.get(url);
  if (!promise) {
    promise = fetch(url).then(r => {
      if (!r.ok) throw new Error(`Failed to fetch frame SVG: ${r.status}`);
      return r.text();
    });
    promise.catch(() => frameSvgCache.delete(url));
    frameSvgCache.set(url, promise);
  }
  return promise;
}

/** Pixel size of a poster at `dpi` (1 inch = 2.54 cm). */
export function posterPixels(size: PosterSize, dpi: number): { W: number; H: number } {
  return { W: Math.round((size.width / 2.54) * dpi), H: Math.round((size.height / 2.54) * dpi) };
}

export async function renderPosterRaster(o: PosterRasterOptions): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas');
  const { W, H } = posterPixels(o.size, o.dpi);
  const posterEl = o.posterEl;

  // Calculate scale factor: export pixel size / DOM element size
  const domRect = posterEl.getBoundingClientRect();
  const scale = Math.max(W / domRect.width, H / domRect.height);

  // Ensure all fonts are ready
  await document.fonts.ready;

  // html2canvas's ignoreElements removes nodes from layout, which would shift
  // the remaining text; tag omitted nodes and hide them in the clone instead
  const omitMark = `omit-${Math.random().toString(36).slice(2)}`;
  o.omit?.forEach((el) => el.setAttribute('data-raster-omit', omitMark));

  // Capture the poster DOM at high resolution
  const domCanvas = await html2canvas(posterEl, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    width: domRect.width,
    height: domRect.height,
    logging: false,
    // Ignore star canvas and frame SVG bg — we re-render both at full resolution
    ignoreElements: (el: Element) =>
      el.classList.contains('poster__starmap-canvas') ||
      el.classList.contains('poster__frame-bg'),
    onclone: (doc: Document) => {
      doc.querySelectorAll<HTMLElement>(`[data-raster-omit="${omitMark}"]`).forEach((el) => {
        el.style.visibility = 'hidden';
      });
    },
  }).finally(() => {
    o.omit?.forEach((el) => el.removeAttribute('data-raster-omit'));
  });

  // Create final export canvas at exact print dimensions
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = W;
  exportCanvas.height = H;
  const ctx = exportCanvas.getContext('2d')!;

  const theme = getTheme(o.themeId);

  // Opaque background first: JPEG has no alpha — any transparent pixels
  // left by the DOM capture would otherwise turn black
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, W, H);

  // Draw the DOM capture (contains texts, frames, background at exact layout)
  ctx.drawImage(domCanvas, 0, 0, W, H);

  // Now overlay the star map at full export resolution.
  // The chosen wall-clock time is interpreted as LOCAL time of the city.
  const exportDateTime = zonedTimeToUtc(
    o.date.year, o.date.month, o.date.day, o.time.hours, o.time.minutes, o.selectedCity.timezone,
  );

  // Find the star map container position relative to poster
  const starmapContainer = posterEl.querySelector('.poster__starmap-container') as HTMLElement;
  if (starmapContainer) {
    const mapRect = starmapContainer.getBoundingClientRect();
    // Star map is always square — use min dimension to guarantee
    const mapDomSize = Math.min(mapRect.width, mapRect.height);
    const mapX = Math.round((mapRect.left - domRect.left) * scale);
    const mapY = Math.round((mapRect.top - domRect.top) * scale);
    const mapSize = Math.round(mapDomSize * scale);

    // Draw the SVG frame at full resolution
    const frameUrl = `/${getFrameForCompass(o.compassStyle).filename}`;
    const svgText = await fetchFrameSvg(frameUrl);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    const frameSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(new Error(`Failed to load frame SVG: ${e}`));
      img.src = svgDataUrl;
    });

    if (theme.frameFilter !== 'none') {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = mapSize;
      tmpCanvas.height = mapSize;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(frameSvg, 0, 0, mapSize, mapSize);
      const imgData = tmpCtx.getImageData(0, 0, mapSize, mapSize);
      const d = imgData.data;

      const needsInvert = theme.frameFilter.includes('invert');
      const brightnessMatch = theme.frameFilter.match(/brightness\(([^)]+)\)/);
      const brightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;

      for (let i = 0; i < d.length; i += 4) {
        if (needsInvert) {
          d[i] = 255 - d[i];
          d[i + 1] = 255 - d[i + 1];
          d[i + 2] = 255 - d[i + 2];
        }
        if (brightness !== 1) {
          d[i] = Math.min(255, d[i] * brightness);
          d[i + 1] = Math.min(255, d[i + 1] * brightness);
          d[i + 2] = Math.min(255, d[i + 2] * brightness);
        }
      }
      tmpCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tmpCanvas, mapX, mapY, mapSize, mapSize);
    } else {
      ctx.drawImage(frameSvg, mapX, mapY, mapSize, mapSize);
    }

    // Render star map at FULL export resolution (crisp, no upscaling blur)
    const starCanvas = await renderStarMapToCanvas(
      mapSize, o.selectedCity, exportDateTime, o.themeId,
      o.layers, o.starColors, o.gridStyle, o.compassStyle, o.locale,
    );
    ctx.drawImage(starCanvas, mapX, mapY, mapSize, mapSize);
  }

  // Poster frame border (rendered on canvas for print-quality export)
  drawPosterFrame(ctx, W, H, o.frameStyle, theme.background);
  return exportCanvas;
}
