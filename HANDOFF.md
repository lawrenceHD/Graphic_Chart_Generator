# HANDOFF — état vivant du travail

> À lire en premier par tout agent qui reprend. Protocole : [`journal/PROTOCOL.md`](journal/PROTOCOL.md).
> Si ce fichier contredit Git, **Git fait foi** : corriger ce fichier avant toute autre action.

## Agent actif
- **Agent** : Claude Code (Opus 5.5) — **Poste** : PC Windows du propriétaire (KURO) — **Date** : 2026-10-28
- **Tâche** : Phase 2/3. **T-021 terminé** le 2026-10-28 (`sortie tikets/T-021.md`) ; T-026 et T-020 le 2026-10-27. Suite : écran de création de projet ou de session invitée (pour atteindre `/studio/[id]`), direction visuelle, T-022 et T-027. Mise à jour de sécurité de Next.js 16.4.0 signalée par `next dev`, en attente d'accord.
- **Session** : [`journal/sessions/2026-10-18-claude-realignement-outillage.md`](journal/sessions/2026-10-18-claude-realignement-outillage.md)

## Branches (empilées, poussées sur origin le 2026-10-18)
```
main (5d95f32, = origin/main)
└─ ticket/T-002-web-config-health      fff8bfc  T-002 v4.1   verify vert
   └─ ticket/T-003-document-commands   a2ddb84  T-003 v4.1   verify vert
      └─ ticket/T-004-color-engine-maths 96d68ef  T-004 v4.1 verify vert
         └─ chore/agent-relay-tooling   021bf26  relais, CHANGELOG, config Gemini
            └─ fix/code-review-2026-10-18  9 défauts corrigés, bibliothèque de logos, LF   verify vert
               └─ ticket/T-005-palette-extraction  T-005 terminé, verify vert
                  └─ ticket/T-006-scales-contrast  T-006 terminé, verify vert
                     └─ ticket/T-007-svg-sanitizer  T-007 terminé, verify vert
                        └─ ticket/T-008-raster-isolation  T-008 terminé, verify vert
                           └─ ticket/T-009-logo-mono  T-009 terminé, verify vert
                              └─ ticket/T-012-logo-rules  T-012 terminé + correctifs CI
                                 └─ ticket/T-015-can  can()/authorize() (partie 1), CI verte
                                    └─ ticket/T-013-auth-spike  décision Better Auth + Argon2id
                                       └─ ticket/T-014-db-schema  schéma, migration, PostgreSQL en CI
                                          └─ ticket/T-016-projects-history  service, auth, routes document et projets
                                             └─ ticket/T-017-guest-sessions  sessions invitées + SEC-05, CI verte
                                                └─ ticket/T-018-asset-upload  upload présigné, file pg-boss, worker asset.scan
                                                   └─ fix/robust-logo-analysis  banc du corpus, extraction et monochrome robustes (A–D), verify vert
                                                      └─ ticket/T-019-analyze-events  partie 1 : journal project_events, flux SSE, asset.status ; verify vert
                                                         └─ proto/studio-prototype  maquette navigable (prototypes/studio), gates vertes
                                                            └─ fix/mono-structure  variantes monochromes : structure, séparation, évidements, tonal ; écran Démarrer structuré ; verify vert
                                                               └─ fix/engine-defects  panique resvg hors canevas, fond de présentation des variantes ; verify vert
                                                                  └─ ticket/T-019-analyze-job  T-019 partie 2a : POST /analyze, analysis_runs, job étapes 1–2 ; verify vert
                                                                     └─ proto/studio-themes  revue impeccable : hero, thèmes jour/nuit/système, journal lisible
                                                                        └─ proto/local-mockups  `npm run mockups:local` : logos projetés sur les scènes de l'outil d'images local
                                                                           └─ fix/raster-far-offcanvas  logos sur page PDF entière rasterisés jusqu'à 4 096 px ; galerie mockups 7/7 photos ; verify vert
                                                                              └─ ticket/T-019-analyze-document  T-019 partie 2b : étapes 3 (sans IA) et 4 (document initial) ; verify vert
                                                                                 └─ ticket/T-026-mockup-homography  homographie, placement, schéma de scène ; verify vert
                                                                                    └─ ticket/T-020-ui-foundations  i18n fr/en, thèmes système/jour/nuit, tokens, composants de base ; verify vert hors test de démarrage (serveur dev actif)
                                                                                       └─ ticket/T-021-dropzone-timeline  dropzone, envoi présigné, timeline SSE, /studio/[id] ; verify vert (serveur dev arrêté)
```
Ancien travail v4.0 : tags locaux `backup/pre-v4.1/*`. Fusion dans l'ordre de la pile (chaque branche contient la précédente).

