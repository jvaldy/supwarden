# supwarden

Gestionnaire de mots de passe collaboratif fullstack avec React, Symfony, PostgreSQL, Mercure et Docker.

## Structure du projet

```text
supwarden/
|-- apps/
|   |-- api/
|   `-- web/
|-- infra/
|   `-- docker/
|       |-- api/
|       |-- web/
|       |-- db/
|       `-- mercure/
|-- scripts/
|-- .github/
|-- .editorconfig
|-- .gitignore
|-- .docker-compose.yml
|-- .docker-compose.prod.yml
|-- .env.example
|-- .env.local.example
|-- .env.prod.example
`-- README.md
```

## Roles des dossiers

- `apps/api` : application backend Symfony.
- `apps/web` : application frontend React.
- `infra/docker` : configuration Docker par service.
- `scripts` : scripts utilitaires pour le projet.
- `.github` : configuration CI/CD et automatisations de depot.

## Structure figee des applications

### `apps/api`

```text
apps/api/
|-- bin/
|-- config/
|-- public/
|-- src/
|   |-- Controller/
|   |-- Entity/
|   |-- Repository/
|   |-- Service/
|   |-- Dto/
|   |-- Enum/
|   |-- EventSubscriber/
|   `-- Security/
|-- migrations/
|-- tests/
`-- var/
```

Role des dossiers API :

- `Controller` : endpoints HTTP.
- `Entity` : entites Doctrine.
- `Repository` : acces base de donnees.
- `Service` : logique metier.
- `Dto` : objets d'entree et de sortie.
- `Enum` : constantes metier propres.
- `EventSubscriber` : hooks Symfony.
- `Security` : auth, voters et gestion des acces.
- `migrations` : versions de schema BDD.
- `tests` : tests backend.

### `apps/web`

```text
apps/web/
|-- public/
|-- src/
|   |-- assets/
|   |-- components/
|   |-- pages/
|   |-- layouts/
|   |-- services/
|   |-- hooks/
|   |-- context/
|   |-- routes/
|   |-- utils/
|   `-- styles/
`-- tests/
```

Role des dossiers Web :

- `components` : composants reutilisables.
- `pages` : pages ecran.
- `layouts` : structures de page.
- `services` : appels API.
- `hooks` : hooks React personnalises.
- `context` : contexte global.
- `routes` : routage.
- `utils` : fonctions utilitaires.
- `styles` : styles globaux ou variables.
- `tests` : tests frontend.

Cette structure sert de convention de rangement. Les dossiers deja presents peuvent coexister temporairement, mais cette base reste la structure de reference du projet.

## Demarrage rapide

## Prerequis

Pour lancer le projet sur une machine neuve, il faut disposer au minimum de :

- `Git` pour recuperer le depot : <https://git-scm.com/downloads>
- `Docker Desktop` sur Windows, avec `Docker Compose` disponible : <https://docs.docker.com/desktop/setup/install/windows-install/>
- un navigateur web recent.

Outils utiles en plus pour travailler hors Docker :

- `Node.js` et `npm` pour lancer ou construire le frontend localement : <https://nodejs.org/en/download>
- `PHP` pour lancer, verifier ou tester l'API localement : <https://windows.php.net/download/>
- `Composer` pour gerer les dependances PHP localement : <https://getcomposer.org/download/>

## Avant le premier lancement

Avant de demarrer les conteneurs, il faut :

1. Copier `.env.example` vers `.env`.
2. Copier `.env.local.example` vers `.env.local` si des surcharges locales sont necessaires.
3. Remplacer les placeholders `__SET_...__` par vos propres valeurs.
4. Definir au minimum la configuration de la base de donnees :
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
5. Definir aussi les secrets applicatifs necessaires :
   - `APP_SECRET`
   - `MERCURE_JWT_SECRET`
6. Renseigner les variables Google OAuth si la connexion Google doit fonctionner :
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `GOOGLE_OAUTH_REDIRECT_URI`
   - `GOOGLE_OAUTH_FRONTEND_CALLBACK_URL`

Sans configuration Google OAuth, le projet peut demarrer, mais la connexion Google ne sera pas utilisable.

### Version web / developpement

1. Copier `.env.example` vers `.env`.
2. Copier `.env.local.example` vers `.env.local` si des surcharges locales sont necessaires.
3. Renseigner les valeurs attendues a partir des placeholders `__SET_...__`.
4. Definir avant le build les variables BDD minimales :
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
5. Verifier aussi les autres secrets requis selon votre environnement :
   - `APP_SECRET`
   - `MERCURE_JWT_SECRET`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
6. Lancer :

```bash
docker compose -f .docker-compose.yml --env-file .env --env-file .env.local up -d --build
```

7. Initialiser le schema de base de donnees (obligatoire au premier lancement) :

