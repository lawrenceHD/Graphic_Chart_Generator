# Tickets — Phases 0 et 1

> Statut : **prêts à lancer dans l'ordre** — Version 4.0 — 2026-10-07
> Chaque ticket suit le gabarit de `docs/12_WORKFLOW_ROADMAP.md` §4 et la Definition of Done de `docs/10_QUALITY.md` §4.
> L'agent lit `AGENTS.md` **avant** chaque ticket. Une session = un ticket.

## Ordre et dépendances

```
T-001 → T-002
T-001 → T-003
T-001 → T-004 → T-005 → T-006
T-001 → T-007 → T-008 → T-009 → T-012
T-004 → T-010 (spike ICC)           [parallèle possible]
T-008 → T-011 (spike vectorisation) [parallèle possible]
T-002 → T-013 (spike auth)          [début de P2]
```

Phase 0 : T-001, T-002. Phase 1 : T-003 à T-012. Phase 2 : à partir de T-013 (voir §Backlog).

---

# T-001 — Squelette du monorepo et CI
**Phase** P0 · **Taille** M · **Dépend de** —

## Objectif
Un monorepo vide mais **outillé** : `pnpm verify` échoue dès qu'une règle de qualité, de typage ou de dépendances est violée.

## À lire
`AGENTS.md` ; `docs/02_ARCHITECTURE.md` §2–§4 ; `docs/10_QUALITY.md` §8.

