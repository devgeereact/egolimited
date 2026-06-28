#!/usr/bin/env bash
# Build + deploy the EGO LIMITED landing + app to egolimited.com (cPanel).
#   landing -> egolimited.com/
#   app     -> egolimited.com/app/
# Uses the `cpanel` SSH alias (key auth, port 21098). Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ Building landing (base /)…"
( cd landing && npx vite build --base=/ )

echo "▶ Building app (base /app/)…"
( cd app && npx vite build --base=/app/ )

# SPA fallback for the app (React Router browser history). dist is wiped each
# build, so (re)write it here before deploy.
cat > app/dist/.htaccess <<'HT'
# SPA fallback for the EGO LIMITED app (React Router, browser history)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /app/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /app/index.html [L]
</IfModule>
HT

echo "▶ Deploying landing → egolimited.com/"
rsync -az --no-perms --omit-dir-times landing/dist/ cpanel:egolimited.com/

echo "▶ Deploying app → egolimited.com/app/"
rsync -az --no-perms --omit-dir-times app/dist/ cpanel:egolimited.com/app/

echo "✓ Done:"
echo "   https://egolimited.com/"
echo "   https://egolimited.com/app/"
