/**
 * Tests for star map core logic: visibility, filtering, snapshot.
 */
import { describe, it, expect } from 'vitest';
import { isStarVisible, filterByMagnitude, getVisibleStars, calculateSkySnapshot } from '../starmap.js';
import { getDefaultConfig } from '../../config/celestial-config.js';
import type { StarData, GeoLocation, ConstellationLine } from '../../types/index.js';

// ─── Test Data ────────────────────────────────────────────────────

const testStars: StarData[] = [
  { id: '1', ra: 6.75, dec: -16.72, magnitude: -1.46, name: 'Sirius', constellation: 'CMa' },     // Brightest star
  { id: '2', ra: 5.92, dec: 7.41, magnitude: 0.5, name: 'Betelgeuse', constellation: 'Ori' },     // Bright
  { id: '3', ra: 18.62, dec: 38.78, magnitude: 0.03, name: 'Vega', constellation: 'Lyr' },        // Bright
  { id: '4', ra: 2.53, dec: 89.26, magnitude: 1.98, name: 'Polaris', constellation: 'UMi' },      // Always visible from North
  { id: '5', ra: 14.26, dec: -60.84, magnitude: 0.76, name: 'Hadar', constellation: 'Cen' },      // Southern star
  { id: '6', ra: 12.0, dec: 30.0, magnitude: 5.5 },                                              // Dim star
  { id: '7', ra: 12.0, dec: 30.0, magnitude: 7.0 },                                              // Very dim (below limit)
  { id: '8', ra: 12.0, dec: 30.0, magnitude: 6.0 },                                              // At limit
];

const moscow: GeoLocation = { lat: 55.75, lon: 37.62, timezone: 'Europe/Moscow' };
const sydney: GeoLocation = { lat: -33.87, lon: 151.21, timezone: 'Australia/Sydney' };

const testConstellations: ConstellationLine[] = [
  {
    id: 'Ori',
    name: 'Orion',
    segments: [
      { start: [88.79, 7.41], end: [81.28, -1.94] }, // Betelgeuse → Mintaka (in degrees)
    ],
  },
];

// ─── Tests ────────────────────────────────────────────────────────

describe('isStarVisible', () => {
  it('should return true for altitude above 0', () => {
    expect(isStarVisible(10)).toBe(true);
    expect(isStarVisible(45)).toBe(true);
    expect(isStarVisible(89)).toBe(true);
  });

  it('should return false for altitude below 0', () => {
    expect(isStarVisible(-1)).toBe(false);
    expect(isStarVisible(-30)).toBe(false);
  });

  it('should return true for altitude exactly 0', () => {
    expect(isStarVisible(0)).toBe(true);
  });

  it('should respect custom minAltitude', () => {
    expect(isStarVisible(5, 10)).toBe(false);
    expect(isStarVisible(15, 10)).toBe(true);
  });
});

describe('filterByMagnitude', () => {
  it('should filter stars above magnitude limit', () => {
    const filtered = filterByMagnitude(testStars, 6.0);
    expect(filtered).toHaveLength(7); // All except mag 7.0
    expect(filtered.find((s) => s.id === '7')).toBeUndefined();
  });

  it('should include stars at exactly the limit', () => {
    const filtered = filterByMagnitude(testStars, 6.0);
    expect(filtered.find((s) => s.id === '8')).toBeDefined();
  });

  it('should return only bright stars with low limit', () => {
    const filtered = filterByMagnitude(testStars, 1.0);
    // Sirius (-1.46), Betelgeuse (0.5), Vega (0.03), Hadar (0.76)
    expect(filtered).toHaveLength(4);
  });
});

describe('getVisibleStars', () => {
  it('should return visible stars from Moscow at specific time', () => {
    const config = getDefaultConfig();
    const date = new Date('2024-01-15T20:00:00Z'); // Winter evening

    const visible = getVisibleStars(testStars, moscow, date, config);

    // Should have at least some visible stars
    expect(visible.length).toBeGreaterThan(0);

    // Polaris should always be visible from Moscow
    const polaris = visible.find((s) => s.name === 'Polaris');
    expect(polaris).toBeDefined();
    if (polaris) {
      expect(polaris.horizontal.altitude).toBeGreaterThan(0);
      expect(polaris.projected).toBeDefined();
      expect(polaris.renderSize).toBeGreaterThan(0);
    }
  });

  it('Polaris should NOT be visible from Sydney (Southern Hemisphere)', () => {
    const config = getDefaultConfig();
    const date = new Date('2024-01-15T20:00:00Z');

    const visible = getVisibleStars(testStars, sydney, date, config);

    const polaris = visible.find((s) => s.name === 'Polaris');
    expect(polaris).toBeUndefined();
  });

  it('should filter by magnitude limit', () => {
    const config = getDefaultConfig();
    config.magnitudeLimit = 1.0;
    const date = new Date('2024-06-15T22:00:00Z');

    const visible = getVisibleStars(testStars, moscow, date, config);

    // All visible stars should be bright
    for (const star of visible) {
      expect(star.magnitude).toBeLessThanOrEqual(1.0);
    }
  });

  it('projected coordinates should be within projection radius', () => {
    const config = getDefaultConfig();
    const date = new Date('2024-06-15T22:00:00Z');

    const visible = getVisibleStars(testStars, moscow, date, config);

    for (const star of visible) {
      const distance = Math.sqrt(star.projected.x ** 2 + star.projected.y ** 2);
      // Should be within the projection radius (with some tolerance for near-horizon)
      expect(distance).toBeLessThanOrEqual(config.projectionRadius * 1.5);
    }
  });
});

describe('calculateSkySnapshot', () => {
  it('should generate a complete snapshot', () => {
    const config = getDefaultConfig();
    const date = new Date('2024-06-15T22:00:00Z');

    const snapshot = calculateSkySnapshot(testStars, testConstellations, moscow, date, config);

    expect(snapshot.location).toEqual(moscow);
    expect(snapshot.dateTime).toEqual(date);
    expect(snapshot.julianDate).toBeGreaterThan(2451545); // After J2000
    expect(snapshot.lst).toBeGreaterThanOrEqual(0);
    expect(snapshot.lst).toBeLessThan(24);
    expect(snapshot.visibleStars.length).toBeGreaterThan(0);
    expect(snapshot.constellationLines).toHaveLength(1);
    expect(snapshot.constellationLines[0].id).toBe('Ori');
  });

  it('constellation lines should have projected coordinates', () => {
    const config = getDefaultConfig();
    const date = new Date('2024-01-15T20:00:00Z');

    const snapshot = calculateSkySnapshot(testStars, testConstellations, moscow, date, config);

    for (const line of snapshot.constellationLines) {
      for (const seg of line.segments) {
        expect(seg.start).toHaveProperty('x');
        expect(seg.start).toHaveProperty('y');
        expect(seg.end).toHaveProperty('x');
        expect(seg.end).toHaveProperty('y');
        expect(typeof seg.visible).toBe('boolean');
      }
    }
  });
});
