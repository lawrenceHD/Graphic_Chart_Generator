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
1. Fait le 2026-11-11 : mur de logos retiré ; les quatre marques d'exemple restent avec la mention « sans affiliation » (décision du propriétaire), à remplacer avant un lancement commercial.
2. Fait le 2026-11-11 : cinq branches fusionnées (mockups modifiables, refonte des pages, variantes des logos, `purpose`). Reste `comp/pdf-manifest` : non branchée, ajoute `unpdf`, ADR requis avant fusion.
3. Fait le 2026-11-11 : titres dans la langue du projet, chemins de la recherche lus depuis la racine, navigation entre les pages (`workspace/page-navigator.tsx`), deux défauts mineurs des mockups (audit §8). Essai `vectorcraft-cli` fait le 2026-11-11 (`docs/proposals/P-004_ESSAI_VECTORCRAFT.md`), puis branché (ADR-033) : logos `.ai`, EPS, PDF, SVG avec texte, brief PDF. Binaire local : `C:/Users/KURO/Tools/vectorcraft/0.23.0/vectorcraft-cli.exe`, déclaré par `VECTORCRAFT_CLI` dans `.env.local`. Reste : installer l'archive Linux vérifiée dans l'image du worker au déploiement ; essayer un EPS venu d'un autre logiciel. Navigation vérifiée au navigateur le 2026-11-11 (QA KOFI, captures dans le dossier temporaire de la session), trois défauts mineurs corrigés. `comp/pdf-manifest` remplacée par ADR-033, supprimée le 2026-11-11 (étiquette `archive/pdf-manifest`). Push de `comp/j3-studio` (jamais poussée, dépôt public) refusé par le contrôle de Claude Code : à lancer par le propriétaire (`git push -u origin comp/j3-studio`), gitleaks propre sur les 167 commits. Nombre de pages : 16 à 18, produit par la règle de l'ADR-028 (sections communes + sections du secteur à 25 % de soutien) ; aucun texte du produit ne promet 25 à 30 pages. Rendu de la navigation non vérifié au navigateur (pas de navigateur installé) : à contrôler à 360 px et sous zoom.
4. **Prochain pas, côté propriétaire** : sept essais réels selon `docs/proposals/P-003_ESSAIS_PRODUIT.md`. Le plugin Figma et le PDF serveur attendent leurs résultats.

## Décisions ouvertes (trancher avec les agents, sans attendre le propriétaire)
- Indexation anglaise : segments `/fr` et `/en` (ADR).
- Export complet pour un invité vs compte (copy de l'accueil « Essayer sans compte »).
- Tokens gratuits ou réservés au Pro. Tarifs marqués « à valider ».
- Mur de logos de marques réelles : module isolé `landing/home/logo-wall.ts`, retirable.

## Journal de reprise
- 2026-11-09 nuit : sécurité fusionnée (`9a929c5`) : `signup-guard.ts` (Turnstile) exige l'en-tête `x-turnstile-token` : **le formulaire d'inscription DOIT l'envoyer, sinon 403** (QUEUE R9 vers R5, à faire par l'agent de l'accueil/pages publiques). Dette sécurité à traiter en vague F : limiteur d'inscription sans try/catch, seau `sign-up:unknown` partagé, panne Cloudflare indistinguable d'un bot, aucun log si secret absent, secret factice accepté en http, liste d'autorisation inversée, compte OAuth non supprimable, audit anonyme, `eraseAccountRows` sans try/catch, course sur les clés de stockage. Reste aussi : `tsc` signale `PageProps` dans `app/studio/[id]/page.tsx` (types générés par Next, lancer `next typegen`).
- `prototypes/showcase-flow` : supprimé de Git ; vidage du dossier résiduel (dist, node_modules) en cours.
- 2026-11-09 matin (agent accueil) : `/` portée depuis `prototypes/studio/src/screens/Landing.tsx` en composants Next (`apps/web/src/landing/home/*` : hero à mot-pastille, éventail de couvertures réelles + mockups WebGL, rubans de logos `logo-wall.ts` isolé, compteurs lus sur le catalogue, manifeste à stickers, graphe, parcours nuit épinglé, pages suspendues, tuiles, mur de mockups, FAQ, arc final, pied de page géant). `/inscription` envoie `x-turnstile-token` (`auth-panel.tsx`, hook `useTurnstile` de `start/`). Métadonnées via `lib/page-metadata.ts`, JSON-LD avec nonce (`landing/json-ld.tsx`). Reste : image OG `public/og/home.png` (à produire par capture d'une vraie page quand les exemples sont figés), en-tête mobile sur une rangée + menu, retours de jules-design-critic et kofi-qa.

## Point de reprise du 2026-11-12, 03 h 30 (limite d'usage proche)
Branche `comp/j3-studio`, poussée jusqu'à `005b1d9` ; tout ce qui suit est commité en local, NON poussé.
- Fait et commité : convertisseur `vectorcraft-cli` (ADR-033) ; inspirations Are.na (`a98a1a4`) ; photos Pexels et Unsplash côté serveur (`8108b32`, clés à mettre par le propriétaire dans `.env.local` : `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`) ; mug en vrai cylindre (ADR-034, NOÉ) ; 14 pages denses et règles mesurées sur le logo (ADR-035, R4) ; contrat et moteur de mise en page de l'univers de marque (ADR-036, U-01 et U-02, R1) ; schéma de document 2 et lecture des anciennes chartes par la migration (`6b36046`).
- Recherches : `docs/research/2026-11-11-*.md` (contenu des chartes, mockups courbes, inspirations, univers de marque).
- En cours au moment de la coupure, à reprendre :
  - R4 : page Couleurs (colonnes des neutres trop étroites), pied de page « Preuve » (identifiants illisibles), débordement de la colonne de gauche de la hiérarchie typographique, revue de code points 7, 8 et 11. Fichiers non commités : `apps/web/src/studio/pages/palette.tsx`, `pages.test.tsx` (à relire avant de commiter).
  - NOÉ : ligne pointillée grise au bord du mug (artefact d'échantillonnage, `packages/mockup-engine/src/render/`).
- Ensuite : `pnpm verify` complet (4 tests vus en échec par NOÉ : `startup.test` (serveur de dev lancé), `start-form.test` (délai sous charge), worker `research.test` et `analyze.test` à vérifier) ; captures avant et après de la charte http://localhost:3000/studio/01a1cd76-e70f-712a-aa0b-c25e8e0b61f9 (session dans le dossier temporaire `scratchpad/qa-new/state.json`, perdue au redémarrage) ; puis U-04 à U-06 (affiche avec plat et logo), polices ouvertes au catalogue Google Fonts (le document ne connaît que 8 paires), vérification du portrait sur toutes les pages.
- Pièges : toujours un seul worker (`Get-CimInstance Win32_Process` sur `dist/index.js`, un ancien survit à l'arrêt) ; limite de 5 sessions invitées par heure en dev (vider `rate_limit` de la base locale seulement) ; dans les scripts Playwright, attendre « Charte prête ».
- Décisions en attente du propriétaire : clés Pexels et Unsplash ; facturation Gemini (refusée pour l'instant, 10 $ minimum) ; écrire ou non à free-mockup.com.
