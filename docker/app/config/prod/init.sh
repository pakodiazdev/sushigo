#!/bin/bash

cd /var/www/html

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."

DB_HOST="${DB_HOST:-pgsql}"
DB_PORT="${DB_PORT:-5432}"
DB_DATABASE="${DB_DATABASE:-sushigo_prod}"
DB_USER="${DB_USERNAME:-admin}"
DB_PASSWORD="${DB_PASSWORD:-admin}"

MAX_RETRIES=30
RETRY_COUNT=0

echo "DB_HOST: $DB_HOST, DB_PORT: $DB_PORT, DB_DATABASE: $DB_DATABASE, DB_USER: $DB_USER, DB_PASSWORD: $DB_PASSWORD";


until PGPASSWORD="${DB_PASSWORD}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_DATABASE" -c '\q' 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Error: Database is not available after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "Database is ready!"

# Clear any existing cache and regenerate with runtime environment variables
echo "Clearing and regenerating Laravel cache with runtime environment..."
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Cache configuration, routes and views with actual runtime environment
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
echo "Running migrations..."
php artisan migrate --force

echo "Running seeders..."
php artisan db:seed --force

# Start Apache
echo "Starting Apache..."
apachectl -D FOREGROUND
