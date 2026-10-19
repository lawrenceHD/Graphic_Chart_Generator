# Interface : ancien front, inspirations, modèle « Stitch », kit de skills design

> Note de recherche, 2026-10-19. Demande du propriétaire :
> - accueil inspiré de ses images de référence ;
> - espace de travail à la manière de Google Stitch, où l'on voit la charte se construire en temps réel ;
> - interfaces très animées, mobile d'abord.
>
> Statut : **proposition**. `docs/09_DESIGN_SYSTEM.md` reste la règle tant que le chef de projet ne l'a pas modifié.

## 1. L'ancien front (`Graphic_Chart_Frontend_legacy`)

Contenu : Next.js 16, Tailwind 4, framer-motion, environ 9 700 lignes. Il compte trois écrans :
- l'accueil « BrandForge » ;
- le tableau de bord `/studio` ;
- l'espace de travail `/studio/[id]`, avec des onglets « Canvas Stitch », « Pipeline Flow » et « Livre A4 ».

Je l'ai démarré et capturé à 1440 × 900 et à 390 × 844, sans aucune erreur JavaScript.

**Ce qui vaut d'être gardé**
- **L'intuition produit.** La charte se présente comme des planches sur une toile, avec une barre de prompt flottante et des suggestions en puces (« Passer en or rose », « Valider le contraste »).
- **La barre de prompt de l'accueil**, qui ouvre directement le studio.

**Ce qui ne peut pas être repris tel quel**
1. **Mobile cassé.** L'outil ne mesure aucun débordement horizontal, parce que le contenu est coupé (`overflow: hidden`), mais :
   - sur l'espace de travail, les planches, les onglets et la barre d'outils sortent de l'écran ;
   - la barre de prompt recouvre le contenu ;
   - le titre du tableau de bord se casse en colonne de mots (« des / Marques / & / Pipeline / Flow »).

   C'est un front pensé pour le bureau, puis rétréci.
2. **Promesses fausses ou invérifiables affichées à l'écran.** « WCAG 2.2 AAA, ratio 9,8:1 », « Pantone », « ISO 12647-2 CMJN », « 300 DPI », « Norme d'imprimerie ». Le produit ne garantit rien de cela : le CMJN est indicatif (§CMJN de `05_ENGINES.md`) et il n'y a pas de Pantone. C'est un risque juridique et de confiance (`01_PRODUCT_MVP.md` §7).
3. **Toutes les données sont fictives** (`mock-data.ts`) ; aucun branchement sur l'API.
4. **Esthétique générique « IA ».** Violet néon, dégradé violet → orange sur le titre, verre partout, majuscules à chasse fixe en surtitre. Une douzaine de surfaces en verre sont visibles en même temps, alors que `09` en autorise au plus 3. Quatre cartes métriques identiques. Le « violet IA » est le cliché que les deux sources de goût (le kit de skills ci-dessous et `09` §1) demandent d'éviter, et la marque de l'utilisateur doit primer sur l'interface.
5. **Hors spécification** : tokens absents, couleurs en dur, aucun test d'accessibilité.

**Verdict** : on reprend les idées (toile de planches, prompt flottant, puces de suggestion), pas le code.

## 2. Les 25 images d'inspiration

Ce sont surtout des pages d'accueil.

**Motifs récurrents**
- Typographie d'affiche, énorme et serrée (« Faizur », « Resend », « We exist for purpose »).
- Un seul mot du titre mis en valeur dans une pastille colorée (« A new *way* to *create* »).
- Cartes en éventail ou en arc, en 3D légère (portraits, objets).
- Autocollants et étiquettes inclinés, rendu « jouet ».
- Avatars ou nœuds reliés par des courbes (communautés, flux).
- Sections sombres avec un objet lumineux unique.

**Deux images parlent directement de l'espace de travail**
- Une interface à nœuds sur la gauche, avec l'aperçu du personnage sur la droite.
- Un tableau d'analyse « en cours », avec des étapes Terminé / En cours / En attente, un graphe vivant et un panneau de résultats qui se remplit.

Ces deux images forment exactement le modèle de la timeline d'analyse (AC-04.1).

**Lecture** : l'accueil peut être expressif, à condition qu'**un seul geste fort** mène chaque section. Le volume d'effets de l'ancien front ne respecte pas cette règle.

## 3. Le modèle « Stitch » appliqué à la charte

Fonctionnement de Stitch (Google Labs), tel que retenu ici :
- l'accueil est un grand champ de prompt, avec dépôt d'image ;
- l'espace de travail est une **toile infinie** où les écrans générés apparaissent un par un, en squelette animé puis en rendu final ;
- un **panneau de conversation** à gauche suit la génération ;
- sélectionner un écran ouvre une **barre d'actions contextuelle** : modifier, variantes, aperçu, code ou export ;
- un panneau de thème (couleurs, polices, rayons) s'applique en direct à tous les écrans.

**Transposition**

