#!/usr/bin/env bash
# Deploy the cloud installation: pull, install, build, restart. Run from anywhere.
set -euo pipefail
cd /root/agent-tracking
git pull --ff-only
npm ci --no-audit --no-fund
npm run build
systemctl restart agent-tracking
sleep 2
systemctl is-active agent-tracking
curl -fsS -o /dev/null -w "%{http_code} %{url_effective}\n" http://127.0.0.1:3058/
