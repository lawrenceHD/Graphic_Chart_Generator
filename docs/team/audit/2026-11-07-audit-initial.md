# Audit sécurité initial — Charta (R9, volet audit)

> Date : 2026-11-07. Branche `comp/j3-studio`. Auditeur : R9 (agent). Aucun code produit, lockfile ni `.gitignore` modifié.
> Convention : **CONSTATÉ** = observé ou reproduit ; **SUPPOSÉ** = déduit à la lecture, non reproduit (jamais bloquant).

## 1. Verdict

**Aucun bloquant** au sens du seuil du propriétaire : aucun secret réel dans l'historique Git, aucune faille critique/haute reproduite. 1 vulnérabilité moyenne (dépendance de développement), 5 points de dette, 3 risques à investiguer.

## 2. Résultats des outils (chiffres réels)

| Outil | Commande | Résultat |
|---|---|---|
| pnpm audit | `pnpm.cmd audit --prod` | 1 vulnérabilité **modérée** : `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99), chemin `apps/web > better-auth > drizzle-kit > @esbuild-kit/esm-loader > @esbuild-kit/core-utils > esbuild`. Serveur de dev uniquement, corrigé en `>=0.25.0`. |
| Gitleaks 8.30.1 | `gitleaks detect --redact --no-banner` | **206 commits scannés, 7,23 Mo, 0 fuite.** |
| Trivy 0.76 (vuln, secret, misconfig) | `trivy fs ...` (exclus : `node_modules`, `.next`, `dist`, `.git`, `corpus-reel`, `.claude/worktrees`, `gemini key.txt`) | `pnpm-lock.yaml` : 1 vuln MEDIUM (même esbuild 0.18.20, corrigé 0.25.0) ; `prototypes/studio/package-lock.json` : 0 ; **0 secret, 0 misconfiguration** (aucun Dockerfile/IaC détecté). Dépendances de dev masquées par défaut. |
| Semgrep | voir §6 | voir §6 |

Note outillage : un premier `trivy fs` sans exclusions a expiré (parcours de `.next/**/*.map`) ; il faut exclure les dossiers de build en CI.

## 3. Fichier `gemini key.txt` (CONSTATÉ, contenu non lu)

- `git ls-files | grep -i "gemini key"` : **aucun résultat** (non suivi).
- `git log --all --oneline -- "gemini key.txt"` : **aucun commit** (jamais dans l'historique).
- `git check-ignore -v` : ignoré par `.git/info/exclude:8` (règle **locale à ce clone**), et non par `.gitignore`.
- Conclusion : pas de fuite Git. Fragilité : la protection ne suit pas le dépôt (autre clone, autre machine, worktree : un `git add -A` l'ajouterait). Voir D-1.

## 4. Constatés

### Positifs vérifiés (preuves)
- **Assainissement SVG (SEC-14) reproduit** : `sanitizeSvg` (build `packages/svg-engine/dist`) exécuté sur 12 charges. REFUSÉS : `<script>`, `onload=`, DOCTYPE + entité externe (XXE), bombe d'entités, `use xlink:href` externe, `use href=data:`, `a href=javascript:`, `fill=url(http://...)`, `url()` obfusqué par échappement CSS (`\68ttp`), élément préfixé `s:script`. Le CDATA piégé `</title><script>` ressort **échappé** (`&lt;/title&gt;&lt;script&gt;`). Liste blanche d'éléments/attributs : `packages/svg-engine/src/sanitize/allowlists.ts:2-90`, CSS : `css.ts:24-31,51`.
- **Aucun `dangerouslySetInnerHTML`/`innerHTML`/`eval`** dans `apps/web/src` ni `prototypes` (grep).
- **IDOR (SEC-07/08)** : toutes les routes passent par `guardProject`/`guardAsset` (`apps/web/src/server/route-guard.ts:218-251`) qui appelle `authorize()` ; un actif absent et un actif étranger répondent 404 identiquement (`route-guard.ts:246-247`). L'appartenance est calculée côté serveur (`project-access.ts:10-36`), jamais depuis le client.
- **Service des assets (SEC-16)** : `content` refuse tout sauf `clean`, jamais `logo_original`, 302 vers URL R2 présignée, `nosniff`, `no-store` (`asset-routes.ts:351-371`).
- **Upload (SEC-11/12/13)** : taille déclarée signée dans l'URL présignée (`packages/storage/src/r2-storage.ts:67-74`, `content-length` signé), vérification `head` (`asset-routes.ts:333-338`), type par octets magiques côté worker (`apps/worker/src/scan.ts:88`), raster `limitInputPixels` + `failOn: warning` (`normalize.ts:22`), rasterisation SVG en processus fils avec `--permission`, lecture restreinte, tas 512 Mo, délai (`node-rasterizer.ts:68-76`).
- **Session invitée (SEC-10)** : jeton 256 bits, cookie signé HMAC-SHA-256, comparaison à temps constant, hachage SHA-256 en base (`guest-token.ts:93-119`) ; Turnstile ferme en cas d'échec (`turnstile.ts:146-149`) ; limitation par IP avant Turnstile (`guest-routes.ts:57-60`).
- **Appels IA** : URL fixe `generativelanguage.googleapis.com` (pas de SSRF, aucun hôte issu de l'utilisateur), clé en en-tête uniquement et expurgée des messages (`transport.ts:30,53-55,82`), données utilisateur neutralisées (`brand-analysis.ts:99-117`), sorties validées par Zod (`brand-analysis.ts:126-137`). Les `catch` de `packages/ai` renvoient des `Result` d'erreur (pas d'erreur avalée).
- **Secrets en dur** : aucune clé (`AIza…`, `sk-…`, clé privée PEM) dans le dépôt hors `.venv` tiers ; `.env*` ignorés, seul `.env.example` suivi.
- **CSP** : nonce + `strict-dynamic`, `unsafe-eval` seulement en `development` (`apps/web/src/security-headers.ts:24-33`).
- **Mutations** : Origin exigé sur toute méthode non-GET (`route-guard.ts:210-213`, `http.ts:33-38`).

### Dette (moyen/bas, non bloquante)

| ID | Criticité | Constat | Preuve | Correction proposée | Vérification |
|---|---|---|---|---|---|
| D-1 | Moyen | `gemini key.txt` protégé uniquement par `.git/info/exclude` (local). | `git check-ignore -v` -> `.git/info/exclude:8`; absent de `.gitignore`. | Ajouter `gemini key.txt` (et `*key*.txt`) à `.gitignore`, déplacer la clé hors du dépôt (variable d'environnement), **faire pivoter la clé** par prudence si le fichier a pu être partagé. Gitleaks en hook pré-commit (SEC-21 le prévoit, à confirmer présent). | `git check-ignore "gemini key.txt"` renvoie `.gitignore`. |
| D-2 | Moyen | SEC-18 non appliqué : `AI_DAILY_BUDGET_EUR` n'est que validé (`packages/contracts/src/env.ts:53`), aucun compteur/plafond de coût. Seule borne : 5 analyses/h (invité), 30/jour (compte) par identité et par IP (`analysis-routes.ts:55-57,122-125`). | `grep AI_DAILY_BUDGET` : 0 usage hors env et tests. | Implémenter le plafond quotidien avant ouverture publique ; refus propre à l'atteinte. | Test : au-delà du plafond, `/analyze` répond 429/`AI_BUDGET`. |
| D-3 | Moyen | esbuild vulnérable (dev seulement) via `drizzle-kit` transitif de `better-auth`. | pnpm audit + Trivy. | `pnpm.overrides` esbuild `>=0.25` (via pnpm, jamais édition manuelle du lockfile, ADR-026) ou attendre la mise à jour amont. | `pnpm audit --prod` : 0. |
| D-4 | Bas | `claimGuestSession` ne revérifie pas `claimedByUserId IS NULL` dans la transaction ; deux réclamations concurrentes avec le même cookie pourraient s'écraser (le dernier compte l'emporte). Exige de posséder le cookie invité, donc auto-infligé. | `guest-service.ts:158-176` (contrôle fait avant, dans `guestActorFromCookie`, pas dans le `WHERE` de l'update). | Ajouter `isNull(claimedByUserId)` au `UPDATE guest_sessions ... RETURNING` et abandonner la transaction si 0 ligne. | Test de réclamation concurrente. |
| D-5 | Bas | Le secret HMAC du cookie invité réutilise `AUTH_SECRET` (séparé par étiquette). | `context.ts` (`guestSecret: env.AUTH_SECRET`). | Variable `GUEST_COOKIE_SECRET` dédiée (rotation indépendante). | Démarrage échoue si absente. |
| D-6 | Bas | `sharp` (normalisation raster) tourne dans le processus worker, non isolé comme le SVG (SEC-15 vise le SVG ; SEC-13 couvre les limites). | `scan.ts:67`, `normalize.ts`. | Documenter ; envisager fils/conteneur si le trafic ouvre. | Revue d'architecture. |

## 5. Risques à investiguer (SUPPOSÉS, non reproduits, non bloquants)

| ID | Criticité estimée | Hypothèse | Pourquoi non confirmé | Comment vérifier |
|---|---|---|---|---|
| R-1 | Moyen | **Contournement des limites de débit par `X-Forwarded-For` forgé** : `clientIp()` prend la **première** entrée (`apps/web/src/server/http.ts:77-81`), que le client peut préfixer si l'hébergeur ajoute au lieu de remplacer. Affecte limite de création de sessions invitées (5/h/IP), uploads, analyses (donc budget IA, cf. D-2). | Dépend de l'hébergeur (Vercel remplace l'en-tête ; un proxy qui ajoute le rend forgeable). Non déployé, donc non testable. | En préproduction : envoyer `X-Forwarded-For: 1.2.3.<n>` avec des valeurs changeantes et vérifier que le 6e `POST /guest-sessions` reste en 429. Sinon lire l'IP depuis l'en-tête de confiance de l'hébergeur (ou la dernière entrée ajoutée par notre proxy). |
| R-2 | Bas-moyen | Limite `sign-in` de Better Auth « par IP » (`auth.ts:53`) soumise au même risque XFF. | Idem R-1. | Idem, sur `/api/auth/sign-in/email`. |
| R-3 | Bas | Export (`export-files.ts`, `logo-kit-export.ts`) : génération côté client ; contenu issu des SVG assainis. Chemins/noms de fichiers du ZIP à contrôler (zip-slip lors de la réouverture) et injection de formules si CSV. | Lecture partielle seulement. | Test avec nom de marque `../../x`, `=cmd|...` ; vérifier l'assainissement des noms d'entrées ZIP. |

## 6. Semgrep

### 6.1 Résultat (CONSTATÉ)

Semgrep 1.184.0 (venv hors dépôt, `PYTHONUTF8=1`), règles `p/typescript` + `p/nextjs` + `p/owasp-top-ten`, sur `apps/*/src` et `packages/*/src` hors tests : **288 fichiers analysés, 0 résultat, 0 erreur**. Un premier essai sur `apps packages` entiers n'a pas abouti en 35 min (arrêté, exit 255) ; l'exécution restreinte aux sources (`--max-target-bytes 300000 --timeout 10 --jobs 2`) a abouti. Aucun résultat à trier (0 reproduit, 0 faux positif, 0 à investiguer). Limite : tests et fichiers > 300 Ko exclus.

## 6.2 Mise à jour (reprise, HEAD 29090d2)

- **Gitleaks historique** : 262 commits, 7,89 Mo, **0 fuite** (premier scan : 206 commits).
- **Gitleaks arbre de travail** (`gitleaks dir`, exclusions node_modules, .next, dist, .claude/worktrees, corpus-reel, .cache, `gemini key.txt`, .venv, lockfile) : 22,76 Mo, **2 résultats `generic-api-key`** : `.env.local` et `prototypes/studio/.env.local`. Les deux fichiers sont ignorés par Git (`.gitignore:17`, `prototypes/studio/.gitignore:5`) et non suivis (0 fichier `env.local` dans `git ls-files`) : secrets locaux attendus, **pas une fuite**. Valeurs non copiées.
- **D-1 corrigé** : `gemini key.txt` figure dans `.gitignore:56`.
- **R-1/R-2 (X-Forwarded-For) corrigés** : `clientIp(request, hops)` lit la n-ième entrée **depuis la droite** et renvoie `null` si `TRUSTED_PROXY_HOPS` = 0 (`http.ts:83-90`) ; `trustClientIp` supprime et réécrit l'en-tête lu par Better Auth (`client-ip.ts:17-27`). Valeur invalide = erreur au démarrage. Tests `rate-limiter`, `guest-routes`, `auth-flow`, `login-throttle`, `project-routes` : 36 tests verts. A vérifier au déploiement : la valeur réelle de `TRUSTED_PROXY_HOPS` de l'hébergeur.
- **D-4 corrigé** : `claimGuestSession` verrouille l'utilisateur, contrôle le quota (`QUOTA_PROJECTS`) et ferme la session par `UPDATE ... WHERE claimed_by_user_id IS NULL RETURNING` (un seul gagnant) ; tests verts.
- **Recherche rejouable (NOUVEAU)** : `RESEARCH_REPLAY_FILE`, `RESEARCH_CORPUS_DIR`, `RESEARCH_RECORD_DIR` viennent de l'environnement de l'opérateur (Zod, `index.ts:53-55`), jamais d'une entrée utilisateur : pas de traversée exploitable à distance. Lecture : `join(dir, name)` avec `name` issu de `readdir` (`corpus.ts:35-44`) ; écriture : nom de fichier dérivé de la clé par `replaceAll(/[^A-Za-z0-9_-]/gu,'_')` (`corpus.ts:57`), donc ni `.` ni séparateur. Injection de prompt : enregistrements en Zod `strict` aux longueurs bornées (`replay/recording.ts`), puis `cleanDirection` applique `looksLikeInjection` et `sanitizeUntrusted` aux insights (`run-research.ts:79-91`). Aucune faille constatée. Dette basse R-4 : `readdir(root, {recursive:true})` suit l'arborescence du corpus privé sans plafond de taille/nombre (opérateur seulement).

## 7. Hors périmètre / non fait
- Pas d'exécution dynamique de l'application ni de test d'intrusion réseau (aucun déploiement).
- Pas de démarrage de Docker (démon éteint, consigne).
- `gitleaks dir` sur l'arbre de travail non lancé (150+ Mo de `node_modules`, machine saturée) ; l'historique complet est couvert.
- Dépendances de développement non auditées par Trivy (masquées par défaut).
