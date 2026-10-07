# Atelier (nom de code provisoire) — Générateur de charte graphique

> **Statut** : Phase 0 — Recentrage. Aucun moteur n'est encore implémenté.
> **Version du corpus** : 4.0 — 2026-10-07
> **Gouvernance** : ce dépôt a un seul « chef » technique et produit (voir `docs/12_WORKFLOW_ROADMAP.md`).
> Le nom définitif est en cours de choix (`docs/13_NAMING.md`). Le code n'en dépend pas (scope `@app/*`).

## 1. Le produit en une phrase

Tu déposes ton logo (SVG ou PNG) et un court brief. Le produit te rend une **charte graphique exploitable** : palette accessible, variantes de logo, zone d'exclusion, règles d'usage, couple typographique, mockups, PDF de référence et pack d'assets. Tu peux ensuite la modifier **en langage naturel**, avec annulation à tout moment.

Principe directeur : **le logo n'est jamais redessiné par l'IA**. L'IA rédige et propose, des moteurs déterministes calculent et dessinent.

## 2. Ce qui a changé par rapport à l'ancien corpus

Le corpus v3 décrivait deux systèmes incompatibles (Spring Boot et Next.js/Node), promettait un « 0 € pérenne » qui ne tient pas, et un planning de 14 jours. Le corpus v4 tranche :

| Sujet | Décision v4 | Référence |
|---|---|---|
| Langage / backend | **TypeScript partout**, monorepo. Spring Boot abandonné. | ADR-001 |
| Hébergement | **VPS payant** + domaine (budget assumé). | ADR-004, `11_INFRA_COSTS.md` |
| IA | **API Gemini payante** derrière un port interchangeable. L'abonnement grand public ne sert qu'à coder. | ADR-006 |
| Document de marque | **Un seul document JSONB** modifié par **commandes typées** (undo/redo), plus de JSON Patch libre. | ADR-007 |
| Mockups | Moteur de rendu navigateur (WebGL), scènes produites en 3D (Blender). | ADR-008 |
| PDF | Rendu serveur par Chromium depuis les mêmes composants que l'éditeur. Livré en RVB, étiqueté « PDF de référence ». | ADR-009 |
| Pantone, 3D interactive, vidéo, rôles multiples | **Hors MVP.** | `01_PRODUCT_MVP.md` |

## 3. Carte des documents

| Fichier | Rôle |
|---|---|
| `AGENTS.md` | **Règles pour l'agent de code (Gemini).** À fournir à chaque session. |
| `docs/00_CHARTER.md` | Vision, public, principes, non-objectifs, risques, indicateurs. |
| `docs/01_PRODUCT_MVP.md` | Périmètre MVP, parcours, user stories et critères d'acceptation. |
| `docs/02_ARCHITECTURE.md` | Stack, monorepo, règles de dépendances, flux, déploiement. |
| `docs/03_DATA_MODEL.md` | Schéma PostgreSQL, document de marque, révisions, RGPD. |
| `docs/04_API_CONTRACTS.md` | Endpoints, erreurs, SSE, commandes. |
| `docs/05_ENGINES.md` | Couleur, SVG, variantes de logo, clear space. Formules et cas limites. |
| `docs/06_MOCKUP_ENGINE.md` | Format de scène, homographie, finitions, production des scènes. |
| `docs/07_AI_COPILOT.md` | Schémas IA, prompts, commandes exposées, évaluation, coûts. |
| `docs/08_SECURITY_PRIVACY.md` | Menaces, contrôles testables, RGPD. |
| `docs/09_DESIGN_SYSTEM.md` | Tokens, accessibilité, performance, catalogue typographique. |
| `docs/10_QUALITY.md` | Stratégie de tests, DoD, CI, critères d'acceptation. |
| `docs/11_INFRA_COSTS.md` | Serveur, déploiement, sauvegardes, budget. |
| `docs/12_WORKFLOW_ROADMAP.md` | Protocole de travail avec l'agent, phases, risques. |
| `docs/13_NAMING.md` | Candidats de nom et méthode de vérification. |
| `docs/14_ADR_LOG.md` | Décisions d'architecture (immuables, datées). |
| `docs/PROGRESS_TRACKER.md` | Suivi honnête : spécifié / implémenté / vérifié. |
| `docs/tickets/PHASE_0_1_TICKETS.md` | Premiers tickets exécutables. |
| `docs/golden/color.golden.json` | Vecteurs de référence calculés indépendamment du code. |

## 4. Anciens documents

À déplacer dans `docs/_archive/` (ne plus les lire ni les modifier) :

| Ancien fichier | Remplacé par |
|---|---|
| `CAHIER_DES_CHARGES.md` | `00_CHARTER.md`, `01_PRODUCT_MVP.md` |
| `ARCHITECTURE.md` | `02_ARCHITECTURE.md`, `05_ENGINES.md`, `06_MOCKUP_ENGINE.md` |
| `BACKEND_AND_USER_MANAGEMENT.md` | **Obsolète** (Spring abandonné, ADR-001) |
| `FREE_STACK_AND_ARCHITECTURE.md` | `02_ARCHITECTURE.md`, `11_INFRA_COSTS.md` |
| `SECURITY_COMPLIANCE.md` | `08_SECURITY_PRIVACY.md` |
| `SCALABILITY_PERFORMANCE.md` | `02_ARCHITECTURE.md`, `10_QUALITY.md`, `11_INFRA_COSTS.md` |
| `STUDIO_WORKSPACE_ENGINE.md` | `03_DATA_MODEL.md`, `04_API_CONTRACTS.md`, `07_AI_COPILOT.md` |
| `UI_UX_DESIGN_SYSTEM.md` | `09_DESIGN_SYSTEM.md` |
| `ACCEPTANCE_CRITERIA.md` | `01_PRODUCT_MVP.md`, `10_QUALITY.md` |
| `PROGRESS_TRACKER.md` | `docs/PROGRESS_TRACKER.md` (repart de zéro) |

Le code déjà écrit (landing, dashboard, Spring) est **gelé** : conservé comme référence visuelle, non maintenu. Voir `docs/12_WORKFLOW_ROADMAP.md` §7.

## 5. Comment on travaille

1. Le chef de projet écrit un **ticket** précis avec ses tests d'acceptation.
2. L'agent de code reçoit `AGENTS.md` + le ticket, écrit les tests puis le code, lance `pnpm verify`.
3. Le propriétaire colle le **rapport de fin de ticket** et la sortie des commandes.
4. Le chef de projet **relit** et rend un verdict : GO, corrections, ou NO-GO.
5. Le suivi est mis à jour. Rien n'est « terminé » sans ces cinq étapes.

## 6. Commandes (disponibles après le ticket T-001)

```bash
pnpm install        # dépendances
pnpm dev            # web + worker en développement
pnpm verify         # lint + typecheck + tests + build + règles de dépendances
pnpm db:migrate     # migrations
```
