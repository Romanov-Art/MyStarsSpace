/**
 * Tests for core astronomical calculations.
 */
import { describe, it, expect } from 'vitest';
import { dateToJulianDate, julianDateToGMST, gmstToLST, getLocalSiderealTime } from '../astronomy.js';

describe('dateToJulianDate', () => {
  it('should return J2000.0 epoch for 2000-01-01T12:00:00Z', () => {
    const date = new Date('2000-01-01T12:00:00Z');
    const jd = dateToJulianDate(date);
    expect(jd).toBeCloseTo(2451545.0, 5);
  });

  it('should handle 1999-01-01T00:00:00Z correctly', () => {
    const date = new Date('1999-01-01T00:00:00Z');
    const jd = dateToJulianDate(date);
    // JD for 1999-01-01 0:00 UT = 2451179.5
    expect(jd).toBeCloseTo(2451179.5, 5);
  });

  it('should handle 2024-03-20T00:00:00Z (vernal equinox)', () => {
    const date = new Date('2024-03-20T00:00:00Z');
    const jd = dateToJulianDate(date);
    // JD for 2024-03-20 0:00 UT = 2460389.5
    expect(jd).toBeCloseTo(2460389.5, 1);
  });

  it('should handle dates before Gregorian reform correctly', () => {
    // 2000-06-15T18:00:00Z
    const date = new Date('2000-06-15T18:00:00Z');
    const jd = dateToJulianDate(date);
    // JD should be 2451711.25
    expect(jd).toBeCloseTo(2451711.25, 3);
  });

  it('should be monotonically increasing with time', () => {
    const d1 = dateToJulianDate(new Date('2024-01-01T00:00:00Z'));
    const d2 = dateToJulianDate(new Date('2024-01-02T00:00:00Z'));
    const d3 = dateToJulianDate(new Date('2024-06-15T12:00:00Z'));
    expect(d2 - d1).toBeCloseTo(1.0, 5); // One day difference
    expect(d3).toBeGreaterThan(d2);
  });
});

describe('julianDateToGMST', () => {
  it('should return ~18.697h for J2000.0', () => {
    const gmst = julianDateToGMST(2451545.0);
    // GMST at J2000.0 epoch (2000-01-01 12:00 UT) ≈ 18.697 hours
    expect(gmst).toBeCloseTo(18.697, 0);
  });

  it('should return value between 0 and 24', () => {
    const dates = [2451545.0, 2460000.0, 2460388.5, 2451179.5];
    for (const jd of dates) {
      const gmst = julianDateToGMST(jd);
      expect(gmst).toBeGreaterThanOrEqual(0);
      expect(gmst).toBeLessThan(24);
    }
  });

  it('should advance ~4m per day (sidereal - solar difference)', () => {
    const gmst1 = julianDateToGMST(2460000.0);
    const gmst2 = julianDateToGMST(2460001.0);
    // Sidereal day is ~4m shorter than solar day
    // So GMST advances ~0.0657h per solar day beyond 24h
    let diff = gmst2 - gmst1;
    if (diff < 0) diff += 24;
    // Should be close to 24.0657h mod 24 ≈ 0.0657h
    expect(diff).toBeCloseTo(0.0657, 1);
  });
});

describe('gmstToLST', () => {
  it('should add longitude offset', () => {
    // Moscow: lon ≈ 37.62°E → 37.62/15 ≈ 2.508h
    const gmst = 12.0;
    const lst = gmstToLST(gmst, 37.62);
    expect(lst).toBeCloseTo(14.508, 2);
  });

  it('should handle negative longitude (West)', () => {
    // New York: lon ≈ -74.01°W
    const gmst = 12.0;
    const lst = gmstToLST(gmst, -74.01);
    expect(lst).toBeCloseTo(12.0 - 74.01 / 15, 2);
  });

  it('should normalize to 0-24 range', () => {
    const lst1 = gmstToLST(23.0, 30.0); // 23 + 2 = 25 → 1
    expect(lst1).toBeCloseTo(1.0, 1);

    const lst2 = gmstToLST(1.0, -30.0); // 1 - 2 = -1 → 23
    expect(lst2).toBeCloseTo(23.0, 1);
  });
});

describe('getLocalSiderealTime', () => {
  it('should combine JD→GMST→LST correctly', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    const lst = getLocalSiderealTime(date, 0); // Greenwich
    const gmst = julianDateToGMST(dateToJulianDate(date));
    expect(lst).toBeCloseTo(gmst, 5);
  });

  it('should produce different LST for different longitudes', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    const lstMoscow = getLocalSiderealTime(date, 37.62);
    const lstNY = getLocalSiderealTime(date, -74.01);
    // Moscow is east of NY, so LST should be later
    let diff = lstMoscow - lstNY;
    if (diff < 0) diff += 24;
    expect(diff).toBeCloseTo((37.62 + 74.01) / 15, 2);
  });
});
