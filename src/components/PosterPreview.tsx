import React, { useRef, useEffect, useMemo, useState } from 'react';
import { t, type Locale } from '../i18n/index.js';
import { getTheme } from '../config/themes.js';
import { getDefaultFrame } from '../config/frames.js';
import { getLocalSiderealTime } from '../core/astronomy.js';
import { equatorialToHorizontal, stereographicProjection } from '../core/coordinates.js';
import type { City, StarData } from '../types/index.js';

interface PosterPreviewProps {
  themeId: string;
  locale: Locale;
  selectedCity: City;
  date: { day: number; month: number; year: number };
  time: { hours: number; minutes: number };
  layers: { constellationLines: boolean; constellationNames: boolean; milkyWay: boolean };
  phrase: string;
  subtitles: { line1: string; line2: string; line3: string; line4?: string };
  phraseFont: string;
  phraseFontSize: number;
  subtitleFont: string;
  subtitleFontSize: number;
  starColors: boolean;
  gridStyle: 'hide' | 'flat' | 'spherical';
}

// ──────────────────────────────────────────────────────────────────
// STAR CATALOG — loaded from real d3-celestial stars.6.json (~9000 stars)
// ──────────────────────────────────────────────────────────────────

// Star name lookup: loaded separately from the GeoJSON properties
const STAR_NAMES: Record<number, string> = {
  // Map HIP IDs to common names for the brightest stars
  32349: 'Sirius', 30438: 'Canopus', 69673: 'Arcturus', 91262: 'Vega',
  24608: 'Capella', 24436: 'Rigel', 37279: 'Procyon', 27989: 'Betelgeuse',
  97649: 'Altair', 21421: 'Aldebaran', 80763: 'Antares', 65474: 'Spica',
  37826: 'Pollux', 113368: 'Fomalhaut', 102098: 'Deneb', 49669: 'Regulus',
  36850: 'Castor', 11767: 'Polaris', 54061: 'Dubhe', 67301: 'Alkaid',
  53910: 'Mizar', 59774: 'Megrez', 58001: 'Phecda', 53740: 'Merak',
  62956: 'Alioth',
};

interface ConstellationLineData {
  id: string;
  lines: [number, number, number, number][]; // [ra1_deg, dec1, ra2_deg, dec2]
}

/** Parse stars.6.json GeoJSON into StarData[] */
function parseStarsGeoJSON(geojson: any): StarData[] {
  return geojson.features.map((f: any) => {
    const [raDeg, dec] = f.geometry.coordinates;
    const id = Number(f.id);
    return {
      id: String(id),
      ra: raDeg / 15.0, // degrees → hours
      dec,
      magnitude: f.properties.mag ?? 6.0,
      name: STAR_NAMES[id],
      bv: f.properties.bv ? parseFloat(f.properties.bv) : undefined,
    } as StarData;
  });
}

/** Parse constellations.lines.json into drawable line segments */
function parseConstellationLinesGeoJSON(geojson: any): ConstellationLineData[] {
  return geojson.features.map((f: any) => {
    const lines: [number, number, number, number][] = [];
    const multiLine = f.geometry.coordinates as number[][][];
    for (const line of multiLine) {
      for (let i = 0; i < line.length - 1; i++) {
        // Coordinates are [RA_degrees, Dec_degrees]
        // Convert RA from degrees to hours for our engine
        lines.push([
          line[i][0] / 15,   line[i][1],
          line[i + 1][0] / 15, line[i + 1][1],
        ]);
      }
    }
    return { id: f.id, lines };
  });
}

// Milky Way polygon data
interface MilkyWayData {
  id: string; // ol1..ol5 (brightness level)
  polygons: number[][][]; // array of polygons, each polygon is array of [ra_hours, dec]
}

function parseMilkyWayGeoJSON(geojson: any): MilkyWayData[] {
  return geojson.features.map((f: any) => {
    const polygons: number[][][] = [];
    const coords = f.geometry.coordinates as number[][][][];
    for (const multipoly of coords) {
      for (const ring of multipoly) {
        polygons.push(ring.map(([raDeg, dec]: number[]) => [raDeg / 15, dec]));
      }
    }
    return { id: f.id, polygons };
  });
}

