import { describe, it, expect } from 'vitest';
import { zonedTimeToUtc } from '../timezone.js';

describe('zonedTimeToUtc', () => {
  it('converts Moscow midnight to 21:00 UTC previous day', () => {
    // Moscow is UTC+3 year-round (no DST since 2014)
    const utc = zonedTimeToUtc(2026, 3, 26, 0, 0, 'Europe/Moscow');
    expect(utc.toISOString()).toBe('2026-03-25T21:00:00.000Z');
  });

  it('handles New York EST (winter, UTC-5)', () => {
    const utc = zonedTimeToUtc(2026, 1, 15, 12, 0, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('handles New York EDT (summer, UTC-4)', () => {
    const utc = zonedTimeToUtc(2026, 7, 15, 12, 0, 'America/New_York');
    expect(utc.toISOString()).toBe('2026-07-15T16:00:00.000Z');
  });

  it('handles fixed-offset Etc/GMT zones (sign is inverted in Etc convention)', () => {
    // Etc/GMT-3 means UTC+3
    const utc = zonedTimeToUtc(2026, 6, 1, 12, 0, 'Etc/GMT-3');
    expect(utc.toISOString()).toBe('2026-06-01T09:00:00.000Z');
    // Etc/GMT+5 means UTC-5
    const utc2 = zonedTimeToUtc(2026, 6, 1, 12, 0, 'Etc/GMT+5');
    expect(utc2.toISOString()).toBe('2026-06-01T17:00:00.000Z');
  });

  it('handles UTC zone as identity', () => {
    const utc = zonedTimeToUtc(2026, 6, 1, 12, 30, 'UTC');
    expect(utc.toISOString()).toBe('2026-06-01T12:30:00.000Z');
  });

  it('falls back to UTC interpretation for invalid timezone', () => {
    const utc = zonedTimeToUtc(2026, 6, 1, 12, 0, 'Not/AZone');
    expect(utc.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('falls back to UTC interpretation for empty timezone', () => {
    const utc = zonedTimeToUtc(2026, 6, 1, 12, 0, '');
    expect(utc.toISOString()).toBe('2026-06-01T12:00:00.000Z');
  });

  it('resolves DST spring-forward gap without crashing', () => {
    // 2026-03-08 02:30 does not exist in New York (clocks jump 02:00→03:00)
    const utc = zonedTimeToUtc(2026, 3, 8, 2, 30, 'America/New_York');
    expect(Number.isNaN(utc.getTime())).toBe(false);
    // Must land within an hour of the transition
    const lower = Date.UTC(2026, 2, 8, 6, 30); // 02:30 EST interpretation
    const upper = Date.UTC(2026, 2, 8, 7, 30); // 03:30 EDT interpretation
    expect(utc.getTime()).toBeGreaterThanOrEqual(lower - 3600_000);
    expect(utc.getTime()).toBeLessThanOrEqual(upper + 3600_000);
  });
});
