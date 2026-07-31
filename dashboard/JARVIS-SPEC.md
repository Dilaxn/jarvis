# J.A.R.V.I.S — Dashboard Build Spec

> **Just A Rather Very Intelligent System**
> Personal PaaS management UI — runs as a container on the EC2 box alongside all managed apps.

---

## Goal

One Next.js app that lets you see and control everything on the server from a browser:
container status, logs, deploys, health, metrics, and AWS costs.

Deploy this dashboard **first**. Then add other apps one by one through it.

---

## Tech Stack

| Layer      | Choice                                   |
|------------|------------------------------------------|
| Framework  | Next.js 15 (App Router)                  |
| UI         | Tailwind CSS + shadcn/ui                 |
| Charts     | Recharts                                 |
| Database   | SQLite via better-sqlite3                |
| Auth       | iron-session + argon2                    |
| Docker API | dockerode (via socket proxy)             |
| AWS SDK    | @aws-sdk/client-cost-explorer + cloudwatch |
| Scheduler  | node-cron (in-process, health checks)    |

---

## Build Milestones (in order)

### Milestone 1 — Shell + Auth + App Registry ← START HERE

**What you get:** Login screen, sidebar, app cards showing live container status.

Pages & components:
- `/login` — username + password form
- `/` (dashboard home) — app grid cards
- `/apps/[id]` — single app detail page (stub)

API routes:
- `POST /api/auth/login` — argon2 verify → set iron-session cookie
- `POST /api/auth/logout`
- `GET  /api/apps` — list apps from DB + live Docker status via socket proxy
- `GET  /api/healthz` — used by Docker healthcheck

DB tables used: `users`, `applications`

Docker integration: `dockerode` connects to `tcp://socket-proxy:2375`, calls
`listContainers()` to get state, CPU%, mem for each `paas-*` container.

Seed script: `scripts/seed.ts` — creates admin user (password from env), inserts
the 6 apps (dashboard + 5 Node apps) into `applications` table.

---

### Milestone 2 — Log Viewer

**What you get:** Tail and search container logs from the browser.

Pages:
- `/apps/[id]/logs` — log output panel with grep filter + level filter

API routes:
- `GET /api/apps/[id]/logs?tail=200&grep=error` — Docker API container logs
- `GET /api/apps/[id]/logs?follow=1` — SSE stream for live tail

---

### Milestone 3 — Health Checks + Metrics + Charts

**What you get:** Uptime %, latency sparklines, host CPU/RAM/disk gauges.

Background job (node-cron, every 60s):
- HTTP GET each app's health URL → write `health_checks` row
- Docker stats snapshot → write `container_metrics` row
- Read `/proc/meminfo` + `/proc/stat` + `statvfs` → write `host_metrics` row

Pages:
- `/metrics` — host gauges (CPU, RAM, disk, network)
- `/apps/[id]` — uptime %, latency chart (Recharts), container CPU/RAM

API routes:
- `GET /api/metrics/host?range=24h`
- `GET /api/metrics/containers?range=24h`
- `GET /api/health/[id]?range=7d`

DB tables: `health_checks`, `container_metrics`, `host_metrics`, `metric_rollups`

---

### Milestone 4 — Deploy Manager + Webhooks

**What you get:** Trigger deploys, see history, rollback, start/stop/restart containers.

Pages:
- `/apps/[id]/deployments` — history table with status badges + CI run links
- Buttons on app detail: Deploy, Rollback, Restart, Stop, Start

API routes:
- `POST /api/apps/[id]/deploy` → GitHub `workflow_dispatch`
- `POST /api/apps/[id]/rollback` → dispatch with previous image tag
- `POST /api/apps/[id]/restart|start|stop` → Docker API
- `POST /api/hooks/deployment` — HMAC-verified webhook called by CI

DB tables: `deployments`, `audit_log`

---

### Milestone 5 — Cost Dashboard + AWS Overview

**What you get:** Month-to-date spend, per-service breakdown, 6-month trend.

Background job (daily, midnight):
- Call Cost Explorer `GetCostAndUsage` → cache into `cost_snapshots`
- **Never call per page view** — costs $0.01 each

Pages:
- `/costs` — MTD total, forecast, per-service bar chart, 6-month trend line
- `/aws` — instance info, container grid, disk usage (read-only overview)

API routes:
- `GET /api/aws/costs?months=6`
- `GET /api/aws/overview`

---

## File Structure (inside `dashboard/`)

```
dashboard/
├── app/
│   ├── layout.tsx            # root layout: sidebar + auth guard
│   ├── login/page.tsx
│   ├── page.tsx              # app grid (home)
│   ├── apps/[id]/
│   │   ├── page.tsx          # app detail
│   │   ├── logs/page.tsx
│   │   └── deployments/page.tsx
│   ├── metrics/page.tsx
│   ├── costs/page.tsx
│   └── aws/page.tsx
├── lib/
│   ├── db.ts                 # better-sqlite3 singleton
│   ├── docker.ts             # dockerode client (socket proxy)
│   ├── session.ts            # iron-session config
│   └── aws.ts                # Cost Explorer + CloudWatch clients
├── api/ (inside app/api/)
│   ├── auth/[...route]/
│   ├── apps/[id]/
│   ├── metrics/
│   ├── health/
│   ├── aws/
│   └── hooks/deployment/
├── components/
│   ├── AppCard.tsx           # status card on home grid
│   ├── ContainerBadge.tsx    # running/stopped/unhealthy badge
│   ├── LogViewer.tsx         # SSE log stream component
│   ├── MetricsChart.tsx      # Recharts wrapper
│   └── Sidebar.tsx
├── scripts/
│   └── seed.ts               # init DB + create admin user
├── schema.sql                # SQLite schema (already exists)
├── Dockerfile
└── .env.example
```

---

## Environment Variables

```bash
# /opt/paas/env/dashboard.env on the server
SESSION_SECRET=<64-char random string>
WEBHOOK_SECRET=<32-char random string>
GITHUB_PAT=<fine-grained PAT: repo + actions:write>
ADMIN_PASSWORD=<your dashboard login password>
DATABASE_PATH=/data/dashboard.db
DOCKER_HOST=tcp://socket-proxy:2375
```

---

## Dockerfile

Multi-stage, ARM64, `node:22-alpine`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache sqlite
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY schema.sql ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3000/api/healthz || exit 1
CMD ["node", "server.js"]
```

Add to `next.config.ts`:
```ts
output: 'standalone'
```

---

## How to Deploy (once built)

1. Push `dashboard/` code to GitHub → CI builds `ghcr.io/Dilaxn/paas-dashboard:latest` (arm64)
2. On EC2: `docker compose pull dashboard && docker compose up -d dashboard`
3. Caddy routes `ops.yourdomain.com` → `dashboard:3000`
4. Visit the URL → login → see all containers

---

## Milestone 1 Checklist (start building)

- [ ] `cd dashboard && npx create-next-app@latest . --typescript --tailwind --app`
- [ ] Install deps: `better-sqlite3 iron-session argon2 dockerode node-cron`
- [ ] Init DB + run schema.sql on first boot (`lib/db.ts`)
- [ ] Build login page + session middleware
- [ ] Build `GET /api/apps` — merge DB rows with live Docker status
- [ ] Build home page app grid
- [ ] Build `GET /api/healthz`
- [ ] Write seed script, test locally with Docker Desktop
- [ ] Write Dockerfile, build arm64 image, push to GHCR
- [ ] Update `docker-compose.yml` image tag, deploy to EC2
- [ ] Verify at `ops.yourdomain.com`
