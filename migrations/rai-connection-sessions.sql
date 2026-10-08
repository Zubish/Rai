-- Apply to Rai's database, never the RxLedger operational database.
CREATE TABLE IF NOT EXISTS rai_connection_sessions (
  kind TEXT NOT NULL CHECK (kind IN ('login', 'session')),
  token_hash TEXT NOT NULL,
  payload TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (kind, token_hash)
);
CREATE INDEX IF NOT EXISTS rai_connection_sessions_expiry ON rai_connection_sessions (expires_at);
CREATE TABLE IF NOT EXISTS rai_connection_rate_limits (
  key_hash TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);
