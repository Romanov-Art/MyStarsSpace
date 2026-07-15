import { describe, it, expect } from 'vitest';
import {
  getPartnerPrice,
  MIN_PARTNER_PRICE_USD,
  MAX_PARTNER_MARKUP_USD,
} from '../../config/pricing.js';

describe('getPartnerPrice', () => {
  it('never goes below the $5 minimum', () => {
    expect(getPartnerPrice(0, 0)).toBe(MIN_PARTNER_PRICE_USD);
    expect(getPartnerPrice(3.99, 0)).toBe(MIN_PARTNER_PRICE_USD);
    expect(getPartnerPrice(4.99, 0)).toBe(MIN_PARTNER_PRICE_USD);
  });

  it('keeps base price when above the minimum', () => {
    expect(getPartnerPrice(9.99, 0)).toBe(9.99);
    expect(getPartnerPrice(19.99, 0)).toBe(19.99);
  });

  it('adds partner markup on top', () => {
    expect(getPartnerPrice(9.99, 3)).toBeCloseTo(12.99);
    expect(getPartnerPrice(2, 1)).toBe(MIN_PARTNER_PRICE_USD + 1);
  });

  it('clamps junk markup instead of breaking the price', () => {
    expect(getPartnerPrice(9.99, -10)).toBe(9.99);
    expect(getPartnerPrice(9.99, NaN)).toBe(9.99);
    expect(getPartnerPrice(9.99, Infinity)).toBe(9.99);
    expect(getPartnerPrice(9.99, 'abc' as unknown)).toBe(9.99);
    expect(getPartnerPrice(9.99, 10_000)).toBe(9.99 + MAX_PARTNER_MARKUP_USD);
  });
});
