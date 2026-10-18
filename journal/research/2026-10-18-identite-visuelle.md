# Identité visuelle : ce que contient une vraie charte, et ce que cela implique pour le produit

Note de recherche de l'agent (Claude Code, 2026-10-18), sous mandat du propriétaire (« se documenter profondément
sur les logos, les chartes graphiques et le design »). Elle **ne modifie pas la spécification** : les
recommandations de la section 8 sont des propositions pour le chef de projet (`docs/` lui est réservé).

Sources : chartes publiques réelles (lues en entier quand c'est indiqué), guides de métier, et deux jeux de données
du projet — la bibliothèque de **1 432 logos SVG classés** et les **64 images réelles** déposées par le propriétaire
(dépôt privé `Graph_Charta`, `pnpm corpus:fetch`). À compléter avec les chartes PDF du propriétaire
(`charters/`).

---

## 1. Structure d'une charte graphique

Les chartes professionnelles suivent presque toutes le même ordre : **introduction → logo → couleur → typographie
→ imagerie → applications**. Exemple lu en entier, Aluminum Association (21 pages) :

| Chapitre | Contenu concret |
|---|---|
| Introduction | À qui sert la charte, pourquoi la cohérence |
| Logo | Version couleur ; cas spéciaux noir et blanc / défonce ; zone de protection ; taille minimale ; 9 erreurs courantes ; bonnes applications |
| Couleur | Palette primaire (vert + 2 gris), secondaire (5 teintes), **règles d'usage et proportions** |
| Typographie | Une famille (Calibri) et ses graisses ; approche de titre (−30) ; hiérarchie, corps minimum 10 pt / 13 pt |
| Imagerie | Photographie (température de couleur froide), icônes et infographies |
| Applications | En-têtes de documents, carte de visite, signature e-mail |

La charte de Goldsmiths découpe le chapitre logo de la même façon (couleurs du logo, zone de protection, taille
minimale, placement, usages interdits). Celle de NIGP enchaîne logo, palette, typographie.

**Comparaison avec le produit** (`01_PRODUCT_MVP.md` §4) : couverture, manifeste, logo, zone d'exclusion, Do &
Don't, palette, contrastes, typographie, ton, mockups, tokens. C'est la structure du métier, avec deux apports
propres au produit (matrice de contrastes, tokens). Il manque, par rapport aux chartes réelles :
**les proportions d'usage des couleurs**, **la hiérarchie typographique chiffrée** et l'**imagerie** (hors MVP,
légitimement).

## 2. Le logo

### 2.1 Types de logos
Le vocabulaire du métier est stable : **logotype** (le nom seul), **monogramme / lettermark** (initiales),
**symbole figuratif**, **symbole abstrait**, **emblème** (texte dans un badge), **logo combiné** (symbole + nom),
**mascotte**. Le combiné se décline en **lockups** : horizontal, empilé, intégré.

Répartition mesurée sur les 1 432 logos de la bibliothèque :

| Type | Nombre | Part |
|---|---|---|
| abstrait | 337 | 24 % |
| combiné | 295 | 21 % |
| figuratif | 289 | 20 % |
| lettre stylisée (letterform) | 218 | 15 % |
| logotype | 142 | 10 % |
| emblème | 54 | 4 % |
| mascotte | 54 | 4 % |
| monogramme | 43 | 3 % |

Biais à connaître : la bibliothèque vient surtout du secteur tech (outils de développement 295, frameworks 247,
cloud 97). Les images du propriétaire, elles, couvrent des petites entreprises (restauration, vêtements, droit,
studios, radio) et sont surtout des **logotypes** et des **logos combinés**, ce que la bibliothèque sous-représente.

### 2.2 Ce que contient un logo réel (bibliothèque, mesures du jeu de données)
- **Nombre de couleurs** : médiane 2 ; 25 % n'en ont qu'une ; 10 % en ont 7 ou plus.
- **Dégradés** : 19 % des logos.
- **Techniques** les plus fréquentes : contenant (453), espace négatif (284), trait monoligne (249), dégradé (218),
  segments de couleur (204), ombrage en volume (147), superposition avec transparence (104).
- **Format** : carré 791, horizontal 223, large 187, **très large 133**, haut 98. Un logo sur cinq est large ou
  très large : l'avertissement de favicon allongé (ADR-021) concerne beaucoup de vrais logos.

Conséquences directes pour les moteurs : l'**espace négatif** (284) et le **monoligne** (249) sont exactement les
cas où une variante monochrome naïve échoue (évidements bouchés, traits fins perdus) ; la **superposition avec
transparence** (104, et « be the change » chez le propriétaire) crée des couleurs de mélange que l'extraction voit
comme des couleurs à part entière.

### 2.3 Les versions livrées par un studio
Un dossier de livraison professionnel contient : version principale couleur, **version inversée** (pour fonds
foncés ; parfois deux, tout blanc ou blanc avec symbole en couleur), **version monochrome** noire, version noir et
blanc, et les **codes couleur dans 4 espaces** (Pantone, CMJN, RVB, HEX), plus des consignes d'usage. Les guides
NACM et MFLC distinguent les fichiers d'impression (Pantone, CMJN, vectoriels) des fichiers écran (RVB).

Le produit livre couleur, noir, blanc, favicon (`01_PRODUCT_MVP.md` §4 p. 3) : c'est le cœur du dossier. La
variante « blanc avec symbole en couleur » n'existe pas ; Pantone et CMJN sont prévus (T-010, en attente du profil
FOGRA39).

