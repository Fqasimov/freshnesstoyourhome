#!/usr/bin/env bash
# Build upload-ready packages for a shared host with no shell.
#
#   DOMAIN=freshnesstoyourhome.az scripts/package-deploy.sh
#
# Produces, in deploy-out/:
#   website.zip   extract into public_html/        → https://DOMAIN and /cms
#   backend.zip   extract into the home directory  → ~/freshness/backend + ~/freshness/shared,
#                 and the API's front door in ~/public_html/api.DOMAIN
#
#   WEBSITE_ONLY=1 scripts/package-deploy.sh
#
# builds just deploy-out/website-only.zip: the shop with no backend behind it.
# The catalogue, prices and delivery fees are the bundled copies and orders go
# out over WhatsApp, so it is a complete shop — only the admin panel is left
# out, since it has nothing to talk to. Updating a price means rebuilding.
#
# Everything the server would normally do with composer and npm is done here,
# so the host only has to unzip. Setup (keys, tables, first admin) is the
# one-time web installer copied into backend/public/ under a random name.
set -euo pipefail

DOMAIN="${DOMAIN:-freshnesstoyourhome.az}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy-out"
STAGE="$(mktemp -d)"
TOKEN="$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n')"

rm -rf "$OUT" && mkdir -p "$OUT"

if [ "${WEBSITE_ONLY:-}" = 1 ]; then
  echo "==> website only (no backend)"
  # Explicitly blank: web/.env points at localhost for development, and a
  # visitor's browser would otherwise go looking for an API on their own
  # machine.
  ( cd "$ROOT/web" && VITE_API_URL= npm run build >/dev/null )
  rm -rf "$ROOT/web/dist/cms"
  cp "$ROOT/deploy/website.htaccess" "$ROOT/web/dist/.htaccess"
  ( cd "$ROOT/web/dist" && zip -qr "$OUT/website-only.zip" . )
  ls -lh "$OUT"
  exit 0
fi

echo "==> website (API at https://api.$DOMAIN)"
( cd "$ROOT/web" && VITE_API_URL="https://api.$DOMAIN" npm run build >/dev/null )
cp "$ROOT/deploy/website.htaccess" "$ROOT/web/dist/.htaccess"
( cd "$ROOT/web/dist" && zip -qr "$OUT/website.zip" . )

echo "==> backend (composer --no-dev)"
mkdir -p "$STAGE/freshness/shared"
mkdir -p "$STAGE/freshness/backend"
# tar rather than rsync: it is on every machine, and --exclude does the same job.
tar -C "$ROOT/backend" \
  --exclude=./.env --exclude='./.env.*' --exclude=./vendor --exclude=./node_modules \
  --exclude=./tests --exclude='./storage/logs/*' --exclude='./storage/framework/cache/data/*' \
  --exclude='./storage/framework/sessions/*' --exclude='./storage/framework/views/*' \
  --exclude='./storage/app/public/*' --exclude='./bootstrap/cache/*.php' \
  --exclude=./public/storage --exclude='./.phpunit*' --exclude='./database/*.sqlite' \
  -cf - . | tar -C "$STAGE/freshness/backend" -xf -
cp "$ROOT/shared/catalogue.json" "$ROOT/shared/delivery.json" "$STAGE/freshness/shared/"
( cd "$STAGE/freshness/backend" && COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --optimize-autoloader --no-interaction --quiet )
# Composer falls back to git clones when it cannot download release zips, and
# a clone brings the package's whole history — Laravel's alone is 150 MB. The
# server runs the code, not the history.
find "$STAGE/freshness/backend/vendor" -type d -name .git -prune -exec rm -rf {} +
# The host only lets a domain point inside public_html, and the backend must
# not live there (.env holds the database password and the keys). So the code
# goes to ~/freshness/backend and only the front door goes to
# public_html/api.DOMAIN — see deploy/split-index.php. Extracting the zip in
# the home folder puts both in place at once.
API_DIR="$STAGE/public_html/api.$DOMAIN"
mkdir -p "$API_DIR"
cp "$ROOT/backend/public/.htaccess" "$ROOT/backend/public/favicon.ico" "$ROOT/backend/public/robots.txt" "$API_DIR/"
cp "$ROOT/deploy/split-index.php" "$API_DIR/index.php"
sed "s/__DOMAIN__/$DOMAIN/g" "$ROOT/deploy/installer.php" > "$API_DIR/install-$TOKEN.php"
# Empty directories Laravel needs to exist; zip drops empty ones otherwise.
for d in storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache; do
  mkdir -p "$STAGE/freshness/backend/$d" && touch "$STAGE/freshness/backend/$d/.keep"
done
( cd "$STAGE" && zip -qr "$OUT/backend.zip" freshness public_html )
rm -rf "$STAGE"

echo
ls -lh "$OUT"
echo
echo "Installer: https://api.$DOMAIN/install-$TOKEN.php"
echo "$TOKEN" > "$OUT/installer-token.txt"
