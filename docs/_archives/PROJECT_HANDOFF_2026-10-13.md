# Dossier de reprise — Atelier / `graphic_chart`

> **But** : transmettre à un autre modèle l’état du projet, ses décisions et le travail restant sans dépendre de l’historique de cette conversation.
> **État observé** : 2026-10-13, dépôt local Windows.
> **Attention** : ce dossier est un résumé de reprise. Les spécifications sous `docs/` et `AGENTS.md` restent les sources de vérité.

## 1. Résumé en une minute

Atelier transforme un logo existant et un brief en charte graphique exploitable : couleurs et contrastes calculés, variantes de logo, règles typographiques et d’usage, mockups, PDF de référence et fichiers de tokens. L’IA aide à rédiger ou à proposer des changements, mais ne redessine pas le logo ; les calculs visuels reposent sur des moteurs déterministes.

Le dépôt est un monorepo TypeScript strict, pnpm + Turborepo, Next.js, PostgreSQL/Drizzle et packages métier séparés. T-001 et T-002 sont dans l’historique. T-003 est implémenté et corrigé ; son rapport est dans sortie tikets/T-003.md, avec GO humain encore attendu. T-004 a reçu le GO du propriétaire le 2026-10-13.

Les tests T-004 ciblés passent (15/15) et `pnpm verify` passe sous Node 22.23.3 : typecheck 12/12, tests 12/12, build 10/10 et aucun écart dependency-cruiser. T-004 a reçu le GO du propriétaire.

## 2. Produit, cible et limites du MVP

Le public prioritaire est l’indépendant ou le fondateur qui possède déjà un logo mais manque d’une identité visuelle cohérente et de livrables utilisables. Les designers freelances et agences web sont des publics secondaires.

Le parcours prévu est : dépôt et analyse du logo, création d’une charte, édition manuelle ou conversationnelle, export PDF et pack d’assets ; aperçu/édition possibles en session invitée, sauvegarde durable et export complet avec compte. Les limites d’import et les critères d’acceptation sont dans [`docs/01_PRODUCT_MVP.md`](docs/01_PRODUCT_MVP.md).

Hors MVP : redessin génératif du logo, Pantone, vidéo, mockups 3D interactifs, rôles avancés et promesse de conversion CMJN universelle. Le PDF est un document de référence RVB, pas un PDF/X. Ne pas élargir le périmètre « en passant ».

## 3. Architecture et décisions structurantes

### Stack

- TypeScript strict dans un monorepo pnpm/Turborepo ; versions verrouillées dans `pnpm-lock.yaml`.
- `apps/web` : Next.js App Router, UI, API et SSE.
- `apps/worker` : jobs longs, scan et exports, pg-boss.
- `packages/contracts` : schémas Zod et types partagés.
- `packages/color-engine` : conversions, WCAG, extraction et échelles, pur.
- `packages/document` : modèle de marque, commandes réversibles et migrations, pur.
- `packages/svg-engine` : validation/assainissement SVG et traitement isolé.
- `packages/logo-kit` : variantes, favicon et règles de logo.
- `packages/mockup-engine` : rendu WebGL côté navigateur.
- `packages/ai` : port et adaptateur Gemini, prompts et évaluations.
- `packages/db` : Drizzle, schéma et accès PostgreSQL.

Les dépendances vont vers les packages de niveau inférieur uniquement : `contracts` et `color-engine` ne dépendent de rien ; `document` dépend de `contracts`/`color-engine` ; les apps peuvent consommer les packages. Pas de cycle ni d’import d’une app par un package. Voir [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md).

### ADR à retenir

- **ADR-001/002** : TypeScript partout, Spring abandonné, versions stables exactes et vérifiées dans l’installation.
- **ADR-003/005** : PostgreSQL + Drizzle ; pg-boss dans PostgreSQL, pas Redis.
- **ADR-006** : API Gemini payante derrière un port interchangeable, budget plafonné, données de sortie validées par Zod.
- **ADR-007** : un document JSON de marque par projet ; modifications par commandes typées pures avec inverses, pas par JSON Patch libre.
- **ADR-008/009** : rendu mockup dans le navigateur ; PDF Chromium côté worker, RVB.
- **ADR-010/014** : sessions en cookies HttpOnly, autorisation centrale `can()`, CSP stricte et tests d’accès.
- **ADR-011/012** : sanitizer SVG en allowlist ; calcul couleur déterministe (OKLab/OKLCH et WCAG), CMJN par ICC uniquement.
- **ADR-013** : Cloudflare R2, URL présignées et quarantaine avant usage.

Les ADR et documents détaillés sont dans [`docs/14_ADR_LOG.md`](docs/14_ADR_LOG.md).

