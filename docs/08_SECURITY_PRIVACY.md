# 08 — Sécurité et confidentialité

> Statut : **validé** — Version 4.1 — 2026-10-17
> Remplace : `SECURITY_COMPLIANCE.md`. Décisions : ADR-014, ADR-023, ADR-024, ADR-025.
> Chaque contrôle porte un identifiant `SEC-xx` et est **vérifié par un test ou une revue** (`10_QUALITY.md`).

## 1. Actifs et menaces

| Actif | Menace principale | Contrôles |
|---|---|---|
| Comptes utilisateurs | Vol de session, force brute | SEC-01 à SEC-06 |
| Logos et briefs (propriété intellectuelle) | Accès par un tiers (IDOR), fuite | SEC-07 à SEC-10 |
| Serveur (exécution) | SVG/PDF/DOCX piégés, bombes de décompression, rendus falsifiés par le navigateur | SEC-11 à SEC-17, SEC-26 |
| Budget IA | Abus, scripts, boucle de coût | SEC-18 à SEC-20 |
| Clé IA, secrets | Fuite dans le code ou les logs | SEC-21 à SEC-23 |
| Disponibilité | Déni de service, file saturée | SEC-24, SEC-25 |

## 2. Contrôles

### Authentification et sessions
- **SEC-01** Mots de passe hachés avec **Argon2id**, ou à défaut scrypt/bcrypt avec les paramètres recommandés par l'OWASP si la bibliothèque retenue ne propose pas Argon2id (décision et paramètres figés au spike T-013, jamais de hachage rapide type SHA). Longueur minimale 10 caractères ; vérification contre une liste de mots de passe compromis si disponible.
- **SEC-02** Session en cookie `HttpOnly; Secure; SameSite=Lax`, stockée en base, rotation à la connexion, durée glissante de 30 jours, révocation à la déconnexion et au changement de mot de passe.
- **SEC-03** Vérification de l'e-mail obligatoire avant l'export et le partage.
- **SEC-04** Réinitialisation de mot de passe par lien à usage unique, expiration 30 min, réponse identique que l'e-mail existe ou non.
- **SEC-05** Limitation des tentatives de connexion : 5 échecs par 15 min par compte et par IP, délai croissant.
- **SEC-06** CSRF : vérification de `Origin` sur toute mutation, `SameSite=Lax`.

