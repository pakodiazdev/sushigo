#!/usr/bin/env bash
set -euo pipefail

SRC_PRIV="/run/secrets/oauth_private/value.key"
SRC_PUB="/run/secrets/oauth_public/value.key"
DST_PRIV="/var/www/html/api/storage/oauth-private.key"
DST_PUB="/var/www/html/api/storage/oauth-public.key"

copy_secret_file () {
  local src="$1"
  local dst="$2"
  local tmp="${dst}.tmp"

  # Retry corto por si justo está ocurriendo el replace atómico
  for i in 1 2 3 4 5; do
    if [ -f "$src" ]; then
      # Copia por streaming para evitar el error "replaced while being copied"
      cat "$src" > "$tmp" && mv -f "$tmp" "$dst"
      return 0
    fi
    echo "Secret not ready yet: $src (try $i)"
    sleep 0.2
  done

  echo "ERROR: secret file not available: $src"
  return 1
}

echo "Copying Passport keys..."
copy_secret_file "$SRC_PRIV" "$DST_PRIV"
copy_secret_file "$SRC_PUB" "$DST_PUB"

echo "Setting permissions for OAuth keys..."
chown www-data:www-data "$DST_PRIV" "$DST_PUB"
chmod 600 "$DST_PRIV"
chmod 600 "$DST_PUB"

ls -la /var/www/html/api/storage | sed -n '1,5p' || true

cd /var/www/html/api

echo "Running Laravel optimizations..."

echo "Caching configuration..."
php artisan config:cache

echo "Caching routes..."
php artisan route:cache

echo "Caching views..."
php artisan view:cache

echo "Optimizing the application..."
php artisan optimize

echo "Cleaning up orphaned media uploads..."
php artisan media:cleanup-orphans || echo "⚠️  media:cleanup-orphans failed — continuing startup anyway (see TD-02)"

exec apache2-foreground