```bash
docker compose -f .docker-compose.yml --env-file .env --env-file .env.local exec api php bin/console doctrine:migrations:migrate --no-interaction
```

8. Ouvrir :
   - frontend : `http://localhost:5173`
   - API : `http://localhost:8000`
   - documentation API : `http://localhost:8000/api/doc`

### Version prod / validation finale

1. Copier `.env.prod.example` vers `.env`.
2. Copier `.env.local.example` vers `.env.local` si des surcharges locales sont necessaires.
3. Renseigner toutes les variables `__SET_...__`, en particulier :
   - `DATABASE_URL` (obligatoire pour l'API en prod)
   - `APP_SECRET`
   - `MERCURE_JWT_SECRET`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
4. Si vous lancez aussi la base locale `db` du fichier `.docker-compose.prod.yml` (profile `local-db`), renseigner egalement :
   - `POSTGRES_DB`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
5. Lancer :

```bash
docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local up -d --build
```

6. Initialiser le schema de base de donnees (obligatoire si la base est vide) :

```bash
docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local exec api php bin/console doctrine:migrations:migrate --no-interaction
```

7. Ouvrir :
   - frontend : `http://localhost:5173`
   - API : `http://localhost:8000`
   - documentation API : `http://localhost:8000/api/doc`

Exemple minimal de configuration BDD dans `.env` :

```env
POSTGRES_DB=supwarden
POSTGRES_USER=supwarden
POSTGRES_PASSWORD=choisir-un-mot-de-passe-solide
```

## Outils disponibles

- `docker compose -f .docker-compose.yml --env-file .env --env-file .env.local up -d --build` : demarre la stack dev.
- `docker compose -f .docker-compose.yml --env-file .env --env-file .env.local down --remove-orphans` : arrete la stack dev.
- `docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local up -d --build` : demarre la stack de validation prod.
- `docker compose -f .docker-compose.prod.yml --env-file .env --env-file .env.local down --remove-orphans` : arrete la stack de validation prod.
- `cd apps/api && composer install && php bin/console about` : verifie l'application Symfony localement.
- `cd apps/web && npm ci && npm run build` : construit le frontend React localement de facon deterministe.

## Documentation Sprint 6

- Architecture : `docs/architecture.md`
- Choix techniques : `docs/tech-choices.md`
- UML : `docs/uml.md`
- Base de donnees : `docs/database.md`
- API : `docs/api.md`
- Deploiement : `docs/deployment.md`
- Securite : `docs/security-checklist.md`
- Guide utilisateur : `docs/user-guide.md`

## Fichiers locaux a creer apres un clone Git

Ces fichiers ne sont pas versionnes et doivent etre recrees localement :

- `.env` : configuration principale de l'environnement.
- `.env.local` : surcharges sensibles ou specifiques a la machine.
- `apps/api/var/` : cache, logs et fichiers temporaires Symfony.
- `apps/web/node_modules/` et `apps/api/vendor/` : dependances installees localement ou via Docker.

Les fichiers d'exemple a utiliser comme point de depart sont :

- `.env.example`
- `.env.prod.example`
- `.env.local.example`

## Acces base de donnees

Une interface graphique PostgreSQL est disponible via Adminer sur `http://localhost:8080`.

Les identifiants de connexion ne sont pas documentes ici pour eviter toute confusion avec des valeurs reelles.
Utiliser uniquement les variables definies dans vos fichiers locaux `.env` et `.env.local`.

## Securite

Les variables d'environnement locales sont definies dans `.env` et `.env.local`, qui ne doivent pas etre versionnes. Les fichiers `*.example` servent uniquement de modeles de configuration.

Les secrets applicatifs doivent rester hors du depot. Les mots de passe utilisateur et les codes PIN sont destines a etre stockes sous forme hachee, jamais en clair.

## Profils d'environnement

- Dev : copier `.env.example` vers `.env`, puis `.env.local.example` vers `.env.local` si besoin.
- Prod : copier `.env.prod.example` vers `.env`, puis `.env.local.example` vers `.env.local` si besoin.

## Verrouillage de l'environnement

Pour garantir qu'un autre developpeur relance le projet avec exactement le meme socle :

- conserver `apps/api/composer.lock` et `apps/web/package-lock.json` dans le depot ;
- utiliser `npm ci` (pas `npm install`) pour respecter strictement le lockfile ;
- conserver `APP_ENV`, les variables BDD et les secrets uniquement dans `.env` / `.env.local` ;
- garder les versions Node alignees sur `.nvmrc` et `.node-version` ;
- figer les images Docker via :
  - `POSTGRES_IMAGE`
  - `ADMINER_IMAGE`
  - `MERCURE_IMAGE`

Pour un verrouillage maximal, vous pouvez remplacer ces tags par des digests immuables (`image@sha256:...`).
