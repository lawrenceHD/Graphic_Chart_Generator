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

## ADR-027 — Mode compétition GDG Fest et parcours de démonstration
**Contexte** : le projet est présenté au GDG Fest (prix du projet le plus innovant autour de l'IA), présélection le 2026-11-09. Plusieurs décisions du propriétaire (2026-10-23 → 2026-10-29, `journal/OWNER_DECISIONS.md`) contredisent des documents normatifs : thème sombre par défaut et landing gelée (`09` §1), facturation de l'API imposée (`07` §2), limite de 400 lignes (`AGENTS.md` §7).
**Décision** (jusqu'à la présélection, puis réexamen) :
1. **Tickets** : plus de 400 lignes autorisés ; restent obligatoires `pnpm verify` vert, tests et sabotage sur ce qui est calculé, zéro `any`, Zod aux frontières, logo jamais redessiné par une IA, rendu vérifié dans Chromium. Branches `comp/*` depuis `main`, avance rapide.
2. **Thèmes** : jour, nuit et système ; **système par défaut** (remplace `09` §1.2 ; clôt O-7).
3. **Landing** : celle de la maquette `prototypes/studio` est portée dans `apps/web` (remplace `09` §1.5).
4. **Une seule source de rendu des pages** : chaque page de la charte est un composant React pur du document ; le même code sert la toile du studio, `/print/[id]` et l'export PDF (Chromium du worker). Pages en **paysage 16:9 par défaut**, portrait par page (`PageOverrides.format`).
5. **Génération en direct** : événement SSE `document.page` par page composée, en plus de `analysis.done`.
6. **IA** : Gemini au **niveau gratuit** (texte et vision), adaptateur derrière `AiPort` avec sortie validée par Zod et adaptateur d'enregistrement/rejeu ; un **mode démo** rejoue une analyse enregistrée quand le quota ou le réseau manque. Toute action de l'IA passe par les commandes du document (annulable). Les choix de l'IA citent leurs preuves (mesures des moteurs, extraits du brief).
7. **Hébergement de démo** : projet Google Cloud séparé, essai gratuit, alerte de budget à 5 $ ; jamais de facturation sur le projet de la clé Gemini.
8. **Dépendances autorisées** : `motion`, `react-colorful`, `@google/genai`.
**Conséquences** : `09` §1.2, §1.5 et `07` §2 (facturation) sont supersédés pendant la compétition ; les addenda « à reporter » de `journal/OWNER_DECISIONS.md` font foi jusqu'à leur report dans `docs/`, prévu après la présélection.
**Alternatives rejetées** : rendus séparés pour la toile et le PDF (double maintenance, écarts visuels) ; génération d'images par l'IA pour les mockups (logo déformé, contraire au principe du produit) ; Gemini payant (pas de facturation pour l'instant).


## ADR-028 — Recherche de références sectorielles et direction artistique sourcée
**Contexte** : le propriétaire veut une charte et des mockups « niveau pro » (2026-10-29) : après analyse du logo, l'outil doit trouver comment les marques du même secteur présentent leur identité, et s'en servir pour une construction pointilleuse (plan des pages, mockups, mise en page, polices). Les 8 chartes réelles du corpus (Slack, BBC, Instacart, État, Data Terra, Nevers, CFDT, Porto) comptent **12 à 175 pages**, souvent en 16:9 ; le plan fixe de 10 pages et le catalogue fermé de 8 paires de polices (`07` §3.2) ne suffisent pas. Behance et Dribbble n'ont pas d'API de recherche ; la facturation Google est reportée.
**Décision** :
1. **Bibliothèque privée** : `tools/references/collect.py` collecte Pinterest par secteur (19 secteurs, `sectors.json`) dans `corpus-reel/pinterest/` (ignoré par Git, jamais redistribué ni montré comme notre travail). `analyze.py` indexe chaque image : **fiche Gemini vision** (`gemini-3.5-flash-lite`, sortie structurée) et **embedding d'image** (`gemini-embedding-2`, 768 dimensions), reprise possible, rythme du niveau gratuit.
2. **Vocabulaire partagé** : types, 30 sections de charte, styles, classes typographiques (`packages/contracts/src/reference.ts`), copie exacte de `tools/references/vocabulary.json` et des clés de `sectors.json`, vérifiée par test. Toute ligne de l'index est revalidée par Zod au chargement ; les lignes rejetées sont comptées, jamais ignorées en silence.
3. **Recherche** (`packages/ai`, `researchBrand`) : lecture du logo par Gemini (secteur, styles, classe du lettrage, police probable, mots-clés) et embedding **dans le même espace que la bibliothèque** ; classement par similarité visuelle (0,40), secteur (0,25), styles (0,20), palette ΔE OKLab (0,10), qualité (0,05), diversifié par MMR ; plancher de qualité 3/5. Sans embedding, le classement continue sans la similarité visuelle et le signale (`visual-similarity-unavailable`).
4. **Direction artistique sourcée** : plan de charte = sections communes à toutes les chartes du corpus + sections du secteur montrées par au moins 25 % des références retenues ; mockups classés par fréquence ; vote pondéré des classes typographiques, de l'espace blanc et du fond ; conseils de mise en page. **Chaque recommandation porte la liste des références qui la justifient** (preuve affichable dans le studio).
5. **Polices** : catalogue ouvert de Google Fonts (`tools/references/fonts.py`, 1 203 familles libres OFL/Apache, classification, scores expressifs et qualité des tags officiels `google/fonts`), sans les familles conçues d'abord pour le chinois, le japonais ou le coréen. `recommendPairings` propose 3 options réellement différentes, justifiées par les tags ; une seule famille en plusieurs graisses quand titre et texte partagent la même classe ; le texte courant exige un regular et un bold, jamais une écriture manuscrite ou une display ; la police du logo est exclue (elle reste celle du logo). Remplace le catalogue fermé `PAIRING_IDS` pour les nouvelles chartes (migration à faire avec le studio).
6. **Recherche approfondie à la demande** : `buildDeepQueries` écrit jusqu'à 8 requêtes propres à la marque (secteur, style, mockups prévus, lettrage, mots-clés) pour une collecte ciblée complémentaire.
7. **Client Gemini sans dépendance** : `fetch` + Zod (`createGeminiTransport`) ; clé uniquement dans l'en-tête `x-goog-api-key` ; 30 s, 2 nouvelles tentatives sur 429/5xx, arrêt immédiat `AI_QUOTA` sur quota journalier ; sortie invalide → une nouvelle tentative avec l'erreur jointe, puis `AI_OUTPUT_INVALID`. `@google/genai` (ADR-027) n'est pas nécessaire. `ai` peut dépendre de `color-engine` (dependency-cruiser).
**Conséquences** : `07` §3.2 (`typographyPairingId`) et le plan de pages de `compose.ts` sont à étendre ; les rendus des nouvelles sections (construction du logo, taille minimale, motif, papeterie, signalétique, menu, réseaux sociaux…) entrent dans le studio. Les clés de pages actuelles restent valides.
**Alternatives rejetées** : recherche Google en direct à chaque charte (quota gratuit de l'ancrage trop faible, résultats non structurés) ; API Behance/Dribbble (inexistantes) ; similarité par mots-clés seuls (rate le style visuel du logo) ; laisser le modèle choisir librement une police (noms inventés, licences inconnues).
## ADR-030 — Plans et quotas (paiement différé, O-5 ouvert)
**Contexte** : aucun mode de paiement ni table de plans n'existe ; la migration de base est interdite avant le 09/11 et O-5 (tarification, fournisseur) reste ouvert. Le jury doit pourtant voir une limite de palier gratuit appliquée côté serveur.
**Décision** :
1. Le palier gratuit est une **constante du code** (`apps/web/src/server/plans.ts`) : 3 projets actifs par compte ; tout compte est au palier gratuit. Une session invitée garde la limite d'un projet de `can()` (`01_PRODUCT_MVP.md` §3).
2. `POST /api/v1/projects` refuse la création au-delà par `403` avec le code stable `QUOTA_PROJECTS` (RFC 9457). `403` plutôt que `402` : aucun paiement n'est possible, donc rien à « payer » ; le statut sera réexaminé avec O-5.
3. Les projets supprimés logiquement ne comptent pas. Le décompte et l'insertion s'exécutent dans une transaction sous verrou consultatif par compte (pas de dépassement en concurrence).
4. Le rattachement d'un projet invité (`guest-sessions/claim`) obéit au **même quota**, sous le même verrou, dans la même transaction. Si le compte n'a pas la place, la réponse est `403 QUOTA_PROJECTS` et **rien ne change** : le projet reste dans la session invitée (24 h), cookie conservé, rattachable après suppression d'un projet. Choix retenu contre le « dépassement toléré », car des sessions invitées successives (5/h par IP) permettraient sinon un nombre illimité de projets. AC-01.3 (aucune perte) tient : le refus ne détruit ni ne déplace rien. L'interface doit proposer de libérer une place. La session est fermée par un `UPDATE … WHERE claimed_by_user_id IS NULL` : de deux comptes concurrents, un seul obtient les projets.
5. La suppression de compte (`DELETE /api/v1/account`, mot de passe recopié, AC-13.3) efface projets, fichiers et identité mais **conserve `usage_events` sans identité** (`user_id` mis à `NULL`) pour la comptabilité des coûts (13 mois) ; les clés étrangères des tables applicatives n'ont pas de cascade, l'ordre des suppressions est explicite.
6. Aucune table `subscriptions`, aucune migration avant le 09/11 ; la table (R10) remplacera la constante après cette date, une fois O-5 tranché.
**Conséquences** : l'interface traduit `QUOTA_PROJECTS` (message et appel à l'action vers les tarifs statiques) ; les paliers payants et leurs limites restent à définir.
**Alternatives rejetées** : table `plans`/`subscriptions` maintenant (migration interdite) ; quota côté client seulement (contournable) ; `402` (suppose un paiement qui n'existe pas).

## ADR-033 — Convertisseur vectoriel externe `vectorcraft-cli` (.ai, EPS, PDF, SVG avec texte)
**Contexte** : un designer ou un imprimeur envoie un `.ai`, un EPS ou un PDF ; Charta les refusait. Un SVG dont le texte n'est pas vectorisé était refusé côté serveur, ou converti en image dans le navigateur (perte du vectoriel). La lecture des PDF de brief attendait une dépendance (`unpdf`, branche `comp/pdf-manifest`). Essai du 2026-11-11 avec l'accord du propriétaire : `docs/proposals/P-004_ESSAI_VECTORCRAFT.md` (six conversions fidèles, sorties acceptées par `sanitizeSvg`, texte d'un PDF extrait). Le propriétaire a donné le 2026-11-11 son accord général pour agir.
**Décision** :
1. **Programme** : `vectorcraft-cli` 0.23.0 (dépôt GitHub `storytold/vectorcraft`, Apache-2.0 ou MIT), archive `vectorcraft-0.23.0-windows-x64-portable.zip`, SHA-256 `a3995376d0871afa3002a55f83b4c5666d17fe223fe72e57b4a2b8cc56657a7a`, signature de `SHA256SUMS.txt` vérifiée (empreinte `2B76 741B 414A AD6C D33E 6312 13A0 05C0 B9D7 C3ED`). Pas un paquet npm : `pnpm-lock.yaml` ne change pas. Le serveur Linux prendra l'archive `linux-x86_64` de la même version, vérifiée de la même façon, installée dans l'image du worker.
2. **Optionnel** : `VECTORCRAFT_CLI` (chemin absolu, validé par Zod, binaire exécutable vérifié au démarrage). Absent, tout se comporte comme avant (refus avec les codes existants).
3. **Isolation** (`apps/worker/src/vector-converter.ts`) : dossier temporaire privé par conversion, supprimé ensuite ; `--safe-mode` (aucun plug-in), `VECTORCRAFT_NO_PREFS=1`, environnement vidé (aucun secret transmis), pas de shell, 30 s au plus, sortie limitée à 5 Mo, réponses JSON validées par Zod.
4. **Rien de ce qu'il écrit n'est cru** : le SVG produit passe par `sanitizeSvg` et `ensureViewBox` comme un dépôt. Pour un PDF ou un EPS, la page (plan de travail A4) est retirée et le logo recadré sur son dessin ; un SVG garde le cadre de son auteur. Premier plan de travail seulement.
5. **Police absente** : le programme remplace une police manquante sans erreur. Charta lit `info` avant la conversion et refuse avec `ASSET_FONT_MISSING` ; second contrôle sur l'avertissement « fallback font ».
6. **Brief PDF** : texte extrait par le même programme, puis nettoyé et plafonné comme un DOCX (`manifestOfText`). `unpdf` n'est pas ajouté ; la branche `comp/pdf-manifest` est remplacée.
7. **Navigateur** : `.ai`, `.eps`, `.pdf` acceptés. Les octets disent le type ; le nom ne choisit que le rôle d'un PDF déposé avec les logos (`.ai` ou « logo » dans le nom : logo ; sinon : brief). Un SVG avec texte peut être envoyé « en vectoriel » pour que le serveur vectorise le texte ; la conversion en image reste proposée.
**Conséquences** : 150 Mo de plus dans l'image du worker ; mises à jour du programme décidées version par version (nouvelle somme dans cet ADR) ; l'éditeur se dit à environ 65 % prêt, d'où le repli conservé. EPS venant d'un autre logiciel que vectorcraft non encore essayé.
**Alternatives rejetées** : `unpdf` pour les PDF seulement (ne couvre ni `.ai` ni EPS ni le texte des SVG) ; Inkscape en ligne de commande (plus lourd, rendu du texte selon les polices système sans contrôle) ; conversion en image dans le navigateur seule (perd le vectoriel, déjà en place comme repli).

## ADR-034 — Surfaces calculées : révolution et maillage
**Contexte** : le moteur ne sait poser un logo que sur un quadrilatère plat (homographie) ou rejouer une carte UV cuite depuis un PSD. Le seul objet courbe actif, `mug-white`, a une carte UV quasi plate : sur sa ligne médiane, la densité du logo varie de 2 % du centre au bord, alors qu'un vrai cylindre vu sur ±34° descend à cos 34° ≈ 0,83 (`docs/research/2026-11-11-mockups-objets-courbes.md` §1.3). `06_MOCKUP_ENGINE.md` §2 classait les surfaces courbes hors MVP. Les PSD gratuits d'objets courbes compatibles avec un SaaS se limitent aux fichiers CC0 de Firmbee (même document, §4). Le propriétaire a donné le 2026-11-11 son accord général pour agir.
**Décision** :
1. **Géométrie de surface** (`SurfaceGeometry`, `@app/contracts`) : union discriminée `quad` (inchangé), `revolution` (deux ellipses saisies par trois points chacune, gauche, droite et avant ; bande imprimable ; arc du logo en degrés ; profil de silhouette et rapport physique des rayons facultatifs) et `mesh` (grille de Bézier bicubique (3k+1) × (3m+1), au format du `customEnvelopeWarp` de Photoshop). Une surface photo garde son `quad` (zone cliquable et repli) et reçoit `geometry` en option ; un `slot` de scène PSD reçoit `geometry` à la place de `uv`/`vv`. Aucune scène existante ne change.
2. **Fonctions pures** (`packages/mockup-engine/src/geometry/`) : `ellipseFrom3`, `revolutionFrame`, `revolutionPoint`, `bezierMeshPoint`, `tessellate`, `rasterizeUv`, `encodeUvMap`. Ni DOM, ni `Date`, ni `Math.random` ; erreurs en `Result`. Elles produisent la même carte UV 16 bits que `bake.py` (octet fort en R, faible en G, couverture en B).
3. **Modèle du cylindre** : chaque section est l'image projective d'un cercle, sa perspective lue sur la focale qu'impliquent les deux ellipses (la plus basse est plus ouverte vue d'en haut) ; le long d'une génératrice, les points sont interpolés avec leur profondeur pour poids. Sans `radiusRatio`, l'objet est un cylindre ; un cône doit déclarer le rapport physique de ses rayons. Test sur une projection synthétique exacte : écart sous 0,74 % du rayon (le modèle orthographique pondéré par le demi-axe de la note de recherche s'écartait de 11,7 %).
4. **Face cachée** : le logo n'est dessiné que jusqu'à la silhouette saisie (`cos θ = κ`, un peu avant ±90° en perspective) ; l'arc du logo va jusqu'à un tour, la part qui passe derrière est coupée ; la couverture est adoucie sur environ un pixel avant la silhouette. Un logo qui dépasse est coupé net, jamais comprimé en silence.
5. **Rendu** : la carte est calculée **sur GPU** (`UV_PASS`, deux cibles de rendu RGBA8) une fois par scène et par contexte, puis lue par le shader de slot existant sans changer son décodage. Le rastériseur CPU sert aux tests, à la mesure et à la cuisson hors ligne. Le canal alpha de la cible `v` porte cos θ pour l'éclairage courbe à venir.
6. **Cuisson** (`tools/psd-mockups/bake.py`) : ordre de Photoshop (points de contrôle passés par l'homographie, puis évaluation de Bézier) ; refus explicite des préréglages de déformation (Arc, Renflement…) et des grilles divisées ou non carrées, au lieu de les cuire sans déformation.
7. **IA** : hors ligne, à la création de la scène seulement, pour proposer les six points (JSON validé par Zod, confirmé par un humain). Elle ne touche jamais aux pixels du logo.
**Conséquences** : `mug-white` passe en vrai cylindre (ses cartes `uv`/`vv` cuites sont retirées, ses calques gardés) ; le studio affiche les objets courbes avec compression aux bords et disparition derrière la silhouette. Restent à faire : éclairage courbe (reflets par-dessus l'encre, Fresnel), outil de saisie avec aimantation et mire, proposition des points par vision et Gemini, photos maison d'objets vierges, branche « carte UV » des scènes photo (`SURFACE`).
**Alternatives rejetées** : rendu 3D de modèles (aspect moins photographique, modèles à produire) ; PSD courbes du commerce (licences interdisant l'offre à des tiers : Pixeden, ls.graphics, GraphicBurger) ; photocraft comme moteur de production (rendu perspective + déformation non fusionné au 2026-11-11, gardé comme oracle possible) ; déplacement par pente de luminance seul (ne fait pas tourner l'image autour de l'objet).

## ADR-035 — Pages denses rendues par section, règles du logo et des couleurs mesurées
**Contexte** : `docs/research/2026-11-11-contenu-des-chartes.md` (14 chartes réelles) montre qu'une charte courte empile ses spécifications sur la page. Charta rendait une page selon son rang parmi les pages de son type (`variant.ts`), d'où un « Sommaire » qui n'en est pas un et treize sections montrant trois mockups tournants ; tailles minimales, zone de protection et parts de couleur étaient fixes ou uniques. Le propriétaire demande le moins de pages possible et un contenu exact, sans chiffre inventé.
**Décision** :
1. **Jeu minimum** (`DENSE_PAGES`, `@app/contracts`) : 14 pages denses (couverture, sommaire et mode d'emploi, plateforme, ton, logo anatomie, versions et fonds, protection et tailles, interdits, couleurs, contrastes, familles, hiérarchie, langage visuel, applications), puis les pages de secteur que les références montrent (`SECTOR_SECTIONS`), puis les tokens. `homeOf` range chaque section de la recherche sur sa page dense ; les preuves sont réunies.
2. **Section portée par la page** : `ChartSection.section` (facultatif) devient `page.data.section` ; le studio dessine une page selon sa section, et selon son rang seulement pour les documents antérieurs.
3. **Mesures** : tailles minimales par version (logo complet, symbole) en px et en mm déduites du plus petit élément lisible (`measureLogo`), origine de la zone de protection (élément du logo ou convention, dite), parts de couleur mesurées sur le logo (`ColorToken.share`, facultatif). Une valeur non mesurée est dite comme telle, jamais remplacée par un chiffre fixe présenté comme une mesure.
4. **Pantone** : aucune correspondance sans table sous licence ; la page écrit « à faire vérifier par l'imprimeur ».
**Conséquences** : la charte standard passe de 16 à 15 pages ; `SECTION_PAGE_TYPE` reste la table des types. À trancher : R19 (les tableaux de valeurs hors des 60 mots), échelle typographique proposée (rapport 1,25), tableau des tailles par format.

## ADR-036 — Applications construites : gabarits génératifs et description de mise en page
**Contexte** : Charta pose le logo sur des objets photographiés ; une charte professionnelle compose ses applications (affiche avec photo, accroche et motif, carte recto-verso, badge). Conception : `docs/research/2026-11-11-univers-de-marque.md` (décisions du propriétaire du 2026-11-12 : aucune image Pinterest reprise, photos Pexels et Unsplash, Gemini Image désactivé, priorité affiche « plat et logo », puis cartes, puis badge). Le propriétaire a donné son accord général.
**Décision** :
1. **Contrat** (`@app/contracts`, `collateral.ts`) : `CollateralKind` (13 supports), formats et grille (`formatGrid` : module = largeur / colonnes, marge 1 module ou 0,75 sous 60 mm de côté, gouttière m/4, rangée m/2), compositions par support, `compositionFor(kind, mood, archetype, photo)` (famille par l'humeur, géométrie par l'archétype, `type-only` sans photo), `seriesComposition` (deux affiches d'une série diffèrent), `treatmentFor`, `motifFor`, et `CollateralLayout` : liste sérialisable de nœuds (aplat, image, logo, texte, motif) en mm ou en px, validée par Zod, avec ses erreurs `LayoutError`.
2. **Moteur pur** (`packages/document/src/collateral/`, pas de nouveau paquet ni de dépendance) : `layoutCollateral(document, input, measure)` rend un `Result`. La mesure du texte est injectée. Planchers en points (le corps ne descend jamais dessous : une ligne est retirée et comptée), version et minimum du logo (symbole sous le minimum du logo complet, erreur si rien ne tient), zone de protection respectée par le motif, contraste WCAG calculé sur aplat (4,5:1, 3:1 au-dessus de 24 px équivalents), au plus trois couleurs de la marque, aucun chevauchement entre texte et zone de protection. Supports construits d'abord : affiche (5 compositions), recto et verso de carte ; les autres rendent `KIND_NOT_BUILT`.
3. **Accroche** : `brand.tagline`, puis `tone.examples[i]`, puis `values[i].label`, puis `brand.name` ; l'origine est rendue et la légende « exemple » reste due tant que `brand.tagline` est vide. Au plus 6 mots et 3 lignes sur l'affiche, coupe à la ponctuation, sinon niveau suivant.
4. **Champs saisis** : `brand.tagline` et `brand.contact` (adresse, téléphone, e-mail, site, réseau), facultatifs, éditables par `SetBrandField` (`null` efface). Ajout rétrocompatible : `schemaVersion` reste 1 comme pour les champs facultatifs d'ADR-035 ; un document antérieur se lit sans migration. Les absents sont remplacés par des champs génériques fournis par l'appelant (« Prénom Nom »), marqués `example`.
**Conséquences** : U-05 (affiche) et U-07 (cartes) consomment la description ; le traitement photo, la mesure sous une photo (`contrast: null`, `background: null`) et le voile relèvent d'U-04 ; `fit: 'cover'` des scènes relève d'U-06. Un lecteur antérieur à cet ADR refuse un document qui porte `tagline` ou `contact` (objet strict).
**Alternatives rejetées** : un paquet `@app/collateral` (une dépendance de plus dans le lockfile pour un module de quelques fichiers) ; passer `schemaVersion` à 2 (aucune transformation à faire, et tous les écrivains du document à changer) ; inventer coordonnées ou accroche plausibles (interdit par le document de conception, §0.2).

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
