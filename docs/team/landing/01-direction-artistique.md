# Landing Charta : direction artistique

Auteur : design-director. Date : 2026-11-09. Destinataire : agent constructeur de `apps/web/src/landing`.
Ce document ne contient aucun code ; il fixe des décisions. Si une décision heurte `apps/web/DESIGN.md`, DESIGN.md prime sauf mention « exception landing ».

## 0. Sources réellement étudiées

- Template : `prototypes/showcase-flow` (code de `Landing.tsx` et `styles.css` lu ; NON lancé ni capturé, aucune capture n'a été faite).
- `journal/research/inspirations/` : vues J02, J03, J04, J06, J08 ; J01, J05, J07 lues via `INDEX.md` seulement (le dossier contient 8 images, pas 10).
- `inspi_front_legacy/` : L1 (Clario, mots-pastilles), L5 (agence Ace UX), L9 (éventail de portraits sur noir), L14 (tarifs en verre noir), L18 (« Drops », cartes alignées), L21 (« Glow in the dark », arc lumineux).
- `inspi studio/download.jpg` (S1, SETO) ; `corpus-reel/` échantillon : planche « Brand Guidelines » orange (C-orange) et planche « NOVA Clothing » (C-nova).
- Code existant lu : `landing/home/*` (hero, backdrop, story épinglée, mur de mockups), `ui/fx.tsx` (Reveal, SplitWords, Float, Tilt, Magnetic, Counter), utility `blueprint`, `studio/mockups/mockup-stage.tsx` (13 scènes).

## 1. Parti pris

**Une table de tirage d'imprimeur sur laquelle le logo de l'utilisateur se déploie en charte complète : le papier reste calme et chaud, seule la marque choisie met de la couleur, et chaque section montre une vraie page A4 ou un vrai mockup WebGL, jamais une illustration.**

## 2. Ce qu'on garde du template, ce qu'on dépasse

Garde (validé par le propriétaire) :
- Capsule de navigation flottante, thème jour/nuit/système (J04, J06, L21).
- Atelier dès le hero : choix de marque, palette extraite, aperçu tokens (J02, J03). Déjà porté par `brand-picker` + `BrandProvider`.
- Cartes néo-brutalistes pour les piliers (J01) : bordure 2 px, ombre franche, mono pour les chiffres.
- Mesh de couleur derrière le titre + grille à repères (J04). Déjà dans `HeroBackdrop`.

Dépasse :
1. Template : tout est à plat, une seule profondeur. Nouveau : trois profondeurs lisibles (fond blueprint, feuilles A4 inclinées, objets WebGL) avec parallaxe contrôlée (§6), cf. J03 (cartes 2.5D autour du centre) et L9/L18 (cartes en éventail ou en rangée qui pivotent).
2. Template : le sélecteur de marque ne change pas tout. Nouveau : un changement de marque re-projette mesh, feuilles et mur de mockups en un seul temps ; c'est la démonstration du produit.
3. Template : titres uniformes. Nouveau : contraste « un mot Fraunces italique + grotesque lourd », hérité de J08 (« Best » calligraphique + sans-serif bold).
4. Template : aucune respiration sombre. Nouveau : une section « nuit » en thème inversé, objets lumineux sur fond sombre (L9, L14, L21).
5. Template : mockups en images fixes. Nouveau : vrais `MockupStage` WebGL, montés paresseusement, et pages A4 réelles (`DemoSheet`).

## 3. Grille

- Colonne maître 1240 px (existant), 12 colonnes, gouttière 24 px, marges 24 px mobile / 48 px dès 1024.
- Unité 4 px ; rythme vertical des sections : 96 px mobile, 160 px desktop ; 48 px entre titre et contenu.
- Une section = une idée = un geste. Alterner plein cadre centré (hero, final), 5+7 colonnes (story), plein débord (mur, nuit). J07 (dalles régulières) sert de modèle à la rangée de pages (S4).
- Feuilles A4 paysage 297x210 (ratio 1.414), jamais recadrées ; portrait seulement pour une page tokens ou une couverture secondaire.
- Ordre de lecture = ordre DOM ; aucune compréhension ne dépend d'un scroll épinglé : sous `lg`, chaque étape porte sa scène (comportement actuel de `Story`, à conserver).

## 4. Échelle typographique

Polices déjà installées (`styles/fonts.css`), aucune dépendance nouvelle : Bricolage Grotesque (display), Geist (texte), Geist Mono (mesures), Fraunces (accent éditorial).

| Rôle | Police | Taille | Graisse / interligne | Usage |
|---|---|---|---|---|
| Display | Bricolage | clamp(3rem, 9vw, 7.5rem) | 800 / 0.92, -0.04em | titre hero seul (J02, L18 : bloc central compact) |
| Section | Bricolage | clamp(2.25rem, 5vw, 4.5rem) | 800 / 0.98, -0.03em | titres de section |
| Accent | Fraunces italique | taille du mot voisin | 400-500 | UN mot par titre (J08) |
| Titre carte | Bricolage | 24-28 px | 700 / 1.1 | piliers, étapes |
| Lead | Geist | 20 px | 400 / 1.5, 60 car. max | sous-titres |
| Corps | Geist | 16 px | 400 / 1.5, 65-75 car. | texte |
| Mesure | Geist Mono, tnum | 12-13 px | 400 / 1.4 | hex, OKLCH, ratios, numéros de page, légendes (J01) |

Règles : un seul mot Fraunces par écran visible ; pas de texte en dégradé (anti-J03) ; chiffres toujours en mono ; titres en `text-balance`. Le texte des feuilles A4 suit les polices de la marque (donnée), jamais celles de la landing.

## 5. Palette en tokens (jour / nuit)

On réutilise les tokens existants de `globals.css` ; la landing n'ajoute AUCUNE teinte propre (règle « le client possède la couleur »). Seuls des alias calculés depuis la marque active sont ajoutés.

| Token | Jour | Nuit | Rôle |
|---|---|---|---|
| `--bg-canvas` | oklch(0.965 0.008 85) | oklch(0.16 0.008 60) | fond de page (papier / table sombre) |
| `--bg-surface` | oklch(0.99 0.004 85) | oklch(0.20 0.009 60) | cartes, feuilles |
| `--bg-preview` | oklch(0.90 0 0) | oklch(0.31 0 0) | derrière tout logo, chroma 0 |
| `--text-primary` | oklch(0.20 0.01 60) | oklch(0.96 0.008 85) | titres |
| `--border-subtle` | oklch(0.84 0.01 85) | équivalent nuit | grille blueprint |
| `--brand-1`, `--brand-2` (alias nouveaux) | `example.colors[0]`, `[1]` | idem, éclaircis par `color-mix(in oklch, ... 70%, white)` si L < 0.55 | mesh, halos, ombres teintées |
| `--glow` (alias nouveau) | inutilisé | `color-mix(in oklch, var(--brand-1) 45%, transparent)` | halo des objets en nuit (L21) |

Règles : fond « nuit » = `--bg-canvas` du thème sombre, jamais #000 ; halos = couleur de la marque active seulement (L9 et L21 sont multicolores : NE PAS reproduire, une marque à la fois) ; ombres d'objets imprimés = « Sheet » de DESIGN.md ; contraste texte >= 4,5:1 vérifié, y compris par-dessus le mesh.

## 6. Règles de mouvement

Moteur : `motion` 12.43 (`useScroll`, `useTransform`, `useSpring`) + CSS (`Reveal`, `SplitWords`). Pas de lib de scroll (Lenis, GSAP) : aucune dépendance nouvelle. Aucun contexte WebGL hors `MockupStage`.

Durées : micro 150 ms ease-out ; révélation 600-800 ms `cubic-bezier(0.22, 1, 0.36, 1)` ; changement de marque 900 ms. Une seule courbe pour la page. N'animer que `transform`, `opacity` et un `filter: blur` court (<= 12 px) ; jamais `top/left/width`.

Scroll :
- Natif, sans scroll hijack ; une seule section épinglée (la story, 260 vh max) ; pas de snap.
- Parallaxe contrôlée : 3 couches (fond blueprint 0,15x ; feuilles 0,4x ; objets 0,7x), amplitude plafonnée à 80 px, rotation <= 6 degrés, jamais sur du texte courant, lissée par `useSpring` (stiffness 120, damping 24).
- Révélations : `Reveal` (flou vers net, translation 16-24 px), stagger 80 ms, 6 éléments max par groupe, une seule fois.
- Mur de mockups : `LazyMount` ; au plus 4 contextes WebGL vivants ; les autres gardent leur dernière image fixe ; au changement de marque, onde de stagger du centre vers l'extérieur (60 ms par tuile).
- Hover (desktop) : `Tilt` max 6 degrés sur feuilles et mockups ; `Magnetic` uniquement sur le CTA principal.
- Ambiance : orbites du hero en rotation lente (60 s par tour), `Float` <= 6 px.

Reduced motion (obligatoire, testé) : `prefers-reduced-motion: reduce` = états finaux immédiats, parallaxe nulle, aucun épinglage (la story passe en pile verticale), orbites et mesh figés, changement de marque par fondu de 150 ms. NOTE constructeur : le commentaire de `Float` dans `ui/fx.tsx` dit « still under reduced motion » ; ce comportement est à corriger, `Float` doit s'arrêter.

Perf : le LCP est le titre du hero (texte) ; aucune image ni WebGL sous le pli avant d'être à un écran ; réseau faible = les mockups affichent leur état d'échec avec retry (existant), jamais un trou.

## 7. Scénographie section par section

Marque par défaut = l'exemple actif du `BrandProvider`. Aucun nom de marque dans les composants (`check-brand-names`).

**S1 Hero** (J02 orbites, J03 constellation, J04 mesh + grille, L21 arc).
Titre Display centré avec un mot Fraunces, sélecteur de marque dessous. Derrière : mesh aux deux couleurs de la marque, grille blueprint avec croix de repère, 4 orbites pointillées sur lesquelles voyagent des puces de preuve en mono (hex, ratio de contraste, nombre de pages) : valeurs calculées sur la marque active, étiquetées démonstration. Sous le titre : éventail de feuilles A4 réelles (`DemoSheet` cover, palette, contrast, typography) rangées en arc (L9, L18), la feuille centrale à plat. Geste : au scroll l'éventail se referme et monte (parallaxe 0,4x), le logo de la couverture reste net.

**S2 Bande de preuves** (J04 bande presse, J01 cartes franches).
Une bande de puces mono qui défile lentement (marquee CSS, pause au hover et au focus, statique en reduced-motion). Contenu : les promesses réelles de `homePage.promise`. Ni logos de presse, ni chiffres d'utilisateurs (aucun n'existe).

