import React, { useMemo } from 'react';
import { t, type Locale } from '../i18n/index.js';
import fontsConfig from '../config/fonts.json';

/** Font entry from the JSON config */
export interface PosterFont {
  name: string;
  category: string;
  weight: string;
  locales: string[];
}

/** All fonts from config */
export const POSTER_FONTS: PosterFont[] = fontsConfig.fonts;

/** Get fonts filtered for a specific locale */
export function getFontsForLocale(locale: string): PosterFont[] {
  const filtered = POSTER_FONTS.filter(f => f.locales.includes(locale));
  // Fallback: if no fonts match the locale, return all fonts (latin subset)
  return filtered.length > 0 ? filtered : POSTER_FONTS;
}

/** Get the default font for a locale */
export function getDefaultFontForLocale(locale: string): string {
  const defaults = fontsConfig.localeDefaults as Record<string, string>;
  return defaults[locale] || fontsConfig.defaultFont;
}

/** Preset font sizes */
export const FONT_SIZE_PRESETS = [
  { label: 'S', value: 12 },
  { label: 'M', value: 16 },
  { label: 'L', value: 20 },
  { label: 'XL', value: 24 },
  { label: 'XXL', value: 30 },
];

export const SUBTITLE_SIZE_PRESETS = [
  { label: 'S', value: 8 },
  { label: 'M', value: 10 },
  { label: 'L', value: 12 },
  { label: 'XL', value: 16 },
  { label: 'XXL', value: 20 },
];

export const BODY_SIZE_PRESETS = [
  { label: 'S', value: 5 },
  { label: 'M', value: 8 },
  { label: 'L', value: 10 },
  { label: 'XL', value: 12 },
  { label: 'XXL', value: 16 },
];

// All fonts are loaded locally from /fonts/ via CSS @import in index.css.
// No dynamic CDN loading needed — fonts are always available for both CSS and Canvas.

interface FontSelectorProps {
  selectedFont: string;
  selectedFontSize: number;
  onChange: (fontName: string) => void;
  onFontSizeChange: (size: number) => void;
  locale: Locale;
  sizePresets?: { label: string; value: number }[];
}

const PREVIEW_TEXT: Record<string, string> = {
  ru: 'Под этим небом',
  en: 'Under This Sky',
  de: 'Unter diesem Himmel',
  fr: 'Sous ce ciel',
  es: 'Bajo este cielo',
  it: 'Sotto questo cielo',
  pt: 'Sob este céu',
  ja: 'この空の下で',
  ko: '이 하늘 아래',
  zh: '在这片天空下',
  ar: 'تحت هذه السماء',
  tr: 'Bu gökyüzünün altında',
};

export default function FontSelector({ selectedFont, selectedFontSize, onChange, onFontSizeChange, locale, sizePresets }: FontSelectorProps) {
  // Filter fonts by locale — only show fonts that support the current script
  const availableFonts = useMemo(() => getFontsForLocale(locale), [locale]);

  const preview = PREVIEW_TEXT[locale] || PREVIEW_TEXT.en;
  const presets = sizePresets || FONT_SIZE_PRESETS;

  return (
    <div className="panel-section" style={{ marginBottom: 16 }}>
      <div className="panel-section__title">
        {t('ui.font', locale)}
      </div>

      {/* Font Size Selector */}
      <div className="font-size-selector">
        <span className="font-size-selector__label">
          {t('ui.size', locale)}
        </span>
        <div className="font-size-selector__buttons">
          {presets.map(preset => (
            <button
              key={preset.value}
              className={`font-size-btn ${selectedFontSize === preset.value ? 'font-size-btn--active' : ''}`}
              onClick={() => onFontSizeChange(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Font Family Selector */}
      <div className="font-selector__list">
        {availableFonts.map(font => (
          <button
            key={font.name}
            className={`font-selector__item ${selectedFont === font.name ? 'font-selector__item--active' : ''}`}
            onClick={() => onChange(font.name)}
          >
            <span
              className="font-selector__preview"
              style={{ fontFamily: `"${font.name}", ${font.category}` }}
            >
              {preview}
            </span>
            <span className="font-selector__name">{font.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
