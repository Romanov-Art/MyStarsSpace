/**
 * Timezone conversion: local wall-clock time in an IANA timezone → UTC instant.
 *
 * Uses Intl.DateTimeFormat (no external dependencies). Supports both real
 * IANA zones ("Europe/Moscow") and fixed-offset zones ("Etc/GMT-3").
 */

/**
 * Get the UTC offset (in milliseconds) of a timezone at a given instant.
 * Positive for zones east of Greenwich (e.g. Moscow → +3h).
 */
// Intl.DateTimeFormat construction is expensive (~ms); cache per timezone —
// the formatter itself is reusable across timestamps
const dtfCache = new Map<string, Intl.DateTimeFormat>();

function getDtf(timeZone: string): Intl.DateTimeFormat {
  let dtf = dtfCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    dtfCache.set(timeZone, dtf);
  }
  return dtf;
}

function tzOffsetMs(utcTimestamp: number, timeZone: string): number {
  const dtf = getDtf(timeZone);

  const parts: Record<string, number> = {};
  for (const { type, value } of dtf.formatToParts(utcTimestamp)) {
    if (type !== 'literal') parts[type] = parseInt(value, 10);
  }

  // Intl may format midnight as hour 24
  const hour = parts.hour === 24 ? 0 : parts.hour;
  const asUTC = Date.UTC(parts.year, parts.month - 1, parts.day, hour, parts.minute, parts.second);
  return asUTC - Math.floor(utcTimestamp / 1000) * 1000;
}

/**
 * Convert a wall-clock date/time in the given timezone to a UTC Date.
 *
 * Two-pass algorithm: guess the offset using the naive UTC interpretation,
 * then re-check the offset at the corrected instant (handles DST boundaries).
 * For times inside a DST "gap" the result is the post-transition mapping —
 * good enough for star map purposes.
 *
 * Falls back to interpreting the time as UTC when the timezone is invalid.
 */
export function zonedTimeToUtc(
  year: number,
  month: number, // 1-based
  day: number,
  hours: number,
  minutes: number,
  timeZone: string,
): Date {
  const naiveUtc = Date.UTC(year, month - 1, day, hours, minutes);
  if (!timeZone) return new Date(naiveUtc);

  try {
    const offset1 = tzOffsetMs(naiveUtc, timeZone);
    let ts = naiveUtc - offset1;
    const offset2 = tzOffsetMs(ts, timeZone);
    if (offset2 !== offset1) ts = naiveUtc - offset2;
    return new Date(ts);
  } catch {
    // Invalid timezone string — keep legacy behavior (treat as UTC)
    return new Date(naiveUtc);
  }
}
