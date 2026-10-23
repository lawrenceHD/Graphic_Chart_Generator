# Décisions du propriétaire

Décisions prises en conversation, qui ne figurent pas (encore) dans `docs/`. Ajout seulement : une décision
remplacée est marquée **remplacée** avec un renvoi, jamais effacée. Les décisions antérieures au 2026-10-18 sont
reprises de `PROJECT_HANDOFF.md` (dossier de reprise du 2026-10-13).

## Addenda T-002 (2026-10-08 → 13)
- R2 retiré de la CSP de T-002, aucun domaine R2 n'étant défini. **Remplacée** par ADR-023/024 (v4.1) : l'origine
  `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` est dans `img-src` et `connect-src`.
- Extension de périmètre autorisée dans `packages/contracts/src/index.ts` pour exporter `Env` et `ProblemDetails`.

## Addenda T-003 — règles D1 à D9 (2026-10-12)
- **D1** : `zod`, `fractional-indexing`, `fast-check` (dev) autorisés en versions exactes ; ne pas réimplémenter
  l'indexation fractionnaire.
- **D2** : `Result<T,E>` avec `ok()` / `err()`. **Remplacée** par ADR-017 : `Result` vient de `@app/kernel`.
- **D3/D4** : `PageType` = `cover | manifesto | logo | clear-space | do-dont | palette | contrast | typography |
  tone-of-voice | mockup | tokens` ; plusieurs pages mockup autorisées. `PAIRING_IDS` = catalogue fermé de 8 ids ;
  autre valeur → `INVALID_COMMAND`.
- **D5** : `apply` ne génère ni identifiant ni date ; `AddPage.pageId` vient de l'appelant (repris par ADR-019).
- **D6** : `SetColorToken.source` vaut `user` par défaut, l'inverse restaure hex et source. `SetBrandField` : liste
  blanche. `SetPageField` : `title` ou clé de premier niveau existante de type chaîne. Surcharges : `background`
  hex, `layout` ∈ `split | grid | full-bleed | minimal`. Logo : ratio [0,10 ; 0,50], px entier [8 ; 512],
  mm [2 ; 100]. Position explicite conservée exactement.
- **D7/D8** : chaînes NFC ≤ 2000, refus de `<` suivi d'une lettre, `/` ou `!` ; hex en majuscules ; taille en octets
  UTF-8 de `JSON.stringify(doc)` ≤ 512 Kio ; `schemaVersion` = 1.
- **D9** : fast-check génère des documents et commandes valides ; chaque type de commande a un test d'inversion ;
  deep-freeze côté tests seulement.

## Addenda T-003 — règles R6 à R8 (2026-10-12)
- **R6** : axes de ton = 4 ids distincts, entiers 0–100 ; 3 exemples ≤ 200 ; `VariantRef` (≤ 8, `kind` unique).
- **R7** : `Page.data` = enregistrement JSON sûr (pas de `__proto__`, `constructor`, `prototype`, pas de valeur non
  sérialisable). `SelectScene` écrit `data.mockup = { sceneId, finish, foilMetal? }`.
- **R8** : `migrate(input: unknown)` → `UNKNOWN_SCHEMA_VERSION` ou `INVALID_DOCUMENT` ; identité pour un v1 valide ;
  jamais d'exception ni de mutation.
- **Inverse de `SelectScene`** : commande interne `RestoreMockup`, hors de la liste des commandes utilisateur.

## T-004 (2026-10-13)
- `pnpm-workspace.yaml` : `allowBuilds.esbuild: true` autorisé.
- GO du propriétaire sur T-004 (v4.0).
- Teinte des gris = `0`. **Remplacée** par la v4.1 (ticket T-004 test 4 bis, ADR-021) : `h = null`. GO à
  reconfirmer.

## Environnement (2026-10-13)
- Node 22 demandé. **Remplacée** par ADR-026 : Node 24 (`.nvmrc`).
- Docker inutilisable sur le poste (virtualisation désactivée) : PostgreSQL natif avec le rôle `postgres`.
  `.env.local` est rempli par le propriétaire ; l'agent ne le lit ni ne l'affiche jamais.

## 2026-10-18
- `origin/main` (PR #1, spec v4.1) est la **source de vérité**. Le travail local T-002 à T-004 est refait dessus,
  même au prix de grosses modifications ; l'ancien travail est conservé sous les tags `backup/pre-v4.1/*`.
- Importer d'ECC et de `logo-design-skill` ce qui sert au projet (sélection et raisons dans
  `.claude/skills/SOURCES.md`), ainsi que les MCP importants, pour un travail partagé entre Claude et Gemini.
