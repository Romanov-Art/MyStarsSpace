/**
 * Internationalization (i18n) engine.
 * Core business advantage: multi-language support for 12+ languages.
 */

export type Locale = 'ru' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ar' | 'tr';

export const AVAILABLE_LOCALES: Locale[] = ['ru', 'en', 'de', 'fr', 'es', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'tr'];

export const LOCALE_NAMES: Record<Locale, string> = {
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
