/**
 * Country → IANA timezone resolution for cities from the full database
 * (public/cities.json rows carry only [name, lat, lng, countryISO]).
 *
 * - Single-zone countries map straight to their IANA zone (DST-correct).
 * - Large multi-zone countries pick a zone by longitude bands (approximate
 *   at band borders, but DST-correct — unlike fixed Etc/GMT offsets).
 * - Unknown codes fall back to a longitude-based fixed offset.
 */

/** Longitude → fixed-offset zone. Etc/GMT sign is inverted by convention. */
export function estimateTimezone(_lat: number, lon: number): string {
  const offsetHours = Math.round(lon / 15);
  return `Etc/GMT${offsetHours <= 0 ? '+' : '-'}${Math.abs(offsetHours)}`;
}

/** Countries that (practically) use a single timezone. */
export const COUNTRY_ZONES: Record<string, string> = {
  // ── Europe (all observe EU DST rules except BY/RU/TR/IS) ──
  AD: 'Europe/Andorra', AL: 'Europe/Tirane', AT: 'Europe/Vienna',
  BA: 'Europe/Sarajevo', BE: 'Europe/Brussels', BG: 'Europe/Sofia',
  BY: 'Europe/Minsk', CH: 'Europe/Zurich', CY: 'Asia/Nicosia',
  CZ: 'Europe/Prague', DE: 'Europe/Berlin', DK: 'Europe/Copenhagen',
  EE: 'Europe/Tallinn', FI: 'Europe/Helsinki', FR: 'Europe/Paris',
  GB: 'Europe/London', GR: 'Europe/Athens', HR: 'Europe/Zagreb',
  HU: 'Europe/Budapest', IE: 'Europe/Dublin', IS: 'Atlantic/Reykjavik',
  IT: 'Europe/Rome', LI: 'Europe/Vaduz', LT: 'Europe/Vilnius',
  LU: 'Europe/Luxembourg', LV: 'Europe/Riga', MC: 'Europe/Monaco',
  MD: 'Europe/Chisinau', ME: 'Europe/Podgorica', MK: 'Europe/Skopje',
  MT: 'Europe/Malta', NL: 'Europe/Amsterdam', NO: 'Europe/Oslo',
  PL: 'Europe/Warsaw', RO: 'Europe/Bucharest', RS: 'Europe/Belgrade',
  SE: 'Europe/Stockholm', SI: 'Europe/Ljubljana', SK: 'Europe/Bratislava',
  SM: 'Europe/San_Marino', UA: 'Europe/Kyiv', VA: 'Europe/Vatican',
  // ── Middle East / Caucasus / Central Asia ──
  AE: 'Asia/Dubai', AF: 'Asia/Kabul', AM: 'Asia/Yerevan',
  AZ: 'Asia/Baku', BH: 'Asia/Bahrain', GE: 'Asia/Tbilisi',
  IL: 'Asia/Jerusalem', IQ: 'Asia/Baghdad', IR: 'Asia/Tehran',
  JO: 'Asia/Amman', KG: 'Asia/Bishkek', KW: 'Asia/Kuwait',
  KZ: 'Asia/Almaty', // unified to UTC+5 in 2024
  LB: 'Asia/Beirut', OM: 'Asia/Muscat', QA: 'Asia/Qatar',
  SA: 'Asia/Riyadh', SY: 'Asia/Damascus', TJ: 'Asia/Dushanbe',
  TM: 'Asia/Ashgabat', TR: 'Europe/Istanbul', UZ: 'Asia/Tashkent',
  YE: 'Asia/Aden',
  // ── South / East / Southeast Asia ──
  BD: 'Asia/Dhaka', BN: 'Asia/Brunei', BT: 'Asia/Thimphu',
  CN: 'Asia/Shanghai', // single official zone
  HK: 'Asia/Hong_Kong', IN: 'Asia/Kolkata', JP: 'Asia/Tokyo',
  KH: 'Asia/Phnom_Penh', KP: 'Asia/Pyongyang', KR: 'Asia/Seoul',
  LA: 'Asia/Vientiane', LK: 'Asia/Colombo', MM: 'Asia/Yangon',
  MO: 'Asia/Macau', MV: 'Indian/Maldives', MY: 'Asia/Kuala_Lumpur',
  NP: 'Asia/Kathmandu', PH: 'Asia/Manila', PK: 'Asia/Karachi',
  SG: 'Asia/Singapore', TH: 'Asia/Bangkok', TW: 'Asia/Taipei',
  VN: 'Asia/Ho_Chi_Minh',
  // ── Africa ──
  AO: 'Africa/Luanda', BF: 'Africa/Ouagadougou', BI: 'Africa/Bujumbura',
  BJ: 'Africa/Porto-Novo', BW: 'Africa/Gaborone', CF: 'Africa/Bangui',
  CG: 'Africa/Brazzaville', CI: 'Africa/Abidjan', CM: 'Africa/Douala',
  DJ: 'Africa/Djibouti', DZ: 'Africa/Algiers', EG: 'Africa/Cairo',
  ER: 'Africa/Asmara', ET: 'Africa/Addis_Ababa', GA: 'Africa/Libreville',
  GH: 'Africa/Accra', GM: 'Africa/Banjul', GN: 'Africa/Conakry',
  GQ: 'Africa/Malabo', GW: 'Africa/Bissau', KE: 'Africa/Nairobi',
  LR: 'Africa/Monrovia', LS: 'Africa/Maseru', LY: 'Africa/Tripoli',
  MA: 'Africa/Casablanca', MG: 'Indian/Antananarivo', ML: 'Africa/Bamako',
  MR: 'Africa/Nouakchott', MU: 'Indian/Mauritius', MW: 'Africa/Blantyre',
  MZ: 'Africa/Maputo', NA: 'Africa/Windhoek', NE: 'Africa/Niamey',
  NG: 'Africa/Lagos', RW: 'Africa/Kigali', SC: 'Indian/Mahe',
  SD: 'Africa/Khartoum', SL: 'Africa/Freetown', SN: 'Africa/Dakar',
  SO: 'Africa/Mogadishu', SS: 'Africa/Juba', TD: 'Africa/Ndjamena',
  TG: 'Africa/Lome', TN: 'Africa/Tunis', TZ: 'Africa/Dar_es_Salaam',
  UG: 'Africa/Kampala', ZA: 'Africa/Johannesburg', ZM: 'Africa/Lusaka',
  ZW: 'Africa/Harare',
  // ── Americas (single-zone) ──
  AR: 'America/Argentina/Buenos_Aires', BO: 'America/La_Paz',
  BS: 'America/Nassau', BZ: 'America/Belize', CO: 'America/Bogota',
  CR: 'America/Costa_Rica', CU: 'America/Havana',
  DO: 'America/Santo_Domingo', GT: 'America/Guatemala',
  GY: 'America/Guyana', HN: 'America/Tegucigalpa', HT: 'America/Port-au-Prince',
  JM: 'America/Jamaica', NI: 'America/Managua', PA: 'America/Panama',
  PE: 'America/Lima', PR: 'America/Puerto_Rico', PY: 'America/Asuncion',
  SR: 'America/Paramaribo', SV: 'America/El_Salvador',
  TT: 'America/Port_of_Spain', UY: 'America/Montevideo',
  VE: 'America/Caracas',
  // ── Chile: mainland zone (Easter Island ignored — negligible city count) ──
  CL: 'America/Santiago',
  // ── Oceania ──
  FJ: 'Pacific/Fiji', GU: 'Pacific/Guam', NC: 'Pacific/Noumea',
  NZ: 'Pacific/Auckland', PF: 'Pacific/Tahiti', PG: 'Pacific/Port_Moresby',
  SB: 'Pacific/Guadalcanal', TO: 'Pacific/Tongatapu', VU: 'Pacific/Efate',
  WS: 'Pacific/Apia',
  // ── Greenland ──
  GL: 'America/Nuuk',
};