- Mettre en place un CHANGELOG et des fichiers de relais écrits pendant les tâches (`journal/PROTOCOL.md`).
- **Délégation générale** (2026-10-18, message du propriétaire) : Claude est l'acteur principal ; il corrige et
  améliore tout le projet, installe ce qui l'aide (avec mesure sur la sécurité), crée des agents, pousse ses travaux
  et tranche les points ouverts dans le cadre du projet. Gemini et Codex interviendront ponctuellement.
  Conséquence : les choix que l'agent fait sous cette délégation sont consignés ici avec la mention « (délégation) ».
- **Push autorisé** des branches de travail.
- **Bibliothèque de logos** : à récupérer pour le développement → `pnpm logos:fetch` (cache local ignoré, marques non
  redistribuées).

## T-005 (délégation, 2026-10-18)
- Images de test **générées par le code** (ticket) ; le corpus de 20 logos de `05_ENGINES.md` §6 reste à constituer
  (logos libres de droits) et n'est pas un prérequis de T-005.
- Ré-export minimal de l'API depuis `packages/color-engine/src/index.ts` (hors `src/extract/**`).
- `mapToGamut` (§2.7, prévu en T-006) est implémenté dès T-005 dans `src/gamut.ts`, car les couleurs dérivées
  (§2.6) l'exigent ; T-006 le réutilise.
- Interprétations non écrites dans §2.4 : (1) étape 3, les voisins comparés sont les pixels **retenus à l'étape 1**
  (y compris le fond exclu à l'étape 2, où se trouvent les mélanges) ; un voisin semi-transparent est ignoré ;
  (2) étape 6, si plusieurs grappes sont à moins de `mergeThreshold`, la plus proche gagne (à égalité : la plus
  ancienne) ; (3) étape 7, à égalité de distance, la grappe d'accueil au centre hexadécimal croissant ;
  (4) `accent`, à égalité de `C` : part décroissante puis hexadécimal croissant ; (5) étape 2, la couleur la plus
  fréquente du pourtour est départagée par hexadécimal croissant.

## T-007 (délégation, 2026-10-18) — à reporter dans `docs/05_ENGINES.md` §3 et `docs/10_QUALITY.md` §6
- Cas 29 : `VIEWBOX_NEEDS_BBOX` en T-007 ; le `viewBox` est calculé par la rasterisation (T-008).
- `d` et `points` : limite = taille du fichier (5 Mo) au lieu de 10 000 caractères (47 logos réels sur 1 432 refusés).
- Attributs de filtre ajoutés à la liste blanche : `filterUnits`, `primitiveUnits`, `color-interpolation-filters`,
  `operator`, `k1`–`k4`.
- `data:` refusé comme schéma (début de valeur ou de `url()`), `javascript:` / `vbscript:` partout.
- `xlink:href` normalisé en `href` ; `@import` / `url()` externes → `FORBIDDEN_CONTENT`.

## T-018 partie 1 (délégation, 2026-10-18) — à reporter dans `docs/14_ADR_LOG.md` et `docs/04_API_CONTRACTS.md`
- Dépendances : `aws4fetch` 1.0.20 (signature SigV4, zéro dépendance, recommandée par Cloudflare pour R2) plutôt
  que le SDK AWS ; `pg-boss` 12.36.0 (ADR-005 ; version de plus de 2 semaines).
- Nouveau package `packages/storage` (→ kernel, contracts) : adaptateur R2 partagé par web et worker ; port
  `ObjectStorage` et contrats de jobs (`JOB_PAYLOADS`, `JobQueue`) dans `contracts` ; adaptateur pg-boss dans
  `@app/db/queue` (pg-boss vit dans PostgreSQL).
- File : politique `stately` + `singletonKey` = id de l'asset ; « 3 tentatives » = `retryLimit: 2`, recul
  exponentiel à partir de 5 s ; expiration 300 s.
- Taille limitée côté stockage (SEC-11) : `Content-Length` **signé** dans l'URL présignée PUT (R2 n'accepte pas les
  politiques POST `content-length-range`).
- `POST /projects/:id/assets/uploads` : corps `{ kind: 'logo_original', fileName, bytes }` ; le type annoncé n'est pas
  demandé (SEC-12) ; plafond 10 Mo (raster), les 5 Mo du SVG sont appliqués par le scan.
