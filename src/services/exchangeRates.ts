import { useState, useEffect } from 'react';

const CACHE_KEY = 'exchange_rates';
const CACHE_TTL = 3600_000; // 1 hour

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
}

/** Fetch exchange rates from open API, cached for 1h in localStorage */
async function fetchRates(): Promise<Record<string, number>> {
  // Check cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data: CachedRates = JSON.parse(cached);
      if (Date.now() - data.timestamp < CACHE_TTL) {
        return data.rates;
      }
    }
  } catch { /* ignore */ }

  // Fetch fresh rates
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const rates: Record<string, number> = json.rates || {};

    // Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      timestamp: Date.now(),
    } satisfies CachedRates));

    return rates;
  } catch (err) {
    console.warn('Failed to fetch exchange rates:', err);
    return {};
  }
}

/**
 * Convert USD amount to target currency.
 * Rounds UP to nearest whole number (Math.ceil).
 * Returns null if rate not available.
 */
export function convertPrice(
  usdAmount: number,
  targetCurrency: string,
  rates: Record<string, number>,
): number | null {
  if (targetCurrency === 'USD') {
    // Keep USD as-is with cents
    return usdAmount;
  }
  const rate = rates[targetCurrency];
  if (!rate) return null;
  return Math.ceil(usdAmount * rate);
}

/**
 * Format price with currency symbol.
 * USD keeps 2 decimals ($9.99), others show whole numbers.
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  symbol: string,
): string {
  if (currencyCode === 'USD') {
    return `${symbol}${amount.toFixed(2)}`;
  }
  return `${amount} ${symbol}`;
}

/** React hook to get live exchange rates */
export function useExchangeRates(): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchRates().then(setRates);
  }, []);

  return rates;
}
