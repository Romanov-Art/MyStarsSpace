import React, { useState, useRef, useEffect } from 'react';
import { type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from '../i18n/index.js';

interface LanguageSelectorProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}

export default function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="lang-selector" ref={ref}>
      <button className="lang-selector__btn" onClick={() => setOpen(!open)}>
        🌐 {LOCALE_NAMES[locale]} ▾
      </button>
      {open && (
        <div className="lang-selector__dropdown">
          {AVAILABLE_LOCALES.map(loc => (
            <div
              key={loc}
              className={`lang-option ${loc === locale ? 'lang-option--active' : ''}`}
              onClick={() => { onChange(loc); setOpen(false); }}
            >
              <span>{LOCALE_NAMES[loc]}</span>
              <span style={{ opacity: 0.5, fontSize: 11 }}>{loc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
