# Checklist securite (Sprint 6)

## Entrees et validations

- DTO backend valides pour les endpoints critiques.
- Verification des types, formats et champs requis.
- Controle taille/type des uploads cote backend.

## Controle d'acces

- Endpoints API proteges (`Bearer` + regles Symfony Security).
- Voters appliques sur vaults/items (`VaultVoter`, `ItemVoter`).
- Verification explicite des droits avant actions sensibles.

## Secrets

- Secrets applicatifs via variables d'environnement.
- Pas de secrets en clair dans la doc livrable.
- Secrets d'items chiffres avant stockage.
- Mots de passe et PIN utilisateur stockes sous forme hachee.

## Erreurs et observabilite

- Reponses d'erreur API homogenes (`message`, `code`, `status`, `requestId`).
- Journalisation serveur des erreurs 5xx avec contexte.
- Header `X-Request-Id` injecte pour correlation support/logs.

## Points de vigilance production

- Rotation des secrets et gestion de coffre-fort.
- Durcissement CORS/CSP selon les domaines finaux.
- Politique de retention sur logs et pieces jointes.
- Sauvegardes BDD chiffrees et test de restauration.
