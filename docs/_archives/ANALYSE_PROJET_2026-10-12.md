# Analyse complète — Projet Graphic Chart + Kit d'intégration v0.5.0

> **Date** : 2026-10-12 | **Analyste** : Antigravity (Claude Opus 4.6 Thinking)
> **Portée** : État du projet, problèmes, pistes d'amélioration, et intégration du kit de gouvernance

---

## I. ÉTAT GLOBAL DU PROJET

Le projet **Atelier / graphic_chart** est un monorepo TypeScript strict visant à transformer un logo existant + un brief en une charte graphique complète (couleurs, contrastes WCAG, variantes de logo, typographie, mockups, PDF).

### Avancement réel
| Ticket / Chantier | Statut | Preuve |
|--------|--------|--------|
| T-001 — Squelette monorepo & CI | ✅ Terminé | Commit `b20fc39`, rapport dans `sortie tikets/T-001.md` |
| T-002 — App web, config, health, DB | ✅ Terminé (code) | Commit `14a40b4`, pool singleton sécurisé |
| T-003 — Package document, commandes réversibles | ✅ Terminé & Vérifié | `pnpm verify` vert (54 tests), rapport dans `sortie tikets/T-003.md` |
| T-004 à T-012 | ⬜ Non commencés | Packages prêts pour implémentation |
| Intégration Kit v0.5.0 (PM, QA, Standards, Prompts) | ✅ Terminé | 39 fichiers de gouvernance créés dans `docs/` |

> **MISE À JOUR — ACTIONS EXÉCUTÉES LE 2026-10-12 :**
> 1. **Intégration du Kit v0.5.0** : 39 fichiers créés et adaptés à la stack TypeScript/Next.js/Drizzle/Turborepo (`docs/pm/`, `docs/release/`, `docs/prompts/`, `docs/ai/`, `docs/standards/`, `docs/qa/`).
> 2. **Tâche C1 (Middleware vs Proxy)** : Vérifié dans le runtime Next.js 16.4.0. Next.js 16 déprécie officiellement `middleware.ts` au profit de `proxy.ts`. Le fichier `proxy.ts` est actif et génère la route native `ƒ Proxy (Middleware)`.
> 3. **Tâche C2 (Pool DB)** : `apps/web/src/lib/database.ts` corrigé avec le pattern singleton `globalThis` (zéro `any`, typage strict TS).
> 4. **Tâche C3 (ADR RestoreMockup)** : Création de `docs/adr/ADR-016-restore-mockup-internal-command.md` pour tracer la commande interne.
> 5. **Tâche I2 (Turbo Lint)** : `turbo.json` configuré avec `"dependsOn": ["^build"]`.
> 6. **Résolution ESLint & T-003** : Ajout de `**/.next/**` aux ignores ESLint + correction des 10 erreurs strictes de typage dans `packages/document`.
> 7. **Validation globale** : `pnpm verify` exécuté avec succès (0 erreur, 54 tests passants, 0 violation dependency-cruiser).
> 8. **Test de sabotage & Clôture** : Sabotage validé sur `command-brand.ts` et rapport officiel `sortie tikets/T-003.md` rédigé.

---

## II. PROBLÈMES RELEVÉS

### 🔴 Critiques (3)

#### C1 — Le middleware de sécurité n'est jamais exécuté
Le fichier qui applique la CSP (nonce), HSTS, X-Frame-Options et X-Request-Id s'appelle `apps/web/src/proxy.ts`. Or Next.js exige que ce fichier se nomme **`middleware.ts`** (ou soit à la racine `apps/web/middleware.ts`).

**Impact** : En production, **aucune requête HTTP n'est protégée** par les en-têtes de sécurité. La CSP est morte.

**Correction** : Renommer `proxy.ts` → `middleware.ts`.

---

#### C2 — Fuite de connexions DB dans `/api/health`
`apps/web/src/lib/database.ts` instancie un `new Pool()` à chaque appel sans réutilisation propre. En production sous charge, cela peut épuiser les connexions PostgreSQL.

---

#### C3 — Commande fantôme `RestoreMockup` hors contrat
`packages/document/src/command-schema.ts` introduit une commande interne `RestoreMockup` pour l'inversion de `SelectScene` quand `data.mockup` était absent. Cette commande **n'existe pas** dans `docs/04_API_CONTRACTS.md`. Elle ne peut pas être stockée dans la table `revisions` sans casser les schémas Zod partagés.

