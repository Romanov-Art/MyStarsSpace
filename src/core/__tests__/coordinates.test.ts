/**
 * Tests for coordinate transformations and stereographic projection.
 */
import { describe, it, expect } from 'vitest';
import {
  equatorialToHorizontal,
  horizontalToEquatorial,
  stereographicProjection,
  degreesToRadians,
  radiansToDegrees,
  starRenderSize,
} from '../coordinates.js';
import { getLocalSiderealTime } from '../astronomy.js';

describe('degreesToRadians / radiansToDegrees', () => {
  it('should convert 0° to 0 radians', () => {
    expect(degreesToRadians(0)).toBeCloseTo(0, 10);
  });

  it('should convert 180° to π radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10);
  });

  it('should round-trip correctly', () => {
    const deg = 123.456;
    expect(radiansToDegrees(degreesToRadians(deg))).toBeCloseTo(deg, 10);
  });
});

describe('equatorialToHorizontal', () => {
  it('Polaris from Moscow (lat ~55.75°N) should have altitude ≈ latitude', () => {
    // Polaris: RA ≈ 2.53h (37.95°), Dec ≈ 89.26°
    // From any location, Polaris altitude ≈ observer latitude
    const date = new Date('2024-06-15T22:00:00Z');
    const moscowLat = 55.75;
    const moscowLon = 37.62;
    const lst = getLocalSiderealTime(date, moscowLon);

    const result = equatorialToHorizontal(2.53, 89.26, moscowLat, lst);

    // Polaris altitude should be very close to observer's latitude
    expect(result.altitude).toBeCloseTo(moscowLat, 0);
  });

  it('zenith object should have altitude ~90°', () => {
    // An object at the zenith has Dec = latitude and HA = 0
    // If Dec = 45° and lat = 45°, at HA = 0 → alt = 90°
    const lat = 45;
    const dec = 45;
    const lst = 6.0; // arbitrary
    const ra = lst;  // HA = LST - RA = 0

    const result = equatorialToHorizontal(ra, dec, lat, lst);
    expect(result.altitude).toBeCloseTo(90, 0);
  });

  it('should produce altitude between -90 and 90', () => {
    const testCases = [
      { ra: 0, dec: 0, lat: 45, lst: 12 },
      { ra: 12, dec: -30, lat: -33, lst: 6 },
      { ra: 6, dec: 60, lat: 55, lst: 18 },
    ];

    for (const tc of testCases) {
      const result = equatorialToHorizontal(tc.ra, tc.dec, tc.lat, tc.lst);
      expect(result.altitude).toBeGreaterThanOrEqual(-90);
      expect(result.altitude).toBeLessThanOrEqual(90);
    }
  });

  it('should produce azimuth between 0 and 360', () => {
    const testCases = [
      { ra: 0, dec: 0, lat: 45, lst: 12 },
      { ra: 12, dec: -30, lat: -33, lst: 6 },
      { ra: 6, dec: 60, lat: 55, lst: 18 },
    ];

    for (const tc of testCases) {
      const result = equatorialToHorizontal(tc.ra, tc.dec, tc.lat, tc.lst);
      expect(result.azimuth).toBeGreaterThanOrEqual(0);
      expect(result.azimuth).toBeLessThanOrEqual(360);
    }
  });
});

describe('horizontalToEquatorial ↔ equatorialToHorizontal roundtrip', () => {
  it('should roundtrip correctly', () => {
    const ra = 8.5;
    const dec = 35.0;
    const lat = 40.0;
    const lst = 14.0;

    const hz = equatorialToHorizontal(ra, dec, lat, lst);
    const eq = horizontalToEquatorial(hz.altitude, hz.azimuth, lat, lst);

    expect(eq.ra).toBeCloseTo(ra, 1);
    expect(eq.dec).toBeCloseTo(dec, 1);
  });

  it('should roundtrip for multiple test cases', () => {
    const cases = [
      { ra: 0, dec: 45, lat: 50, lst: 6 },
      { ra: 18, dec: -20, lat: -30, lst: 0 },
      { ra: 12, dec: 70, lat: 60, lst: 15 },
    ];

    for (const tc of cases) {
      const hz = equatorialToHorizontal(tc.ra, tc.dec, tc.lat, tc.lst);
      // Only test roundtrip if object is above horizon
      if (hz.altitude > 5) {
        const eq = horizontalToEquatorial(hz.altitude, hz.azimuth, tc.lat, tc.lst);
        expect(eq.ra).toBeCloseTo(tc.ra, 0);
        expect(eq.dec).toBeCloseTo(tc.dec, 0);
      }
    }
  });
});

describe('stereographicProjection', () => {
  it('zenith (alt=90°) → center (0, 0)', () => {
    const result = stereographicProjection(90, 0, 200);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(0, 5);
  });

  it('horizon (alt=0°) → at radius distance from center', () => {
    const radius = 200;
    const result = stereographicProjection(0, 0, radius);
    const distance = Math.sqrt(result.x ** 2 + result.y ** 2);
    // r = R * tan(45°) = R * 1 = R
    expect(distance).toBeCloseTo(radius, 1);
  });

  it('altitude between 0-90 → distance between 0 and radius', () => {
    const radius = 200;
    for (let alt = 10; alt <= 80; alt += 10) {
      const result = stereographicProjection(alt, 0, radius);
      const distance = Math.sqrt(result.x ** 2 + result.y ** 2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(radius);
    }
  });

  it('North (az=0) should project upward (y < 0 in screen coords)', () => {
    const result = stereographicProjection(45, 0, 200);
    expect(result.y).toBeLessThan(0); // North is up
    expect(Math.abs(result.x)).toBeLessThan(1); // centered horizontally
  });

  it('points at same altitude but different azimuth form a circle', () => {
    const radius = 200;
    const alt = 45;
    const distances: number[] = [];

    for (let az = 0; az < 360; az += 30) {
      const result = stereographicProjection(alt, az, radius);
      distances.push(Math.sqrt(result.x ** 2 + result.y ** 2));
    }

    // All distances should be the same (within floating point tolerance)
    const avg = distances.reduce((a, b) => a + b, 0) / distances.length;
    for (const d of distances) {
      expect(d).toBeCloseTo(avg, 5);
    }
  });
});

describe('starRenderSize', () => {
  it('brighter stars (lower mag) should be larger', () => {
    const sizeBright = starRenderSize(0); // Vega-like
    const sizeDim = starRenderSize(5);    // dim star
    expect(sizeBright).toBeGreaterThan(sizeDim);
  });

  it('should return minimum 0.5', () => {
    const size = starRenderSize(20); // very dim
    expect(size).toBeGreaterThanOrEqual(0.5);
  });
});
