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

1. Copier `.env.example` vers `.env` si le fichier n'existe pas encore.
2. Remplacer dans `.env` toutes les valeurs `__SET_...__` par des secrets locaux propres avant tout démarrage.
3. Lancer `docker compose -f .docker-compose.yml --env-file .env up -d --build`.
4. Ouvrir le frontend sur `http://localhost:5173`.
5. Ouvrir l'API sur `http://localhost:8000`.
6. Ouvrir Adminer sur `http://localhost:8080`.
7. Utiliser Mercure via `http://localhost:3000/.well-known/mercure`.

## Outils disponibles

- `docker compose -f .docker-compose.yml --env-file .env up -d --build` : démarre toute la stack Docker.
- `docker compose -f .docker-compose.yml --env-file .env down --remove-orphans` : arrête la stack.
- `cd apps/api && composer install && php bin/console about` : vérifie l'application Symfony localement.
- `cd apps/web && npm install && npm run build` : construit le frontend React localement.

## Accès base de données

Une interface graphique PostgreSQL est disponible via Adminer sur `http://localhost:8080`.

Utiliser les informations suivantes :
- Système : `PostgreSQL`
- Serveur : `db`
- Utilisateur : `supwarden`
- Mot de passe : la valeur de `POSTGRES_PASSWORD` dans `.env`
- Base de données : `supwarden`

## Sécurité

Les variables d'environnement locales sont définies dans `.env`, qui ne doit pas être versionné. Le fichier `.env.example` sert uniquement de modèle de configuration.

Les secrets applicatifs doivent rester hors du dépôt. Les mots de passe utilisateur et les codes PIN sont destinés à être stockés sous forme hachée, jamais en clair.
