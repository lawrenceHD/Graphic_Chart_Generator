# 14 — Journal des décisions d'architecture (ADR)

> Les ADR sont **immuables**. Pour changer une décision, on ajoute un nouvel ADR qui **remplace** le précédent (statut « Supersedé par ADR-0xx »).
> Date de toutes les décisions initiales : 2026-10-07. Statut : **Accepté** sauf mention.

---

## ADR-001 — TypeScript partout, monorepo, abandon de Spring Boot
**Contexte** : le corpus v3 décrivait deux backends (Spring Boot et Next.js/Node). Un seul développeur plus un agent de code ; les bibliothèques d'image, de vectorisation et de rendu de l'écosystème Node/WASM sont riches ; les contrats (Zod) se partagent entre client, serveur et worker.
**Décision** : monorepo pnpm + Turborepo, TypeScript strict, Next.js (web) et Node (worker). Spring Boot est abandonné et archivé.
**Conséquences** : un seul langage et des types partagés ; le code Java existant est perdu (≈ 2 jours de scaffolding) ; la sécurité d'entreprise repose sur la discipline du projet (`can()`, tests d'accès) plutôt que sur un framework.
**Alternatives rejetées** : Spring Boot + Next.js (double dérive de contrats, double outillage) ; Python pour le rendu (runtime supplémentaire sans besoin avéré).

## ADR-002 — Politique de versions
**Contexte** : Spring Boot 3.3 hors support depuis 2025, Next.js 15 en fin de support le 2026-10-21 ; les noms et quotas de modèles IA changent vite.
**Décision** : utiliser les **dernières versions stables** au moment de T-001, **épinglées exactement** dans le fichier de verrouillage ; Node.js LTS ; Next.js sur la branche active ; revue mensuelle des versions de support ; le modèle IA est **configuré** par variable d'environnement.
**Conséquences** : une revue mensuelle obligatoire ; les API de bibliothèque sont vérifiées dans la version installée (`AGENTS.md` §3).

