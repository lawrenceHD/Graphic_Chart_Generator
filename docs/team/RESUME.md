# RESUME — où reprendre après un arrêt

> À lire en premier dans toute nouvelle session, avant d'agir : `AGENTS.md`, `docs/team/WORK-RULES.md`, ce fichier, `NIGHT-PLAN.md`, `STATE.md`, `QUEUE.md`. Mettre ce fichier à jour à chaque jalon.
> Dernière mise à jour : 2026-11-11.

## Branche et serveurs
- Branche de travail : `comp/j3-studio` (non poussée). Plus aucune copie de travail : `.claude/worktrees/` a été supprimé le 2026-11-11.
- Serveurs de dev : web `. tools/dev-env.sh; cd apps/web && pnpm.cmd dev` (3000), `pnpm.cmd dev:storage` (9000), prototype de référence de l'accueil `cd prototypes/studio && npx vite --host --port 5180` (dépendances par `npm ci`). Worker : `. tools/dev-env.sh; cd apps/worker && pnpm start`. Si `localhost` ne répond pas, utiliser `127.0.0.1`.

## Fait
- R1, R2, R4, R5, R6, R7 fusionnés ; compléments R3 fusionnés (`f8b9ad7`) ; corpus et algo de recherche (`pnpm refs:on-demand`, `refs:stats`) ; SEO (`lib/seo.ts`, sitemap, robots) ; briefs `docs/team/landing/01-04` ; agents persistants `design-director`, `seo-specialist`, `marketing-strategist`, `uiux-lead` ; nettoyage (~4 Go).

## État au 2026-11-11 (lire `docs/team/audit/2026-11-11-analyse-et-nettoyage.md`)
- `pnpm verify` vert (1 209 tests). Parcours logo vers charte de 25 pages vérifié au navigateur.
- Ne jamais lier `node_modules` d'une copie de travail à celui du dépôt, ni lancer `pnpm install` depuis une copie ainsi liée : cela avait cassé l'analyse de tout logo.
- Lancer le worker avec `RESEARCH_CORPUS_DIR` en chemin absolu, sinon la recherche de références se replie (dossier courant `apps/worker`).

## À faire ensuite
1. Retirer les logos de marques tierces de `apps/web/public/demo/logos/` et du mur de logos de l'accueil.
2. Trancher les six branches non fusionnées : `worktree-agent-a166610504f843003` (mockups modifiables), `comp/r4-front-charte`, `comp/r4-charte-pages`, `comp/pdf-manifest`, `comp/noe-scenes2`, `worktree-agent-a1cbae240c377493f`. Les trois premières, sauf `comp/r4-front-charte`, finissent par un commit `wip` non vérifié.
3. Constats 5 à 8 de l'audit : SVG avec texte, titres anglais en charte française, défilement de la toile, chemin du corpus.
4. Essais avec de vrais utilisateurs, puis plugin Figma et PDF serveur.

## Décisions ouvertes (trancher avec les agents, sans attendre le propriétaire)
- Indexation anglaise : segments `/fr` et `/en` (ADR).
- Export complet pour un invité vs compte (copy de l'accueil « Essayer sans compte »).
- Tokens gratuits ou réservés au Pro. Tarifs marqués « à valider ».
- Mur de logos de marques réelles : module isolé `landing/home/logo-wall.ts`, retirable.

## Journal de reprise
- 2026-11-09 nuit : sécurité fusionnée (`9a929c5`) : `signup-guard.ts` (Turnstile) exige l'en-tête `x-turnstile-token` : **le formulaire d'inscription DOIT l'envoyer, sinon 403** (QUEUE R9 vers R5, à faire par l'agent de l'accueil/pages publiques). Dette sécurité à traiter en vague F : limiteur d'inscription sans try/catch, seau `sign-up:unknown` partagé, panne Cloudflare indistinguable d'un bot, aucun log si secret absent, secret factice accepté en http, liste d'autorisation inversée, compte OAuth non supprimable, audit anonyme, `eraseAccountRows` sans try/catch, course sur les clés de stockage. Reste aussi : `tsc` signale `PageProps` dans `app/studio/[id]/page.tsx` (types générés par Next, lancer `next typegen`).
- `prototypes/showcase-flow` : supprimé de Git ; vidage du dossier résiduel (dist, node_modules) en cours.
- 2026-11-09 matin (agent accueil) : `/` portée depuis `prototypes/studio/src/screens/Landing.tsx` en composants Next (`apps/web/src/landing/home/*` : hero à mot-pastille, éventail de couvertures réelles + mockups WebGL, rubans de logos `logo-wall.ts` isolé, compteurs lus sur le catalogue, manifeste à stickers, graphe, parcours nuit épinglé, pages suspendues, tuiles, mur de mockups, FAQ, arc final, pied de page géant). `/inscription` envoie `x-turnstile-token` (`auth-panel.tsx`, hook `useTurnstile` de `start/`). Métadonnées via `lib/page-metadata.ts`, JSON-LD avec nonce (`landing/json-ld.tsx`). Reste : image OG `public/og/home.png` (à produire par capture d'une vraie page quand les exemples sont figés), en-tête mobile sur une rangée + menu, retours de jules-design-critic et kofi-qa.
