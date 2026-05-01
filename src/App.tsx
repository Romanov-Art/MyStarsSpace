import React, { useState, useCallback } from 'react';
import { t, setLocale, getLocale, type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from './i18n/index.js';
import { cities, getCityName, sanitizeInput, formatCoordsDMS } from './data/cities.js';
import { getDefaultConfig } from './config/celestial-config.js';
import { getTheme, themes } from './config/themes.js';
import { posterSizes } from './config/celestial-config.js';
import { getDefaultFrame, getFrameForCompass } from './config/frames.js';
import { renderStarMapToCanvas, drawPosterFrame } from './components/PosterPreview.js';
import { getDefaultFormats, formatDate, formatTime, formatSize } from './config/formats.js';
import type { FormatSettings } from './config/formats.js';
import type { City, StarMapConfig, PosterSize } from './types/index.js';

import ControlPanel from './components/ControlPanel.js';
import PosterPreview from './components/PosterPreview.js';
import SettingsBar from './components/SettingsBar.js';
import { DEFAULT_CURRENCY } from './config/currencies.js';

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
  const [subtitles, setSubtitles] = useState(() => {
    if (!saved.subtitles) return { line1: '', line2: '', line3: '', line4: '' };
    const s = saved.subtitles;
    // Rebuild line3 (date/time) to fix stale values from old format settings
    if (s.line3 && s.line3.includes('undefined')) {
      const d = saved.date || { day: 26, month: 3, year: 2026 };
      const t2 = saved.time || { hours: 0, minutes: 0 };
      const loc = saved.locale || getLocale();
      const fmt = saved.formatSettings || getDefaultFormats(loc);
      const validFormats = ['DD.MM.YYYY', 'MM/DD/YYYY'];
      const df = validFormats.includes(fmt.dateFormat) ? fmt.dateFormat : 'DD.MM.YYYY';
      const dateStr = formatDate(d.day, d.month, d.year, df as any, loc, fmt.fullMonthName);
      const timeStr = formatTime(t2.hours, t2.minutes, fmt.timeFormat || '24h');
      s.line3 = `${dateStr}, ${timeStr}`;
    }
    return s;
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
  const [frameStyle, setFrameStyle] = useState<'none' | 'line' | 'double' | 'border'>(() => saved.frameStyle || 'none');
  const [compassStyle, setCompassStyle] = useState<'none' | 'simple' | 'degrees' | 'cardinal'>(() => saved.compassStyle || 'cardinal');
  const [showZodiac, setShowZodiac] = useState(() => saved.showZodiac ?? false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeUnit, setSizeUnit] = useState<'cm' | 'inch'>('cm');
  const [currency, setCurrency] = useState(() => saved.currency || DEFAULT_CURRENCY);

  // Embed / whitelabel: read partner ID from URL ?partner=xxx
  const partnerId = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('partner') || undefined;
  }, []);
  const [formatSettings, setFormatSettings] = useState<FormatSettings>(() => {
    const defaults = getDefaultFormats(saved.locale || getLocale());
    if (!saved.formatSettings) return defaults;
    const s = saved.formatSettings as FormatSettings;
    // Sanitize legacy values (e.g. 'full' dateFormat removed in refactor)
    const validDateFormats: string[] = ['DD.MM.YYYY', 'MM/DD/YYYY'];
    if (!validDateFormats.includes(s.dateFormat)) s.dateFormat = defaults.dateFormat;
    return { ...defaults, ...s };
  });

  // Persist settings to localStorage on every change
  React.useEffect(() => {
    saveSettings({
      locale, themeId, selectedCity, date, time, layers, phrase, subtitles,
      selectedSize, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize,
      starColors, gridStyle, frameStyle, compassStyle, showZodiac, formatSettings, currency,
    });
  }, [locale, themeId, selectedCity, date, time, layers, phrase, subtitles,
      selectedSize, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize,
      starColors, gridStyle, frameStyle, compassStyle, showZodiac, formatSettings]);

  // Helper to build date string using format settings
  const buildDateStr = (d: typeof date, t2: typeof time, loc: Locale) => {
    const dateStr = formatDate(d.day, d.month, d.year, formatSettings.dateFormat, loc, formatSettings.fullMonthName);
    const timeStr = formatTime(t2.hours, t2.minutes, formatSettings.timeFormat);
    return `${dateStr}, ${timeStr}`;
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
  }, [time, locale, formatSettings]);

  const handleTimeChange = useCallback((t2: typeof time) => {
    setTime(t2);
    setSubtitles((prev: typeof subtitles) => ({ ...prev, line3: buildDateStr(date, t2, locale) }));
  }, [date, locale, formatSettings]);

  // Auto-update date line when format settings change
  const handleFormatSettingsChange = useCallback((newSettings: FormatSettings) => {
    setFormatSettings(newSettings);
    // Rebuild date string with new format
    const dateStr = formatDate(date.day, date.month, date.year, newSettings.dateFormat, locale, newSettings.fullMonthName);
    const timeStr = formatTime(time.hours, time.minutes, newSettings.timeFormat);
    setSubtitles((prev: typeof subtitles) => ({ ...prev, line3: `${dateStr}, ${timeStr}` }));
  }, [date, time, locale]);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    _setLocale(newLocale);
    // Update phrase to new locale
    setPhrase(t('poster.under_this_sky', newLocale));
    // Update format settings to locale defaults
    setFormatSettings(getDefaultFormats(newLocale));
    setSubtitles((prev: typeof subtitles) => ({
      ...prev,
    }));
  }, []);

  const handleThemeChange = useCallback((id: string) => {
    if (id.startsWith('custom:')) {
      const hex = id.slice(7);
      // Determine if background is light or dark
      const c = hex.replace('#', '');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      const isLight = (r * 0.299 + g * 0.587 + b * 0.114) > 150;
      // Register custom theme dynamically
      themes['custom'] = {
        id: 'custom',
        name: 'Custom',
        background: hex,
        stars: isLight ? '#000000' : '#ffffff',
        grid: isLight ? '#999' : '#555',
        constellationLines: isLight ? '#333' : '#ccc',
        text: isLight ? '#000000' : '#ffffff',
        borderColor: hex,
        borderWidth: 0,
        frameFilter: isLight ? 'invert(1)' : 'none',
      };
      // Force re-render: briefly set to empty then back to 'custom'
      setThemeId('');
      requestAnimationFrame(() => setThemeId('custom'));
    } else {
      setThemeId(id);
    }
  }, []);

  const handleToggleLayer = useCallback((layer: keyof typeof layers) => {
    setLayers((prev: typeof layers) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleExport = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
    const { default: html2canvas } = await import('html2canvas');

    // 300 DPI: cm → pixels (1 inch = 2.54 cm)
    const DPI = 300;
    const W = Math.round((selectedSize.width / 2.54) * DPI);
    const H = Math.round((selectedSize.height / 2.54) * DPI);

    // Find the poster DOM element
    const posterEl = document.querySelector('.poster-frame') as HTMLElement;
    if (!posterEl) throw new Error('Poster element not found');

    // Calculate scale factor: export pixel size / DOM element size
    const domRect = posterEl.getBoundingClientRect();
    const scaleX = W / domRect.width;
    const scaleY = H / domRect.height;
    const scale = Math.max(scaleX, scaleY);

    // Ensure all fonts are ready
    await document.fonts.ready;

    // Capture the poster DOM at high resolution
    const domCanvas = await html2canvas(posterEl, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: domRect.width,
      height: domRect.height,
      logging: false,
      // Ignore star canvas and frame SVG bg — we re-render both at full resolution
      ignoreElements: (el: Element) =>
        el.classList.contains('poster__starmap-canvas') ||
        el.classList.contains('poster__frame-bg'),
    });

    // Create final export canvas at exact print dimensions
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = W;
    exportCanvas.height = H;
    const ctx = exportCanvas.getContext('2d')!;

    // Draw the DOM capture (contains all text, frames, background at exact layout)
    ctx.drawImage(domCanvas, 0, 0, W, H);

    // Now overlay the star map at full export resolution
    const theme = getTheme(themeId);
    const exportDateTime = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hours, time.minutes));

    // Find the star map container position relative to poster
    const starmapContainer = posterEl.querySelector('.poster__starmap-container') as HTMLElement;
    if (starmapContainer) {
      const mapRect = starmapContainer.getBoundingClientRect();
      // Star map is always square — use min dimension to guarantee
      const mapDomSize = Math.min(mapRect.width, mapRect.height);
      const mapX = Math.round((mapRect.left - domRect.left) * scale);
      const mapY = Math.round((mapRect.top - domRect.top) * scale);
      const mapSize = Math.round(mapDomSize * scale);

      // Draw the SVG frame at full resolution
      const frameUrl = `/${getFrameForCompass(compassStyle).filename}`;
      const svgText = await fetch(frameUrl).then(r => r.text());
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
      const frameSvg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load frame SVG: ${e}`));
        img.src = svgDataUrl;
      });

      if (theme.frameFilter !== 'none') {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = mapSize;
        tmpCanvas.height = mapSize;
        const tmpCtx = tmpCanvas.getContext('2d')!;
        tmpCtx.drawImage(frameSvg, 0, 0, mapSize, mapSize);
        const imgData = tmpCtx.getImageData(0, 0, mapSize, mapSize);
        const d = imgData.data;

        const needsInvert = theme.frameFilter.includes('invert');
        const brightnessMatch = theme.frameFilter.match(/brightness\(([^)]+)\)/);
        const brightness = brightnessMatch ? parseFloat(brightnessMatch[1]) : 1;

        for (let i = 0; i < d.length; i += 4) {
          if (needsInvert) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
          }
          if (brightness !== 1) {
            d[i] = Math.min(255, d[i] * brightness);
            d[i + 1] = Math.min(255, d[i + 1] * brightness);
            d[i + 2] = Math.min(255, d[i + 2] * brightness);
          }
        }
        tmpCtx.putImageData(imgData, 0, 0);
        ctx.drawImage(tmpCanvas, mapX, mapY, mapSize, mapSize);
      } else {
        ctx.drawImage(frameSvg, mapX, mapY, mapSize, mapSize);
      }

      // Render star map at FULL export resolution (crisp, no upscaling blur)
      const starCanvas = await renderStarMapToCanvas(
        mapSize, selectedCity, exportDateTime, themeId,
        layers, starColors, gridStyle, compassStyle,
      );
      ctx.drawImage(starCanvas, mapX, mapY, mapSize, mapSize);
    }

    // Poster frame border (rendered on canvas for print-quality export)
    drawPosterFrame(ctx, W, H, frameStyle, theme.background);

    // Download via Blob (better for large files)
    await new Promise<void>((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null — canvas may be tainted'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `starmap-${selectedCity.name || 'custom'}-${selectedSize.width}x${selectedSize.height}cm-300dpi.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Delay revoke so browser has time to start the download
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        resolve();
      }, 'image/png');
    });
    } catch (err: unknown) {
      console.error('[Export] FAILED:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  }, [phrase, subtitles, themeId, selectedSize, selectedCity, date, time, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize, isExporting, layers, starColors, gridStyle, frameStyle, compassStyle]);

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <div className="header__logo-icon">⭐</div>
          <div className="header__logo-text">MY STARS<br/>SPACE</div>
        </div>
        <div className="header__title">{t('ui.editor', locale)}</div>
        <div className="header__actions" />
      </header>

      {/* Settings Bar — Language & Currency */}
      <SettingsBar
        locale={locale}
        onLocaleChange={handleLocaleChange}
        currency={currency}
        onCurrencyChange={setCurrency}
        partnerId={partnerId}
      />

      {/* Main Layout */}
      <div className="editor-layout">
        {/* Left: Style Controls */}
        <div className="left-panel">
          <ControlPanel
            mode="style"
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
            frameStyle={frameStyle}
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
            onFrameStyleChange={setFrameStyle}
            compassStyle={compassStyle}
            showZodiac={showZodiac}
            onCompassStyleChange={setCompassStyle}
            onShowZodiacChange={setShowZodiac}
            formatSettings={formatSettings}
            onFormatSettingsChange={handleFormatSettingsChange}
          />

          {/* Size Selector Card */}
          <div className="size-section panel-section">
            <div className="panel-section__title">
              <span>{t('ui.choose_size', locale)}</span>
              <button
                className="size-unit-toggle"
                onClick={() => setSizeUnit(u => u === 'cm' ? 'inch' : 'cm')}
                title={sizeUnit === 'cm' ? 'Switch to inches' : 'Switch to cm'}
              >
                <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="1" y="1" width="20" height="12" rx="1" />
                  <line x1="4" y1="1" x2="4" y2="5" />
                  <line x1="7" y1="1" x2="7" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="5" />
                  <line x1="13" y1="1" x2="13" y2="4" />
                  <line x1="16" y1="1" x2="16" y2="5" />
                  <line x1="19" y1="1" x2="19" y2="4" />
                </svg>
                <span className="size-unit-toggle__label">{sizeUnit}</span>
              </button>
            </div>
            <div className="size-grid">
              {posterSizes.map(size => {
                const inchMap: Record<string, string> = {
                  '10×15': '4×6"',
                  'A4': '8×12"',
                  '30×40': '12×16"',
                  '40×50': '16×20"',
                  '45×60': '18×24"',
                  '60×90': '24×36"',
                };
                const cmLabel = `${size.width}×${size.height}${t('ui.unit_cm', locale)}`;
                const inchLabel = inchMap[size.label] || `${(size.width / 2.54).toFixed(0)}×${(size.height / 2.54).toFixed(0)}"`;
                const primary = sizeUnit === 'cm' ? cmLabel : inchLabel;
                const secondary = sizeUnit === 'cm' ? inchLabel : cmLabel;
                const sizeKeyMap: Record<string, string> = {
                  '10×15': 'size.postcard',
                  'A4': 'size.a4',
                  '30×40': 'size.medium',
                  '40×50': 'size.large',
                  '45×60': 'size.large_plus',
                  '60×90': 'size.max',
                };
                const name = t(sizeKeyMap[size.label] || size.label, locale);
                const tooltipImg = `/tooltip/${size.label.replace('×', 'x')}.jpg`;
                return (
                  <div key={size.label} className="size-btn-wrapper">
                    <button
                      className={`size-btn ${selectedSize.label === size.label ? 'size-btn--active' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      <span className="size-btn__name">{name}</span>
                      <span className="size-btn__primary">{primary}</span>
                      <span className="size-btn__secondary">{secondary}</span>
                    </button>
                    <div className="size-btn-tooltip">
                      <img src={tooltipImg} alt={name} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Poster + Export */}
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
            frameStyle={frameStyle}
            compassStyle={compassStyle}
            selectedSize={selectedSize}
          />

          {/* Export Button */}
          <button className="export-btn" onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? t('ui.exporting', locale)
              : t('ui.export_png', locale)
            }
          </button>
        </div>

        {/* Right: Content Controls */}
        <div className="right-panel">
          <ControlPanel
            mode="content"
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
            frameStyle={frameStyle}
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
            onFrameStyleChange={setFrameStyle}
            compassStyle={compassStyle}
            showZodiac={showZodiac}
            onCompassStyleChange={setCompassStyle}
            onShowZodiacChange={setShowZodiac}
            formatSettings={formatSettings}
            onFormatSettingsChange={handleFormatSettingsChange}
          />
        </div>
      </div>

      {/* Size Guide Lightbox */}
      {showSizeGuide && (
        <div className="lightbox-overlay" onClick={() => setShowSizeGuide(false)}>
          <button className="lightbox-close" onClick={() => setShowSizeGuide(false)}>×</button>
          <img src="/size-guide.jpeg" alt="Size Guide" className="lightbox-image" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
