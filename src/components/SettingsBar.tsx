import React, { useState, useRef, useEffect } from 'react';
import { type Locale, LOCALE_NAMES, AVAILABLE_LOCALES } from '../i18n/index.js';
import { CURRENCIES, type CurrencyInfo } from '../config/currencies.js';

/* ── Language Selector ────────────────────────────────────── */

interface LanguageSelectorProps {
  locale: Locale;
  onChange: (locale: Locale) => void;
}


export function LanguageSelector({ locale, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="settings-selector" ref={ref}>
      <button className="settings-selector__btn" onClick={() => setOpen(!open)}>
        <span className="settings-selector__icon">🌐</span>
        <span className="settings-selector__code">{locale.toUpperCase()}:</span>
        <span className="settings-selector__name">{LOCALE_NAMES[locale]}</span>
        <span className="settings-selector__arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="settings-selector__dropdown">
          {AVAILABLE_LOCALES.map(loc => (
            <div
              key={loc}
              className={`settings-option ${loc === locale ? 'settings-option--active' : ''}`}
              onClick={() => { onChange(loc); setOpen(false); }}
            >
              <span className="settings-option__code">{loc.toUpperCase()}:</span>
              <span className="settings-option__name">{LOCALE_NAMES[loc]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Currency Selector ────────────────────────────────────── */

interface CurrencySelectorProps {
  currency: string;
  onChange: (code: string) => void;
}

export function CurrencySelector({ currency, onChange }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const current = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const filtered = search
    ? CURRENCIES.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.includes(search)
      )
    : CURRENCIES;

  return (
    <div className="settings-selector" ref={ref}>
      <button className="settings-selector__btn" onClick={() => setOpen(!open)}>
        <span className="currency-badge" style={{ background: current.color }}>{current.symbol}</span>
        <span className="settings-selector__code">{current.code}:</span>
        <span className="settings-selector__name">{current.name}</span>
        <span className="settings-selector__arrow">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="settings-selector__dropdown settings-selector__dropdown--currency">
          <div className="settings-selector__search">
            <input
              ref={searchRef}
              type="text"
              placeholder="🔍 Search currency..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="settings-selector__scroll">
            {filtered.map(cur => (
              <div
                key={cur.code}
                className={`settings-option ${cur.code === currency ? 'settings-option--active' : ''}`}
                onClick={() => { onChange(cur.code); setOpen(false); setSearch(''); }}
              >
                <span className="currency-badge" style={{ background: cur.color }}>{cur.symbol}</span>
                <span className="settings-option__code">{cur.code}:</span>
                <span className="settings-option__name">{cur.name}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="settings-option settings-option--empty">No results</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings Bar (combines both) ─────────────────────────── */

interface SettingsBarProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  currency: string;
  onCurrencyChange: (code: string) => void;
  partnerId?: string;
}

export default function SettingsBar({ locale, onLocaleChange, currency, onCurrencyChange, partnerId }: SettingsBarProps) {
  return (
    <div className="settings-bar">
      <div className="settings-bar__selectors">
        <LanguageSelector locale={locale} onChange={onLocaleChange} />
        <div className="settings-bar__divider" />
        <CurrencySelector currency={currency} onChange={onCurrencyChange} />
      </div>
      {partnerId && (
        <div className="settings-bar__partner" title={`Partner: ${partnerId}`}>
          <span className="settings-bar__partner-dot" />
        </div>
      )}
    </div>
  );
}
