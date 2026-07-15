import { describe, it, expect } from 'vitest';
import {
  sanitizeId,
  resolveTemplateUrl,
  settingsStorageKey,
  sanitizeTemplate,
  SETTINGS_KEY_BASE,
} from '../embedConfig.js';

describe('sanitizeId', () => {
  it('accepts alphanumerics, dash, underscore', () => {
    expect(sanitizeId('acme')).toBe('acme');
    expect(sanitizeId('Acme_Shop-2')).toBe('Acme_Shop-2');
  });

  it('rejects traversal, separators, and junk', () => {
    expect(sanitizeId('../secrets')).toBeNull();
    expect(sanitizeId('a/b')).toBeNull();
    expect(sanitizeId('a.b')).toBeNull();
    expect(sanitizeId('a b')).toBeNull();
    expect(sanitizeId('')).toBeNull();
    expect(sanitizeId(null)).toBeNull();
    expect(sanitizeId(undefined)).toBeNull();
  });

  it('rejects oversized ids', () => {
    expect(sanitizeId('x'.repeat(65))).toBeNull();
    expect(sanitizeId('x'.repeat(64))).toBe('x'.repeat(64));
  });
});

describe('resolveTemplateUrl', () => {
  it('loads partner template from partners/ dir', () => {
    expect(resolveTemplateUrl(new URLSearchParams('?partner=acme')))
      .toBe('/templates/partners/acme.json');
  });

  it('explicit template wins over partner', () => {
    expect(resolveTemplateUrl(new URLSearchParams('?partner=acme&template=sky-blue')))
      .toBe('/templates/sky-blue.json');
  });

  it('returns null with no params', () => {
    expect(resolveTemplateUrl(new URLSearchParams(''))).toBeNull();
  });

  it('ignores invalid ids instead of building bad paths', () => {
    expect(resolveTemplateUrl(new URLSearchParams('?partner=..%2F..%2Fetc'))).toBeNull();
    // invalid explicit template falls back to valid partner
    expect(resolveTemplateUrl(new URLSearchParams('?template=a%2Fb&partner=acme')))
      .toBe('/templates/partners/acme.json');
  });
});

describe('settingsStorageKey', () => {
  it('namespaces per partner', () => {
    expect(settingsStorageKey(new URLSearchParams('?partner=acme')))
      .toBe(`${SETTINGS_KEY_BASE}:acme`);
  });

  it('uses base key without partner or with invalid partner', () => {
    expect(settingsStorageKey(new URLSearchParams(''))).toBe(SETTINGS_KEY_BASE);
    expect(settingsStorageKey(new URLSearchParams('?partner=a%2Fb'))).toBe(SETTINGS_KEY_BASE);
  });
});

describe('sanitizeTemplate', () => {
  it('keeps valid template values', () => {
    const tpl = {
      bg: '1a1a2e', text: 'ffffff', accent: 'e94560', panel: '16213e',
      radius: '8', locale: 'ru', theme: 'black', currency: 'RUB',
      dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'cm', fullMonthName: false,
    };
    expect(sanitizeTemplate(tpl)).toEqual(tpl);
  });

  it('URL overrides win over template values', () => {
    const out = sanitizeTemplate({ bg: '111111', locale: 'ru' }, { bg: '222222' });
    expect(out.bg).toBe('222222');
    expect(out.locale).toBe('ru');
  });

  it('drops invalid enum values but keeps the rest', () => {
    const out = sanitizeTemplate({
      locale: 'xx', currency: 'XXX', units: 'meters',
      dateFormat: 'YYYY', timeFormat: '13h', bg: 'abcdef',
    });
    expect(out).toEqual({ bg: 'abcdef' });
  });

  it('drops unknown keys (template/partner/junk)', () => {
    const out = sanitizeTemplate({ template: 'x', partner: 'y', evil: '1', bg: '000000' });
    expect(out).toEqual({ bg: '000000' });
  });

  it('tolerates non-object templates', () => {
    expect(sanitizeTemplate(null)).toEqual({});
    expect(sanitizeTemplate('str')).toEqual({});
    expect(sanitizeTemplate([1, 2])).toEqual({});
    expect(sanitizeTemplate(42, { locale: 'en' })).toEqual({ locale: 'en' });
  });

  it('accepts markup only from the template, never from URL params', () => {
    expect(sanitizeTemplate({ markup: 3 }).markup).toBe(3);
    expect(sanitizeTemplate({ markup: '2.5' }).markup).toBe(2.5);
    expect(sanitizeTemplate({ markup: 3 }, { markup: '0' }).markup).toBe(3);
    expect(sanitizeTemplate({}, { markup: '99' }).markup).toBeUndefined();
    expect(sanitizeTemplate({ markup: -5 }).markup).toBeUndefined();
    expect(sanitizeTemplate({ markup: 'abc' }).markup).toBeUndefined();
  });

  it('coerces string fullMonthName from URL params', () => {
    expect(sanitizeTemplate({}, { fullMonthName: 'true' }).fullMonthName).toBe(true);
    expect(sanitizeTemplate({}, { fullMonthName: 'false' }).fullMonthName).toBe(false);
    expect(sanitizeTemplate({}, { fullMonthName: 'yes' }).fullMonthName).toBeUndefined();
  });
});
