import React, { useEffect } from 'react';

/** 15 curated Google Fonts for poster text — each with a distinct character */
export const POSTER_FONTS = [
  { name: 'Cormorant Garamond', category: 'serif', weight: '400;500;600' },
  { name: 'Playfair Display', category: 'serif', weight: '400;500;700' },
  { name: 'Lora', category: 'serif', weight: '400;500;700' },
  { name: 'EB Garamond', category: 'serif', weight: '400;500;600' },
  { name: 'Libre Baskerville', category: 'serif', weight: '400;700' },
  { name: 'Spectral', category: 'serif', weight: '300;400;500' },
  { name: 'Crimson Text', category: 'serif', weight: '400;600;700' },
  { name: 'Merriweather', category: 'serif', weight: '300;400;700' },
  { name: 'Montserrat', category: 'sans-serif', weight: '300;400;600' },
  { name: 'Raleway', category: 'sans-serif', weight: '300;400;600' },
  { name: 'Oswald', category: 'sans-serif', weight: '300;400;500' },
  { name: 'Josefin Sans', category: 'sans-serif', weight: '300;400;600' },
  { name: 'Comfortaa', category: 'display', weight: '300;400;500' },
  { name: 'Caveat', category: 'handwriting', weight: '400;500;700' },
  { name: 'Parisienne', category: 'handwriting', weight: '400' },
];

/** Build Google Fonts CSS URL for all fonts */
function buildGoogleFontsUrl(): string {
  const families = POSTER_FONTS.map(f => {
    const name = f.name.replace(/ /g, '+');
    return `family=${name}:wght@${f.weight}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

/** Load all poster fonts on mount */
let fontsLoaded = false;
function loadAllFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = buildGoogleFontsUrl();
  document.head.appendChild(link);
}

interface FontSelectorProps {
  selectedFont: string;
  onChange: (fontName: string) => void;
  locale: string;
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

export default function FontSelector({ selectedFont, onChange, locale }: FontSelectorProps) {
  useEffect(() => { loadAllFonts(); }, []);

  const preview = PREVIEW_TEXT[locale] || PREVIEW_TEXT.en;

  return (
    <div className="panel-section">
      <div className="panel-section__title">
        {locale === 'ru' ? 'Шрифт' : 'Font'}
      </div>
      <div className="font-selector__list">
        {POSTER_FONTS.map(font => (
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
