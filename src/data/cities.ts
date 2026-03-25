/**
 * City database for location selection.
 * ~50 major world cities with coordinates and timezones.
 */

import type { City } from '../types/index.js';

export const cities: City[] = [
  // Russia
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lon: 37.6173, timezone: 'Europe/Moscow', localizedNames: { ru: 'Москва', de: 'Moskau', fr: 'Moscou', ja: 'モスクワ', zh: '莫斯科', ko: '모스크바', ar: 'موسكو' } },
  { name: 'Saint Petersburg', country: 'Russia', lat: 59.9343, lon: 30.3351, timezone: 'Europe/Moscow', localizedNames: { ru: 'Санкт-Петербург', de: 'Sankt Petersburg', fr: 'Saint-Pétersbourg', ja: 'サンクトペテルブルク', zh: '圣彼得堡' } },
  { name: 'Novosibirsk', country: 'Russia', lat: 55.0084, lon: 82.9357, timezone: 'Asia/Novosibirsk', localizedNames: { ru: 'Новосибирск' } },
  { name: 'Yekaterinburg', country: 'Russia', lat: 56.8389, lon: 60.6057, timezone: 'Asia/Yekaterinburg', localizedNames: { ru: 'Екатеринбург' } },
  { name: 'Kazan', country: 'Russia', lat: 55.7964, lon: 49.1089, timezone: 'Europe/Moscow', localizedNames: { ru: 'Казань' } },
  { name: 'Sochi', country: 'Russia', lat: 43.5855, lon: 39.7231, timezone: 'Europe/Moscow', localizedNames: { ru: 'Сочи' } },
  // Europe
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London', localizedNames: { ru: 'Лондон', de: 'London', fr: 'Londres', ja: 'ロンドン', zh: '伦敦', ko: '런던', ar: 'لندن' } },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris', localizedNames: { ru: 'Париж', de: 'Paris', ja: 'パリ', zh: '巴黎', ko: '파리', ar: 'باريس' } },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin', localizedNames: { ru: 'Берлин', fr: 'Berlin', ja: 'ベルリン', zh: '柏林', ko: '베를린', ar: 'برلين' } },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, timezone: 'Europe/Rome', localizedNames: { ru: 'Рим', de: 'Rom', fr: 'Rome', ja: 'ローマ', zh: '罗马', ko: '로마', ar: 'روما' } },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, timezone: 'Europe/Madrid', localizedNames: { ru: 'Мадрид', ja: 'マドリード', zh: '马德里' } },
  { name: 'Barcelona', country: 'Spain', lat: 41.3874, lon: 2.1686, timezone: 'Europe/Madrid', localizedNames: { ru: 'Барселона', ja: 'バルセロナ', zh: '巴塞罗那' } },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, timezone: 'Europe/Amsterdam', localizedNames: { ru: 'Амстердам', ja: 'アムステルダム', zh: '阿姆斯特丹' } },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738, timezone: 'Europe/Vienna', localizedNames: { ru: 'Вена', de: 'Wien', fr: 'Vienne', ja: 'ウィーン', zh: '维也纳' } },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lon: 14.4378, timezone: 'Europe/Prague', localizedNames: { ru: 'Прага', de: 'Prag', fr: 'Prague', ja: 'プラハ', zh: '布拉格' } },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lon: 21.0122, timezone: 'Europe/Warsaw', localizedNames: { ru: 'Варшава', de: 'Warschau', fr: 'Varsovie', ja: 'ワルシャワ', zh: '华沙' } },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lon: 28.9784, timezone: 'Europe/Istanbul', localizedNames: { ru: 'Стамбул', de: 'Istanbul', fr: 'Istanbul', ja: 'イスタンブール', zh: '伊斯坦布尔', tr: 'İstanbul' } },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393, timezone: 'Europe/Lisbon', localizedNames: { ru: 'Лиссабон', de: 'Lissabon', fr: 'Lisbonne', pt: 'Lisboa', ja: 'リスボン', zh: '里斯本' } },
  // Americas
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York', localizedNames: { ru: 'Нью-Йорк', de: 'New York', fr: 'New York', ja: 'ニューヨーク', zh: '纽约', ko: '뉴욕', ar: 'نيويورك' } },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles', localizedNames: { ru: 'Лос-Анджелес', ja: 'ロサンゼルス', zh: '洛杉矶' } },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lon: -87.6298, timezone: 'America/Chicago', localizedNames: { ru: 'Чикаго', ja: 'シカゴ', zh: '芝加哥' } },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832, timezone: 'America/Toronto', localizedNames: { ru: 'Торонто', ja: 'トロント', zh: '多伦多' } },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, timezone: 'America/Mexico_City', localizedNames: { ru: 'Мехико', de: 'Mexiko-Stadt', fr: 'Mexico', es: 'Ciudad de México', ja: 'メキシコシティ', zh: '墨西哥城' } },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lon: -46.6333, timezone: 'America/Sao_Paulo', localizedNames: { ru: 'Сан-Паулу', ja: 'サンパウロ', zh: '圣保罗' } },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lon: -58.3816, timezone: 'America/Argentina/Buenos_Aires', localizedNames: { ru: 'Буэнос-Айрес', ja: 'ブエノスアイレス', zh: '布宜诺斯艾利斯' } },
  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, timezone: 'Asia/Tokyo', localizedNames: { ru: 'Токио', ja: '東京', zh: '东京', ko: '도쿄', ar: 'طوكيو' } },
  { name: 'Beijing', country: 'China', lat: 39.9042, lon: 116.4074, timezone: 'Asia/Shanghai', localizedNames: { ru: 'Пекин', de: 'Peking', fr: 'Pékin', ja: '北京', zh: '北京', ko: '베이징', ar: 'بكين' } },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lon: 121.4737, timezone: 'Asia/Shanghai', localizedNames: { ru: 'Шанхай', ja: '上海', zh: '上海', ko: '상하이' } },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.9780, timezone: 'Asia/Seoul', localizedNames: { ru: 'Сеул', ja: 'ソウル', zh: '首尔', ko: '서울', ar: 'سيول' } },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lon: 100.5018, timezone: 'Asia/Bangkok', localizedNames: { ru: 'Бангкок', ja: 'バンコク', zh: '曼谷' } },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, timezone: 'Asia/Singapore', localizedNames: { ru: 'Сингапур', ja: 'シンガポール', zh: '新加坡' } },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lon: 55.2708, timezone: 'Asia/Dubai', localizedNames: { ru: 'Дубай', ja: 'ドバイ', zh: '迪拜', ar: 'دبي' } },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777, timezone: 'Asia/Kolkata', localizedNames: { ru: 'Мумбаи', ja: 'ムンバイ', zh: '孟买' } },
  { name: 'Delhi', country: 'India', lat: 28.7041, lon: 77.1025, timezone: 'Asia/Kolkata', localizedNames: { ru: 'Дели', ja: 'デリー', zh: '德里', ar: 'دلهي' } },
  // Africa & Middle East
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, timezone: 'Africa/Cairo', localizedNames: { ru: 'Каир', de: 'Kairo', fr: 'Le Caire', ja: 'カイロ', zh: '开罗', ar: 'القاهرة' } },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lon: 18.4241, timezone: 'Africa/Johannesburg', localizedNames: { ru: 'Кейптаун', de: 'Kapstadt', fr: 'Le Cap', ja: 'ケープタウン', zh: '开普敦' } },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lon: 34.7818, timezone: 'Asia/Jerusalem', localizedNames: { ru: 'Тель-Авив', ja: 'テルアビブ', zh: '特拉维夫', ar: 'تل أبيب' } },
  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, timezone: 'Australia/Sydney', localizedNames: { ru: 'Сидней', ja: 'シドニー', zh: '悉尼', ko: '시드니' } },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lon: 144.9631, timezone: 'Australia/Melbourne', localizedNames: { ru: 'Мельбурн', ja: 'メルボルン', zh: '墨尔本' } },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lon: 174.7633, timezone: 'Pacific/Auckland', localizedNames: { ru: 'Окленд', ja: 'オークランド', zh: '奥克兰' } },
  // More Russian cities
  { name: 'Krasnoyarsk', country: 'Russia', lat: 56.0153, lon: 92.8932, timezone: 'Asia/Krasnoyarsk', localizedNames: { ru: 'Красноярск' } },
  { name: 'Vladivostok', country: 'Russia', lat: 43.1332, lon: 131.9113, timezone: 'Asia/Vladivostok', localizedNames: { ru: 'Владивосток' } },
  { name: 'Kaliningrad', country: 'Russia', lat: 54.7104, lon: 20.4522, timezone: 'Europe/Kaliningrad', localizedNames: { ru: 'Калининград' } },
  { name: 'Nizhny Novgorod', country: 'Russia', lat: 56.2965, lon: 43.9361, timezone: 'Europe/Moscow', localizedNames: { ru: 'Нижний Новгород' } },
  { name: 'Samara', country: 'Russia', lat: 53.1959, lon: 50.1002, timezone: 'Europe/Samara', localizedNames: { ru: 'Самара' } },
  { name: 'Rostov-on-Don', country: 'Russia', lat: 47.2357, lon: 39.7015, timezone: 'Europe/Moscow', localizedNames: { ru: 'Ростов-на-Дону' } },
  { name: 'Ufa', country: 'Russia', lat: 54.7388, lon: 55.9721, timezone: 'Asia/Yekaterinburg', localizedNames: { ru: 'Уфа' } },
  { name: 'Voronezh', country: 'Russia', lat: 51.6755, lon: 39.2089, timezone: 'Europe/Moscow', localizedNames: { ru: 'Воронеж' } },
  { name: 'Perm', country: 'Russia', lat: 58.0105, lon: 56.2502, timezone: 'Asia/Yekaterinburg', localizedNames: { ru: 'Пермь' } },
  { name: 'Krasnodar', country: 'Russia', lat: 45.0355, lon: 38.9753, timezone: 'Europe/Moscow', localizedNames: { ru: 'Краснодар' } },
];

/**
 * Search cities by name (case-insensitive, supports localized names).
 */
export function findCity(query: string, locale?: string): City[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return cities.filter((city) => {
    // Search by English name
    if (city.name.toLowerCase().includes(q)) return true;
    // Search by country
    if (city.country.toLowerCase().includes(q)) return true;
    // Search by localized names
    if (city.localizedNames) {
      // If locale specified, search that locale first
      if (locale && city.localizedNames[locale]?.toLowerCase().includes(q)) return true;
      // Search all localizations
      return Object.values(city.localizedNames).some((name) => name.toLowerCase().includes(q));
    }
    return false;
  });
}

/**
 * Get city name in the specified locale, falling back to English.
 */
export function getCityName(city: City, locale: string): string {
  return city.localizedNames?.[locale] || city.name;
}
