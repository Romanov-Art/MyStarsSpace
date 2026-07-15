# Partner Templates — Design

**Date:** 2026-07-15
**Status:** Approved (user requested autonomous execution: "не усложняй, максимально стабильный и простой вариант, доведи до результата")

## Goal

Let partner sites embed the star-map constructor with their own branding, driven by
the existing JSON template system, with zero backend and minimal moving parts.

## Current state

- `?template=name` loads `/templates/{name}.json` (keys: `bg`, `text`, `accent`,
  `panel`, `radius`, `locale`, `theme`, `currency`, `dateFormat`, `timeFormat`,
  `units`, `fullMonthName`). URL params override template values.
- `?partner=xxx` only renders a badge in `SettingsBar`; it is not connected to
  templates.
- Template loading, merging, and validation live inline in `App.tsx`.
- All visitors share one `localStorage` key (`starmap-settings`), so partner
  embeds inherit state from the main site and from each other.

## Design

### 1. One JSON file per partner (chosen approach)

`public/templates/partners/{partnerId}.json`, same schema as existing templates.

Resolution order for the template URL:

1. Explicit `?template=name` → `/templates/{name}.json` (explicit beats implicit).
2. Else `?partner=id` → `/templates/partners/{id}.json`.
3. Else no template fetch.

URL params continue to override template values (existing rule, unchanged).

**Rejected alternatives:**
- Single `partners.json` manifest — every partner change redeploys one growing
  file; a malformed edit breaks all partners at once.
- Backend/API config service — unnecessary infrastructure at this stage.

### 2. localStorage isolation per partner

When `?partner=id` is present, the settings key becomes
`starmap-settings:{id}`. Main-site visitors keep `starmap-settings`. Partner
embeds no longer inherit main-site state or each other's state.

### 3. Stability rules

- Partner/template ids are sanitized to `^[a-zA-Z0-9_-]{1,64}$`; anything else
  is treated as absent (no fetch, no bad path).
- Template values are validated before applying: `locale` against
  `AVAILABLE_LOCALES`, `currency` against `CURRENCIES`, `units` against
  `cm|inch`, `dateFormat` against `DD.MM.YYYY|MM/DD/YYYY`, `timeFormat`
  against `24h|12h`. Invalid values are dropped, valid ones still apply.
- Any fetch/parse failure → app renders with defaults (current behavior kept).

### 4. Code structure

New pure module `src/core/embedConfig.ts`:

- `sanitizeId(raw)` → valid id or `null`
- `resolveTemplateUrl(params)` → template URL or `null` (implements the
  resolution order)
- `settingsStorageKey(params)` → `starmap-settings` or `starmap-settings:{id}`
- `sanitizeTemplate(tpl, overrides)` → merged, validated config object

`App.tsx` calls these instead of holding the logic inline. The module has no
React/DOM dependencies, so it is unit-testable with the existing vitest setup
(`src/core/__tests__/embedConfig.test.ts`).

### 5. Partner onboarding artifacts

- `public/templates/partners/demo.json` — working example.
- `docs/PARTNER_EMBED.md` — how to add a partner: create the JSON, deploy,
  give the partner an iframe snippet
  (`<iframe src="https://…/?partner=demo">`), list of supported keys and
  override params.

## Data flow

```
URL (?partner, ?template, overrides)
  → embedConfig.resolveTemplateUrl → fetch JSON (or skip)
  → embedConfig.sanitizeTemplate(tpl, urlOverrides)
  → App applies: CSS vars, theme, locale, currency, units, formats
localStorage: embedConfig.settingsStorageKey(URL) namespaces persistence
```

## Error handling

- Unknown partner id / 404 / invalid JSON / non-object JSON → silently fall
  back to defaults; the constructor always renders.
- Junk values inside a template never reach state setters (validated merge).

## Testing

- Unit tests for all four `embedConfig` functions, including: traversal
  attempts (`../x`), empty/oversized ids, template-vs-partner precedence,
  URL-param override precedence, invalid locale/currency/units dropped.
- Full suite (`npm test`) and `npm run build` must pass.
- Manual browser check: `?partner=demo` applies branding; `?partner=../../etc`
  renders defaults.

## Out of scope

- Life-situation poster template gallery (strategy docs) — separate feature.
- Per-partner pricing, revenue share, analytics.
- Backend-managed partner configs, template editor UI.
