/**
 * Coordinate transformations for astronomical calculations.
 *
 * Equatorial (RA/Dec) ↔ Horizontal (Alt/Az)
 * Stereographic projection (Alt/Az → 2D canvas)
 */

import type { EquatorialCoords, HorizontalCoords, ProjectedPoint } from '../types/index.js';
import { DEG_TO_RAD, RAD_TO_DEG } from './astronomy.js';

/**
 * Convert degrees to radians.
 */
export function degreesToRadians(deg: number): number {
  return deg * DEG_TO_RAD;
}

/**
 * Convert radians to degrees.
 */
export function radiansToDegrees(rad: number): number {
  return rad * RAD_TO_DEG;
}

/**
 * Convert Equatorial coordinates (RA, Dec) to Horizontal coordinates (Alt, Az).
 *
 * @param ra - Right Ascension in hours (0–24)
 * @param dec - Declination in degrees (-90 to +90)
 * @param lat - Observer's latitude in degrees
 * @param lst - Local Sidereal Time in hours
 * @returns Horizontal coordinates { altitude, azimuth } in degrees
 */
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  lat: number,
  lst: number,
): HorizontalCoords {
  // Hour angle in degrees
  const haHours = lst - ra;
  const haDeg = haHours * 15.0;
  const haRad = degreesToRadians(haDeg);

  const decRad = degreesToRadians(dec);
  const latRad = degreesToRadians(lat);

  // Altitude
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = radiansToDegrees(Math.asin(sinAlt));

  // Azimuth
  const cosAz =
    (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));

  // Clamp to [-1, 1] to avoid NaN from floating-point errors
  const cosAzClamped = Math.max(-1, Math.min(1, cosAz));
  let azimuth = radiansToDegrees(Math.acos(cosAzClamped));

  // If hour angle > 0 (west), azimuth is > 180
  if (Math.sin(haRad) > 0) {
    azimuth = 360 - azimuth;
  }

  return { altitude, azimuth };
}

/**
 * Convert Horizontal coordinates back to Equatorial coordinates.
 *
 * @param altitude - Altitude in degrees
 * @param azimuth - Azimuth in degrees (measured from North, clockwise)
 * @param lat - Observer's latitude in degrees
 * @param lst - Local Sidereal Time in hours
 * @returns Equatorial coordinates { ra, dec } — ra in hours, dec in degrees
 */
export function horizontalToEquatorial(
  altitude: number,
  azimuth: number,
  lat: number,
  lst: number,
): EquatorialCoords {
  const altRad = degreesToRadians(altitude);
  const azRad = degreesToRadians(azimuth);
  const latRad = degreesToRadians(lat);

  // Declination
  const sinDec = Math.sin(altRad) * Math.sin(latRad) + Math.cos(altRad) * Math.cos(latRad) * Math.cos(azRad);
  const dec = radiansToDegrees(Math.asin(sinDec));

  // Hour angle
  const cosHA =
    (Math.sin(altRad) - Math.sin(latRad) * sinDec) / (Math.cos(latRad) * Math.cos(Math.asin(sinDec)));
  const cosHAClamped = Math.max(-1, Math.min(1, cosHA));
  let ha = radiansToDegrees(Math.acos(cosHAClamped));

  if (Math.sin(azRad) > 0) {
    ha = 360 - ha;
  }

  // RA = LST - HA (convert HA from degrees to hours)
  let ra = lst - ha / 15.0;
  ra = ((ra % 24) + 24) % 24;

  return { ra, dec };
}

/**
 * Stereographic projection from horizontal coordinates to 2D canvas.
 *
 * Maps the hemisphere: zenith (alt=90°) → center (0,0),
 * horizon (alt=0°) → circle with given radius.
 *
 * Formula: r = R · tan((90° - alt) / 2)
 * This preserves angles (conformal).
 *
 * @param altitude - Altitude in degrees (0 = horizon, 90 = zenith)
 * @param azimuth - Azimuth in degrees (0 = North, 90 = East)
 * @param radius - Projection radius (pixels to horizon circle)
 * @returns {x, y} projected coordinates, (0,0) = center
 */
export function stereographicProjection(
  altitude: number,
  azimuth: number,
  radius: number,
): ProjectedPoint {
  // r = R * tan((90 - alt) / 2)
  const zenithAngle = 90 - altitude;
  const r = radius * Math.tan(degreesToRadians(zenithAngle / 2));

  // Azimuth: 0=North (up), 90=East (right on map, but celestial maps
  // mirror horizontally, so East is left). We use standard map orientation
  // where North is up and East is to the LEFT (as seen looking up at the sky).
  const azRad = degreesToRadians(azimuth);

  // x positive = East (left on sky map), y positive = South (down)
  // For sky-as-seen-from-below: East is to the LEFT
  const x = -r * Math.sin(azRad); // negative so East is left
  const y = -r * Math.cos(azRad); // negative so North is up

  return { x, y };
}

/**
 * Calculate the rendered size of a star based on its magnitude.
 *
 * Brighter stars (lower magnitude) get larger dots.
 * Formula: size = base * 10^(exponent * mag)
 *
 * @param magnitude - Star's apparent magnitude
 * @param base - Base size in pixels (default 3)
 * @param exponent - Magnitude exponent (default -0.2)
 * @returns Size in pixels
 */
export function starRenderSize(magnitude: number, base = 3, exponent = -0.2): number {
  return Math.max(0.5, base * Math.pow(10, exponent * magnitude));
}
