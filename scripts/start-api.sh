#!/bin/sh
set -eu

cd /app/apps/api

# Image prod: dependances installees au build, on ne reinstalle pas au demarrage.
if [ "${APP_ENV:-prod}" = "prod" ]; then
  rm -rf var/cache/prod
  php bin/console cache:warmup --env=prod --no-debug || true
fi

exec php -S "0.0.0.0:${APP_PORT:-8000}" -t public
