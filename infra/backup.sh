#!/bin/bash
# Nightly backup: all paas_* volumes + env files -> S3 (lifecycle handles Glacier/expiry).
set -euo pipefail
BUCKET="s3://YOUR-PAAS-BACKUP-BUCKET"
STAMP=$(date +%F)
TMP=$(mktemp -d)

# SQLite-safe copy for the dashboard DB
docker exec paas-dashboard sh -c 'sqlite3 /data/dashboard.db ".backup /data/dashboard-backup.db"' || true

for vol in $(docker volume ls -q --filter name=paas_); do
  docker run --rm -v "$vol":/from:ro -v "$TMP":/to alpine \
    tar czf "/to/${vol}-${STAMP}.tar.gz" -C /from .
done
tar czf "$TMP/env-${STAMP}.tar.gz" -C /opt/paas env

aws s3 cp "$TMP" "$BUCKET/$STAMP/" --recursive --only-show-errors
rm -rf "$TMP"
echo "Backup $STAMP complete"
