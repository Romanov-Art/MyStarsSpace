import React, { useRef, useEffect, useMemo } from 'react';
import { t, type Locale } from '../i18n/index.js';
import { getTheme } from '../config/themes.js';
import { getLocalSiderealTime } from '../core/astronomy.js';
import { equatorialToHorizontal, stereographicProjection } from '../core/coordinates.js';
import { constellationData } from '../data/constellations.js';
import type { City, StarData } from '../types/index.js';

interface PosterPreviewProps {
  themeId: string;
  locale: Locale;
  selectedCity: City;
  date: { day: number; month: number; year: number };
  time: { hours: number; minutes: number };
  layers: { grid: boolean; constellationLines: boolean; constellationNames: boolean };
  phrase: string;
  subtitles: { line1: string; line2: string; line3: string };
  showTime: boolean;
  posterFont: string;
}

// ──────────────────────────────────────────────────────────────────
// STAR CATALOG — realistic sky distribution with ~6000 stars
// ──────────────────────────────────────────────────────────────────
function generateRealisticStars(): StarData[] {
  const stars: StarData[] = [];
  let seed = 12345;
  const rng = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };

  // Galactic plane (Milky Way band) — denser star region
  // Galactic center ≈ RA 17.76h, Dec -29°
  for (let i = 0; i < 3000; i++) {
    // Distribute along galactic plane with spread
    const galLon = rng() * 360; // galactic longitude
    const galLat = (rng() - 0.5) * 30; // ±15° from plane

    // Simple galactic → equatorial (approximate)
    const galLonRad = (galLon * Math.PI) / 180;
    const galLatRad = (galLat * Math.PI) / 180;
    // North galactic pole: RA=12.85h, Dec=27.13°
    const ngpDec = (27.13 * Math.PI) / 180;
    const ngpRA = 12.85;

    const sinDec = Math.sin(ngpDec) * Math.sin(galLatRad) +
      Math.cos(ngpDec) * Math.cos(galLatRad) * Math.cos(galLonRad - (33 * Math.PI / 180));
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * 180 / Math.PI;

    const ra = (ngpRA + rng() * 24) % 24; // distribute around sky

    // Magnitude: mostly dim (4-6.5), few bright
    const mag = 2.5 + rng() * 4.0;

    stars.push({ id: `g${i}`, ra, dec, magnitude: mag });
  }

  // Uniform sky distribution — non-galactic stars
  for (let i = 0; i < 3000; i++) {
    const ra = rng() * 24;
    // Uniform on sphere: dec = asin(2u - 1)
    const dec = Math.asin(2 * rng() - 1) * (180 / Math.PI);
    const mag = 1.5 + rng() * 5.0;
    stars.push({ id: `u${i}`, ra, dec, magnitude: mag });
  }

  // Named bright stars with accurate positions
  const namedStars: StarData[] = [
    { id: 'sirius', ra: 6.752, dec: -16.716, magnitude: -1.46, name: 'Sirius' },
    { id: 'canopus', ra: 6.399, dec: -52.696, magnitude: -0.74, name: 'Canopus' },
    { id: 'arcturus', ra: 14.261, dec: 19.182, magnitude: -0.05, name: 'Arcturus' },
    { id: 'vega', ra: 18.616, dec: 38.784, magnitude: 0.03, name: 'Vega' },
    { id: 'capella', ra: 5.278, dec: 45.998, magnitude: 0.08, name: 'Capella' },
    { id: 'rigel', ra: 5.242, dec: -8.202, magnitude: 0.13, name: 'Rigel' },
    { id: 'procyon', ra: 7.655, dec: 5.225, magnitude: 0.34, name: 'Procyon' },
    { id: 'betelgeuse', ra: 5.919, dec: 7.407, magnitude: 0.42, name: 'Betelgeuse' },
    { id: 'altair', ra: 19.846, dec: 8.868, magnitude: 0.76, name: 'Altair' },
    { id: 'aldebaran', ra: 4.599, dec: 16.509, magnitude: 0.85, name: 'Aldebaran' },
    { id: 'antares', ra: 16.490, dec: -26.432, magnitude: 0.96, name: 'Antares' },
    { id: 'spica', ra: 13.420, dec: -11.161, magnitude: 0.97, name: 'Spica' },
    { id: 'pollux', ra: 7.755, dec: 28.026, magnitude: 1.14, name: 'Pollux' },
    { id: 'fomalhaut', ra: 22.961, dec: -29.622, magnitude: 1.16, name: 'Fomalhaut' },
    { id: 'deneb', ra: 20.690, dec: 45.280, magnitude: 1.25, name: 'Deneb' },
    { id: 'regulus', ra: 10.140, dec: 11.967, magnitude: 1.35, name: 'Regulus' },
    { id: 'castor', ra: 7.577, dec: 31.888, magnitude: 1.57, name: 'Castor' },
    { id: 'polaris', ra: 2.530, dec: 89.264, magnitude: 1.98, name: 'Polaris' },
    { id: 'dubhe', ra: 11.062, dec: 61.751, magnitude: 1.79, name: 'Dubhe' },
    { id: 'merak', ra: 11.031, dec: 56.382, magnitude: 2.37, name: 'Merak' },
    { id: 'phecda', ra: 11.897, dec: 53.695, magnitude: 2.44, name: 'Phecda' },
    { id: 'megrez', ra: 12.257, dec: 57.032, magnitude: 3.31, name: 'Megrez' },
    { id: 'alioth', ra: 12.900, dec: 55.960, magnitude: 1.77, name: 'Alioth' },
    { id: 'mizar', ra: 13.399, dec: 54.926, magnitude: 2.27, name: 'Mizar' },
    { id: 'alkaid', ra: 13.792, dec: 49.313, magnitude: 1.86, name: 'Alkaid' },
    { id: 'bellatrix', ra: 5.419, dec: 6.350, magnitude: 1.64, name: 'Bellatrix' },
    { id: 'mintaka', ra: 5.533, dec: -0.299, magnitude: 2.23, name: 'Mintaka' },
    { id: 'alnilam', ra: 5.603, dec: -1.202, magnitude: 1.69, name: 'Alnilam' },
    { id: 'alnitak', ra: 5.679, dec: -1.943, magnitude: 1.77, name: 'Alnitak' },
    { id: 'saiph', ra: 5.796, dec: -9.670, magnitude: 2.06, name: 'Saiph' },
    { id: 'schedar', ra: 0.675, dec: 56.537, magnitude: 2.23, name: 'Schedar' },
    { id: 'caph', ra: 0.153, dec: 59.150, magnitude: 2.27, name: 'Caph' },
    { id: 'navi', ra: 0.945, dec: 60.717, magnitude: 2.47, name: 'Navi' },
    { id: 'ruchbah', ra: 1.430, dec: 60.235, magnitude: 2.68, name: 'Ruchbah' },
    { id: 'segin', ra: 1.907, dec: 63.670, magnitude: 3.37, name: 'Segin' },
  ];

  return [...stars, ...namedStars];
}

