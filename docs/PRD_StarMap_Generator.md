# PRD: Генератор Карты Звёздного Неба (Star Map Generator)

**Версия:** 2.0  
**Дата:** 26.03.2026  
**Статус:** In Progress

---

## 1. Обзор продукта

### 1.1 Описание

Веб-сервис для генерации персонализированных карт звёздного неба. Пользователь вводит дату, время и город — и получает астрономически точную карту видимого неба. Результат — постер-превью (Canvas) с возможностью экспорта в PNG.

### 1.2 Проблема

Существующие сервисы (atlas-stars.ru, in-space.ru, mapstar.space) работают как закрытые SaaS — получить результат без оплаты/регистрации невозможно. Нет доступного open-source решения с полным звёздным каталогом, точными расчётами и экспортом.

### 1.3 Целевая аудитория

- Конечные пользователи: постер «небо в день рождения / свадьбы»
- Разработчики сервисов персонализированных подарков (B2B)
- Типографии и студии дизайна

---

## 2. Анализ reference-сайта (atlas-stars.ru)

> Reverse-engineering по HAR-файлу, decoded JS-бандлу и live-page.

### 2.1 Архитектура atlas-stars.ru

| Аспект | Реализация |
|--------|------------|
| **Движок рендеринга** | [d3-celestial](https://github.com/ofrohn/d3-celestial) v0.7.35 (open-source) |
| **Рендеринг** | Canvas (через D3.js), НЕ SVG |
| **Проекция** | Stereographic (стереографическая) |
| **Фреймворк** | React (Vite, production build) |
| **Данные звёзд** | `stars.6.json` (656KB, GeoJSON, ~9000 звёзд до mag 6) — ofrohn.github.io |
| **Созвездия** | `constellations.lines.json` + `constellations.json` + `constellations.borders.json` |
| **Млечный Путь** | `mw.json` (534KB, полигоны) |
| **DSO** | `dsos.bright.json` + `dsonames.json` |
| **Поиск городов** | Google Places API, проксируется через `server.atlas-stars.ru/api/Google/Predict` |
| **Монетизация** | 1390₽ (скидка до 700₽) за PDF-файл для печати |
| **Аналитика** | Yandex Metrika (ID: 99250352) |

### 2.2 API d3-celestial (core)

```javascript
// Инициализация — передаём полный конфиг
Celestial.display(config);

// Обновление неба при смене даты/города
Celestial.skyview({ date: new Date(dateTime), location: [lat, lon], timezone: timezoneOffset });

// Применение нового конфига (смена темы, слоёв)
Celestial.apply(config);
```

### 2.3 Конфиг d3-celestial (извлечён из бандла)

```javascript
{
  container: "map",
  width: 409,
  projection: "stereographic",
  orientationfixed: true,
  interactive: false,
  adaptable: false,
  background: { fill: "#000000", stroke: "transparent", opacity: 1 },
  datapath: "https://ofrohn.github.io/data/",
  stars: {
    show: true, limit: 7, colors: false,
    style: { fill: "#ffffff", opacity: 1 },
    names: false, proper: false, desig: true,
    size: 3, exponent: -0.2,
    data: "stars.6.json"
  },
  constellations: {
    show: false, names: false, lines: true,
    linestyle: { stroke: "#f8f9fa", width: 0.5, opacity: 0.9 },
    bounds: false
  },
  mw: { show: false, style: { fill: "#ffffff", opacity: "0.15" } },
  lines: {
    graticule: { show: true, stroke: "#6c757d", width: 0.4, opacity: 0.8 }
  }
}
```

### 2.4 UI-структура

```
┌──────────────────────────────────────────────────────────────┐
│  ATLAS STARS              Редактор                  Корзина  │
├──────────────┬──────────────────────┬─────────────────────────┤
│ 🔴 ⚪ 🔵     │                      │  О карте               │
│ Темы цвета   │    ┌──────────────┐  │  Описание продукта     │
│              │    │  ╭────────╮   │  │                        │
│ ◉ Меридианы  │    │  │ Canvas │   │  │  Как это работает      │
│ ◉ Созвездия  │    │  │ d3-cel │   │  │  Yale Bright Star Cat  │
│ ◉ Названия   │    │  ╰────────╯   │  │                        │
│              │    │  Текст фразы  │  │  Рекомендации печати   │
│ Город: ___   │    │  Подзаголовки │  │                        │
│ Дата: ___    │    └──────────────┘  │                        │
│ Время: ___   │                      │                        │
│              │  [21x30] [30x40]     │                        │
│ Фраза: ___   │  [40x50] [50x70]    │                        │
└──────────────┴──────────────────────┴─────────────────────────┘
```

---

## 3. Технический стек MVP

### 3.1 Ключевое решение

> **d3-celestial делает ВСЮ астрономию.** Не нужен собственный астро-движок. Библиотека содержит: Julian Date, GMST/LST, прецессия, Eq→Hz преобразование, стереографическая проекция.

### 3.2 Стек

| Слой | Технология | Обоснование |
|------|------------|-------------|
| Frontend | React + TypeScript + Vite | Быстрый dev-server, тот же стек что atlas-stars |
| Рендеринг | d3-celestial (Canvas) | Проверенная библиотека, open-source, все астро-расчёты встроены |
| Стили | Vanilla CSS | Полный контроль, без лишних зависимостей |
| Данные звёзд | `ofrohn.github.io/data/` или локальная копия | GeoJSON: stars.6.json, constellations, mw.json |
| Города | Статический JSON (~500 городов) | Без backend, без API-ключей |
| Экспорт | Canvas → PNG (toDataURL) | Простейший вариант для MVP |

### 3.3 Источники данных

| Данные | Источник | Формат | Размер |
|--------|----------|--------|--------|
| Звёзды (до mag 6) | d3-celestial `stars.6.json` | GeoJSON FeatureCollection | 657KB |
| Линии созвездий | d3-celestial `constellations.lines.json` | GeoJSON MultiLineString | 27KB |
| Названия созвездий | d3-celestial `constellations.json` | GeoJSON | 51KB |
| Границы созвездий | d3-celestial `constellations.borders.json` | GeoJSON | 47KB |
| Млечный Путь | d3-celestial `mw.json` | GeoJSON Polygons | 534KB |
| Названия звёзд | d3-celestial `starnames.json` | JSON | 681KB |
| DSO | d3-celestial `dsos.bright.json` | GeoJSON | 8KB |

---

## 4. Функциональные требования MVP

### 4.1 Карта звёздного неба

- [x] Рендеринг ~9000 звёзд (до mag 6) на Canvas
- [ ] Стереографическая проекция (зенит = центр, горизонт = круг)
- [ ] Линии 88 созвездий (IAU)
- [ ] Координатная сетка (graticule)
- [ ] Стороны света по краю круга (N/S/E/W)
- [ ] Обновление в реальном времени при смене параметров

### 4.2 Управление

- [ ] Выбор города (autocomplete из JSON, ~500 городов)
- [ ] Выбор даты (день / месяц / год — dropdowns)
- [ ] Выбор времени (часы / минуты — dropdowns)
- [ ] Переключатели слоёв: меридианы, созвездия, названия
- [ ] Выбор цветовой темы: чёрный, белый, тёмно-синий

### 4.3 Постер

- [ ] Превью постера с Canvas-картой и текстовыми overlay
- [ ] Редактирование текста: основная фраза, подзаголовки
- [ ] Быстрые фразы по категориям: День Рождения, Свадьба, Отношения...
- [ ] Размеры постера: 21×30, 30×40, 40×50, 50×70 см

### 4.4 Экспорт

- [ ] PNG экспорт (Canvas → toDataURL → download)

---

## 5. Цветовые темы

| Тема | Background | Stars | Grid | Constellation Lines |
|------|-----------|-------|------|-------------------|
| `black` | `#000000` | `#ffffff` | `#6c757d` | `#f8f9fa` |
| `white` | `#ffffff` | `#000000` | `#cccccc` | `#333333` |
| `navy` | `#2A2F41` | `#ffffff` | `#4a5068` | `#8a9ab5` |

---

## 6. Архитектура компонентов

```
src/
├── components/
│   ├── StarMap.tsx          # Обёртка d3-celestial (Canvas)
│   ├── ControlPanel.tsx     # Левая панель управления
│   ├── PosterPreview.tsx    # Постер-превью с overlay текстом
│   ├── SizeSelector.tsx     # Кнопки размера
│   ├── CitySearch.tsx       # Autocomplete по городам
│   └── PhraseGenerator.tsx  # Быстрые фразы
├── config/
│   ├── celestial-config.ts  # Конфиг d3-celestial
│   ├── themes.ts            # Цветовые темы
│   └── cities.ts            # Данные городов
├── utils/
│   └── export.ts            # PNG экспорт
├── App.tsx
├── index.css
└── main.tsx
```

---

## 7. Этапы разработки

### Этап 1: MVP (1–2 недели)

Полностью клиентское приложение:
- React + Vite + TypeScript
- d3-celestial рендеринг
- 3 темы, переключатели слоёв
- Выбор города/даты/времени
- Текст на постере
- PNG экспорт

### Этап 2: Качество и UX (1–2 недели)

- SVG экспорт (серверный рендер через jsdom + d3-celestial)
- PDF экспорт
- Полный каталог HYG v4.2 (~120K звёзд)
- Млечный Путь
- Google Fonts интеграция
- Responsive design

### Этап 3: API и монетизация

- REST API: `POST /api/v1/starmap`
- Серверный рендер SVG/PNG/PDF
- Docker deploy
- Тарифные планы

---

## 8. Ссылки

| Ресурс | URL |
|--------|-----|
| d3-celestial (движок) | https://github.com/ofrohn/d3-celestial |
| d3-celestial данные | https://ofrohn.github.io/data/ |
| D3.js | https://d3js.org/ |
| Reference: atlas-stars.ru | https://editor.atlas-stars.ru/constructor |
| HYG Database | https://codeberg.org/astronexus/hyg |
| Stellarium (валидация) | https://stellarium.org/ |

---

## 9. Глоссарий

| Термин | Определение |
|--------|-------------|
| **RA** | Right Ascension — прямое восхождение (0–24ч) |
| **Dec** | Declination — склонение (-90°…+90°) |
| **J2000.0** | Стандартная эпоха: 1 января 2000, 12:00 TT |
| **Magnitude** | Звёздная величина: чем меньше, тем ярче. Предел глаза ~6.0 |
| **Stereographic** | Проекция, сохраняющая углы: `r = R·tan((90°−alt)/2)` |
| **d3-celestial** | Open-source JS-библиотека для визуализации звёздного неба |
| **GeoJSON** | Формат данных для геопространственных объектов |