### Autorisation
- **SEC-07** **Une seule fonction `can(actor, action, resource)`** décide de tout accès. Toute route et action serveur l'appelle **avant** toute lecture ou écriture.
- **SEC-08** Test automatisé **par route** : un acteur A ne peut ni lire, ni modifier, ni supprimer une ressource de B (réponse `404`, pas `403`, pour ne pas révéler l'existence).
- **SEC-09** Les identifiants sont des UUID v7 non devinables ; les liens de partage et jetons sont aléatoires (≥ 128 bits), **stockés hachés**.
- **SEC-10** Session invitée : cookie signé (HMAC-SHA-256), jeton aléatoire, hachage en base, accès limité à son propre projet.

### Fichiers téléversés
- **SEC-11** Upload par **URL présignée** de courte durée (5 min), taille limitée côté stockage, clé d'objet générée par le serveur. L'asset reste `quarantined` jusqu'à validation.
- **SEC-12** Type déterminé par les **octets magiques** (PNG, JPEG, WebP, SVG) ; extension et `Content-Type` annoncés sont ignorés.
- **SEC-13** Limites : tailles et dimensions du `01_PRODUCT_MVP.md` §3 ; `limitInputPixels` pour les rasters.
- **SEC-14** SVG : assainissement par **liste blanche** et reconstruction de l'arbre (`05_ENGINES.md` §3). Aucun `DOCTYPE`, aucune entité, aucune référence externe.
- **SEC-15** Rasterisation SVG dans un **processus isolé** (pas de réseau, mémoire et délai plafonnés).
- **SEC-16** Service des assets (ADR-023) : `GET /api/v1/assets/:id/content` vérifie la session puis `can(actor, 'asset:read', asset)` et répond `302` vers une **URL R2 présignée en lecture** (durée ≤ 5 min, `Content-Type` et `Content-Disposition: inline` imposés par la signature, `Cache-Control: private`). L'asset est donc servi depuis l'**origine R2, distincte et sans cookies** de l'application ; il n'y a pas de sous-domaine `assets.`. Affichage en `<img>` uniquement (un SVG en `<img>` n'exécute aucun script). Seuls les assets `clean` sont servis ; **les originaux ne sont jamais servis.**
- **SEC-17** (*Could*, brief PDF/DOCX) Extraction dans un worker isolé : délai 20 s, plafond mémoire, limite de pages (40), plafond de ratio de décompression pour les archives (DOCX) ; aucun contenu actif exécuté.
- **SEC-26** Tout rendu produit par le navigateur et téléversé (`mockup_render`) suit **SEC-11 à SEC-13** : URL présignée, quarantaine, job `asset.scan`, octets magiques PNG, dimensions attendues, normalisation raster. Il n'est intégré à aucun export tant qu'il n'est pas `clean` (`06_MOCKUP_ENGINE.md` §4.4).

### IA et budget
- **SEC-18** Plafonds `AI_DAILY_BUDGET_EUR` et par utilisateur (`07_AI_COPILOT.md` §2) ; refus propre à l'atteinte.
- **SEC-19** Contenu utilisateur traité comme **donnée** (balises, échappement) ; sorties du modèle validées par Zod ; jamais exécutées.
- **SEC-20** Le copilote n'accède qu'aux commandes typées ; actions destructrices confirmées.

### Secrets
- **SEC-21** Aucun secret dans le dépôt (`gitleaks` en CI et en hook pré-commit). `.env` ignoré par Git.
- **SEC-22** Secrets validés au démarrage ; absents des logs, des réponses d'erreur et des journaux d'erreurs (scrubbing Sentry).
- **SEC-23** Clés avec privilèges minimaux (clé R2 limitée au bucket, clé IA limitée au projet), rotation tous les 6 mois et après tout incident.

### Disponibilité
- **SEC-24** Limites de débit par identité **et** par IP (`04_API_CONTRACTS.md` §7).
- **SEC-25** Cloudflare Turnstile sur création de session invitée et inscription.

## 3. En-têtes HTTP

Appliqués par le proxy de l'application (`proxy.ts`, nom du middleware depuis Next.js 16), sur **toutes** les pages (ADR-024) :

```
Strict-Transport-Security: max-age=63072000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY            (et frame-ancestors dans la CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<aléa par requête>' 'strict-dynamic' https://challenges.cloudflare.com;
  style-src-elem 'self' 'nonce-<aléa par requête>';
  style-src-attr 'unsafe-inline';
  img-src 'self' data: blob: https://<compte>.r2.cloudflarestorage.com;
  font-src 'self';
  connect-src 'self' https://<compte>.r2.cloudflarestorage.com;
  frame-src https://challenges.cloudflare.com;
  object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- **Rendu dynamique partout** (ADR-024) : une CSP à nonce impose un rendu par requête ; toutes les pages, landing comprise, sont rendues dynamiquement. Aucune page n'est pré-rendue sans nonce.
- **Dérogation unique** : `style-src-attr 'unsafe-inline'` autorise les **attributs** `style` produits par React et Motion. Les éléments `<style>` et tous les scripts restent soumis au nonce. Aucun `'unsafe-inline'` dans `script-src` ni `style-src-elem`, aucun `'unsafe-eval'`. `X-XSS-Protection` n'est **pas** utilisé (obsolète).
- L'endpoint R2 figure dans `img-src` (redirections de SEC-16) et `connect-src` (envois par URL présignée).
- Tout autre assouplissement est consigné par un ADR avec sa justification.
- La CSP est vérifiée en CI (test Playwright : aucune violation de CSP sur les parcours principaux).

## 4. La fonction `can()`

```ts
type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; guestSessionId: string }
  | { kind: 'share'; projectId: string }      // lecture seule
  | { kind: 'system' };

type Action =
  | 'project:create' | 'project:read' | 'project:write' | 'project:delete'
  | 'asset:create' | 'asset:read'
  | 'document:command' | 'copilot:use'
  | 'export:create' | 'export:read'
  | 'share:create' | 'share:revoke' | 'share:read'
  | 'account:delete' | 'guest:claim';

can(actor: Actor, action: Action, resource): boolean
```

Matrice (ADR-025) — toute combinaison absente est **refusée par défaut** :

| Acteur | Actions autorisées |
|---|---|
| Utilisateur propriétaire ou membre `editor` du workspace | Toutes les actions de projet : `project:*`, `asset:*`, `document:command`, `copilot:use`, `export:*`, `share:*` |
| Membre `viewer` | `project:read`, `asset:read`, `export:read` |
| Lien de partage (`share`) | `project:read`, `asset:read`, `share:read` — sur **son seul** projet |
| Session invitée (`guest`) | Sur **son seul** projet : `project:read`, `project:write`, `asset:create`, `asset:read`, `document:command`. Pas de `copilot:use`, `export:create` ni `share:create` (compte à e-mail vérifié requis, SEC-03) |
| Utilisateur authentifié (hors projet) | `project:create`, `account:delete`, `guest:claim` |
| Session invitée (hors projet) | `project:create` dans la limite d'un projet (`01_PRODUCT_MVP.md` §3) |
| `system` (worker uniquement) | `project:read`, `project:write`, `asset:create`, `asset:read`, `export:create`, `export:read` |

`export:create` et `share:create` exigent en plus un e-mail vérifié (SEC-03). Le code appelant ne contient **aucune** logique d'autorisation propre.

## 5. Confidentialité et RGPD

> Ce document est une base technique. Les textes juridiques (CGU, politique de confidentialité, mentions légales) doivent être **relus par un juriste** avant la bêta publique, selon le pays d'établissement de l'éditeur et les marchés visés.

1. **Minimisation** : on collecte l'e-mail, le contenu des projets et les événements d'usage nécessaires au fonctionnement et au plafonnement des coûts. Pas de pistage publicitaire.
2. **Finalités et bases légales** documentées dans un registre des traitements interne.
3. **Sous-traitants** (liste publiée) : hébergeur du serveur, stockage objet, fournisseur d'e-mail transactionnel, fournisseur d'IA, anti-bot, service de suivi d'erreurs. Un accord de traitement (DPA) est signé ou accepté avec chacun.
4. **Transferts hors de l'UE** : identifiés par sous-traitant et encadrés selon le cas (à documenter à la signature des DPA).
5. **Fournisseur d'IA** : les conditions du palier **payant** sont relues (conservation, entraînement, usage commercial) et reflétées **fidèlement** dans la politique. Aucune promesse « jamais utilisé pour entraîner » sans fondement contractuel vérifié.
6. **Droits** : accès, export, rectification, suppression. La suppression de compte efface base et stockage sous 24 h (`03_DATA_MODEL.md` §6). L'effacement dans les sauvegardes intervient à l'expiration de leur rétention (14 jours), indiqué dans la politique.
7. **Cookies** : uniquement fonctionnels (session, anti-bot). Aucun traceur tiers tant qu'aucun besoin n'est justifié ; sinon bannière de consentement.
8. **Contenu de tiers** : les utilisateurs téléversent des logos. Les CGU leur font garantir leurs droits ; une **procédure de signalement et de retrait** est publiée.
9. **Propriété** : l'utilisateur conserve ses droits sur ses logos. Les droits sur les contenus générés (textes, mises en page) et sur les scènes de mockup (photos sous licence) sont formulés **prudemment** dans les CGU ; aucune promesse de « 100 % des droits ».
10. **Violation de données** : procédure de réponse documentée (détection, évaluation, notification dans les délais légaux).

## 6. Revue de sécurité

- Avant chaque jalon : revue du chef de projet sur la checklist ci-dessous.
- Avant la bêta : audit externe léger ou revue approfondie des routes d'upload, d'authentification et d'export.

Checklist de revue d'un ticket :
- [ ] Toute route appelle `can()` avant tout accès.
- [ ] Toute entrée traverse un schéma Zod.
- [ ] Aucune donnée utilisateur dans les logs.
- [ ] Aucun HTML ni SVG utilisateur injecté dans le DOM.
- [ ] Aucune requête SQL construite à la main.
- [ ] Les erreurs ne divulguent rien d'interne.
- [ ] Un test d'accès non autorisé existe.