**S3 Méthode épinglée : déposer, regarder, ajuster** (J08 fil pointillé 01 vers 06, J05 pipeline nodulaire, S1 chat).
`Story` existant, conservé. Gauche : 3 étapes numérotées en mono avec un fil pointillé vertical qui se trace avec `scrollYProgress` (`pathLength`). Droite : (1) dépôt du logo sur `preview-grey`, (2) pipeline en nœuds reliés par courbes de Bézier qui s'allument un à un (palette, contrastes, variantes, mockups ; J05), (3) phrase du copilote puis réécriture de la page A4 contraste. Phrases issues de `homePage.method`, pas de conversation inventée.

**S4 Une charte, page par page** (J07 dalles, C-orange et C-nova planches modulaires).
Rangée horizontale à défilement contrôlé, non épinglée, des types de pages réels (cover, manifesto, logo, clear-space, do-dont, palette, contrast, typography, tone-of-voice, mockup, tokens) rendus par `DemoSheet` pour la marque active, légende mono « 03 / palette ». Au clic, la feuille se lève (`Tilt` + zoom). Composition en champs de couleur juxtaposés, sans cadre (règle DESIGN.md).

**S5 Mur de mockups** (L18 cartes alignées, J06 cartes qui surgissent, C-nova, C-orange).
Remplace la grille 3x2 par un rythme irrégulier : 1 grande scène (poster-hanging), 2 moyennes (cards-floating, a4-sheet), 3 petites (mug-stripes, paper-bag, storefront-sign), toutes en `MockupStage`. Fond : table sombre (`--bg-canvas` nuit) plutôt que `bg-accent`, pour que les photos ressortent (L14, L21). Sous le mur, puces de marque : un clic change la marque de tout le mur (moment 4).

