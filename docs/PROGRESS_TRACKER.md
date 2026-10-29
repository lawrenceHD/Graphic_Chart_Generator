# Suivi d'avancement

> Dernière mise à jour : 2026-10-29 — mode compétition (ADR-027). `pnpm verify` vert : 574 tests.
> **Trois statuts, et seulement trois** :
> - **Spécifié** : décrit dans `docs/`, aucun code.
> - **Implémenté** : code écrit, `pnpm verify` vert.
> - **Vérifié** : tests d'acceptation exécutés, revue du chef de projet = GO.
>
> « Le build passe » n'est **pas** un statut. Un module est « terminé » uniquement s'il est **vérifié**.

## 1. Phases

| Phase | Objectif | Statut | Début | Fin |
|---|---|---|---|---|
| P0 — Fondations | Monorepo, CI, base, config | Implémenté | 2026-10-07 | 2026-10-17 |
| P1 — Moteurs | Couleur, SVG, variantes | Implémenté (T-004 à T-009, T-012) | 2026-10-13 | 2026-10-19 |
| P2 — Document et studio | Commandes, auth, upload, éditeur | En cours : serveur fait (T-013 à T-019), interface en cours (T-020, T-021, écran Démarrer) | 2026-10-18 | — |
| P3 — Livrables | Mockups, PDF, ZIP | En cours : homographie (T-026) | 2026-10-24 | — |
| P4 — IA et copilote | Analyse, copilote | Non démarré (`packages/ai` vide) | — | — |
| P5 — Bêta | Durcissement, juridique | Non démarré | — | — |

**Mode compétition GDG Fest** (ADR-027, présélection 2026-11-09) : plan `journal/research/2026-10-28-plan-gdg-fest.md`,
parcours à construire `journal/research/2026-10-28-studio-flow-brief.md`.

## 2. Modules

| Module | Package / zone | Statut | Tickets | Remarque |
|---|---|---|---|---|
| Monorepo, CI, config | racine | Implémenté | T-001, T-002 | |
| Noyau `Result` | `kernel` | Implémenté | T-003 | |
| Document et commandes | `document` | Implémenté | T-003 | Format paysage/portrait à ajouter (ADR-027) |
| Conversions, WCAG, palette, échelles, contrastes | `color-engine` | Implémenté | T-004 à T-006 | |
| Assainisseur et rasterisation SVG | `svg-engine` | Implémenté | T-007, T-008 | |
| Variantes, monochromes, règles du logo | `logo-kit` | Implémenté | T-009, T-012 | |
| Auth, base, `can()`, projets, révisions | `apps/web`, `db` | Implémenté | T-013 à T-016 | |
| Sessions invitées, upload, scan, analyse sans IA, SSE | `apps/web`, `apps/worker` | Implémenté | T-017 à T-019 | |
| Fondations UI, dépôt, timeline, écran Démarrer | `apps/web` | Implémenté | T-020, T-021, J2 | |
| Homographie et placement des mockups | `mockup-engine` | Implémenté | T-026 | Rendu navigateur à faire |
| Studio : toile, pages, inspecteur | `apps/web` | À faire | T-022, T-023 | |
| Landing (maquette) | `apps/web` | À faire | — | ADR-027 |
| Export PDF, tokens | `apps/web`, `apps/worker` | À faire | T-028, T-029 | |
| Adaptateur IA, analyse, copilote | `ai` | À faire | T-030 à T-032 | Gemini gratuit, mode démo rejouable |

« Vérifié » au sens de l'en-tête (verdict GO consigné) : voir les rapports de `sortie tikets/`.

## 3. Contraintes transverses

| Contrainte | Norme | Statut |
|---|---|---|
| TypeScript strict, zéro `any` | Règle de lint en erreur | Spécifié |
| Accessibilité | WCAG 2.2 AA | Spécifié |
| Performance | Budgets de `02_ARCHITECTURE.md` §8 | Spécifié |
| Sécurité des uploads | SEC-11 à SEC-17 | Spécifié |
| Autorisation | `can()` + tests par route | Spécifié |
| Plafonds de coût IA | `07_AI_COPILOT.md` §2 | Spécifié |
| Sauvegardes testées | `11_INFRA_COSTS.md` §6 | Spécifié |

## 4. Anciens livrables (gelés)

| Livrable | Statut |
|---|---|
| Backend Spring Boot | Archivé (ADR-001) |
| Landing, dashboard, studio statique | Gelés : référence visuelle, réintégration par tickets |
| Anciens documents v3 | Archivés dans `docs/_archives/` |

## 5. Journal

### 2026-10-17 — Durcissement et corrections de spécification (ADR-016 à ADR-026)
- Audit complet du corpus et de T-001 : contradictions de spécification corrigées par ADR-016 à ADR-026 (pureté et rasterisation, package `kernel`, annulation côté serveur, pages, valeurs de marque, palette, copilote, service des assets, CSP Next.js 16, actions de `can()`, méthode de session).
- Outillage : hooks d'agent (`tools/agent-hooks/`, activation manuelle), skills élagués et complétés (`.claude/skills/SOURCES.md`), doublon `.agents/` retiré, `.mcp.json` épinglé (serveur postgres obsolète retiré).
- Statut honnête de T-001 : **implémenté**, pas encore **vérifié** au sens de l'en-tête de ce document (pas de rapport de sabotage, pas de verdict GO consigné).
- Propositions non validées : `docs/proposals/` (P-001 entretiens, P-001b recherche documentaire Afrique francophone, P-002 brief guidé) ; décisions ouvertes O-8 à O-10.

### 2026-10-17 — Validation Ticket T-001 & Outillage Multi-Agents
- Ticket T-001 (Squelette du monorepo et CI) exécuté et vérifié : `pnpm verify` vert sur l'ensemble du monorepo (lint, 10 packages typecheck, 6 tests d'acceptation HexColor passés, builds `tsc -b`, dependency-cruiser 0 violation).
- Installation des skills et agents de revue ECC (.agents/ et .claude/) : TDD, accessibilité, sécurité, revues TypeScript.
- Mise en place du protocole de session continue (`CLAUDE.md`, `GEMINI.md`) et des filtres d'économie de tokens (`.claudeignore`, `.geminiignore`).
- Nettoyage des fichiers orphelins dupliqués dans `docs/`.
- Prêt pour le lancement du ticket T-002 (Application web minimale, configuration validée, santé).

### 2026-10-07 — Recentrage (v4.0)
- Analyse complète du corpus v3 et du cahier des charges ; contradictions, risques et hypothèses fausses relevés.
- Décisions fondatrices : ADR-001 à ADR-015.
- Production du corpus v4 (20 fichiers), des vecteurs de référence indépendants (`docs/golden/color.golden.json`) et des tickets de démarrage (`docs/tickets/PHASE_0_1_TICKETS.md`).
- Aucune ligne de code de production écrite dans cette étape.


## 6. Risques actifs (extrait)

| Risque | Dernière évaluation | Action en cours |
|---|---|---|
| R1 Variantes de mauvaise qualité | Haut | Spike T-011 + corpus de 20 logos |
| R2 Production des scènes | Haut | À planifier en P2 (ne pas attendre P3) |
| R5 Faiblesses de l'agent | Haut | `AGENTS.md`, vecteurs externes, revue |
| R9 Nom | Moyen | `13_NAMING.md` |
