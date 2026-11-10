# PAGE-ARCHETYPES — ce que font les vraies chartes, et nos specs par type de page

> Étude du 2026-11-09 (R4). Sources regardées une par une, rastérisées : 14 PDF de `corpus-reel/chartes/` (Instacart 2022, Slack, BlaBlaCar 2023, UNV, TB Speed, Institut Agro, CAPEFE, État, Porto, Nevers, CFDT, Data Terra, Bâtir, ANFA) et 40 planches de `corpus-reel/pinterest/` (brand-boards, guideline-spreads, mockup-scenes, packaging, logo-presentations ; Café Verde, Ember & Bean, Terra Brew, Agronomo, Norem, Genla, Afrori, Aegro, Valentina, Adelaide University, Terra Livre, Pasu Farm…). Aucune image copiée dans le dépôt. Mesures : extraction des polices et boîtes de texte de Instacart (1920×1080), Slack (792×612 pt), BlaBlaCar (1920×1080).

## 0. Ce qui sépare une charte de maître d'une page « CSS de débutant »

| Constat sur les bonnes chartes | Notre défaut actuel | Règle |
|---|---|---|
| Une seule idée par page, un gros objet (logo, aplat, mot) qui occupe 50 à 100 % de la page. | Cadre identique partout (filet, titre, colonne de lead 3/12, contenu 9/12) : effet gabarit. | Chaque archétype possède sa composition ; le cadre standard ne sert qu'aux pages « données ». |
| Les pages de respiration (divider) : aplat plein de la couleur de marque, un mot à 12 % de la hauteur, rien d'autre (Instacart « Color », « Typography » ; BlaBlaCar « Colour » en texte répété découpé). | Aucune page-section. | Variante « séparateur » pour le type, choisie par le rang de la page. |
| Échelle typographique très contrastée : titre de section 8 à 20 % de la hauteur de page, sous-titre 2,2 %, légende 1,1 %. | Tout entre 0,7 et 1,2 u. | Échelle modulaire de rapport 1,5 à 2,5 entre niveaux (§1). |
| Les couleurs sont des surfaces, pas des pastilles : demi-pages, bandes, grands disques qui se chevauchent (Instacart p23 : disque vert/orange/crème sur fond coupé en deux). | Cartes juxtaposées de même taille. | Aplats pleine hauteur de proportions inégales, ordre et surface = poids d'usage 60/30/10. |
| Les mockups sont des scènes pleine page ou une mosaïque sans marge entre les cellules (Café Verde, Norem, Agronomo). | Image encadrée dans une page de texte. | Mockup pleine page ou mosaïque à ras (aplats, sans coins ni cadres). |
| Détails d'imprimeur : étiquette de section en haut à gauche en 12 px sur 1080, folio en haut à droite, repères de coupe (TB Speed), numéros « 01 02 » sur les blocs (UNV). | Folio en pied seul. | Micro-typographie constante (§1). |

## 1. Système commun (mesures relevées)

**Format.** A4 paysage 297×210 (rapport 1,414). Les chartes modernes sont en 16:9 (Instacart, BlaBlaCar) ou 11×8,5 (Slack) : nous restons en A4, tous les chiffres ci-dessous sont donnés en pourcentage de la largeur L (unité `u` = L/100) ou de la hauteur H.

**Marges** (relevé) : Instacart 100 px sur 1920 = 5,2 % L à gauche, étiquette en haut à 4,3 % H ; BlaBlaCar 2,2 % L et 3,9 % H ; Slack 4,4 % L, haut 5,1 % H, pied 94,6 % H. Retenu : marge latérale 5 u, haut 4 u, bas 3,2 u ; sur les pages en aplat, 6 u à gauche.

**Grille.** 12 colonnes, gouttière 1,4 u, colonne = (100 − 2×5 − 11×1,4)/12 ≈ 6,2 u. Toute page se compose en fractions de colonnes : 12 (pleine), 8+4, 7+5, 6+6, 5+7, 4+4+4, 3×4. Les asymétries 7+5 et 8+4 sont les compositions de base (texte à gauche en 3 à 4 colonnes, objet qui déborde à droite) ; l'objet peut déborder (bleed) du cadre, jamais le texte.

**Échelle typographique** (hauteur d'em, en u ; polices : titres en police de la marque sinon Bricolage / Fraunces selon l'appariement, textes Geist ; aucune police mono) :

