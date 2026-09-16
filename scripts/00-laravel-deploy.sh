#!/usr/bin/env bash
set -e

echo "Running composer"
composer install --no-dev --working-dir=/var/www/html

echo "Clearing stale config cache..."
php artisan config:clear || true

echo "Running migrations..."
php artisan migrate --force

echo "Seeding default accounts (safe to re-run)..."
php artisan db:seed --force

echo "Caching config..."
php artisan config:cache

echo "Caching routes..."
php artisan route:cache
