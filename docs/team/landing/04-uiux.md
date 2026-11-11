# 04 — Brief UI/UX de la page d'accueil (uiux-lead, 2026-11-09)

Aucun code modifié. Lecture : PRODUCT.md, DESIGN.md, `landing/landing.tsx`, `site-header.tsx`, `atelier.tsx`, `home/*`, `prototypes/showcase-flow/src/screens/Landing.tsx`.

## 0. Ce qui est mesuré, ce qui ne l'est pas

Méthode : MCP playwright non exposé dans cette session. J'ai piloté `chrome-headless-shell` (Chromium 1248 de ms-playwright) via CDP : viewports 360/390/768/1440, `prefers-color-scheme` et `prefers-reduced-motion` émulés, captures, `getBoundingClientRect`. Captures : `%TEMP%\claude\...\scratchpad\uiux\*.png` (d1440, n1440, d390, n390, f1440d/n, f390d/n, v360, v768, rm1440, p1440d/n, p390).

Mesuré (valeurs lues dans la page) :
- Aucun défilement horizontal : `scrollWidth == clientWidth` à 360, 390, 768 et 1440.
- Thème système : le fond passe de lab(95.97) à lab(3.69) quand le schéma émulé change (jour/nuit fonctionnent à 390 et 1440).
- Hauteur de page : 7400 px (1440), 8288 (390), 8382 (360), 7640 (768). Un seul `h1`, 0 image sans `alt`.
- Cibles sous 44 px : lien logo 76x36 ; **les 5 liens du pied de page font 21 px de haut** (Essayer sans compte, Tarifs, Connexion, Créer un compte, Mes projets) à toutes les largeurs.
- En-tête mobile 390 : deux rangées empilées, environ 135 px de haut sur 844 (16 %), sticky. Le sélecteur de langue FR/EN est masqué sous `sm` (le code le confirme : `hidden sm:block`).
- Prototype (`dist` servi en statique) : cibles de 24 à 40 px de haut (marques 30, scènes 24, liens 16), textes mono de 9 à 11 px dans le code, marques tierces (GitLab, Instacart, Basecamp, Elm), thème nuit non suivi (p1440n identique à p1440d : bascule manuelle seulement).

Non mesuré (à ne pas affirmer) : ratios de contraste réels (je me fie aux tokens de DESIGN.md, non recalculés), anneau de focus et ordre de tabulation (pas parcouru au clavier), lecteur d'écran, tactile réel, LCP/INP/CLS, poids réseau. Les captures pleine page de la nuit montrent un grand vide sous le hero (entre 450 et 1650 px sur l'image réduite) : c'est soit un artefact de capture (sections montées au scroll, `lazy-mount` WIP non commité), soit un vrai trou. **À vérifier par le constructeur** avant toute conclusion. L'atelier actuel travaille sur des données statiques : ses états chargement/erreur n'existent pas encore dans le code.

## 1. Comparaison accueil actuel vs showcase-flow

| Axe | Actuel (localhost:3000) | Prototype showcase-flow |
|---|---|---|
| Promesse | H1 display 800, "Votre logo devient une charte complète." | H1 en dégradé vert-ambre-indigo : viole « la couleur appartient au client » |
| CTA | 2 : « Essayer sans compte » (ink) + « Voir une charte » (secondaire) | 2 vers le dashboard, texte dépendant de la marque active |
| Preuve | Feuilles A4 en éventail, puce `16.06:1 · AAA`, bloc de tokens | Palette + `tokens.json` + scène photo, très dense |
| En-tête | Capsule : logo, FR/EN, thème 3 états, Connexion, CTA, puis Atelier/Méthode/Tarifs | Capsule, 4 liens, bascule thème 1 bouton |
| Marques | Fictives, validées (`DemoExample`) | Marques réelles tierces : interdit (PRODUCT.md) |
| Accessibilité | Radios segmentés, `region` labellisée, `role=status` | Boutons 24 px, textes 9-11 px |