## Mode compétition GDG Fest (depuis le 2026-10-28)
- Présélection le **2026-11-09**. Plan et consignes de scènes Flow : `journal/research/2026-10-28-plan-gdg-fest.md` ; règles : `journal/OWNER_DECISIONS.md` § Mode compétition.
- `main` = pile complète (8479eba). Branche en cours : `comp/j1-local-dev` (J1 fait : `R2_ENDPOINT`, Chromium Playwright installé dans `%LOCALAPPDATA%\ms-playwright`).
- **Lancer le parcours complet** (Git Bash, racine) : `pnpm dev:storage` ; `. tools/dev-env.sh; cd apps/worker && pnpm start` ; `. tools/dev-env.sh; cd apps/web && pnpm.cmd dev` (relancer si l'avertissement de sécurité l'arrête). Migrations : `pnpm db:migrate`. Puis http://localhost:3000/start.
- J2 fait (`comp/j2-start`). Suite : J3 Gemini (`AI_API_KEY` dans `.env.local`, modèle à choisir : `gemini-2.5-flash` retiré aux nouveaux comptes).
- Docker Desktop inutilisable (WSL absent) ; MinIO archivé (410 Gone). Stockage de dev : `pnpm dev:storage` (émulateur S3 local, `R2_ENDPOINT=http://127.0.0.1:9000` dans `.env.example`). En ligne : Google Cloud Storage via `R2_ENDPOINT`.

## Reprise rapide (sauvegarde du 2026-10-28, demandée par le propriétaire)
- **Dernière branche** : `ticket/T-021-dropzone-timeline` (poussée, `pnpm verify` vert serveur dev arrêté). Rien en cours, rien de non commité hors fichiers préexistants (`.gemini/settings.json`, outillage impeccable non suivi : ne pas toucher).
- **Voir l'écran T-021** : lancer le serveur web avec les valeurs factices (Git Bash, depuis la racine) :
  `set -a; . ./.env.example; unset DATABASE_URL; set +a; cd apps/web && pnpm.cmd dev` (le premier lancement s'arrête sur l'avertissement de sécurité Next.js : relancer).
  Puis ouvrir `http://localhost:3000/studio/0190a0b0-0000-7000-8000-00000000000a`. `/` n'affiche que la page de fondations T-020 (landing gelée) et `/studio` sans identifiant donne 404 : c'est normal.
  Le dépôt d'un logo échoue tant qu'il n'y a ni projet réel, ni session, ni valeurs `R2_*`.
- **Maquette** : `cd prototypes/studio && npm run dev` → `http://localhost:5180`.
- **Décisions attendues du propriétaire** :
  1. Prochain ticket proposé : écran « Démarrer » (session invitée + Turnstile, création du projet, redirection vers `/studio/<id>`) — maillon manquant pour atteindre le studio.
  2. Valeurs `R2_*` d'un bucket de dev dans `.env.local` (jamais affichées).
  3. Mise à jour de sécurité de Next.js 16.4.0 sur une branche séparée : oui / non.

## Étape en cours
1. Fait le 2026-10-18 :
   - relais et configuration Gemini ;
   - Phase 1 (hors T-010 et T-011) ;
   - T-013 à T-017 et SEC-05 ;
   - T-018 (`sortie tikets/T-018.md`).
2. **En attente du propriétaire** : le script d'installation de l'outillage de l'agent (skills, agents, MCP, hooks).
   Le classifieur de Claude Code refuse que l'agent écrive dans `.claude/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`.

