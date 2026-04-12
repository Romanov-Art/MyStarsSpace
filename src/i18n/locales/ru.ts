/**
 * Russian translations (Русский)
 */
import { registerLocale } from '../index.js';

const ru: Record<string, string> = {
  // Cardinal directions
  'cardinal.north': 'С',
  'cardinal.south': 'Ю',
  'cardinal.east': 'В',
  'cardinal.west': 'З',

  // UI labels
  'ui.city': 'Город',
  'ui.date': 'Дата',
  'ui.time': 'Время',
  'ui.theme': 'Тема',
  'ui.layers': 'Слои',
  'ui.meridians': 'Меридианы',
  'ui.constellations': 'Созвездия',
  'ui.constellation_names': 'Названия',
  'ui.milky_way': 'Млечный Путь',
  'ui.export_png': 'Скачать PNG',
  'ui.phrase': 'Фраза',
  'ui.size': 'Размер',
  'ui.language': 'Язык',

  // Poster phrases
  'poster.under_this_sky': 'Под этим небом',
  'poster.the_night_we_met': 'Ночь, когда мы встретились',
  'poster.stars_of_your_birth': 'Звёзды в день твоего рождения',
  'poster.our_special_night': 'Наша особенная ночь',
  'poster.written_in_stars': 'Написано на звёздах',
  'poster.moment_in_time': 'Момент во времени',

  // Phrase categories
  'category.birthday': 'День Рождения',
  'category.wedding': 'Свадьба',
  'category.relationship': 'Отношения',
  'category.memorial': 'Памятная дата',
  'category.baby': 'Рождение ребёнка',
  'category.custom': 'Свой текст',
  'category.business': 'Бизнес',

  // Birthday phrases
  'phrase.birthday.1': 'Звёздное небо в день, когда ты появился на свет',
  'phrase.birthday.2': 'Под этими звёздами ты пришёл в этот мир',
  'phrase.birthday.3': 'Небо в день твоего рождения',

  // Wedding phrases
  'phrase.wedding.1': 'Небо в день нашей свадьбы',
  'phrase.wedding.2': 'Под этими звёздами мы сказали «Да»',
  'phrase.wedding.3': 'Карта звёзд нашего лучшего дня',

  // Relationship phrases
  'phrase.relationship.1': 'Ночь, когда мы встретились',
  'phrase.relationship.2': 'Наш первый поцелуй под звёздами',
  'phrase.relationship.3': 'Звёзды, что видели нашу любовь',

  // Business phrases
  'phrase.business.1': 'Начало великого пути к звёздам',
  'phrase.business.2': 'Ночь, когда мечта стала реальностью',
  'phrase.business.3': 'Записано на звёздах с первого дня',

  // Months
  'month.1': 'Январь', 'month.2': 'Февраль', 'month.3': 'Март',
  'month.4': 'Апрель', 'month.5': 'Май', 'month.6': 'Июнь',
  'month.7': 'Июль', 'month.8': 'Август', 'month.9': 'Сентябрь',
  'month.10': 'Октябрь', 'month.11': 'Ноябрь', 'month.12': 'Декабрь',

  // Theme names
  'theme.black': 'Чёрная', 'theme.white': 'Белая', 'theme.navy': 'Тёмно-синяя',
};

registerLocale('ru', ru);
export default ru;
