import React, { useState, useCallback } from 'react';
import { t, setLocale, getLocale, type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from './i18n/index.js';
import { cities, getCityName } from './data/cities.js';
import { getDefaultConfig } from './config/celestial-config.js';
import { getTheme, themes } from './config/themes.js';
import { posterSizes } from './config/celestial-config.js';
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

  const handleExport = useCallback(() => {
    // Find the canvas inside poster and export
    const canvas = document.querySelector('.poster__starmap-canvas canvas') as HTMLCanvasElement;
    const posterEl = document.querySelector('.poster-frame') as HTMLElement;
    if (!posterEl) return;

    // Use html2canvas approach: create offscreen canvas with poster content
    // For now, simple canvas export
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 2000;
    exportCanvas.height = Math.round(2000 * (selectedSize.height / selectedSize.width));
    const ctx = exportCanvas.getContext('2d')!;
    const theme = getTheme(themeId);

    // Background
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw star map circle
    if (canvas) {
      const mapSize = exportCanvas.width * 0.85;
      const mapX = (exportCanvas.width - mapSize) / 2;
      const mapY = exportCanvas.width * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(canvas, mapX, mapY, mapSize, mapSize);
      ctx.restore();
    }

    // Phrase text
    ctx.fillStyle = theme.text;
    ctx.font = `400 ${exportCanvas.width * 0.04}px "${posterFont}", Georgia, serif`;
    ctx.textAlign = 'center';
    const phraseY = exportCanvas.height * 0.75;
    ctx.fillText(phrase, exportCanvas.width / 2, phraseY);

    // Subtitle lines
    ctx.font = `500 ${exportCanvas.width * 0.02}px "Inter", sans-serif`;
    ctx.globalAlpha = 0.8;
    const baseY = exportCanvas.height * 0.85;
    ctx.fillText(subtitles.line1, exportCanvas.width / 2, baseY);
    ctx.font = `400 ${exportCanvas.width * 0.018}px "Inter", sans-serif`;
    ctx.fillText(subtitles.line2, exportCanvas.width / 2, baseY + exportCanvas.width * 0.03);
    ctx.fillText(subtitles.line3, exportCanvas.width / 2, baseY + exportCanvas.width * 0.055);

    // Download
    const link = document.createElement('a');
    link.download = `starmap-${selectedCity.name}-${date.year}-${date.month}-${date.day}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [phrase, subtitles, themeId, selectedSize, selectedCity, date]);

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