À reprendre du prototype : l'idée d'un atelier posé dès le hero, qui réagit à un choix de marque, et le lien direct « Ouvrir dans le studio avec cette marque ». À rejeter : dégradé du titre, marques tierces, densité sous 12 px, bascule de thème non système.

Défauts de l'actuel observés : (1) en desktop le CTA primaire se trouve au milieu de la capsule, entre les contrôles et les liens, l'œil lit « Connexion, Essayer » avant « Atelier » (ordre DOM : logo, contrôles, nav) ; (2) en mobile l'en-tête mange 16 % de l'écran et le CTA hero apparaît seulement vers y=680 ; (3) pas de langue en mobile ; (4) le pied de page est trop petit au toucher ; (5) le bandeau « Marques d'exemple » est coupé sur les bords (volontaire pour un défilement, mais sans contrôle visible).

## 2. Parcours visiteur

1. **Arrivée** (0-5 s) : comprend « logo en entrée, charte en sortie » par le H1 et par une feuille réelle visible sans scroll mobile partiel. Aucune inscription.
2. **Preuve** (5-30 s) : choisit une marque d'exemple, voit palette, contraste mesuré, mockup changer. Chaque chiffre porte son mono et sa mention « démonstration ».
3. **Essai** : « Essayer sans compte » mène à `/start` (nom, logo, brief) en session invité. Aucun mur.
4. **Conversion douce** : la création de compte (`/inscription`) n'est proposée qu'après valeur reçue (sauvegarder, exporter) et en secondaire dans l'en-tête (`/connexion` pour les revenants). Le CTA final répète « Essayer sans compte », avec « Créer un compte » en lien texte.
5. **Retour** : un visiteur identifié voit « Mes projets » à la place d'« Essayer sans compte » (à confirmer côté session).

Règle : un seul bouton primaire ink par écran visible ; tous les CTA primaires pointent `/start`, jamais `/inscription`.

## 3. Hiérarchie par écran (ce qui domine)

Desktop 1440 :
1. Hero : le titre display domine ; le bouton primaire est le 2e point d'attention ; la feuille A4 centrale est le 3e. L'éventail ne doit pas passer devant le titre.
2. Atelier : l'aperçu de feuille (colonne 8/12) domine ; palette et contrastes (4/12) sont des preuves subordonnées.
3. Méthode (3 gestes) : le titre de l'étape active domine ; les deux autres à 45 % d'opacité (déjà le cas).
4. Garanties : chiffres mono en tête, texte ensuite.
5. CTA final : un titre, un bouton.

