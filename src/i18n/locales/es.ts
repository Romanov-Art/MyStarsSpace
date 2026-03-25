/**
 * Spanish translations (Español)
 */
import { registerLocale } from '../index.js';

const es: Record<string, string> = {
  'cardinal.north': 'N', 'cardinal.south': 'S', 'cardinal.east': 'E', 'cardinal.west': 'O',
  'ui.city': 'Ciudad', 'ui.date': 'Fecha', 'ui.time': 'Hora', 'ui.theme': 'Tema',
  'ui.layers': 'Capas', 'ui.meridians': 'Meridianos', 'ui.constellations': 'Constelaciones',
  'ui.constellation_names': 'Nombres de constelaciones', 'ui.milky_way': 'Vía Láctea',
  'ui.export_png': 'Descargar PNG', 'ui.phrase': 'Frase', 'ui.size': 'Tamaño', 'ui.language': 'Idioma',
  'poster.under_this_sky': 'Bajo este cielo',
  'poster.the_night_we_met': 'La noche en que nos conocimos',
  'poster.stars_of_your_birth': 'Las estrellas en tu cumpleaños',
  'poster.our_special_night': 'Nuestra noche especial',
  'poster.written_in_stars': 'Escrito en las estrellas',
  'poster.moment_in_time': 'Un momento en el tiempo',
  'category.birthday': 'Cumpleaños', 'category.wedding': 'Boda',
  'category.relationship': 'Relación', 'category.memorial': 'Conmemoración',
  'category.baby': 'Nacimiento', 'category.custom': 'Texto personalizado',
  'phrase.birthday.1': 'El cielo el día que naciste',
  'phrase.birthday.2': 'Bajo estas estrellas llegaste al mundo',
  'phrase.birthday.3': 'El cielo en tu cumpleaños',
  'phrase.wedding.1': 'El cielo el día de nuestra boda',
  'phrase.wedding.2': 'Bajo estas estrellas dijimos «Sí»',
  'phrase.wedding.3': 'Las estrellas de nuestro mejor día',
  'phrase.relationship.1': 'La noche en que nos conocimos',
  'phrase.relationship.2': 'Nuestro primer beso bajo las estrellas',
  'phrase.relationship.3': 'Las estrellas testigos de nuestro amor',
  'month.1': 'Enero', 'month.2': 'Febrero', 'month.3': 'Marzo',
  'month.4': 'Abril', 'month.5': 'Mayo', 'month.6': 'Junio',
  'month.7': 'Julio', 'month.8': 'Agosto', 'month.9': 'Septiembre',
  'month.10': 'Octubre', 'month.11': 'Noviembre', 'month.12': 'Diciembre',
  'theme.black': 'Negro', 'theme.white': 'Blanco', 'theme.navy': 'Azul marino',
};

registerLocale('es', es);
export default es;
