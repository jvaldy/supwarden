#!/bin/sh
set -eu

cd /app/apps/api

# Installe les dependances sans relancer les auto-scripts Symfony a chaque boot.
composer install --no-interaction --no-progress --prefer-dist --no-scripts

# Le cache local peut rester dans un etat incoherent avec le volume monte.
rm -rf var/cache/dev var/cache/test

exec php -S "0.0.0.0:${APP_PORT:-8000}" -t public