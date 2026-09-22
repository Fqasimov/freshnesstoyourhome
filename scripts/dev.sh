#!/usr/bin/env bash
#
# One command to get the app on your phone.
#
#   ./scripts/dev.sh
#
# Sets up the database if needed, seeds the catalogue, creates a development
# customer and prints its sign-in code, starts the API on your LAN, points the
# app at it, and hands Expo the wheel so it can print the QR.
#
# Run it from the repository root. Ctrl-C stops everything.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

say ()  { printf '\n\033[1;32m==>\033[0m \033[1m%s\033[0m\n' "$1"; }
warn () { printf '\033[1;33m !\033[0m %s\n' "$1"; }
die ()  { printf '\n\033[1;31m !!\033[0m %s\n\n' "$1" >&2; exit 1; }

# ── The address your phone has to reach ──────────────────────────────────
#
# Not localhost. On the phone, localhost is the phone — it would look for an
# API on itself, find nothing, and every screen would sit empty. This is the
# single most common way to lose an hour here.
lan_ip () {
  # macOS. en0 is usually Wi-Fi, but a Mac on ethernet or a dock can be
  # anywhere up the range, so try them in order.
  if command -v ipconfig >/dev/null 2>&1; then
    for i in en0 en1 en2 en3 en4 en5 en6 en7 en8; do
      ip=$(ipconfig getifaddr "$i" 2>/dev/null || true)
      [ -n "$ip" ] && { echo "$ip"; return; }
    done
  fi

  # Linux. Ask the routing table which source address reaches the internet —
  # more reliable than picking the first interface, on a machine with docker
  # bridges and VPN adapters.
  if command -v ip >/dev/null 2>&1; then
    found=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") {print $(i+1); exit}}')
    [ -n "$found" ] && { echo "$found"; return; }
  fi

  if command -v ifconfig >/dev/null 2>&1; then
    found=$(ifconfig 2>/dev/null | awk '/inet /{if($2!="127.0.0.1"){print $2; exit}}')
    [ -n "$found" ] && { echo "${found#addr:}"; return; }
  fi

  if command -v hostname >/dev/null 2>&1; then
    found=$(hostname -I 2>/dev/null | awk '{print $1}')
    [ -n "$found" ] && { echo "$found"; return; }
  fi

  echo ""
}

IP="${LAN_IP:-$(lan_ip)}"
[ -z "$IP" ] && die "Could not work out this machine's LAN address.
   Find it yourself (System Settings → Wi-Fi → Details, or \`ip addr\`) and re-run:
     LAN_IP=192.168.1.14 ./scripts/dev.sh"

API_URL="http://${IP}:8000"

command -v php  >/dev/null 2>&1 || die "php is not installed."
command -v node >/dev/null 2>&1 || die "node is not installed."

# ── Backend ──────────────────────────────────────────────────────────────
say "Backend"
cd "$ROOT/backend"

if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate --ansi

  # sqlite by default: no server to install, and the test suite is green
  # against both this and Postgres. Switch when you deploy.
  DB_FILE="$ROOT/backend/database/database.sqlite"
  touch "$DB_FILE"
  # BSD sed (macOS) needs an argument to -i; GNU sed must not have one.
  sedi () { if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi; }
  sedi "s|^DB_CONNECTION=.*|DB_CONNECTION=sqlite|" .env
  sedi "s|^DB_DATABASE=.*|DB_DATABASE=${DB_FILE}|" .env
  sedi "s|^DB_HOST=|# DB_HOST=|" .env
  sedi "s|^DB_PORT=|# DB_PORT=|" .env
  sedi "s|^DB_USERNAME=|# DB_USERNAME=|" .env
  sedi "s|^DB_PASSWORD=|# DB_PASSWORD=|" .env

  # Read sign-in codes out of the log instead of sending mail in development.
  sedi "s|^MAIL_MAILER=.*|MAIL_MAILER=log|" .env

  # Queue inline, so a code appears without a worker running.
  sedi "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=sync|" .env

  # Lookup-hash key for the encrypted columns. Separate from APP_KEY.
  KEY=$(php -r 'echo base64_encode(random_bytes(32));')
  sedi "s|^BLIND_INDEX_KEY=.*|BLIND_INDEX_KEY=${KEY}|" .env

  echo "   wrote backend/.env (sqlite, mail to log)"
fi

# Let the phone's browser origin through in development. Production keeps the
# strict exact-match list; these patterns only apply outside it.
if ! grep -q '^CORS_ALLOWED_ORIGINS=' .env; then
  printf '\nCORS_ALLOWED_ORIGINS=http://localhost:8081,%s\n' "http://${IP}:8081" >> .env
fi

[ -d vendor ] || { echo "   installing php dependencies…"; composer install --no-interaction --quiet; }

# Everything both surfaces share — the palette, the delivery areas, the
# listings, the product photographs — is generated from shared/. The seeders
# below read it directly, and a fresh clone has no product photos until this
# has run. Cheap and idempotent: it rewrites only what has actually changed.
say "Shared files"
( cd "$ROOT" && node scripts/sync.mjs )

php artisan migrate --force --quiet
php artisan db:seed --force --quiet 2>/dev/null || true
php artisan config:clear --quiet

say "Development customer"
php artisan freshness:dev-user

# ── API ──────────────────────────────────────────────────────────────────
say "Starting the API on ${API_URL}"
php artisan serve --host=0.0.0.0 --port=8000 >/tmp/freshness-api.log 2>&1 &
API_PID=$!

cleanup () {
  echo
  say "Stopping"
  kill "$API_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:8000/api/catalogue" 2>/dev/null; then break; fi
  sleep 0.5
done

curl -fsS -o /dev/null "http://127.0.0.1:8000/api/catalogue" 2>/dev/null \
  || die "The API did not come up. See /tmp/freshness-api.log"

echo "   catalogue endpoint answering"

# ── App ──────────────────────────────────────────────────────────────────
say "App"
cd "$ROOT/app"

[ -d node_modules ] || { echo "   installing node dependencies…"; npm install --silent; }

# Rewritten every run: your LAN address changes with the network you are on,
# and a stale value here is the classic "the app opens but nothing loads".
printf '# Written by scripts/dev.sh — your machine on this network.\nEXPO_PUBLIC_API_URL=%s\n' "$API_URL" > .env
echo "   EXPO_PUBLIC_API_URL=${API_URL}"

say "Scan the QR below with Expo Go"
echo "   Your phone must be on the same wifi as this machine."
echo "   Sign in with the email and code printed above."
echo

exec npx expo start --clear
