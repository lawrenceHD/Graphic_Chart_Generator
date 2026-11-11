# Analyse du projet et nettoyage du dossier (2026-11-11)

> Branche `comp/j3-studio`. Tout ce qui est dit « constaté » a été exécuté ou lu ce jour-là ; le reste est un avis.
> Parcours testé au navigateur (Chromium 1248, thème jour, 1600 px) : accueil, tarifs, démarrage, studio, export, copilote.

## 1. Ce qui marche (constaté)

- Un logo SVG en tracés et quatre lignes de brief donnent, en 35 à 50 s, une charte de 25 pages : 12 pages de règles
  (couverture, sommaire, histoire, logo, variantes, zone d'exclusion, taille minimale, usages interdits, palette,
  typographie, clôture, tokens) et 13 mises en situation.
- Les mises en situation sont le point fort : cartes, papier à en-tête, affiches, tasses, menu, enseigne, coffret, sac.
- Le copilote explique ses mesures (ratios de contraste, couleur corrigée à 4,59:1 avec bouton « Appliquer »).
- Exports présents : impression PDF, kit logo en .zip, fichiers logo, variables CSS, Tailwind, tokens DTCG.
- `pnpm verify` vert après les correctifs du §3 : 1 209 tests, 0 violation de dépendances.

## 2. Ce qui ne va pas (constaté)

| # | Constat | Gravité |
|---|---|---|
| 1 | L'analyse échouait pour **tout** logo (`RASTER_FAILED`) depuis le 2026-11-09 : un agent avait fait de `node_modules` d'une copie de travail une jonction vers celui du dépôt, puis lancé `pnpm install` ; tous les liens du dépôt passaient par `.claude/worktrees/agent-a79b…`, que le bac à sable du rasteriseur refuse de lire. Réparé (§3). | Bloquant |
| 2 | `pnpm verify` rouge sur la branche : 19 fichiers non formatés, build en échec (`robots.ts` et `sitemap.ts` lisaient `APP_URL` au build), un test de durée en échec (`sanitizeManifestText`, 2,3 à 2,8 s pour un seuil de 2 s). Réparé (§3). | Bloquant |
| 3 | Logos de marques tierces versionnés et servis : `apps/web/public/demo/logos/` (Adyen, Marvel, Patreon, Basecamp…) et mur de logos sous le hero (Dropbox, GitLab, Kubernetes, React…). Se lit comme « ils nous font confiance » et contredit `apps/web/PRODUCT.md` (« never a third-party mark »). **Non corrigé** : change l'accueil validé. | Haut, avant toute mise en ligne |
| 4 | Six branches non fusionnées, environ 3 000 lignes : mockups modifiables, PDF du manifeste, refonte des pages de charte, variantes des logos d'exemple, `purpose` de la recherche, sélection d'objets. Voir §4. | Haut |
| 5 | Un SVG dont le texte n'est pas vectorisé est refusé (« Convertir en image HD »). Un amateur s'arrête là. | Moyen |
| 6 | Titres de page en anglais dans une charte française (« Cover », « Brand story », « Colour palette ») quand la recherche se replie sur le plan standard. | Moyen |
| 7 | Recherche de références inactive dans le worker lancé depuis `apps/worker` : `RESEARCH_CORPUS_DIR` vaut `corpus-reel`, relatif au dossier courant, donc introuvable ; l'utilisateur voit « résultat partiel » dès la première charte. | Moyen |
| 8 | Cliquer une page dans la liste change l'inspecteur mais ne fait pas défiler la toile jusqu'à la page. | Moyen |
| 9 | Le PDF est la boîte d'impression du navigateur, pas un rendu serveur. | Moyen |
| 10 | Demande « une police plus moderne pour les titres » : le copilote répond Cormorant Garamond. | Faible |
| 11 | `/tarifs` : 14 à 17 s côté serveur en mode dev (à mesurer sur un build de production). | À vérifier |
| 12 | `gemini key.txt` en clair à la racine (ignoré par Git, jamais commité : `git log --all` vide). | À déplacer |

## 3. Fait pendant cette session

- **Sauvegarde** du travail non commité de trois copies de travail en commits `wip` sur leurs branches
  (`worktree-agent-a166…` e23cd45, `comp/pdf-manifest` 7ff7915, `comp/r4-charte-pages` 1374a98) ; page de test ignorée
  copiée dans `.cache/backup-worktrees/`.
- **Suppression** des 11 copies de travail de `.claude/worktrees/` (8,2 Go), jonction retirée d'abord, puis
  `pnpm install --frozen-lockfile` pour refaire les liens. Aucune branche portant du travail n'est supprimée.