| Niveau | Valeur | Usage | Preuve |
|---|---|---|---|
| Marque-mot | 12 à 20 | séparateurs (un mot) | Instacart 220 px sur 1080 = 20 % H ; 130 px = 12 % H |
| Titre de page | 5,2 | titre du type, 1 à 3 lignes, interlignage 0,95, tracking −0,03 em | Instacart 96 px (8,9 % H) |
| Sous-titre | 2,2 | phrase d'accroche, interlignage 1,15, tracking −0,01 em | Instacart 24 px ; Slack 18 pt |
| Corps | 1,05 | paragraphes, interlignage 1,5, mesure 34 à 44 caractères | Slack 7 pt sur 792 = 0,9 u |
| Légende | 0,78 | capitales, tracking +0,14 em, chiffres tabulaires | Instacart 12-13 px ; Slack 7 pt |
| Folio | 0,72 | idem légende, opacité 55 % | |

Rapports : titre/corps 5 ; sous-titre/corps 2,1 ; corps/légende 1,35. Un seul poids lourd par page (le titre) ; la légende est la seule à être en capitales.

**Cadre de page standard** : filet 1 px à 4 u du haut, étiquette de section à gauche et nom de marque à droite sur le filet ; folio « 07 / 16 » en pied à droite, nom de la guideline à gauche ; la preuve (`evidence`) en pied au centre, 0,72 u, jamais plus d'une ligne. Les pages en aplat plein reprennent la même micro-ligne en haut, en teinte du fond.

**Couleur.** Papier blanc ou aplat de couleur de marque. Aplats juxtaposés sans coins arrondis ni cadres ; ratio de contraste ≥ 4,5 pour le texte, 3 pour les grands titres. Une seule couleur d'accent par page, jamais de dégradé.

**Logo.** Posé sur l'aplat sans plaque. Trois traitements : grand (60 à 90 % de la hauteur de la page), recadré (le logo coupé par le bord, 150 à 250 % de la page, Instacart « shop + savor », BlaBlaCar texte répété), inversé (version blanche sur la couleur de marque, noir sur couleur claire).

**Motifs vectoriels dérivés du logo** : le logo (ou son bloc de couleur) sert de motif : répétition en grille (5×3), alternance rotation 0/180°, bandes horizontales coupées, mosaïque de cellules aplat/logo (Afrori, Terra Livre, Norem). Procédural, déterministe (pas de hasard : graine = nom de marque).

## 2. Archétypes par type de page (au moins 2 variantes ; choix selon secteur, ton, rang)

Pour chacun : composition en colonnes sur 12, éléments chiffrés, références.