> **NOTE**
> Le PROJECT_HANDOFF.md mentionne que le chef de projet a validé `RestoreMockup` comme inverse interne (§6, Addenda R7). Mais cela reste non documenté dans `docs/` — il faut formaliser un ADR ou modifier la spec.

---

### 🟡 Importants (5)

#### I1 — Incohérence TypeScript/Zod entre packages
Le projet utilise `typescript@6.0.3` et `zod@4.6.5` (versions majeures récentes). Certaines API ont changé (ex. `z.passthrough` déprécié signalé par ESLint). L'ADR-002 impose de vérifier les API avant usage — ça n'a pas toujours été fait.

#### I2 — Pipeline `lint` dans turbo.json ne dépend pas de `^build`
Dans `turbo.json`, la tâche `lint` est `{}` sans dépendance. Comme ESLint utilise `projectService` avec `strictTypeChecked`, les packages non buildés produisent des erreurs fantômes.

#### I3 — Divergence de `tsconfig` entre racine et apps/web
`tsconfig.base.json` impose `module: "NodeNext"` / `moduleResolution: "NodeNext"`. Mais `apps/web/tsconfig.json` écrase avec `module: "esnext"` / `moduleResolution: "bundler"`, nécessitant un hack webpack (`extensionAlias`).

#### I4 — Règle des 400 lignes (AGENTS.md §7/§9) irréaliste pour T-003
T-003 atteint déjà ~500 lignes de production + ~450 lignes de tests sur 7 fichiers. La session précédente s'est arrêtée avec un **BLOCKER de périmètre**. La règle devrait clarifier : *400 lignes de logique de production modifiées (hors tests et schémas déclaratifs)*.

#### I5 — Calcul de taille de document inefficace (triple sérialisation)
Dans `schema.ts`, `JSON.stringify(document)` est exécuté dans le `safeParse`. Puis dans `commands.ts`, `isTooLarge` re-sérialise une 2ᵉ fois, et `safeParse` une 3ᵉ. Coût CPU x3 par modification.

---

### 🟢 Mineurs (4)

#### M1 — Pas de rapport T-002 dans `sortie tikets/`
Seul `T-001.md` existe.

#### M2 — `.env.example` documente `POSTGRES_PASSWORD` mais le schéma Zod ne valide que `DATABASE_URL`

#### M3 — Pas de cache pnpm dans la CI GitHub Actions
Le workflow `ci.yml` ne met pas en cache le store pnpm, allongeant inutilement chaque run.

#### M4 — Dossier `sortie tikets/` avec faute d'orthographe
Le nom correct serait `sortie-tickets/` ou `rapports-tickets/`.

---

## III. INCOHÉRENCES ENTRE DOCUMENTATION ET CODE

| Sujet | Documentation (`docs/`) | Réalité du Code |
|---|---|---|
| **Inverses des commandes** | `04_API_CONTRACTS.md` spécifie 11 commandes, l'inverse est du même ensemble | `command-schema.ts` crée `RestoreMockup` non documenté |
| **Middleware Web** | `08_SECURITY_PRIVACY.md` et T-002 demandent un middleware Next.js actif | Code placé dans `proxy.ts`, jamais exécuté par Next.js |
| **Packages** | `02_ARCHITECTURE.md` décrit 8 packages fonctionnels | `color-engine`, `svg-engine`, `logo-kit`, `ai`, `mockup-engine`, `worker` ne contiennent qu'un `export {}` |
| **Catalogue typographique** | `09_DESIGN_SYSTEM.md` liste 8 identifiants de pairings | Les 8 IDs sont dans le code mais aucun asset de police n'est présent |
| **Tracker** | `PROGRESS_TRACKER.md` dit « tout non implémenté » | T-001 et T-002 sont faits et commités |

---

## IV. ANALYSE DU KIT D'INTÉGRATION v0.5.0

### Qu'est-ce que c'est ?
Un **kit de gouvernance IA & Scrum** conçu pour encadrer les interventions d'assistants IA (Claude, Gemini, Cursor, Copilot) au sein d'une équipe dev. Il fournit :

- Un **noyau compact** (`AGENTS.md` ~2 200 tokens) avec routage contextuel à la demande
- Des **standards non négociables** (S1 à S13) vérifiés par script automatique
- Une couche **Scrum/PM complète** (estimation, capacité, sprints, risques)
- Des **gabarits de tickets, ADRs, prompts dev** standardisés
- Un **processus de revue QA** structuré par sévérité (P0 → P3)
- Un **workflow de release** avec SemVer strict et matrice de versions

