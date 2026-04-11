import React, { useState, useCallback } from 'react';
import { t, setLocale, getLocale, type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from './i18n/index.js';
import { cities, getCityName } from './data/cities.js';
import { getDefaultConfig } from './config/celestial-config.js';
import { getTheme, themes } from './config/themes.js';
import { posterSizes } from './config/celestial-config.js';
import { getDefaultFrame } from './config/frames.js';
import type { City, StarMapConfig, PosterSize } from './types/index.js';

import ControlPanel from './components/ControlPanel.js';
import PosterPreview from './components/PosterPreview.js';
import LanguageSelector from './components/LanguageSelector.js';
import FontSelector from './components/FontSelector.js';

export default function App() {
  const [locale, _setLocale] = useState<Locale>(getLocale());
  const [themeId, setThemeId] = useState('black');
  const [selectedCity, setSelectedCity] = useState<City>(cities[0]); // Moscow
  const [date, setDate] = useState({ day: 26, month: 3, year: 2026 });
  const [time, setTime] = useState({ hours: 0, minutes: 0 });
  const [layers, setLayers] = useState({
    grid: true,
    constellationLines: true,
    constellationNames: true,
  });
  const [phrase, setPhrase] = useState(() => t('poster.under_this_sky', getLocale()));
  const [subtitles, setSubtitles] = useState({
    line1: t('category.birthday', getLocale()),
    line2: '',
    line3: '',
  });
  const [selectedSize, setSelectedSize] = useState<PosterSize>(posterSizes[1]); // 30x40
  const [showTime, setShowTime] = useState(true);
  const [posterFont, setPosterFont] = useState('Cormorant Garamond');
  const [posterFontSize, setPosterFontSize] = useState(16);

  // Initialize subtitles with city and date
  React.useEffect(() => {
    const cityName = getCityName(selectedCity, locale);
    const monthName = t(`month.${date.month}`, locale);
    const dateStr = showTime
      ? `${date.day} ${monthName} ${date.year} ${t('ui.time', locale).toLowerCase()} ${String(time.hours).padStart(2, '0')}:${String(time.minutes).padStart(2, '0')}`
      : `${date.day} ${monthName} ${date.year}`;
    setSubtitles(prev => ({
      ...prev,
      line2: cityName,
      line3: dateStr,
    }));
  }, [selectedCity, date, time, locale, showTime]);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    _setLocale(newLocale);
    // Update phrase to new locale
    setPhrase(t('poster.under_this_sky', newLocale));
    setSubtitles(prev => ({
      ...prev,
      line1: t('category.birthday', newLocale),
    }));
  }, []);

  const handleThemeChange = useCallback((id: string) => {
    setThemeId(id);
  }, []);

  const handleToggleLayer = useCallback((layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleExport = useCallback(async () => {
    // Find the star map canvas directly (it IS the .poster__starmap-canvas element)
    const starCanvas = document.querySelector('.poster__starmap-canvas') as HTMLCanvasElement;
    if (!starCanvas) return;

    const theme = getTheme(themeId);
    const W = 2000;
    const H = Math.round(W * (selectedSize.height / selectedSize.width));
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = W;
    exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d')!;

    // 1) Background
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, W, H);

    // 2) Star map area: square centered in the upper portion
    const mapSize = W * 0.90;
    const mapX = (W - mapSize) / 2;
    const mapY = W * 0.04;

    // 3) Load and draw SVG frame as background
    const frameSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = `/${getDefaultFrame().filename}`;
    });
    ctx.drawImage(frameSvg, mapX, mapY, mapSize, mapSize);

    // 4) Draw star canvas on top (already includes background fill + clipping)
    ctx.drawImage(starCanvas, mapX, mapY, mapSize, mapSize);

    // 5) Phrase text
    const fontScale = W / 500; // relative to 500px reference
    const phraseFontPx = posterFontSize * fontScale * 0.28;
    ctx.fillStyle = theme.text;
    ctx.font = `400 ${Math.round(phraseFontPx)}px "${posterFont}", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const phraseY = mapY + mapSize + H * 0.03;
    ctx.fillText(phrase, W / 2, phraseY);

    // 6) Subtitle lines
    const subtitleGap = H * 0.025;
    const subtitleBaseY = H * 0.82;
    ctx.font = `500 ${Math.round(W * 0.022)}px "Inter", sans-serif`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(subtitles.line1, W / 2, subtitleBaseY);
    ctx.font = `400 ${Math.round(W * 0.018)}px "Inter", sans-serif`;
    ctx.fillText(subtitles.line2, W / 2, subtitleBaseY + subtitleGap);
    ctx.fillText(subtitles.line3, W / 2, subtitleBaseY + subtitleGap * 2);
    ctx.globalAlpha = 1;

    // 7) Download
    const link = document.createElement('a');
    link.download = `starmap-${selectedCity.name}-${date.year}-${date.month}-${date.day}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [phrase, subtitles, themeId, selectedSize, selectedCity, date, posterFont, posterFontSize]);

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
            showTime={showTime}
            onThemeChange={handleThemeChange}
            onToggleLayer={handleToggleLayer}
            onCityChange={setSelectedCity}
            onDateChange={setDate}
            onTimeChange={setTime}
            onPhraseChange={setPhrase}
            onSubtitlesChange={setSubtitles}
            onShowTimeChange={setShowTime}
          />

          {/* Font Selector */}
          <FontSelector
            selectedFont={posterFont}
            selectedFontSize={posterFontSize}
            onChange={setPosterFont}
            onFontSizeChange={setPosterFontSize}
            locale={locale}
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
            showTime={showTime}
            posterFont={posterFont}
            posterFontSize={posterFontSize}
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
          <button className="export-btn" onClick={handleExport}>
            {t('ui.export_png', locale)}
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
