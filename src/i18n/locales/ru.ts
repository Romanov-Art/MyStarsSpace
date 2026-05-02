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
  'ui.order_pdf': 'Заказать PDF версию',
  'ui.total': 'К оплате:',
  'ui.preview_info': 'Размер превью постера совпадает с размером выбранной рамки.',
  'ui.phrase': 'Фраза',
  'ui.size': 'Размер',
  'ui.language': 'Язык',

  // Phrase categories
  'category.birthday': 'День Рождения',
  'category.wedding': 'Свадьба',
  'category.relationship': 'Отношения',
  'category.memorial': 'Памятная дата',
  'category.baby': 'Рождение ребёнка',
  'category.custom': 'Свой текст',
  'category.business': 'Бизнес',

  // Birthday phrases
  'phrase.birthday.1': 'Небо в день твоего рождения',
  'phrase.birthday.2': 'Под этими звёздами ты появился на свет',
  'phrase.birthday.3': 'Звёзды в день рождения',
  'phrase.birthday.4': 'Небо только для тебя',
  'phrase.birthday.5': 'Рождённый под этими звёздами',
  'phrase.birthday.6': 'Твоя первая звёздная ночь',
  'phrase.birthday.7': 'Вселенная приветствовала тебя',
  'phrase.birthday.8': 'Звёзды сошлись для тебя',
  'phrase.birthday.9': 'Ночное небо твоего рождения',
  'phrase.birthday.10': 'Под этими звёздами ты пришёл в этот мир',

  // Wedding phrases
  'phrase.wedding.1': 'Небо в день нашей свадьбы',
  'phrase.wedding.2': 'Под этими звёздами мы сказали «Да»',
  'phrase.wedding.3': 'Звёзды нашего лучшего дня',
  'phrase.wedding.4': 'Навсегда записано на звёздах',
  'phrase.wedding.5': 'Два сердца — одно небо',
  'phrase.wedding.6': 'Наша любовь под звёздами',
  'phrase.wedding.7': 'Ночь, когда мы стали одним целым',
  'phrase.wedding.8': 'Вечность начинается сегодня',
  'phrase.wedding.9': 'Звёзды были свидетелями наших клятв',
  'phrase.wedding.10': 'Обещание под звёздным небом',

  // Relationship phrases
  'phrase.relationship.1': 'Ночь, когда мы встретились',
  'phrase.relationship.2': 'Наш первый поцелуй под звёздами',
  'phrase.relationship.3': 'Звёзды, что видели нашу любовь',
  'phrase.relationship.4': 'Под этим небом мы нашли друг друга',
  'phrase.relationship.5': 'Наша история началась здесь',
  'phrase.relationship.6': 'Небо помнит нас',
  'phrase.relationship.7': 'Любовь, записанная на звёздах',
  'phrase.relationship.8': 'Та самая волшебная ночь',
  'phrase.relationship.9': 'Где всё началось',
  'phrase.relationship.10': 'Наша особенная ночь',

  // Memorial phrases (memorable events + motivational)
  'phrase.memorial.1': 'Через тернии к звёздам',
  'phrase.memorial.2': 'День, когда я тебя встретил',
  'phrase.memorial.3': 'Весь мир открыт для тебя',
  'phrase.memorial.4': 'Мечтай. Открывай новые звёзды.',
  'phrase.memorial.5': 'Это было незабываемо',
  'phrase.memorial.6': 'Годовщина под звёздами',
  'phrase.memorial.7': 'Момент, который изменил всё',
  'phrase.memorial.8': 'Тот самый вечер',
  'phrase.memorial.9': 'Небо нашей первой встречи',
  'phrase.memorial.10': 'Звёзды помнят этот день',

  // Baby phrases
  'phrase.baby.1': 'Звёзды в день твоего рождения',
  'phrase.baby.2': 'Добро пожаловать в мир',
  'phrase.baby.3': 'Новая звезда родилась',
  'phrase.baby.4': 'Небо улыбнулось тебе',
  'phrase.baby.5': 'Маленькие ручки — большая вселенная',
  'phrase.baby.6': 'Рождён под счастливой звездой',
  'phrase.baby.7': 'Наша маленькая звёздочка',
  'phrase.baby.8': 'Ночь, когда ты появился',
  'phrase.baby.9': 'Чудо под звёздами',
  'phrase.baby.10': 'Привет, малыш',

  // Business phrases
  'phrase.business.1': 'Начало великого пути',
  'phrase.business.2': 'Ночь, когда мечта стала реальностью',
  'phrase.business.3': 'Записано на звёздах с первого дня',
  'phrase.business.4': 'Где амбиции встретили звёзды',
  'phrase.business.5': 'Мечта, запущенная под этим небом',
  'phrase.business.6': 'Небо в день основания',
  'phrase.business.7': 'Звёзды нового начала',
  'phrase.business.8': 'Наш путь начался здесь',
  'phrase.business.9': 'Стремясь к звёздам',
  'phrase.business.10': 'Ночь, когда всё началось',

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
  'ui.or_generate': 'Подобрать вариант',
  'ui.editable_text': 'Текст можно отредактировать',
  'ui.text_settings': 'Настройки текста',
  'ui.name_placeholder': 'Имя / Компания',

  // Size names
  'size.postcard': 'Открытка',
  'size.a4': 'A4', 'size.standard': 'Стандарт',
  'size.medium': 'Средний',
  'size.large': 'Большой',
  'size.max': 'Макс',

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
