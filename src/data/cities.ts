/**
 * City search with lazy-loaded 142K world cities database.
 * - Curated cities (cities-data.ts) have Russian names & timezones
 * - Full database (public/cities.json) loaded on first search
 * - Flag emoji from ISO 2-letter country codes
 */

import type { City } from '../types/index.js';
import { cities as curatedCities } from './cities-data.js';
export { cities } from './cities-data.js';

// ── Lazy-loaded full city database ──────────────────────────────
type RawCity = [string, number, number, string]; // [name, lat, lng, countryISO]
let fullDb: RawCity[] | null = null;
let loadPromise: Promise<void> | null = null;

async function loadFullDb(): Promise<void> {
  if (fullDb) return;
  if (loadPromise) return loadPromise;
  loadPromise = fetch('/cities.json')
    .then(r => r.json())
    .then((data: RawCity[]) => { fullDb = data; })
    .catch(() => { fullDb = []; });
  return loadPromise;
}

// Trigger preload after idle
if (typeof window !== 'undefined') {
  const preload = () => loadFullDb();
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preload, { timeout: 3000 });
  } else {
    setTimeout(preload, 2000);
  }
}

// ── ISO country code → flag emoji ───────────────────────────────
export function isoToFlag(iso: string): string {
  if (!iso || iso.length !== 2) return '';
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    0x1F1E6 + code.charCodeAt(0) - 65,
    0x1F1E6 + code.charCodeAt(1) - 65,
  );
}

// ── ISO → timezone estimate (by longitude) ──────────────────────
function estimateTimezone(lat: number, lon: number): string {
  const offsetHours = Math.round(lon / 15);
  return `Etc/GMT${offsetHours <= 0 ? '+' : '-'}${Math.abs(offsetHours)}`;
}

// ── Search: curated first, then full DB ─────────────────────────
export function findCity(query: string, locale?: string): City[] {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  // 1. Search curated cities (have ru names, proper timezones)
  const curated = curatedCities.filter((city) => {
    if (city.name.toLowerCase().includes(q)) return true;
    if (city.country.toLowerCase().includes(q)) return true;
    if (city.localizedNames) {
      if (locale && city.localizedNames[locale]?.toLowerCase().includes(q)) return true;
      return Object.values(city.localizedNames).some((name) => name.toLowerCase().includes(q));
    }
    return false;
  });

  // 2. Search full DB if loaded
  const fullResults: City[] = [];
  if (fullDb) {
    const curatedNames = new Set(curatedCities.map(c => c.name.toLowerCase()));
    for (const [name, lat, lng, iso] of fullDb) {
      if (fullResults.length >= 20) break;
      if (name.toLowerCase().includes(q) && !curatedNames.has(name.toLowerCase())) {
        fullResults.push({
          name,
          country: iso,
          lat,
          lon: lng,
          timezone: estimateTimezone(lat, lng),
          localizedNames: {},
        });
      }
    }
  }

  // Curated first, then full DB results
  const combined = [...curated, ...fullResults];
  return combined.slice(0, 12);
}

// ── Async version for ControlPanel ──────────────────────────────
export async function findCityAsync(query: string, locale?: string): Promise<City[]> {
  await loadFullDb();
  return findCity(query, locale);
}

/**
 * Get city name in the specified locale, falling back to English.
 * If no name is available (custom coordinates), returns DMS format.
 */
export function getCityName(city: City, locale: string): string {
  const name = city.localizedNames?.[locale] || city.name;
  if (name) return name;
  return formatDMS(city.lat, city.lon);
}

/**
 * Get localized country name using Intl.DisplayNames API.
 * Accepts either ISO code ("RU") or English name ("Russia").
 */
export function getCountryDisplayName(country: string, locale: string): string {
  if (!country) return '';
  const iso = country.length === 2 ? country : countryToISO(country);
  if (!iso) return country;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(iso) || country;
  } catch {
    return country;
  }
}

/**
 * Get display label for search dropdown: "🇷🇺 Moscow" (always English name).
 * For non-English locale, appends localized name: "🇷🇺 Moscow · Москва"
 */
export function getCityLabel(city: City, locale: string): string {
  const iso = city.country.length === 2 ? city.country : countryToISO(city.country);
  const flag = iso ? isoToFlag(iso) : '';
  const eng = city.name || formatDMS(city.lat, city.lon);
  const locName = locale !== 'en' && city.localizedNames?.[locale];
  const label = locName ? `${eng} · ${locName}` : eng;
  return flag ? `${flag} ${label}` : label;
}

/**
 * Format coordinates as DMS (Degrees, Minutes, Seconds).
 */
export function formatDMS(lat: number, lon: number): string {
  const toDMS = (value: number, posChar: string, negChar: string) => {
    const dir = value >= 0 ? posChar : negChar;
    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}°${String(min).padStart(2, '0')}'${sec}"${dir}`;
  };
  return `${toDMS(lat, 'N', 'S')} ${toDMS(lon, 'E', 'W')}`;
}

