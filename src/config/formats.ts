/** Display format preferences for poster text */
export type DateFormatType = 'DD.MM.YYYY' | 'MM/DD/YYYY';
export type TimeFormatType = '24h' | '12h';
export type UnitSystem = 'metric' | 'imperial';

export interface FormatSettings {
  dateFormat: DateFormatType;
  timeFormat: TimeFormatType;
  units: UnitSystem;
  fullMonthName: boolean;
}

/** Defaults per locale */
const LOCALE_FORMAT_DEFAULTS: Record<string, Partial<FormatSettings>> = {
  en: { dateFormat: 'MM/DD/YYYY', timeFormat: '12h', units: 'imperial', fullMonthName: false },
  ru: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  de: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  fr: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  es: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  it: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  pt: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
  ja: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: true },
  ko: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: true },
  zh: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: true },
  ar: { dateFormat: 'DD.MM.YYYY', timeFormat: '12h', units: 'metric', fullMonthName: false },
  tr: { dateFormat: 'DD.MM.YYYY', timeFormat: '24h', units: 'metric', fullMonthName: false },
};

/** Get default format settings for a locale */
export function getDefaultFormats(locale: string): FormatSettings {
  const defaults = LOCALE_FORMAT_DEFAULTS[locale] || {};
  return {
    dateFormat: defaults.dateFormat || 'DD.MM.YYYY',
    timeFormat: defaults.timeFormat || '24h',
    units: defaults.units || 'metric',
    fullMonthName: defaults.fullMonthName ?? false,
  };
}

/** Month names for all supported locales */
const MONTH_NAMES: Record<string, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ru: ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  ja: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
};

/** Format date string based on format settings */
export function formatDate(
  day: number,
  month: number,
  year: number,
  format: DateFormatType,
  locale: string,
  fullMonthName?: boolean,
): string {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');

  if (fullMonthName) {
    const monthName = (MONTH_NAMES[locale] || MONTH_NAMES.en)[month - 1];

    // CJK languages: YYYY年MM月DD日 order
    if (locale === 'ja') return `${year}年${monthName}${day}日`;
    if (locale === 'zh') return `${year}年${monthName}${day}日`;
    if (locale === 'ko') return `${year}년 ${monthName} ${day}일`;

    // MM/DD/YYYY → "October 12, 1995"  |  DD.MM.YYYY → "12 October 1995"
    if (format === 'MM/DD/YYYY') {
      return `${monthName} ${day}, ${year}`;
    }
    return `${day} ${monthName} ${year}`;
  }

  switch (format) {
    case 'DD.MM.YYYY':
      return `${dd}.${mm}.${year}`;
    case 'MM/DD/YYYY':
      return `${mm}/${dd}/${year}`;
    default:
      // Fallback for any unexpected format (e.g. legacy 'full' from localStorage)
      return `${dd}.${mm}.${year}`;
  }
}

/** Format time string based on format settings */
export function formatTime(
  hours: number,
  minutes: number,
  format: TimeFormatType,
): string {
  const mm = String(minutes).padStart(2, '0');

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${mm}`;
  }

  // 12h format
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${mm} ${period}`;
}

/** Convert between metric and imperial for poster size display */
export function formatSize(
  widthCm: number,
  heightCm: number,
  units: UnitSystem,
): string {
  if (units === 'metric') {
    return `${widthCm}×${heightCm} cm`;
  }
  // Convert cm to inches (1 inch = 2.54 cm)
  const wIn = (widthCm / 2.54).toFixed(1).replace(/\.0$/, '');
  const hIn = (heightCm / 2.54).toFixed(1).replace(/\.0$/, '');
  return `${wIn}×${hIn} in`;
}
