/**
 * Core astronomical calculations.
 * Based on Jean Meeus "Astronomical Algorithms" (2nd ed.)
 * and USNO formulas.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// J2000.0 epoch: January 1, 2000, 12:00 TT
const J2000_EPOCH = 2451545.0;

/**
 * Convert a JavaScript Date (UTC) to Julian Date.
 *
 * Algorithm from Meeus, "Astronomical Algorithms", Ch. 7.
 */
export function dateToJulianDate(date: Date): number {
  let y = date.getUTCFullYear();
  let m = date.getUTCMonth() + 1; // JS months are 0-based

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const d =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400 +
    date.getUTCMilliseconds() / 86400000;

  // Gregorian calendar correction
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/**
 * Convert Julian Date to Greenwich Mean Sidereal Time (GMST).
 * Returns GMST in hours (0–24).
 *
 * Based on USNO formula (accurate to ~0.1s per century).
 */
export function julianDateToGMST(jd: number): number {
  // Julian centuries since J2000.0
  const T = (jd - J2000_EPOCH) / 36525.0;

  // GMST at 0h UT in seconds
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - J2000_EPOCH) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;

  // Normalize to 0–360 degrees
  gmst = ((gmst % 360) + 360) % 360;

  // Convert to hours (0–24)
  return gmst / 15.0;
}

/**
 * Convert GMST to Local Sidereal Time (LST).
 * @param gmst - Greenwich Mean Sidereal Time in hours
 * @param longitudeDeg - Observer's longitude in degrees (East positive)
 * @returns LST in hours (0–24)
 */
export function gmstToLST(gmst: number, longitudeDeg: number): number {
  let lst = gmst + longitudeDeg / 15.0;
  // Normalize to 0–24
  lst = ((lst % 24) + 24) % 24;
  return lst;
}

/**
 * Convenience: get Local Sidereal Time for a date and longitude.
 * @param date - UTC date/time
 * @param longitudeDeg - Observer longitude in degrees (East positive)
 * @returns LST in hours (0–24)
 */
export function getLocalSiderealTime(date: Date, longitudeDeg: number): number {
  const jd = dateToJulianDate(date);
  const gmst = julianDateToGMST(jd);
  return gmstToLST(gmst, longitudeDeg);
}

/**
 * Calculate the Julian Century (T) from a Julian Date.
 * Used in many astronomical formulas.
 */
export function julianCentury(jd: number): number {
  return (jd - J2000_EPOCH) / 36525.0;
}

export { DEG_TO_RAD, RAD_TO_DEG, J2000_EPOCH };