## 4. Références à lire et règles de travail

Lire dans cet ordre au début d’un ticket : `AGENTS.md`, ticket, documents « À lire » du ticket, puis le code existant. Sources principales :

- [`AGENTS.md`](AGENTS.md) : règles de code/tests, périmètre, Git, arrêt et rapport obligatoire.
- [`docs/12_WORKFLOW_ROADMAP.md`](docs/12_WORKFLOW_ROADMAP.md) : phases et gouvernance.
- [`docs/03_DATA_MODEL.md`](docs/03_DATA_MODEL.md), [`docs/04_API_CONTRACTS.md`](docs/04_API_CONTRACTS.md), [`docs/10_QUALITY.md`](docs/10_QUALITY.md).
- [`docs/PHASE_0_1_TICKETS.md`](docs/PHASE_0_1_TICKETS.md) : tickets T-001 à T-012 et backlog initial.
- docs/PROGRESS_TRACKER.md : journal mis à jour le 2026-10-13 ; T-004 vérifié, T-005/T-007/T-010 bloqués par des décisions ou entrées manquantes.

Règles importantes : tests d’abord ; zéro `any`, zéro contournement TypeScript ; validation Zod aux frontières ; fonctions pures/immutables dans les packages concernés ; chaque fichier de code <300 lignes ; aucune nouvelle dépendance sans autorisation écrite du ticket ; pas de modification de `docs/`, `AGENTS.md` ni des golden vectors. Après une implémentation complète : `pnpm verify`, sabotage temporaire d’une logique principale et rapport avec sorties réelles. Un ticket dépasse rarement 400 lignes hors tests : **AGENTS.md exige de s’arrêter et proposer un découpage si cette limite est dépassée**.

Le propriétaire veut des explications concrètes pour rester au niveau du travail réalisé et a fourni des addenda précis en qualité de chef de projet. Ne pas reposer les questions déjà tranchées ci-dessous. Ne pas prétendre qu’un test, une commande ou une connexion DB a réussi sans l’avoir exécuté.

## 5. État Git et avancement

### Branches et commits

- Branche courante au dernier relevé : ticket/T-010-icc-spike.
- HEAD : 5d1b3ee docs(T-004): record owner review approval.
- T-003 comporte le commit initial 80fb23b et la correction de revue ce46260 ; le rapport est sortie tikets/T-003.md. Le GO humain reste à enregistrer.
- T-004 : commit `2108142 feat(color-engine): implement color math engine`, GO reçu ; rapport : sortie tikets/T-004.md.
- T-001 et T-002 restent dans l’historique ; T-002 pointe sur 14a40b4.

### T-003

La revue T-003 a corrigé migrate pour retourner la même instance v1 validée. Les tests d’identité et d’immuabilité passent, ainsi que les 33 tests document, les 16 tests contracts et le pnpm verify final relevé dans le rapport. Le sabotage SetTypographyPairing a été détecté. Le rapport signale aussi les ajouts hors périmètre du commit initial, sans les présenter comme du code demandé.

### T-004 vérifié

- API pure implémentée : parseHex/toHex, conversions sRGB, contraste WCAG, OKLab/OKLCH, CIELAB D65, ΔE_OK et CIEDE2000.
- Les tests lisent docs/golden/color.golden.json sans le modifier ; ils ignorent le champ h=null du golden pour les gris et vérifient h=0 conformément à la décision du chef de projet.
- fast-check 4.10.2 est une devDependency autorisée. Le package color-engine ne dépend pas de contracts ; son alias Result local a la même forme discriminée.
- Tests ciblés 15/15 et typecheck color-engine passent sous Node 22.23.3 via fnm ; lint global et dependency-cruiser passent.
- Sabotage effectué : remplacer le seuil 0.04045 par 0.04 fait échouer le test de seuil ; la constante a été restaurée.
- Le propriétaire a autorisé `allowBuilds.esbuild: true` dans `pnpm-workspace.yaml`. `pnpm verify` passe sur tout le monorepo : typecheck 12/12, tests 12/12, build 10/10, dependency-cruiser 196 modules sans violation.
- `sortie tikets/T-004.md` contient les résultats, les écarts, les tests et le sabotage. Le propriétaire a donné GO ; le tracker marque T-004 vérifié.
- Node actif par défaut dans ce shell : 24.20.0 ; Node 22.23.3 est déjà installé via fnm et les tests ciblés ont été lancés avec cette version. Le projet épingle 22 dans .nvmrc.
- .env.local existe et reste privé ; ne pas le lire, le recopier ou afficher ses secrets.
## 6. Décisions conversationnelles qui ne sont pas dans le dépôt

Ces décisions ont été fournies par le chef de projet et priment sur les passages contradictoires du ticket correspondant.