### Couverture
- **A. Aplat de marque + logo géant** : fond primaire pleine page ; logo 60 % H aligné à gauche à 6 u, en bas ; filet + « Brand Guidelines v1.0 — 2026 » en haut (12 px/1080). Réf. Instacart p1, BlaBlaCar p1 (logo en bas à gauche, mots d'accueil en 5 langues répétés à droite, 8 u de titre).
- **B. Découpe asymétrique** : 7 colonnes de primaire à gauche avec titre 9 u sur trois lignes, 5 colonnes de neutre clair à droite avec logo recadré à 150 % ; trait d'accent vertical. Réf. Slack p1 (fond crème + gros titre noir 34 pt en bas à gauche), Valentina (Brand Guidelines en carte).
- Choix : ton sérieux/institutionnel → B ; ton chaleureux/ludique → A.

### Manifeste / marque
- **A. Citation de page** : 8 colonnes, mission à 4,4 u interlignage 1,12, finesse (poids léger) ; 4 colonnes de valeurs en liste numérotée « 01 02 03 » ; sur papier. Réf. Slack p6 (Larsseit Thin 18 pt, grand texte maigre à gauche, colonne de gras 7 pt à droite).
- **B. Aplat inversé** : fond neutre sombre ou primaire, mission à 6 u coupée en 3 lignes, valeurs en bas en 4 colonnes séparées de filets. Réf. Instacart p2 « This document is a quick start guide… ».

### Logo (versions)
- **A. Héros** : logo couleur à 55 % H centré à gauche sur 7 colonnes, 5 colonnes de texte (nom, rôle, légende x). Réf. Instacart p10.
- **B. Colourways en bandes** : 3 à 4 bandes verticales pleine hauteur (fond clair, primaire, sombre, accent), le logo adapté posé sans plaque au centre de chaque bande, étiquette « Version principale / négative / noire » en pied. Réf. Instacart p13 (deux aplats superposés), Slack p22 (trois bandes), BlaBlaCar p9 (6 cellules à ras).
- **C. Symbole seul** : logo recadré en grand sur un demi-aplat. Réf. Instacart p9 (symbole + cotes).

### Zone de protection
- **A. Schéma technique** : logo à 40 % L au centre, cadre en trait fin 1 px, x porté par la lettre fantôme à 25 % d'opacité sur les 4 côtés, cotes avec petites flèches ; texte en colonne de gauche 3/12. Réf. Instacart p15, Slack p19 (grille de construction), BlaBlaCar p10.
- **B. Taille minimale** : trois échelles du logo alignées sur une ligne de base, chacune légendée « 24 mm / 90 px » ; fond de demi-page gris très clair. Réf. UNV p22-23, Slack p20.

### Couleurs
- **A. Grands aplats proportionnels** : toute la page est couleur, les rectangles pleine hauteur de largeurs 50/25/15/10 % ; sur chaque aplat nom en 3,4 u, valeurs HEX/RVB/CMJN en 0,78 u capitales tabulaires, en bas à gauche, ink adaptée. Réf. BlaBlaCar p17 (blocs pleine page 40/30/20/10), Instacart p24 (disque sur coupe verte/crème).
- **B. Disques superposés** : 3 grands disques (diamètre 62 % H) qui se chevauchent sur fond coupé en deux (demi-page sombre, demi-page crème), valeurs sous le disque. Réf. Instacart p23, p26.
- **C. Palette étendue** : grille 5×2 de cartes aplat sans espace, chaque carte avec code. Réf. Instacart p28 (Extended palette), Slack p26 (couleurs secondaires, 36 cellules).
- Ordre des pages : principale, accent, neutres, puis étendue ; chaque page porte au moins un grand aplat plein.

### Typographie
- **A. Spécimen titre** : le mot « Aa » ou le nom de la marque à 22 u, police des titres, à gauche sur 7 colonnes ; 5 colonnes : nom de la police, graisses en liste, glyphes de l'alphabet à 1,05 u. Réf. Instacart p33, p37 (« Efficiently » 4 graisses empilées), Slack p29.
- **B. Hiérarchie** : exemple composé titre/sous-titre/corps avec les valeurs en marge (taille, interlignage, tracking, rapport). Réf. Slack p31 (type specimen: ideal stack).
- **C. Pangramme** : phrase du manifeste à 6 u sur fond de couleur de marque. Réf. BlaBlaCar p20 (Typography en spirale), Instacart p34.

### Usage correct / incorrect (do / don't)
- **A. Grille de vignettes** : 4×2 vignettes de même taille sans espace entre elles (aplat blanc ou neutre), logo réellement transformé, barre diagonale rouge, légende impératif en 0,78 u. Réf. Slack p24, Instacart p17 (4×3 avec ✗), BlaBlaCar p12 (12 cas).
- **B. Fonds** : 3 à 6 bandes de couleurs différentes à ras avec le logo adapté, un cas barré. Réf. Slack p22-23, BlaBlaCar p9.
- Séparer logo / couleur / typographie en pages distinctes (par usage).

### Contraste / accessibilité
- Matrice de couples texte/fond en cellules aplat pleines avec « Aa » et ratio ; cellules échouant en gris avec croix. Réf. BlaBlaCar p18 (combinaisons 4×4 avec grises), Slack p27.

### Applications / mockups
- **A. Scène pleine page** : un mockup du moteur à 100 % de la page, légende en 0,78 u en bas à gauche. Réf. Café Verde, Origine Kitchen, Luzaro (mockup scene).
- **B. Mosaïque** : 4 à 6 cellules de largeurs 2/3 + 1/3 puis 1/3 ×3, aplat de couleur de marque entre les mockups, sans coins arrondis, sans marge. Réf. Norem, Agronomo, Pasu Farm, Terra Livre.

### Iconographie, motifs, photographie (non présents dans le plan actuel)
- Motifs : répétition procédurale du logo en grille, bandes, rotation ; page demi-aplat ; référence Afrori, Aegro, Freshbite. Iconographie : grille 4×2 de pictogrammes en trait fin, cellule carrée de 12 u ; réf. Terra Brew. Photographie : 3 images à ras (1 grande + 2 petites) ; seulement si une image est fournie par l'utilisateur ; aucune photo inventée.

### Contact / fin
- Aplat primaire, logo inversé à 30 % H en haut à gauche, coordonnées en 1,05 u en bas, rien d'autre. Réf. TB Speed p10, Instacart dernière page.

## 3. Choix de variante selon le brief (déterministe)

`composition = f(rang de la page, ton, secteur)` : le rang départage deux pages du même type (jamais deux fois la même composition) ; le ton choisit la famille : chaleureux/ludique → aplats disque/rotations, institutionnel/sérieux → bandes et grille rigoureuse, luxe/éditorial → grandes pages blanches avec très grand titre léger. Fonction pure `compositionOf(type, occurrence, tone)` testée.
