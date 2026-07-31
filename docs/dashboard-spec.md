# Management Dashboard — Specification

Single Next.js app (`dashboard/`), deployed as one container on the PaaS host at
`ops.<domain>`. SQLite for state. Auth: single-user login + optional TOTP; Caddy adds an
IP allowlist in front.

## Modules

### 1. Application Registry
Source of truth = `applications` table, seeded from `infra/docker-compose.yml` labels.
- List apps: name, domain, repo, container status (live from Docker API), current image tag,
  last deploy time/actor, health (from latest `health_checks` row).
- CRUD for registering a new app (writes DB row; compose changes stay manual/via skill).

### 2. Deployment Manager
- **Trigger deploy**: POST `/api/apps/:id/deploy` → GitHub `workflow_dispatch` on the app's
  repo (`ref` = branch). Inserts `deployments` row with status `queued`.
- **Status updates**: the CI workflow's last step POSTs `/api/hooks/deployment`
  (HMAC-signed) with `{app, sha, image_tag, status, started_at, finished_at}`.
- **Rollback**: POST `/api/apps/:id/rollback` with a previous deployment id → dispatches the
  workflow with `image_tag` input so CI just re-points compose to the old tag (no rebuild).
- **Start/stop/restart**: POST `/api/apps/:id/(start|stop|restart)` → Docker API via socket
  proxy. Record in `audit_log`.
- **History**: GET `/api/apps/:id/deployments` (paginated).

### 3. Monitoring Service
- In-process scheduler (node-cron) every 60 s:
  - HTTP GET each app's `health_url` → status code + latency → `health_checks` row.
  - Docker `stats` snapshot per container → `container_metrics` row (CPU %, mem MB).
  - Host: read `/proc/meminfo`, `/proc/stat`, `statvfs` (mounted read-only) → `host_metrics`.
- Retention: raw rows 7 days; hourly rollups 90 days (nightly compaction job).
- UI: uptime % (24h/7d/30d), latency sparkline, error count, request count (parsed from
  Caddy access log JSON), per-container CPU/RAM, host CPU/RAM/disk/network gauges.
- Alerts (Phase 4): if 3 consecutive health checks fail → email via SES sandbox (free) or
  Telegram bot message.

### 4. Log Viewer
- GET `/api/apps/:id/logs?since=&grep=&level=` → Docker API `container logs` (tail, follow
  via SSE for live mode).
- Deployment logs: link out to the GitHub Actions run URL stored on the `deployments` row
  (don't mirror CI logs — GitHub already stores them).
- Error extraction: simple level filter (`error|warn`) client-side + server grep.
- Caddy access logs (JSON) mounted read-only for request/error counts.

### 5. Cost Dashboard
- Daily job calls Cost Explorer `GetCostAndUsage` (granularity DAILY, group by SERVICE),
  caches into `cost_snapshots`. **Never call CE per page view — $0.01/request.**
- UI: month-to-date total, forecast (linear), per-service breakdown, 6-month trend.
- EC2/EBS/EIP shown from `DescribeInstances` + static price table as a sanity check.

### 6. AWS Overview
- `DescribeInstances` (cached 5 min): instance state, type, AZ, public IP.
- Container grid from Docker API. Disk from host metrics. All read-only.

### 7. Auth
- `users` table (one row). Login → argon2 verify → httpOnly session cookie (iron-session).
- Optional TOTP (otplib). All mutating routes: session + CSRF. `/api/hooks/*`: HMAC
  signature with shared secret instead of session.
- Every mutation writes `audit_log`.

## API surface (summary)

```
POST /api/auth/login | /logout
GET  /api/apps                         list + live status
GET  /api/apps/:id                     detail
POST /api/apps/:id/deploy|restart|start|stop|rollback
GET  /api/apps/:id/deployments
GET  /api/apps/:id/logs                (?follow=1 → SSE)
GET  /api/metrics/host?range=24h
GET  /api/metrics/containers?range=24h
GET  /api/health/:id?range=7d
GET  /api/aws/overview
GET  /api/aws/costs?months=6
POST /api/hooks/deployment             (HMAC, called by CI)
```

## Build order (maps to roadmap Phase 3)
1. Auth + app registry (read-only status from Docker API) — the useful core.
2. Log viewer.
3. Health checks + metrics collection + charts.
4. Deploy trigger + webhook + history + rollback.
5. Cost module + AWS overview.
