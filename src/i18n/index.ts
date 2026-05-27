/**
 * Internationalization (i18n) engine.
 * Core business advantage: multi-language support for 12+ languages.
 */

export type Locale =
  // Original 20
  | 'ru' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ja' | 'ko' | 'zh'
  | 'ar' | 'tr' | 'hi' | 'th' | 'vi' | 'id' | 'ms' | 'pl' | 'nl' | 'sv'
  // New 21
  | 'bn' | 'ur' | 'fa' | 'cs' | 'ro' | 'hu' | 'el' | 'no' | 'fi' | 'da'
  | 'jv' | 'ta' | 'pa' | 'uk' | 'be' | 'kk' | 'uz' | 'az' | 'hy' | 'ka' | 'ky';

export const AVAILABLE_LOCALES: Locale[] = [
  // Original 20
  'ru', 'en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh',
  'ar', 'tr', 'hi', 'th', 'vi', 'id', 'ms', 'pl', 'nl', 'sv',
  // New 21
  'bn', 'ur', 'fa', 'cs', 'ro', 'hu', 'el', 'no', 'fi', 'da',
  'jv', 'ta', 'pa', 'uk', 'be', 'kk', 'uz', 'az', 'hy', 'ka', 'ky',
];

export const LOCALE_NAMES: Record<Locale, string> = {
  // Original 20
  ru: 'Русский',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
  tr: 'Türkçe',
  hi: 'हिन्दी',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  pl: 'Polski',
  nl: 'Nederlands',
  sv: 'Svenska',
  // New 21
  bn: 'বাংলা',
  ur: 'اردو',
  fa: 'فارسی',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  el: 'Ελληνικά',
  no: 'Norsk',
  fi: 'Suomi',
  da: 'Dansk',
  jv: 'Basa Jawa',
  ta: 'தமிழ்',
  pa: 'ਪੰਜਾਬੀ',
  uk: 'Українська',
  be: 'Беларуская',
  kk: 'Қазақша',
  uz: "O'zbekcha",
  az: 'Azərbaycanca',
  hy: 'Հայերէն',
  ka: 'ქართული',
  ky: 'Кыргызча',
};

// ─── Translation Store ────────────────────────────────────────────

type TranslationDict = Record<string, string>;
const translations: Record<string, TranslationDict> = {};

let currentLocale: Locale = 'en';
const fallbackLocale: Locale = 'en';

/**
 * Register translations for a locale.
 */
export function registerLocale(locale: Locale, dict: TranslationDict): void {
  translations[locale] = { ...translations[locale], ...dict };
}

/**
 * Get a translated string by key.
 * Falls back to fallback locale (en), then returns the key itself.
 *
 * Supports interpolation: t('hello', 'ru', { name: 'World' })
 * where translation has "Привет, {{name}}!"
 */
export function t(key: string, locale?: Locale, params?: Record<string, string | number>): string {
  const loc = locale ?? currentLocale;
  let text = translations[loc]?.[key] ?? translations[fallbackLocale]?.[key] ?? key;

  if (params) {
    for (const [param, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), String(value));
    }
  }

  return text;
}

/**
 * Set the current locale.
 */
export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

/**
 * Get the current locale.
 */
export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Get all available locales.
 */
export function getAvailableLocales(): Locale[] {
  return [...AVAILABLE_LOCALES];
}

/**
 * Check if a locale has all required translation keys.
 */
export function validateLocale(locale: Locale, requiredKeys: string[]): { missing: string[]; complete: boolean } {
  const dict = translations[locale] || {};
  const missing = requiredKeys.filter((key) => !(key in dict));
  return { missing, complete: missing.length === 0 };
}

/**
 * Get all registered translation keys for the fallback locale.
 */
export function getRegisteredKeys(): string[] {
  return Object.keys(translations[fallbackLocale] || {});
}
