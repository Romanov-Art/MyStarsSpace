# Prepaid Generation Credits — Design

**Date:** 2026-07-16
**Status:** Approved by user ("Делаем"), replacing the earlier cabinets/portal
direction, which was explicitly deemed over-engineered and shelved.

## Goal

Partners prepay for generations. The partner transfers money to the admin
off-system; the admin tops up a per-partner generation counter with one
command. When the counter is exhausted, the partner's embed stops exporting
until the next top-up. No cabinets, no auth system, no portal.

## What stays unchanged

- shopid = `?partner=id` + static template JSON in
  `public/templates/partners/{id}.json` (colors, markup, currency).
- Event counting, anti-fraud caps/flagging, affiliate program, monthly report.

## Design

### 1. Credits journal (track service, same LibSQL)

```sql
CREATE TABLE credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner TEXT NOT NULL,
  amount INTEGER NOT NULL,          -- may be negative (admin correction)
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Append-only. The remaining balance is **never stored or decremented** — it is
derived: `remaining = SUM(credits.amount) − COUNT(all-time counted exports)`.
Nothing can desynchronize; no race conditions on the hot path.

### 2. API

- `POST /api/credits` (Bearer ADMIN_TOKEN):
  `{partner, amount, note?}` → inserts a journal row, returns
  `{partner, remaining}`. `amount` is a non-zero integer, |amount| ≤ 1,000,000;
  negative values are corrections.
- `GET /api/status?partner=id` (public, `Cache-Control: max-age=60`):
  `{blocked: boolean}` only — the remaining count is not exposed publicly.
  **Strict prepaid:** a partner with no credits rows at all is `blocked`.
  Trial = admin grants a small top-up.
- `GET /api/report` gains a `remaining` field per partner, and now also lists
  partners that have credits but no events in the requested month.

### 3. Client (partner embeds only)

On load, when `?partner=` is present, fetch `/api/status?partner=id`:

- `blocked: true` → the Order/export button is disabled with a localized
  "temporarily unavailable" message.
- Fetch failure or malformed response → **fail-open** (button stays active):
  an outage of the status endpoint must not halt partner sales; exports are
  still counted, so economics are preserved.

DevTools bypass of the disabled button is accepted: events are still counted,
negative remaining is visible in the report, and new credits only come after
payment.

### 4. Admin workflow

```bash
# partner paid → top up
curl -X POST https://DOMAIN/api/credits \
  -H "Authorization: Bearer $TRACK_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"partner":"demo","amount":100,"note":"перевод 16.07"}'

# check balances
curl "https://DOMAIN/api/report?month=2026-07" -H "Authorization: Bearer $TRACK_ADMIN_TOKEN"
```

## Error handling

- POST: 401 without token, 400 for bad partner format / zero / non-integer /
  oversized amount.
- GET status: 400 for bad partner format; unknown partner → `{blocked: true}`.
- Client treats any non-2xx/parse failure as not blocked (fail-open).

## Testing

- curl integration: top-up → status flips to unblocked; exports exhaust
  credits → status flips to blocked; negative correction; report `remaining`;
  auth failures.
- Browser: partner with no credits shows disabled button; after top-up and
  reload the button works; plain site (no partner) unaffected.
- Full vitest suite + build stay green.

## Out of scope (explicitly shelved)

Personal cabinets (partner/affiliate/client/admin), magic-link auth, portal
subdomain/container, DB-backed templates, ledger transactions, payout
requests, online payments. Revisit when partner count makes manual ops
painful.
