import React, { useState, useMemo } from 'react';
import { t, type Locale } from '../i18n/index.js';
import { cities, findCity, getCityName, parseCoordinates, sanitizeInput } from '../data/cities.js';
import type { City } from '../types/index.js';
import FontSelector from './FontSelector.js';

interface ControlPanelProps {
  locale: Locale;
  themeId: string;
  layers: { constellationLines: boolean; constellationNames: boolean; milkyWay: boolean };
  selectedCity: City;
  date: { day: number; month: number; year: number };
  time: { hours: number; minutes: number };
  phrase: string;
  subtitles: { line1: string; line2: string; line3: string };
  phraseFont: string;
  phraseFontSize: number;
  subtitleFont: string;
  subtitleFontSize: number;
  starColors: boolean;
  gridStyle: 'hide' | 'flat' | 'spherical';
  onThemeChange: (id: string) => void;
  onToggleLayer: (layer: 'constellationLines' | 'constellationNames' | 'milkyWay') => void;
  onCityChange: (city: City) => void;
  onDateChange: (date: { day: number; month: number; year: number }) => void;
  onTimeChange: (time: { hours: number; minutes: number }) => void;
  onPhraseChange: (phrase: string) => void;
  onSubtitlesChange: (subs: { line1: string; line2: string; line3: string }) => void;
  onPhraseFontChange: (font: string) => void;
  onPhraseFontSizeChange: (size: number) => void;
  onSubtitleFontChange: (font: string) => void;
  onSubtitleFontSizeChange: (size: number) => void;
  onStarColorsChange: (colored: boolean) => void;
  onGridStyleChange: (style: 'hide' | 'flat' | 'spherical') => void;
}

const phraseCategories = [
  'category.birthday', 'category.relationship', 'category.wedding',
  'category.memorial', 'category.baby', 'category.business',
];

const phrasesMap: Record<string, string[]> = {
  'category.birthday': ['phrase.birthday.1', 'phrase.birthday.2', 'phrase.birthday.3'],
  'category.wedding': ['phrase.wedding.1', 'phrase.wedding.2', 'phrase.wedding.3'],
  'category.relationship': ['phrase.relationship.1', 'phrase.relationship.2', 'phrase.relationship.3'],
  'category.memorial': ['poster.moment_in_time'],
  'category.baby': ['poster.stars_of_your_birth'],
  'category.business': ['phrase.business.1', 'phrase.business.2', 'phrase.business.3'],
};

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const years = Array.from({ length: 100 }, (_, i) => 2026 - i);
const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);