### Points forts
1. **Économie de tokens** : Noyau pivot compact + chargement dynamique selon le mode (Engineering, QA, PM, Release)
2. **Couplage gouvernance technique ↔ Scrum** : Estimation par profil (Junior×1.7, Inter×1.3, Senior×1.0), capacité nette, DoR/DoD documentaire
3. **Format de réponse IA normalisé** : 5 lignes structurées obligatoires (évite le verbiage et les hallucinations)
4. **Outillage de vérification automatique** : Script `check-standards.bat` fait échouer la CI en cas de violation
5. **20 prompts dev prêts à l'emploi** (D01 à D20) : Bug, feature, refactoring, revue PR, sprint planning, etc.

### Limitation majeure
> **ATTENTION**
> Le kit est nativement conçu pour **Java/Spring Boot + Angular 20 + Flutter**. Il ne connaît pas Next.js, TypeScript monorepo, Turborepo, Drizzle ORM, pnpm, ni les packages métier purs. **Tout le socle technique doit être transposé.**

### Inventaire complet du kit

#### Racine
| Fichier | Rôle |
|---|---|
| `AGENTS.md` | **Pivot central** — standards S1-S13, routage contextuel, format de réponse court |
| `CLAUDE.md` | Adaptateur pour Claude Code |
| `GEMINI.md` | Adaptateur pour Gemini CLI |
| `SKILL.md` | Posture d'ingénieur senior pour l'IA (changement minimal, tests, économie de contexte) |
| `PROJECT-MANAGER-SKILL.md` | Skill PM/Scrum Master/Delivery Manager pour l'IA |
| `INSTALLATION.md` | Guide d'installation Windows |

