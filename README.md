# Personal PaaS on AWS

Migration of 5 personal Node.js apps (Vercel/Railway/Namecheap -> AWS) onto a single
EC2 + Docker Compose + Caddy platform, plus a custom management dashboard.

Start here:
1. `CLAUDE.md` - project context (Claude Code reads this automatically)
2. `docs/architecture.md` - design & rationale
3. `docs/migration-roadmap.md` - phased checklist
4. `docs/cost.md` - budget & guardrails

Claude Code extras: subagents in `.claude/agents/` (infra-engineer, dashboard-builder,
cost-auditor) and the `paas-deploy-app` skill in `.claude/skills/` for onboarding new apps.
