# supwarden

Gestionnaire de mots de passe collaboratif fullstack avec React, Symfony, PostgreSQL, Mercure et Docker.

## Structure du projet

```text
supwarden/
├── apps/
│   ├── api/
│   └── web/
├── infra/
│   └── docker/
│       ├── api/
│       ├── web/
│       ├── db/
│       └── mercure/
├── scripts/
├── .github/
├── .editorconfig
├── .gitignore
├── .docker-compose.yml
├── .Makefile
├── .env.example
└── README.md
```

## Rôles des dossiers

- `apps/api` : application backend Symfony.
- `apps/web` : application frontend React.
- `infra/docker` : configuration Docker par service.
- `scripts` : scripts utilitaires pour le projet.
- `.github` : configuration CI/CD et automatisations GitHub.

## Structure figée des applications

### `apps/api`

```text
apps/api/
├── bin/
├── config/
├── public/
├── src/
│   ├── Controller/
│   ├── Entity/
│   ├── Repository/
│   ├── Service/
│   ├── Dto/
│   ├── Enum/
│   ├── EventSubscriber/
│   └── Security/
├── migrations/
├── tests/
└── var/
```

Rôle des dossiers API :

- `Controller` : endpoints HTTP.
- `Entity` : entités Doctrine.
- `Repository` : accès base de données.
- `Service` : logique métier.
- `Dto` : objets d'entrée et de sortie.
- `Enum` : constantes métier propres.
- `EventSubscriber` : hooks Symfony.
- `Security` : auth, voters et gestion des accès.
- `migrations` : versions de schéma BDD.
- `tests` : tests backend.

### `apps/web`

```text
apps/web/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── routes/
│   ├── utils/
│   └── styles/
└── tests/
```

Rôle des dossiers Web :

- `components` : composants réutilisables.
- `pages` : pages écran.
- `layouts` : structures de page.
- `services` : appels API.
- `hooks` : hooks React personnalisés.
- `context` : contexte global.
- `routes` : routage.
- `utils` : fonctions utilitaires.
- `styles` : styles globaux ou variables.
- `tests` : tests frontend.

Cette structure sert de convention de rangement. Les dossiers plus avancés déjà présents peuvent coexister temporairement, mais cette base est désormais la structure de référence pour le projet.

## Démarrage rapide

1. Copier `.env.example` vers `.env`.
2. Lancer `make init` puis `make up`.
3. Ouvrir le frontend sur `http://localhost:5173`.
4. Ouvrir l'API sur `http://localhost:8000`.
5. Utiliser Mercure via `http://localhost:3000/.well-known/mercure`.

## Outils disponibles

- `make up` : démarre toute la stack Docker.
- `make down` : arrête la stack.
- `make api-check` : vérifie l'application Symfony localement.
- `make web-build` : construit le frontend React localement.
