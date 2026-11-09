# RESUME — où reprendre après un arrêt

> À lire en premier dans toute nouvelle session, avant d'agir : `AGENTS.md`, `docs/team/WORK-RULES.md`, ce fichier, `NIGHT-PLAN.md`, `STATE.md`, `QUEUE.md`. Mettre ce fichier à jour à chaque jalon.
> Dernière mise à jour : 2026-11-09, nuit.

## Branche et serveurs
- Branche de travail : `comp/j3-studio` (non poussée). Les agents travaillent dans `.claude/worktrees/agent-*` (branches `worktree-agent-*`) et fusionnent par moi.
- Serveurs de dev : web `. tools/dev-env.sh; cd apps/web && pnpm.cmd dev` (3000), `pnpm.cmd dev:storage` (9000), prototype de référence de l'accueil `cd prototypes/studio && npx vite --host --port 5180` (dépendances par `npm ci`). Worker : `. tools/dev-env.sh; cd apps/worker && pnpm start`. Si `localhost` ne répond pas, utiliser `127.0.0.1`.

## Fait
- R1, R2, R4, R5, R6, R7 fusionnés ; compléments R3 fusionnés (`f8b9ad7`) ; corpus et algo de recherche (`pnpm refs:on-demand`, `refs:stats`) ; SEO (`lib/seo.ts`, sitemap, robots) ; briefs `docs/team/landing/01-04` ; agents persistants `design-director`, `seo-specialist`, `marketing-strategist`, `uiux-lead` ; nettoyage (~4 Go).

## En cours (agents, voir `ListAgents` ; en cas de session neuve ils sont perdus : lire leurs branches `worktree-agent-*` avec `git log comp/j3-studio..<branche>`)
- Accueil : portage de `prototypes/studio/src/screens/Landing.tsx` en composants Next dans `apps/web/src/landing`, complété par les briefs et les inspirations. Aucun logo ni image généré par nous.
- Scènes et vrais logos : 12 à 16 logos réels de la bibliothèque de 1 400 (`.cache/logo-library`, `pnpm corpus:fetch`), scènes de mockup FLUX niveau Pinterest.
- Entrée multi-logos et manifeste (`/start`, studio, worker).
- Mockups modifiables (studio), base : commit WIP 9e7ff4f de `comp/r4-front-charte`.
- Sécurité : `X-Forwarded-For`, Turnstile à l'inscription, `DELETE /account`, CSP.
- `purpose` dans `packages/ai` et rejeux de démo (`tools/references/record-demo.mjs`).

## À faire ensuite (ordre de `NIGHT-PLAN.md`)
1. Fusionner chaque branche livrée avec `pnpm verify` vert, accueil en dernier.
2. Supprimer les 1,33 Go d'images de `corpus-reel/pinterest/` quand l'agent des scènes a fini (garder `index.jsonl`, `manifest.json`, `chartes/`, `on-demand/`) ; copie de secours de l'index dans `.cache/backup-index/`. Terminer la suppression de `prototypes/showcase-flow` (reste `dist`, `node_modules`) et la committer.
3. Vagues B à E du plan : cohérence des données du studio, QA navigateur, décisions `/fr` `/en` (ADR) et export invité, docs et relecture finale.

## Décisions ouvertes (trancher avec les agents, sans attendre le propriétaire)
- Indexation anglaise : segments `/fr` et `/en` (ADR).
- Export complet pour un invité vs compte (copy de l'accueil « Essayer sans compte »).
- Tokens gratuits ou réservés au Pro. Tarifs marqués « à valider ».
- Mur de logos de marques réelles : module isolé `landing/home/logo-wall.ts`, retirable.
