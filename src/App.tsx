import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { t, setLocale, getLocale, type Locale } from './i18n/index.js';
import { cities, getCityName, getCountryDisplayName, sanitizeInput, formatCoordsDMS } from './data/cities.js';
import { themes } from './config/themes.js';
import { posterSizes } from './config/celestial-config.js';
import { getDefaultFormats, formatDate, formatTime } from './config/formats.js';
import { getBasePrice, getPartnerPrice, SIZE_PRICES_USD } from './config/pricing.js';
import { renderPosterRaster } from './services/posterRaster.js';
import { buildEditablePdf } from './services/canva/editablePdf.js';
import { fetchCanvaConfigured, openCanvaWindow, sendToCanva, PopupBlockedError } from './services/canva/openInCanva.js';
import { trackPartnerEvent, trackPartnerViewOnce, trackAffiliateClick } from './services/partnerTracking.js';
import { captureAffiliateRef, getAffiliateRef } from './services/affiliate.js';
import { fetchPartnerBlocked } from './services/partnerStatus.js';
import { useExchangeRates, convertPrice, formatPrice } from './services/exchangeRates.js';
import { CURRENCIES } from './config/currencies.js';
import type { FormatSettings } from './config/formats.js';
import type { City, StarMapConfig, PosterSize } from './types/index.js';
import {
  sanitizeId, resolveTemplateUrl, settingsStorageKey, sanitizeTemplate,
  isValidLocale, isValidCurrency,
} from './core/embedConfig.js';

import ControlPanel from './components/ControlPanel.js';
import PosterPreview from './components/PosterPreview.js';
import SettingsBar from './components/SettingsBar.js';
import { DEFAULT_CURRENCY } from './config/currencies.js';

// Partner embeds persist settings under their own namespace (see embedConfig)
const LS_KEY = settingsStorageKey(new URLSearchParams(window.location.search));