Mobile 390 (ordre vertical imposé) : en-tête compact, H1, lead, CTA primaire, CTA secondaire, note, feuille réelle, sélecteur de marque, atelier, méthode, garanties, CTA final. Le CTA primaire doit être visible sans scroll (aujourd'hui vers y=680 sur 844 : OK de justesse, à garder).

## 4. Navigation et en-tête

Desktop : logo à gauche, trois liens (Atelier, Méthode, Tarifs) au centre, à droite : FR/EN, thème, Connexion, CTA. Ordre DOM identique à l'ordre visuel (corrige le défaut 1). Capsule `rounded-full`, hauteur ≤ 64 px.

Mobile (<640 px) : une seule rangée de 56 px max : logo, CTA « Essayer » (min 44 px), bouton menu 44x44. Le menu ouvre une feuille plein écran (`dialog` modal, focus piégé, Échap ferme, focus rendu au bouton) contenant : Atelier, Méthode, Tarifs, Connexion, FR/EN, thème 3 états. Le menu ne doit pas déplacer le CTA primaire. Le sélecteur de langue devient accessible en mobile (défaut 3). Liens d'ancre : `scroll-margin-top` égal à la hauteur de l'en-tête.

Lien d'évitement « Aller au contenu » conservé (visible au focus, cible 44 px quand visible).

## 5. Atelier interactif : comportement et états

Contrôles : choix de marque (radios segmentés, ≥ 3 marques fictives, 2 langues) et choix de page (couverture, palette, contraste, typographie). Si le constructeur ajoute le dépôt d'un logo, ces états s'appliquent :

| État | Comportement |
|---|---|
| Repos / vide | Marque d'exemple 1 déjà affichée (jamais d'écran blanc). Zone de dépôt : « Déposez un logo SVG, PNG ou WebP, 5 Mo max ». |
| Survol de dépôt | Contour ink 2 px en pointillé, texte « Relâchez pour analyser ». |
| Chargement | Squelette de feuille (opacité seule, pas de shimmer en reduced-motion), `aria-busy="true"`, texte « Analyse du logo… » dans un `role="status"`. Annulable. |
| Succès | La feuille se remplit ; le statut annonce « Charte prête pour {brand} » ; le CTA « Continuer dans le studio » prend le focus uniquement si l'utilisateur l'a déclenché. |
| Erreur | Message quoi / pourquoi / comment sous le champ, `role="alert"`, couleur danger + icône + mot : « Fichier refusé : le SVG contient un script. Exportez-le en SVG simple ou en PNG. » Le choix d'exemple reste utilisable. |
| Hors ligne / lent | Bascule sur les exemples locaux avec la mention « Mode démonstration », sans erreur bloquante (réseau faible du jury). |

Le logo n'est jamais redessiné et se prévisualise sur gris neutre (chroma 0). Changer de marque ne doit pas déplacer la page (hauteur du cadre fixe, pas de CLS). Annonce vocale du changement par `role="status"` poli (déjà présent).

## 6. Cibles tactiles, contraste, focus, mouvement