**S6 Nuit : les fichiers qui sortent** (J03 sorties autour du centre, L21 arc, L14 verre).
Section en thème sombre local : logo maître au centre dans un anneau ; autour, en arc, les sorties réelles de l'export : PDF, variante blanche, variante noire, tokens CSS, tokens Tailwind. Cartes en verre sombre (fond translucide, `backdrop-filter: blur(16px)`, bordure 1 px) avec halo `--glow`. Chaque carte porte un extrait réel en mono (une variable CSS de la marque active).

**S7 Offre** (L14, J01). `pricing.tsx` existant, repris dans les cartes de S6, plan central plein ink, aucune promesse non tenue.

**S8 Appel final** (J04 capsule noire, J06 doodles).
Fond ink, titre Section, un seul bouton pill. Deux doodles SVG au trait fin au maximum (étincelle, spirale), en couleur ink inversée (J06) : humaniser sans cartoon.

## 8. Cinq moments « waouh » (faisables avec l'existant)

1. **Le logo qui repeint la page** (J04, J02). Autre marque choisie : mesh, halos, feuilles et ombres teintées basculent en 900 ms (`color-mix` sur variables CSS alimentées par `BrandProvider`), les puces d'orbite recalculent leurs valeurs réelles. CSS + motion, aucun WebGL.
2. **L'éventail qui se range en dossier** (L9, L18, J06). Les feuilles A4 du hero se redressent et s'empilent en perspective douce sur les 100 premiers vh de scroll (`useScroll` + `useTransform`, plafonds du §6) : on voit un dossier se former.
3. **Le fil qui trace la méthode** (J08, J05). Le pointillé de S3 se dessine avec le scroll et allume les nœuds du pipeline ; la dernière étape fait réellement réécrire la page contraste (avant/après de `DemoSheet`).
4. **Le mur qui se re-projette** (L18). Dans S5, un clic de marque relance les 6 scènes WebGL avec le nouveau logo en onde du centre ; chaque tuile garde son image précédente jusqu'à ce que la nouvelle soit prête (fondu croisé), donc pas de flash noir.
5. **La nuit qui s'allume** (L21, L9, L14). À l'entrée de S6, la section passe en thème sombre (`data-theme` local, fond en 600 ms) et les cartes de sortie s'allument une à une avec le halo de la marque. Le contraste jour/nuit est l'effet.