### Addenda T-002

- Retirer R2 de la CSP pour T-002 car aucun domaine R2 n’était défini.
- Extension minimale de périmètre autorisée dans `packages/contracts/src/index.ts` pour exporter les types nécessaires, notamment `Env` et `ProblemDetails`.

### Addenda T-003 : règles D1 à D9

- **D1 — Dépendances** : installation autorisée pour `zod`, `fractional-indexing` et devDependency `fast-check`, toutes versions exactes. Vérifier l’API installée. Si installation/API échoue, blocker ; ne pas réimplémenter l’indexation fractionnaire. `@app/contracts` et `@app/color-engine` peuvent être ajoutés en workspace si nécessaires.
- **D2 — Result** : `packages/contracts/src/result.ts` exporte `Result<T,E> = {ok:true,value:T} | {ok:false,error:E}`, plus `ok()` et `err()`. `apply` rend `Result<{doc,inverse}, CommandError>`.
- **D3/D4 — Types** : `PageType` est `cover | manifesto | logo | clear-space | do-dont | palette | contrast | typography | tone-of-voice | mockup | tokens` ; plusieurs pages mockup sont autorisées. `PAIRING_IDS` est `editorial-classic | modern-geometric | tech-grotesk | warm-serif | luxury-light | friendly-soft | bold-display | humanist-book`; autre valeur pour `SetTypographyPairing` → `INVALID_COMMAND`.
- **D5 — Pureté** : aucune génération d’identifiant/date dans `apply`; `AddPage.pageId` vient de l’appelant.
- **D6 — Commandes** : union discriminée `type` : `SetColorToken`, `SetTypographyPairing`, `SetBrandField`, `SetPageField`, `SetPageOverride`, `ClearPageOverride`, `SetLogoRules`, `ReorderPage`, `AddPage`, `RemovePage`, `SelectScene`. `SetColorToken.source` par défaut `user` et inverse restaure hex + source. `SetBrandField.values` contient exactement 4 chaînes ; autres champs refusés. `SetPageField` accepte `title` ou une clé de premier niveau déjà existante dans `data` et actuellement chaîne. Overrides : background HexColor, layout `split|grid|full-bleed|minimal`. Logo : ratio `[0.10,0.50]`, px entier `[8,512]`, mm `[2,100]`, trois requis. Reorder ne change que la page cible ; position explicite conservée exactement, sinon calculée avec la lib. AddPage reçoit l’id caller et inverse RemovePage ; l’inverse de RemovePage est un AddPage avec snapshot complet. SelectScene cible un mockup.
- **D7/D8** : chaînes NFC, ≤2000 caractères, rejeter `<` suivi de lettre, `/` ou `!`; hex en majuscules. Taille mesurée en octets UTF-8 de `JSON.stringify(doc)`, plafond 512 KiB ; schemaVersion courant 1.
- **D9 — Tests** : fast-check doit générer docs et commandes valides pour chaque type de commande, chaque type couvert par un test d’inversion ; deep-freeze uniquement côté tests.

### Addenda complémentaire T-003 : règles R6 à R8

- **R6 — Contrats** : `ToneAxisId`: `formal-casual|serious-playful|classic-avantgarde|sober-expressive`; axe `{id,value}`, entier 0–100. `brand.tone.axes` exactement 4 ids distincts ; `examples` exactement 3 chaînes NFC sans HTML, ≤200 caractères. `VariantKind`: `color|mono-black|mono-white|favicon`; `VariantRef={assetId,kind,needsReview,fidelity?}`, assetId non vide ≤64, fidelity [0,1], max 8 variantes, `kind` unique. Aucune commande T-003 ne modifie `tone` ou `assets`.
- **R7 — Page.data** : reste un `z.record(z.string(), z.unknown())`, sans schéma par type de page dans ce ticket. Les valeurs doivent être sérialisables JSON ; refuser undefined/fonctions/symboles/bigint/NaN/Infinity, clés `__proto__`, `constructor`, `prototype`, respecter la limite du document. `SelectScene` écrit `data.mockup={sceneId,finish,foilMetal?}` et son inverse remet la valeur précédente ou retire la clé si elle était absente.
- **R8 — migrate** : `migrate(input: unknown): Result<BrandDocument,MigrationError>`, erreur exportée du package document : `UNKNOWN_SCHEMA_VERSION {version}` ou `INVALID_DOCUMENT {issues:string[]}`. Champ schemaVersion absent/non objet → issue `schemaVersion manquant`. Version non entière, <1 ou >1 → UNKNOWN_SCHEMA_VERSION avec la valeur reçue. Version 1 invalide → chemins Zod lisibles sans valeurs sensibles ; version 1 valide → document rendu par identité. Ne jamais lever ni muter l’entrée. Tests complémentaires 9–19 spécifiés par l’addendum reçu dans cette conversation.
- **Inverse SelectScene** : le chef de projet a choisi un inverse interne `RestoreMockup` pour représenter l’absence précédente de `data.mockup`. Il ne s’ajoute pas à la liste des commandes utilisateur.

