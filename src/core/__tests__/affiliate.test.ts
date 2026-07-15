import { describe, it, expect } from 'vitest';
import {
  sanitizeRef,
  isRefFresh,
  parseStoredRef,
  readRefCookie,
  buildRefCookie,
  AFF_WINDOW_MS,
} from '../../services/affiliate.js';

describe('sanitizeRef', () => {
  it('accepts affiliate codes, rejects junk and traversal', () => {
    expect(sanitizeRef('bloggerA')).toBe('bloggerA');
    expect(sanitizeRef('promo_2026-summer')).toBe('promo_2026-summer');
    expect(sanitizeRef('../x')).toBeNull();
    expect(sanitizeRef('a b')).toBeNull();
    expect(sanitizeRef('')).toBeNull();
    expect(sanitizeRef(null)).toBeNull();
    expect(sanitizeRef('x'.repeat(65))).toBeNull();
  });
});

describe('isRefFresh', () => {
  const now = 1_000_000_000_000;
  it('true inside the 30-day window', () => {
    expect(isRefFresh({ ref: 'a', ts: now - 1000 }, now)).toBe(true);
    expect(isRefFresh({ ref: 'a', ts: now - (AFF_WINDOW_MS - 1) }, now)).toBe(true);
  });
  it('false at/after expiry and for junk', () => {
    expect(isRefFresh({ ref: 'a', ts: now - AFF_WINDOW_MS }, now)).toBe(false);
    expect(isRefFresh({ ref: 'a', ts: now - AFF_WINDOW_MS - 1 }, now)).toBe(false);
    expect(isRefFresh(null, now)).toBe(false);
    expect(isRefFresh({ ref: 'a', ts: NaN }, now)).toBe(false);
  });
});

describe('parseStoredRef', () => {
  it('parses a valid record', () => {
    expect(parseStoredRef('{"ref":"acme","ts":123}')).toEqual({ ref: 'acme', ts: 123 });
  });
  it('rejects malformed or invalid records', () => {
    expect(parseStoredRef('not json')).toBeNull();
    expect(parseStoredRef('{"ref":"../x","ts":1}')).toBeNull();
    expect(parseStoredRef('{"ref":"acme"}')).toBeNull();
    expect(parseStoredRef('{"ts":1}')).toBeNull();
    expect(parseStoredRef(null)).toBeNull();
  });
});

describe('readRefCookie', () => {
  it('extracts and validates aff_ref among other cookies', () => {
    expect(readRefCookie('foo=1; aff_ref=blogger; bar=2')).toBe('blogger');
    expect(readRefCookie('aff_ref=promo_1')).toBe('promo_1');
  });
  it('returns null when absent or invalid', () => {
    expect(readRefCookie('foo=1; bar=2')).toBeNull();
    expect(readRefCookie('aff_ref=has%20space')).toBeNull();
    expect(readRefCookie('')).toBeNull();
    expect(readRefCookie(null)).toBeNull();
  });
});

describe('buildRefCookie', () => {
  it('sets a 30-day Lax cookie, Secure only when asked', () => {
    const c = buildRefCookie('acme', true);
    expect(c).toContain('aff_ref=acme');
    expect(c).toContain('path=/');
    expect(c).toContain(`max-age=${Math.floor(AFF_WINDOW_MS / 1000)}`);
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Secure');
    expect(buildRefCookie('acme', false)).not.toContain('Secure');
  });
});
