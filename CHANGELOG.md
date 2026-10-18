# Changelog

Modifications notables du projet, par ticket. Format inspiré de
[Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Mis à jour par l'agent à chaque ticket ou correctif livré
(`journal/PROTOCOL.md`). Les dates sont celles des commits.

## [Unreleased]

### Ajouté
- **T-016 (en cours)** (2026-10-18) : service transactionnel du document (commandes, annuler, rétablir,
  annulation ciblée), Better Auth configuré, routes `/api/v1/projects/:id/{commands,undo,redo,revisions/:seq/undo}`
  derrière `can()`, table des routes et tests d'accès générés.
- **T-014 — Base de données** (2026-10-18) : schéma Drizzle complet (tables métier et Better Auth), migration
  commitée, `uuidV7` pur, tests d'intégration sur base jetable ; PostgreSQL dans la CI.
- **T-013 — Spike authentification** (2026-10-18) : Better Auth 1.7.7 confirmé ; Argon2id natif de Node 24
  (`apps/web/src/lib/password.ts`, sans dépendance) ; réglages SEC-01 à SEC-06 consignés.
- **T-015 (partie 1) — Autorisation centrale** (2026-10-18) : `can()` (matrice ADR-025, refus par défaut, e-mail
  vérifié) et `authorize()` (401 / 404 / 403) ; 13 tests.
- **T-012 — Règles du logo** (2026-10-18) : favicon (80 %, fond arrondi, avertissement d'allongement), zone
  d'exclusion et son schéma, 4 panneaux Do & Don't (teinte hors palette ADR-021, fond < 3:1) ; 14 tests.
- **T-009 — Variantes monochromes** (2026-10-18) : chemin structurel avec évidements réels (masque de découpe),
  dégradés remplacés, repli raster signalé ; IoU et score de fidélité via le `Rasterizer` injecté ; 10 tests.
- **T-008 — Rasterisation isolée** (2026-10-18) : port `Rasterizer`, enfant resvg confiné (permissions Node,
  512 Mo, 5 s), `ensureViewBox`, `normalizeRaster` (sharp), `detectType`, `downscaleNearest` ; 22 tests.
- **T-007 — Assainisseur SVG** (2026-10-18) : liste blanche, arbre reconstruit, 30 cas d'attaque, corpus légitime,
  propriétés ; 1 431 logos réels acceptés sur 1 432 ; 76 tests.
- **T-006 — Échelles et contrastes** (2026-10-18) : `buildScale` (11 pas, §2.8), `buildContrastMatrix` et
  `bestTextFor` (§2.9) ; golden `scales` reproduit ; 14 tests.
- **T-005 — Extraction de palette** (2026-10-18) : extraction déterministe §2.4 (fond uni, bords anti-aliasés, fusion
  gloutonne, réduction), rôles exclusifs §2.5, couleurs dérivées §2.6, `mapToGamut` §2.7 ; 21 tests dont golden.
- **Bibliothèque de logos** (2026-10-18) : `pnpm logos:fetch` (cache local ignoré, marques non redistribuées).
- **Outillage multi-agents** (`chore/agent-relay-tooling`, 2026-10-18) : protocole de relais
  (`journal/PROTOCOL.md`, `HANDOFF.md`, journaux de session, `journal/OWNER_DECISIONS.md`), ce changelog,
  configuration Gemini (`.gemini/settings.json` : contexte `AGENTS.md`, MCP ; commandes `/reprendre` et `/relais`),
  rapport historique `sortie tikets/T-001.md`. En attente d'installation par le propriétaire : skills et agents ECC
  et `logo-design`, MCP Context7, GitHub et Cloudflare Docs, hooks de relais.
- **T-004 — Moteur couleur** (`96d68ef`, 2026-10-18) : conversions sRGB, contraste et niveaux WCAG, affichage
  tronqué, OKLab/OKLCH (teinte `null` pour les gris), CIELAB D65, ΔE_OK, CIEDE2000 ; 15 tests golden et de propriétés.
- **T-003 — Document de marque** (`a2ddb84`, 2026-10-18) : schéma `BrandDocument`, 11 commandes pures réversibles
  avec précondition `expect` et `EXPECTATION_FAILED` (ADR-018), identifiant de page fourni par l'appelant
  (ADR-019), valeurs de marque `{ label, description }` (ADR-020), `migrate` ; 48 tests.
- **T-002 — Application web** (`fff8bfc`, 2026-10-18) : configuration validée par Zod (refus de démarrer, noms sans
  valeurs), `ProblemDetails` RFC 9457, logger pino masqué, `/api/health` (200 / 503), proxy Next.js 16 avec CSP à
  nonce par requête (ADR-024), PostgreSQL local ; 14 tests.
- **Outillage et spécification v4.1** (PR #1, `5d95f32`, 2026-10-17) : package `@app/kernel` (`Result`, ADR-017),
  règles de pureté et graphe de dépendances vérifiés, ADR-016 à ADR-026, tickets v4.1, agents de revue, skills ECC,
  hooks d'agent, `CLAUDE.md`, `GEMINI.md`.

### Modifié
- T-002 à T-004 refaits sur la v4.1 (2026-10-18). Les versions v4.0 du 2026-10-12/13 restent sous les tags
  `backup/pre-v4.1/*`.

### Corrigé
- **CI rouge depuis le 2026-10-17** : sur une machine propre, le lint typé s'exécutait avant tout build (1 208
  erreurs) ; `verify` lance désormais le typecheck (qui construit les dépendances) avant le lint. Le rapport SARIF
  de Gitleaks est exclu de prettier. La CI vérifie chaque branche poussée et publie ses erreurs en annotations.
- **Analyse SVG** : arrêt à la première limite franchie (cas 22 : de ≈ 5 s à 0,2 s) ; pixels RGBA en alpha droit.
- 9 défauts de la revue du 2026-10-18 (`fix/code-review-2026-10-18`) : pool PostgreSQL sans écouteur d'erreur,
  masquage des logs, `RestoreMockup` accepté de l'extérieur (`applyInverse` séparé), positions de page
  incohérentes, hex non validé, troncature de `formatRatio`, NFC, identifiants vides, panne de base non journalisée.
- Fins de ligne LF imposées (`.gitattributes`) ; `next-env.d.ts` (généré) n'est plus suivi.

## [T-001] — Squelette du monorepo et CI — 2026-10-07

### Ajouté
- Monorepo pnpm + Turborepo, TypeScript strict, ESLint 9 `strictTypeChecked`, Prettier, dependency-cruiser,
  CI GitHub (Gitleaks puis `pnpm verify`), contrat `HexColor` et ses 6 tests.

### Vérifié
- Corrections C1–C9 et 10 sabotages d'architecture le 2026-10-08 (rapport `sortie tikets/T-001.md`, état v4.0).
  Le statut « vérifié » au sens de `docs/PROGRESS_TRACKER.md` attend le verdict du chef de projet.
