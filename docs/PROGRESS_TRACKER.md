# Suivi d'avancement

> Dernière mise à jour : 2026-10-07 — Phase 0.
> **Trois statuts, et seulement trois** :
> - **Spécifié** : décrit dans `docs/`, aucun code.
> - **Implémenté** : code écrit, `pnpm verify` vert.
> - **Vérifié** : tests d'acceptation exécutés, revue du chef de projet = GO.
>
> « Le build passe » n'est **pas** un statut. Un module est « terminé » uniquement s'il est **vérifié**.

## 1. Phases

| Phase | Objectif | Statut | Début | Fin |
|---|---|---|---|---|
| P0 — Fondations | Monorepo, CI, base, config, infra squelette, nom | En cours | 2026-10-07 | — |
| P1 — Moteurs | Couleur, SVG, variantes, spikes | Non démarré | — | — |
| P2 — Document et studio | Commandes, auth, upload, éditeur | Non démarré | — | — |
| P3 — Livrables | Mockups, PDF, ZIP | Non démarré | — | — |
| P4 — IA et copilote | Analyse, copilote, évaluation | Non démarré | — | — |
| P5 — Bêta | Durcissement, juridique, bêta | Non démarré | — | — |

## 2. Modules

| Module | Package / zone | Spécifié | Implémenté | Vérifié | Remarque |
|---|---|---|---|---|---|
| Conversions et WCAG | `color-engine` | ✅ | ❌ | ❌ | Vecteurs de référence prêts |
| Extraction de palette | `color-engine` | ✅ | ❌ | ❌ | Corpus de 20 logos à constituer |
| Échelles et matrice de contraste | `color-engine` | ✅ | ❌ | ❌ | |
| CMJN indicatif (ICC) | `color-engine` | ✅ | ❌ | ❌ | Spike T-010 |
| Assainisseur SVG | `svg-engine` | ✅ | ❌ | ❌ | Corpus d'attaque de 30 cas |
| Rasterisation isolée | `svg-engine` | ✅ | ❌ | ❌ | |
| Variantes de logo, favicon | `logo-kit` | ✅ | ❌ | ❌ | Spike T-011 pour le raster |
| Clear space, Do/Don't | `logo-kit` | ✅ | ❌ | ❌ | |
| Document et commandes | `document` | ✅ | ❌ | ❌ | |
| Modèle de données | `db` | ✅ | ❌ | ❌ | |
| Auth et sessions invitées | `apps/web` | ✅ | ❌ | ❌ | Spike T-013 |
| Upload et scan | `apps/web`, `apps/worker` | ✅ | ❌ | ❌ | |
| Éditeur de charte | `apps/web` | ✅ | ❌ | ❌ | Ancienne UI = référence visuelle seulement |
| Moteur de mockups | `mockup-engine` | ✅ | ❌ | ❌ | Scènes à produire |
| Scènes de mockup (3) | `assets/scenes` | ✅ | ❌ | ❌ | Production Blender |
| Export PDF | `apps/worker` | ✅ | ❌ | ❌ | |
| Export ZIP et tokens | `apps/worker` | ✅ | ❌ | ❌ | |
| Adaptateur IA et analyse | `ai` | ✅ | ❌ | ❌ | |
| Copilote | `ai`, `apps/web` | ✅ | ❌ | ❌ | |
| Jeu d'évaluation IA (40 marques) | `ai/eval` | ✅ | ❌ | ❌ | |
| Infra et déploiement | `infra/` | ✅ | ❌ | ❌ | |
| Textes juridiques | `apps/web` | ✅ | ❌ | ❌ | Relecture par un juriste |

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
| Anciens documents v3 | À déplacer dans `docs/_archive/` |

## 5. Journal

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
