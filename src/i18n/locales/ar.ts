/**
 * Arabic translations (العربية)
 */
import { registerLocale } from '../index.js';

const ar: Record<string, string> = {
  'cardinal.north': 'ش', 'cardinal.south': 'ج', 'cardinal.east': 'شر', 'cardinal.west': 'غ',
  'ui.city': 'المدينة', 'ui.date': 'التاريخ', 'ui.time': 'الوقت', 'ui.theme': 'السمة',
  'ui.layers': 'الطبقات', 'ui.meridians': 'خطوط الطول', 'ui.constellations': 'الأبراج',
  'ui.constellation_names': 'أسماء الأبراج', 'ui.milky_way': 'درب التبانة',
  'ui.export_png': 'تحميل PNG', 'ui.phrase': 'العبارة', 'ui.size': 'الحجم', 'ui.language': 'اللغة',
  'poster.under_this_sky': 'تحت هذه السماء',
  'poster.the_night_we_met': 'الليلة التي التقينا فيها',
  'poster.stars_of_your_birth': 'نجوم يوم ميلادك',
  'poster.our_special_night': 'ليلتنا المميزة',
  'poster.written_in_stars': 'مكتوب في النجوم',
  'poster.moment_in_time': 'لحظة في الزمن',
  'category.birthday': 'عيد ميلاد', 'category.wedding': 'زفاف',
  'category.relationship': 'علاقة', 'category.memorial': 'ذكرى',
  'category.baby': 'مولود جديد', 'category.custom': 'نص مخصص',
  'phrase.birthday.1': 'السماء في يوم ميلادك',
  'phrase.birthday.2': 'تحت هذه النجوم جئت إلى العالم',
  'phrase.birthday.3': 'سماء عيد ميلادك',
  'phrase.wedding.1': 'السماء في يوم زفافنا',
  'phrase.wedding.2': 'تحت هذه النجوم قلنا «نعم»',
  'phrase.wedding.3': 'نجوم أجمل أيامنا',
  'phrase.relationship.1': 'الليلة التي التقينا فيها',
  'phrase.relationship.2': 'قبلتنا الأولى تحت النجوم',
  'phrase.relationship.3': 'النجوم التي شهدت حبنا',
  'month.1': 'يناير', 'month.2': 'فبراير', 'month.3': 'مارس',
  'month.4': 'أبريل', 'month.5': 'مايو', 'month.6': 'يونيو',
  'month.7': 'يوليو', 'month.8': 'أغسطس', 'month.9': 'سبتمبر',
  'month.10': 'أكتوبر', 'month.11': 'نوفمبر', 'month.12': 'ديسمبر',
  'theme.black': 'أسود', 'theme.white': 'أبيض', 'theme.navy': 'كحلي',
};

registerLocale('ar', ar);
export default ar;
