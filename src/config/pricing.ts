/** Base prices in USD for each poster size */
export const SIZE_PRICES_USD: Record<string, number> = {
  '10×15': 9.99,
  'A4':    9.99,
  '30×40': 12.99,
  '40×50': 15.99,
  '40×60': 17.99,
  '50×70': 19.99,
};

/** Get base USD price for a size label */
export function getBasePrice(sizeLabel: string): number {
  return SIZE_PRICES_USD[sizeLabel] ?? 0;
}

/** Partner embeds may never sell below this price */
export const MIN_PARTNER_PRICE_USD = 5;

/** Highest markup a partner template may add, USD */
export const MAX_PARTNER_MARKUP_USD = 500;

/**
 * Price shown in a partner embed: base price floored at the minimum, plus
 * the partner's markup. Junk markup (negative, NaN, over the cap) is clamped
 * so a bad template can only fall back to the floored base price.
 */
export function getPartnerPrice(baseUsd: number, markupUsd: unknown): number {
  const markup = typeof markupUsd === 'number' && Number.isFinite(markupUsd)
    ? Math.min(Math.max(markupUsd, 0), MAX_PARTNER_MARKUP_USD)
    : 0;
  return Math.max(baseUsd, MIN_PARTNER_PRICE_USD) + markup;
}