#### `docs/ai/` — Gouvernance IA
- `CHANGELOG.md` : Changelog projet (l'IA ne lit que `[Unreleased]`)
- `PROJECT-TRACKING.md` : Tableau de bord de suivi en temps réel
- `README-IA.md` : Cartographie entrées/sorties pour l'IA
- `REFERENCES.md` : Normes et docs officielles (Scrum, OWASP, SemVer, etc.)
- `WORKFLOW-IA.md` : Étapes d'une tâche (Démarrer → Comprendre → Analyser → Implémenter → Vérifier → Clôturer)
- `adr/TEMPLATE-adr.md` : Gabarit ADR
- `tickets/TEMPLATE-ticket-lite.md` : Ticket léger (<0.5j)
- `tickets/TEMPLATE-ticket-action.md` : Ticket standard complet
- `review/` : 10 fiches de revue QA (Bloquants, Backend, Front, UI, API, Architecture, Sécurité, Tests, Ops, Doc)

#### `docs/pm/` — Scrum & Planification
- Scrum workflow, estimation, capacité, sprint planning, delivery dashboard, registre des risques
- Templates : Epic, User Story, Task, Sprint Plan, Weekly Report, Timesheet

#### `docs/prompts/` — 20 modèles de prompts paramétrés (D01 à D20)
Bug simple, diagnostic, feature backend, écran front, refactoring, dépendance, revue PR, découpe/estimation, sprint planning, weekly report, ADR, release, hotfix, tri écarts, cartographie existant, reprise backlog, CRUD backend, écrans front, montée de socle.

#### `docs/standards/` — Standards techniques
Architecture SOLID, backend Spring, frontend Angular, mobile Flutter, configuration, design system (Google DESIGN.md), arrondis/ombres UI, gitignore, documentation-first.

#### `docs/release/` — Workflow de release
SemVer strict, release workflow, matrice de compatibilité inter-modules.

#### `scripts/`
- `check-standards.bat` : Audit automatique (détecte violations de standards, secrets, fichiers trop longs)
- `kit-budget.bat` : Calcule le coût en tokens du noyau (plafond 3 000 tokens)

---

## V. MATRICE D'APPLICABILITÉ DU KIT → GRAPHIC_CHART

### ✅ Directement applicable (conserver tel quel)

| Élément du kit | Pourquoi ça s'applique |
|---|---|
| Philosophie noyau compact + routage contextuel | Universel, agnostique de la stack |
| Gabarits LÉGER vs STANDARD pour tickets | Sépare les corrections rapides des features avec contrat |
| Toute la couche `docs/pm/` (Scrum/Agile) | Estimation, capacité, risques, sprints — 100% agnostique |
| `PROMPTS-DEV.md` (20 modèles) | Mine d'or pour standardiser les consignes IA — juste ajuster les mots-clés de stack |
| SemVer + Release workflow + VERSION-MATRIX | S'aligne parfaitement avec Turborepo monorepo |
| `DESIGN-SYSTEM-STANDARDS.md` + `UI-RADIUS-AND-SHADOW-STANDARDS.md` | Arrondis 4-6px max 8px, ombres discrètes, tokens CSS — pile le besoin du projet |
| `ARCHITECTURE-SOLID-RESPONSIBILITY-STANDARDS.md` | Principes universels (≤500 lignes, fonctions ≤40, complexité ≤10) |
| Gabarits ADR, Epic, User Story, Task, Sprint Plan | Frameworks de décision et planification universels |
| `QA-REVIEW-WORKFLOW.md` (sévérité P0→P3) | Process de revue PR structuré — applicable immédiatement |
| `DOCUMENTATION-FIRST.md` + `GITIGNORE-STANDARDS.md` | Bonnes pratiques universelles |

### 🔄 À adapter (transposer vers la stack du projet)

| Élément du kit | Adaptation requise |
|---|---|
| Standards S1–S13 dans `AGENTS.md` | Remplacer Java/Spring/Angular par TS/Next.js/Drizzle/Turborepo |
| `check-standards.bat` | Réécrire pour détecter les violations spécifiques TS/monorepo |
| Fiches de revue QA backend | `BACKEND-SPRING.md` → `BACKEND-DRIZZLE.md` (migrations, transactions, schémas Zod) |
| Fiches de revue QA front | `FRONT-ANGULAR.md` → `FRONT-NEXTJS.md` (RSC vs Client, Server Actions, Suspense) |
| Templates de code | Spring/Angular/Flutter → Drizzle schema, Next.js page, Server Action |

### ❌ Non pertinent (ignorer)

| Élément | Raison |
|---|---|
| `BACKEND-SPRING-STANDARDS.md` | Java/Spring Boot ≠ Node.js/Drizzle |
| `FRONTEND-ANGULAR-STANDARDS.md` | Angular 20 ≠ Next.js/React |
| `MOBILE-FLUTTER-STANDARDS.md` | Pas de mobile dans le projet |
| Templates Spring (`pom.xml`, `lombok.config`, `application.yml`) | Stack inapplicable |
| Templates Angular (`crud.service.ts`, `proxy.conf.json`) | Framework différent |
| Templates Flutter (`.dart`, `.arb`) | Pas de mobile |
| `CONFIGURATION-STANDARDS.md` (format YAML Spring) | Spécifique à Spring Boot |

---

## VI. RECOMMANDATIONS CONCRÈTES

### A. Corrections immédiates (avant de continuer T-003)

```
proxy.ts → middleware.ts  →  Fixer pool DB  →  Résoudre ESLint  →  pnpm verify vert  →  Rapport T-003
```

1. **Renommer** `apps/web/src/proxy.ts` → `middleware.ts` (criticité sécurité)
2. **Formaliser** `RestoreMockup` dans un ADR ou modifier l'implémentation
3. **Ajouter** `dependsOn: ["^build"]` à la tâche `lint` dans `turbo.json`
4. **Résoudre** les 58 erreurs ESLint et valider `pnpm verify`

### B. Intégration du kit en 4 étapes

#### Étape 1 — Implanter le squelette documentaire
Copier depuis le kit (en adaptant) :
- La **structure de routage contextuel** du `AGENTS.md` du kit (modes Engineering/QA/PM/Release)
- `docs/pm/` complet (Scrum, estimation, capacité, risques, sprints)
- `docs/prompts/PROMPTS-DEV.md` (adapter les 20 modèles de D01-D20 pour la stack TS)
- `docs/qa/QA-REVIEW-WORKFLOW.md`
- `docs/release/` (SemVer, Release workflow, VERSION-MATRIX)
- Gabarits ADR, tickets (LÉGER + STANDARD), Epic, Story, Task

#### Étape 2 — Rédiger les standards spécifiques au projet
Créer les fichiers manquants :

| Nouveau fichier | Contenu |
|---|---|
| `docs/standards/BACKEND-DRIZZLE-STANDARDS.md` | Schémas Drizzle, migrations, transactions, types Zod inférés |
| `docs/standards/FRONTEND-NEXTJS-STANDARDS.md` | App Router, RSC vs Client, Tailwind v4 `@theme`, Server Actions |
| `docs/standards/MONOREPO-TURBOREPO-STANDARDS.md` | Frontières packages, pipeline build, dependency-cruiser |

#### Étape 3 — Adapter le script de contrôle automatique
Créer `scripts/check-standards.ts` (exécuté via `pnpm check-standards`) qui vérifie :
- Aucun fichier `.ts`/`.tsx` > 500 lignes
- Absence de `any` non annoté
- Pas de `package-lock.json` / `yarn.lock` parasites
- `.gitignore` racine bien configuré
- Présence de `DESIGN.md`
- Pas de classes Tailwind interdites sans ADR

#### Étape 4 — Brancher dans Turborepo & CI
Ajouter dans `turbo.json` :
```json
{ "tasks": { "check:standards": { "cache": false } } }
```
Et dans le workflow CI, faire échouer la PR si `pnpm check-standards` échoue.

### C. Enrichissement du `AGENTS.md` existant

Le `AGENTS.md` actuel du projet est **excellent** et très spécifique. Le kit apporte des compléments :

| Aspect | `AGENTS.md` actuel | Ajout inspiré du kit |
|---|---|---|
| Format de réponse de l'IA | Rapport de fin de ticket (§10) | Ajouter un format court structuré (5 lignes) pour les réponses intermédiaires |
| Routage contextuel | Pas de modes | Ajouter une table de routage : mode Engineering / QA Review / PM / Release |
| Gabarits de ticket | Référence unique dans `docs/PHASE_0_1_TICKETS.md` | Séparer gabarit LÉGER (<0.5j) et STANDARD (feature) |
| Économie de tokens | Pas mentionnée | Ajouter une directive d'économie de contexte (ne charger que les docs nécessaires) |
| Estimation de l'effort | Règle des 400 lignes | Compléter avec l'estimation en Story Points par profil |

### D. Tableau de priorisation globale

| Priorité | Action | Effort | Impact |
|---|---|---|---|
| 🔴 P0 | Renommer `proxy.ts` → `middleware.ts` | 5 min | Sécurité restaurée |
| 🔴 P0 | Finaliser T-003 (ESLint + verify + rapport) | 2-4h | Débloquer la suite |
| 🟡 P1 | Formaliser `RestoreMockup` en ADR | 30 min | Cohérence spec/code |
| 🟡 P1 | Fixer `turbo.json` lint dependencies | 15 min | CI fiable |
| 🟡 P1 | Créer le rapport T-002 manquant | 30 min | Traçabilité |
| 🟢 P2 | Implanter le squelette PM/Scrum du kit | 2h | Gouvernance projet |
| 🟢 P2 | Adapter PROMPTS-DEV.md pour la stack TS | 1h | Productivité IA |
| 🟢 P2 | Créer les standards NEXTJS/DRIZZLE/TURBOREPO | 3h | Qualité long terme |
| 🟢 P3 | Script `check-standards.ts` automatisé | 2h | CI enrichie |
| 🟢 P3 | Optimiser le calcul de taille document | 1h | Performance |
| 🟢 P3 | Cache pnpm dans CI | 15 min | Temps de CI |

---

## VII. CONCLUSION

### Le projet
Le projet `graphic_chart` possède une **base architecturale solide** — la refonte v4 avec monorepo TS strict, packages métier purs et commandes réversibles est bien pensée. Les spécifications dans `docs/` sont remarquablement détaillées et cohérentes.

Les problèmes principaux sont **opérationnels** :
1. Un bug de nommage critique (`proxy.ts` au lieu de `middleware.ts`) rend toute la couche sécurité inerte
2. Le ticket T-003 est en suspens avec un BLOCKER de périmètre non résolu
3. Le tracker de progression est obsolète
4. Quelques incohérences spec/code à formaliser (RestoreMockup)

### Le kit d'intégration
Le kit v0.5.0 est un **modèle remarquable de gouvernance IA pilotée par tokens et contrôlée par outillage**. Sa valeur réside dans sa **méthodologie** (routage contextuel, gabarits, DoR/DoD documentaire, prompts standardisés, pilotage de capacité) bien plus que dans les technologies Java/Angular qui lui servaient d'exemples.

### La synthèse
En transposant les standards S1–S13 du kit vers le monde **TypeScript / Next.js / Drizzle / Turborepo**, et en intégrant la couche PM/Scrum/Release qui est universelle, le projet `graphic_chart` disposera d'une gouvernance IA de premier ordre tout en conservant son `AGENTS.md` existant comme noyau technique incontournable.
