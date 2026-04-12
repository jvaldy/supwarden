# Architecture Supwarden

## Vue d'ensemble

Supwarden est organise en monorepo avec deux applications principales :

- `apps/api` : API Symfony (auth, vaults, items, import/export, stats, messagerie).
- `apps/web` : frontend React/Vite (interface utilisateur, etats de session, interactions API).

Services d'infrastructure :

- PostgreSQL : persistance metier.
- Mercure : diffusion quasi temps reel des notifications.
- Adminer : administration BDD en local.

## Flux applicatifs

1. L'utilisateur s'authentifie via token Bearer interne ou via Google OAuth.
2. Le frontend consomme l'API REST (`/api/...`) avec un token `Bearer`.
3. Les permissions sont verifiees cote backend via voters (`VaultVoter`, `ItemVoter`).
4. Les notifications de messagerie sont poussees via Mercure, tandis que le contenu des conversations ouvertes reste rafraichi legerement cote frontend.

## Decoupage backend (Symfony)

- `Controller/` : endpoints HTTP.
- `Service/` : logique metier transverse (chiffrement, import/export, stats, notifications).
- `Repository/` : requetes Doctrine.
- `Security/` : authentification, gestion de token, voters.
- `EventSubscriber/` : comportement cross-cutting (cycle API, erreurs, headers).

## Decoupage frontend (React)

- `pages/` : ecrans metier.
- `services/api/` : clients HTTP par domaine fonctionnel.
- `hooks/` : logique partagee d'UI, de session et de notifications.
- `styles/` : charte visuelle, composants, pages.

## Principes techniques

- API orientee JSON avec schema d'erreur homogene.
- Controle d'acces systematique cote serveur.
- Separation claire entre configuration et secrets.
- Flux critiques couverts par tests backend, frontend et E2E selon le perimetre disponible.

## Documents associes

- Choix techniques : `docs/tech-choices.md`
- UML : `docs/uml.md`
- Schema BDD : `docs/database.md`
- API : `docs/api.md`
