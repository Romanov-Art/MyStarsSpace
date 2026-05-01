/**
 * English translations (English)
 */
import { registerLocale } from '../index.js';

const en: Record<string, string> = {
  // Cardinal directions
  'cardinal.north': 'N',
  'cardinal.south': 'S',
  'cardinal.east': 'E',
  'cardinal.west': 'W',

  // UI labels
  'ui.city': 'City',
  'ui.date': 'Date',
  'ui.time': 'Time',
  'ui.theme': 'Theme',
  'ui.layers': 'Layers',
  'ui.meridians': 'Meridians',
  'ui.constellations': 'Constellations',
  'ui.constellation_names': 'Names',
  'ui.milky_way': 'Milky Way',
  'ui.export_png': 'Download PNG',
  'ui.phrase': 'Phrase',
  'ui.size': 'Size',
  'ui.language': 'Language',

  // Poster phrases
  'poster.under_this_sky': 'Under This Sky',
  'poster.the_night_we_met': 'The Night We Met',
  'poster.stars_of_your_birth': 'The Stars on Your Birthday',
  'poster.our_special_night': 'Our Special Night',
  'poster.written_in_stars': 'Written in the Stars',
  'poster.moment_in_time': 'A Moment in Time',

  // Phrase categories
  'category.birthday': 'Birthday',
  'category.wedding': 'Wedding',
  'category.relationship': 'Relationship',
  'category.memorial': 'Memorial',
  'category.baby': 'Baby Born',
  'category.custom': 'Custom Text',
  'category.business': 'Business',

  // Birthday phrases
  'phrase.birthday.1': 'The sky on the day you were born',
  'phrase.birthday.2': 'Under these stars, you came into this world',
  'phrase.birthday.3': 'The sky on your birthday',

  // Wedding phrases
  'phrase.wedding.1': 'The sky on our wedding day',
  'phrase.wedding.2': 'Under these stars, we said "I do"',
  'phrase.wedding.3': 'The stars of our best day',

  // Relationship phrases
  'phrase.relationship.1': 'The night we met',
  'phrase.relationship.2': 'Our first kiss under the stars',
  'phrase.relationship.3': 'The stars that witnessed our love',

  // Business phrases
  'phrase.business.1': 'The beginning of the great journey to the stars',
  'phrase.business.2': 'The night the vision became reality',
  'phrase.business.3': 'Written in the stars from the very first day',

  // Months
  'month.1': 'January', 'month.2': 'February', 'month.3': 'March',
  'month.4': 'April', 'month.5': 'May', 'month.6': 'June',
  'month.7': 'July', 'month.8': 'August', 'month.9': 'September',
  'month.10': 'October', 'month.11': 'November', 'month.12': 'December',

  // Theme names
  // Theme names
  'theme.black': 'Black', 'theme.white': 'White', 'theme.navy': 'Navy',

  // UI — Style panel
  'ui.choose_color': 'Choose Color',
  'ui.choose_style': 'Choose Style',
  'ui.choose_size': 'Choose Size',
  'ui.stars': 'Stars',
  'ui.colors': 'Colors',
  'ui.bw': 'B&W',
  'ui.frame': 'Frame',
  'ui.compass': 'Compass',
  'ui.zodiac': 'Zodiac',
  'ui.show': 'Show',
  'ui.hide': 'Hide',
  'ui.flat': 'Flat',
  'ui.3d': '3D',
  'ui.none': 'None',
  'ui.line': 'Line',
  'ui.double': 'Double',
  'ui.border': 'Border',
  'ui.simple': 'Simple',
  'ui.degrees': 'Degrees',
  'ui.cardinal': 'Cardinal',
  'ui.unit_cm': 'cm',
  'ui.unit_inch': 'inch',
  'ui.exporting': '⏳ Exporting...',
  'ui.editor': 'Editor',

  // UI — Event details
  'ui.enter_event_details': 'Enter Event Details',
  'ui.format_settings': 'Format settings',
  'ui.date_format': 'Date format',
  'ui.full_month_name': 'Full month name',
  'ui.time_format': 'Time format',
  'ui.city_search_placeholder': '🔍 City or coordinates',
  'ui.coords_detected': 'Coordinates detected — press Enter',

  // UI — Phrase & text
  'ui.add_phrase': 'Add a Phrase',
  'ui.or_generate': 'Or generate one',
  'ui.editable_text': 'Editable Text',
  'ui.text_settings': 'Text settings',
  'ui.name_placeholder': 'Name / Company',

  // Size names
  'size.postcard': 'Postcard',
  'size.a4': 'A4',
  'size.standard': 'Standard',
  'size.medium': 'Medium',
  'size.large': 'Large',
  'size.max': 'Max',

  // Font selector
  'ui.font': 'Font',
  'ui.print_color_warning': 'Print colors may differ from what you see on screen!',

  // Zodiac signs
  'zodiac.capricorn': 'Capricorn', 'zodiac.aquarius': 'Aquarius',
  'zodiac.pisces': 'Pisces', 'zodiac.aries': 'Aries',
  'zodiac.taurus': 'Taurus', 'zodiac.gemini': 'Gemini',
  'zodiac.cancer': 'Cancer', 'zodiac.leo': 'Leo',
  'zodiac.virgo': 'Virgo', 'zodiac.libra': 'Libra',
  'zodiac.scorpio': 'Scorpio', 'zodiac.sagittarius': 'Sagittarius',
};

registerLocale('en', en);
export default en;
