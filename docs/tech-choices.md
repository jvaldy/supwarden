# Choix techniques

## Backend

- `PHP 8.2 + Symfony` : socle robuste pour une API securisee avec validation, serialisation, voters et gestion propre des erreurs.
- `Doctrine ORM` : mapping objet/relationnel maintenable pour les entites metier (trousseaux, elements, permissions, messages).
- `PostgreSQL` : base relationnelle fiable pour les contraintes d'integrite et les agregations de statistiques.
- `Mercure` : diffusion quasi temps reel des notifications sans architecture WebSocket complexe cote application.

## Frontend

- `React + Vite` : interface dynamique, decoupage en pages/hooks/services, avec un build rapide pour le developpement.
- `CSS modulaire` : charte visuelle partagee (composants + pages) pour garantir une UI homogene sur les ecrans critiques.

## Securite

- `JWT Bearer` pour authentifier les appels API.
- Voters Symfony (`VaultVoter`, `ItemVoter`) pour centraliser les autorisations metier.
- Chiffrement des secrets d'items cote backend avant persistance.
- PIN utilisateur comme facteur secondaire pour les secrets sensibles.

## Infrastructure

- `Docker Compose` pour lancer l'environnement complet (API, front, PostgreSQL, Mercure, Adminer).
- Configuration par variables d'environnement pour separer parametres techniques et secrets.
