# STATE — état du projet et plan consensuel

> Dernière mise à jour : 2026-11-07. Branche `comp/j3-studio` (51 commits d'avance sur `main`, non poussée).
> Les heures sont des estimations d'agents, pas des mesures. Rien de ce qui suit n'est encore exécuté.

## 1. Objectif (ne pas dériver)

SaaS **Charta** : à partir d'un logo + brief (ou document), générer une charte graphique **professionnelle et complète** pour designers et indépendants, avec mockups et exports. La Mèza est **un exemple de démo parmi d'autres**, pas le produit. Concours GDG Fest, présélection **2026-11-09**. Voir `apps/web/PRODUCT.md`.

## 2. Constats vérifiés (2026-11-07)

- La Mèza est codée en dur dans `apps/web/src/landing/{demo.ts,demo-sheet.tsx,landing.tsx}` et dans 9 fichiers de test.
- Le template d'accueil est dans `prototypes/showcase-flow` (Vite, **non commité**, données factices, jamais branché). Perte possible : à sauvegarder.
- Auth : serveur présent (Better Auth, `packages/db`, `can()`, `guest-sessions/claim`), **aucune interface** (connexion, inscription, dashboard).
- Aucune table de plans ou de quotas. Tarifs reportés en « Phase 5 » (`01_PRODUCT_MVP.md` §10, O-5 ouvert).
- `researchBrand` existe dans `packages/ai` mais n'est **pas branché** au worker (`apps/worker/src/analyze.ts`).
- Charte générée : 11 types de page dans `PAGE_TYPES`, spec à 12 pages. Les chartes de référence font 12 à 175 pages.
- `pnpm audit --prod` : 1 vulnérabilité modérée (esbuild via drizzle-kit, serveur de dev seulement), aucune critique.
- Chromium est installé (`chromium-1248`). Le hook de session qui dit le contraire a tort.
- Docker est installé mais son démon ne tourne pas.
- Les 4 copies d'impeccable (`.claude`, `.agent`, `.gemini`, `.github`) ne sont pas identiques (copies par plateforme), non suivies par git, 66 Mo.
- `.github/hooks/impeccable.json` exécute un binaire précompilé non audité.

## 3. Plan consensuel (Analyste, Architecte, Outils), cible 2026-11-09

1. **Démo générique** : au moins 3 marques d'exemple de secteurs différents dans `apps/web/src/landing/examples/`, tests en `describe.each`.
   - Règle de contrôle : `rg -i "m[eè]za" apps packages --glob '!**/*.test.*' --glob '!**/fixtures/**'` ne renvoie rien hors `landing/examples/data/*`. À ajouter à `pnpm verify`.
2. **Charte de 16 pages** avec contenu propre à la marque, **sans nouveau type de page ni changement de schéma** : `compose.ts` produit plusieurs instances des 11 types existants, pilotées par le plan de recherche. Nouveaux types = ADR après la présélection.
3. **Recherche de références** : `researchBrand` branché au worker, repli si le corpus `corpus-reel` (hors Git) est absent, **rejeu enregistré** pour la démo (quota Gemini gratuit non garanti).
4. **Landing** : réécrite en composants Next à partir de `showcase-flow` (jamais d'import de son `Studio.tsx`), plus page Tarifs **statique** à 3 paliers.
5. **Auth** : connexion, inscription, « Mes projets », rattachement du projet invité.
6. **Quota** : ADR-030 plus un compteur de 3 projets dans `POST /projects` côté serveur. Pas de table `subscriptions` avant le 09/11.
7. **Audit ciblé** sur les flux visibles par le jury : `pnpm audit`, gitleaks (historique), trivy, semgrep, `security-reviewer`, `silent-failure-hunter`. Tests navigateur par le MCP Playwright, sans nouvelle dépendance.

**Coupé** : paiement réel, ZAP, k6, ZIP de tokens, voix, partage, OAuth non configuré.
**Seuil bloquant** : secret réel dans l'historique, ou faille critique/haute **reproduite** sur auth, claim invité, upload, export, appels IA, recherche. Le reste est de la dette documentée.
**Si le temps manque** : sacrifier dans l'ordre landing, tarifs, audit. Jamais la qualité de charte ni l'auth.

## 4. Décisions du propriétaire en attente

1. Valider le roster de `ROSTER.md` (12 agents, 6 à 7 profils pour les skills).
2. `.gitignore` des copies générées d'impeccable : `.agent/skills`, `.gemini/skills`, `.github/skills`, `.github/hooks`, `.github/agents`, `.impeccable/`. Garder `.claude/skills/impeccable` et `.claude/agents/impeccable-*`.
3. Sauvegarder `prototypes/showcase-flow` sur une branche `comp/prototype-snapshot` (sans `node_modules` ni `dist`), l'exclure de `pnpm verify`, le supprimer après portage.
4. Désactiver le hook impeccable pendant les audits ?
5. Geler les installations le 8 au soir, ou laisser la chaîne de skills continuer ?
6. Autoriser `@axe-core/playwright` (ADR-026) ? Non nécessaire avant le 09/11.

## 5. Prochaine action

Après validation des décisions 1 à 3 : sauvegarde du prototype, `.gitignore`, ADR-029 à 032 (template, plans et quotas, pages pilotées par un plan, jeu d'exemples), puis lancement en parallèle de R1, R2/R3 et R5/R6.

## 6. Journal

- 2026-11-07 : réanalyse du projet, trois agents (Analyste, Architecte, Outils), deux tours de consensus, roster consolidé dans `docs/team/`. Aucun code modifié.
- 2026-11-07 (R5, branche `comp/r5-front-produit`, non poussée) : accueil, tarifs, connexion, inscription, projets portés en composants Next.
  - Routes : `/` (hero, atelier interactif, méthode, garanties), `/tarifs` (statique, prix « à valider »), `/connexion`, `/inscription` (Better Auth client, Zod, invité vers `/start`, inscription puis connexion enchaînée, rattachement `guest-sessions/claim`), `/projets` (liste `GET /api/v1/projects`, quatre états).
  - `/start` : message `QUOTA_PROJECTS` avec lien vers `/tarifs` (le repli invité ne s'applique plus à ce 403).
  - Messages : `apps/web/messages/product.{fr,en}.json` (fusionnés dans `i18n/request.ts`), plus deux clés `start.quota*` dans `fr.json`/`en.json`.
  - Atelier : lit `landing/example-source.ts` (interface `LandingExample`). Une seule source tant que R7 n'a pas mergé `landing/examples` : `demo.ts` (La Mèza). Brancher R7 = changer `listExamples()` et rendre `DemoSheet` générique.
  - Vérifié : tests ciblés, typecheck, lint, build. Rendu desktop capturé (thème nuit, Chromium headless). Mobile, thème jour et formulaires en navigateur : non vérifiés.
