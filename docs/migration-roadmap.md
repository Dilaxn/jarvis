# Migration Roadmap

## Phase 1 — Move apps to AWS (weekend 1–2)
- [ ] AWS account hygiene: MFA on root, admin IAM user, **AWS Budget $30 + alert**
- [ ] Launch EC2 t4g.small (AL2023 ARM, 30GB gp3, `infra/cloud-init.sh` as user-data), Elastic IP
- [ ] IAM role `paas-ec2-role` attached (CloudWatch read, CE read, S3 backup bucket, SSM)
- [ ] Security group: 80/443 world; 22 closed (SSM) or my IP only
- [ ] Clone this repo to `/opt/paas`; create `/opt/paas/env/*.env`
- [ ] Dockerize each app (multi-stage, node:22-alpine, arm64, `/health` endpoint, port per CLAUDE.md)
- [ ] Add `deploy/github-workflow-template.yml` to each repo; first push builds & deploys
- [ ] Caddyfile: real domains; DNS A records → Elastic IP (Route53 or Namecheap); verify HTTPS
- [ ] Data migration: export Railway/Vercel data (DB dumps, uploads) → app volumes
- [ ] Cut over DNS app by app; lower TTL to 300s beforehand
- [ ] Decommission Vercel/Railway/Namecheap hosting after 1 week of stability

## Phase 2 — Monitoring, logs, backups (weekend 3)
- [ ] Log rotation confirmed on all containers (json-file 10m×3)
- [ ] `infra/backup.sh` + S3 bucket + lifecycle (30d → Glacier, 180d expire); test a restore!
- [ ] DLM policy: weekly EBS snapshot, keep 4
- [ ] Free external uptime pings (UptimeRobot/StatusCake) on each domain as a safety net
- [ ] CloudWatch alarm: instance status-check failed → email (free)

## Phase 3 — Build management dashboard (2–4 weekends, use dashboard-builder agent)
- [ ] Milestone 1: auth + app registry + live container status (socket-proxy)
- [ ] Milestone 2: log viewer (tail + SSE follow + grep)
- [ ] Milestone 3: health checks, container/host metrics, charts, rollups
- [ ] Milestone 4: deploy trigger (workflow_dispatch), CI webhook, history, rollback
- [ ] Milestone 5: cost dashboard + AWS overview
- [ ] Dashboard deploys itself via the same CI template (ops.<domain>)

## Phase 4 — Automation & polish
- [ ] Alerts: 3 failed health checks → Telegram/SES email
- [ ] Auto-restart policy for unhealthy containers (autoheal or dashboard job)
- [ ] Nightly metric compaction + SQLite VACUUM
- [ ] Savings Plan purchase after ~1 month of stable usage
- [ ] Optional: TOTP 2FA, Tailscale for ops. subdomain, staging tags, Watchtower for base-image updates
