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
- [Партнёрская система (white-label)](#-партнёрская-система-white-label)
- [Реферальная программа](#-реферальная-программа)
- [Track-сервис (API)](#-track-сервис-api)
- [Деплой](#-деплой)

---

## ✨ Возможности

- **Генерация звёздной карты** для любой даты, времени и координат
- **142,000+ городов** мира с автодополнением и поиском
- **Астрономически точное** отображение звёзд, созвездий и Млечного Пути
- **41 язык** интерфейса с полной локализацией (2,460 фраз)
- **52 валюты** с автоматическим обновлением курсов
- **4 цветовые темы** карты (Black, White, Navy, Beige) + custom HEX
- **6 размеров постеров** (от 10×15 до 60×90 см)
- **Кастомизация шрифтов** для фразы и подписей
- **Экспорт в PDF** высокого разрешения (300 DPI)
- **Embed-режим** — iframe-виджет для интеграции на любой сайт
- **JSON-шаблоны** для быстрой настройки под клиентов
- **Часовые пояса** — время постера интерпретируется как местное время города (IANA)
- **Партнёрская система (white-label)** — шаблон на партнёра, наценка, предоплаченные генерации
- **Реферальная программа** — `?ref=CODE`, атрибуция 30 дней (last-click), учёт конверсий
- **Track-сервис** — микросервис учёта генераций (LibSQL) с анти-фродом
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
| **Backend (учёт/биллинг)** | Cloudflare Worker + D1 (`workers/site/`); Node + LibSQL (`server/`) — для self-host |
| **Хостинг** | Cloudflare Workers: Static Assets (лендинг) + D1 (track API); Docker Compose — self-host/откат |

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
├── core/                      # Астрономический движок + embed-логика
│   ├── astronomy.ts           # Julian Date, Sidereal Time
│   ├── coordinates.ts         # Проекции, быстрый путь projectStarStereographic
│   ├── starmap.ts             # Фильтрация звёзд, SkySnapshot
│   ├── timezone.ts            # IANA-таймзоны: местное время города → UTC
│   └── embedConfig.ts         # Шаблоны/партнёры: резолвинг, санитизация, merge
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
│   ├── all-locales.ts         # Реестр всех 41 языка
│   └── locales/               # 41 язык × 60 фраз + UI
│       ├── en.ts
│       ├── ru.ts
│       └── ... (39 others)
│
├── services/                  # Внешние сервисы
│   ├── exchangeRates.ts       # Курсы валют (auto-refresh)
│   ├── partnerTracking.ts     # Beacon'ы учёта (view / export / click)
│   ├── partnerStatus.ts       # Проверка блокировки (предоплата, fail-open)
│   └── affiliate.ts           # Реферальная атрибуция (30 дней, last-click)
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
    ├── dark-elegant.json
    └── partners/              # Шаблоны партнёров (?partner=id)
        └── demo.json
```

```
workers/                       # Cloudflare edge (прод): деплой из CI, см. «Деплой»
├── site/                      # Worker `mystars`: лендинг (dist/) + /api на D1
│   ├── src/track.ts           # Track API — порт server/index.mjs на D1
│   ├── src/canva.ts           # «Редактировать в Canva»: OAuth, токены, Design Import
│   ├── migrations/            # Схема D1
│   └── wrangler.jsonc
├── canva/                     # Worker `mystars-canva`: прокси на GiftsCanva + edge-кэш рендеров
└── shared/                    # Общие хелперы (JSON, auth, лимит тела)
```

```
server/                        # Track-сервис для self-host (Docker), тот же API
├── index.mjs                  # HTTP API: track / status / credits / отчёты
├── package.json               # Единственная зависимость: @libsql/client
└── Dockerfile
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

### Партнёрский эмбед (white-label)

```html
<!-- Автоматически подтянет /templates/partners/myshop.json:
     брендинг, валюту, наценку + учёт генераций для биллинга -->
<iframe
  src="https://your-domain.com/?partner=myshop"
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
| `locale` | string | Язык интерфейса | `en`, `ru`, `uk`, `de`, ... |
| `theme` | string | Тема карты | `black`, `white`, `navy`, `beige` |
| `currency` | string | Валюта | `USD`, `EUR`, `RUB`, ... |
| `dateFormat` | string | Формат даты | `DD.MM.YYYY`, `MM/DD/YYYY` |
| `timeFormat` | string | Формат времени | `24h`, `12h` |
| `units` | string | Единицы размеров | `cm`, `inch` |
| `fullMonthName` | bool | Полное название месяца | `true`, `false` |
| `markup` | number | Наценка партнёра в USD (только из шаблона, не из URL) | `3`, `5.5` |

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

### Шаблоны партнёров

`?partner=id` автоматически загружает `/templates/partners/{id}.json` — один
файл на партнёра. Явный `?template=` имеет приоритет над партнёрским шаблоном.
У каждого партнёра свой namespace в localStorage — настройки не смешиваются.
Подробности: [docs/PARTNER_EMBED.md](docs/PARTNER_EMBED.md).

### Приоритет настроек

```
URL-параметры  >  Шаблон (?template= | ?partner=)  >  localStorage  >  Дефолт
```

Исключение: `markup` (цена) читается только из шаблона — URL его перебить не может.

---

## 🔧 URL-параметры

Все параметры передаются через query string iframe `src`:

```
?locale=ru&currency=RUB&bg=1a1a2e&accent=e94560&template=dark-elegant&partner=xyz
```

| Параметр | Описание | Пример |
|----------|----------|--------|
| `template` | Имя JSON-шаблона | `dark-elegant` |
| `locale` | Язык интерфейса | `ru`, `uk`, `kk` |
| `currency` | Валюта | `RUB` |
| `bg` | Цвет фона (HEX без #) | `1a1a2e` |
| `text` | Цвет текста | `ffffff` |
| `accent` | Цвет акцента | `e94560` |
| `panel` | Цвет панелей | `16213e` |
| `radius` | Скругление (px) | `12` |
| `theme` | Тема карты | `navy` |
| `partner` | ID партнёра (white-label, биллинг) | `myshop123` |
| `ref` | Код реферала (атрибуция 30 дней) | `blogger` |

---

## 🌍 Локализация

### 41 язык

#### Европейские

| Код | Язык | Код | Язык |
|-----|------|-----|------|
| `en` | English | `de` | Deutsch |
| `fr` | Français | `es` | Español |
| `it` | Italiano | `pt` | Português |
| `pl` | Polski | `nl` | Nederlands |
| `sv` | Svenska | `no` | Norsk |
| `fi` | Suomi | `da` | Dansk |
| `cs` | Čeština | `ro` | Română |
| `hu` | Magyar | `el` | Ελληνικά |

#### Азиатские

| Код | Язык | Код | Язык |
|-----|------|-----|------|
| `zh` | 中文 | `ja` | 日本語 |
| `ko` | 한국어 | `hi` | हिन्दी |
| `th` | ไทย | `vi` | Tiếng Việt |
| `id` | Bahasa Indonesia | `ms` | Bahasa Melayu |
| `bn` | বাংলা | `ta` | தமிழ் |
| `pa` | ਪੰਜਾਬੀ | `jv` | Basa Jawa |

#### Ближний Восток / Центральная Азия

| Код | Язык | Код | Язык |
|-----|------|-----|------|
| `ar` | العربية | `fa` | فارسی |
| `ur` | اردو | `tr` | Türkçe |
| `kk` | Қазақша | `uz` | O'zbekcha |
| `az` | Azərbaycanca | `ky` | Кыргызча |

#### Восточная Европа / Кавказ

| Код | Язык | Код | Язык |
|-----|------|-----|------|
| `ru` | Русский | `uk` | Українська |
| `be` | Беларуская | `ka` | ქართული |
| `hy` | Հայերէն | | |

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

### Добавление нового языка

1. Создайте `src/i18n/locales/xx.ts` (скопируйте `en.ts`)
2. Переведите все ключи
3. Добавьте экспорт в `src/i18n/all-locales.ts`
4. Добавьте код в тип `Locale`, массив `AVAILABLE_LOCALES` и объект `LOCALE_NAMES` в `src/i18n/index.ts`

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

| Размер | Дюймы | Соотношение | Цена (USD) |
|--------|-------|-------------|------------|
| 10 × 15 см | 4 × 6" | — (Postcard) | $9.99 |
| 21 × 29.7 см | 8 × 11.7" | 5:7 (A4) | $9.99 |
| 30 × 40 см | 12 × 16" | 3:4 | $12.99 |
| 40 × 50 см | 16 × 20" | 4:5 | $15.99 |
| 40 × 60 см | 16 × 24" | 2:3 | $17.99 |
| 50 × 70 см | 20 × 28" | 5:7 | $19.99 |

Единицы отображения переключаются прямо в интерфейсе: **cm** ↔ **inch**.

---

## 💰 Ценообразование

- Базовые цены заданы в **USD** (`src/config/pricing.ts`)
- Конвертация в локальную валюту через **ExchangeRate API** (автообновление)
- Зачёркнутая "старая" цена = цена максимального размера (60×90)
- Валюта выбирается пользователем или задаётся через `?currency=RUB`

**В партнёрских эмбедах:** цена = `max(база, $5) + наценка партнёра`.
Минимум **$5** — жёсткий пол, никакая конфигурация не опускает цену ниже.
Наценка (`markup`, до $500) задаётся только в JSON партнёра и не
переопределяется URL-параметрами.

---

## 🤝 Партнёрская система (white-label)

Партнёр (shopid) встраивает конструктор через `?partner=id` со своим брендингом
и **предоплачивает генерации**:

1. Партнёр переводит деньги (вне системы) → админ начисляет кредиты:
   ```bash
   curl -X POST https://домен/api/credits \
     -H "Authorization: Bearer $TRACK_ADMIN_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"partner":"demo","amount":100,"note":"перевод 16.07"}'
   ```
2. Каждая успешная генерация (export) списывает 1 кредит. Остаток **вычисляется**
   (`SUM(пополнений) − counted-экспорты`), не хранится — рассинхрон невозможен.
3. Остаток ≤ 0 → эмбед блокирует кнопку заказа (локализовано на 41 язык).
   Партнёр без единого пополнения заблокирован (строгая предоплата, триал = малое начисление).
4. При недоступности API эмбед **fail-open** — продажи партнёра не встают.

Анти-фрод: rate-limit nginx + приложение, allowlist партнёров, дневные капы
на IP (превышение → `flagged`, в биллинг не идёт), IP хранятся как HMAC-хэши.

Подробно: [docs/PARTNER_EMBED.md](docs/PARTNER_EMBED.md).

---

## 🔗 Реферальная программа

Ссылка `https://домен/?ref=CODE` атрибуцирует посетителя рефералу на **30 дней**
(кука + localStorage, **last-click** — стандарт индустрии). Переход = `click`,
генерация в окне атрибуции = конверсия. Комиссия считается поверх месячного
отчёта. Коды рефералов — в allowlist `TRACK_AFFILIATES`.

Подробно: [docs/AFFILIATE_PROGRAM.md](docs/AFFILIATE_PROGRAM.md).

---

## 📡 Track-сервис (API)

Source of truth по генерациям, кредитам и рефералам. В проде работает как
Cloudflare Worker на D1 (`workers/site/src/track.ts`) с rate-limit через Workers
Rate Limiting; для self-host есть идентичный по API сервис `server/` (Node + LibSQL).

| Endpoint | Auth | Назначение |
|----------|------|------------|
| `POST /api/track` | публичный (beacon) | События `view` / `export` / `click` |
| `GET /api/status?partner=id` | публичный (кеш 60с) | `{blocked}` — предоплата исчерпана? |
| `POST /api/credits` | Bearer | Начисление/корректировка кредитов |
| `GET /api/report?month=` | Bearer | Партнёры: exports, views, flagged, remaining |
| `GET /api/affiliate-report?month=` | Bearer | Рефералы: clicks, conversions, flagged |
| `GET /api/health` | публичный | Healthcheck |

Хранилище в проде — D1 `mystars-track`. В self-host — файл LibSQL на
docker-volume (или удалённый libsql/Turso через `LIBSQL_URL` + `LIBSQL_AUTH_TOKEN`).

---

## 🏗 Деплой

### Cloudflare (прод: mystars.space)

Зона `mystars.space` на Cloudflare, весь трафик идёт через два Worker'а:

| Хост | Worker | Что делает |
|------|--------|------------|
| `mystars.space` | `mystars` | Лендинг из Workers Static Assets (код не вызывается), `/api/*` — track API на D1 |
| `www.mystars.space` | — | Редирект-правило зоны 301 → `mystars.space` |
| `canva.mystars.space` | `mystars-canva` | Прокси на GiftsCanva (Dokploy) + edge-кэш одинаковых рендеров |

Правила зоны: HTTP → HTTPS (кроме `/.well-known/acme-challenge/` — чтобы
сертификат GiftsCanva на origin продлевался), `www` → апекс. SSL-режим — Full.

**Автодеплой.** Каждый push в `main` запускает `.github/workflows/deploy-cloudflare.yml`:
тесты сайта → сборка → typecheck и тесты Worker'ов → миграции D1 → деплой обоих
Worker'ов. Секреты репозитория: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**Ручной деплой:**

```bash
npm run build                       # → dist/ (ассеты лендинга)
cd workers && npm ci
npm test                            # тесты в workerd с настоящей D1
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npm run deploy
```

**Секреты Worker'ов** (`wrangler secret put <NAME> -c <site|canva>/wrangler.jsonc`):
`mystars` — `ADMIN_TOKEN`, `IP_HASH_SECRET`; `mystars-canva` — `GIFTSCANVA_API_KEYS`
(те же ключи, что `API_KEYS` у GiftsCanva). Allowlist'ы `PARTNERS` / `AFFILIATES`
и `ALLOWED_ORIGINS` — в `vars` файла `workers/site/wrangler.jsonc`.

**Кэш рендеров.** `POST /v1/render` (PNG) кэшируется на edge на `RENDER_CACHE_TTL`
(сутки) по хэшу тела и отдаётся только с валидным ключом. После изменения
шаблонов в GiftsCanva увеличьте `RENDER_CACHE_VERSION` в `workers/canva/wrangler.jsonc`.

**D1:** новая миграция — файл в `workers/site/migrations/`, применяется в CI.
Запрос вручную: `npx wrangler d1 execute mystars-track --remote -c site/wrangler.jsonc --command "…"`.

### «Редактировать в Canva»

Кнопка под «Order PDF» открывает текущий постер в **собственном аккаунте Canva
клиента** — любой тариф Canva, включая бесплатный (Enterprise не нужен: это
Design Import, а не Autofill).

Как это работает:

1. Браузер собирает PDF: карта, рамки и фон — одной картинкой, а фраза и
   подписи — **настоящим текстом** во встроенном шрифте, ровно там, где они на
   экране. Canva превращает такой текст в редактируемые блоки. Текст, которого
   нет в наших шрифтах (иероглифы, арабский, деванагари и т.п.), остаётся частью
   картинки — выглядит верно, но не редактируется. Шрифты для PDF лежат в
   `public/fonts/pdf/`; после изменения `src/config/fonts.json` пересобрать:
   `uv run scripts/build_pdf_fonts.py`.
2. PDF уходит в Worker (`POST /api/canva/upload` → KV на час), а всё общение с
   Canva идёт во всплывающем окне `mystars.space`: OAuth (PKCE, `state` привязан
   к cookie), затем импорт и переход в редактор Canva. Окно — верхнего уровня,
   поэтому кнопка работает и во встроенном у партнёра iframe.
3. Токены Canva хранятся в D1 зашифрованными (AES-GCM, `CANVA_TOKEN_KEY`), сессия —
   только хэшем HttpOnly-cookie.

Правила те же, что у PDF-заказа: у партнёра без кредитов кнопка заблокирована,
каждое открытие в Canva считается экспортом (`track`).

**Включение (делается один раз владельцем Canva-аккаунта):**

1. В аккаунте Canva включить двухфакторную аутентификацию — без неё портал не
   даст создать интеграцию.
2. [Canva Developer Portal](https://www.canva.com/developers/) → создать интеграцию →
   **Outside Canva → Start integrating**.
   - Scopes: только `design:content:write`.
   - Redirect URL: `https://mystars.space/api/canva/callback`.
3. Положить ключи в Worker:
   ```bash
   cd workers
   npx wrangler secret put CANVA_CLIENT_ID -c site/wrangler.jsonc
   npx wrangler secret put CANVA_CLIENT_SECRET -c site/wrangler.jsonc
   ```
   `CANVA_TOKEN_KEY` уже задан. Как только все три секрета на месте,
   `/api/canva/status` отвечает `configured: true` и кнопка появляется на сайте сама.
4. До одобрения Canva интеграцией может пользоваться только её создатель.
   Чтобы кнопка работала у всех клиентов, отправить интеграцию на ревью в
   портале (**Submit for review**: тестовый аккаунт, видео-демо, анкета,
   обоснование scope).

Ограничения: Canva — 20 импортов в минуту на пользователя; PDF до 22 МБ (при
превышении разрешение снижается до 200/150 dpi); KV на бесплатном тарифе —
1000 записей в сутки, то есть до ~1000 открытий в Canva в день.

**Откат на Dokploy.** Compose «Site» в проекте MyStars.Space на dokploy-ml
остановлен, но сохранён: запустить его, вернуть в Cloudflare проксируемые
A-записи `@`/`www` → origin и снять custom domains у Worker'а `mystars`.

### Docker Compose (self-host)

Два сервиса: `app` (nginx: статика + прокси `/api/`) и `track` (учёт/биллинг):

```bash
# .env рядом с docker-compose.yml
TRACK_ADMIN_TOKEN=<случайная строка — токен отчётов и начислений>
TRACK_IP_HASH_SECRET=<случайная строка — соль для HMAC IP-адресов>
TRACK_ALLOWED_ORIGINS=https://ваш-домен      # origin-check beacon'ов
TRACK_PARTNERS=demo                           # allowlist партнёров
TRACK_AFFILIATES=blogger,promo1               # allowlist рефералов

docker compose up -d --build
# → http://localhost:3000
```

`TRACK_ADMIN_TOKEN` и `TRACK_IP_HASH_SECRET` обязательны — compose не
стартует без них (защита от деплоя без токенов). База track-сервиса живёт
на volume `track-data`.

### Статический хостинг (без партнёрки)

Сам конструктор — полностью клиентский. Если учёт генераций не нужен,
`dist/` можно выложить на Vercel / Netlify / GitHub Pages:

```bash
npm run build   # → dist/
```

Beacon'ы и проверка статуса деградируют молча (fail-open) — конструктор
работает, но биллинг и рефералка требуют track-сервис.

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
3. Добавьте экспорт в `src/i18n/all-locales.ts`
4. Зарегистрируйте в `src/i18n/index.ts` (тип `Locale`, массив `AVAILABLE_LOCALES`, объект `LOCALE_NAMES`)

### Добавление нового шаблона

1. Создайте `public/templates/my-template.json`
2. Используйте: `?template=my-template`

### Добавление валюты

1. Добавьте запись в `src/config/currencies.ts`
2. Валюта автоматически появится в селекторе
