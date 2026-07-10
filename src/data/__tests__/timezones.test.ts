import { describe, it, expect } from 'vitest';
import { resolveTimezone, estimateTimezone, COUNTRY_ZONES } from '../timezones.js';

/** A zone is valid iff Intl.DateTimeFormat accepts it */
function isValidIANAZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

describe('estimateTimezone', () => {
  it('estimates fixed-offset zone from longitude (Etc sign is inverted)', () => {
    expect(estimateTimezone(55.75, 37.6)).toBe('Etc/GMT-3'); // ~Moscow, UTC+3
    expect(estimateTimezone(40.7, -74.0)).toBe('Etc/GMT+5'); // ~NYC, UTC-5
    expect(estimateTimezone(51.5, 0)).toBe('Etc/GMT+0'); // Greenwich
  });
});

describe('resolveTimezone', () => {
  it('maps single-zone countries to real IANA zones (DST-correct)', () => {
    expect(resolveTimezone('DE', 52.52, 13.4)).toBe('Europe/Berlin');
    expect(resolveTimezone('FR', 48.85, 2.35)).toBe('Europe/Paris');
    expect(resolveTimezone('JP', 35.68, 139.7)).toBe('Asia/Tokyo');
    expect(resolveTimezone('IN', 19.08, 72.88)).toBe('Asia/Kolkata');
    expect(resolveTimezone('CN', 39.9, 116.4)).toBe('Asia/Shanghai');
  });

  it('picks US zone by longitude', () => {
    expect(resolveTimezone('US', 40.7, -74.0)).toBe('America/New_York');
    expect(resolveTimezone('US', 41.88, -87.63)).toBe('America/Chicago');
    expect(resolveTimezone('US', 39.74, -104.99)).toBe('America/Denver');
    expect(resolveTimezone('US', 34.05, -118.24)).toBe('America/Los_Angeles');
    expect(resolveTimezone('US', 61.22, -149.9)).toBe('America/Anchorage');
    expect(resolveTimezone('US', 21.31, -157.86)).toBe('Pacific/Honolulu');
  });

  it('picks Russian zone by longitude', () => {
    expect(resolveTimezone('RU', 54.71, 20.45)).toBe('Europe/Kaliningrad');
    expect(resolveTimezone('RU', 55.75, 37.62)).toBe('Europe/Moscow');
    expect(resolveTimezone('RU', 56.84, 60.65)).toBe('Asia/Yekaterinburg');
    expect(resolveTimezone('RU', 55.03, 82.92)).toBe('Asia/Novosibirsk');
    expect(resolveTimezone('RU', 43.12, 131.89)).toBe('Asia/Vladivostok');
    expect(resolveTimezone('RU', 53.04, 158.65)).toBe('Asia/Kamchatka');
  });

  it('picks zones for other multi-zone countries by longitude', () => {
    expect(resolveTimezone('CA', 43.65, -79.38)).toBe('America/Toronto');
    expect(resolveTimezone('CA', 49.28, -123.12)).toBe('America/Vancouver');
    expect(resolveTimezone('AU', -33.87, 151.21)).toBe('Australia/Sydney');
    expect(resolveTimezone('AU', -31.95, 115.86)).toBe('Australia/Perth');
    expect(resolveTimezone('BR', -23.55, -46.63)).toBe('America/Sao_Paulo');
    expect(resolveTimezone('BR', -3.12, -60.02)).toBe('America/Manaus');
    expect(resolveTimezone('ID', -6.21, 106.85)).toBe('Asia/Jakarta');
    expect(resolveTimezone('ID', -8.65, 115.22)).toBe('Asia/Makassar');
    expect(resolveTimezone('ES', 40.42, -3.7)).toBe('Europe/Madrid');
    expect(resolveTimezone('ES', 28.13, -15.43)).toBe('Atlantic/Canary');
  });

  it('falls back to longitude estimate for unknown country codes', () => {
    expect(resolveTimezone('XX', 10, 45)).toBe('Etc/GMT-3');
    expect(resolveTimezone('', 10, -120)).toBe('Etc/GMT+8');
  });

  it('is case-insensitive on the ISO code', () => {
    expect(resolveTimezone('de', 52.52, 13.4)).toBe('Europe/Berlin');
  });

  it('returns only valid IANA zones for every mapped country', () => {
    // Single-zone map
    for (const [iso, tz] of Object.entries(COUNTRY_ZONES)) {
      expect(isValidIANAZone(tz), `${iso} → ${tz}`).toBe(true);
    }
  });

  it('returns only valid IANA zones from longitude-band pickers', () => {
    const multiZone = ['US', 'CA', 'RU', 'AU', 'BR', 'MX', 'ID', 'MN', 'CD', 'EC', 'ES', 'PT'];
    for (const iso of multiZone) {
      for (let lon = -180; lon <= 180; lon += 5) {
        for (const lat of [-40, 0, 21, 35, 55, 65]) {
          const tz = resolveTimezone(iso, lat, lon);
          expect(isValidIANAZone(tz), `${iso} @ lat=${lat} lon=${lon} → ${tz}`).toBe(true);
        }
      }
    }
  });
});
