/** Base prices in USD for each poster size */
export const SIZE_PRICES_USD: Record<string, number> = {
  '10×15': 9.99,
  'A4':    9.99,
  '30×40': 12.99,
  '40×50': 15.99,
  '45×60': 17.99,
  '60×90': 19.99,
};

/** Get base USD price for a size label */
export function getBasePrice(sizeLabel: string): number {
  return SIZE_PRICES_USD[sizeLabel] ?? 0;
}