- Cibles : toute commande ≥ 44x44 px en tactile, jamais < 24x24 (WCAG 2.5.8) ; liens du pied de page à 44 px de haut (aujourd'hui 21 px, à corriger). Espacement ≥ 8 px entre deux cibles.
- Contraste : texte courant ≥ 4,5:1, grand texte et bordures de contrôle ≥ 3:1, dans les deux thèmes. Le texte sur dégradé ou sur image du hero doit être vérifié sur le pire pixel, pas sur la moyenne. Pas de texte de plus petit que 12 px ; mono mesuré à 12 px minimum (le prototype descend à 9 px : refusé).
- Focus : anneau violet 2 px, offset 2 px, visible sur fond clair et sombre, jamais masqué par la capsule sticky (`scroll-padding-top`). Ordre de tabulation = ordre visuel.
- Clavier : radios de l'atelier au clavier (flèches), menu mobile et dialogues avec piège de focus, aucune action au survol seul.
- Mouvement : `prefers-reduced-motion: reduce` remplace tout déplacement, parallaxe, `SplitWords`, `Magnetic`, histoire épinglée et défilement automatique par des états instantanés. Le contenu ne dépend jamais d'une animation pour être lisible. Pas de contenu clignotant plus de 3 fois par seconde. Le défilement automatique des marques doit avoir un bouton pause visible (WCAG 2.2.2).
- Histoire épinglée (`lg:h-[260vh]`) : sous 1024 px, chaque étape a son propre aperçu ; au-dessus, la navigation clavier et la molette ne doivent pas être piégées.

## 7. Thèmes jour, nuit, système

Défaut = système. Le sélecteur à 3 états (système, jour, nuit) garde un `aria-pressed` ou radio labellisé, et mémorise le choix. Le premier rendu ne doit pas clignoter (script bloquant ou cookie lu côté serveur). Mesuré : jour et nuit système fonctionnent aux deux largeurs. Règle : papier chaud et encre chaude dans les deux, jamais #FFF ni #000 ; les feuilles de marque restent sur gris neutre ; le halo coloré du hero tiré de la marque ne doit pas rendre le titre illisible en nuit.

## 8. Responsive

| Largeur | Attendu |
|---|---|
| 360 | Aucun débordement (mesuré : OK). Titre ≤ 5 lignes, H1 sans césure au milieu d'un mot. Atelier en une colonne. |
| 390 | Référence mobile. CTA primaire visible sans scroll. En-tête une rangée. |
| 768 | Atelier en une colonne large ou 2 colonnes si chaque colonne ≥ 340 px. Menu mobile encore actif jusqu'à ce que les liens tiennent sur la capsule (≥ 900 px). |
| 1440 | Colonne centrale ≤ 1240 px, pleine largeur seulement pour les fonds. |

Pas de zoom bloqué (`maximum-scale`), texte lisible à 200 % sans défilement horizontal (reflow 320 CSS px).

## 9. Grille de recette (20 critères, passer/échouer)

Outil : playwright ou CDP, thèmes jour et nuit, FR et EN, sauf mention.

| # | Critère | Seuil de réussite |
|---|---|---|
| 1 | Pas de débordement horizontal | `scrollWidth == clientWidth` à 360, 390, 768, 1440 |
| 2 | Un seul `h1`, titres sans saut de niveau | 1 `h1`, h2 puis h3 |
| 3 | CTA primaire visible sans scroll | Bord bas du bouton ≤ 844 px à 390 et ≤ 900 px à 1440 |
| 4 | Un seul bouton primaire ink par écran visible | Vérification visuelle à 4 scrolls |
| 5 | Tous les CTA primaires mènent à `/start` | 0 lien primaire vers `/inscription` |
| 6 | Parcours complet sans compte | Accueil, `/start`, studio atteints sans formulaire d'inscription |
| 7 | Cibles tactiles | 100 % des liens, boutons et radios ≥ 44x44 à 390 (≥ 24x24 minimum absolu) ; pied de page inclus |
| 8 | En-tête mobile compact | Hauteur ≤ 64 px à 390 ; menu 44x44 ; langue atteignable |
| 9 | Menu mobile accessible | Focus piégé, Échap ferme, focus rendu au bouton |
| 10 | Ordre de tabulation logique | Lien d'évitement, logo, liens, langue, thème, CTA, contenu ; aucun focus caché sous la capsule |
| 11 | Focus visible | Anneau violet ≥ 2 px, ≥ 3:1 contre le fond, sur chaque contrôle, deux thèmes |
| 12 | Contraste du texte | ≥ 4,5:1 (≥ 3:1 grand texte), mesuré sur pixels rendus, jour et nuit, y compris sur le hero |
| 13 | Taille de texte | Aucun texte < 12 px ; valeurs mesurées en mono à 12 px minimum |
| 14 | Thème système respecté | Fond et encre changent avec `prefers-color-scheme` sans rechargement ; pas de flash au chargement |
| 15 | Reduced-motion | Avec `reduce`, 0 animation de transform ou d'opacité en boucle, histoire non épinglée, contenu identique |
| 16 | Défilement automatique contrôlable | Bouton pause présent, ou aucun défilement automatique |
| 17 | États de l'atelier | Vide, survol, chargement, succès, erreur testés ; erreur au format quoi/pourquoi/comment ; `role=status/alert` annoncés |
| 18 | Logo jamais déformé, sur gris neutre | Rapport d'aspect conservé ; fond de prévisualisation chroma 0 |
| 19 | Honnêteté des chiffres | Tout nombre est étiqueté « démonstration » ; aucun client, témoignage ni métrique inventés ; aucune marque tierce nommée |
| 20 | Stabilité et poids | CLS < 0,1 au changement de marque ; LCP < 2,5 s sur throttling 4G ; pas de grand vide non rempli entre sections (voir §0) |

Livraison : le constructeur joint à son rapport les sorties réelles des critères 1, 3, 7, 12, 14, 15 et 20 (mesurées), et marque honnêtement « non mesuré » ceux qu'il n'a pas pu outiller. Une relecture finale `impeccable-finish-reviewer` est recommandée après la recette.
