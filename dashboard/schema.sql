-- Management Dashboard schema (SQLite)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,             -- argon2id
  totp_secret   TEXT,                      -- null = 2FA disabled
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE applications (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,     -- compose service name, e.g. 'lanka-news'
  display_name   TEXT NOT NULL,
  repo           TEXT NOT NULL,            -- 'owner/repo'
  domain         TEXT NOT NULL,
  container_name TEXT NOT NULL,            -- e.g. 'paas-lanka-news'
  image          TEXT NOT NULL,            -- 'ghcr.io/owner/lanka-news'
  internal_port  INTEGER NOT NULL,
  health_url     TEXT NOT NULL,            -- 'http://lanka-news:3001/health'
  enabled        INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE deployments (
  id           INTEGER PRIMARY KEY,
  app_id       INTEGER NOT NULL REFERENCES applications(id),
  git_sha      TEXT,
  image_tag    TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('queued','building','deploying','success','failed','rolled_back')),
  trigger      TEXT NOT NULL CHECK (trigger IN ('push','manual','rollback')),
  triggered_by TEXT,                       -- 'github:<actor>' or 'dashboard'
  ci_run_url   TEXT,
  started_at   TEXT,
  finished_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_deployments_app ON deployments(app_id, created_at DESC);

CREATE TABLE health_checks (
  id         INTEGER PRIMARY KEY,
  app_id     INTEGER NOT NULL REFERENCES applications(id),
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  status     TEXT NOT NULL CHECK (status IN ('up','down','degraded')),
  http_code  INTEGER,
  latency_ms INTEGER
);
CREATE INDEX idx_health_app_time ON health_checks(app_id, checked_at DESC);

CREATE TABLE container_metrics (
  id           INTEGER PRIMARY KEY,
  app_id       INTEGER NOT NULL REFERENCES applications(id),
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  cpu_pct      REAL,
  mem_mb       REAL,
  net_rx_kb    REAL,
  net_tx_kb    REAL,
  state        TEXT                        -- running/exited/restarting
);
CREATE INDEX idx_cmetrics_app_time ON container_metrics(app_id, collected_at DESC);

CREATE TABLE host_metrics (
  id           INTEGER PRIMARY KEY,
  collected_at TEXT NOT NULL DEFAULT (datetime('now')),
  cpu_pct      REAL,
  mem_used_mb  REAL,
  mem_total_mb REAL,
  disk_used_gb REAL,
  disk_total_gb REAL,
  net_rx_kb    REAL,
  net_tx_kb    REAL
);
CREATE INDEX idx_hmetrics_time ON host_metrics(collected_at DESC);

-- hourly rollups written by nightly compaction; raw rows >7d deleted
CREATE TABLE metric_rollups (
  id         INTEGER PRIMARY KEY,
  scope      TEXT NOT NULL,                -- 'host' or app name
  metric     TEXT NOT NULL,                -- 'cpu_pct','mem_mb','latency_ms','uptime_pct',...
  hour       TEXT NOT NULL,                -- '2026-07-31T13:00'
  avg_value  REAL, max_value REAL, min_value REAL,
  UNIQUE (scope, metric, hour)
);

CREATE TABLE cost_snapshots (
  id         INTEGER PRIMARY KEY,
  day        TEXT NOT NULL,                -- '2026-07-31'
  service    TEXT NOT NULL,                -- 'Amazon EC2', 'Amazon S3', ...
  amount_usd REAL NOT NULL,
  UNIQUE (day, service)
);

CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY,
  at         TEXT NOT NULL DEFAULT (datetime('now')),
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,                -- 'deploy','restart','stop','rollback','login',...
  app_id     INTEGER REFERENCES applications(id),
  detail     TEXT                          -- JSON blob
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                      -- github_pat ref, webhook secret hash, alert config
);
