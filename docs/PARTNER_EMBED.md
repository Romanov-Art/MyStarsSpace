# Partner Embed Guide

How to put the star-map constructor on a partner site with the partner's own
branding. No backend, no build changes — one JSON file per partner.

## Onboard a partner (2 steps)

**1. Create the partner template**

Add `public/templates/partners/{partnerId}.json` and deploy. The `partnerId`
may contain only letters, digits, `-`, `_` (max 64 chars).

```json
{
  "bg": "0f1b2d",
  "text": "f0f4f8",
  "accent": "4da3ff",
  "panel": "16283f",
  "radius": "10",
  "locale": "en",
  "theme": "black",
  "currency": "USD",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h",
  "units": "inch",
  "fullMonthName": false
}
```

All keys are optional — set only what differs from the defaults.

**2. Give the partner the embed snippet**

```html
<iframe
  src="https://YOUR-DOMAIN/?partner=demo"
  style="width: 100%; height: 900px; border: 0;"
  loading="lazy"
  title="Star map constructor">
</iframe>
```

A plain link (`https://YOUR-DOMAIN/?partner=demo`) works the same way.

## Supported template keys

| Key | Meaning | Values |
|-----|---------|--------|
| `bg` | Page background | hex without `#` |
| `text` | UI text color | hex without `#` |
| `accent` | Accent/CTA color | hex without `#` |
| `panel` | Panel background | hex without `#` |
| `radius` | UI corner radius | number (px) |
| `locale` | Interface language | any of the 41 supported locales (`en`, `ru`, `de`, …) |
| `theme` | Default poster theme | theme id (e.g. `black`) |
| `currency` | Price currency | ISO code from the supported list (`USD`, `EUR`, `RUB`, …) |
| `dateFormat` | Poster date format | `DD.MM.YYYY` or `MM/DD/YYYY` |
| `timeFormat` | Poster time format | `24h` or `12h` |
| `units` | Size units | `cm` or `inch` |
| `fullMonthName` | Spell out month | `true` / `false` |
| `markup` | Partner markup in USD, added on top of the base price | number ≥ 0 (capped at 500) |

## Pricing rules

- The displayed price in a partner embed is `max(base price, $5) + markup` —
  **$5 is the hard minimum**; no partner configuration can go below it.
- `markup` can only be set in the deployed template JSON. It is deliberately
  **not** overridable via URL params, so end users can't strip the markup.
- Invalid markup (negative, non-numeric, > 500) is dropped → base price applies.

## How resolution works

1. `?template=name` (explicit) loads `/templates/{name}.json` — wins over partner.
2. Otherwise `?partner=id` loads `/templates/partners/{id}.json`.
3. Individual URL params override template values, e.g.
   `/?partner=demo&accent=ff5500&locale=de`.

## Guarantees

- Invalid partner id, missing file, or broken JSON → the constructor still
  renders with default settings. A partner can never break the app.
- Invalid values inside a template (unknown locale/currency/format) are
  dropped individually; the rest of the template still applies.
- Each partner gets an isolated `localStorage` namespace
  (`starmap-settings:{partnerId}`), so visitor settings never leak between
  the main site and partner embeds.

## Prepaid credits (billing model)

Partners **prepay for generations**. The partner transfers money off-system;
the admin tops up their credit counter:

```bash
curl -X POST https://YOUR-DOMAIN/api/credits \
  -H "Authorization: Bearer $TRACK_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"partner":"demo","amount":100,"note":"transfer 2026-07-16"}'
# → {"partner":"demo","remaining":103}
```

Rules:

- `remaining = SUM(top-ups) − all-time counted exports`. It is derived, never
  stored — nothing can desynchronize.
- **Strict prepaid**: a partner with no top-ups at all is blocked. A trial is
  just a small grant (`amount: 10`).
- When `remaining ≤ 0`, `GET /api/status?partner=id` (public, cached 60s)
  returns `{"blocked": true}` and the embed disables its Order button with a
  localized message. Unblocking after a top-up propagates within ~1 minute.
- Negative `amount` is an admin correction.
- The status endpoint exposes only the boolean; the count is visible in the
  admin report (`remaining` per partner).
- The embed **fails open**: if the status endpoint is unreachable, ordering
  stays enabled (an outage must not halt partner sales; exports are still
  counted).

## Generation tracking & billing

Every partner embed reports two events to the `track` microservice
([server/](../server/index.mjs), LibSQL storage): `view` (once per browser
session) and `export` (each successful poster generation). Billing is based on
**counted** `export` events.

Monthly report:

```bash
curl "https://YOUR-DOMAIN/api/report?month=2026-07" \
  -H "Authorization: Bearer $TRACK_ADMIN_TOKEN"
# → {"month":"2026-07","partners":[{"partner":"demo","exports":10,"views":1,"flagged":3}]}
```

Anti-fraud layers (competitor spam / fake API requests never reach the bill):

1. nginx: 10 req/s per IP on `/api/` (first DDoS layer; put a CDN/WAF like
   Cloudflare in front for volumetric attacks).
2. App: per-IP rate limit (30 req/min), strict schema, 512-byte body cap.
3. `ALLOWED_ORIGINS`: browser beacons must come from your domain.
4. `PARTNERS` allowlist: events for unknown partner ids are rejected.
5. Daily per-IP caps (10 exports / 50 views per partner per day): anything
   above is stored as `flagged` and excluded from billing.
6. IPs are stored only as HMAC hashes (`IP_HASH_SECRET`) — no PII.

Deploy config: set `TRACK_ADMIN_TOKEN`, `TRACK_IP_HASH_SECRET`,
`TRACK_ALLOWED_ORIGINS`, `TRACK_PARTNERS` in the environment
(see [docker-compose.yml](../docker-compose.yml)). To use a remote
libsql/Turso instance instead of the local file, set `LIBSQL_URL` and
`LIBSQL_AUTH_TOKEN`.

Logic lives in [embedConfig.ts](../src/core/embedConfig.ts), tests in
[embedConfig.test.ts](../src/core/__tests__/embedConfig.test.ts); beacons in
[partnerTracking.ts](../src/services/partnerTracking.ts).