## 9. Ce qu'il NE faut PAS faire

- Aucun dégradé violet/indigo générique, aucun titre en dégradé (J03, J04 : on prend la structure, pas le look).
- Aucune couleur de chrome propre à Charta, aucun multicolore (L1, L5, L9, L21 sont multicolores : composition seulement).
- Pas d'emoji, pas de stickers, pas d'illustration cartoon (J06) ; 2 doodles trait fin maximum par page.
- Pas de faux avis, faux chiffres, logos de presse (J04) ni « 4M+ users » (J03) : aucun client n'existe. Les nombres affichés sont calculés sur la marque et étiquetés démonstration.
- Pas de nom de marque d'exemple dans un composant ; une marque est une donnée (`landing/examples/data`). La Mèza n'est qu'un exemple parmi cinq.
- Pas de logo sur papier chaud ou dans un cadre : `preview-grey` ou champ de couleur choisi.
- Pas de scroll hijack, de snap, de curseur custom, ni de seconde section épinglée.
- Pas plus de 4 contextes WebGL simultanés ; pas de vidéo, de Lottie ni de nouvelle dépendance.
- Pas d'ombre sur panneaux ; ombre réservée aux feuilles, mockups et objets flottants.
- Pas de #fff ou #000 purs ; pas de Fraunces au-delà du mot d'accent ; aucune valeur mesurée hors mono.
- Aucun contenu dont la compréhension dépend du mouvement ; tout reste lisible en reduced-motion.
- Pas de copie littérale d'une référence : J, L, S et C servent de composition, jamais de pixels (PRODUCT.md).

## 10. Critères de recette (browser-qa)

- Hero lisible à 375, 768 et 1440 px sans scroll horizontal ; LCP = texte.
- Les 5 moments fonctionnent en jour et en nuit ; thème « système » respecté.
- `prefers-reduced-motion` : aucune animation continue, aucun épinglage.
- Navigation clavier complète, anneau de focus violet visible, marquee pausable.
- `pnpm verify` vert (dont `check-brand-names`).
