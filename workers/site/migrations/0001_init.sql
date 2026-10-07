-- Schema ported 1:1 from server/index.mjs (libSQL) to D1.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner TEXT NOT NULL DEFAULT '',
  ref TEXT NOT NULL DEFAULT '',
  event TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_partner_day ON events(partner, day);
CREATE INDEX IF NOT EXISTS idx_events_ref_day ON events(ref, day);
CREATE INDEX IF NOT EXISTS idx_events_dedupe ON events(partner, ref, event, ip_hash, day, status);

CREATE TABLE IF NOT EXISTS credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  partner TEXT NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_credits_partner ON credits(partner);