/** Longitude-band pickers for large multi-zone countries. */
const MULTI_ZONE_PICKERS: Record<string, (lat: number, lon: number) => string> = {
  US: (lat, lon) => {
    if (lat > 50 && lon < -130) return 'America/Anchorage';
    if (lat < 25 && lon < -154) return 'Pacific/Honolulu';
    if (lon < -115) return 'America/Los_Angeles';
    if (lon < -102) return 'America/Denver';
    if (lon < -87) return 'America/Chicago';
    return 'America/New_York';
  },
  CA: (_lat, lon) => {
    if (lon < -120) return 'America/Vancouver';
    if (lon < -110) return 'America/Edmonton';
    if (lon < -90) return 'America/Winnipeg';
    if (lon < -74) return 'America/Toronto';
    if (lon < -57) return 'America/Halifax';
    return 'America/St_Johns';
  },
  RU: (_lat, lon) => {
    if (lon < 33) return 'Europe/Kaliningrad';
    if (lon < 52) return 'Europe/Moscow';
    if (lon < 57) return 'Europe/Samara';
    if (lon < 70) return 'Asia/Yekaterinburg';
    if (lon < 78) return 'Asia/Omsk';
    if (lon < 88) return 'Asia/Novosibirsk';
    if (lon < 100) return 'Asia/Krasnoyarsk';
    if (lon < 112) return 'Asia/Irkutsk';
    if (lon < 128) return 'Asia/Yakutsk';
    if (lon < 140) return 'Asia/Vladivostok';
    if (lon < 155) return 'Asia/Magadan';
    return 'Asia/Kamchatka';
  },
  AU: (_lat, lon) => {
    if (lon < 129) return 'Australia/Perth';
    if (lon < 141) return 'Australia/Adelaide';
    return 'Australia/Sydney';
  },
  BR: (_lat, lon) => {
    if (lon < -66) return 'America/Rio_Branco';
    if (lon < -57) return 'America/Manaus';
    return 'America/Sao_Paulo';
  },
  MX: (_lat, lon) => {
    if (lon < -114) return 'America/Tijuana';
    if (lon < -105) return 'America/Mazatlan';
    return 'America/Mexico_City';
  },
  ID: (_lat, lon) => {
    if (lon < 112) return 'Asia/Jakarta';
    if (lon < 128) return 'Asia/Makassar';
    return 'Asia/Jayapura';
  },
  MN: (_lat, lon) => (lon < 96 ? 'Asia/Hovd' : 'Asia/Ulaanbaatar'),
  CD: (_lat, lon) => (lon < 26 ? 'Africa/Kinshasa' : 'Africa/Lubumbashi'),
  EC: (_lat, lon) => (lon < -85 ? 'Pacific/Galapagos' : 'America/Guayaquil'),
  ES: (_lat, lon) => (lon < -11 ? 'Atlantic/Canary' : 'Europe/Madrid'),
  PT: (_lat, lon) => (lon < -25 ? 'Atlantic/Azores' : 'Europe/Lisbon'),
};

/**
 * Resolve the best-known IANA timezone for a city given its ISO country
 * code and coordinates. Falls back to a fixed longitude-based offset for
 * unmapped countries.
 */
export function resolveTimezone(iso: string, lat: number, lon: number): string {
  const code = iso.toUpperCase();
  const picker = MULTI_ZONE_PICKERS[code];
  if (picker) return picker(lat, lon);
  return COUNTRY_ZONES[code] ?? estimateTimezone(lat, lon);
}
