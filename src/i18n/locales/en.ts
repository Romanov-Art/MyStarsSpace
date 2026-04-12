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
  'theme.black': 'Black', 'theme.white': 'White', 'theme.navy': 'Navy',
};

registerLocale('en', en);
export default en;
