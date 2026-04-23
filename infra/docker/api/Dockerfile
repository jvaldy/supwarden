FROM php:8.1-cli-alpine

WORKDIR /app/apps/api

RUN apk add --no-cache \
    bash \
    git \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    postgresql-dev \
    unzip \
  && docker-php-ext-install intl pdo_pgsql zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY apps/api/composer.json apps/api/composer.lock ./
RUN composer install --no-interaction --no-progress --prefer-dist --no-dev --optimize-autoloader --no-scripts
COPY apps/api/ /app/apps/api/
COPY scripts/start-api.sh /app/scripts/start-api.sh
RUN chmod +x /app/scripts/start-api.sh

EXPOSE 8000

CMD ["sh", "/app/scripts/start-api.sh"]
