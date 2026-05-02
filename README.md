# ⭐ MyStarsSpace — Star Map Generator

Интерактивный генератор звёздных карт для создания персонализированных постеров ночного неба. Embeddable виджет с полной кастомизацией через URL-параметры и JSON-шаблоны.

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Технологии](#-технологии)
- [Астрономический движок](#-астрономический-движок)
- [Архитектура проекта](#-архитектура-проекта)
- [Установка и запуск](#-установка-и-запуск)
- [Интеграция (Embed)](#-интеграция-embed)
- [Система шаблонов](#-система-шаблонов)
- [URL-параметры](#-url-параметры)
- [Локализация](#-локализация)
- [Валюты](#-валюты)
- [Темы карты](#-темы-карты)
- [Размеры постеров](#-размеры-постеров)
- [Ценообразование](#-ценообразование)
- [Деплой](#-деплой)

---

## ✨ Возможности

- **Генерация звёздной карты** для любой даты, времени и координат
- **142,000+ городов** мира с автодополнением и поиском
- **Астрономически точное** отображение звёзд, созвездий и Млечного Пути
- **20 языков** интерфейса с полной локализацией (1,200 фраз)
- **52 валюты** с автоматическим обновлением курсов
- **4 цветовые темы** карты (Black, White, Navy, Beige) + custom HEX
- **6 размеров постеров** (от 10×15 до 60×90 см)
- **Кастомизация шрифтов** для фразы и подписей
- **Экспорт в PDF** высокого разрешения (300 DPI)
- **Embed-режим** — iframe-виджет для интеграции на любой сайт
- **JSON-шаблоны** для быстрой настройки под клиентов
- **Локализация стран** через `Intl.DisplayNames` API

---

## 🛠 Технологии

| Компонент | Технология |
|-----------|------------|
| **Frontend** | React 18 + TypeScript |
| **Сборка** | Vite 6 |
| **Стили** | Vanilla CSS (CSS Custom Properties) |
| **Рендеринг карты** | HTML5 Canvas 2D API |
| **Астрономия** | Собственный движок на основе Jean Meeus |
| **Локализация** | Собственная i18n система + `Intl.DisplayNames` |
| **Шрифты** | Google Fonts API (динамическая загрузка) |
| **Курсы валют** | ExchangeRate API (автообновление) |
| **Тесты** | Vitest |
| **Хостинг** | Статический (Vercel / Netlify / GitHub Pages) |

---

## 🔭 Астрономический движок

### Расчёт положения звёзд

Движок основан на формулах из книги **Jean Meeus "Astronomical Algorithms"** (2nd edition) и данных **USNO** (U.S. Naval Observatory).

#### Алгоритм:

1. **Julian Date** — дата/время конвертируются в юлианскую дату по формуле Meeus (глава 7)
2. **Local Sidereal Time (LST)** — вычисляется местное звёздное время для заданной долготы
3. **Экваториальные → горизонтальные координаты** — прямое восхождение (RA) и склонение (Dec) каждой звезды пересчитываются в азимут и высоту для наблюдателя
4. **Стереографическая проекция** — горизонтальные координаты проецируются на 2D-плоскость
5. **Фильтрация по яркости** — звёзды фильтруются по предельной звёздной величине (`magnitudeLimit: 6.0`)

#### Яркость и размер звёзд

```
renderSize = base × 10^(exponent × magnitude)
```

- `base: 3` — базовый размер точки (px)
- `exponent: -0.2` — степенной коэффициент
- Чем меньше `magnitude`, тем ярче звезда → тем больше точка

Яркие звёзды (Sirius, magnitude -1.46) отображаются значительно крупнее, чем тусклые (magnitude 6.0).

#### Цвет звёзд

При включённом режиме `starColors: true` звёзды окрашиваются по спектральному классу:
- **O/B** (голубые) — горячие звёзды (>10,000K)
- **A** (белые) — 7,500–10,000K
- **F** (жёлто-белые) — 6,000–7,500K
- **G** (жёлтые) — 5,200–6,000K (как Солнце)
- **K** (оранжевые) — 3,700–5,200K
- **M** (красные) — <3,700K

#### Слои карты

| Слой | Описание |
|------|----------|
| `stars` | Звёзды до 6-й величины (~9,000 звёзд) |
| `constellationLines` | Линии 88 созвездий |
| `constellationNames` | Названия созвездий (локализованные) |
| `milkyWay` | Контур Млечного Пути |
| `grid` | Координатная сетка (flat / spherical) |
| `cardinalDirections` | Стороны света (N, S, E, W) |

---

## 📁 Архитектура проекта

```
src/
├── App.tsx                    # Главный компонент, state management
├── main.tsx                   # Entry point
├── index.css                  # Глобальные стили + CSS Custom Properties
│
├── core/                      # Астрономический движок
│   ├── astronomy.ts           # Julian Date, Sidereal Time
│   ├── coordinates.ts         # Проекции, конверсии координат
│   └── starmap.ts             # Фильтрация звёзд, SkySnapshot
│
├── components/                # React-компоненты
│   ├── PosterPreview.tsx      # Рендеринг постера (Canvas)
│   ├── ControlPanel.tsx       # Панель управления (город, дата, фраза)
│   ├── SettingsBar.tsx        # Настройки (размер, формат, валюта)
│   ├── FontSelector.tsx       # Выбор шрифтов (Google Fonts)
│   └── LanguageSelector.tsx   # Переключатель языка
│
├── config/                    # Конфигурация
│   ├── celestial-config.ts    # Параметры карты, размеры постеров
│   ├── themes.ts              # Цветовые темы (black, white, navy, beige)
│   ├── pricing.ts             # Цены в USD по размерам
│   ├── currencies.ts          # 52 валюты с символами
│   ├── formats.ts             # Форматы даты/времени/единиц
│   ├── frames.ts              # Стили рамок
│   └── fonts.json             # Каталог шрифтов
│
├── data/                      # Данные
│   ├── cities-data.ts         # Курируемая база городов (~500)
│   ├── cities.ts              # Поиск, Intl.DisplayNames для стран
│   ├── constellations.ts      # 88 созвездий (линии + названия)
│   └── loader.ts              # Lazy-загрузка звёздных данных
│
├── i18n/                      # Локализация
│   ├── index.ts               # i18n движок, t() функция
│   └── locales/               # 20 языков × 60 фраз + UI
│       ├── en.ts
│       ├── ru.ts
│       └── ... (18 others)
│
├── services/                  # Внешние сервисы
│   └── exchangeRates.ts       # Курсы валют (auto-refresh)
│
└── types/                     # TypeScript типы
    └── index.ts
```

```
public/
├── cities.json                # 142K городов мира [name, lat, lon, ISO]
├── stars.json                 # Звёздный каталог
├── milkyway.json              # Контур Млечного Пути
└── templates/                 # JSON-шаблоны для embed
    ├── default.json
    ├── sky-blue.json
    └── dark-elegant.json
```

---

## 🚀 Установка и запуск

### Требования

- Node.js 18+
- npm

### Локальный запуск

```bash
# Клонирование
git clone https://github.com/Romanov-Art/MyStarsSpace.git
cd MyStarsSpace

# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev
# → http://localhost:5173/

# Сборка production
npm run build

# Тесты
npm run test
```

---

## 🔗 Интеграция (Embed)

MyStarsSpace работает как iframe-виджет. Вставьте на любой сайт:

### Базовая интеграция

```html
<iframe
  src="https://your-domain.com/"
  width="100%"
  height="900"
  frameborder="0"
  style="border: none; border-radius: 12px; max-width: 1400px;"
  allow="clipboard-write"
  loading="lazy"
></iframe>
```

### С параметрами

```html
<iframe
  src="https://your-domain.com/?locale=ru&currency=RUB"
  width="100%"
  height="900"
  frameborder="0"
></iframe>
```

### С шаблоном

```html
<iframe
  src="https://your-domain.com/?template=dark-elegant"
  width="100%"
  height="900"
  frameborder="0"
></iframe>
```

### Шаблон + переопределение

```html
<!-- Берём dark-elegant, но меняем акцент и язык -->
<iframe
  src="https://your-domain.com/?template=dark-elegant&accent=00ff88&locale=en"
  width="100%"
  height="900"
  frameborder="0"
></iframe>
```

### Адаптивный контейнер

```html
<div style="position: relative; width: 100%; max-width: 1400px; margin: 0 auto;">
  <iframe
    src="https://your-domain.com/?template=sky-blue&locale=en&currency=USD"
    style="width: 100%; height: 900px; border: none; border-radius: 12px;"
    allow="clipboard-write"
    loading="lazy"
  ></iframe>
</div>
```

---

## 🎨 Система шаблонов

Шаблоны — JSON-файлы в `/public/templates/`. Подключаются через `?template=имя`.

### Структура шаблона

```json
{
  "bg": "1a1a2e",
  "text": "ffffff",
  "accent": "e94560",
  "panel": "16213e",
  "radius": "8",
  "locale": "ru",
  "theme": "black",
  "currency": "RUB",
  "dateFormat": "DD.MM.YYYY",
  "timeFormat": "24h",
  "units": "cm",
  "fullMonthName": false
}
```

### Параметры шаблона

| Параметр | Тип | Описание | Значения |
|----------|-----|----------|----------|
| `bg` | HEX | Цвет фона | `f5f5f5`, `1a1a2e` |
| `text` | HEX | Цвет текста | `1a1a1a`, `ffffff` |
| `accent` | HEX | Акцент (кнопки) | `e84040`, `4a9eff` |
| `panel` | HEX | Фон панелей | `fafafa`, `16213e` |
| `radius` | px | Скругление углов | `6`, `12` |
| `locale` | string | Язык интерфейса | `en`, `ru`, `de`, ... |
| `theme` | string | Тема карты | `black`, `white`, `navy`, `beige` |
| `currency` | string | Валюта | `USD`, `EUR`, `RUB`, ... |
| `dateFormat` | string | Формат даты | `DD.MM.YYYY`, `MM/DD/YYYY` |
| `timeFormat` | string | Формат времени | `24h`, `12h` |
| `units` | string | Единицы размеров | `cm`, `inch` |
| `fullMonthName` | bool | Полное название месяца | `true`, `false` |

### Готовые шаблоны

| Шаблон | Стиль | Описание |
|--------|-------|----------|
| `default` | Светлый | Стандартная тема, USD, English |
| `sky-blue` | Тёмно-синий | Космический стиль, полные месяцы |
| `dark-elegant` | Тёмный | Элегантный тёмный, RUB, Russian |

### Создание нового шаблона

1. Создайте файл `/public/templates/my-brand.json`
2. Заполните нужные параметры (все опциональные)
3. Используйте: `?template=my-brand`

### Приоритет настроек

```
URL-параметры  >  Шаблон  >  localStorage  >  Дефолт
```

---

## 🔧 URL-параметры

Все параметры передаются через query string iframe `src`:

```
?locale=ru&currency=RUB&bg=1a1a2e&accent=e94560&template=dark-elegant&partner=xyz
```

| Параметр | Описание | Пример |
|----------|----------|--------|
| `template` | Имя JSON-шаблона | `dark-elegant` |
| `locale` | Язык интерфейса | `ru` |
| `currency` | Валюта | `RUB` |
| `bg` | Цвет фона (HEX без #) | `1a1a2e` |
| `text` | Цвет текста | `ffffff` |
| `accent` | Цвет акцента | `e94560` |
| `panel` | Цвет панелей | `16213e` |
| `radius` | Скругление (px) | `12` |
| `theme` | Тема карты | `navy` |
| `partner` | ID партнёра | `myshop123` |

---

## 🌍 Локализация

### 20 языков

| Код | Язык | Код | Язык |
|-----|------|-----|------|
| `en` | English | `ko` | 한국어 |
| `ru` | Русский | `zh` | 中文 |
| `de` | Deutsch | `ar` | العربية |
| `fr` | Français | `hi` | हिन्दी |
| `es` | Español | `th` | ไทย |
| `it` | Italiano | `vi` | Tiếng Việt |
| `pt` | Português | `id` | Bahasa Indonesia |
| `pl` | Polski | `ms` | Bahasa Melayu |
| `nl` | Nederlands | `tr` | Türkçe |
| `sv` | Svenska | `ja` | 日本語 |

### Структура локализации

Каждый язык содержит:
- **UI-элементы** — кнопки, метки, заголовки
- **12 месяцев** — полные и сокращённые названия
- **60 фраз** — 6 категорий × 10 фраз:
  - 🎂 Birthday (дни рождения)
  - 💍 Wedding (свадьба)
  - ❤️ Relationship (отношения)
  - 🕯️ Memorial (память)
  - 👶 Baby (рождение ребёнка)
  - 💼 Business (бизнес-события)
- **Названия стран** — автоматически через `Intl.DisplayNames` API

---

## 💱 Валюты

52 валюты с автоматическим обновлением курсов:

**Основные:** USD, EUR, GBP, RUB, UAH, KZT, BYN, JPY, CNY, KRW, INR, THB, VND, IDR, MYR, TRY, PLN, SEK, NOK, DKK, CHF, CAD, AUD, NZD, BRL, MXN

**Ближний Восток:** AED, SAR, QAR, KWD, BHD, OMR, EGP

**Другие:** ZAR, NGN, GEL, ILS, HUF, CZK, RON, BGN, HRK, RSD, TWD, SGD, HKD, PHP, PKR, BDT, LKR, ARS, COP, CLP

Базовая цена задаётся в USD, конвертируется в реальном времени через ExchangeRate API.

---

## 🎨 Темы карты

| Тема | ID | Фон | Звёзды | Стиль |
|------|----|-----|--------|-------|
| Classic Black | `black` | `#000000` | белые | Классический ночной |
| Elegant White | `white` | `#ffffff` | чёрные | Минималистичный светлый |
| Deep Navy | `navy` | `#363a44` | тёмные | Глубокий синий |
| Warm Beige | `beige` | `#fff2e0` | тёмные | Тёплый винтажный |
| Custom | `custom:#RRGGBB` | любой HEX | авто | Произвольный цвет |

---

## 📐 Размеры постеров

| Размер | Обозначение | Цена (USD) |
|--------|-------------|------------|
| 10 × 15 см | `10×15` | $9.99 |
| 21 × 29.7 см | `A4` | $9.99 |
| 30 × 40 см | `30×40` | $12.99 |
| 40 × 50 см | `40×50` | $15.99 |
| 45 × 60 см | `45×60` | $17.99 |
| 60 × 90 см | `60×90` | $19.99 |

Единицы отображения: **cm** (по умолчанию) или **inch** (через `units` параметр).

---

## 💰 Ценообразование

- Базовые цены заданы в **USD** (`src/config/pricing.ts`)
- Конвертация в локальную валюту через **ExchangeRate API** (автообновление)
- Зачёркнутая "старая" цена = цена максимального размера (60×90)
- Валюта выбирается пользователем или задаётся через `?currency=RUB`

---

## 🏗 Деплой

### Vercel (рекомендуется)

```bash
npm install -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Загрузите папку dist/ на Netlify
```

### GitHub Pages

```bash
npm run build
# Настройте GitHub Pages на папку dist/
```

### Docker

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### Переменные окружения

Не требуются — приложение полностью клиентское. Все данные (звёзды, города, курсы валют) загружаются с публичных API или из статических файлов.

---

## 📄 Лицензия

ISC

---

## 👨‍💻 Разработка

```bash
npm run dev        # Dev-сервер (HMR)
npm run build      # Production-сборка
npm run test       # Запуск тестов
npm run test:watch # Тесты в watch-режиме
```

### Добавление нового языка

1. Создайте `src/i18n/locales/xx.ts` (скопируйте `en.ts`)
2. Переведите все ключи
3. Зарегистрируйте в `src/i18n/index.ts`

### Добавление нового шаблона

1. Создайте `public/templates/my-template.json`
2. Используйте: `?template=my-template`

### Добавление валюты

1. Добавьте запись в `src/config/currencies.ts`
2. Валюта автоматически появится в селекторе
