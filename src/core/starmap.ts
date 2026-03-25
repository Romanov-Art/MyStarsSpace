/**
 * Star map core logic: filtering, visibility, sky snapshot generation.
 */

import type {
  StarData,
  VisibleStar,
  ConstellationLine,
  SkySnapshot,
  ProjectedConstellationLine,
  StarMapConfig,
  GeoLocation,
} from '../types/index.js';

import { dateToJulianDate, getLocalSiderealTime } from './astronomy.js';
import { equatorialToHorizontal, stereographicProjection, starRenderSize } from './coordinates.js';

/**
 * Check if a star is visible (above the minimum altitude).
 */
export function isStarVisible(altitude: number, minAltitude = 0): boolean {
  return altitude >= minAltitude;
}

/**
 * Filter stars by magnitude limit.
 */
export function filterByMagnitude(stars: StarData[], magnitudeLimit: number): StarData[] {
  return stars.filter((s) => s.magnitude <= magnitudeLimit);
}

/**
 * Compute horizontal coordinates and filter visible stars.
 *
 * @param stars - Star catalog
 * @param location - Observer's location
 * @param dateTime - Observation date/time (UTC)
 * @param config - Star map configuration
 * @returns Array of visible stars with horizontal coords and projections
 */
export function getVisibleStars(
  stars: StarData[],
  location: GeoLocation,
  dateTime: Date,
  config: StarMapConfig,
): VisibleStar[] {
  const lst = getLocalSiderealTime(dateTime, location.lon);
  const filtered = filterByMagnitude(stars, config.magnitudeLimit);

  const visible: VisibleStar[] = [];

  for (const star of filtered) {
    const horizontal = equatorialToHorizontal(star.ra, star.dec, location.lat, lst);

    if (!isStarVisible(horizontal.altitude, config.minAltitude)) {
      continue;
    }

    const projected = stereographicProjection(horizontal.altitude, horizontal.azimuth, config.projectionRadius);
    const renderSize = starRenderSize(star.magnitude, config.starSize.base, config.starSize.exponent);

    visible.push({
      ...star,
      horizontal,
      projected,
      renderSize,
    });
  }

  return visible;
}

/**
 * Project constellation lines to canvas coordinates.
 * Constellation segment coordinates are in RA(degrees), Dec(degrees).
 */
export function projectConstellationLines(
  constellations: ConstellationLine[],
  location: GeoLocation,
  dateTime: Date,
  config: StarMapConfig,
): ProjectedConstellationLine[] {
  const lst = getLocalSiderealTime(dateTime, location.lon);

  return constellations.map((constellation) => ({
    id: constellation.id,
    name: constellation.name,
    segments: constellation.segments.map((seg) => {
      // seg.start/end are [RA_degrees, Dec_degrees]
      // Convert RA from degrees to hours for equatorialToHorizontal
      const startHz = equatorialToHorizontal(seg.start[0] / 15, seg.start[1], location.lat, lst);
      const endHz = equatorialToHorizontal(seg.end[0] / 15, seg.end[1], location.lat, lst);

      const startProj = stereographicProjection(startHz.altitude, startHz.azimuth, config.projectionRadius);
      const endProj = stereographicProjection(endHz.altitude, endHz.azimuth, config.projectionRadius);

      return {
        start: startProj,
        end: endProj,
        visible: isStarVisible(startHz.altitude, config.minAltitude) && isStarVisible(endHz.altitude, config.minAltitude),
      };
    }),
  }));
}

/**
 * Generate a complete sky snapshot for a given moment and location.
 * This is the main entry point for the star map engine.
 */
export function calculateSkySnapshot(
  stars: StarData[],
  constellations: ConstellationLine[],
  location: GeoLocation,
  dateTime: Date,
  config: StarMapConfig,
): SkySnapshot {
  const julianDate = dateToJulianDate(dateTime);
  const lst = getLocalSiderealTime(dateTime, location.lon);
  const visibleStars = getVisibleStars(stars, location, dateTime, config);
  const constellationLines = projectConstellationLines(constellations, location, dateTime, config);

  return {
    location,
    dateTime,
    julianDate,
    lst,
    visibleStars,
    constellationLines,
  };
}