// Global catalog cache
let cachedStars: StarData[] | null = null;
let cachedConstellationLines: ConstellationLineData[] | null = null;
let cachedMilkyWay: MilkyWayData[] | null = null;
let loadingPromise: Promise<void> | null = null;

async function loadCatalogData(): Promise<void> {
  if (cachedStars && cachedConstellationLines && cachedMilkyWay) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const [starsRes, constRes, mwRes] = await Promise.all([
      fetch('/data/stars.6.json'),
      fetch('/data/constellations.lines.json'),
      fetch('/data/mw.json'),
    ]);
    const starsJson = await starsRes.json();
    const constJson = await constRes.json();
    const mwJson = await mwRes.json();
    cachedStars = parseStarsGeoJSON(starsJson);
    cachedConstellationLines = parseConstellationLinesGeoJSON(constJson);
    cachedMilkyWay = parseMilkyWayGeoJSON(mwJson);
  })();
  return loadingPromise;
}

/**
 * Render the star map to an offscreen canvas at any resolution.
 * Used by export to get a crisp high-res star map instead of scaling the preview.
 */
export async function renderStarMapToCanvas(
  size: number,
  selectedCity: City,
  dateTime: Date,
  themeId: string,
  layers: { constellationLines: boolean; constellationNames: boolean; milkyWay: boolean },
  starColors: boolean,
  gridStyle: 'hide' | 'flat' | 'spherical',
): Promise<HTMLCanvasElement> {
  await loadCatalogData();
  const theme = getTheme(themeId);
  const frame = getDefaultFrame();

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const center = size / 2;
  const radius = size * frame.starRadiusFraction;

  // Fill star circle black
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  // Clip to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.clip();

  const lst = getLocalSiderealTime(dateTime, selectedCity.lon);

  // Milky Way
  if (layers.milkyWay && cachedMilkyWay) {
    drawMilkyWay(ctx, center, radius, lst, selectedCity.lat, theme, size, cachedMilkyWay);
  }

  // Grid
  if (gridStyle === 'spherical') {
    drawSphericalGrid(ctx, center, radius, lst, selectedCity.lat, theme, size);
  } else if (gridStyle === 'flat') {
    drawGrid(ctx, center, radius, theme, size);
  }

  // Stars
  drawStars(ctx, center, radius, lst, selectedCity.lat, theme, size, layers.constellationNames, cachedStars!, starColors);

  // Constellations
  if (layers.constellationLines) {
    drawConstellations(ctx, center, radius, lst, selectedCity.lat, theme, size, cachedConstellationLines!);
  }

  ctx.restore();
  return canvas;
}



