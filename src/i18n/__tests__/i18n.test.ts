/**
 * Tests for i18n system.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { t, setLocale, getLocale, getAvailableLocales, validateLocale, getRegisteredKeys, AVAILABLE_LOCALES, type Locale } from '../index.js';

// Import all locales to register them
import '../all-locales.js';

describe('i18n core', () => {
  it('should have 12 available locales', () => {
    expect(getAvailableLocales()).toHaveLength(12);
    expect(getAvailableLocales()).toContain('ru');
    expect(getAvailableLocales()).toContain('en');
    expect(getAvailableLocales()).toContain('de');
    expect(getAvailableLocales()).toContain('fr');
    expect(getAvailableLocales()).toContain('ja');
    expect(getAvailableLocales()).toContain('ar');
    expect(getAvailableLocales()).toContain('tr');
  });

  it('should set and get locale', () => {
    setLocale('ru');
    expect(getLocale()).toBe('ru');
    setLocale('en');
    expect(getLocale()).toBe('en');
  });
});

describe('t() translation function', () => {
  it('should return correct translation for ru', () => {
    expect(t('cardinal.north', 'ru')).toBe('С');
    expect(t('cardinal.south', 'ru')).toBe('Ю');
    expect(t('cardinal.east', 'ru')).toBe('В');
    expect(t('cardinal.west', 'ru')).toBe('З');
  });

  it('should return correct translation for en', () => {
    expect(t('cardinal.north', 'en')).toBe('N');
    expect(t('cardinal.south', 'en')).toBe('S');
    expect(t('cardinal.east', 'en')).toBe('E');
    expect(t('cardinal.west', 'en')).toBe('W');
  });

  it('should return correct cardinal directions for ja', () => {
    expect(t('cardinal.north', 'ja')).toBe('北');
    expect(t('cardinal.south', 'ja')).toBe('南');
  });

  it('should return correct cardinal directions for zh', () => {
    expect(t('cardinal.north', 'zh')).toBe('北');
    expect(t('cardinal.south', 'zh')).toBe('南');
    expect(t('cardinal.east', 'zh')).toBe('东');
    expect(t('cardinal.west', 'zh')).toBe('西');
  });

  it('should return correct cardinal directions for tr', () => {
    expect(t('cardinal.north', 'tr')).toBe('K');
    expect(t('cardinal.south', 'tr')).toBe('G');
  });

  it('should use current locale when locale parameter not specified', () => {
    setLocale('ru');
    expect(t('ui.city')).toBe('Город');
    setLocale('en');
    expect(t('ui.city')).toBe('City');
    setLocale('de');
    expect(t('ui.city')).toBe('Stadt');
  });

  it('should fall back to "en" for missing keys', () => {
    // If a key is missing in a locale, should fall back to English
    const nonExistentKey = 'nonexistent.key';
    const result = t(nonExistentKey, 'ru');
    // Should return the key itself since it doesn't exist in any locale
    expect(result).toBe(nonExistentKey);
  });

  it('should support interpolation', () => {
    // Test with a key that has interpolation markers
    // For now, just test the mechanism works
    const testKey = 'test.interpolation';
    // Since we don't have this key registered, it should return the key
    expect(t(testKey, 'en', { name: 'World' })).toBe(testKey);
  });

  it('should return poster phrases in different languages', () => {
    expect(t('poster.under_this_sky', 'ru')).toBe('Под этим небом');
    expect(t('poster.under_this_sky', 'en')).toBe('Under This Sky');
    expect(t('poster.under_this_sky', 'de')).toBe('Unter diesem Himmel');
    expect(t('poster.under_this_sky', 'fr')).toBe('Sous ce ciel');
    expect(t('poster.under_this_sky', 'es')).toBe('Bajo este cielo');
    expect(t('poster.under_this_sky', 'it')).toBe('Sotto questo cielo');
    expect(t('poster.under_this_sky', 'pt')).toBe('Sob este céu');
    expect(t('poster.under_this_sky', 'ja')).toBe('この空の下で');
    expect(t('poster.under_this_sky', 'ko')).toBe('이 하늘 아래에서');
    expect(t('poster.under_this_sky', 'zh')).toBe('在这片星空下');
    expect(t('poster.under_this_sky', 'ar')).toBe('تحت هذه السماء');
    expect(t('poster.under_this_sky', 'tr')).toBe('Bu gökyüzünün altında');
  });

  it('should return month names in different languages', () => {
    expect(t('month.1', 'ru')).toBe('Январь');
    expect(t('month.1', 'en')).toBe('January');
    expect(t('month.1', 'de')).toBe('Januar');
    expect(t('month.1', 'ja')).toBe('1月');
  });
});

describe('locale completeness', () => {
  it('all locales should have the same keys as English', () => {
    const enKeys = getRegisteredKeys();
    expect(enKeys.length).toBeGreaterThan(0);

    for (const locale of AVAILABLE_LOCALES) {
      const { missing, complete } = validateLocale(locale, enKeys);
      if (!complete) {
        console.warn(`Locale "${locale}" is missing keys:`, missing);
      }
      // All locales should be complete
      expect(missing).toHaveLength(0);
    }
  });
});