function loadSettings(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSettings(s: Record<string, any>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

/**
 * Apply CSS custom properties from a settings object.
 */
function applyCSSVars(cfg: Record<string, string>) {
  const root = document.documentElement;
  if (cfg.bg) root.style.setProperty('--embed-bg', `#${cfg.bg}`);
  if (cfg.text) root.style.setProperty('--embed-text', `#${cfg.text}`);
  if (cfg.accent) root.style.setProperty('--embed-accent', `#${cfg.accent}`);
  if (cfg.radius) root.style.setProperty('--embed-radius', `${cfg.radius}px`);
  if (cfg.panel) root.style.setProperty('--embed-panel-bg', `#${cfg.panel}`);
}

/**
 * Parse URL params for embed customization:
 * ?template=sky-blue&bg=1a1a2e&text=ffffff&accent=e94560&locale=ru
 * Template loads /templates/{name}.json, URL params override template values.
 */
const embedParams = new URLSearchParams(window.location.search);
const embedOverrides: Record<string, string> = {};
for (const [k, v] of embedParams.entries()) embedOverrides[k] = v;

// Apply immediate URL param CSS vars (will be re-applied after template loads)
applyCSSVars(embedOverrides);

// Untrusted values (URL params, templates, localStorage) are validated via
// embedConfig — junk like ?locale=xx or ?currency=XXX must not break the UI
const embedLocale: Locale | null = isValidLocale(embedOverrides.locale) ? embedOverrides.locale : null;
const embedTheme = embedOverrides.theme || null;
const embedCurrency = isValidCurrency(embedOverrides.currency) ? embedOverrides.currency : null;
// ?template=name → /templates/{name}.json; else ?partner=id → /templates/partners/{id}.json
const embedTemplateUrl = resolveTemplateUrl(embedParams);

export default function App() {
  const saved = React.useMemo(() => loadSettings(), []);

  const [locale, _setLocale] = useState<Locale>(
    () => embedLocale || (isValidLocale(saved.locale) ? saved.locale : getLocale()),
  );
  const [themeId, setThemeId] = useState(() => embedTheme || saved.themeId || 'black');
  const [selectedCity, setSelectedCity] = useState<City>(() => saved.selectedCity || cities[0]);
  const [date, setDate] = useState(() => saved.date || { day: 26, month: 3, year: 2026 });
  const [time, setTime] = useState(() => saved.time || { hours: 0, minutes: 0 });
  const [layers, setLayers] = useState(() => saved.layers || {
    constellationLines: true,
    constellationNames: true,
    milkyWay: true,
  });

  // Load template JSON (named template or partner default)
  useEffect(() => {
    if (!embedTemplateUrl) return;
    fetch(embedTemplateUrl)
      .then(r => r.ok ? r.json() : null)
      .then((tpl: unknown) => {
        if (!tpl) return;
        // Merge: template values as base, URL params override; unknown keys
        // and invalid values are dropped so they never reach app state
        const merged = sanitizeTemplate(tpl, embedOverrides);
        applyCSSVars(merged);
        if (merged.theme) setThemeId(merged.theme);
        if (merged.currency) setCurrency(merged.currency);
        if (merged.markup !== undefined) setPartnerMarkup(merged.markup);
        if (merged.units) setSizeUnit(merged.units as 'cm' | 'inch');
        if (merged.locale) {
          _setLocale(merged.locale);
          setLocale(merged.locale);
        }
        // Apply format settings from template
        if (merged.dateFormat || merged.timeFormat || merged.fullMonthName !== undefined) {
          setFormatSettings(prev => ({
            ...prev,
            ...(merged.dateFormat && { dateFormat: merged.dateFormat }),
            ...(merged.timeFormat && { timeFormat: merged.timeFormat }),
            ...(merged.fullMonthName !== undefined && { fullMonthName: merged.fullMonthName }),
          }));
        }
      })
      .catch(() => {});
  }, []);

  const [phrase, setPhrase] = useState(() => saved.phrase || t('phrase.birthday.1', getLocale()));
  const [subtitles, setSubtitles] = useState(() => {
    if (!saved.subtitles) return { line1: '', line2: '', line3: '', line4: '' };
    const s = saved.subtitles;
    // Rebuild line3 (date/time) to fix stale values from old format settings
    if (s.line3 && s.line3.includes('undefined')) {
      const d = saved.date || { day: 26, month: 3, year: 2026 };
      const t2 = saved.time || { hours: 0, minutes: 0 };
      const loc = isValidLocale(saved.locale) ? saved.locale : getLocale();
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
  const [phraseFontSize, setPhraseFontSize] = useState(() => saved.phraseFontSize || 30);
  const [subtitleFont, setSubtitleFont] = useState(() => saved.subtitleFont || 'Cormorant Garamond');
  const [subtitleFontSize, setSubtitleFontSize] = useState(() => saved.subtitleFontSize || 12);
  const [isExporting, setIsExporting] = useState(false);
  const [starColors, setStarColors] = useState(() => saved.starColors ?? true);
  const [gridStyle, setGridStyle] = useState<'hide' | 'flat' | 'spherical'>(() => saved.gridStyle || 'flat');
  const [frameStyle, setFrameStyle] = useState<'none' | 'line' | 'double' | 'border'>(() => saved.frameStyle || 'none');
  const [compassStyle, setCompassStyle] = useState<'none' | 'simple' | 'degrees' | 'cardinal'>(() => saved.compassStyle || 'cardinal');
  const [showZodiac, setShowZodiac] = useState(() => saved.showZodiac ?? false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeUnit, setSizeUnit] = useState<'cm' | 'inch'>('cm');
  const [currency, setCurrency] = useState(
    () => embedCurrency || (isValidCurrency(saved.currency) ? saved.currency : DEFAULT_CURRENCY),
  );
  const exchangeRates = useExchangeRates();

  // Embed / whitelabel: read partner ID from URL ?partner=xxx
  const partnerId = React.useMemo(
    () => sanitizeId(new URLSearchParams(window.location.search).get('partner')) || undefined,
    [],
  );
  // Partner markup in USD, set only via the partner's template JSON
  const [partnerMarkup, setPartnerMarkup] = useState(0);

  // Billing: count the embed view once per session
  useEffect(() => { trackPartnerViewOnce(partnerId); }, [partnerId]);

  // Prepaid credits: exhausted partner balance disables ordering (fail-open)
  const [embedBlocked, setEmbedBlocked] = useState(false);
  // "Edit in Canva" appears only once the edge has Canva credentials configured
  const [canvaAvailable, setCanvaAvailable] = useState(false);
  const [canvaBusy, setCanvaBusy] = useState(false);
  useEffect(() => { fetchCanvaConfigured().then(setCanvaAvailable); }, []);
  useEffect(() => {
    let cancelled = false;
    fetchPartnerBlocked(partnerId).then(b => { if (!cancelled) setEmbedBlocked(b); });
    return () => { cancelled = true; };
  }, [partnerId]);

  // Affiliate: capture ?ref=CODE (30-day last-click attribution) and report the click
  useEffect(() => {
    const newRef = captureAffiliateRef(window.location.search);
    if (newRef) trackAffiliateClick(newRef);
  }, []);
  const [formatSettings, setFormatSettings] = useState<FormatSettings>(() => {
    const defaults = getDefaultFormats(isValidLocale(saved.locale) ? saved.locale : getLocale());
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
      starColors, gridStyle, frameStyle, compassStyle, showZodiac, formatSettings, currency]);

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
    const countryName = city.country ? getCountryDisplayName(city.country, locale) : '';
    const cityWithCountry = countryName ? `${cityName}, ${countryName}` : cityName;
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
    setPhrase(t('phrase.birthday.1', newLocale));
    // Update format settings to locale defaults
    const newFormats = getDefaultFormats(newLocale);
    setFormatSettings(newFormats);
    // Re-translate city + country subtitle
    setSubtitles((prev: typeof subtitles) => {
      const cityName = getCityName(selectedCity, newLocale);
      const countryName = selectedCity.country ? getCountryDisplayName(selectedCity.country, newLocale) : '';
      const cityWithCountry = countryName ? `${cityName}, ${countryName}` : cityName;
      const dateStr = formatDate(date.day, date.month, date.year, newFormats.dateFormat, newLocale, newFormats.fullMonthName);
      const timeStr = formatTime(time.hours, time.minutes, newFormats.timeFormat);
      return { ...prev, line2: cityWithCountry, line3: `${dateStr}, ${timeStr}` };
    });
  }, [selectedCity, date, time]);

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
    // Find the poster DOM element
    const posterEl = document.querySelector('.poster-frame') as HTMLElement;
    if (!posterEl) throw new Error('Poster element not found');

    // 300 DPI print raster (DOM capture + full-resolution star map and frames)
    const exportCanvas = await renderPosterRaster({
      posterEl, dpi: 300, size: selectedSize, themeId, selectedCity, date, time,
      layers, starColors, gridStyle, compassStyle, frameStyle, locale,
    });

    const baseName = `starmap-${selectedCity.name || 'custom'}-${selectedSize.width}x${selectedSize.height}cm-300dpi`;

    // Generate PDF from the rendered canvas
    const { default: jsPDF } = await import('jspdf');
    const widthMM = selectedSize.width * 10;   // cm → mm
    const heightMM = selectedSize.height * 10; // cm → mm
    const pdf = new jsPDF({
      orientation: widthMM > heightMM ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMM, heightMM],
      compress: true,
    });
    // Embed the canvas as a full-bleed JPEG (q0.95: visually lossless for
    // posters, ~10× smaller and faster than PNG — avoids OOM on large sizes)
    const imgData = exportCanvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, widthMM, heightMM);
    pdf.save(`${baseName}.pdf`);

    // Billing + affiliate attribution: count the successful generation,
    // tagged with the partner (embed) and/or the referring affiliate
    trackPartnerEvent(partnerId, 'export', getAffiliateRef());
    } catch (err: unknown) {
      console.error('[Export] FAILED:', err);
      alert('Export failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  }, [phrase, subtitles, themeId, selectedSize, selectedCity, date, time, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize, isExporting, layers, starColors, gridStyle, frameStyle, compassStyle, locale, partnerId]);

  // Opens the current poster in the customer's own Canva with editable texts.
  // Same rules as the PDF order: blocked for partners without credits, and
  // counted as an export for billing/affiliate attribution.
  const handleEditInCanva = useCallback(() => {
    if (canvaBusy || isExporting || embedBlocked) return;
    let win: Window;
    try {
      // Synchronously, inside the click: popup blockers allow nothing later
      win = openCanvaWindow(t('ui.canva_preparing', locale), locale);
    } catch (err) {
      if (err instanceof PopupBlockedError) alert(t('ui.canva_popup_blocked', locale));
      return;
    }
    setCanvaBusy(true);
    (async () => {
      try {
        const posterEl = document.querySelector('.poster-frame') as HTMLElement;
        if (!posterEl) throw new Error('Poster element not found');
        const { blob } = await buildEditablePdf({
          posterEl, size: selectedSize, themeId, selectedCity, date, time,
          layers, starColors, gridStyle, compassStyle, frameStyle, locale,
        });
        await sendToCanva(win, blob, phrase.trim() || 'MyStarsSpace');
        trackPartnerEvent(partnerId, 'export', getAffiliateRef());
      } catch (err) {
        win.close();
        console.error('[Canva] FAILED:', err);
        alert(t('ui.canva_failed', locale, { error: err instanceof Error ? err.message : String(err) }));
      } finally {
        setCanvaBusy(false);
      }
    })();
  }, [canvaBusy, isExporting, embedBlocked, locale, selectedSize, themeId, selectedCity, date, time, layers, starColors, gridStyle, compassStyle, frameStyle, phrase, partnerId]);

  return (
    <>


      {/* Main Layout */}
      <div className="editor-layout">
        {/* Left: Style Controls */}
        <div className="left-panel">
          {/* Language & Currency */}
          <SettingsBar
            locale={locale}
            onLocaleChange={handleLocaleChange}
            currency={currency}
            onCurrencyChange={setCurrency}
            partnerId={partnerId}
          />
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
                  'A4': '8×11.7"',
                  '30×40': '12×16"',
                  '40×50': '16×20"',
                  '40×60': '16×24"',
                  '50×70': '20×28"',
                };
                const cmLabel = `${size.width}×${size.height}${t('ui.unit_cm', locale)}`;
                const inchLabel = inchMap[size.label] || `${(size.width / 2.54).toFixed(0)}×${(size.height / 2.54).toFixed(0)}"`;
                const primary = sizeUnit === 'cm' ? cmLabel : inchLabel;
                const secondary = sizeUnit === 'cm' ? inchLabel : cmLabel;
                const sizeKeyMap: Record<string, string> = {
                  '10×15': 'size.postcard',
                  'A4': 'size.a4',
                  '30×40': 'size.standard',
                  '40×50': 'size.medium',
                  '40×60': 'size.large',
                  '50×70': 'size.max',
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

          {/* Preview Info */}
          <div className="preview-info">
            {t('ui.preview_info', locale)}
          </div>

          {/* Pricing + Order */}
          {(() => {
            const currInfo = CURRENCIES.find(c => c.code === currency);
            const sym = currInfo?.symbol || '$';
            // Partner embeds: price floored at $5 minimum + partner markup
            const baseUSD = partnerId
              ? getPartnerPrice(getBasePrice(selectedSize.label), partnerMarkup)
              : getBasePrice(selectedSize.label);
            const maxUSD = partnerId
              ? getPartnerPrice(SIZE_PRICES_USD['50×70'], partnerMarkup)
              : SIZE_PRICES_USD['50×70'];
            const currentPrice = convertPrice(baseUSD, currency, exchangeRates);
            const maxPrice = convertPrice(maxUSD, currency, exchangeRates);
            const showStrike = maxPrice !== null && currentPrice !== null && maxPrice > currentPrice;
            return (
              <div className="order-block">
                <button className="export-btn" onClick={handleExport} disabled={isExporting || embedBlocked}>
                  {embedBlocked
                    ? t('ui.order_unavailable', locale)
                    : isExporting
                      ? t('ui.exporting', locale)
                      : `${t('ui.order_pdf', locale)}: ${currentPrice !== null ? formatPrice(currentPrice, currency, sym) : '...'}`
                  }
                </button>
                {canvaAvailable && (
                  <button
                    type="button"
                    className="canva-btn"
                    onClick={handleEditInCanva}
                    disabled={canvaBusy || isExporting || embedBlocked}
                    title={t('ui.canva_hint', locale)}
                  >
                    {canvaBusy ? t('ui.canva_preparing', locale) : t('ui.edit_in_canva', locale)}
                  </button>
                )}
                <div className="order-block__price">
                  <span className="order-block__label">{t('ui.total', locale)}</span>
                  <span className="order-block__current">
                    {currentPrice !== null ? formatPrice(currentPrice, currency, sym) : '...'}
                  </span>
                  {showStrike && (
                    <span className="order-block__was">
                      {formatPrice(maxPrice!, currency, sym)}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
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
