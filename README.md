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
└── README.md
```

## Rôles des dossiers

- `apps/api` : application backend Symfony.
- `apps/web` : application frontend React.
- `infra/docker` : configuration Docker par service.
- `scripts` : scripts utilitaires pour le projet.
- `.github` : configuration GitHub Actions et templates.
