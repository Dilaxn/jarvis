---
name: paas-deploy-app
description: Onboard a Node.js application onto the personal AWS PaaS (single EC2 + Docker Compose + Caddy + GitHub Actions). Use whenever the user wants to dockerize an app for this platform, add a new app/service/domain to the server, set up its CI/CD deploy workflow, or migrate an app from Vercel/Railway/Namecheap. Trigger even if they just say "add my X app" or "deploy X to my server".
---

# Onboard an App onto the Personal PaaS

Follow these steps in order. Source of truth files: `infra/docker-compose.yml`,
`infra/caddy/Caddyfile`, `deploy/github-workflow-template.yml`, and the app table in `CLAUDE.md`.

## 1. Inspect the app
Read its package.json and entry point. Determine: framework (Next/Express/etc.), build
command, start command, listening port (make it configurable via `PORT`), state (DB? file
uploads?), required env vars.

## 2. Assign platform identity
Pick the next free internal port (see CLAUDE.md table, 3001+), a compose service name
(kebab-case), container name `paas-<name>`, image `ghcr.io/<owner>/<name>`, and the domain.
Update the CLAUDE.md table.

## 3. Dockerfile (in the app's repo)
Multi-stage on `node:22-alpine`, arm64-compatible, non-root user, prod deps only.
Template:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
USER node
EXPOSE 3001
CMD ["npm", "start"]
```
Adjust for the framework (Next.js: use standalone output; plain Express with no build step:
skip the build stage).

## 4. Health endpoint
Ensure the app serves `GET /health` returning 200 (add a tiny route if missing) - the
compose healthcheck and the dashboard monitor depend on it.

## 5. Register in compose
Add a service block to `infra/docker-compose.yml` copying an existing app block exactly
(anchors, healthcheck on the right port, `paas_<name>_data` volume only if stateful,
`env_file: /opt/paas/env/<name>.env`). Add the volume to the volumes section.

## 6. Routing + TLS
Add a site block to `infra/caddy/Caddyfile`:

    <domain> {
        import common
        reverse_proxy <service>:<port>
    }

## 7. CI/CD
Copy `deploy/github-workflow-template.yml` into the app repo as
`.github/workflows/deploy.yml`. Remind the user to set repo secrets
(EC2_HOST, EC2_SSH_KEY, DASHBOARD_WEBHOOK_URL, DASHBOARD_WEBHOOK_SECRET, AWS keys for the
SSH-rule user) and variables (APP_NAME, SG_ID, AWS_REGION).

## 8. Server-side finishing steps (give the user this checklist)
- Create `/opt/paas/env/<name>.env` (chmod 600) with the app's secrets
- Add DNS A record for the domain -> Elastic IP
- Pull latest compose/Caddyfile on the server, then `docker compose up -d <name>` and
  reload caddy (`docker compose exec caddy caddy reload -c /etc/caddy/Caddyfile`)
- Register the app in the dashboard (applications table / registry UI)
- If migrating: import the old host's data into the `paas_<name>_data` volume BEFORE
  switching DNS; lower TTL to 300 first

## 9. Verify
curl the health URL through the domain over HTTPS; check `docker compose ps` shows healthy;
confirm the first GitHub Actions run deployed and the dashboard recorded it.
