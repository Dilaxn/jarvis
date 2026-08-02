# Personal PaaS on AWS — Project Context

This repo is the control center for migrating 5 personal Node.js apps from Vercel/Railway/Namecheap
to a single, cheap, well-run AWS setup, plus a custom management dashboard.

## The One-Line Architecture

**1× EC2 t4g.small (ARM) running Docker Compose + Caddy reverse proxy. GitHub Actions builds
images to GHCR and deploys over SSH. Dashboard is just another container on the same box,
talking to Docker via a socket proxy and to AWS via an instance IAM role.**

Do NOT propose ECS, Fargate, EKS, ALB, RDS, NAT Gateways, or multi-instance setups unless the
user explicitly asks. This is a personal setup; target total cost is **~$20/month**. Every
suggestion must be justified against that budget. When in doubt: simpler and cheaper wins.

## Applications

| App        | Local path                  | Traffic      | Domain (planned)        | Port |
|------------|-----------------------------|--------------|-------------------------|------|
| lanka-news | ~/Learning/news/lanka-news  | ≤1000/day    | lankanews.click         | 3001 |
| invitation | ~/CodeBase/invitation       | ≤10 users/d  | invitebloom.online      | 3002 |
| pms        | ~/Learning/pms              | dev only     | pms.example.com         | 3003 |
| prince     | ~/Learning/Prince           | ≤2 users/d   | prince.example.com      | 3004 |
| webpulse   | ~/Learning/WebPulse         | ≤5 users/d   | webpulse.example.com    | 3005 |
| dashboard  | (this repo /dashboard)      | just me      | ops.example.com         | 3000 |

Replace `example.com` with the real domains once known. Ports are internal only — Caddy is the
only thing exposed (80/443).

## Repo Map

- `docs/architecture.md` — full design decisions & rationale (read before infra changes)
- `docs/dashboard-spec.md` — dashboard modules, API contract, tech choices
- `docs/migration-roadmap.md` — phased plan with checklists (track progress here)
- `docs/cost.md` — cost model + guardrails
- `infra/docker-compose.yml` — the entire server topology (source of truth)
- `infra/caddy/Caddyfile` — routing + automatic HTTPS
- `infra/cloud-init.sh` — EC2 bootstrap (run once at launch)
- `infra/backup.sh` — nightly backup to S3
- `deploy/github-workflow-template.yml` — CI/CD template to copy into each app repo
- `dashboard/schema.sql` — SQLite schema for the dashboard
- `.claude/agents/` — subagents: infra-engineer, dashboard-builder, cost-auditor
- `.claude/skills/paas-deploy-app/` — skill: onboard a new app onto the platform

## Conventions

- **ARM only**: images must be built for `linux/arm64` (t4g = Graviton). CI uses buildx/QEMU
  or GitHub ARM runners. Never push amd64-only images.
- **Registry**: GitHub Container Registry (`ghcr.io/<owner>/<app>`), tags = git SHA + `latest`.
  No ECR (avoids cost + cross-account auth pain).
- **Secrets**: app secrets live in `/opt/paas/env/<app>.env` on the server (chmod 600),
  referenced by compose `env_file`. Never commit secrets. CI secrets live in GitHub Actions.
- **Logging**: Docker `json-file` driver, `max-size=10m`, `max-file=3` for every service.
  Dashboard reads logs through the Docker API. No CloudWatch Logs (cost).
- **State**: anything persistent goes in a named volume under the `paas_` prefix so backup.sh
  picks it up.
- **Database**: SQLite everywhere (apps + dashboard) unless an app already requires Postgres;
  if so, run one shared `postgres:16-alpine` container, not RDS.
- **Deploys**: GitHub Actions → SSH → `docker compose pull <app> && docker compose up -d <app>`,
  then POST to the dashboard's `/api/hooks/deployment` to record it.

## Commands Cheat Sheet (on the EC2 box)

```bash
cd /opt/paas
docker compose ps                        # status of everything
docker compose logs -f <app>             # tail logs
docker compose pull <app> && docker compose up -d <app>   # manual deploy
docker compose restart <app>
sudo ./infra/backup.sh                   # manual backup
```

## Guardrails for Claude Code

1. Before adding ANY AWS resource, check `docs/cost.md` and state the monthly cost delta.
2. Never widen security groups beyond 80/443 (world) and 22 (my IP / SSM only).
3. Never mount `/var/run/docker.sock` directly into the dashboard — always via the
   `docker-socket-proxy` service with least-privilege env flags.
4. Prefer editing `infra/docker-compose.yml` over ad-hoc `docker run` commands.
5. Keep the dashboard a single Next.js app (UI + API routes). No microservices.
