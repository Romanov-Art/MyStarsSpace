# Affiliate Program

Referral links that pay affiliates for traffic they send to **our own site**.
A visitor who arrives via an affiliate link is attributed to that affiliate for
30 days; any poster generation in that window counts as a conversion.

## Affiliate link

```
https://YOUR-DOMAIN/?ref=CODE
```

`CODE` is the affiliate id (letters, digits, `-`, `_`, max 64 chars). Add an
affiliate by putting its code in the `AFFILIATES` env var (see below).

## How attribution works

1. **Capture** — on arrival with `?ref=CODE`, the code is stored in a
   first-party cookie (`aff_ref`, 30 days) **and** `localStorage`
   (`{ref, ts}`). A `click` event is sent once per session.
2. **Persistence** — the attribution survives navigation and return visits for
   30 days. **Last-click wins**: a newer `?ref=` overwrites and resets the
   30-day window.
3. **Conversion** — when the visitor generates (exports) a poster, the export
   beacon carries the stored `ref`, recording a conversion for that affiliate.

> **Safari note:** Safari ITP caps JS-set cookies at 7 days, so the
> `localStorage` mirror is what actually holds the full 30-day window on read.
> If you later need the cookie itself to survive 30 days in Safari, set it
> server-side via an `nginx` `add_header Set-Cookie` on the HTML response
> (same first-party domain). Not required for attribution to work today.

## Reporting

```bash
curl "https://YOUR-DOMAIN/api/affiliate-report?month=2026-07" \
  -H "Authorization: Bearer $TRACK_ADMIN_TOKEN"
# → {"month":"2026-07","affiliates":[
#      {"ref":"blogger","clicks":42,"conversions":7,"flagged":0}]}
```

- `clicks` — referral visits (counted, deduped per session/IP-day)
- `conversions` — billable generations attributed to the affiliate
- `flagged` — events that hit the per-IP daily cap (excluded — see fraud)

**Commission** = your rate × `conversions`, computed on top of this report.
The service tracks counts; it does not store commission rates or money.

## Anti-fraud

The same layers that protect partner billing protect affiliate commissions:

- nginx per-IP rate limit on `/api/`; app per-IP rate limit (30/min).
- Daily per-IP caps per affiliate (10 conversions / 50 clicks per day): excess
  is stored as `flagged` and never paid. This stops an affiliate from
  self-generating conversions from one machine to inflate commission.
- `AFFILIATES` allowlist: events for unknown `ref` codes are rejected (403),
  so nobody can seed the table with arbitrary codes.
- IPs are stored only as HMAC hashes — no PII.

> A third party spamming conversions for someone else's `ref` would *increase*
> that affiliate's payout, not harm them; the per-IP cap bounds the cost, and
> the `flagged` column surfaces abnormal volume for review before payout.

## Config

Set in the environment (see [docker-compose.yml](../docker-compose.yml)):

| Var | Purpose |
|-----|---------|
| `TRACK_AFFILIATES` | comma-separated affiliate allowlist, e.g. `blogger,promo1` |
| `TRACK_ADMIN_TOKEN` | Bearer token for the report endpoints |
| `TRACK_ALLOWED_ORIGINS` | your site origin(s), so beacons must come from you |

Client logic: [affiliate.ts](../src/services/affiliate.ts) ·
beacons: [partnerTracking.ts](../src/services/partnerTracking.ts) ·
service: [server/index.mjs](../server/index.mjs).
Partner (whitelabel) billing is documented separately in
[PARTNER_EMBED.md](PARTNER_EMBED.md).
