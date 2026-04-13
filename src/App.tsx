import React, { useState, useCallback } from 'react';
import { t, setLocale, getLocale, type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from './i18n/index.js';
import { cities, getCityName, sanitizeInput, formatCoordsDMS } from './data/cities.js';
import { getDefaultConfig } from './config/celestial-config.js';
import { getTheme, themes } from './config/themes.js';
import { posterSizes } from './config/celestial-config.js';
import { getDefaultFrame } from './config/frames.js';
import type { City, StarMapConfig, PosterSize } from './types/index.js';

import ControlPanel from './components/ControlPanel.js';
import PosterPreview from './components/PosterPreview.js';
import LanguageSelector from './components/LanguageSelector.js';

const LS_KEY = 'starmap-settings';

function loadSettings(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSettings(s: Record<string, any>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export default function App() {
  const saved = React.useMemo(() => loadSettings(), []);

  const [locale, _setLocale] = useState<Locale>(() => saved.locale || getLocale());
  const [themeId, setThemeId] = useState(() => saved.themeId || 'black');
  const [selectedCity, setSelectedCity] = useState<City>(() => saved.selectedCity || cities[0]);
  const [date, setDate] = useState(() => saved.date || { day: 26, month: 3, year: 2026 });
  const [time, setTime] = useState(() => saved.time || { hours: 0, minutes: 0 });
  const [layers, setLayers] = useState(() => saved.layers || {
    constellationLines: true,
    constellationNames: true,
    milkyWay: true,
  });
  const [phrase, setPhrase] = useState(() => saved.phrase || t('poster.under_this_sky', getLocale()));
  const [subtitles, setSubtitles] = useState(() => saved.subtitles || {
    line1: saved.subtitles?.line1 ?? '',
    line2: '',
    line3: '',
    line4: '',
  });
  const [selectedSize, setSelectedSize] = useState<PosterSize>(() => {
    if (saved.selectedSize) {
      return posterSizes.find(s => s.width === saved.selectedSize.width && s.height === saved.selectedSize.height) || posterSizes[1];
    }
    return posterSizes[1];
  });
  const [phraseFont, setPhraseFont] = useState(() => saved.phraseFont || 'Cormorant Garamond');
  const [phraseFontSize, setPhraseFontSize] = useState(() => saved.phraseFontSize || 16);
  const [subtitleFont, setSubtitleFont] = useState(() => saved.subtitleFont || 'Cormorant Garamond');
  const [subtitleFontSize, setSubtitleFontSize] = useState(() => saved.subtitleFontSize || 16);
  const [isExporting, setIsExporting] = useState(false);
  const [starColors, setStarColors] = useState(() => saved.starColors ?? true);
  const [gridStyle, setGridStyle] = useState<'hide' | 'flat' | 'spherical'>(() => saved.gridStyle || 'flat');

  // Persist settings to localStorage on every change
  React.useEffect(() => {
    saveSettings({
      locale, themeId, selectedCity, date, time, layers, phrase, subtitles,
      selectedSize, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize,
      starColors, gridStyle,
    });
  }, [locale, themeId, selectedCity, date, time, layers, phrase, subtitles,
      selectedSize, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize,
      starColors, gridStyle]);

  // Helper to build date string
  const buildDateStr = (d: typeof date, t2: typeof time, loc: Locale) => {
    const monthName = t(`month.${d.month}`, loc);
    return `${d.day} ${monthName} ${d.year} ${t('ui.time', loc).toLowerCase()} ${String(t2.hours).padStart(2, '0')}:${String(t2.minutes).padStart(2, '0')}`;
  };

  // Auto-fill subtitles only when user changes city/date/time (not on every render)
  const handleCityChange = useCallback((city: City) => {
    setSelectedCity(city);
    const cityName = getCityName(city, locale);
    const cityWithCountry = city.country ? `${cityName}, ${city.country}` : cityName;
    const coords = formatCoordsDMS(city.lat, city.lon);
    setSubtitles((prev: typeof subtitles) => ({ ...prev, line2: cityWithCountry, line4: coords }));
  }, [locale]);

  const handleDateChange = useCallback((d: typeof date) => {
    setDate(d);
    setSubtitles((prev: typeof subtitles) => ({ ...prev, line3: buildDateStr(d, time, locale) }));
  }, [time, locale]);

  const handleTimeChange = useCallback((t2: typeof time) => {
    setTime(t2);
    setSubtitles((prev: typeof subtitles) => ({ ...prev, line3: buildDateStr(date, t2, locale) }));
  }, [date, locale]);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    _setLocale(newLocale);
    // Update phrase to new locale
    setPhrase(t('poster.under_this_sky', newLocale));
    setSubtitles((prev: typeof subtitles) => ({
      ...prev,
    }));
  }, []);

  const handleThemeChange = useCallback((id: string) => {
    setThemeId(id);
  }, []);

  const handleToggleLayer = useCallback((layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
    // Find the star map canvas directly
    const starCanvas = document.querySelector('.poster__starmap-canvas') as HTMLCanvasElement;
    if (!starCanvas) { setIsExporting(false); return; }

    const theme = getTheme(themeId);

    // 300 DPI: cm → pixels (1 inch = 2.54 cm)
    const DPI = 300;
    const W = Math.round((selectedSize.width / 2.54) * DPI);
    const H = Math.round((selectedSize.height / 2.54) * DPI);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = W;
    exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d')!;

    // 1) Background
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, W, H);

    // Poster padding (matches CSS: .poster-canvas { padding: 5% })
    const posterPadding = Math.round(W * 0.05);
    const innerW = W - posterPadding * 2;

    // 2) Star map area: square inside padding (matches CSS: width:100%, aspect-ratio:1)
    const mapSize = innerW;
    const mapX = posterPadding;
    const mapY = posterPadding;

    // 3) Load and draw SVG frame
    const frameSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `/${getDefaultFrame().filename}`;
    });

    if (themeId === 'white' || themeId === 'beige') {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = mapSize;
      tmpCanvas.height = mapSize;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(frameSvg, 0, 0, mapSize, mapSize);
      const imgData = tmpCtx.getImageData(0, 0, mapSize, mapSize);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      tmpCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tmpCanvas, mapX, mapY, mapSize, mapSize);
    } else {
      ctx.drawImage(frameSvg, mapX, mapY, mapSize, mapSize);
    }

    // 4) Draw star canvas on top
    ctx.drawImage(starCanvas, mapX, mapY, mapSize, mapSize);

    // ── Text area (below star map, inside poster padding) ──
    const textAreaTop = mapY + mapSize;
    const textPadding = posterPadding; // reuse poster padding for text margins
    const textAreaHeight = H - textAreaTop - posterPadding;
    const textGap = textAreaHeight * 0.08; // CSS gap % in flex-column

    // Scale fonts relative to preview (~500px wide canvas)
    const scale = W / 500;

    // 5) Phrase text — at top of text area (with word-wrap like CSS)
    const phrasePx = Math.round(phraseFontSize * scale);
    const phraseLineHeight = phrasePx * 1.3;
    ctx.fillStyle = theme.text;
    ctx.font = `400 ${phrasePx}px "${phraseFont}", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const phraseY = textAreaTop + textPadding;
    const maxTextWidth = innerW;

    // Word-wrap: split each \n line into visual lines that fit maxTextWidth
    const wrappedLines: string[] = [];
    phrase.split('\n').forEach((paragraph: string) => {
      if (!paragraph) { wrappedLines.push(''); return; }
      const words = paragraph.split(' ');
      let currentLine = words[0] || '';
      for (let i = 1; i < words.length; i++) {
        const test = currentLine + ' ' + words[i];
        if (ctx.measureText(test).width <= maxTextWidth) {
          currentLine = test;
        } else {
          wrappedLines.push(currentLine);
          currentLine = words[i];
        }
      }
      wrappedLines.push(currentLine);
    });

    wrappedLines.forEach((line: string, i: number) => {
      const y = phraseY + i * phraseLineHeight;
      if (y < H - textPadding) ctx.fillText(line, W / 2, y);
    });
    const phraseBottom = phraseY + wrappedLines.length * phraseLineHeight;

    // 6) Subtitle lines — right after phrase with gap
    const subtitlePx = Math.round(subtitleFontSize * scale);
    const subtitleLineHeight = subtitlePx * 1.5;
    let subtitleY = phraseBottom + textGap;

    // Set letter-spacing to match CSS (1px at preview scale)
    ctx.letterSpacing = `${Math.round(1 * scale)}px`;

    // Line 1 — bold (name/company)
    if (subtitles.line1) {
      ctx.font = `500 ${subtitlePx}px "${subtitleFont}", serif`;
      ctx.globalAlpha = 1;
      if (subtitleY < H - textPadding) ctx.fillText(subtitles.line1, W / 2, subtitleY);
      subtitleY += subtitleLineHeight + subtitlePx * 0.3;
    }

    // Lines 2-4 — regular
    ctx.font = `400 ${subtitlePx}px "${subtitleFont}", serif`;
    ctx.globalAlpha = 0.8;
    const remainingLines = [subtitles.line2, subtitles.line3, subtitles.line4].filter(Boolean) as string[];
    remainingLines.forEach((line: string, i: number) => {
      const y = subtitleY + i * subtitleLineHeight;
      if (y < H - textPadding) ctx.fillText(line, W / 2, y);
    });
    ctx.globalAlpha = 1;
    ctx.letterSpacing = '0px';

    // 7) Download via Blob (better for large files)
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `starmap-${selectedCity.name || 'custom'}-${selectedSize.width}x${selectedSize.height}cm-300dpi.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
    } finally {
      setIsExporting(false);
    }
  }, [phrase, subtitles, themeId, selectedSize, selectedCity, date, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize, isExporting]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <div className="header__logo-icon">⭐</div>
          <div className="header__logo-text">MY STARS<br/>SPACE</div>
        </div>
        <div className="header__title">{t('ui.phrase', locale) === 'Фраза' ? 'Редактор' : 'Editor'}</div>
        <div className="header__actions">
          <LanguageSelector locale={locale} onChange={handleLocaleChange} />
        </div>
      </header>

      {/* Main Layout */}
      <div className="editor-layout">
        {/* Left: Controls + Font */}
        <div className="left-panel">
          <ControlPanel
            locale={locale}
            themeId={themeId}
            layers={layers}
            selectedCity={selectedCity}
            date={date}
            time={time}
            phrase={phrase}
            subtitles={subtitles}
            phraseFont={phraseFont}
            phraseFontSize={phraseFontSize}
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            starColors={starColors}
            gridStyle={gridStyle}
            onThemeChange={handleThemeChange}
            onToggleLayer={handleToggleLayer}
            onCityChange={handleCityChange}
            onDateChange={handleDateChange}
            onTimeChange={handleTimeChange}
            onPhraseChange={v => setPhrase(sanitizeInput(v))}
            onSubtitlesChange={s => setSubtitles({ line1: sanitizeInput(s.line1), line2: sanitizeInput(s.line2), line3: sanitizeInput(s.line3), line4: sanitizeInput(s.line4 || '') })}
            onPhraseFontChange={setPhraseFont}
            onPhraseFontSizeChange={setPhraseFontSize}
            onSubtitleFontChange={setSubtitleFont}
            onSubtitleFontSizeChange={setSubtitleFontSize}
            onStarColorsChange={setStarColors}
            onGridStyleChange={setGridStyle}
          />
        </div>

        {/* Center: Poster + Size + Export */}
        <div className="center-column">
          <PosterPreview
            themeId={themeId}
            locale={locale}
            selectedCity={selectedCity}
            date={date}
            time={time}
            layers={layers}
            phrase={phrase}
            subtitles={subtitles}
            phraseFont={phraseFont}
            phraseFontSize={phraseFontSize}
            subtitleFont={subtitleFont}
            subtitleFontSize={subtitleFontSize}
            starColors={starColors}
            gridStyle={gridStyle}
          />

          {/* Size Selector */}
          <div className="size-selector">
            {posterSizes.map(size => (
              <button
                key={size.label}
                className={`size-btn ${selectedSize.label === size.label ? 'size-btn--active' : ''}`}
                onClick={() => setSelectedSize(size)}
              >
                {size.label} {locale === 'ru' ? 'см' : 'cm'}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button className="export-btn" onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? (locale === 'ru' ? '⏳ Экспорт...' : '⏳ Exporting...')
              : t('ui.export_png', locale)
            }
          </button>
        </div>

        {/* Right: Info */}
        <div className="info-column editor-layout__info">
          <h3>{locale === 'ru' ? 'О карте' : 'About the Map'}</h3>
          <p>{locale === 'ru'
            ? 'Звёздная карта — постер с точным расположением звёзд над вашим городом в выбранные вами дату и время.'
            : 'A star map is a poster with the exact position of stars above your city at your chosen date and time.'
          }</p>
          <p>{locale === 'ru'
            ? 'Сохраните особенный момент в стильном подарке для себя или близких.'
            : 'Preserve a special moment in a stylish gift for yourself or loved ones.'
          }</p>

          <h3>{locale === 'ru' ? 'Как это работает' : 'How It Works'}</h3>
          <p>{locale === 'ru'
            ? 'Мы используем базу данных, основным источником данных для которой является Йельский каталог ярких звёзд. Карту всегда можно проверить на точность.'
            : 'We use the Yale Bright Star Catalog as our primary data source. The map can always be verified for accuracy.'
          }</p>

          <h3>{locale === 'ru' ? 'Мультиязычность' : 'Multi-language'}</h3>
          <p>{locale === 'ru'
            ? 'Наш сервис поддерживает 12 языков: русский, английский, немецкий, французский, испанский, итальянский, португальский, японский, корейский, китайский, арабский и турецкий.'
            : 'Our service supports 12 languages: Russian, English, German, French, Spanish, Italian, Portuguese, Japanese, Korean, Chinese, Arabic, and Turkish.'
          }</p>
        </div>
      </div>
    </>
  );
}
