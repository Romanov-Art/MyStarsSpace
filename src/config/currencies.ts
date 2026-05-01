/**
 * Currency configuration for the whitelabel embed.
 * Format: [icon] CODE: Full Name
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  /** Circle icon color for the Binance-style badge */
  color: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$',  name: 'US Dollar',            color: '#2ebd85' },
  { code: 'EUR', symbol: '€',  name: 'Euro',                 color: '#003399' },
  { code: 'GBP', symbol: '£',  name: 'British Pound',        color: '#1a237e' },
  { code: 'RUB', symbol: '₽',  name: 'Russian Ruble',        color: '#c0392b' },
  { code: 'UAH', symbol: '₴',  name: 'Ukrainian Hryvnia',    color: '#ffd600' },
  { code: 'KZT', symbol: '₸',  name: 'Kazakhstani Tenge',    color: '#00bcd4' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble',     color: '#4caf50' },
  { code: 'JPY', symbol: '¥',  name: 'Japanese Yen',         color: '#d32f2f' },
  { code: 'CNY', symbol: '¥',  name: 'Chinese Yuan',         color: '#e53935' },
  { code: 'KRW', symbol: '₩',  name: 'South Korean Won',     color: '#1565c0' },
  { code: 'INR', symbol: '₹',  name: 'Indian Rupee',         color: '#ff9800' },
  { code: 'THB', symbol: '฿',  name: 'Thai Baht',            color: '#7b1fa2' },
  { code: 'VND', symbol: '₫',  name: 'Vietnamese Dong',      color: '#d32f2f' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah',    color: '#c62828' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit',    color: '#0d47a1' },
  { code: 'TRY', symbol: '₺',  name: 'Turkish Lira',         color: '#c62828' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty',         color: '#b71c1c' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona',        color: '#1565c0' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone',      color: '#c62828' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone',         color: '#c62828' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc',          color: '#c62828' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar',      color: '#c62828' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar',    color: '#1565c0' },
  { code: 'NZD', symbol: 'NZ$',name: 'New Zealand Dollar',   color: '#000000' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real',       color: '#2e7d32' },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso',      color: '#2e7d32' },
  { code: 'ARS', symbol: 'AR$', name: 'Argentine Peso',      color: '#1976d2' },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso',    color: '#f9a825' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso',      color: '#c62828' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',          color: '#2e7d32' },
  { code: 'SAR', symbol: '﷼',  name: 'Saudi Riyal',          color: '#2e7d32' },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal',         color: '#7b1fa2' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar',       color: '#2e7d32' },
  { code: 'BHD', symbol: 'BD', name: 'Bahraini Dinar',       color: '#c62828' },
  { code: 'OMR', symbol: '﷼',  name: 'Omani Rial',           color: '#c62828' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound',       color: '#000000' },
  { code: 'ZAR', symbol: 'R',  name: 'South African Rand',   color: '#2e7d32' },
  { code: 'NGN', symbol: '₦',  name: 'Nigerian Naira',       color: '#2e7d32' },
  { code: 'GEL', symbol: '₾',  name: 'Georgian Lari',        color: '#c62828' },
  { code: 'ILS', symbol: '₪',  name: 'Israeli Shekel',       color: '#1565c0' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint',     color: '#388e3c' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna',         color: '#1565c0' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu',        color: '#1565c0' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev',        color: '#2e7d32' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna',        color: '#1565c0' },
  { code: 'RSD', symbol: 'дин', name: 'Serbian Dinar',       color: '#c62828' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar',       color: '#c62828' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar',     color: '#c62828' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',   color: '#c62828' },
  { code: 'PHP', symbol: '₱',  name: 'Philippine Peso',      color: '#1565c0' },
  { code: 'PKR', symbol: '₨',  name: 'Pakistani Rupee',      color: '#2e7d32' },
  { code: 'BDT', symbol: '৳',  name: 'Bangladeshi Taka',     color: '#2e7d32' },
  { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee',     color: '#7b1fa2' },
];

/** Default currency */
export const DEFAULT_CURRENCY = 'USD';
