# Architecture & Design Decisions

## 1. Compute choice: EC2 + Docker Compose (not ECS)

Options considered for 6 always-on containers (5 apps + dashboard) at trivial traffic:

| Option | Verdict | Why |
|---|---|---|
| **EC2 + Docker Compose** | ✅ **Chosen** | One t4g.small (~$12/mo) runs everything. One file (`docker-compose.yml`) is the whole topology. SSH deploys are simple and debuggable. The dashboard gets direct Docker API access — which is exactly what the management-dashboard requirement needs. |
| ECS Fargate | ❌ | 6 always-on tasks at 0.25 vCPU/0.5GB ≈ $54/mo before ALB. ALB adds ~$18/mo. 4–5× over budget for zero benefit at this scale. |
| ECS on EC2 | ❌ | Same EC2 bill plus ECS's task-definition/service/cluster ceremony. The dashboard would need ECS APIs instead of the simpler Docker API. Complexity with no payoff for one host. |
| Lightsail | ⚠️ Close second | $10–12/mo, simpler console. But it hides EC2/IAM primitives, which fights the "dashboard talks to AWS SDK" goal. Fine fallback if EC2 feels heavy. |
| App Runner / Lambda | ❌ | Node apps with persistent state and websockets don't map cleanly; per-app pricing beats the budget quickly. |

Trade-off accepted: single point of failure. For personal apps with ≤1000 visits/day this is
fine; recovery = restore from AMI/snapshot + `docker compose up` (< 30 min). Future scaling
path: move a hot app to its own instance or Fargate later — Docker images port unchanged.

## 2. Recommended architecture (bird's eye)

```
                    Route53 (all domains → Elastic IP)
                              │
                    ┌─────────▼──────────┐
                    │  EC2 t4g.small     │  Amazon Linux 2023 (ARM)
                    │  ┌──────────────┐  │
      80/443 ──────►│  │ Caddy        │──┼─► auto HTTPS (Let's Encrypt)
                    │  └──┬───────────┘  │
                    │     │ internal docker network
                    │  ┌──▼─────────────────────────────┐
                    │  │ lanka-news  invitation  pms    │
                    │  │ prince      webpulse           │
                    │  │ dashboard ◄─► socket-proxy     │
                    │  └────────────────────────────────┘
                    │  IAM instance role (CloudWatch, Cost Explorer, S3)
                    └────────────────────┘
                              │ nightly
                              ▼
                    S3 backup bucket (lifecycle → Glacier)
```

- **Caddy** instead of Nginx: automatic Let's Encrypt issuance + renewal in ~8 lines of
  config, HTTP/2, sane defaults. Removes certbot cron jobs entirely.
- **GHCR** instead of ECR: free, already next to the code, one `GITHUB_TOKEN` for CI.
- **CI/CD**: GitHub Actions (free tier is plenty at this volume).
- **Monitoring**: dashboard's own health-check loop + Docker stats + CloudWatch basic metrics
  (free). No Grafana/Prometheus stack — over-engineering here.
- **Logs**: local json-file with rotation, surfaced via dashboard; archived to S3 by backup.sh.

## 3. Infrastructure detail

### VPC
Use the **default VPC**, one public subnet. A custom VPC with private subnets would require a
NAT Gateway (~$32/mo) for pulls/updates — the single biggest cost trap for this kind of setup.
Nothing here justifies it.

### EC2
- `t4g.small` (2 vCPU, 2 GB, Graviton/ARM) — comfortable for 6 idle-ish Node containers.
  Add 1 GB swap as headroom. Upgrade path: `t4g.medium` is a stop/start away.
- Amazon Linux 2023 ARM AMI, 30 GB gp3.
- Elastic IP so DNS never changes.
- IAM instance role `paas-ec2-role`: `CloudWatchAgentServerPolicy`, `ce:GetCostAndUsage`,
  `cloudwatch:GetMetricData`, `ec2:DescribeInstances`, `s3:PutObject/GetObject/ListBucket`
  on the backup bucket only.