- **Corbeille** : 1 524 images de `corpus-reel/pinterest/` (1,33 Go), comme prévu par `RESUME.md` ; `index.jsonl`,
  `manifest.json` et les 1 500 analyses JSON restent.
- **Suppression** de `prototypes/studio/node_modules` (25 Mo, `npm ci` le refait), du reste vide de
  `prototypes/showcase-flow`, et de 14 branches locales `worktree-agent-*` déjà fusionnées.
- **Correctifs** : `robots.ts` et `sitemap.ts` rendus à la requête ; balise bornée par `[^<>]` dans
  `sanitizeManifestText` (un `<a<a<a…` ne relit plus 200 caractères à chaque `<`) ; formatage des 19 fichiers.
- **Laissé en place** : `HANDOFF.md`, `journal/`, `sortie tikets/` (lus par les commandes Gemini `/reprendre` et
  `/relais`), `.agent/`, `.gemini/`, `.cache/`, `docs/_archives/`.

## 4. Branches à trancher (fusionner après `pnpm verify`, ou abandonner)

| Branche | Contenu | État |
|---|---|---|
| `worktree-agent-a166610504f843003` | Mockups modifiables : version du logo, finition et couleur par objet, annuler/rétablir, export PNG et ZIP | 6 commits, dernier = wip non vérifié |
| `comp/r4-front-charte` | Objets de mockup sélectionnables (inclus dans la branche ci-dessus) | 1 commit wip |
| `comp/r4-charte-pages` | Refonte des pages couverture, logo, zone d'exclusion ; `pages/art/` ; `docs/team/charter/PAGE-ARCHETYPES.md` | wip non vérifié |
| `comp/pdf-manifest` | Lecture du texte d'un PDF déposé comme manifeste (ajoute une dépendance : ADR requis) | wip non vérifié |
| `comp/noe-scenes2` | Variantes blanche et noire des seize logos d'exemple | 1 commit |
| `worktree-agent-a1cbae240c377493f` | `purpose` sur `RunResearchInput`, script `record-demo` | 2 commits |

## 5. Avis : qui le produit peut attirer

- **Indépendants, fondateurs, amateurs qui ont déjà un logo : oui.** La promesse tient en une minute et le résultat est
  présentable. C'est le public à servir en premier.
- **Designers professionnels : pas en l'état.** Le résultat reste enfermé dans le studio web et un PDF imprimé ; les
  pages de règles sont un gabarit propre mais clairsemé ; ni CMJN ni PDF imprimeur. Un pro ne signe pas un livrable
  qu'il ne peut pas reprendre dans son outil.
- **Aucune demande n'est démontrée** : aucun entretien (P-001 non fait), aucun prix validé, aucun utilisateur extérieur.
  Cinq à dix essais réels valent plus que la prochaine fonctionnalité.
- **La méthode coûte plus qu'elle ne rapporte** : douze rôles, quatre systèmes de reprise (`HANDOFF.md` et `journal/`,
  `docs/team/*`, `CHANGELOG.md`, `PROGRESS_TRACKER.md`), onze copies de travail. Elle a cassé le parcours principal
  et laissé `verify` rouge sans que personne ne le voie.

## 6. Intégrations demandées

- **Figma : oui, en premier, par un plugin.** L'API REST ne crée pas de contenu dans un fichier et l'écriture des
  variables y est réservée au plan Enterprise. Un plugin (API Plugin) qui importe l'export de Charta peut créer les
  variables, les styles, les variantes du logo en composants et les pages en cadres A4. L'export DTCG existe déjà.
- **Google Stitch : non pour l'instant.** Il génère des écrans d'application, pas des identités ; c'est du génératif,
  à l'opposé de la promesse « calculé, pas imaginé ». Un SDK et un point d'accès MCP existent ; prix et limites non
  vérifiés.
- **Clone d'Illustrator : dépôt non identifié**, à préciser. Un éditeur vectoriel embarqué est un gros chantier et
  contredit « le logo est sacré ». Le besoin réel côté Illustrator est l'échange de fichiers : accepter `.ai`, `.pdf`,
  `.eps` en entrée et vectoriser le texte d'un SVG automatiquement (constat 5).

## 7. Ordre proposé

1. Retirer les logos de marques tierces (constat 3).
2. Trancher les six branches (§4).
3. Corriger les constats 5 à 8.
4. Cinq essais avec de vrais indépendants et deux designers.
5. Plugin Figma, puis PDF serveur.
6. Réduire la méthode à un seul fichier de reprise.
