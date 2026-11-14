#!/usr/bin/env bash
set -euo pipefail

cd /root/agent-tracking/cli

echo "==> 1/4 Pruefe npm-Login..."
if ! npm whoami >/dev/null 2>&1; then
  echo "Tippe auf den folgenden Link, um dich im Browser bei npm einzuloggen:"
  npm login --auth-type=web
fi

echo "==> Eingeloggt als: $(npm whoami)"

echo "==> 2/4 Veroeffentliche agenttracking auf npm..."
PKG_VER="$(node -p "require('./package.json').version")"
if npm view "agenttracking@${PKG_VER}" version >/dev/null 2>&1; then
  echo "agenttracking@${PKG_VER} ist bereits auf npm veroeffentlicht."
else
  npm publish --access public --auth-type=web
fi

echo "==> 3/4 Pruefe Erreichbarkeit auf registry.npmjs.org..."
LIVE_OK=0
for _ in {1..20}; do
  CODE="$(curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/agenttracking || true)"
  if [ "$CODE" = "200" ]; then
    LIVE_OK=1
    echo "Live auf npm bestaetigt (HTTP 200)."
    break
  fi
  sleep 2
done

if [ "$LIVE_OK" != "1" ]; then
  echo "Registry antwortet noch nicht mit 200. Bitte in 1 Minute erneut starten."
  exit 1
fi

cd /root/agent-tracking
echo "==> 4/4 Stelle Website auf 'npx --yes agenttracking@latest' um & deploye..."
node -e '
const fs = require("fs");
const p = "lib/agents/format.ts";
const src = fs.readFileSync(p, "utf8");
const next = src.replace(
  /export const CLI_COMMAND = .*;/,
  "export const CLI_COMMAND = \"npx --yes agenttracking@latest\";"
);
if (next !== src) fs.writeFileSync(p, next);
'

npm run typecheck
npm run build
systemctl restart agent-tracking

if [ -n "$(git status --porcelain lib/agents/format.ts)" ]; then
  git add lib/agents/format.ts
  git commit -m "chore(agents): switch CLI install command to published npm package"
  git push origin main
fi

echo ""
echo "ALLES FERTIG! Live auf npm + agenttracking.co aktualisiert:"
echo "  npx --yes agenttracking@latest connect all"
