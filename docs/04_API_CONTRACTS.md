# 04 — Contrats d'API

> Statut : **validé** — Version 4.1 — 2026-10-17 (4.0 du 2026-10-07 ; 4.1 : annulation serveur ADR-018, `AddPage` ADR-019, valeurs ADR-020, conflit copilote ADR-022, service des assets ADR-023, actions `can()` ADR-025)
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

### Codes d'édition et d'historique

| Code | Statut | Cause |
|---|---|---|
| `REVISION_CONFLICT` | 409 | `baseSeq` n'est pas la tête du document |
| `EXPECTATION_FAILED` | 409 | La valeur courante diffère du champ `expect` de la commande (ADR-018) |
| `UNDO_CONFLICT` | 409 | L'annulation demandée porte sur une valeur modifiée depuis ; aucune modification (ADR-018) |
| `NOTHING_TO_UNDO` / `NOTHING_TO_REDO` | 409 | Pile d'annulation ou de rétablissement vide |
| `CONFLICT` | — | Événement `error` du copilote : une révision utilisateur est survenue pendant le tour (ADR-022) |

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
| `GET` | `/assets/:id/content` | `can()` puis redirection `302` vers une URL R2 présignée de courte durée (assaini uniquement, §6) |

### Document
| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/projects/:id/commands` | Applique une commande (`baseSeq`, `command`) |
| `POST` | `/projects/:id/undo` | Annule la dernière révision non annulée (`03_DATA_MODEL.md` §5, ADR-018) |
| `POST` | `/projects/:id/redo` | Rétablit la dernière annulation non rétablie |
| `POST` | `/projects/:id/revisions/:seq/undo` | Annule une révision précise (commande du copilote, par exemple) ; `409 UNDO_CONFLICT` si la valeur a changé depuis |
| `GET` | `/projects/:id/revisions` | Historique (curseur), avec `undoOf` / `redoOf` et l'état « annulée » de chaque révision |

`undo`, `redo` et `revisions/:seq/undo` prennent `{ baseSeq }` comme `POST /commands` et répondent de la même façon (`200 { seq, document }`).

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

Union discriminée sur `type`. Chaque commande est une fonction **pure** `apply(doc, cmd) → Result<{ doc, inverse }, CommandError>` (type `Result` de `@app/kernel`, ADR-017) avec un schéma Zod. Toute commande contient `baseSeq` au niveau de la requête, pas dans la commande.

**Champ `expect` (ADR-018)** : toute commande accepte un champ facultatif `expect`, la valeur attendue à l'emplacement visé avant application (pour `SetLogoRules`, l'objet des trois règles ; pour `ReorderPage`, l'`afterPageId` actuel ; pour `RemovePage`, la page complète). Si la valeur courante diffère, `apply` échoue avec `EXPECTATION_FAILED`, sans modification. Les inverses portent **toujours** `expect` (la valeur écrite par la commande d'origine), ce qui rend sûre l'annulation d'une révision ancienne.

| Type | Champs | Effet | Inverse |
|---|---|---|---|
| `SetColorToken` | `token`, `hex`, `expect?` | Change un token global, `source: 'user'` | `SetColorToken` ancienne valeur, `expect` = nouvelle |
| `SetTypographyPairing` | `pairingId` (catalogue), `expect?` | Change le couple de polices | idem |
| `SetBrandField` | `field` (liste blanche), `value`, `expect?` | Nom, mission, vision, valeurs (`[{ label, description }] × 4`, ADR-020), archétype | idem |
| `SetPageField` | `pageId`, `field`, `value`, `expect?` | Texte d'une page | idem |
| `SetPageOverride` | `pageId`, `key`, `value`, `expect?` | Surcharge locale | `SetPageOverride` ou `ClearPageOverride` |
| `ClearPageOverride` | `pageId`, `key`, `expect?` | Supprime la surcharge | `SetPageOverride` |
| `SetLogoRules` | `clearSpaceRatio`, `minSizePx`, `minSizeMm`, `expect?` | Règles du logo (10–50 %) | idem |
| `ReorderPage` | `pageId`, `afterPageId \| null`, `expect?` | Déplace une page | `ReorderPage` ancienne place |
| `AddPage` | `type`, `pageId`, `afterPageId \| null`, `position?`, `title?`, `data?`, `overrides?` | Ajoute une page d'un type autorisé (ADR-019) | `RemovePage` avec `expect` = page créée |
| `RemovePage` | `pageId`, `expect?` | Supprime (confirmation requise côté interface) | `AddPage` **complet** : `pageId`, `type`, `position`, `title`, `data`, `overrides` de la page supprimée |
| `SelectScene` | `pageId`, `sceneId`, `finish`, `expect?` | Scène et finition d'une page mockup | idem |

**Identifiant de page (ADR-019)** : `pageId` est un UUID v7 généré par le **serveur** (ou le worker) avant l'appel à `apply`. `apply` ne génère jamais d'identifiant ni de valeur aléatoire ; un `AddPage` dont le `pageId` existe déjà échoue (`INVALID_COMMAND`). Le client et le copilote envoient `AddPage` sans `pageId` ; la route le complète avant validation finale.

Règles :
- Une commande invalide (schéma, cible inexistante, valeur hors limites) renvoie `422` **sans modification** ; un `expect` non vérifié renvoie `409 EXPECTATION_FAILED`.
- Toutes les chaînes sont normalisées (Unicode NFC, longueur bornée, aucun HTML).
- `hex` : `^#[0-9A-F]{6}$` (majuscules, normalisé à l'entrée).
- Le copilote n'a accès **qu'à ces commandes**.

Réponse de `POST /commands` : `200 { seq, document }` ; `409 REVISION_CONFLICT` si `baseSeq` n'est pas la tête (le client récupère l'état et relance).

Toutes les routes de cette section exigent l'action `document:command` de `can()` ; la liste complète des actions est fixée par l'ADR-025 (`08_SECURITY_PRIVACY.md` §4).

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
| `error` | `{ code }` — dont `CONFLICT` (ADR-022) |
| `done` | `{ usage: { tokensIn, tokensOut } }` |

**Concurrence (ADR-022)** : chaque commande du copilote est appliquée avec la tête courante comme `baseSeq`. Si une révision utilisateur est survenue depuis le début du tour, la commande suivante est refusée : le flux émet `error { code: 'CONFLICT' }` puis `done`, et le tour s'arrête. Les commandes déjà appliquées restent dans l'historique et sont annulables individuellement (`POST /revisions/:seq/undo`).

## 6. Service des assets (ADR-023)

`GET /assets/:id/content` :
1. Authentification puis `can(actor, 'asset:read', asset)` ; un asset non `clean` ou un original (`logo_original`) répond `404`.
2. Réponse `302` vers une **URL R2 présignée en lecture** de durée ≤ 5 min, générée avec les paramètres `response-content-type` (type vérifié par le scan) et `response-content-disposition: inline` (images) ou `attachment` (exports).
3. La réponse `302` porte `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`.

Le contenu est donc servi par le domaine R2, **sans aucun cookie de l'application**. Les SVG ne sont affichés **qu'en `<img>`** (aucun script n'y est exécuté). Le domaine R2 figure dans `img-src` et `connect-src` de la CSP (`08_SECURITY_PRIVACY.md` §3).

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
