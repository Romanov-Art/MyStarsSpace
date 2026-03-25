/**
 * German translations (Deutsch)
 */
import { registerLocale } from '../index.js';

const de: Record<string, string> = {
  'cardinal.north': 'N', 'cardinal.south': 'S', 'cardinal.east': 'O', 'cardinal.west': 'W',
  'ui.city': 'Stadt', 'ui.date': 'Datum', 'ui.time': 'Uhrzeit', 'ui.theme': 'Thema',
  'ui.layers': 'Ebenen', 'ui.meridians': 'Meridiane', 'ui.constellations': 'Sternbilder',
  'ui.constellation_names': 'Sternbildnamen', 'ui.milky_way': 'Milchstraße',
  'ui.export_png': 'PNG herunterladen', 'ui.phrase': 'Spruch', 'ui.size': 'Größe', 'ui.language': 'Sprache',
  'poster.under_this_sky': 'Unter diesem Himmel',
  'poster.the_night_we_met': 'Die Nacht, in der wir uns trafen',
  'poster.stars_of_your_birth': 'Die Sterne an deinem Geburtstag',
  'poster.our_special_night': 'Unsere besondere Nacht',
  'poster.written_in_stars': 'In den Sternen geschrieben',
  'poster.moment_in_time': 'Ein Moment in der Zeit',
  'category.birthday': 'Geburtstag', 'category.wedding': 'Hochzeit',
  'category.relationship': 'Beziehung', 'category.memorial': 'Gedenktag',
  'category.baby': 'Geburt', 'category.custom': 'Eigener Text',
  'phrase.birthday.1': 'Der Himmel am Tag deiner Geburt',
  'phrase.birthday.2': 'Unter diesen Sternen kamst du zur Welt',
  'phrase.birthday.3': 'Der Himmel an deinem Geburtstag',
  'phrase.wedding.1': 'Der Himmel an unserem Hochzeitstag',
  'phrase.wedding.2': 'Unter diesen Sternen sagten wir „Ja"',
  'phrase.wedding.3': 'Die Sterne unseres schönsten Tages',
  'phrase.relationship.1': 'Die Nacht, in der wir uns trafen',
  'phrase.relationship.2': 'Unser erster Kuss unter den Sternen',
  'phrase.relationship.3': 'Die Sterne, die unsere Liebe sahen',
  'month.1': 'Januar', 'month.2': 'Februar', 'month.3': 'März',
  'month.4': 'April', 'month.5': 'Mai', 'month.6': 'Juni',
  'month.7': 'Juli', 'month.8': 'August', 'month.9': 'September',
  'month.10': 'Oktober', 'month.11': 'November', 'month.12': 'Dezember',
  'theme.black': 'Schwarz', 'theme.white': 'Weiß', 'theme.navy': 'Dunkelblau',
};

registerLocale('de', de);
export default de;