/**
 * Try to parse coordinate input.
 */
export function parseCoordinates(input: string): { lat: number; lon: number } | null {
  const s = sanitizeInput(input).trim();

  const decimalMatch = s.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lon = parseFloat(decimalMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  const dmsPattern = /(\d+)[°]\s*(\d+)[''′]\s*(\d+\.?\d*)[""″]?\s*([NSns])\s+(\d+)[°]\s*(\d+)[''′]\s*(\d+\.?\d*)[""″]?\s*([EWew])/;
  const dmsMatch = s.match(dmsPattern);
  if (dmsMatch) {
    let lat = parseInt(dmsMatch[1]) + parseInt(dmsMatch[2]) / 60 + parseFloat(dmsMatch[3]) / 3600;
    let lon = parseInt(dmsMatch[5]) + parseInt(dmsMatch[6]) / 60 + parseFloat(dmsMatch[7]) / 3600;
    if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
    if (dmsMatch[8].toUpperCase() === 'W') lon = -lon;
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { lat, lon };
    }
  }

  return null;
}

/**
 * Sanitize user input against XSS.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[^\P{C}\n\r\t]/gu, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/** Format lat/lon as DMS: 55°45'08.0"N 37°37'04.0"E */
export function formatCoordsDMS(lat: number, lon: number): string {
  const toDMS = (val: number) => {
    const abs = Math.abs(val);
    const d = Math.floor(abs);
    const mFull = (abs - d) * 60;
    const m = Math.floor(mFull);
    const s = ((mFull - m) * 60).toFixed(1);
    return `${d}°${String(m).padStart(2, '0')}'${s.padStart(4, '0')}"`;
  };
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${toDMS(lat)}${ns} ${toDMS(lon)}${ew}`;
}

// ── Country name → ISO lookup (for curated cities) ──────────────
const COUNTRY_ISO: Record<string, string> = {
  'Russia': 'RU', 'United Kingdom': 'GB', 'France': 'FR', 'Germany': 'DE',
  'Italy': 'IT', 'Spain': 'ES', 'Netherlands': 'NL', 'Austria': 'AT',
  'Czech Republic': 'CZ', 'Poland': 'PL', 'Turkey': 'TR', 'Portugal': 'PT',
  'Belgium': 'BE', 'Switzerland': 'CH', 'Sweden': 'SE', 'Norway': 'NO',
  'Denmark': 'DK', 'Finland': 'FI', 'Ireland': 'IE', 'Greece': 'GR',
  'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG', 'Serbia': 'RS',
  'Croatia': 'HR', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Estonia': 'EE',
  'Latvia': 'LV', 'Lithuania': 'LT', 'Iceland': 'IS', 'Monaco': 'MC',
  'Luxembourg': 'LU', 'Belarus': 'BY', 'Ukraine': 'UA', 'Georgia': 'GE',
  'Armenia': 'AM', 'Azerbaijan': 'AZ',
  'United States': 'US', 'Canada': 'CA', 'Mexico': 'MX', 'Brazil': 'BR',
  'Argentina': 'AR', 'Chile': 'CL', 'Peru': 'PE', 'Colombia': 'CO',
  'Cuba': 'CU', 'Panama': 'PA', 'Uruguay': 'UY', 'Ecuador': 'EC',
  'Venezuela': 'VE', 'Costa Rica': 'CR', 'Jamaica': 'JM',
  'Japan': 'JP', 'China': 'CN', 'South Korea': 'KR', 'Thailand': 'TH',
  'Singapore': 'SG', 'Malaysia': 'MY', 'Indonesia': 'ID', 'Vietnam': 'VN',
  'Philippines': 'PH', 'UAE': 'AE', 'India': 'IN', 'Sri Lanka': 'LK',
  'Nepal': 'NP', 'Taiwan': 'TW', 'Qatar': 'QA', 'Saudi Arabia': 'SA',
  'Israel': 'IL', 'Jordan': 'JO', 'Lebanon': 'LB', 'Kazakhstan': 'KZ',
  'Uzbekistan': 'UZ', 'Kyrgyzstan': 'KG', 'Mongolia': 'MN',
  'Cambodia': 'KH', 'Myanmar': 'MM', 'Bangladesh': 'BD', 'Pakistan': 'PK',
  'Egypt': 'EG', 'South Africa': 'ZA', 'Kenya': 'KE', 'Morocco': 'MA',
  'Nigeria': 'NG', 'Ghana': 'GH', 'Tanzania': 'TZ', 'Ethiopia': 'ET',
  'Tunisia': 'TN', 'Senegal': 'SN', 'Mauritius': 'MU', 'Seychelles': 'SC',
  'Australia': 'AU', 'New Zealand': 'NZ', 'Fiji': 'FJ',
  'French Polynesia': 'PF', 'Maldives': 'MV', 'DR Congo': 'CD',
};

function countryToISO(country: string): string {
  return COUNTRY_ISO[country] || '';
}
