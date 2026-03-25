/**
 * Italian translations (Italiano)
 */
import { registerLocale } from '../index.js';

const it: Record<string, string> = {
  'cardinal.north': 'N', 'cardinal.south': 'S', 'cardinal.east': 'E', 'cardinal.west': 'O',
  'ui.city': 'Città', 'ui.date': 'Data', 'ui.time': 'Ora', 'ui.theme': 'Tema',
  'ui.layers': 'Livelli', 'ui.meridians': 'Meridiani', 'ui.constellations': 'Costellazioni',
  'ui.constellation_names': 'Nomi delle costellazioni', 'ui.milky_way': 'Via Lattea',
  'ui.export_png': 'Scarica PNG', 'ui.phrase': 'Frase', 'ui.size': 'Dimensione', 'ui.language': 'Lingua',
  'poster.under_this_sky': 'Sotto questo cielo',
  'poster.the_night_we_met': 'La notte in cui ci siamo incontrati',
  'poster.stars_of_your_birth': 'Le stelle il giorno della tua nascita',
  'poster.our_special_night': 'La nostra notte speciale',
  'poster.written_in_stars': 'Scritto nelle stelle',
  'poster.moment_in_time': 'Un momento nel tempo',
  'category.birthday': 'Compleanno', 'category.wedding': 'Matrimonio',
  'category.relationship': 'Relazione', 'category.memorial': 'Commemorazione',
  'category.baby': 'Nascita', 'category.custom': 'Testo personalizzato',
  'phrase.birthday.1': 'Il cielo il giorno in cui sei nato',
  'phrase.birthday.2': 'Sotto queste stelle sei venuto al mondo',
  'phrase.birthday.3': 'Il cielo del tuo compleanno',
  'phrase.wedding.1': 'Il cielo il giorno del nostro matrimonio',
  'phrase.wedding.2': 'Sotto queste stelle abbiamo detto «Sì»',
  'phrase.wedding.3': 'Le stelle del nostro giorno più bello',
  'phrase.relationship.1': 'La notte in cui ci siamo incontrati',
  'phrase.relationship.2': 'Il nostro primo bacio sotto le stelle',
  'phrase.relationship.3': 'Le stelle testimoni del nostro amore',
  'month.1': 'Gennaio', 'month.2': 'Febbraio', 'month.3': 'Marzo',
  'month.4': 'Aprile', 'month.5': 'Maggio', 'month.6': 'Giugno',
  'month.7': 'Luglio', 'month.8': 'Agosto', 'month.9': 'Settembre',
  'month.10': 'Ottobre', 'month.11': 'Novembre', 'month.12': 'Dicembre',
  'theme.black': 'Nero', 'theme.white': 'Bianco', 'theme.navy': 'Blu navy',
};

registerLocale('it', it);
export default it;
