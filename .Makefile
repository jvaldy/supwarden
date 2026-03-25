COMPOSE_FILE := .docker-compose.yml
ENV_FILE := .env
DOCKER_COMPOSE := docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE)

.PHONY: init up down build rebuild logs ps api-shell web-shell db-shell api-install web-install api-console api-check web-build

init:
	@if [ ! -f $(ENV_FILE) ]; then cp .env.example $(ENV_FILE); fi

up:
	$(DOCKER_COMPOSE) up -d --build

down:
	$(DOCKER_COMPOSE) down --remove-orphans

build:
	$(DOCKER_COMPOSE) build

rebuild:
	$(DOCKER_COMPOSE) up -d --build --force-recreate

logs:
	$(DOCKER_COMPOSE) logs -f

ps:
	$(DOCKER_COMPOSE) ps

api-shell:
	$(DOCKER_COMPOSE) exec api sh

web-shell:
	$(DOCKER_COMPOSE) exec web sh

db-shell:
	$(DOCKER_COMPOSE) exec db psql -U $$POSTGRES_USER -d $$POSTGRES_DB

api-install:
	$(DOCKER_COMPOSE) run --rm api composer install

web-install:
	$(DOCKER_COMPOSE) run --rm web npm install

api-console:
	$(DOCKER_COMPOSE) exec api php bin/console $(CMD)

api-check:
	cd apps/api && composer install && php bin/console about

web-build:
	cd apps/web && npm install && npm run build
