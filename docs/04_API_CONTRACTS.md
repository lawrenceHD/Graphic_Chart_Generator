# 04 — Contrats d'API

> Statut : **validé** — Version 4.0 — 2026-10-07
> Les schémas Zod de `packages/contracts` et `packages/document` font foi ; ce document fixe l'intention et les règles.

## 1. Conventions

- Préfixe `/api/v1`. Corps JSON. Toute entrée et toute sortie est **validée par Zod**.
- Authentification : cookie de session `HttpOnly; Secure; SameSite=Lax` (utilisateur) ou cookie de session invitée signé. **Aucun jeton dans `localStorage`.**
- Les mutations (`POST`, `PATCH`, `DELETE`) vérifient l'en-tête `Origin` contre `APP_URL` (protection CSRF en plus de `SameSite`).
- Chaque réponse porte `X-Request-Id`.
- Pagination par **curseur** : `?cursor=<id>&limit=<≤50>` ; réponse `{ items, nextCursor }`.
- Dates en ISO 8601 UTC.

## 2. Format d'erreur (RFC 9457)

```json
{
  "type": "https://<domaine>/errors/asset-unsupported-svg",
  "title": "SVG non supporté",
  "status": 422,
  "code": "ASSET_SVG_UNSUPPORTED_FEATURE",
  "detail": "Le SVG contient des textes non convertis en tracés.",
  "hint": "Exporte le logo en convertissant les textes en contours.",
  "requestId": "01J…"
}
```

`code` est **stable** et traduisible côté interface ; `detail` et `hint` sont des chaînes humaines. Jamais de trace de pile, de chemin ou de détail interne dans une réponse.

### Codes de rejet d'asset (exemples, liste complète dans `contracts`)

| Code | Cause |
|---|---|
| `ASSET_TOO_LARGE` | Taille ou dimensions au-dessus des limites |
| `ASSET_TYPE_UNSUPPORTED` | Octets magiques non reconnus |
| `ASSET_SVG_FORBIDDEN_CONTENT` | Script, gestionnaire, référence externe, DOCTYPE |
| `ASSET_SVG_UNSUPPORTED_FEATURE` | Fonction non prise en charge au MVP (texte non converti, `foreignObject`…) |
| `ASSET_SVG_TOO_COMPLEX` | Nombre de nœuds ou profondeur dépassés |
| `ASSET_DECODE_FAILED` | Image corrompue |
| `ASSET_SCAN_TIMEOUT` | Délai de traitement dépassé |

## 3. Endpoints