## Périmètre
**Autorisés** : fichiers racine (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.*`, `.prettierrc`, `.editorconfig`, `.gitignore`, `.nvmrc`, `.dependency-cruiser.cjs`, `.gitleaks.toml`, `.github/workflows/ci.yml`), et pour chaque package de `docs/02_ARCHITECTURE.md` §3 : `package.json`, `tsconfig.json`, `src/index.ts` (export vide), `vitest.config.ts`.
**Interdits** : toute logique métier ; Next.js ; base de données.
**Dépendances autorisées** (dev) : `typescript`, `turbo`, `eslint`, `typescript-eslint`, `prettier`, `vitest`, `dependency-cruiser`, `fast-check`.

## Spécification
1. pnpm workspaces `apps/*`, `packages/*`. Versions : dernières stables, épinglées exactement (pas de `^`). Fichier `.nvmrc` sur Node LTS.
2. `tsconfig.base.json` : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `noFallthroughCasesInSwitch`, `isolatedModules`.
3. ESLint (config plate) :
   - `@typescript-eslint/no-explicit-any: error`, `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `no-non-null-assertion: error`, `ban-ts-comment: error`.
   - Pour `color-engine`, `document`, `logo-kit` : interdiction de `Date`, `Math.random`, `process`, `fetch` (globals/properties restreints) et des imports `node:*`.
4. dependency-cruiser : implémenter **exactement** les règles de `docs/02_ARCHITECTURE.md` §4 (y compris l'interdiction des cycles et de `apps/*` importé par un package).
5. Scripts racine : `lint`, `typecheck`, `test`, `build`, `deps:check`, et `verify` = les cinq dans l'ordre.
6. CI GitHub Actions (sur pull request) : installation avec `--frozen-lockfile`, `gitleaks`, puis `pnpm verify`.
7. Chaque package a **un test réel** de son propre périmètre d'outillage : dans `packages/contracts`, exporter et tester le schéma `HexColor` (`^#[0-9A-F]{6}$`, normalisation en majuscules, rejet de `#fff`). Les autres packages n'ont pas de test factice : leur script `test` utilise `--passWithNoTests`.

## Tests d'acceptation
1. `pnpm install --frozen-lockfile` réussit sur un clone propre.
2. `pnpm verify` réussit sur l'arbre propre.
3. **Sabotages** à réaliser et noter (puis annuler) : (a) ajouter `const x: any = 1` dans `packages/contracts` → `lint` échoue ; (b) importer `apps/web` depuis `packages/color-engine` → `deps:check` échoue ; (c) appeler `Date.now()` dans `packages/document` → `lint` échoue ; (d) créer un cycle entre deux packages → `deps:check` échoue.
4. Test `HexColor` : accepte `#aabbcc` (normalisé `#AABBCC`), refuse `#abc`, `abcdef`, `#GGGGGG`.
5. Le workflow CI est présent et syntaxiquement valide ; **le propriétaire** vérifie son exécution sur GitHub et colle le résultat.

## Hors périmètre
Husky/hooks, Docker, Next.js, composants UI, bibliothèques non listées.

---

# T-002 — Application web minimale, configuration validée, santé
**Phase** P0 · **Taille** M · **Dépend de** T-001

## Objectif
Une app Next.js qui **refuse de démarrer** si sa configuration est invalide, expose `/api/health` et applique les en-têtes de sécurité, avec une base PostgreSQL locale.

## À lire
`docs/02_ARCHITECTURE.md` §6–§7 ; `docs/08_SECURITY_PRIVACY.md` §3 ; `docs/04_API_CONTRACTS.md` §1–§2.

## Périmètre
**Autorisés** : `apps/web/**`, `packages/db/**` (connexion seulement, pas de schéma métier), `infra/docker-compose.dev.yml`, `.env.example`, `packages/contracts/src/env.ts` et `error.ts`.
**Dépendances autorisées** : `next`, `react`, `react-dom`, `zod`, `pino`, `pg`, `drizzle-orm`, `drizzle-kit`, types associés, `@playwright/test` (dev), `testcontainers` ou équivalent **uniquement** si le ticket l'exige (sinon docker compose de test).

## Spécification
1. `apps/web` : page d'accueil minimale (texte seul, sans style), route `GET /api/health`.
2. `contracts` : schéma Zod `Env` (variables du §6 de l'architecture ; en développement, valeurs de substitution explicites **uniquement** dans `.env.example`) ; fonction `loadEnv(source)` pure retournant `Result`. Le démarrage de l'app échoue avec un message listant les variables invalides, **sans afficher leurs valeurs**.
3. `contracts` : type d'erreur RFC 9457 (`ProblemDetails`) et fabrique `problem(code, status, detail, hint?)`.
4. Logger pino JSON avec `requestId` ; masquage des champs sensibles (`authorization`, `cookie`, `password`, `token`).
5. `/api/health` : vérifie la base (`SELECT 1`). Réponse `200 { status: "ok" }` ou `503 { status: "degraded" }` **sans** détail interne.
6. Middleware : en-têtes de `docs/08_SECURITY_PRIVACY.md` §3 avec **nonce** par requête.
7. `infra/docker-compose.dev.yml` : PostgreSQL local avec volume.

## Tests d'acceptation
1. `loadEnv` : variable manquante → erreur nommant la variable, jamais sa valeur ; valeur invalide idem.
2. L'app ne démarre pas si `DATABASE_URL` est absente (test de processus enfant).
3. `GET /api/health` → 200 avec base, 503 sans base (test d'intégration).
4. Réponse de n'importe quelle route : présence des en-têtes de sécurité ; la CSP contient un nonce différent à chaque requête.
5. Le logger ne contient pas `authorization` en clair (test sur une ligne de log).
6. **Sabotage** : retirer le contrôle de variable → les tests 1–2 échouent.

## Hors périmètre
Authentification, schéma métier, i18n, styles, composants.

---

# T-003 — Package `document` : commandes et inverses
**Phase** P1 · **Taille** M · **Dépend de** T-001

## Objectif
Le cœur de l'édition : un document de marque modifiable **uniquement** par des commandes pures réversibles.

## À lire
`docs/03_DATA_MODEL.md` §4–§5 ; `docs/04_API_CONTRACTS.md` §4 ; `docs/14_ADR_LOG.md` ADR-007.

## Périmètre
**Autorisés** : `packages/document/**`, `packages/contracts/src/**` (types partagés nécessaires).
**Dépendances autorisées** : `zod`, `fractional-indexing` (**si absente à l'installation, écrire un BLOCKER**), `fast-check` (dev).

## Spécification
1. Schémas Zod de `BrandDocument`, `Page`, `ColorToken`, `PageType` (liste de `docs/01_PRODUCT_MVP.md` §4), taille maximale du document 512 Ko.
2. Commandes (union discriminée sur `type`) : `SetColorToken`, `SetTypographyPairing`, `SetBrandField`, `SetPageField`, `SetPageOverride`, `ClearPageOverride`, `SetLogoRules`, `ReorderPage`, `AddPage`, `RemovePage`, `SelectScene`.
3. `apply(doc, command): Result<{ doc, inverse }, CommandError>` **pure** : ne mute jamais `doc` (copie structurelle).
4. Erreurs : `PAGE_NOT_FOUND`, `FIELD_NOT_ALLOWED`, `VALUE_OUT_OF_RANGE`, `INVALID_COMMAND`, `DOCUMENT_TOO_LARGE`.
5. `ReorderPage` : clés `position` fractionnaires ; réordonner n'altère que la page déplacée.
6. Chaînes normalisées NFC, bornées ; `hex` normalisé en majuscules ; `clearSpaceRatio` ∈ [0,10 ; 0,50].
7. `migrate(doc)`: squelette `schemaVersion` → version courante (identité pour la version 1) avec test d'un document de version inconnue → erreur.

## Tests d'acceptation
1. **Propriété** (fast-check) : pour toute commande valide générée, `apply(apply(doc, c).doc, inverse).doc` est égal profondément à `doc`.
2. **Propriété** : `apply` ne mute jamais son entrée (gel profond de `doc` dans le test).
3. Une commande ciblant une page inexistante → `PAGE_NOT_FOUND`, document inchangé.
4. `SetColorToken` avec `#abc` ou `rouge` → refus ; avec `#1f4bff` → stocké `#1F4BFF`.
5. `SetLogoRules` hors [0,10 ; 0,50] → `VALUE_OUT_OF_RANGE`.
6. 20 réordonnancements aléatoires consécutifs : l'ordre final correspond au modèle de référence (tableau) et les clés restent uniques.
7. Document > 512 Ko après commande → `DOCUMENT_TOO_LARGE`.
8. **Sabotage** : inverser l'inverse de `SetColorToken` → test 1 échoue.

## Hors périmètre
Base de données, API HTTP, IA, interface.

---

# T-004 — `color-engine` A : conversions, contraste, distances
**Phase** P1 · **Taille** M · **Dépend de** T-001

## Objectif
Les fondations mathématiques de la couleur, **exactes** et vérifiées par des valeurs externes.

## À lire
`docs/05_ENGINES.md` §1, §2.1–§2.3, §2.11 ; `docs/golden/color.golden.json`.

## Périmètre
**Autorisés** : `packages/color-engine/**`. **Dépendances** : aucune (dev : `vitest`, `fast-check`).

## Spécification
Fonctions pures exportées (noms contractuels) :
```ts
parseHex(input: string): Result<Rgb, 'INVALID_HEX'>   // '#RRGGBB' uniquement (majuscules ou minuscules)
toHex(rgb: Rgb): string                               // '#RRGGBB' majuscules, arrondi au plus proche
srgbToLinear(c: number): number; linearToSrgb(x: number): number
relativeLuminance(hex: string): number
contrastRatio(fg: string, bg: string): number         // symétrique, [1, 21]
wcagLevel(ratio: number): 'fail' | 'large-ui' | 'aa' | 'aaa'
formatRatio(ratio: number): string                    // TRONQUÉ à 2 décimales, ex. '4.49'
hexToOklab(hex): Oklab; oklabToHex(lab): string       // sans mappage de gamut (borne [0,255])
hexToOklch(hex): Oklch                                // teinte = 0 si C < 0.0004
hexToLab(hex): Lab                                    // CIELAB D65 (voir ci-dessous)
deltaEOk(a: string, b: string): number
deltaE2000(lab1: Lab, lab2: Lab): number
```
**CIELAB** : sRGB linéaire → XYZ D65 avec la matrice `[[0.4124564,0.3575761,0.1804375],[0.2126729,0.7151522,0.0721750],[0.0193339,0.1191920,0.9503041]]` ; blanc de référence `Xn=0.95047, Yn=1.0, Zn=1.08883` ; `f(t) = t > 216/24389 ? cbrt(t) : (841/108)·t + 4/29` ; `L = 116·f(Y/Yn) − 16`, `a = 500·(f(X/Xn) − f(Y/Yn))`, `b = 200·(f(Y/Yn) − f(Z/Zn))`.
**Formules** : **uniquement** celles de `docs/05_ENGINES.md` ; les matrices OKLab et le CIEDE2000 ne sont pas réinventés.

## Tests d'acceptation
1. Test piloté par `docs/golden/color.golden.json` (version 2) : sections `contrast` (ratio **et** `level` **et** `displayTruncated`), `formatRatio`, `srgbToLinear`, `oklab`, `deOk`, `lab_D65` (`hexToLab`), `deltaE2000_sharma` (8 paires publiées), avec les tolérances de `_meta.tolerances`. **Le fichier n'est pas modifié.** Piège volontaire : `#FF0000` sur blanc = 3,9985 s'affiche `3.99`, jamais `4.00`.
2. `wcagLevel(contrastRatio('#777777','#FFFFFF'))` = `'large-ui'` ; `'#767676'` → `'aa'` ; `'#595959'` → `'aaa'`.
3. `formatRatio(4.499)` = `'4.49'` ; `formatRatio(21)` = `'21.00'` ; **jamais** d'arrondi vers le haut.
4. **Propriétés** : `toHex(parseHex(h))` = `h` normalisé ; aller-retour OKLab ±1 par canal 8 bits ; `contrastRatio(a,b) = contrastRatio(b,a)` ; `1 ≤ ratio ≤ 21`.
5. `parseHex` refuse `#fff`, `fff`, `#GGGGGG`, `''`, `#12345`, `#1234567`.
6. **Sabotage** : changer le seuil `0.04045` en `0.04` → au moins un test golden échoue ou, à défaut, signaler que le test ne détecte pas cette erreur (et renforcer).

## Hors périmètre
Extraction de palette, CMJN, échelles, interface.

---

# T-005 — `color-engine` B : extraction de palette et rôles
**Phase** P1 · **Taille** L → **à découper en 2 sessions si > 400 lignes** · **Dépend de** T-004

## Objectif
Extraire une palette **déterministe** d'une image décodée et attribuer les rôles.

## À lire
`docs/05_ENGINES.md` §2.4–§2.6, §6.

## Périmètre
**Autorisés** : `packages/color-engine/src/extract/**`. **Dépendances** : aucune.

## Spécification
- API : `extractPalette(image: { width, height, data: Uint8ClampedArray }, options?): Result<ExtractedPalette, 'EMPTY_IMAGE'>` ; `assignRoles(clusters, options): PaletteRoles`.
- Algorithme **exactement** celui de §2.4 (étapes 1 à 8), rôles §2.5, dérivations §2.6.
- Aucun accès à `Math.random` ; tri stable avec départage par hexadécimal.
- Les images de test sont **générées par le code de test** (tableaux de pixels), pas de fichiers binaires.

## Tests d'acceptation (cas générés)
1. **Deux aplats** 60 % / 40 % (rouge et bleu) : `primary` = la plus grosse, `accent` = l'autre ; `source = 'extracted'`.
2. **Fond blanc opaque** autour d'un logo bicolore : le blanc est exclu.
3. **Disque anti-aliasé** sur fond transparent : les couleurs intermédiaires des bords n'apparaissent pas dans la palette.
4. **Logo noir seul** : `primary` noir ; `accent`, `neutralLight`, `neutralDark` **dérivés** (`source = 'derived'`) et dans le gamut ; aucune erreur.
5. **Dégradé** : au plus 8 grappes, triées par part décroissante.
6. **Traits de 1 px** : l'exclusion des bords est désactivée (repli) et la palette est non vide.
7. **Image entièrement transparente** → `EMPTY_IMAGE`.
8. **Déterminisme** : mêmes pixels mélangés dans un autre ordre → résultat identique à l'octet près.
9. **Propriété** : deux appels successifs identiques ; aucune grappe ne contient deux couleurs à ΔE_OK ≥ 0,04 de son centre.
10. **Couleurs dérivées** : pour chacun des 4 `primary` de la section `derivedColors` de `docs/golden/color.golden.json` (`#1F4BFF`, `#FFD60A`, `#000000`, `#B3261E`), les rôles `accent`, `neutralLight`, `neutralDark` dérivés égalent les valeurs du fichier (±1 par canal, `_meta.tolerances.gamutHexPerChannel`). Ces valeurs sont issues d'une implémentation de référence de la spécification, pas d'une norme publiée : en cas de divergence, **BLOCKER** plutôt que de modifier le fichier.
11. **Sabotage** : changer `mergeThreshold` de `0.04` à `0.4` → au moins un test échoue.

## Hors périmètre
Rasterisation SVG (T-008), échelles (T-006), interface.

---

# T-006 — `color-engine` C : gamut, échelles, matrice de contraste
**Phase** P1 · **Taille** M · **Dépend de** T-005

## À lire
`docs/05_ENGINES.md` §2.7–§2.9.

## Spécification
`mapToGamut(L, C, h)`, `oklchToHexMapped`, `buildScale(hex)` (11 pas), `buildContrastMatrix(palette)`, `bestTextFor(bg, candidates)`.

## Tests d'acceptation
1. `mapToGamut` : sortie toujours dans le gamut ; `L` et `h` inchangés ; chroma **maximale** (une chroma + 0,005 sort du gamut) sur 200 couleurs hors gamut.
2. `buildScale` : lightness **strictement décroissante**, teinte constante à ±1°, 11 valeurs, toutes dans le gamut, pour 50 couleurs aléatoires et pour les cas limites (`#000000`, `#FFFFFF`, `#808080`, `#FF0000`, `#00FF00`, `#0000FF`).
3. `buildContrastMatrix` d'une palette de `n` couleurs : `n·(n−1)` cellules, `ratio` identique à `contrastRatio`, niveaux conformes à `wcagLevel`.
4. `bestTextFor('#1F4BFF', …)` choisit le candidat au ratio maximal ; à égalité, ordre stable.
5. **Vecteurs de référence** : `mapToGamut` reproduit la section `gamutMapping` (chroma ±0,0005, hex ±1 par canal) et `buildScale` reproduit la section `scales` (`#1F4BFF`, `#FFD60A`, `#808080`, hex ±1 par canal). Mêmes règles de divergence que T-005 : **BLOCKER**, pas de modification du fichier.
6. **Sabotage** : inverser le sens de la dichotomie du gamut → test 1 échoue.

---

# T-007 — `svg-engine` A : assainisseur et corpus d'attaque
**Phase** P1 · **Taille** L → découper si besoin · **Dépend de** T-001

## Objectif
Un assainisseur SVG à **liste blanche** qui reconstruit l'arbre, refuse ce qui est dangereux, et dont le comportement est prouvé par un corpus d'attaque.

## À lire
`docs/05_ENGINES.md` §3 ; `docs/10_QUALITY.md` §6 ; `docs/08_SECURITY_PRIVACY.md` (SEC-12 à SEC-16) ; `docs/04_API_CONTRACTS.md` (codes d'erreur d'asset).

## Périmètre
**Autorisés** : `packages/svg-engine/src/sanitize/**`, `packages/svg-engine/fixtures/**`, `packages/contracts/src/asset-errors.ts`.
**Dépendances autorisées** : `sax` (analyse XML), `css-tree` (analyse CSS pour `<style>`), `fast-check` (dev). Si l'une est inadaptée → BLOCKER avec alternative.

## Spécification
- API : `sanitizeSvg(bytes: Uint8Array): Result<{ svg: string; warnings: Warning[]; stats: Stats }, SanitizeError>`.
- Implémenter **exactement** §3.1 à §3.6 : limites, listes d'éléments et d'attributs, valeurs `href`/`url()`, `style` et `<style>`, intégrité des références, normalisation.
- La sortie est **re-sérialisée** à partir de l'arbre filtré ; le texte d'origine n'est jamais renvoyé.
- Codes : `ASSET_SVG_FORBIDDEN_CONTENT`, `ASSET_SVG_UNSUPPORTED_FEATURE`, `ASSET_SVG_TOO_COMPLEX`, `ASSET_TOO_LARGE`, `ASSET_DECODE_FAILED`.
- Le `viewBox` manquant est calculé à partir de `width`/`height` ; s'il n'existe aucune dimension, retourner un avertissement `VIEWBOX_NEEDS_BBOX` (la boîte englobante sera calculée en T-008).

## Tests d'acceptation
1. **Corpus d'attaque** : les **30 cas** de `docs/10_QUALITY.md` §6 sont des fichiers de fixtures ; chacun produit **exactement** le résultat attendu (refus avec code, ou sortie nettoyée).
2. **Corpus légitime** : 10 SVG simples (un par type d'élément autorisé, plus deux sorties d'éditeur) sont acceptés ; le nombre de formes géométriques de la sortie égale celui de l'entrée.
3. **Idempotence** : `sanitize(sanitize(x).svg)` produit la même sortie (propriété sur les fixtures légitimes).
4. **Propriété** (fast-check) : insérer un motif interdit (`onload`, `javascript:`, `<script`, `<!ENTITY`) à un endroit aléatoire d'un SVG légitime → soit refus, soit sortie sans le motif ; **jamais** une sortie contenant le motif.
5. Déterminisme : mêmes octets → mêmes octets.
6. Le message d'erreur d'un SVG avec `<text>` contient un `hint` d'export en contours.
7. **Sabotage** : retirer `foreignObject` de la liste de refus → le test du cas 5 échoue.

## Hors périmètre
Rasterisation, bbox (T-008), variantes de logo, upload.

---

# T-008 — `svg-engine` B : rasterisation isolée, boîte englobante, images raster
**Phase** P1 · **Taille** M · **Dépend de** T-007

## À lire
`docs/05_ENGINES.md` §3.6–§3.7, §4 ; `docs/08_SECURITY_PRIVACY.md` SEC-12, SEC-13, SEC-15.

## Périmètre
**Autorisés** : `packages/svg-engine/src/raster/**`, `packages/svg-engine/src/detect/**`.
**Dépendances autorisées** : `@resvg/resvg-js`, `sharp`.

## Spécification
1. `detectType(bytes): 'png' | 'jpeg' | 'webp' | 'svg' | 'unknown'` — **par octets magiques**, sans dépendance, tolérant au BOM et aux espaces pour le SVG.
2. `rasterizeSvg(svg: string, width: number): Promise<Result<{ png: Uint8Array; width; height }, RasterError>>` : exécutée **dans un processus enfant** (délai de 5 s, arrêt forcé, mémoire plafonnée par l'option du processus). Refuse tout SVG qui n'a pas été produit par `sanitizeSvg` (marqueur d'assainissement vérifié).
3. `svgBBox(svg): Result<Rect, …>` via resvg (vérifier l'API dans la version installée) ; `ensureViewBox(svg)` complète le `viewBox` avec la boîte englobante lorsque l'avertissement `VIEWBOX_NEEDS_BBOX` est présent.
4. `normalizeRaster(bytes): Promise<Result<{ png; width; height }, RasterError>>` : refus > 8192 × 8192 ou > 10 Mo ; correction EXIF ; suppression des métadonnées ; sortie PNG RGBA ; `limitInputPixels` activé.
5. Réduction « plus proche voisin » pour l'analyse : `downscaleNearest(image, maxSide = 512)`.

## Tests d'acceptation
1. `detectType` : PNG, JPEG, WebP, SVG corrects ; un SVG renommé `.png` → `'svg'` ; un fichier HTML renommé `.svg` → `'unknown'` ; un fichier vide → `'unknown'`.
2. Rasterisation d'un SVG simple connu (carré rouge 10×10 dans un viewBox 10×10) à 100 px : pixel central = `#FF0000`, coin hors forme transparent.
3. `rasterizeSvg` refuse un SVG non assaini (chaîne brute) avec une erreur explicite.
4. Un SVG qui boucle (formes coûteuses) est interrompu par le délai de 5 s : erreur `ASSET_SCAN_TIMEOUT`, processus tué (test avec un délai réduit injecté).
5. `svgBBox` sur un SVG dont le contenu occupe la moitié du viewBox retourne cette moitié (±0,5).
6. `normalizeRaster` : PNG 9000×100 refusé ; JPEG avec EXIF d'orientation 6 → sortie tournée, sans métadonnées ; PNG tronqué → `ASSET_DECODE_FAILED`.
7. `downscaleNearest` n'introduit **aucune** couleur absente de l'image source (propriété).
8. **Sabotage** : retirer la vérification du marqueur d'assainissement → test 3 échoue.

## Hors périmètre
Variantes de logo (T-009), vectorisation (T-011), stockage.

---

# T-009 — `logo-kit` A : variantes monochromes et score de fidélité
**Phase** P1 · **Taille** M · **Dépend de** T-008

## À lire
`docs/05_ENGINES.md` §5.1–§5.3.

## Périmètre
**Autorisés** : `packages/logo-kit/src/mono/**`. **Dépendances** : aucune nouvelle (utilise `svg-engine`, `color-engine`).

## Spécification
1. `monochromeSvg(svg: string, target: '#000000' | '#FFFFFF'): Result<{ svg; path: 'structural' | 'raster-fallback-needed'; warnings }, …>` — chemin **structurel** de §5.2 ; retourne `raster-fallback-needed` si le SVG contient `mask`, `filter` ou ressemble à du raster ; le chemin raster réel est branché par injection (`vectorizer` passé en paramètre, implémenté plus tard).
2. Règle **encre / surface claire** de §5.1.
3. `inkMask(rasterRgba): Uint8Array` et `iou(maskA, maskB): number` (§5.3).
4. `fidelityScore(originalSvg, variantSvg): Promise<number>` : rasterise les deux à 1024 px (via T-008) et retourne l'IoU.

## Tests d'acceptation
1. Logo à une couleur → variante noire : IoU ≥ 0,99 ; toutes les formes sont noires.
2. Logo bicolore (rouge + bleu) → noir : deux formes noires, IoU ≥ 0,99.
3. Logo avec disque clair **sur** une forme colorée (≥ 0,9 de luminance) : le disque devient **évidement** (absent du noir) ; IoU calculé contre le masque « encre » ≥ 0,97.
4. Logo **uniquement blanc** : conservé en variante blanche, **non vidé**.
5. Dégradé : remplacé par la couleur cible ; aucune référence `url(#…)` ne subsiste.
6. SVG avec `mask` → `path = 'raster-fallback-needed'`.
7. `iou` : deux masques identiques → 1 ; disjoints → 0 ; moitié recouverte → 1/3 (cas de référence).
8. **Sabotage** : inverser le seuil 0,9 → test 3 ou 4 échoue.

---

# T-010 — SPIKE : CMJN par profil ICC
**Phase** P1 · **Taille** S (≤ 2 jours) · **Dépend de** T-004
**Livrable** : `docs/spikes/T-010-icc.md` + un adaptateur `toCmykIndicative` dans `packages/color-engine/src/cmyk/` (interface seulement si la décision est « abandon »).

## Questions
Quelle bibliothèque convertit sRGB → FOGRA39 de façon fiable, rapide et sous licence compatible ?

## Candidats
(a) **sharp/libvips** avec conversion de profil ICC (déjà une dépendance) ; (b) un **LittleCMS en WASM** publié sur npm ; (c) l'outil en ligne de commande **`transicc`** de LittleCMS comme **référence (oracle)**, non comme solution de production.
Dépendances : autorisées pour l'**évaluation** uniquement ; le choix final est documenté.

## Protocole
1. Le propriétaire télécharge le profil FOGRA39 (famille ISO Coated v2 ECI, variante 300 %) depuis le site de l'ECI et en conserve la licence dans `assets/icc/`.
2. Jeu de 24 couleurs : blanc, noir, 3 gris, primaires/secondaires saturés, 6 couleurs de marque, 4 couleurs hors gamut notoires (`#00FF00`, `#0000FF`, `#FF00FF`, `#00FFFF`).
3. Pour chaque candidat : valeurs CMJN (intention colorimétrique relative + compensation du point noir), temps par conversion.
4. Comparer au candidat (c).

## Critères de décision
- Écart ≤ 1 point de pourcentage sur chaque canal avec l'oracle, sur au moins 22 des 24 couleurs.
- Invariants : blanc → (0, 0, 0, 0) ; rampe de gris monotone ; encre totale ≤ limite du profil ; aller-retour ΔE2000 < 2 pour les couleurs dans le gamut et > 5 pour au moins 3 des 4 couleurs hors gamut.
- Temps ≤ 5 ms par conversion après initialisation ; licence compatible avec un produit commercial.
- **Sortie** : recommandation (ou « masquer le CMJN au MVP »), valeurs de référence enregistrées comme test de non-régression.

---

# T-011 — SPIKE : vectorisation d'un logo raster
**Phase** P1 · **Taille** S (≤ 2 jours) · **Dépend de** T-008
**Livrable** : `docs/spikes/T-011-vectorisation.md`.

## Questions
Quelle qualité atteint-on sur de vrais logos, avec quel outil, et quel seuil d'IoU est réaliste ?

## Pré-requis (propriétaire)
Fournir **au moins 10 logos PNG** (les siens, ceux de clients avec autorisation, ou libres de droits) : formes simples, avec dégradés, traits fins, texte, fond transparent et fond blanc.

## Candidats
vtracer (CLI ou WASM) ; potrace (**licence GPL : à écarter sauf avis contraire**, documenter) ; autres si pertinent.

## Protocole
Pour chaque logo : retrait du fond, binarisation « encre », vectorisation, rasterisation du résultat, IoU, temps, poids du SVG après optimisation.

## Critères de décision
- **Adopter** si la médiane de l'IoU ≥ 0,97 et le 10e centile ≥ 0,93 ; temps ≤ 3 s par logo.
- Sinon : politique « variante raster **à vérifier** » obligatoire, avec avertissement visible, et catégoriser les échecs (dégradés, traits fins, texte).
- **Sortie** : paramètres recommandés, catégories d'échec, décision d'intégration.

---

# T-012 — `logo-kit` B : favicon, clear space, Do & Don't
**Phase** P1 · **Taille** M · **Dépend de** T-009

## À lire
`docs/05_ENGINES.md` §5.4–§5.6.

## Spécification
1. `faviconSvg(svg, options): Result<{ svg; size }, …>` : `S = max(W, H) / 0.8`, logo centré, fond transparent ou uni à coins arrondis (rayon 18 % de `S`).
2. `clearSpace(bbox, ratio)` → `{ x, zone }` ; `clearSpaceDiagramSvg(...)` (logo, rectangle pointillé, 4 carrés `X`).
3. `dosAndDontsSvg(svg, palette)` → 4 panneaux (déformation ×1,4 ; rotation −15° ; couleur hors palette complémentaire de l'accent ; fond de contraste < 3 choisi par le moteur de couleur) avec icône croix et libellé texte.
4. Les SVG produits repassent par `sanitizeSvg` (propriété : sortie acceptée).

## Tests d'acceptation
1. Favicon : le logo occupe **80 % ± 1 %** du plus grand côté, centré à ±0,5 px, pour 5 formats de boîte (carré, large, haut, très large, très haut).
2. Clear space : `X = ratio × H` ; zone = boîte élargie de `X` ; refus de `ratio` hors [0,10 ; 0,50].
3. Panneau « fond inadapté » : le contraste calculé entre le fond choisi et la couleur principale du logo est **< 3** ; si aucune couleur de la palette ne convient, un gris est généré et le contraste vérifié.
4. Tous les SVG générés sont acceptés par `sanitizeSvg`.
5. **Sabotage** : changer `0.8` en `0.9` → test 1 échoue.

---

# Backlog provisoire (à détailler au moment de l'exécution)

| Ticket | Contenu | Phase |
|---|---|---|
| T-013 | **Spike auth** : bibliothèque retenue (e-mail, vérification, réinitialisation, Google, sessions en base, cookies) ; confirmer l'algorithme de hachage (SEC-01) | P2 |
| T-014 | Schéma Drizzle complet (`03_DATA_MODEL.md`), migrations, tests d'intégration | P2 |
| T-015 | `can()` + table de routes + tests d'accès générés | P2 |
| T-016 | Dépôt et lecture de projets, `documents`, `revisions`, endpoint `commands` et `undo` | P2 |
| T-017 | Sessions invitées, rattachement, purge à 24 h | P2 |
| T-018 | Upload par URL présignée, statut de quarantaine, job `asset.scan` | P2 |
| T-019 | Job `project.analyze` (palette + variantes, sans IA) et flux d'événements SSE | P2 |
| T-020 | Fondations UI : tokens, i18n, mise en page, composants de base, accessibilité | P2 |
| T-021 | Dropzone, timeline d'analyse | P2 |
| T-022 | Pages de charte : logo, palette, contrastes, typographie | P2 |
| T-023 | Éditeur : inspecteur, annuler/rétablir, résolution de conflits | P2 |
| T-024 | Catalogue typographique (licences, auto-hébergement, aperçu) | P2 |
| T-025 | Production des 3 scènes de mockup (hors agent) | P2→P3 |
| T-026 | `mockup-engine` : homographie et tests numériques | P3 |
| T-027 | `mockup-engine` : finitions (plate, embossage, dorure) et revue visuelle | P3 |
| T-028 | Route `/print`, job `export.pdf` (Chromium) | P3 |
| T-029 | Job `export.zip`, `design-tokens.json`, CSV | P3 |
| T-030 | Port `AiPort`, `FakeAdapter`, schéma `BrandAnalysis` | P4 |
| T-031 | Adaptateur Gemini, plafonds de coût, `usage_events` | P4 |
| T-032 | Copilote : outils = commandes, flux SSE, garde-fous | P4 |
| T-033 | Jeu d'évaluation IA (40 marques) et rejeu | P4 |
| T-034+ | Durcissement, juridique, observabilité, bêta | P5 |