## 7. Environnement du propriétaire et commandes pratiques

- Poste Windows/PowerShell, Node **22.23.3** via fnm et pnpm **12.6.0** au relevé. Node 24 avait été évoqué ; l’utilisateur a demandé Node 22.
- PowerShell bloque le shim `pnpm.ps1` avec la politique d’exécution ; utiliser **`pnpm.cmd`** dans les commandes exécutées par PowerShell.
- Docker n’est pas installable/utilisable sur le PC : virtualisation désactivée et l’utilisateur n’a pas le mot de passe BIOS. PostgreSQL et pgAdmin ont été installés localement ; l’utilisateur a créé la base, ne pouvait pas créer de rôle dédié, et prévoyait d’utiliser le rôle `postgres`.
- `.env.local` existe et est ignoré par Git (`.env*.local`). L’utilisateur le remplit lui-même. **Ne jamais afficher, copier dans ce document ou demander le secret** ; vérifier la connexion via l’application sans lire le contenu à l’écran ni dans les logs. Les secrets ne doivent apparaître ni dans Git ni dans les rapports.
- `infra/docker-compose.dev.yml` existe pour l’environnement prévu, mais l’utilisateur ne peut pas utiliser Docker. Pour son poste, PostgreSQL natif est l’alternative retenue.

Commandes racine : `pnpm.cmd verify`, `pnpm.cmd --filter @app/document test`, `pnpm.cmd --filter @app/contracts test`. Le script verify exécute lint, typecheck, tests, build et `deps:check` dans cet ordre.

## 8. Feuille de route globale

Ordre initial des tickets dans le dépôt :

- **P0** : T-001 monorepo/CI ; T-002 app web, config, health et base locale.
- **P1** : T-003 document ; T-004 à T-006 moteur couleur ; T-007 à T-008 SVG ; T-009 et T-012 logo-kit ; T-010 spike ICC ; T-011 spike vectorisation. Les dépendances exactes sont dans `docs/PHASE_0_1_TICKETS.md`.
- **P2** : à partir de T-013, spike auth, puis sessions, modèle DB, upload/scan, studio et commandes persistées.
- **P3** : mockups, export PDF et ZIP.
- **P4** : analyse IA et copilote avec jeux d’évaluation/coûts.
- **P5** : durcissement sécurité, juridique, accessibilité, observabilité et bêta.

État prudent : le tracker historique déclare toutes ces zones « spécifiées, non implémentées » ; seuls les commits T-001/T-002 et le workspace T-003 font foi pour l’état réel. Pas de GO de revue du chef de projet confirmé dans les informations disponibles.

## 9. État de reprise — 2026-10-13

T-004 est terminé, commité (`2108142 feat(color-engine): implement color math engine`) et vérifié après le GO du propriétaire. `pnpm verify` passe sous Node 22.23.3.

Branches et derniers commits :

- `ticket/T-004-color-engine-maths` — `2108142` : code T-004, 15 tests, journaux et rapport ; verify complet vert.
- `ticket/T-005-palette-extraction` — `5e0eb87` : rapport de bloqueurs seulement.
- `ticket/T-007-svg-sanitizer` — `83da147` : rapport de bloqueurs seulement.
- `ticket/T-010-icc-spike` — `5d1b3ee` : rapport de bloqueurs et recherche initiale, puis enregistrement du GO T-004 ; branche actuellement checkoutée.

Les questions d’arbitrage T-005 et T-007 ont été envoyées. Pour T-010, le profil FOGRA39 et `transicc` n’existent pas sur le poste ; l’énumération du ticket donne 21 couleurs au lieu de 24 et son livrable `docs/spikes/T-010-icc.md` entre en conflit avec AGENTS.md §8. Ne pas inventer les données ni télécharger/ajouter une dépendance sans la décision attendue.

Les rapports détaillés et les demandes associées sont dans `sortie tikets/T-005.md`, `sortie tikets/T-007.md` et `sortie tikets/T-010.md`. Après réponse, reprendre chaque branche depuis son dernier commit ; suivre d’abord le T-005/T-007/T-010 décidé, puis T-006 dépend de T-005, T-008 de T-007, T-009 de T-008, T-011 de T-008, et T-012 de T-009.

Ne pas toucher au secret .env.local, au golden, aux décisions d’addendum ou au périmètre des autres tickets.
