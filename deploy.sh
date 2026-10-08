#!/usr/bin/env bash
# Build + deploy the EGO LIMITED landing + app to egolimited.com (cPanel).
#   landing -> egolimited.com/
#   app     -> egolimited.com/app/
# Uses the `cpanel` SSH alias (key auth, port 21098). Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")"

# Quality gates, fail-closed: this script publishes straight to the live site with no staging
# step, so stop here (set -e) if the type check or the app tests fail. --no-install makes npx
# fail instead of fetching a package when node_modules is missing.
echo "▶ Gate: app type check + tests…"
( cd app && npx --no-install tsc -b && npm test )

echo "▶ Gate: landing type check…"
( cd landing && npx --no-install tsc -b )

echo "▶ Building landing (base /)…"
( cd landing && npx --no-install vite build --base=/ )

echo "▶ Building app (base /app/)…"
( cd app && npx --no-install vite build --base=/app/ )

# Vite copies app/public/.htaccess into app/dist/. It carries the SPA fallback and the
# sw.js/index.html no-cache rules from the 2026-07-08 white-screen fix, so it must not be
# overwritten here. Stop before deploying if either part is missing.
grep -qF 'RewriteRule . /app/index.html' app/dist/.htaccess \
  && grep -qF '^(sw\.js|index\.html)$' app/dist/.htaccess \
  || { echo "✗ app/dist/.htaccess is missing the SPA fallback or cache rules" >&2; exit 1; }

echo "▶ Deploying landing → egolimited.com/"
rsync -az --no-perms --omit-dir-times landing/dist/ cpanel:egolimited.com/

echo "▶ Deploying app → egolimited.com/app/"
rsync -az --no-perms --omit-dir-times app/dist/ cpanel:egolimited.com/app/

echo "✓ Done:"
echo "   https://egolimited.com/"
echo "   https://egolimited.com/app/"
