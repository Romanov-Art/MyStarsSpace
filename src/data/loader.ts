/**
 * GeoJSON data loader for d3-celestial star/constellation data.
 */

import type { StarData, ConstellationLine, ConstellationSegment } from '../types/index.js';

// ─── GeoJSON Types (d3-celestial format) ──────────────────────────

interface GeoJSONFeature {
  type: 'Feature';
  id: string;
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

// ─── Star Loading ─────────────────────────────────────────────────

/**
 * Parse d3-celestial stars.6.json GeoJSON into StarData[].
 *
 * Each feature in stars.6.json has:
 * - geometry.coordinates: [RA_degrees, Dec_degrees]
 * - properties: { mag, bv, name, desig, con }
 * - id: HIP number or designation
 *
 * Note: d3-celestial stores RA in DEGREES (0–360), not hours.
 * We convert to hours (0–24) for our internal representation.
 */
export function parseStarsGeoJSON(geojson: GeoJSONFeatureCollection): StarData[] {
  return geojson.features.map((feature) => {
    const coords = feature.geometry.coordinates as number[];
    const props = feature.properties;

    return {
      id: String(feature.id),
      // Convert RA from degrees (0-360) to hours (0-24)
      ra: coords[0] / 15.0,
      dec: coords[1],
      magnitude: (props.mag as number) ?? 6.0,
      name: (props.name as string) || undefined,
      designation: (props.desig as string) || undefined,
      constellation: (props.con as string) || undefined,
      bv: (props.bv as number) ?? undefined,
    };
  });
}

// ─── Constellation Loading ────────────────────────────────────────

/**
 * Parse d3-celestial constellations.lines.json into ConstellationLine[].
 *
 * Each feature has:
 * - id: IAU abbreviation (e.g. "Ori")
 * - properties: { name, rank }
 * - geometry.type: "MultiLineString"
 * - geometry.coordinates: array of line strings, each being array of [RA_deg, Dec_deg]
 */
export function parseConstellationLinesGeoJSON(geojson: GeoJSONFeatureCollection): ConstellationLine[] {
  return geojson.features.map((feature) => {
    const props = feature.properties;
    const multiLine = feature.geometry.coordinates as number[][][];

    const segments: ConstellationSegment[] = [];

    for (const line of multiLine) {
      // Each line is an array of [RA_deg, Dec_deg] points
      // Create segments between consecutive points
      for (let i = 0; i < line.length - 1; i++) {
        segments.push({
          start: [line[i][0], line[i][1]] as [number, number],
          end: [line[i + 1][0], line[i + 1][1]] as [number, number],
        });
      }
    }

    return {
      id: String(feature.id),
      name: (props.name as string) || String(feature.id),
      segments,
    };
  });
}

/**
 * Load and parse a JSON file (works in both Node.js and browser).
 * For Node.js testing, reads from filesystem.
 * For browser, uses fetch.
 */
export async function loadJSON<T>(path: string): Promise<T> {
  // Node.js environment
  if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
    const { readFile } = await import('fs/promises');
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  }

  // Browser environment
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Load stars from a GeoJSON file.
 */
export async function loadStars(path: string): Promise<StarData[]> {
  const geojson = await loadJSON<GeoJSONFeatureCollection>(path);
  return parseStarsGeoJSON(geojson);
}

/**
 * Load constellation lines from a GeoJSON file.
 */
export async function loadConstellationLines(path: string): Promise<ConstellationLine[]> {
  const geojson = await loadJSON<GeoJSONFeatureCollection>(path);
  return parseConstellationLinesGeoJSON(geojson);
}
