/**
 * Embed / whitelabel configuration for partner sites.
 *
 * URL contract:
 *   ?template=name   → loads /templates/{name}.json (explicit, wins)
 *   ?partner=id      → loads /templates/partners/{id}.json (implicit default)
 *   other params     → override individual template values (bg, locale, …)
 *
 * All inputs (URL params, fetched JSON) are untrusted: ids are sanitized
 * before building fetch paths, and template values are validated before
 * they reach app state.
 */
import { AVAILABLE_LOCALES, type Locale } from '../i18n/index.js';
import { CURRENCIES } from '../config/currencies.js';

const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const VALID_DATE_FORMATS = ['DD.MM.YYYY', 'MM/DD/YYYY'];
const VALID_TIME_FORMATS = ['24h', '12h'];
const VALID_UNITS = ['cm', 'inch'];

export const SETTINGS_KEY_BASE = 'starmap-settings';

/** Keys a template JSON may set; anything else is ignored on merge. */
const TEMPLATE_KEYS = [
  'bg', 'text', 'accent', 'panel', 'radius',
  'locale', 'theme', 'currency', 'units',
  'dateFormat', 'timeFormat', 'fullMonthName',
  'markup',
] as const;

export type EmbedConfig = Partial<Record<(typeof TEMPLATE_KEYS)[number], any>>;

/** Return the id if it is safe to use in a fetch path, otherwise null. */
export function sanitizeId(raw: string | null | undefined): string | null {
  return raw && ID_RE.test(raw) ? raw : null;
}

export function isValidLocale(v: unknown): v is Locale {
  return typeof v === 'string' && AVAILABLE_LOCALES.includes(v as Locale);
}

export function isValidCurrency(v: unknown): v is string {
  return typeof v === 'string' && CURRENCIES.some(c => c.code === v);
}

/**
 * Which template JSON to load for this page view.
 * Explicit ?template= beats the partner default; invalid ids are ignored.
 */
export function resolveTemplateUrl(params: URLSearchParams): string | null {
  const template = sanitizeId(params.get('template'));
  if (template) return `/templates/${template}.json`;
  const partner = sanitizeId(params.get('partner'));
  if (partner) return `/templates/partners/${partner}.json`;
  return null;
}

/**
 * localStorage key for persisted settings. Partner embeds get their own
 * namespace so they don't inherit main-site (or each other's) state.
 */
export function settingsStorageKey(params: URLSearchParams): string {
  const partner = sanitizeId(params.get('partner'));
  return partner ? `${SETTINGS_KEY_BASE}:${partner}` : SETTINGS_KEY_BASE;
}

/**
 * Merge a fetched template with URL-param overrides (overrides win) and
 * drop unknown keys plus invalid values, so junk never reaches app state.
 */
export function sanitizeTemplate(
  tpl: unknown,
  overrides: Record<string, string> = {},
): EmbedConfig {
  const base = (tpl && typeof tpl === 'object' && !Array.isArray(tpl)) ? tpl as Record<string, any> : {};
  // `markup` is pricing — only the deployed template may set it, never the URL
  const { markup: _ignored, ...urlOverrides } = overrides;
  const merged: Record<string, any> = { ...base, ...urlOverrides };
  const out: EmbedConfig = {};
  for (const key of TEMPLATE_KEYS) {
    if (merged[key] === undefined) continue;
    out[key] = merged[key];
  }
  if (out.locale !== undefined && !isValidLocale(out.locale)) delete out.locale;
  if (out.currency !== undefined && !isValidCurrency(out.currency)) delete out.currency;
  if (out.units !== undefined && !VALID_UNITS.includes(out.units)) delete out.units;
  if (out.dateFormat !== undefined && !VALID_DATE_FORMATS.includes(out.dateFormat)) delete out.dateFormat;
  if (out.timeFormat !== undefined && !VALID_TIME_FORMATS.includes(out.timeFormat)) delete out.timeFormat;
  if (out.markup !== undefined) {
    // Partner markup in USD; templates may hold a number, URL params a string
    const n = typeof out.markup === 'number' ? out.markup : Number(out.markup);
    if (Number.isFinite(n) && n >= 0) out.markup = n;
    else delete out.markup;
  }
  if (out.fullMonthName !== undefined && typeof out.fullMonthName !== 'boolean') {
    // URL params arrive as strings — accept explicit "true"/"false"
    if (out.fullMonthName === 'true') out.fullMonthName = true;
    else if (out.fullMonthName === 'false') out.fullMonthName = false;
    else delete out.fullMonthName;
  }
  return out;
}
