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

  // UI — Style panel
  'ui.choose_color': 'Выберите цвет',
  'ui.choose_style': 'Выберите стиль',
  'ui.choose_size': 'Выбрать размер',
  'ui.stars': 'Звёзды',
  'ui.colors': 'Цветные',
  'ui.bw': 'Ч/Б',
  'ui.frame': 'Рамка',
  'ui.compass': 'Компас',
  'ui.zodiac': 'Зодиак',
  'ui.show': 'Показать',
  'ui.hide': 'Скрыть',
  'ui.flat': 'Плоская',
  'ui.3d': '3D',
  'ui.none': 'Нет',
  'ui.line': 'Линия',
  'ui.double': 'Двойная',
  'ui.border': 'Рамка',
  'ui.simple': 'Простой',
  'ui.degrees': 'Градусы',
  'ui.cardinal': 'Стороны',
  'ui.unit_cm': 'см',
  'ui.unit_inch': 'дюймы',
  'ui.exporting': '⏳ Экспорт...',
  'ui.editor': 'Редактор',

  // UI — Event details
  'ui.enter_event_details': 'Введите данные о событии',
  'ui.format_settings': 'Настройки формата',
  'ui.date_format': 'Формат даты',
  'ui.full_month_name': 'Название месяца текстом',
  'ui.time_format': 'Формат времени',
  'ui.city_search_placeholder': '🔍 Город или координаты',
  'ui.coords_detected': '📍 Координаты найдены — нажмите Enter',

  // UI — Phrase & text
  'ui.add_phrase': 'Добавьте фразу',
  'ui.or_generate': 'Или сгенерируйте её',
  'ui.editable_text': 'Текст можно отредактировать',
  'ui.text_settings': 'Настройки текста',
  'ui.name_placeholder': 'Имя / Компания',

  // Size names
  'size.postcard': 'Открытка',
  'size.a4': 'A4',
  'size.medium': 'Средний',
  'size.large': 'Большой',
  'size.large_plus': 'Большой+',
  'size.max': 'Макси',

  // Font selector
  'ui.font': 'Шрифт',
  'ui.print_color_warning': 'Цвета при печати могут отличаться от отображения на мониторе!',

  // Zodiac signs
  'zodiac.capricorn': 'Козерог', 'zodiac.aquarius': 'Водолей',
  'zodiac.pisces': 'Рыбы', 'zodiac.aries': 'Овен',
  'zodiac.taurus': 'Телец', 'zodiac.gemini': 'Близнецы',
  'zodiac.cancer': 'Рак', 'zodiac.leo': 'Лев',
  'zodiac.virgo': 'Дева', 'zodiac.libra': 'Весы',
  'zodiac.scorpio': 'Скорпион', 'zodiac.sagittarius': 'Стрелец',
};

registerLocale('ru', ru);
export default ru;