- Buy a **1-year no-upfront Compute Savings Plan** after a month of stable usage
  (drops EC2 from ~$12.26 to ~$7.70/mo).

### Docker strategy
- One `docker-compose.yml` = source of truth (`/opt/paas`).
- Every service: `restart: unless-stopped`, healthcheck, log rotation, pinned `ghcr.io` image.
- One shared bridge network; only Caddy publishes ports.
- Multi-stage Dockerfiles, `node:22-alpine` base, `linux/arm64` platform.

### Reverse proxy + SSL
Caddyfile maps each domain → container:port. Caddy handles cert issuance/renewal, OCSP,
redirects. The dashboard's hostname additionally gets an IP allowlist / basic-auth layer on
top of app-level login (defense in depth for the most sensitive surface).

### Route53
One hosted zone per apex domain ($0.50/mo each). A records → Elastic IP. If domains stay
registered at Namecheap, either transfer them or just point NS records at Route53 — or skip
Route53 entirely and set A records at Namecheap to save the fee (Route53 kept here for the
"professional practice" goal + health checks later).

### Security groups
- `sg-web`: 80, 443 from 0.0.0.0/0.
- SSH 22: **your current IP only** — or better, no port 22 at all and use SSM Session Manager
  (already possible with the instance role). GitHub Actions deploys via SSH need either a
  static egress (use a tailnet) or a short `aws ec2 authorize-security-group-ingress` step in
  CI that adds the runner IP and revokes it after (implemented in the workflow template).

## 4. Management dashboard — tech choices

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 15 + Tailwind + shadcn/ui + Recharts** | One codebase for UI and API; you already live in Node. |
| Backend | **Next.js API routes** (Node runtime) | No separate service to run/deploy/monitor. |
| Database | **SQLite** (better-sqlite3, file in a named volume) | Single user, tiny writes. Zero cost, backed up as one file. Postgres/RDS would be over-engineering. |
| Auth | **Single-user credential login** (argon2 hash + iron-session/Auth.js), TOTP 2FA optional | It's just you. Add Caddy-level IP allowlist or put `ops.` behind Tailscale for belt-and-braces. |
| Realtime | Poll every 10–15 s (SWR) | Websockets are unnecessary complexity for n=1 user. |

## 5. How the dashboard talks to AWS/Docker — decision

**Chosen: direct Docker API (via socket proxy) + AWS SDK with the instance role.
No custom agent.**

| Channel | Used for | Why it wins |
|---|---|---|
| Docker Engine API via `tecnativa/docker-socket-proxy` (dockerode client) | container list/status, start/stop/restart, logs, live CPU/RAM per container, image tags | Dashboard runs on the same host — the Docker API *is* the agent. The proxy restricts it to `CONTAINERS=1, IMAGES=1, EXEC=0, POST=1` so a dashboard compromise can't own the host. |
| AWS SDK v3 (creds from instance role, zero keys) | CloudWatch `GetMetricData` (instance CPU/network/disk), Cost Explorer `GetCostAndUsage` (cached daily — each call costs $0.01), `DescribeInstances` | Managed, no credentials to store, free-tier friendly. |
| Host metrics: `node-exporter`-style reads of `/proc` via a tiny mounted volume, or CloudWatch Agent (mem/disk) | RAM & disk gauges | CloudWatch basic metrics lack memory/disk; CW Agent publishes them cheaply (2 custom metrics ≈ $0.60/mo) — or read /proc locally for $0. Default: local. |
| GitHub API (PAT, fine-grained) | trigger `workflow_dispatch` deploys, deployment history, rollback (re-dispatch with SHA input) | Deploys stay in CI where they're logged and reproducible; dashboard is the remote control, not a second deploy system. |

A custom agent daemon would only make sense with multiple hosts. Skip it now; the API surface
in `dashboard-spec.md` is designed so an agent could be slotted in later without UI changes.
