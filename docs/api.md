# Documentation API

## Acces

- Swagger UI : `http://localhost:8000/api/doc`
- Healthcheck : `GET /api/health`

## Domaines couverts

- Authentification (`/api/auth/*`)
- Profil utilisateur (`/api/me`, `/api/profile/*`)
- Trousseaux (`/api/vaults*`)
- Elements (`/api/items*`, `/api/vaults/{vaultId}/items`)
- Import / export / stats (`/api/tools/*`)
- Messagerie (`/api/messages/*`, `/api/vaults/{vaultId}/messages`)
- Notifications (`/api/notifications/*`)
- Pieces jointes (`/api/items/{itemId}/attachments`, `/api/attachments/{id}/download`)

## Points cles securite

- `POST /api/items/{itemId}/unlock-secret` :
  - demande un `pin` pour deverrouiller un element sensible,
  - ne retourne le secret qu'apres verification des droits.
- Les pieces jointes sont accessibles uniquement via les permissions de lecture de l'item.
- Les notifications utilisent un snapshot backend + Mercure pour eviter de multiplier les polls frontend.

## Schema d'erreur standard

Pour les routes API, les erreurs sont homogenisees :

```json
{
  "message": "Acces interdit.",
  "status": 403,
  "code": "forbidden",
  "timestamp": "2026-04-09T11:15:31+00:00",
  "path": "/api/vaults/12",
  "requestId": "c5db4f..."
}
```

Champs possibles en plus :

- `errors` : liste detaillee des erreurs de validation (`field`, `message`).

## Tracabilite

- Toutes les reponses API incluent `X-Request-Id`.
- En cas d'incident, transmettre cette valeur pour correler avec les logs serveur.