const allStars = generateRealisticStars();



// ──────────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────────
export default function PosterPreview({
  themeId, locale, selectedCity, date, time, layers, phrase, subtitles, showTime, posterFont,
}: PosterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = getTheme(themeId);

  const dateTime = useMemo(() => {
    return new Date(Date.UTC(date.year, date.month - 1, date.day, time.hours, time.minutes));
  }, [date, time]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const size = Math.min(parent.clientWidth, parent.clientHeight);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(dpr, dpr);

    const center = size / 2;
    const radius = size * 0.48;

    // ── Fill with theme background ──
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, size, size);

    // ── Clip to star map circle ──
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();

    // ── Grid (graticule) ──
    if (layers.grid) {
      drawGrid(ctx, center, radius, theme, size);
    }

    // ── Stars ──
    const lst = getLocalSiderealTime(dateTime, selectedCity.lon);
    drawStars(ctx, center, radius, lst, selectedCity.lat, theme, size, layers.constellationNames);

    // ── Constellation lines ──
    if (layers.constellationLines) {
      drawConstellations(ctx, center, radius, lst, selectedCity.lat, theme, size);
    }

    ctx.restore();

  }, [themeId, selectedCity, dateTime, layers, theme, locale]);

  return (
    <div className="poster-frame">
      <div className={`poster-canvas poster-canvas--${themeId}`}>
        <div className="poster__starmap-container">
          <canvas ref={canvasRef} className="poster__starmap-canvas" />
        </div>

        <div className="poster__text" style={{ fontFamily: `"${posterFont}", serif` }}>
          <div className="poster__phrase">{phrase}</div>
          <div>
            <div className="poster__subtitle-line poster__subtitle-line--main">{subtitles.line1}</div>
            <div className="poster__subtitle-line">{subtitles.line2}</div>
            <div className="poster__subtitle-line">{subtitles.line3}</div>
          </div>
        </div>
      </div>
      {/* SVG frame ON TOP — mask ring hides star overflow, center is transparent */}
      <img
        src="/black-frame.svg"
        alt=""
        className="poster__frame-overlay"
        style={{ filter: themeId === 'white' ? 'invert(1)' : 'none' }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// DRAWING FUNCTIONS
// ──────────────────────────────────────────────────────────────────

function drawGrid(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  theme: { grid: string },
  size: number,
) {
  ctx.strokeStyle = theme.grid;

  // Altitude circles every 10°
  ctx.lineWidth = 0.6;
  ctx.globalAlpha = 0.45;
  for (let alt = 10; alt < 90; alt += 10) {
    const r = radius * Math.tan(((90 - alt) / 2) * Math.PI / 180) / Math.tan(45 * Math.PI / 180);
    ctx.beginPath();
    ctx.arc(center, center, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Azimuth lines every 10°
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.35;
  for (let az = 0; az < 360; az += 10) {
    const azRad = (az * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center - radius * Math.sin(azRad), center - radius * Math.cos(azRad));
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  center: number, radius: number,
  lst: number, lat: number,
  theme: { stars: string },
  size: number,
  showNames: boolean = false,
) {
  const scale = size / 500; // normalize to ~500px reference
  ctx.fillStyle = theme.stars;

  for (const star of allStars) {
    if (star.magnitude > 6.5) continue;

    const hz = equatorialToHorizontal(star.ra, star.dec, lat, lst);
    if (hz.altitude < -2) continue;

    const proj = stereographicProjection(hz.altitude, hz.azimuth, radius);
    const x = center + proj.x;
    const y = center + proj.y;

    const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
    if (dist > radius) continue;

    // Star sizes — crisp minimum sizes to prevent blur
    let starSize: number;
    if (star.magnitude < 0) {
      starSize = 1.8 * scale;
    } else if (star.magnitude < 1) {
      starSize = 1.4 * scale;
    } else if (star.magnitude < 2) {
      starSize = 1.0 * scale;
    } else if (star.magnitude < 3) {
      starSize = 0.7 * scale;
    } else if (star.magnitude < 4) {
      starSize = Math.max(0.5, 0.5 * scale);
    } else if (star.magnitude < 5) {
      starSize = Math.max(0.4, 0.35 * scale);
    } else {
      starSize = Math.max(0.3, 0.25 * scale);
    }

    // Opacity: brighter stars are more opaque
    const alpha = star.magnitude < 2 ? 1.0 :
                  star.magnitude < 3 ? 0.9 :
                  star.magnitude < 4 ? 0.8 :
                  star.magnitude < 5 ? 0.6 :
                  0.4;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, starSize, 0, Math.PI * 2);
    ctx.fill();

    // Draw star name label
    if (showNames && star.name && star.magnitude < 2.5) {
      ctx.globalAlpha = 0.85;
      ctx.font = `${Math.max(8, 9 * scale)}px sans-serif`;
      ctx.fillStyle = theme.stars;
      ctx.fillText(star.name, x + starSize + 3, y + 3);
      ctx.fillStyle = theme.stars;
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
) {
  ctx.strokeStyle = theme.constellationLines;
  ctx.lineWidth = 0.6 * (size / 500);
  ctx.globalAlpha = 0.55;

  for (const constellation of constellationData) {
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


