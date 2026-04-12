# Deploiement et execution

## Prerequis

- Docker + Docker Compose
- Un fichier `.env` adapte a l'environnement
- Un fichier `.env.local` pour les surcharges locales sensibles si necessaire

## Demarrage local (developpement)

```bash
docker compose -f .docker-compose.yml --env-file .env --env-file .env.local up -d --build
```

Services exposes :

- Frontend : `http://localhost:5173`
- API : `http://localhost:8000`
- Swagger : `http://localhost:8000/api/doc`
- Mercure : `http://localhost:3000/.well-known/mercure`
- Adminer : `http://localhost:8080`

## Demarrage local (profil prod)

```bash
docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local up -d --build
```

Ce profil sert a valider un build frontend statique et une configuration plus proche d'un deploiement reel.

## Arret

```bash
docker compose -f .docker-compose.yml --env-file .env --env-file .env.local down --remove-orphans
```

```bash
docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local down --remove-orphans
```

## Variables d'environnement

Variables critiques :

- `APP_SECRET`
- `MERCURE_JWT_SECRET`
- `POSTGRES_PASSWORD`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Ne jamais livrer ces valeurs en clair dans le depot.

## Verification post-deploiement

1. Verifier `/api/health`.
2. Verifier l'acces Swagger sur `/api/doc`.
3. Verifier l'authentification et la navigation privee.
4. Verifier import/export, messagerie et notifications.
