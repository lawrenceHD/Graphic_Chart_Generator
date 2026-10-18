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
