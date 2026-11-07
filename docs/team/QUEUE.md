# QUEUE — demandes entre rôles

> Un rôle qui a besoin d'une modification hors de son périmètre l'écrit ici. Le propriétaire du fichier la traite.
> Format : `- [ ] <de> → <vers> : <demande> (critère de fin : …)`

- [ ] R6 → R5 : brancher les écrans sur les endpoints suivants (critère de fin : parcours inscription, connexion, « Mes projets », création et rattachement testés au navigateur).
  - **Inscription** : `POST /api/auth/sign-up/email` `{ email, password (10 à 128 car.), name }` → `200`, **sans cookie** (`autoSignIn: false`, pas d'énumération de comptes : un e-mail déjà pris répond identiquement). Enchaîner **immédiatement** `POST /api/auth/sign-in/email` `{ email, password }` → `200` + cookie de session `HttpOnly`.
  - **Connexion** : `POST /api/auth/sign-in/email` ; `401` identifiants invalides (message identique compte inconnu ou mot de passe faux) ; `429` + `Retry-After` après 5 échecs / 15 min (par IP et par compte, code `TOO_MANY_ATTEMPTS`).
  - **Déconnexion** : `POST /api/auth/sign-out` `{}` ; **session** : `GET /api/auth/get-session` (`null` si déconnecté). Toute mutation exige l'en-tête `Origin` = `APP_URL` (le navigateur l'envoie avec `fetch` same-origin).
  - **Rattachement invité** : après la connexion, `POST /api/v1/guest-sessions/claim` `{}` → `200 { claimed: n }` et efface le cookie invité ; appeler une fois, sans erreur si `claimed = 0`.
  - **Liste** : `GET /api/v1/projects?limit=<1..50, défaut 20>&cursor=<uuid>&q=<titre>` → `200 { items: [{ id, title, industryLabel, language, briefText, status, createdAt, updatedAt }], nextCursor: uuid | null }` ; `401` sans session. Tri du plus récent au plus ancien.
  - **Création** : `POST /api/v1/projects` `{ title (1..120), industryLabel?, language: 'fr'|'en', briefText? }` → `201 { project }`. Erreurs RFC 9457 (`application/problem+json`, champ `code`) : `QUOTA_PROJECTS` (`403`, compte gratuit à 3 projets : afficher l'appel vers les tarifs ; supprimer un projet libère une place), `FORBIDDEN` (`403`, invité ayant déjà son projet), `UNAUTHENTICATED` (`401`), `INVALID_BODY` (`400`).
  - **Suppression** : `DELETE /api/v1/projects/:id` → `204`.
  - Limite : `QUOTA_PROJECTS` et le décompte (3) sont dans `apps/web/src/server/plans.ts`, pas dans `contracts` ; ne pas dupliquer le nombre 3 dans l'interface, l'afficher depuis la réponse d'erreur (`detail`) ou une page statique.
