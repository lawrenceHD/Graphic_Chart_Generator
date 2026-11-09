# ROSTER — l'équipe d'agents de Charta

> Créé le 2026-11-07, consolidé à partir des propositions de trois agents (Analyste, Architecte, Outils).
> Statut : **proposition en attente de validation du propriétaire.** Aucun agent permanent n'est encore défini dans `.claude/agents/`.
> Principe : un rôle existe seulement s'il possède des fichiers et répond à un besoin constaté dans le dépôt.
> Les heures citées dans les autres fichiers sont des estimations d'agents, pas des mesures.

## 1. Rôles produit (12 agents + 2 humains)

| # | Rôle | Mission | Possède (propriété exclusive) | Skills / outils | Quand |
|---|---|---|---|---|---|
| R0 | **Arbitre : produit et architecture** | Fige le périmètre, écrit les ADR, tranche les conflits entre rôles | `docs/` (dont `14_ADR_LOG.md`, `PROGRESS_TRACKER.md`), `.dependency-cruiser.cjs` | `Plan`, lecture seule du code | Avant et après |
| R1 | **Contrats et document** | `ChartPlan`, `composeDocument(plan?)`, pages multi-instances, `plans.ts` | `packages/{kernel,contracts,document}` | `typescript-reviewer`, vitest, fast-check, depcruise | Avant (chemin critique) |
| R2 | **IA et recherche** | Brancher `researchBrand` au worker, repli, rejeu enregistré, plafonds de coût | `packages/ai`, `tools/references` | `eval-harness`, `prompt-caching-strategy`, `mcp-dependency-review` | Avant et après |
| R3 | **Worker et pipeline** | Étapes d'analyse, étape `research`, export PDF Chromium, purge, scan | `apps/worker`, `packages/storage` | Playwright MCP, Chromium présent | Avant |
| R4 | **Front charte (studio)** | Builders de pages, mockups dans l'interface, export. Découper `pages.tsx` (environ 1 000 lignes) | `apps/web/src/studio/{pages,mockups,workspace}` | `react-patterns`, `impeccable` | Avant |
| R5 | **Front produit** | Landing portée depuis `showcase-flow`, connexion, inscription, dashboard, démarrage | `apps/web/src/{landing,auth,dashboard,start}`, `apps/web/src/app` (pages) | `impeccable`, `frontend-a11y`, `nextjs-turbopack` | Avant |
| R6 | **API serveur et sécurité applicative** | Routes `/api/v1`, `can()`, Better Auth, quota serveur, CSP, rattachement invité | `apps/web/src/app/api`, `apps/web/src/server` | `security-review`, `security-reviewer` | Avant (auth), après |
| R7 | **Direction artistique, design system, i18n** | `DESIGN.md`, jeu de 3 marques d'exemple, tokens `@theme`, messages FR/EN, critique contre Behance/Dribbble | `apps/web/PRODUCT.md`, `apps/web/src/landing/examples`, `apps/web/src/styles`, `apps/web/messages` | `impeccable-*`, `ux-ui-agent-skills:design-critic`, `i18n-sync`, `ux-writing`, `design-tokens` | Avant |
| R8 | **Qualité et accessibilité** | Tests, sabotage, e2e invité vers inscription, axe, Lighthouse. N'écrit pas dans le code produit | tests e2e, `docs/golden` (lecture seule) | MCP Playwright, `browser-qa`, `verification-loop` | Avant (smoke), après (suite complète) |
| R9 | **Sécurité et opérations** | Audit (pnpm audit, gitleaks, trivy, semgrep), CI, secrets, sauvegardes, supervision, hébergement | `infra/`, `.github/workflows`, `tools/` | `security-reviewer`, `silent-failure-hunter`, `database-migrations` | Avant (audit ciblé), après (infra) |
| R10 | **Données et backend** | Table `subscriptions`, migrations expand-contract, paiement (O-5) | `packages/db` | `database-migrations` | **Après le 09/11** |
| R11 | **Moteurs graphiques** | Maintenance couleur, SVG, vectorisation, mockups WebGL, CMJN (O-2) | `packages/{color-engine,svg-engine,logo-kit,mockup-engine}` | pureté stricte (AGENTS.md §4) | Après (lecture seule avant, tenu par R4) |
| RR | **Revue indépendante** | Relit et bloque le merge. Ne possède rien | aucun | `code-reviewer`, `typescript-reviewer`, `silent-failure-hunter`, `security-reviewer` | En continu |
| H1 | **Juridique et confiance** (humain ou conseil) | CGU, confidentialité, sous-traitants IA. Obligatoire avant la bêta (`01_PRODUCT_MVP.md` §7) | | | Avant bêta |
| H2 | **Business** (humain, propriétaire) | Tarifs, positionnement, pitch | | | En continu |

## 2. Désaccords tranchés entre les trois agents

| Sujet | Position A | Position B | Décision |
|---|---|---|---|
| Architecte distinct du chef de produit | Analyste : fusionner | Architecte : garder R0 | **Fusionnés en R0** : un seul arbitre, le propriétaire tranche dépendances, hooks, secrets |
| Contrats et document | Analyste : un rôle | Architecte : deux rôles | **Un rôle (R1)** avant le 09/11 : un seul propriétaire du point de jonction `contracts` |
| Qualité et sécurité | Analyste : un rôle avant le 09/11 | Architecte : rôles séparés | **Séparés (R8, R9)** : l'entreprise vise le long terme. R9 reste léger avant le 09/11 |
| Données et paiement | Architecte : après le 09/11 | Analyste : après le 09/11 | **R10 après le 09/11** |
| Performance, design system, DevOps seuls | | | **Refusés** : fusionnés dans R8, R7, R9 (pas de dossier propre) |
| DevRel, growth, support, data analyst | | | **Refusés** avant la bêta : aucun utilisateur ni donnée |
| Charge et scalabilité (k6) | | | **Après le 09/11**, documentée seulement avant |

## 3. Points de conflit de fichiers connus

- `apps/web/src/studio` est partagé entre R4 (code) et R8 (tests). R8 n'écrit que dans les dossiers de tests.
- `packages/contracts` : R1 est le seul à y écrire. Un besoin d'un autre rôle devient une demande dans la file (voir `PROTOCOL.md`).
- `apps/web/src/app` : pages à R5, `app/api` à R6.

## 4. Chaîne des skills

Voir `SKILLS-CHAIN.md` : 2 chercheurs, 3 valideurs, 1 installeur plus un relecteur, soit 6 à 7 profils.

## 5. Agents nommés et rôles régénérés (2026-11-09)

Définitions persistantes dans `.claude/agents/`, régénérées depuis les prompts d'origine du 2026-11-07 : **MIA** (`mia-homepage`, accueil), **NOÉ** (`noe-mockups-webgl`), **KOFI** (`kofi-qa`, QA bout en bout), **JULES** (`jules-design-critic`, critique adversarial), `r1-contrats-document`, `r2-ia-recherche`, `r3-worker-pipeline`, `r4-front-charte`, `r5-front-produit`, `r6-api-securite`, `r7-da-i18n`, `r9-securite-ops`. S'y ajoutent `design-director`, `seo-specialist`, `marketing-strategist`, `uiux-lead` et les relecteurs (`code-reviewer`, `typescript-reviewer`, `security-reviewer`, `silent-failure-hunter`). Les valideurs V1 à V4, chercheurs A et B et l'installeur de la chaîne de skills sont à recréer depuis `SKILLS-CHAIN.md` quand on la relance. Règle : toute tâche passe par l'agent de son rôle (`WORK-RULES.md`).