### Session et compte
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/guest-sessions` | Crée une session invitée (Turnstile requis) |
| `POST` | `/guest-sessions/claim` | Rattache les projets invités au compte connecté |
| `DELETE` | `/account` | Demande la suppression du compte et des données |

L'inscription, la connexion, la vérification d'e-mail et la réinitialisation de mot de passe sont servies par la bibliothèque d'authentification (`/api/auth/*`).

### Projets
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects` | Crée un projet (`title`, `industryLabel`, `language`, `briefText`) |
| `GET` | `/projects` | Liste (curseur, recherche par titre) |
| `GET` | `/projects/:id` | Projet + document + dernière révision |
| `PATCH` | `/projects/:id` | Métadonnées (`title`, `industryLabel`) |
| `DELETE` | `/projects/:id` | Suppression logique |
| `POST` | `/projects/:id/analyze` | Lance l'analyse (idempotente par clé `Idempotency-Key`) |
| `GET` | `/projects/:id/events` | Flux SSE d'événements du projet |

### Assets
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects/:id/assets/uploads` | Déclare un fichier, reçoit `assetId` + URL présignée |
| `POST` | `/assets/:id/complete` | Confirme l'envoi, déclenche le scan |
| `GET` | `/assets/:id` | Statut et métadonnées |
| `GET` | `/assets/:id/content` | Contenu (assaini uniquement), avec autorisation, en-têtes de sécurité (§6) |

### Document
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects/:id/commands` | Applique une commande (`baseSeq`, `command`) |
| `POST` | `/projects/:id/undo` | Applique l'inverse de la dernière révision utilisateur |
| `GET` | `/projects/:id/revisions` | Historique (curseur) |

### Copilote
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects/:id/copilot` | Consigne ; réponse en `text/event-stream` (voir §5) |
| `GET` | `/projects/:id/chat` | Historique du dialogue |

### Exports et partage
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects/:id/exports` | `{ kind: 'pdf' \| 'zip' }` → crée l'export |
| `GET` | `/exports/:id` | Statut, URL signée si terminé |
| `POST` | `/projects/:id/share-links` | Crée un lien (durée ≤ 30 jours) |
| `DELETE` | `/share-links/:id` | Révoque |

### Technique
| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/health` | Base, stockage, file ; sans détail sensible |

## 4. Commandes (`packages/document`)

Union discriminée sur `type`. Chaque commande est une fonction **pure** `apply(doc, cmd) → { doc, inverse }` avec un schéma Zod. Toute commande contient `baseSeq` au niveau de la requête, pas dans la commande.

| Type | Champs | Effet | Inverse |
|---|---|---|---|
| `SetColorToken` | `token`, `hex` | Change un token global, `source: 'user'` | `SetColorToken` ancienne valeur |
| `SetTypographyPairing` | `pairingId` (catalogue) | Change le couple de polices | idem |
| `SetBrandField` | `field` (liste blanche), `value` | Nom, mission, vision, valeurs, archétype | idem |
| `SetPageField` | `pageId`, `field`, `value` | Texte d'une page | idem |
| `SetPageOverride` | `pageId`, `key`, `value` | Surcharge locale | `SetPageOverride` ou `ClearPageOverride` |
| `ClearPageOverride` | `pageId`, `key` | Supprime la surcharge | `SetPageOverride` |
| `SetLogoRules` | `clearSpaceRatio`, `minSizePx`, `minSizeMm` | Règles du logo (10–50 %) | idem |
| `ReorderPage` | `pageId`, `afterPageId \| null` | Déplace une page | `ReorderPage` ancienne place |
| `AddPage` | `type`, `afterPageId` | Ajoute une page d'un type autorisé | `RemovePage` |
| `RemovePage` | `pageId` | Supprime (confirmation requise côté interface) | `AddPage` + données |
| `SelectScene` | `pageId`, `sceneId`, `finish` | Scène et finition d'une page mockup | idem |

Règles :
- Une commande invalide (schéma, cible inexistante, valeur hors limites) renvoie `422` **sans modification**.
- Toutes les chaînes sont normalisées (Unicode NFC, longueur bornée, aucun HTML).
- `hex` : `^#[0-9A-F]{6}$` (majuscules, normalisé à l'entrée).
- Le copilote n'a accès **qu'à ces commandes**.

Réponse de `POST /commands` : `200 { seq, document }` ; `409` si `baseSeq` n'est pas la tête (le client récupère l'état et relance).

## 5. Flux SSE

### Événements du projet (`GET /projects/:id/events`)

Chaque événement porte un `id` croissant ; le client reconnecté envoie `Last-Event-ID` et reçoit les événements manqués. Un battement (`: ping`) est envoyé toutes les 15 s.

| `event` | Données |
|---|---|
| `asset.status` | `{ assetId, status, rejectReason? }` |
| `analysis.step` | `{ step: 1..4, state: 'running'\|'done'\|'failed', code? }` |
| `analysis.done` | `{ seq }` |
| `export.status` | `{ exportId, status, error? }` |

### Copilote (`POST /projects/:id/copilot`)

Corps : `{ message, scope: 'global' | { pageId }, baseSeq }`. Le client lit le flux avec `fetch` (pas `EventSource`, qui ne peut pas envoyer de corps).

| `event` | Données |
|---|---|
| `message.delta` | `{ text }` |
| `command.applied` | `{ seq, command, summary }` |
| `command.rejected` | `{ reason }` |
| `confirm.required` | `{ command, reason }` (actions destructrices) |
| `error` | `{ code }` |
| `done` | `{ usage: { tokensIn, tokensOut } }` |

## 6. En-têtes de service des assets

`GET /assets/:id/content` :
`Content-Type` fixé par le serveur selon le type vérifié ; `X-Content-Type-Options: nosniff` ; `Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'` ; `Cache-Control: private, max-age=3600` ; `Content-Disposition: inline` pour les images. Les SVG ne sont affichés **qu'en `<img>`**.

## 7. Limites de débit

| Route | Limite |
|---|---|
| Création de session invitée | 5/h par IP |
| Déclaration d'upload | 15/min par compte ou session, 30/min par IP |
| Analyse | 5/h (invité), 30/jour (compte gratuit) |
| Copilote | 20/h (invité interdit au MVP), 200/jour (compte gratuit), plafond de tokens quotidien |
| Lecture publique de lien de partage | 60/min par IP |

Réponse `429` avec `Retry-After`. Les limites s'appliquent **par identité et par IP** (les réseaux mobiles partagent des IP).

## 8. Idempotence et reprise

`POST /analyze` et `POST /exports` acceptent `Idempotency-Key` : deux appels avec la même clé renvoient la même ressource. Les jobs sont **idempotents** : relancés, ils reprennent sans doublon.
