#!/bin/sh
set -eu

cd /app/apps/api

# Installe les dépendances sans relancer les auto-scripts Symfony à chaque boot.
composer install --no-interaction --no-progress --prefer-dist --no-scripts

# Le cache local peut rester dans un état incohérent avec le volume monté.
rm -rf var/cache/dev var/cache/test

exec php -S "0.0.0.0:${APP_PORT:-8000}" -t public