### 2.4 Zone de protection
La pratique constante est de mesurer la zone **avec un élément du logo lui-même**, pour qu'elle suive l'échelle :
hauteur du logotype (Ofcom), 2 × la hauteur d'x (Idaho), hauteur du « V » (Vizrt), largeur du « m » d'« Aluminum ».
Le produit utilise `X = ratio × H` (hauteur du logo, ratio 0,10–0,50, T-012) : c'est équivalent en pratique et plus
robuste à automatiser (aucune lettre à détecter). À formuler dans la page comme le font les studios : « X = … ».

### 2.5 Taille minimale
Valeurs relevées : 35 mm (Ofcom, impression), 45 mm (GreenPower), 25 mm / 90 px (Vizrt), 1,25 pouce / 140 px
(Aluminum Association). Ordre de grandeur : **25–45 mm en impression, 90–140 px à l'écran** pour un logo complet ;
en dessous, on passe au **symbole seul** (Aluminum autorise le sceau « a » seul pour une épinglette ou une icône).

### 2.6 Petites tailles et logo « responsive »
Le favicon (16 × 16 px) est l'environnement le plus dur : les traits fins et le texte y disparaissent. La pratique
est un **système de versions** : logo complet → sans signature → symbole ou abréviation. Une version simplifiée
dédiée vaut mieux qu'une réduction du logo complet.

### 2.7 Usages interdits (Do & Don't)
Liste canonique (Aluminum Association, NCA) : déformer, poser sur une couleur qui gêne la lecture, poser sur une
image chargée, changer les couleurs, utiliser des éléments séparément, empiéter sur la zone de protection, ajouter
une ombre ou un effet, utiliser une version basse résolution, recadrer, faire pivoter, ajouter de la transparence.

Le produit en illustre 4 (déformation, rotation, couleur hors palette, fond de contraste insuffisant, T-012) :
ce sont les plus fréquents. Les suivants, faciles à générer avec les moteurs existants, seraient **fond chargé**,
**ombre portée** et **éléments séparés**.

## 3. La couleur

### 3.1 Structure d'une palette de marque
Couleur principale (1), secondaires (1–2), **accent**, **neutres** (quasi-noir, gris, blanc cassé), avec des
**teintes et ombres** de chaque couleur pour les états d'interface. La règle 60-30-10 (principale / secondaire /
accent) est la référence la plus citée ; certaines sources réservent les 10 % aux neutres.

### 3.2 La couleur du logo n'est pas la couleur dominante de la charte
Constat le plus important de cette recherche. Aluminum Association : « le vert ne doit pas être surutilisé […]
les gris et les bleus sont la base, le vert sert d'accent distinctif » (p. 13). La couleur la plus présente
**dans le logo** devient souvent une couleur **d'accent** dans les mises en page.

Pour le produit : l'extraction donne la palette **du logo** (§2.4–§2.5) ; la charte a besoin d'un système plus
large (neutres, couleurs dérivées §2.6, échelles §2.8). C'est ce que prévoit la spécification, mais la page
Palette gagnerait à **indiquer l'usage** de chaque couleur (fond, texte, accent) et ses proportions conseillées.

### 3.3 Formats
Chaque couleur est donnée en HEX (web), RVB (écran), CMJN (impression quadri), Pantone (ton direct, objets) ;
les conversions entre ces espaces ne sont pas exactes (Pantone en particulier).

## 4. La typographie

- **Deux familles** en général : une « personnalité » pour les titres, une « de travail » pour le corps.
  **Contraste** de catégorie (sérif + sans-sérif, slab + sans-sérif) ; éviter deux sérifs ou deux géométriques ;
  hauteurs d'x proches.