export default function ControlPanel({
  locale, themeId, layers, selectedCity, date, time, phrase,
  subtitles, phraseFont, phraseFontSize, subtitleFont, subtitleFontSize, starColors, gridStyle,
  onThemeChange, onToggleLayer, onCityChange,
  onDateChange, onTimeChange, onPhraseChange, onSubtitlesChange,
  onPhraseFontChange, onPhraseFontSizeChange, onSubtitleFontChange, onSubtitleFontSizeChange, onStarColorsChange, onGridStyleChange,
}: ControlPanelProps) {
  const [cityQuery, setCityQuery] = useState('');
  const [showCityResults, setShowCityResults] = useState(false);
  const [fontPanelFor, setFontPanelFor] = useState<'phrase' | 'subtitle' | null>(null);

  // Check if input looks like coordinates
  const parsedCoords = useMemo(() => {
    if (!cityQuery.trim()) return null;
    return parseCoordinates(cityQuery);
  }, [cityQuery]);

  const cityResults = useMemo(() => {
    if (!cityQuery.trim() || parsedCoords) return [];
    return findCity(cityQuery, locale).slice(0, 8);
  }, [cityQuery, locale, parsedCoords]);

  const handleCitySelect = (city: City) => {
    onCityChange(city);
    setCityQuery('');
    setShowCityResults(false);
  };

  const handleCityInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && parsedCoords) {
      const customCity: City = {
        name: '',
        country: '',
        lat: parsedCoords.lat,
        lon: parsedCoords.lon,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      handleCitySelect(customCity);
    }
  };

  const handleCategoryClick = (categoryKey: string) => {
    const phrases = phrasesMap[categoryKey];
    if (phrases && phrases.length > 0) {
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      onPhraseChange(t(randomPhrase, locale));
    }
  };

  const showLabel = locale === 'ru' ? 'Показать' : 'Show';
  const hideLabel = locale === 'ru' ? 'Скрыть' : 'Hide';

  return (
    <div className="control-panel">
      {/* Theme selector */}
      <div className="panel-section">
        <div className="theme-selector">
          {['black', 'white', 'navy'].map(id => (
            <div
              key={id}
              className={`theme-circle theme-circle--${id} ${themeId === id ? 'theme-circle--active' : ''}`}
              onClick={() => onThemeChange(id)}
            >
              {themeId === id && <span className="theme-circle__check">✓</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Layer toggles */}
      <div className="panel-section">
        <div className="layer-toggles">
          {/* Stars: Colors / B&W */}
          <div
            className={`layer-toggle layer-toggle--active`}
            onClick={() => onStarColorsChange(!starColors)}
          >
            <div className="layer-toggle__icon">✨</div>
            <span className="layer-toggle__label">{locale === 'ru' ? 'Звёзды' : 'Stars'}</span>
            <span className="layer-toggle__status">{starColors ? (locale === 'ru' ? 'Цветные' : 'Colors') : (locale === 'ru' ? 'Ч/Б' : 'B&W')}</span>
          </div>
          {/* Meridians: Hide / Flat / 3D */}
          <div
            className={`layer-toggle ${gridStyle !== 'hide' ? 'layer-toggle--active' : ''}`}
            onClick={() => {
              const cycle: ('hide' | 'flat' | 'spherical')[] = ['hide', 'flat', 'spherical'];
              const idx = cycle.indexOf(gridStyle);
              onGridStyleChange(cycle[(idx + 1) % cycle.length]);
            }}
          >
            <div className="layer-toggle__icon">🌐</div>
            <span className="layer-toggle__label">{t('ui.meridians', locale)}</span>
            <span className="layer-toggle__status">
              {gridStyle === 'hide' ? (locale === 'ru' ? 'Скрыть' : 'Hide')
                : gridStyle === 'flat' ? 'Flat' : '3D'}
            </span>
          </div>
          <div className={`layer-toggle ${layers.constellationLines ? 'layer-toggle--active' : ''}`} onClick={() => onToggleLayer('constellationLines')}>
            <div className="layer-toggle__icon">╋</div>
            <span className="layer-toggle__label">{t('ui.constellations', locale)}</span>
            <span className="layer-toggle__status">{layers.constellationLines ? hideLabel : showLabel}</span>
          </div>
          <div className={`layer-toggle ${layers.constellationNames ? 'layer-toggle--active' : ''}`} onClick={() => onToggleLayer('constellationNames')}>
            <div className="layer-toggle__icon">Aa</div>
            <span className="layer-toggle__label">{t('ui.constellation_names', locale)}</span>
            <span className="layer-toggle__status">{layers.constellationNames ? hideLabel : showLabel}</span>
          </div>
          <div className={`layer-toggle ${layers.milkyWay ? 'layer-toggle--active' : ''}`} onClick={() => onToggleLayer('milkyWay')}>
            <div className="layer-toggle__icon">🌌</div>
            <span className="layer-toggle__label">{locale === 'ru' ? 'Млечный путь' : 'Milky Way'}</span>
            <span className="layer-toggle__status">{layers.milkyWay ? hideLabel : showLabel}</span>
          </div>
        </div>
      </div>

      {/* City + Date + Time */}
      <div className="panel-section">
        <div className="panel-section__title">{locale === 'ru' ? 'Введите данные о событии' : 'Enter event details'}</div>

        {/* City search */}
        <div className="city-search" style={{ marginBottom: 12 }}>
          <input
            className="input-field"
            placeholder={`${locale === 'ru' ? 'Город или координаты' : 'City or coordinates'}: ${getCityName(selectedCity, locale)}`}
            value={cityQuery}
            onChange={e => { setCityQuery(e.target.value); setShowCityResults(true); }}
            onFocus={() => setShowCityResults(true)}
            onBlur={() => setTimeout(() => setShowCityResults(false), 200)}
            onKeyDown={handleCityInputKeyDown}
          />
          {parsedCoords && (
            <div className="city-search__coord-hint">
              📍 {locale === 'ru' ? 'Координаты найдены — нажмите Enter' : 'Coordinates detected — press Enter'}
            </div>
          )}
          {showCityResults && cityResults.length > 0 && (
            <div className="city-search__results">
              {cityResults.map(city => (
                <div key={city.name + city.country} className="city-option" onMouseDown={() => handleCitySelect(city)}>
                  <span className="city-option__name">{getCityName(city, locale)}</span>
                  <span className="city-option__country">{city.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="select-row" style={{ marginBottom: 8 }}>
          <select className="select-field" value={date.day} onChange={e => onDateChange({ ...date, day: Number(e.target.value) })}>
            {days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="select-field" value={date.month} onChange={e => onDateChange({ ...date, month: Number(e.target.value) })}>
            {months.map(m => <option key={m} value={m}>{t(`month.${m}`, locale)}</option>)}
          </select>
          <select className="select-field" value={date.year} onChange={e => onDateChange({ ...date, year: Number(e.target.value) })}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Time */}
        <div className="select-row">
          <select className="select-field" value={time.hours} onChange={e => onTimeChange({ ...time, hours: Number(e.target.value) })}>
            {hours.map(h => <option key={h} value={h}>{String(h).padStart(2, '0')}</option>)}
          </select>
          <span style={{ color: '#757575' }}>:</span>
          <select className="select-field" value={time.minutes} onChange={e => onTimeChange({ ...time, minutes: Number(e.target.value) })}>
            {minutes.map(m => <option key={m} value={m}>{String(m).padStart(2, '0')}</option>)}
          </select>
        </div>
      </div>

      {/* Phrase */}
      <div className="panel-section">
        <div className="panel-section__title">
          <span>{locale === 'ru' ? 'Добавьте фразу' : 'Add a phrase'}</span>
          <button
            className={`text-settings-btn ${fontPanelFor === 'phrase' ? 'text-settings-btn--active' : ''}`}
            onClick={() => setFontPanelFor(prev => prev === 'phrase' ? null : 'phrase')}
            title={locale === 'ru' ? 'Настройки текста' : 'Text settings'}
          >
            <span className="material-symbols-outlined">text_fields</span>
          </button>
        </div>
        {fontPanelFor === 'phrase' && (
          <FontSelector
            selectedFont={phraseFont}
            selectedFontSize={phraseFontSize}
            onChange={onPhraseFontChange}
            onFontSizeChange={onPhraseFontSizeChange}
            locale={locale}
          />
        )}
        <textarea
          className="textarea-field"
          value={phrase}
          onChange={e => onPhraseChange(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: '#757575', marginBottom: 6 }}>
            {locale === 'ru' ? 'Или сгенерируйте её' : 'Or generate one'}
          </div>
          <div className="phrase-tags">
            {phraseCategories.map(key => (
              <button key={key} className="phrase-tag" onClick={() => handleCategoryClick(key)}>
                {t(key, locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtitles */}
      <div className="panel-section">
        <div className="panel-section__title">
          <span>{locale === 'ru' ? 'Текст можно отредактировать' : 'Editable text'}</span>
          <button
            className={`text-settings-btn ${fontPanelFor === 'subtitle' ? 'text-settings-btn--active' : ''}`}
            onClick={() => setFontPanelFor(prev => prev === 'subtitle' ? null : 'subtitle')}
            title={locale === 'ru' ? 'Настройки текста' : 'Text settings'}
          >
            <span className="material-symbols-outlined">text_fields</span>
          </button>
        </div>
        {fontPanelFor === 'subtitle' && (
          <FontSelector
            selectedFont={subtitleFont}
            selectedFontSize={subtitleFontSize}
            onChange={onSubtitleFontChange}
            onFontSizeChange={onSubtitleFontSizeChange}
            locale={locale}
          />
        )}
        <div className="subtitle-inputs">
          <input
            className="subtitle-input"
            value={subtitles.line1}
            onChange={e => onSubtitlesChange({ ...subtitles, line1: e.target.value })}
          />
          <input
            className="subtitle-input"
            value={subtitles.line2}
            onChange={e => onSubtitlesChange({ ...subtitles, line2: e.target.value })}
          />
          <input
            className="subtitle-input"
            value={subtitles.line3}
            onChange={e => onSubtitlesChange({ ...subtitles, line3: e.target.value })}
          />
        </div>


      </div>
    </div>
  );
}
