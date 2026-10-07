-- "Edit in Canva": per-browser Canva OAuth sessions and in-flight OAuth flows.
-- Session ids and OAuth states are stored only as SHA-256 hashes; Canva
-- tokens are AES-GCM encrypted with the CANVA_TOKEN_KEY secret.
CREATE TABLE IF NOT EXISTS canva_sessions (
  sid_hash TEXT PRIMARY KEY,
  tokens TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS canva_oauth_states (
  state_hash TEXT PRIMARY KEY,
  verifier TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_canva_oauth_states_created ON canva_oauth_states(created_at);