- La charte fixe **graisses, approche, hiérarchie et tailles minimales** (Aluminum : corps ≥ 10 pt, interligne
  13 pt, titres en gras approche −30).
- **La police du logo n'est presque jamais une police disponible** : dans la bibliothèque, les lettres sont
  dessinées (`display-custom` 103) ou de style identifiable sans nom de police (sans-sérif géométrique 266,
  grotesque 71, humaniste 43, script 25, sérif 17, slab 6, arrondi 6). Les images du propriétaire confirment :
  logos sans nom de police ni signature.

Pour le produit : il n'a pas à **reconnaître** la police du logo (ce serait un modèle spécialisé, hors
spécification) ; il **propose** un couple du catalogue fermé de 8 (`09_DESIGN_SYSTEM.md` §8). Le bon critère de
choix est le **style** des lettres du logo (géométrique, humaniste, sérif, script…) et l'ambiance, ce que le
copilote peut déduire du brief et de l'image.

## 5. Le ton de voix
Le cadre de référence (Nielsen Norman Group, repris par plusieurs sources secondaires) compte **4 dimensions
continues** : drôle ↔ sérieux, formel ↔ décontracté, respectueux ↔ irrévérencieux, enthousiaste ↔ factuel.
Le produit a aussi 4 axes de 0 à 100 (`07_AI_COPILOT.md` §3 : formel ↔ décontracté, sérieux ↔ espiègle,
classique ↔ avant-gardiste, sobre ↔ expressif) : deux axes coïncident, deux sont propres au produit. C'est
cohérent avec la pratique (curseurs, pas d'oppositions binaires).

## 6. Les fichiers que les utilisateurs enverront vraiment

Mesures sur les 64 images du propriétaire (2026-10-18) :
- **Formats** : 35 JPEG sur 36 au premier lot, largeur typique 736 px (Pinterest) ; le PNG transparent est rare
  (il a fallu un détourage remove.bg pour en obtenir).
- **Présentation** plutôt que fichier source : logo posé sur une carte, elle-même dans une marge ; planches de
  marque complètes ; mockups.
- **Fonds** : unis mais bruités par la compression JPEG ; parfois en dégradé (« bounday ») ; souvent **de la
  couleur de la marque** (logo clair sur fond de couleur : nuai, React, täaka, cozy, OnPlug, sublime).

Ce sont précisément les cas où l'extraction actuelle échoue (journal `OWNER_DECISIONS.md`, constats A, B, C).

## 7. Les chartes comme vérité terrain
Une charte d'une page ou un PDF donne ce qu'aucun logo ne donne : **codes officiels**, **polices**, **taille
minimale**, **zone de protection**, **usages interdits**. Plan d'exploitation (PDF du propriétaire, dès dépôt) :
extraction du texte et rendu des pages (PyMuPDF, disponible sur le poste) → fiche par marque (couleurs officielles
avec rôle, polices, règles) → comparaison automatique avec ce que le produit génère à partir du logo seul.

## 8. Propositions pour le produit (au chef de projet)
1. **Fond** : retrait par remplissage **depuis le bord** avec tolérance, pas par couleur globale seule ; tolérance
   relevée pour les JPEG ; ignorer une marge uniforme de présentation (cadre) avant d'analyser. (A)
2. **Couleur du fond** : quand le fond retiré est une couleur vive, la proposer comme couleur de marque. (B)
3. **Réduction de palette** : centre recalculé après fusion. (C)
4. **Page Palette** : rôle d'usage et proportions conseillées (60-30-10) pour chaque couleur.
5. **Page Logo** : seuil sous lequel le symbole seul remplace le logo complet ; mention de taille minimale en mm
   et en px.
6. **Do & Don't** : banque de règles plus large (fond chargé, ombre, éléments séparés) parmi lesquelles 4 sont
   choisies selon le logo.
7. **Typographie** : choix du couple selon le style des lettres du logo ; hiérarchie chiffrée (tailles, graisses,
   interlignes) sur la page 8.

État au 2026-10-19 : les propositions 1 à 3 sont mises en œuvre et mesurées (décisions A à D, halo JPEG, liseré de
présentation : `journal/OWNER_DECISIONS.md`).

## 9. Confrontation aux 8 chartes PDF du propriétaire (2026-10-19)
Fiches de vérité terrain dans le dépôt privé (`charters/<marque>/truth.json`). Ce qu'elles contiennent, comparé à
ce que `docs/01_PRODUCT_MVP.md` prévoit pour les pages de charte (T-022) et les exports (T-028, T-029) :

| Élément de charte | Chartes qui l'ont | MVP aujourd'hui | Proposition |
|---|---|---|---|
| Codes HEX / RVB / CMJN / Pantone | 7 / 8 / 6 / 6 | HEX, RVB, HSL, OKLCH, CMJN indicatif | Montrer HEX, RVB, CMJN en premier ; HSL et OKLCH en détail technique (aucune charte ne les montre) |
| Codes incohérents (HEX ≠ RVB) | 3 chartes, 8 codes | — | Argument produit : une seule source, codes toujours cohérents ; test d'invariant à l'export |
| Déclinaisons logo / fond autorisées | 4 | noir, blanc | Matrice « logo sur fond » calculée : chaque variante (couleur, noir, blanc) sur chaque couleur de la palette, autorisée si contraste ≥ 3 ; les combinaisons interdites montrées barrées |
| Taille minimale | 8 (mm et px : 4) | valeurs par défaut, unité non dite | Toujours en mm (impression) **et** en px (écran) |
| Zone de protection | 8 | 25 % de la hauteur | Inchangé (les chartes la rapportent à un élément du logo : non automatisable) |
| Interdits illustrés | 7 (médiane 10) | 4 règles | Banque de règles générées depuis le SVG : déformation, rotation, recoloration, fond nuisible, **ombre portée, opacité réduite, contour, éléments déplacés** ; 8 affichées |
| Police de substitution (Office, Docs) | 5 | — | Chaque police du catalogue fermé porte une police système de repli, affichée sur la page Typographie |
| Couleurs autorisées pour le texte selon le fond | 3 | matrice de contraste | Tirer de la matrice une ligne « texte sur ce fond : … » par couleur |
| Proportions d'usage des couleurs | 2 | — | Proportions conseillées (60-30-10) déduites des rôles (§8, proposition 4) |
| Teintes dérivées (60 / 40 / 20 %, 50 / 25 / 10 %) | 2 | échelles `buildScale` | Déjà couvert |

Critères d'acceptation proposés (testables) :
- **Logo sur fond** : pour une palette de n couleurs, la page montre 3 × (n + 2) vignettes (variantes × fonds,
  blanc et noir compris) ; une vignette est « autorisée » si et seulement si le contraste entre la couleur
  principale de la variante et le fond est ≥ 3 (même calcul que §5.6 « fond inadapté »).
- **Taille minimale** : deux valeurs affichées, `mm` et `px`, modifiables ; défaut 15 mm et 24 px de hauteur pour
  un logo complet, 5 mm et 16 px pour le symbole seul (ordres de grandeur relevés dans les chartes).
- **Interdits** : chaque règle est un SVG généré à partir du logo réel, repassé par `sanitizeSvg` ; au moins 8.
- **Substitution** : `09_DESIGN_SYSTEM.md` §8, une colonne `fallback` (police système) par entrée du catalogue.

## 10. Référentiel de livraison d'agence (fourni par le propriétaire, 2026-10-19)
Kit méthodologique privé du propriétaire (5 fichiers, non versionné ici) : processus d'une agence qui dessine des
logos, de la qualification du brief au contrat. Sans données ni sources ; il confirme des choix existants (CMJN
indicatif « à valider avec l'imprimeur », pas de Pantone inventé, PDF de référence RVB, seuils WCAG, monochromes
vérifiés sans ombre ni contour ajoutés) et apporte surtout la **livraison professionnelle**. Hors champ : brief
créatif, pistes, contrat, dépôt de marque (le produit part d'un logo existant).

Propositions (au chef de projet) :
1. **Archive livrée (T-029, AC-12.3)** — arborescence fixe, dossiers vides retirés :
   `00_LIRE_AVANT_UTILISATION/` (`README.txt`, `INVENTAIRE.md`), `01_LOGO/` (`vectoriel/`, `png-transparent/`,
   `monochrome/`, `favicon/`), `02_CHARTE/charte-graphique.pdf`, `03_COULEURS_ET_TYPOGRAPHIES/`
   (`design-tokens.json`, `tokens.css`, `palette.csv`, `contrast-matrix.csv`, `polices-et-licences.txt`),
   `04_MOCKUPS/` (marqués « simulation »).
2. **Nommage** : `<projet>_logo-<variante>_<couleur>_fond-<fond>.<ext>` (ex. `acme_logo-principal_noir_fond-
   transparent.svg`, `acme_symbole_couleur_512px.png`), `<projet>` en slug ASCII ; test : tout nom de l'archive
   respecte le motif.
3. **README généré** : projet, version, date, contenu, rôle de chaque format (SVG, PDF, PNG, JPG), quatre règles
   d'usage, limites réelles (CMJN indicatif, variantes « à vérifier » si fidélité < 0,97).
4. **Contrôle qualité automatique de l'export (bloquant)** : l'archive se rouvre ; chaque PNG a ses dimensions
   annoncées, un canal alpha réel et aucun pixel opaque blanc résiduel sur son pourtour ; chaque variante citée
   dans la charte existe dans l'archive et inversement ; les codes couleur sont identiques dans le PDF, le JSON, le
   CSS et le CSV (même source). Un échec bloque la livraison et nomme la cause (AC-06.4, AC-12.5).
5. **Plan de charte (T-022, T-028)** : page de garde (marque, version, date) ; page concept (univers du brief) ;
   page finale « inventaire des fichiers ». Pour chaque couleur : usages autorisés et associations à éviter, tirés
   de la matrice de contraste (§9).
6. **Typographie (`09_DESIGN_SYSTEM.md` §8)** : pour chaque police du catalogue, repli système, licence, lien
   officiel, interlignages (corps 1,5, titres 1,15 par défaut) ; export `tokens.css` à côté de
   `design-tokens.json`.
7. **Taille minimale par usage** : impression (mm), écran (px), favicon (16–32 px), symbole seul (§9).
8. **Interdits** : banque portée à 12 (ajouts : variante inadaptée au fond, empiètement sur la zone de
   protection, fichier pixellisé, recomposition), dont au moins 8 illustrés (§9).
9. **Mention juridique** dans le produit : la charte ne vaut ni recherche d'antériorité ni dépôt de marque.

## Sources
- Aluminum Association, *Brand Guide* v1.0, 2017 — lu en entier :
  <https://www.aluminum.org/sites/default/files/2021-10/Aluminum_Assoc_BrandGuide_V3.pdf>
- National Children's Alliance, *Brand Guidelines* :
  <https://www.nationalchildrensalliance.org/wp-content/uploads/2021/04/NCA_BrandGuidelines.pdf>
- Ofcom, *Brand guidelines* :
  <https://www.ofcom.org.uk/siteassets/resources/documents/about-ofcom/foi/2025/february/ofcom-brand-guidelines.-document-1.pdf>
- NIGP, *Brand Guidelines* : <https://www.nigp.org/misc-documents/NIGP_BrandGuidelines.pdf>
- Idaho SDE, *Logo Guidelines* : <https://Sde.idaho.gov/communications/files/resource-center/Logo-Guidelines.pdf>
- GreenPower, *Brand Usage Guidelines* :
  <https://www.greenpower.gov.au/sites/default/files/2020-12/GreenPower-Brand-Usage-Guidelines-August-2020.pdf>
- Vizrt, *Brand Style Guide 2025* (cité par extrait) : <https://www.vizrt.com/>
- NACM, *Style guide* : <https://nacmnet.org/resources/style-guide/> ; MFLC, *Logo Style Guide* :
  <https://download.militaryonesource.mil/12038/Style%20Guide/MFLC-LogoStyleGuide.pdf>
- Types de logos : <https://manypixels.co/blog/post/types-of-logos>, <https://agencypartner.com/the-7-types-of-logos/>,
  <https://www.designrush.com/best-designs/logo/trends/types-of-logos>
- Couleur : <https://www.shopify.com/blog/choose-brand-colors>,
  <https://www.monkeyvision.nl/en/knowledge-base/color-palette/>,
  <https://mapp.4over4.com/guide/how-to-choose-your-brand-color-palette>
- Typographie : <https://inkbotdesign.com/font-pairing/>, <https://www.digitalsilk.com/graphic-design/design-trends/best-font-pairs-combinations/>
- Petites tailles : <https://viget.com/articles/responsive-logos-part-1-tips-for-adapting-logos-for-small-screens>,
  <https://clay.global/blog/responsive-logo-design>, <https://inkbotdesign.com/logo-testing>
- Ton : <https://uxmag.com/articles/tone-of-voice-and-user-experience>
- Retrait de fond par remplissage avec tolérance :
  <https://graphicsmill.com/docs/gm5/T_Aurigma_GraphicsMill_Transforms_FloodFill.htm>
- Jeux de données : bibliothèque logo-design-skill (commit `0ecf52e`, `stats.json`, `classifications.json`) ;
  dépôt privé `lawrenceHD/Graph_Charta`.