## ADR-003 — PostgreSQL, Drizzle ORM, UUID v7
**Décision** : PostgreSQL ; Drizzle ORM + drizzle-kit (migrations versionnées) ; UUID v7 générés par l'application ; colonnes `jsonb` validées par Zod ; verrouillage optimiste par `seq`/`version`.
**Conséquences** : pas de synchronisation de schéma automatique en production ; migrations rétro-compatibles d'une version.
**Alternatives rejetées** : Supabase géré (pause d'inactivité, couplage) ; Prisma (poids, générateur) ; UUID v4 (mauvais pour les index et la pagination par curseur).

## ADR-004 — Hébergement : VPS + Docker Compose + Caddy
**Contexte** : le worker a besoin de processus longs, de mémoire et de Chromium ; le plan gratuit d'un hébergeur serverless est réservé à un usage non commercial et plafonne la taille des requêtes ; le « 0 € » de l'ancien corpus ne tient pas.
**Décision** : un VPS (4 vCPU / 8 Go de départ), Docker Compose, Caddy pour TLS et en-têtes, Cloudflare en DNS/proxy, `staging` et `prod` séparés.
**Conséquences** : coût mensuel réel assumé ; exploitation (mises à jour, sauvegardes) à notre charge, cadrée par `11_INFRA_COSTS.md`.
**Alternatives rejetées** : serverless pour tout (worker impossible) ; Kubernetes (surdimensionné).

## ADR-005 — File de tâches : pg-boss dans PostgreSQL
**Décision** : pg-boss ; pas de Redis. Jobs idempotents, 3 tentatives avec recul exponentiel.
**Conséquences** : une dépendance de moins ; débit limité (largement suffisant) ; migration vers un autre système possible derrière une interface.
**Alternatives rejetées** : BullMQ + Redis (interrogation continue, composant supplémentaire).

## ADR-006 — IA : API payante derrière un port, modèle configurable
**Décision** : le produit appelle l'**API Gemini payante** (clé dédiée, facturation activée) via `AiPort`. L'abonnement grand public sert au développement uniquement. Modèle dans `AI_MODEL`. Plafonds budgétaires obligatoires. Sorties structurées validées par Zod. Tests par enregistrement/rejeu.
**Conséquences** : coût variable mesuré ; conditions d'usage et de confidentialité du palier payant à relire avant la bêta ; fournisseur interchangeable.
**Alternatives rejetées** : palier gratuit (quotas instables, usage commercial et données potentiellement non conformes) ; modèle local (qualité inférieure).

## ADR-007 — Document unique + commandes typées (pas de JSON Patch libre)
**Décision** : un projet = un document JSONB ; toute modification = une **commande** typée (Zod) appliquée par une fonction pure retournant `{doc, inverse}` ; révisions numérotées ; annulation par application de l'inverse ; pages adressées par `id`.
**Conséquences** : liste blanche naturelle pour le copilote ; undo/redo simple ; conflits détectables (`baseSeq`) ; chaque nouvelle capacité d'édition exige une nouvelle commande.
**Alternatives rejetées** : JSON Patch RFC 6902 généré par l'IA (chemins fragiles, pas de liste blanche) ; tables de pages séparées (transactions multi-lignes, historique complexe).

## ADR-008 — Mockups : rendu navigateur (WebGL), scènes produites en 3D
**Décision** : le rendu est un module navigateur (`mockup-engine`) ; les scènes sont produites sous Blender (ou images sous licence maîtrisée) avec quadrilatère exporté par script ; trois scènes planes au MVP ; export 3840 × 2160 par rendu local, téléversé et indexé par hash.
**Conséquences** : pas de rendu 4K serveur au MVP ; variabilité de GPU à gérer (repli par tuiles) ; un rendu serveur par Chromium pourra réutiliser le même module (backlog).
**Alternatives rejetées** : Sharp seul (pas de transformation de perspective) ; génération d'images par IA (déformation des logos et du texte) ; OpenCV côté serveur (poids et gain faible pour des plans).

## ADR-009 — PDF : Chromium dans le worker, livrable RVB « de référence »
**Décision** : le PDF est produit en imprimant dans Chromium la route interne `/print/[id]`, qui utilise les **mêmes composants** que l'éditeur. Livrable étiqueté **« PDF de référence (RVB) »** ; les valeurs CMJN sont présentées en texte. Le PDF/X avec profil de sortie est au backlog.
**Conséquences** : un seul rendu (pas de divergence éditeur/PDF) ; texte et SVG restent vectoriels ; Chromium consomme de la mémoire (concurrence limitée).
**Alternatives rejetées** : `@react-pdf/renderer` (deuxième moteur de mise en page, RVB seulement, SVG partiel) ; génération PDF côté serveur Java (abandonné avec ADR-001).

## ADR-010 — Authentification par cookies de session
**Décision** : sessions en base, cookie `HttpOnly; Secure; SameSite=Lax` ; **aucun jeton dans `localStorage`** ; SSE par `fetch` (pas `EventSource` avec en-tête) ; bibliothèque candidate Better Auth, **confirmée ou remplacée par le spike T-013** (alternative Auth.js). Mode invité par session signée distincte.
**Conséquences** : même domaine enregistrable pour l'application et l'API ; protection CSRF par `Origin`.
**Alternatives rejetées** : JWT Bearer dans le navigateur (exposé au XSS, incompatible avec `EventSource`).

## ADR-011 — SVG : liste blanche, reconstruction, refus des textes
**Décision** : assainissement par liste blanche d'éléments et d'attributs avec reconstruction de l'arbre ; `DOCTYPE` et entités refusés ; références uniquement locales ; `<text>` refusé au MVP (rendu non déterministe sans polices) avec message d'aide ; rasterisation dans un processus isolé.
**Conséquences** : certains logos légitimes sont refusés avec une explication ; la règle sera revue après les retours de la bêta.
**Alternatives rejetées** : liste noire (contournable) ; DOMPurify seul (ne couvre pas le XXE ni le rendu côté serveur).

## ADR-012 — Couleur : OKLab, histogramme, CMJN par ICC uniquement
**Décision** : extraction par histogramme exact + fusion par ΔE_OK (déterministe) ; OKLCH pour dériver, mapper le gamut et produire les échelles ; WCAG pour les contrastes ; CMJN **uniquement** par profil ICC (spike T-010), masqué si indisponible ; **Pantone hors MVP**.
**Conséquences** : pas de K-Means (non déterministe) ; libellés honnêtes (« indicatif ») ; vecteurs de référence externes.
**Alternatives rejetées** : K-Means en RVB ; formule RVB→CMJN naïve ; table Pantone sans licence.

## ADR-013 — Stockage : Cloudflare R2, envois par URL présignée
**Décision** : fichiers dans R2 (API S3) ; envoi direct du navigateur par URL présignée de courte durée ; statut de quarantaine jusqu'au scan ; rendus identifiés par hash.
**Conséquences** : les fichiers ne transitent pas par l'application (limite de taille des requêtes) ; politique de purge nécessaire pour les rendus anciens.

## ADR-014 — Sécurité applicative
**Décision** : CSP avec nonces (pas d'`unsafe-eval`/`unsafe-inline`), fonction `can()` unique pour toute autorisation, tests d'accès générés par table de routes, limites de débit par identité **et** par IP, `gitleaks` en CI.
**Conséquences** : un test de table de routes oblige à déclarer chaque route ; toute dérogation à la CSP exige un ADR.

## ADR-015 — Méthode : tickets, agent de code, relais, revue
**Décision** : le chef de projet écrit des tickets avec tests d'acceptation exécutables ; l'agent applique `AGENTS.md` ; le propriétaire relaie ; verdict du chef de projet obligatoire avant fusion ; suivi honnête en trois statuts (spécifié, implémenté, vérifié).
**Conséquences** : discipline de découpage (tickets S/M) ; une session d'agent par ticket.
**Statut** : partiellement remplacé par ADR-026 (règle de session).

---

> ADR-016 à ADR-026 : date 2026-10-17, statut **Accepté**. Issus de l'audit complet du corpus v4 et de T-001 ; ils corrigent des contradictions de la spécification.

## ADR-016 — Pureté des packages et rasterisation isolée
**Contexte** : `AGENTS.md` déclarait `svg-engine` pur alors que T-008 lui fait lancer resvg dans un processus enfant ; `logo-kit`, déclaré pur, devait rasteriser « via T-008 » ; `mockup-engine` (navigateur) n'avait aucune interdiction des modules Node.
**Décision** : packages purs = `kernel`, `color-engine`, `document`, `logo-kit`, `svg-engine` **sauf** `src/raster/**`. Le port `Rasterizer` est un type de `contracts`. Son implémentation Node (processus enfant, resvg, sharp) vit dans `packages/svg-engine/src/raster/`, exportée sous le sous-chemin `@app/svg-engine/raster`, importée seulement par `apps/worker` (et les tests). `logo-kit` reçoit un `Rasterizer` en paramètre. `mockup-engine` est navigateur uniquement : aucun module Node.
**Conséquences** : les fonctions de `logo-kit` (dont `fidelityScore`) se testent avec un faux rasteriseur ; les règles de lint de pureté couvrent `svg-engine` hors `src/raster/` et interdisent les modules Node dans `mockup-engine`.
**Alternatives rejetées** : package `svg-raster` séparé (un package de plus pour un seul module) ; tolérer les effets de bord dans `logo-kit` (perte de testabilité).

## ADR-017 — Package `@app/kernel`
**Contexte** : `color-engine` ne dépend de rien et ne peut donc pas importer le type `Result` de `contracts` ; chaque package allait réinventer le sien.
**Décision** : nouveau package `packages/kernel`, pur, **zéro dépendance** : `Result<T, E>`, `ok`, `err`, `isOk`, `isErr`. Graphe : `kernel` → rien ; `contracts` → kernel ; `color-engine` → kernel ; `document` → kernel, contracts, color-engine ; `svg-engine` → kernel, contracts ; `logo-kit` → kernel, contracts, svg-engine, color-engine ; `mockup-engine` → kernel, contracts ; `db` → kernel, contracts ; `ai` → kernel, contracts, document ; `apps/*` → tous les packages.
**Conséquences** : un seul type d'erreur-valeur dans tout le dépôt ; dependency-cruiser applique ce graphe.
**Alternatives rejetées** : `Result` dans `contracts` (ferait dépendre `color-engine` de Zod) ; copie par package (dérive).

## ADR-018 — Annulation et rétablissement côté serveur
**Contexte** : « `/undo` applique l'inverse de la dernière révision utilisateur » faisait s'annuler deux annulations successives ; annuler une commande du copilote qui n'est pas la dernière appliquait un inverse périmé ; la pile de rétablissement côté client était perdue au rechargement.
**Décision** : toute commande accepte un champ facultatif `expect` (valeur attendue avant application ; sinon erreur `EXPECTATION_FAILED`, document inchangé). Les inverses calculées par `apply()` incluent **toujours** `expect`. La table `revisions` gagne `undo_of` et `redo_of` (`bigint`, nuls par défaut). `POST /undo` cible la dernière révision ni annulée ni elle-même une annulation ; `POST /redo` réapplique la commande d'origine de la dernière annulation non rétablie, et devient invalide dès qu'une révision normale l'a suivie ; `POST /revisions/:seq/undo` annule une révision précise (bouton du copilote). Échec d'attente → `409 UNDO_CONFLICT`, aucune modification. Historique persistant, au moins 50 niveaux.
**Conséquences** : annulation hors ordre sûre ; l'historique survit au rechargement ; les commandes et leurs schémas portent `expect`.
**Alternatives rejetées** : pile client (perdue au rechargement) ; transformation opérationnelle (complexité injustifiée pour un seul éditeur).

## ADR-019 — Ajout et suppression de pages
**Contexte** : l'inverse de `RemovePage` (« `AddPage` + données ») n'était pas exprimable, et `AddPage` aurait dû générer un identifiant dans une fonction pure.
**Décision** : `AddPage = { type, pageId, afterPageId, position?, title?, data?, overrides? }`. Le serveur fournit `pageId` (UUID v7) avant `apply()`, qui ne génère jamais d'identifiant. L'inverse de `RemovePage` est un `AddPage` portant le contenu et la position complets de la page supprimée.
**Conséquences** : `apply()` reste pur et déterministe ; la propriété aller-retour de T-003 couvre l'ajout et la suppression.
**Alternatives rejetées** : générateur d'identifiants injecté dans `apply()` (inverse non reproductible) ; commande `RestorePage` dédiée (doublon de `AddPage`).

## ADR-020 — Forme des valeurs de marque
**Contexte** : `BrandAnalysis.values` = 4 × `{ label, description }` mais `BrandDocument.brand.values` = 4 chaînes.
**Décision** : `brand.values` = 4 × `{ label ≤ 24, description ≤ 120 }`, même forme que `BrandAnalysis`.
**Conséquences** : la composition du document recopie l'analyse sans perte ; `SetBrandField` valide cette forme.
**Alternatives rejetées** : réduire l'analyse à 4 chaînes (perte de la description).

## ADR-021 — Règles de palette, d'échelles et de logo
**Contexte** : contradictions entre `05_ENGINES.md`, les tickets T-005, T-006, T-012 et les vecteurs de référence.
**Décision** :
- rôles **exclusifs**, attribués dans l'ordre `primary`, `accent`, `neutralDark`, `neutralLight`, `extra` (une grappe n'a qu'un rôle) ;
- étape 7 de l'extraction : les grappes sous `minShare` et le surplus au-delà de `maxClusters` sont **fusionnés** dans la grappe restante la plus proche ; les parts somment à 1 ;
- la propriété « toute couleur est à ΔE_OK < 0,04 du centre de sa grappe » se vérifie **avant** l'étape 7 ;
- teinte d'une couleur achromatique = `null` (forme des vecteurs de référence) ;
- la constance de teinte des échelles (±1°) se vérifie sur les valeurs OKLCH **avant** l'arrondi 8 bits ;
- recoloration du Do & Don't : teinte `(hp + 90 + 30k) mod 360` pour k = 0, 1, …, la première à ≥ 60° de toutes les teintes chromatiques de la palette, sinon celle qui maximise la distance minimale ;
- favicon : avertissement `FAVICON_EXTREME_ASPECT` si `W/H > 2` ou `W/H < 0,5`.
**Conséquences** : T-005, T-006 et T-012 deviennent exécutables sans BLOCKER ; les vecteurs de référence restent inchangés.
**Alternatives rejetées** : modifier les vecteurs de référence (interdit) ; complémentaire de l'accent pour la recoloration (retombe sur la teinte du `primary`).

## ADR-022 — Copilote et modifications concurrentes
**Contexte** : la gestion de `baseSeq` pendant un tour du copilote (jusqu'à 5 commandes) n'était pas spécifiée.
**Décision** : une révision utilisateur pendant un tour fait échouer la commande suivante du copilote (conflit de `seq`) ; le tour s'arrête avec l'événement `error { code: 'CONFLICT' }` ; les commandes déjà appliquées restent annulables.
**Conséquences** : aucune donnée de l'utilisateur n'est écrasée ; pas de verrou à gérer.
**Alternatives rejetées** : verrou du document pendant le tour (bloque l'utilisateur) ; rebasage automatique (complexité).

## ADR-023 — Service des assets et rendus de mockups
**Contexte** : trois façons de servir les assets étaient décrites (route applicative, sous-domaine `assets.`, domaine R2 dans la CSP) ; les rendus `mockup_render` téléversés par le navigateur n'étaient pas scannés.
**Décision** : `GET /api/v1/assets/:id/content` vérifie `can()` puis répond `302` vers une URL R2 présignée en lecture (≤ 5 min, `Content-Type` et `Content-Disposition` fixés à la signature). L'origine R2 est distincte et sans cookies. Le sous-domaine `assets.<domaine>` est supprimé. Les rendus `mockup_render` suivent le même flux d'envoi que les logos (URL présignée, quarantaine, `asset.scan` avec `normalizeRaster`, PNG aux dimensions attendues) avant tout usage.
**Conséquences** : la CSP liste le domaine R2 dans `img-src` ; aucun asset ne transite par l'application ; aucun rendu non vérifié n'atteint un PDF.
**Alternatives rejetées** : bucket public derrière un domaine personnalisé (pas d'autorisation par requête) ; proxy applicatif des octets (charge serveur).

## ADR-024 — CSP avec Next.js 16
**Contexte** : une CSP à nonce impose le rendu dynamique ; `style-src` sans `'unsafe-inline'` bloque les attributs `style` produits par React et Motion ; Next.js 16 renomme le middleware en `proxy.ts`.
**Décision** : toutes les pages, landing comprise, sont rendues dynamiquement avec un nonce par requête. `script-src 'self' 'nonce-…' 'strict-dynamic' https://challenges.cloudflare.com` ; `style-src-elem 'self' 'nonce-…'` ; **dérogation** `style-src-attr 'unsafe-inline'` (attributs `style` uniquement). Les en-têtes sont posés par `proxy.ts`.
**Conséquences** : pas de pré-rendu statique de la landing (coût acceptable sur VPS) ; la dérogation est limitée aux attributs, pas aux balises `<style>` ni aux scripts.
**Alternatives rejetées** : CSP par hash sur pages statiques (deux régimes à maintenir) ; `style-src 'unsafe-inline'` global.

## ADR-025 — Actions de `can()`
**Contexte** : la liste d'actions de `08_SECURITY_PRIVACY.md` §4 omettait la création de projet, le partage, le copilote et la suppression de compte ; avec le refus par défaut, ces routes auraient été bloquées.
**Décision** : actions = `project:create`, `project:read`, `project:write`, `project:delete`, `asset:create`, `asset:read`, `document:command`, `copilot:use`, `export:create`, `export:read`, `share:create`, `share:revoke`, `share:read`, `account:delete`, `guest:claim`. Règles par acteur dans `08_SECURITY_PRIVACY.md` §4 ; toute action non listée est refusée. Code de refus : **404** (jamais 403) quand l'acteur n'a pas le droit de lire la ressource, pour ne pas révéler son existence (SEC-08) ; **403** seulement quand l'acteur peut déjà lire la ressource mais pas exécuter l'action (par exemple une session invitée sur le copilote, l'export ou le partage, ou un lien de partage sur une route d'écriture). `10_QUALITY.md` §7 applique cette règle.
**Conséquences** : la table de routes (SEC-08) référence ces actions ; ajouter une capacité exige d'ajouter une action.
**Alternatives rejetées** : actions génériques `read`/`write` (trop larges pour le partage et le copilote).

## ADR-026 — Méthode de session et outillage de l'agent
**Contexte** : `CLAUDE.md` imposait une session continue et l'interdiction de toucher au lockfile, en contradiction avec ADR-015 et `AGENTS.md` ; `turbo` réécrit `AGENTS.md` quand il détecte un agent ; `.nvmrc` pointait Node 22 (LTS de maintenance).
**Décision** (remplace la règle de session d'ADR-015) : une session par ticket est recommandée ; une session continue est tolérée avec le protocole de transition de `CLAUDE.md`. La lecture des documents suit `AGENTS.md` §2. `pnpm-lock.yaml` n'est jamais édité à la main ; pnpm ne le modifie que pour une dépendance autorisée par le ticket. Node 24 (LTS active) dans `.nvmrc` ; `"agentGuidance": false` dans `turbo.json` ; hooks d'agent dans `tools/agent-hooks/`.
**Conséquences** : une seule règle de session ; `AGENTS.md` n'est plus modifié par l'outillage ; les violations d'`AGENTS.md` sont refusées dès l'écriture une fois les hooks activés.
**Alternatives rejetées** : imposer strictement une session par ticket (contraire à l'usage du propriétaire) ; installer ECC complet (coût en contexte, hooks inadaptés à Windows).

---

## Décisions ouvertes

| # | Sujet | Échéance |
|---|---|---|
| O-1 | Nom du produit (`13_NAMING.md`) | Fin de P0 |
| O-2 | Bibliothèque CMJN (spike T-010) | Début de P1 |
| O-3 | Outil de vectorisation (spike T-011) | Début de P1 |
| O-4 | Bibliothèque d'authentification (spike T-013) | Début de P2 |
| O-5 | Modèle de tarification et fournisseur de paiement (dépend du pays d'établissement) | P5 |
| O-6 | Auto-hébergement d'un PaaS (Coolify/Dokploy) ou script de déploiement | Fin de P2 |
| O-7 | Thème clair | Après la bêta |
| O-8 | Positionnement et marché africain (promesse « fichiers propres », kit WhatsApp/Facebook, paiement mobile money) — `docs/proposals/P-001b_RECHERCHE_DOCUMENTAIRE.md` | Avant la fin de la tranche 1 |
| O-9 | Brief guidé à la place du brief libre — `docs/proposals/P-002_BRIEF_GUIDE.md` | Avant T-014 |
| O-10 | Propositions d'architecture non tranchées : mockups rendus dans le worker ; aperçu local à la place du mode invité ; extraction des couleurs depuis le SVG ; ancrage de la couleur de base dans les échelles (exige des vecteurs de référence v3) | Avant P2 |