## Prochaines actions (ordre recommandé)
1. ~~**T-019 partie 2b**~~ **fait le 2026-10-24** (décisions : `journal/OWNER_DECISIONS.md` § T-019 partie 2b). Ancien texte : étape 3 sans IA, étape 4 (document initial composé depuis la palette et les variantes,
   `analysis.done { seq }`). Partie 2a faite (`journal/OWNER_DECISIONS.md` § T-019 partie 2a). Review impeccable de la
   maquette (2026-10-23, 23/40, `.impeccable/critique/`) : corrigés sur `proto/studio-themes` — hero masqué au
   chargement, thèmes jour/nuit/système du studio (décision du propriétaire), journal lisible à la place du JSON SSE.
   Reste : logo en premier dans Démarrer, états d'erreur, cibles 44 px et `h1` du studio, bandeau « animations
   réduites », canevas sous-utilisé ; défaut préexistant : traits parasites des variantes de Basecamp.
   **Interface** : note `journal/research/2026-10-19-interface-studio.md` (ancien front, inspirations, modèle Stitch,
   kit XIAS) ; décisions du propriétaire attendues (§5 : animation, gel de la landing, thème).
   **Maquette** (2026-10-19, demande du propriétaire) : `prototypes/studio/` (README), hors `pnpm verify`, ses propres
   contrôles (`node scripts/gates.mjs`). Avis du propriétaire attendu avant T-020.
   **Mockups photo gratuits** : `npm run` → `node scripts/gen-mockups-hf.mjs` (FLUX.1 Kontext sur Hugging Face, reprise
   possible) ; quota anonyme ≈ 2 images, à étendre avec un jeton HF gratuit (`HF_TOKEN` dans `prototypes/studio/.env.local`).
   Serveur MCP officiel Hugging Face installé (portée utilisateur). Entrées et polices : note
   `journal/research/2026-10-19-entrees-et-polices.md` (étapes E1–E7).
   **Défauts moteur trouvés par la maquette** : **corrigés** sur `fix/engine-defects` (2026-10-23) — panique resvg
   (6 chartes sur 8 rendues à nouveau) et fond de présentation des variantes (Instacart).
1 bis. **Outil de scènes** `../MCP-IMAGE-GENERATION` (branche `feat/charta-profile`, 2026-10-24, 90 tests verts) :
   profil `TOOL_PROFILE=charta`, catégories `SceneCategory`, droits par modèle (FLUX.2 klein 9B = dev seulement),
   revue du propriétaire (3 logos), checklist §6.3, `index.json`, profils `.env.charta-dev` / `.env.charta-prod`,
   `npm run check:charta`. Scènes de dev → `.cache/scenes-dev` ; catalogue → `assets/scenes`. **À faire par le
   propriétaire** : générer les 3 scènes du MVP, placer les coins, faire la revue. À reporter dans `docs/06` : format de
   `assets/scenes/index.json` (`id`, `category`, `usage`, `reviewed`) et formule `flat` pondérée par l'alpha du logo.
2. ~~Limite « analyse » du §7~~ faite avec T-019 partie 2a. Les limites d'upload et de session invitée sont faites.
3. ~~Worker : lettres mortes~~ fait. ~~Corpus de 20 logos~~ fait (`packages/svg-engine/fixtures/corpus/`, test
   `logo-kit/src/corpus.test.ts`) ; **validation visuelle du propriétaire attendue** (page « Corpus de 20 logos »).
   Ensuite T-011 sur ce corpus et sur `corpus-reel/` (logos réels déposés en vrac par le propriétaire, à trier).
   Point ouvert pour le propriétaire : réduction de palette §2.4 7a (voir `journal/OWNER_DECISIONS.md`).
   **Mandat 2026-10-18 (propriétaire)** : exploiter à fond le corpus privé `Graph_Charta` (`pnpm corpus:fetch` :
   1 432 SVG, 64 images, 8 chartes PDF). Fait : note `journal/research/2026-10-18-identite-visuelle.md` ;
   (a) fiches `charters/<marque>/truth.json` + 15 logos extraits (9 SVG, 6 PNG) dans le dépôt privé (3453e75,
   à pousser par le propriétaire). Constat clé : le fichier logo ne porte pas le HEX officiel (conversion CMJN du
   PDF) ; on juge l'extraction sur `renderedPalette`.
   (b) banc `tools/corpus/bench.mjs` (échantillon stratifié de 160 SVG par défaut, ~2 min ; le propriétaire a
   demandé de ne pas traiter les 1 432) ; (c) corrections A, B, C, D, halo JPEG et monochrome (ordre de peinture)
   sur la branche `fix/robust-logo-analysis`, chiffres dans `journal/OWNER_DECISIONS.md`, rapports avant/après
   dans le dépôt privé (`reports/`). Liseré de présentation traité (2026-10-19). Les images réelles restantes
   à « fond dominant » sont surtout des planches de marque complètes (hors usage prévu) ou des logos clairs sur
   leur couleur (sortie juste). Pages de charte : écarts avec les 8 vraies chartes et critères proposés pour
   T-022 dans `journal/research/2026-10-18-identite-visuelle.md` §9 ; (d) corpus versionné redessiné en vrais logos ; (e) T-011 (les logos à
   masque, filtre ou dégradé complexe gardent une fidélité monochrome < 0,95 en attendant la vectorisation). Le push vers `Graph_Charta` est refusé à l'agent par le classifieur : le propriétaire lance
   `git -C .cache/corpus-private push origin main`.