- `POST /assets/:id/complete` : `409 UPLOAD_MISSING` si l'objet n'existe pas, `409 UPLOAD_SIZE_MISMATCH` si la taille
  diffère ; idempotent (`202`, renvoi du job tant que l'asset est `quarantined`).
- Limites §7 : fenêtre **fixe**, clés `rate_limit` hachées (SHA-256) ; IP = première entrée de `X-Forwarded-For`
  (`clientIp`), à confirmer selon l'hébergeur (en-tête de confiance) ; sans IP, un compartiment commun `unknown`
  (refus plutôt que contournement). La limite par compte de SEC-05 garde son module (`login-throttle.ts`).

## Purge (délégation, 2026-10-18) — à reporter dans `docs/03_DATA_MODEL.md` §6
- Job `maintenance.purge` planifié **toutes les heures** par le worker (`0 * * * *`, UTC), 200 projets par passage.
- Un projet supprimé (`deleted_at`) est purgé au passage suivant, **sans délai de grâce** (« ≤ 24 h »).
- Ordre : fichiers R2 (clés des assets), puis lignes en une transaction (`share_links`, `exports`, `chat_messages`,
  `revisions`, `documents`, `assets`, `projects`) ; une interruption est reprise au passage suivant.
- Une session invitée expirée est supprimée quand aucun projet ni aucun `usage_events` (rétention 13 mois) ne la
  référence. `expireGuestProjects` a quitté le web (rien ne l'y planifiait) pour le worker.

## Corpus de logos (propriétaire, 2026-10-18) — à reporter dans `docs/05_ENGINES.md` §6
- Les 20 logos du corpus sont **créés pour le projet par l'agent** (option « créés pour le projet » du §6) :
  14 SVG selon la répartition du §6 et 6 rasters (2 PNG transparents, 2 PNG fond blanc, 2 JPEG) dérivés de ces SVG,
  avec palette attendue écrite à la main. Le propriétaire valide visuellement les variantes.
- La bibliothèque `logo-design-skill` (marques déposées) n'entre pas dans le corpus : contrôle de robustesse local
  seulement (`tools/logo-library/README.md`).

## Lettres mortes (délégation, 2026-10-18) — à reporter dans `docs/02_ARCHITECTURE.md` §5.1
- `asset.scan` épuisé (3 tentatives) → file `asset.scan.failed` → asset `quarantined` passé `rejected`,
  `ASSET_SCAN_TIMEOUT`. Un asset déjà `clean` ou `rejected` n'est jamais modifié.

## Corpus réel (propriétaire, 2026-10-18)
- Le propriétaire dépose dans `corpus-reel/` (ignoré par Git, seul le README est suivi) des logos et chartes d'une
  page trouvés en ligne. Usage local : vérité terrain des codes couleur officiels et robustesse sur des fichiers
  réels. Il complète le corpus de 20 logos créés pour le projet, sans le remplacer ni devenir une fixture commitée.

## Corpus de logos : mesures et constats (délégation, 2026-10-18) — à reporter dans `docs/05_ENGINES.md` §2.4 et §6
- Tolérance du test du corpus (ΔE_OK entre couleur attendue et grappe la plus proche) : **0,01 pour un aplat**,
  **0,10 pour un arrêt de dégradé** (un dégradé est découpé en tranches dont les centres approchent seulement ses
  arrêts). Aucune grappe imprévue de part ≥ 2 % hors dégradés.
- Les 14 SVG passent l'assainisseur sans avertissement ; variantes noire et blanche : fidélité 1,0 ; chemin
  `raster-fallback-needed` pour les 2 logos à masque ou filtre.
- **Constat JPEG** : les artefacts de compression autour des formes donnent une grappe quasi blanche `#FFFBFF`
  (1,9 % et 3 %), non exclue par l'étape 2 (seuil ΔE_OK 0,01 du fond). Sans effet sur les rôles aujourd'hui (elle
  deviendrait au plus `neutralLight`) ; à reconsidérer si les logos réels le confirment.
- **Point ouvert (propriétaire)** : §2.4 7a, « le centre reste la couleur la plus lourde de la grappe d'accueil ».
  Lecture appliquée : le centre de la grappe d'accueil ne change pas. Conséquence (g02-aurora) : le cœur uni
  `#00C2FF`, 2e couleur la plus présente, fusionné dans une grappe plus grosse de centre `#159EEF`, disparaît de la
  palette. Autre lecture possible : recalculer le centre comme la couleur la plus lourde après fusion (le cyan
  resterait). Moteur inchangé en attendant la décision.

## Corpus privé (propriétaire, 2026-10-18)
- Le dépôt du projet est **public** : les fichiers réels (Pinterest, chartes PDF) et la bibliothèque de 1 432 SVG n'y
  sont jamais poussés. Ils vivent dans le dépôt **privé** `lawrenceHD/Graph_Charta`, récupéré par
  `pnpm corpus:fetch` dans `.cache/corpus-private/` (ignoré). Lots d'origine intacts sous `raw/`.
- Mandat du propriétaire : exploiter à fond ce corpus et ses chartes PDF (documentation du métier, banc d'essai
  sur fichiers réels, robustesse des algorithmes), décisions A, B, C du 2026-10-18 acceptées sur recommandation de
  l'agent (tolérance JPEG du fond, couleur de fond vive proposée comme couleur de marque, centre recalculé après
  fusion) ; à reporter dans `docs/05_ENGINES.md` §2.4–§2.5 lors de leur mise en œuvre.
- **Décision D (2026-10-18, « fais au mieux » du propriétaire, sur recommandation de l'agent)** — §2.4 étape 2 :
  la part « ≥ 90 % du pourtour » se calcule sur le **pourtour entier**, pixels transparents compris, et non plus sur
  ses seuls pixels retenus. Motif (banc d'essai, échantillon de 174 SVG de la bibliothèque) : un logo transparent
  dont le dessin touche les bords n'a que sa propre couleur parmi les pixels opaques du pourtour ; elle était prise
  pour un fond et supprimée — **57 logos plats sur 128 (45 %) donnaient `EMPTY_IMAGE`**.
- **Mise en œuvre de A et D** (`packages/color-engine/src/extract/pixels.ts`) : tolérance du fond ΔE_OK **0,03**
  (au lieu de 0,01 : bruit JPEG) ; part du pourtour **0,75** (au lieu de 0,9 : un logo recadré serré touche deux
  bords) ; condition « ≥ 30 % des pixels retenus » inchangée. Mesures avant / après (logos plats) : transparent,
  logos parfaits 56 % → 96 %, `EMPTY_IMAGE` 57 → 0 ; JPEG sur blanc, part de grappes intruses 37 % → 7 %.
  À reporter dans `docs/05_ENGINES.md` §2.4 étape 2 (texte proposé : « Si ≥ 75 % des pixels du pourtour entier,
  transparents compris, sont à ΔE_OK < 0,03 de la couleur opaque la plus fréquente du pourtour… »).
- **Halo JPEG (suite de A)** : le fond retiré s'étend, de proche en proche (4-connexité), aux pixels retenus à
  ΔE_OK < **0,06** de sa couleur : teintes quasi blanches laissées par la compression autour des formes (jusqu'à
  16 % des pixels d'un logo à traits fins). Un gris clair voulu (`#E0E0E0`, 0,093 du blanc) reste.
- **Mise en œuvre de B** : `extractPalette` renvoie en plus `background` (couleur du fond retiré, part des pixels
  retenus) ; `brandClusters(palette)` le place en tête des grappes données à `assignRoles` quand il est vif
  (chroma OKLCH ≥ **0,10**, `VIVID_BACKGROUND_CHROMA`), parts recalculées pour sommer à 1. Il devient alors en
  général le `primary`. Blanc, gris et cartes pastel des planches de présentation ne sont pas proposés. Vérifié sur
  les chartes réelles du corpus privé (détail dans ses rapports) : logo montré sur son aplat de marque → la couleur
  principale de la charte ; logo en négatif sur sa couleur → cette couleur ; icônes carrées pleines → leur couleur.
- **Mise en œuvre de C** : §2.4 7a, après une fusion le centre devient la couleur la plus lourde de la grappe
  fusionnée (à égalité : hexadécimal croissant) ; c'est toujours une couleur réelle, jamais une moyenne. Ferme le
  point ouvert ci-dessus (g02-aurora : le cyan uni reste).
- **Mesures** (banc `tools/corpus/bench.mjs`, échantillon stratifié de 174 SVG, logos plats, part de logos
  parfaits — toutes couleurs visibles trouvées et aucune grappe intruse — avant → après A, B, C, D et halo) :
  PNG transparent 56 % → 98 % ; PNG sur blanc 71 % → 85 % ; JPEG sur blanc 20 % → 67 % ; JPEG sur planche de
  présentation 13 % → 65 %. Limite connue : un logo recadré au ras qui touche plus d'un quart du pourtour garde son
  fond blanc (grappe neutre claire, sans effet sur `primary`).
- **Liseré de présentation (2026-10-19, suite de A)** : si le pourtour ne révèle pas de fond, les anneaux situés
  1 à 4 px à l'intérieur sont essayés tour à tour, tant que la bande extérieure ressemble à un liseré : opaque et
  d'une seule couleur (≥ 90 % à ΔE_OK < 0,10 de sa couleur la plus fréquente). Le liseré part avec le fond. Cas
  réel : export encadré d'un trait clair de 2 px, fond marine jamais retiré (94 % de la palette) ; après, les trois
  couleurs du logo. Garde-fous testés : marge transparente, tuile arrondie recadrée au ras sur blanc.

## T-019 partie 1 (délégation, 2026-10-19) — à reporter dans `docs/03_DATA_MODEL.md` et `docs/04_API_CONTRACTS.md` §5
- **BLOCKER reprise SSE tranché : option A.** Table `project_events` (id identité croissant, `project_id`, `type`,
  `data` jsonb validé par `ProjectEventSchema`, `created_at`), migration `0001_project_events`. NOTIFY ne garde rien ;
  le client reconnecté rejoue les lignes après `Last-Event-ID`.
- **Ordre garanti** : chaque écrivain ajoute l'événement dans la transaction du changement qu'il annonce, sous un
  verrou consultatif par projet (`pg_advisory_xact_lock`) : les id d'un projet deviennent visibles dans l'ordre, un
  lecteur ne peut pas sauter un id validé plus tard.
- **Flux** : une connexion LISTEN par processus web ; le réveil dit seulement « relis » (curseur d'id), donc une
  notification perdue ou dupliquée ne perd ni ne répète rien. Battement `: ping` toutes les 15 s, qui relit aussi
  le journal (rattrapage au pire 15 s). `retry: 3000`. Le flux se ferme au bout de 10 min : le client se reconnecte
  et ses droits sont revérifiés (`project:read`). `Last-Event-ID` mal formé → rejeu complet.
- **Rétention** : 24 h (job horaire), et les événements partent avec leur projet. Au-delà, le client recharge
  l'état du projet (`GET /projects/:id`).
- **`asset.status`** : émis à `quarantined` (web, `complete`), `clean` et `rejected` (worker, lettre morte
  comprise), une seule fois par transition.
- **BLOCKER stockage de l'analyse** : option A retenue pour la partie 2 (variantes = assets `logo_variant`,
  palette dans `meta` de l'asset `logo_sanitized`, document composé à l'étape 4).

## Variantes monochromes : structure (propriétaire, 2026-10-19) — à reporter dans `docs/05_ENGINES.md` §5.2 et §5.3
- **Constat (propriétaire)** : des variantes monochromes « perdent leur forme ». Mesuré sur 39 logos multicolores de la
  bibliothèque : le tracé §5.2 (tout en une couleur) efface le dessin intérieur de **27** d'entre eux (69 %) — les pièces
  qui se touchent fusionnent en silhouette. Le score §5.3 (IoU des silhouettes) ne le voit pas : la silhouette est intacte.
- **Score de structure** (`structureScore`) : part des frontières de couleur intérieures de l'original (pixels pleins
  voisins d'écart RVB > 48, rendu 512 px) encore visibles dans la variante, par un vide ou un changement de teinte, dans
  un rayon de 2 px. Seuil **0,9**.
- **Variante une couleur séparée** (`monochromeSvg(…, { separation })`) : chaque forme d'une nouvelle couleur découpe un
  filet le long de son contour dans l'encre peinte avant elle (même mécanisme que les évidements §5.1). Filet : **1,5 %**
  du plus grand côté du logo. C'est le dessin des versions une couleur de ces logos pour l'impression.
- **Choix** (`monochromeVariant`) : tracés essayés dans l'ordre — §5.2 ; **évidements** (surfaces de luminance ≥ 0,6
  évidées au lieu de 0,9 : lettrage clair sur un badge sombre) ; **séparé** — le premier qui garde la structure
  (≥ 0,9) l'emporte. Un tracé à évidements est refusé s'il ouvre plus de 1 % de l'encre de l'original sur l'extérieur
  (`exteriorLoss` : un élément qui disparaîtrait au lieu d'être évidé). Avertissement `MONO_STRUCTURE_LOST` si aucun
  n'y parvient. Sur le banc : les 27 cas perdus passent à ≥ 0,92.
- **Limite connue** : un « logo » livré avec son fond de présentation (extraction de PDF : page blanche, panneaux
  pleine page découpés par `clipPath`) reste un pavé (structure 0). À traiter avec la détection de fond de l'analyse
  (décisions A et D), sans casser les logos dont le fond carré est le logo (icônes d'application).
- **Variante tonale** (`tonalSvg`) : une nuance de la cible par couleur (noir → gris moyen ; blanc → gris clair) ;
  structure gardée sur 38/39 logos. Proposée dans la charte à côté des variantes une couleur.
- **À trancher par le chef de projet** : l'IoU d'une variante séparée descend à 0,85–0,99 (les filets retirent de
  l'encre) ; la règle « ≥ 0,97 validée » de §5.3 doit s'appliquer au tracé non séparé, ou être remplacée par
  « structure ≥ 0,9 et IoU ≥ 0,85 » pour une variante séparée.

## Moteurs : défauts trouvés par la maquette (délégation, 2026-10-23) — à reporter dans `docs/05_ENGINES.md` §3.7 et §5.2
- **resvg 2.6.2** panique (`geom.rs:27`, le processus enfant meurt) quand un groupe découpé, masqué ou translucide a
  tout son contenu hors du canevas : 6 des 8 chartes du corpus finissaient `RASTER_FAILED`. Aucune version stable
  plus récente (seulement des alpha, refusées par ADR-002). Contournement dans `child.ts` : si le contenu déborde
  du viewBox, rendu sur un canevas élargi de pixels entiers aux échelles de resvg (par axe), puis découpe ; pixels
  identiques à un rendu normal (test au pixel près), plafond 16 M pixels au-delà duquel on revient au rendu normal.
- **Fond de présentation** (`withoutBackdrop`, `logo-kit`) : les premières formes peintes, d'une couleur unie claire
  (luminance ≥ 0,6) et non vive (chroma OKLCH < 0,10, seuil de la décision B), sans contour, qui couvrent seules
  ≥ 99 % du canevas, sont retirées avant les variantes monochromes. Restent : tuile arrondie (≈ 96 %), aplat vif,
  pastille sombre, surface claire peinte après l'encre (évidement), logo fait seulement de telles formes.

## T-019 partie 2a (délégation, 2026-10-23) — à reporter dans `docs/03_DATA_MODEL.md`, `docs/04_API_CONTRACTS.md` §3, §7, §8
- **Découpage** : 2a = route, idempotence, job étapes 1–2 ; 2b = étape 3 sans IA et étape 4 (document initial,
  `analysis.done { seq }`). Motif : limite de 400 lignes hors tests.
- **Table `analysis_runs`** (migration `0002`) : `id`, `project_id`, `logo_asset_id`, `idempotency_key` (unique par
  projet), `status` (`pending|running|done|failed`), `step` (dernière étape faite), `error_code`. Purgée avec le projet.
- **`POST /projects/:id/analyze`** : action `project:write` (l'invité analyse, limite 5/h) ; en-tête
  `Idempotency-Key` obligatoire (ASCII visible, 1–255) sinon `400 IDEMPOTENCY_KEY_INVALID` ; même clé → `200` et
  la même analyse (job renvoyé si encore `pending`) ; nouvelle clé → `202 { analysis: { id, status, step,
  errorCode } }`. Sans logo `clean` → `409 LOGO_NOT_READY`, sans consommer la limite. On analyse le dernier
  `logo_sanitized` propre. Limites : 5/h invité, 30/jour compte, 30/jour par IP (§7 « par identité et par IP »).
- **Job `project.analyze`** (`{ analysisId }`, clé singleton = id, lettre morte `project.analyze.failed` →
  `ANALYSIS_TIMEOUT` sur l'étape en cours) : étape 1, palette (rendu 400 px ou PNG normalisé, `extractPalette`,
  `brandClusters`, `assignRoles`) dans `meta.palette` du `logo_sanitized` ; étape 2, variantes noire et blanche
  (`monochromeVariant`) en assets `logo_variant` (`meta` : `logoAssetId`, `variant`, `drawing`, `structure`,
  `warnings`), clés de stockage déterministes. Logo matriciel ou dessin à masque/filtre : étape 2 `done` avec
  `code: VARIANTS_NEED_VECTOR` (vectorisation, T-011). Chaque étape valide son résultat, `step` et son événement
  dans une transaction : une reprise repart après la dernière étape faite. Erreur métier (`EMPTY_IMAGE`,
  `LOGO_UNREADABLE`…) → analyse `failed` et `analysis.step { state: 'failed', code }`.
