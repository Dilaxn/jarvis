#!/bin/bash
# EC2 bootstrap — paste as user-data when launching, or run once via SSM.
# Target: Amazon Linux 2023, ARM (t4g.small), 30GB gp3.
set -euxo pipefail

dnf update -y
dnf install -y docker git

# Docker + compose plugin
systemctl enable --now docker
usermod -aG docker ec2-user
mkdir -p /usr/local/lib/docker/cli-plugins
curl -sSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-aarch64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 1GB swap (headroom on 2GB RAM)
fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# PaaS layout
mkdir -p /opt/paas/env /opt/paas/caddy
chown -R ec2-user:ec2-user /opt/paas
chmod 700 /opt/paas/env

# Deploy key for GitHub Actions (authorized separately) + docker login to GHCR happens in CI.

# Nightly backup at 02:30 UTC
cat > /etc/cron.d/paas-backup << 'CRON'
30 2 * * * root /opt/paas/backup.sh >> /var/log/paas-backup.log 2>&1
CRON

echo "Bootstrap done. Next: clone this repo into /opt/paas, create env files, docker compose up -d"
