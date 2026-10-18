# HANDOFF — état vivant du travail

> À lire en premier par tout agent qui reprend. Protocole : [`journal/PROTOCOL.md`](journal/PROTOCOL.md).
> Si ce fichier contredit Git, **Git fait foi** : corriger ce fichier avant toute autre action.

## Agent actif
- **Agent** : Claude Code (Opus 5.5) — **Poste** : PC Windows du propriétaire (KURO) — **Date** : 2026-10-18
- **Tâche** : correction et avancement du projet sous délégation du propriétaire (T-005 fait ; T-006 ensuite)
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
```
Ancien travail v4.0 : tags locaux `backup/pre-v4.1/*`. Fusion dans l'ordre de la pile (chaque branche contient la précédente).

## Étape en cours
1. Fait : relais et config Gemini ; 9 défauts corrigés ; bibliothèque de logos (`pnpm logos:fetch`) ; T-005 (`sortie tikets/T-005.md`).
2. **En attente du propriétaire** : le classifieur de sécurité de Claude Code refuse que l'agent écrive dans sa propre configuration (`.claude/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `tools/agent-hooks/`), même lancé par script. Staging et script d'installation : voir le dernier message de l'agent ; à lancer par le propriétaire avec `! bash …`.

## Prochaines actions (ordre recommandé)
1. Propriétaire : lancer le script d'installation de l'outillage (skills, agents, MCP, hooks), puis redémarrer.
2. T-008 (rasterisation isolée resvg/sharp, port `Rasterizer`, bbox → `viewBox` du cas 29), puis T-009.
3. Chef de projet : reporter dans `docs/` les décisions T-005 et T-007 de `journal/OWNER_DECISIONS.md`.

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