// ──────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────
export default function PosterPreview({
  themeId, locale, selectedCity, date, time, layers, phrase, subtitles, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize, starColors, gridStyle,
}: PosterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = getTheme(themeId);
  const frame = getDefaultFrame();
  const [catalogLoaded, setCatalogLoaded] = useState(!!cachedStars);
  const [containerSize, setContainerSize] = useState(0);

  // Load star catalog data on mount
  useEffect(() => {
    loadCatalogData().then(() => setCatalogLoaded(true));
  }, []);

  // Track container size for canvas resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setContainerSize(w);
      }
    });
    observer.observe(container);
    // Initial size
    setContainerSize(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  const dateTime = useMemo(() => {
    return new Date(Date.UTC(date.year, date.month - 1, date.day, time.hours, time.minutes));
  }, [date, time]);

  useEffect(() => {
    if (!catalogLoaded || !cachedStars || containerSize === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Canvas fills the square frame container
    const cssSize = containerSize;
    const dpr = window.devicePixelRatio || 1;
    // Render at high resolution: at least 1500px for crisp preview
    const size = Math.max(1500, Math.round(cssSize * dpr));
    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;

    const ctx = canvas.getContext('2d')!;
    // DO NOT use ctx.scale(dpr,dpr) — we draw in physical pixels directly

    const center = size / 2;
    const radius = size * frame.starRadiusFraction;

    // ── Transparent background — SVG frame is behind via CSS ──
    ctx.clearRect(0, 0, size, size);

    // ── Fill star circle — always black for star visibility ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // ── Clip to star map circle ──
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // ── Compute LST for all coordinate transforms ──
    const lst = getLocalSiderealTime(dateTime, selectedCity.lon);

    // ── Milky Way ──
    if (layers.milkyWay && cachedMilkyWay) {
      drawMilkyWay(ctx, center, radius, lst, selectedCity.lat, theme, size, cachedMilkyWay);
    }

    // ── Grid (graticule) ──
    if (gridStyle === 'spherical') {
      drawSphericalGrid(ctx, center, radius, lst, selectedCity.lat, theme, size);
    } else if (gridStyle === 'flat') {
      drawGrid(ctx, center, radius, theme, size);
    }

    // ── Stars ──
    drawStars(ctx, center, radius, lst, selectedCity.lat, theme, size, layers.constellationNames, cachedStars!, starColors);

    // ── Constellation lines ──
    if (layers.constellationLines) {
      drawConstellations(ctx, center, radius, lst, selectedCity.lat, theme, size, cachedConstellationLines!);
    }

    // ── PREVIEW watermark (inside circle clip, not exported) ──
    const wmScale = size / 500;
    const wmFontSize = Math.round(14 * wmScale);
    ctx.font = `bold ${wmFontSize}px 'Dotrice', sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.5;
    // 3 random positions inside inner 55% of circle
    const safeR = radius * 0.55;
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * safeR;
      const wx = center + Math.cos(angle) * dist;
      const wy = center + Math.sin(angle) * dist;
      const rot = -20 - Math.random() * 15;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(rot * Math.PI / 180);
      ctx.fillText('PREVIEW', 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

  }, [themeId, selectedCity, dateTime, layers, theme, locale, frame, catalogLoaded, containerSize, starColors, gridStyle]);

  return (
    <div className="poster-frame">
      <div
        className={`poster-canvas poster-canvas--${themeId}`}
        style={{
          borderColor: theme.borderColor,
          borderWidth: theme.borderWidth > 0 ? `${theme.borderWidth}%` : '0',
        }}
      >
        {/* Square frame container: separate frame div + canvas on top */}
        <div ref={containerRef} className="poster__starmap-container">
          {/* Frame background — can be inverted independently */}
          <div
            className="poster__frame-bg"
            style={{
              backgroundImage: `url(/${frame.filename})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              filter: theme.frameFilter,
            }}
          />
          <canvas ref={canvasRef} className="poster__starmap-canvas" />
        </div>

        <div className="poster__text">
          <div className="poster__phrase" style={{ fontFamily: `"${phraseFont}", serif`, fontSize: `${phraseFontSize}px` }}>{phrase}</div>
          <div style={{ fontFamily: `"${subtitleFont}", serif`, fontSize: `${subtitleFontSize}px` }}>
            {subtitles.line1 && <div className="poster__subtitle-line poster__subtitle-line--main">{subtitles.line1}</div>}
            <div className="poster__subtitle-line">{subtitles.line2}</div>
            <div className="poster__subtitle-line">{subtitles.line3}</div>
            {subtitles.line4 && <div className="poster__subtitle-line">{subtitles.line4}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DRAWING FUNCTIONS
// ──────────────────────────────────────────────────────────────────

/** Convert B-V color index to RGB (approximation of blackbody star colors) */
function bvToRGB(bv: number): [number, number, number] {
  // Clamp to typical range
  const t = Math.max(-0.4, Math.min(2.0, bv));

  let r: number, g: number, b: number;

  // Red channel
  if (t < 0) {
    r = 0.61 + 0.11 * t + 0.1 * t * t;
  } else if (t < 0.4) {
    r = 0.83 + 0.17 * t;
  } else {
    r = 1.0;
  }

  // Green channel
  if (t < 0) {
    g = 0.7 + 0.07 * t + 0.1 * t * t;
  } else if (t < 0.4) {
    g = 0.87 + 0.11 * t;
  } else if (t < 1.6) {
    g = 1.0 - 0.16 * (t - 0.4);
  } else {
    g = 0.81 - 0.5 * (t - 1.6);
  }

  // Blue channel
  if (t < 0.4) {
    b = 1.0;
  } else if (t < 1.5) {
    b = 1.0 - 0.47 * (t - 0.4);
  } else if (t < 1.94) {
    b = 0.48 - 1.09 * (t - 1.5);
  } else {
    b = 0.0;
  }

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

/** Draw the Milky Way as translucent filled polygons */
function drawMilkyWay(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  lst: number, lat: number,
  theme: { background: string },
  size: number,
  mwData: MilkyWayData[],
) {
  // Render Milky Way on offscreen canvas, then blur for smooth gradients
  const offCanvas = document.createElement('canvas');
  offCanvas.width = size;
  offCanvas.height = size;
  const offCtx = offCanvas.getContext('2d')!;

  // Clip to circle on offscreen canvas too
  offCtx.beginPath();
  offCtx.arc(center, center, radius, 0, Math.PI * 2);
  offCtx.clip();

  // Opacity per brightness level — reduced by 20%
  const opacityMap: Record<string, number> = {
    ol1: 0.04,
    ol2: 0.06,
    ol3: 0.10,
    ol4: 0.14,
    ol5: 0.19,
  };

  const fillColor = '200,220,255'; // blue-white glow

  for (const layer of mwData) {
    const alpha = opacityMap[layer.id] ?? 0.04;
    offCtx.fillStyle = `rgba(${fillColor},${alpha})`;

    for (const polygon of layer.polygons) {
      if (polygon.length < 3) continue;

      offCtx.beginPath();
      let started = false;

      for (const [raH, dec] of polygon) {
        const hz = equatorialToHorizontal(raH, dec, lat, lst);
        const clampedAlt = Math.max(hz.altitude, -30);
        const proj = stereographicProjection(clampedAlt, hz.azimuth, radius);
        const x = center + proj.x;
        const y = center + proj.y;

        if (!started) {
          offCtx.moveTo(x, y);
          started = true;
        } else {
          offCtx.lineTo(x, y);
        }
      }

      if (started) {
        offCtx.closePath();
        offCtx.fill();
      }
    }
  }

  // Apply moderate blur for smooth gradients (less aggressive)
  const blurAmount = Math.max(4, size / 200);
  ctx.save();
  ctx.filter = `blur(${blurAmount}px)`;
  ctx.drawImage(offCanvas, 0, 0);
  ctx.restore();

  // Second pass with minimal blur for core structure
  ctx.save();
  ctx.filter = `blur(${blurAmount * 0.3}px)`;
  ctx.globalAlpha = 0.4;
  ctx.drawImage(offCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  theme: { grid: string },
  size: number,
) {
  ctx.strokeStyle = '#6c757d';

  // Altitude circles every 10°
  ctx.lineWidth = Math.max(1, 0.8 * (size / 500));
  ctx.globalAlpha = 0.4;
  for (let alt = 10; alt < 90; alt += 10) {
    const r = radius * Math.tan(((90 - alt) / 2) * Math.PI / 180) / Math.tan(45 * Math.PI / 180);
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Azimuth lines every 10°
  ctx.lineWidth = Math.max(1, 0.6 * (size / 500));
  ctx.globalAlpha = 0.3;
  for (let az = 0; az < 360; az += 10) {
    const azRad = (az * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center - radius * Math.sin(azRad), center - radius * Math.cos(azRad));
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

/** Spherical grid: draws RA/Dec arcs in equatorial coordinates through the stereographic projection.
 *  This creates curved lines that look like a 3D globe, unlike the flat azimuth/altitude grid. */
function drawSphericalGrid(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  lst: number, lat: number,
  theme: { grid: string },
  size: number,
) {
  ctx.strokeStyle = '#6c757d';
  const STEP = 2; // sample interval in degrees for smooth curves

  // Declination circles every 15° from -75° to 75°
  ctx.lineWidth = Math.max(1, 0.8 * (size / 500));
  ctx.globalAlpha = 0.35;
  for (let dec = -75; dec <= 75; dec += 15) {
    ctx.beginPath();
    let started = false;
    for (let ra = 0; ra <= 360; ra += STEP) {
      const raH = ra / 15; // degrees to hours
      const hz = equatorialToHorizontal(raH, dec, lat, lst);
      if (hz.altitude < -5) { started = false; continue; }
      const proj = stereographicProjection(hz.altitude, hz.azimuth, radius);
      const x = center + proj.x;
      const y = center + proj.y;
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      if (dist > radius * 1.05) { started = false; continue; }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }

  // Right Ascension lines every 1 hour (15°)
  ctx.lineWidth = Math.max(1, 0.6 * (size / 500));
  ctx.globalAlpha = 0.25;
  for (let raH = 0; raH < 24; raH += 1) {
    ctx.beginPath();
    let started = false;
    for (let dec = -90; dec <= 90; dec += STEP) {
      const hz = equatorialToHorizontal(raH, dec, lat, lst);
      if (hz.altitude < -5) { started = false; continue; }
      const proj = stereographicProjection(hz.altitude, hz.azimuth, radius);
      const x = center + proj.x;
      const y = center + proj.y;
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      if (dist > radius * 1.05) { started = false; continue; }
      if (!started) { ctx.moveTo(x, y); started = true; }
      else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  lst: number, lat: number,
  theme: { stars: string; background: string },
  size: number,
  showNames: boolean = false,
  allStars: StarData[],
  useColors: boolean = true,
) {
  // Star circle is always dark — stars always render in light-on-dark mode

  for (const star of allStars) {
    if (star.magnitude > 6.5) continue;

    const hz = equatorialToHorizontal(star.ra, star.dec, lat, lst);
    if (hz.altitude < -2) continue;

    const proj = stereographicProjection(hz.altitude, hz.azimuth, radius);
    const x = center + proj.x;
    const y = center + proj.y;

    const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
    if (dist > radius) continue;

    // Star sizes in PHYSICAL pixels (size is already in physical px)
    const scale = size / 500;
    let starSize: number;
    if (star.magnitude < 0) {
      starSize = Math.max(2, 2.0 * scale);
    } else if (star.magnitude < 1) {
      starSize = Math.max(1.5, 1.5 * scale);
    } else if (star.magnitude < 2) {
      starSize = Math.max(1.2, 1.1 * scale);
    } else if (star.magnitude < 3) {
      starSize = Math.max(1, 0.8 * scale);
    } else if (star.magnitude < 4) {
      starSize = Math.max(0.8, 0.6 * scale);
    } else if (star.magnitude < 5) {
      starSize = Math.max(0.6, 0.45 * scale);
    } else {
      starSize = Math.max(0.5, 0.35 * scale);
    }

    // Opacity: brighter stars are more opaque
    const alpha = star.magnitude < 2 ? 1.0 :
                  star.magnitude < 3 ? 0.9 :
                  star.magnitude < 4 ? 0.8 :
                  star.magnitude < 5 ? 0.6 :
                  0.4;

    // Star color from B-V index or monochrome
    let starColor: string;
    if (useColors) {
      const [r, g, b] = bvToRGB(star.bv ?? 0.6);
      starColor = `rgb(${r},${g},${b})`;

      // Glow for bright stars (magnitude < 1.5)
      if (star.magnitude < 1.5) {
        const glowRadius = starSize * 3;
        const glow = ctx.createRadialGradient(x, y, starSize * 0.5, x, y, glowRadius);
        glow.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.35})`);
        glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Monochrome mode — always white on dark circle
      starColor = '#ffffff';

      // Simple white glow for bright stars in monochrome
      if (star.magnitude < 1.5) {
        const glowRadius = starSize * 3;
        const glow = ctx.createRadialGradient(x, y, starSize * 0.5, x, y, glowRadius);
        glow.addColorStop(0, `rgba(255,255,255,${alpha * 0.25})`);
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = alpha;
    ctx.fillStyle = starColor;
    ctx.beginPath();
    ctx.arc(x, y, starSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Smart star name labels: pick 3-5 best, avoid edge & overlap ──
  if (showNames) {
    const scale = size / 500;
    const FAMOUS = ['Polaris','Sirius','Vega','Arcturus','Capella','Deneb','Altair',
      'Betelgeuse','Rigel','Antares','Spica','Regulus','Procyon','Aldebaran','Fomalhaut','Canopus'];
    const MAX_LABELS = 5;
    const MIN_GAP = 60 * scale;
    const EDGE_LIMIT = radius * 0.80;
    const placed: { x: number; y: number }[] = [];

    // Collect visible famous stars sorted by magnitude (brightest first)
    const candidates: { name: string; x: number; y: number; mag: number }[] = [];
    for (const star of allStars) {
      if (!star.name || !FAMOUS.includes(star.name)) continue;
      const hz = equatorialToHorizontal(star.ra, star.dec, lat, lst);
      if (hz.altitude < 2) continue;
      const proj = stereographicProjection(hz.altitude, hz.azimuth, radius);
      const sx = center + proj.x;
      const sy = center + proj.y;
      const dist = Math.sqrt((sx - center) ** 2 + (sy - center) ** 2);
      if (dist > EDGE_LIMIT) continue;
      candidates.push({ name: star.name, x: sx, y: sy, mag: star.magnitude });
    }
    candidates.sort((a, b) => a.mag - b.mag);

    // Always label Polaris first if visible
    const polarisIdx = candidates.findIndex(c => c.name === 'Polaris');
    if (polarisIdx > 0) {
      const [polaris] = candidates.splice(polarisIdx, 1);
      candidates.unshift(polaris);
    }

    ctx.font = `${Math.max(10, 10 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffffff';

    for (const c of candidates) {
      if (placed.length >= MAX_LABELS) break;
      const tooClose = placed.some(p =>
        Math.sqrt((c.x - p.x) ** 2 + (c.y - p.y) ** 2) < MIN_GAP
      );
      if (tooClose && c.name !== 'Polaris') continue; // Never skip Polaris
      ctx.globalAlpha = 0.9;
      ctx.fillText(c.name, c.x + 5, c.y - 5);
      placed.push({ x: c.x, y: c.y });
    }
  }

  ctx.globalAlpha = 1;
}

function drawConstellations(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  lst: number, lat: number,
  theme: { constellationLines: string },
  size: number,
  constellationLines: ConstellationLineData[],
) {
  ctx.strokeStyle = '#f8f9fa';
  ctx.lineWidth = Math.max(0.5, Math.min(2, 0.8 * Math.sqrt(size / 500)));
  ctx.globalAlpha = 0.35;

  for (const constellation of constellationLines) {
    for (const line of constellation.lines) {
      const [ra1, dec1, ra2, dec2] = line;

      const hz1 = equatorialToHorizontal(ra1, dec1, lat, lst);
      const hz2 = equatorialToHorizontal(ra2, dec2, lat, lst);

      if (hz1.altitude < -5 || hz2.altitude < -5) continue;

      const p1 = stereographicProjection(hz1.altitude, hz1.azimuth, radius);
      const p2 = stereographicProjection(hz2.altitude, hz2.azimuth, radius);

      const x1 = center + p1.x, y1 = center + p1.y;
      const x2 = center + p2.x, y2 = center + p2.y;

      const d1 = Math.sqrt((x1 - center) ** 2 + (y1 - center) ** 2);
      const d2 = Math.sqrt((x2 - center) ** 2 + (y2 - center) ** 2);

      if (d1 < radius && d2 < radius) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
}