4. T-016, reste à faire :
   - envoi d'e-mails (vérification, réinitialisation) : fournisseur à choisir ;
   - variables Google.
5. ~~T-020~~ fait (next-intl, Tailwind v4). ~~T-021~~ fait (2026-10-28) ; bucket R2 de dev à fournir par le propriétaire. Hooks `tools/agent-hooks` activés dans `.claude/settings.json` (2026-10-27). Corpus de 20 logos jugé « vilain, pas de vrais logos » par le propriétaire (2026-10-27) : à refaire.
6. Chef de projet : reporter dans `docs/` les décisions de `journal/OWNER_DECISIONS.md` (T-005, T-007, T-013, T-014,
   T-018), dont `packages/storage` dans AGENTS.md §5.
7. CI : chaque branche poussée est vérifiée ; diagnostic sans jeton via les annotations (voir `ci.yml`).

## Défauts relevés le 2026-10-18 — **tous corrigés** (dad04a7, 8520315, dc85a89), tests et sabotages à l'appui
| # | Gravité | Fichier | Défaut | Branche |
|---|---|---|---|---|
| 1 | Haute | `packages/db/src/index.ts:9` | Pas d'écouteur `pool.on('error')` : plantage du processus si PostgreSQL redémarre | T-002 |
| 2 | Moyenne | `apps/web/src/logger.ts:3` | `Authorization` (majuscule), champs imbriqués, `apiKey`, `secret` non masqués | T-002 |
| 3 | Moyenne | `packages/document/src/commands.ts:27` | `apply()` accepte `RestoreMockup` de l'extérieur : JSON arbitraire dans `data.mockup` | T-003 |
| 4 | Moyenne | `packages/document/src/command-page-order.ts:147` | `position` explicite non confrontée à `afterPageId` : mauvaise place et annulation impossible | T-003 |
| 5 | Moyenne | `packages/color-engine/src/hex.ts:22` | Hex non validé dans les fonctions publiques : `NaN` silencieux | T-004 |
| 6 | Basse | `packages/color-engine/src/contrast.ts:32` | `formatRatio(1.15)` → `'1.14'` (141 valeurs sur 2001) | T-004 |
| 7 | Basse | `packages/contracts/src/document-types.ts:3` | NFC refusé au lieu d'être normalisé pour `values` et `data` | T-003 |
| 8 | Basse | `packages/document/src/schema.ts:155` | `pageId` et `position` vides acceptés | T-003 |
| 9 | Basse | `apps/web/src/health-response.ts:5` | Cause de la panne de base avalée sans log | T-002 |

## Questions ouvertes (BLOCKER)
- **T-019** : les deux BLOCKER (reprise SSE, stockage de l'analyse) sont tranchés par délégation, option A (`journal/OWNER_DECISIONS.md`).
- **T-003** : ≈ 1 250 lignes hors tests (> 400) ; `AddPage.pageType` au lieu de `type` ; `RestoreMockup` interne ; formes de `expect` — à valider (`sortie tikets/T-003.md`).
- **T-004** : GO à reconfirmer (teinte `null` au lieu de `0`).
- **T-002** : `'unsafe-eval'` en développement seulement — à valider.
- **T-005** : image d'une seule couleur → `EMPTY_IMAGE` (étape 2 de la spec) — repli à décider (`sortie tikets/T-005.md`).
- **T-007** : tranché (délégation) ; décisions à reporter dans `docs/` (`journal/OWNER_DECISIONS.md`).
- **T-010** : profil FOGRA39 et `transicc` à fournir ; 21 couleurs listées pour 24 annoncées ; livrable dans `docs/spikes/`.
- **Spécification** : longueur minimale de `AUTH_SECRET` / `INTERNAL_PRINT_SECRET` ; `requestId` dans `ProblemDetails` ; PostgreSQL dans la CI.

## Ne pas refaire
- Ne pas chercher le dépôt « ECCC » : c'est `affaan-m/ECC` (commit `76aaa77`).
- Ne pas copier la bibliothèque de logos de `logo-design-skill` (marques déposées).
- `proxy.ts` est la bonne convention en Next.js 16 (l'analyse du 2026-10-12 se trompait).