| Stitch | Notre studio |
|---|---|
| Écrans générés | Pages de la charte (logo, palette, contrastes, typographie, règles, mockups) en planches A4 sur la toile |
| Génération progressive | Les planches naissent au fil du flux SSE (T-019) : `asset.status` → planche Logo en squelette ; étape 2 → la Palette se remplit couleur par couleur ; étape 3 → la Typographie ; `analysis.done` → la charte est assemblée |
| Conversation | Copilote (US-11) ; en attendant, la timeline des 4 étapes avec `aria-live` |
| Barre d'actions | Inspecteur de la page (US-10) : modifier, variantes, exporter la page |
| Panneau de thème | Palette et polices de la **marque**, appliquées en direct à toutes les planches (commandes du document) |

**Mobile d'abord (Stitch n'est pas conçu pour le téléphone, c'est donc notre propre conception)**
- La toile devient un **carrousel de planches plein écran**, balayé au doigt, avec une barre de pagination.
- Le pincement zoome dans une planche.
- Le prompt et le copilote deviennent une **feuille montante** (bottom sheet) à 3 crans : replié, demi, plein.
- La timeline est une **pastille fixe** en haut (« 2/4 Palette… ») qui se déplie.
- Sur bureau (`min-width`), on ajoute la toile libre (panoramique, zoom, vue d'ensemble) et le panneau latéral.

## 4. Le kit `plugin87/ux-ui-agent-skills` (« XIAS », v2.9.8, licence MIT)

Le kit fournit :
- 25 skills et 7 règles ;
- 14 fichiers de tokens au format DTCG et 52 portes de contrôle, dont 34 ouvrent un vrai navigateur (Playwright) ;
- 138 systèmes de design nommés.

C'est une couche d'instructions, sans dépendance d'exécution.

**Utile pour nous**
- **La doctrine.**
  - Mobile d'abord vérifié : le contrôle retire les media queries et rend la page à 320 px.
  - Les 8 états de chaque contrôle.
  - « Une chose mène » par écran.
  - Une seule couleur d'accent.
  - Interdits :
    - la bordure colorée d'un seul côté ;
    - le `<select>` natif ;
    - les émojis dans l'interface.
- **`taste/motion-choreography.md`.** Apparitions, décalages (stagger), physique au survol, retour à l'appui, transitions de sections, superpositions, chargement, ainsi que les anti-motifs. C'est la grammaire qu'il faut pour des interfaces « très animées » sans effet de foire.
- **Les scripts de contrôle Playwright** :
  - débordement à 280, 320 et 414 px ;
  - taille des cibles ;
  - `prefers-reduced-motion` ;
  - clavier ;
  - contraste dans chaque état.

  Ils sont à **adapter** dans notre outillage de vérification au moment de T-020, en complément de l'axe déjà prévu par `09` §5.
- `/critique` et `/design-review`, en relecture après les contrôles.

**À ne pas importer tel quel**
- Ses tokens DTCG et son thème : `09` §2 définit déjà les nôtres (OKLCH, vérifiés par `color-engine`). Deux sources de vérité, ce serait un défaut.
- Ses hooks Claude Code :
  - `Stop` exige ses propres mesures ;
  - `PostToolUse` lance ses contrôles.

  Ils entreraient en conflit avec `tools/agent-hooks/`.
- Les 138 systèmes nommés reproduisent des marques (Apple, Stripe…) : ce sont des références d'esprit, à ne jamais copier.

**Installation** : l'agent n'a pas le droit d'écrire dans `.claude/`. L'installation sélective (doctrine, motion, critique, a11y-audit) est à faire par le propriétaire, avec le script d'outillage en attente.

## 5. Écarts avec `09_DESIGN_SYSTEM.md` à trancher

1. **« Hyper animé » face à « sobre, net ».** C'est compatible si l'animation reste une chorégraphie qui porte du sens :
   - la génération qui se dévoile ;
   - les planches qui arrivent en décalé ;
   - les couleurs qui se posent.

   Restent obligatoires, comme le demande `09` §4 : `transform` et `opacity` seulement, ≤ 100 ms pour le retour d'une interaction, `prefers-reduced-motion` respecté, aucune boucle sans pause. Je propose de réécrire `09` §1 point 4 dans ce sens.
2. **Landing gelée** (`09` §1 point 5, `12_WORKFLOW_ROADMAP.md` §7). Une refonte de l'accueil demande de lever ce gel ; je recommande de le faire **après** le studio.
3. **Thème sombre par défaut.** Les images d'inspiration sont à moitié claires. Le studio reste sombre et neutre, conformément au §1 point 1 (zones d'aperçu en gris neutre). L'accueil pourrait être clair.

## 6. Proposition d'ordre

1. **T-019 partie 2** : le job d'analyse, qui alimente les événements en temps réel.
2. **T-020** : fondations UI, avec trois chantiers :
   - les tokens de `09` ;
   - le mouvement : grammaire de chorégraphie, ressorts de `09` §4 et réduction de mouvement ;
   - les contrôles navigateur (320 px, cibles, réduction de mouvement, axe).
3. **T-021** : dépôt du logo et timeline, qui sont le premier « moment Stitch », branchés sur le flux SSE réel.
4. **T-022** : les planches de la charte sur la toile, avec leur version mobile en carrousel.
5. L'accueil vient ensuite, une fois le gel levé.

Avant T-020, je peux produire un **prototype navigable de l'espace de travail mobile et bureau**, sur fausses données, pour valider la direction sans engager le code de production.
