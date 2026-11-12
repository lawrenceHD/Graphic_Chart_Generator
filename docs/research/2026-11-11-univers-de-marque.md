# Univers de marque : les applications construites (conception du 2026-11-11)

> Document de conception. Aucun code n'est produit ici. Il complète trois recherches du même jour :
> `2026-11-11-contenu-des-chartes.md` (contenu), `2026-11-11-inspirations-mockups.md` (sources et droits) et
> `2026-11-11-mockups-objets-courbes.md` (moteur). La Mèza n'est qu'un exemple de marque de restauration ; tout ce qui
> suit se calcule pour n'importe quelle marque à partir de son document.
>
> **Décisions du propriétaire intégrées (2026-11-12)**
> 1. Aucune image Pinterest n'est reprise, modifiée ou passée à une IA. Pinterest et Are.na servent **seulement
>    d'inspiration de composition** : un humain les regarde, Charta n'en garde que des règles de mise en page.
> 2. Le propriétaire crée des clés **Pexels** et **Unsplash**. Ce sont des photos libres : modification et usage
>    commercial permis, crédit au photographe.
> 3. La génération d'images Gemini reste désactivée (pas de facturation). Elle est prévue comme option future.
> 4. L'ordre de priorité est le suivant : l'affiche « un plat et le logo » pour la restauration, puis les cartes de
>    visite recto-verso, puis le badge.

---

## 0. Le parti pris

Aujourd'hui, Charta **pose le logo** sur des objets photographiés. Une charte professionnelle, elle, **compose**.
L'affiche porte une photo, une accroche dans la police de la marque, le motif et le logo à sa place. La carte de
visite a un verso. Le menu a une hiérarchie. C'est ce qui fait croire à une marque qui vit.

La direction retenue s'appelle **« la marque au travail »**. Chaque application est un **gabarit génératif** :
- une grille modulaire ;
- des zones nommées ;
- trois ou quatre compositions possibles, choisies selon le ton et l'archétype ;
- des contraintes de lisibilité vérifiées par le calcul.

Le gabarit ne consomme que des données du document. Il est rendu **deux fois** : à plat, coté, dans une page A4
paysage de la charte (la règle), puis posé sur une scène photographiée (la preuve). C'est la double page que
montrent les chartes du corpus : la spécification, puis l'objet en situation.

### 0.1 Ce qu'on a regardé

Ces planches viennent du corpus local. Elles sont lues pour leur composition seulement, et aucune image n'est reprise.

| Référence (corpus-reel/) | Ce qu'elle apprend |
|---|---|
| `Logo Warunk Mie Sohib.jpg` (restauration) | La photo du plat est **virée en duotone** dans la couleur primaire. Elle est coupée à fond perdu, en coin. Le motif (vagues tirées du logo) traverse la photo. Le logo blanc est posé sur la partie calme. La carte de visite reprend le motif au recto, et l'étiquette du bol est un bandeau. C'est le modèle de l'affiche « plat + logo ». |
| `Proyecto de Identidad Visual COFFEE´S WORLDS.jpg` (café) | Le symbole est agrandi et recadré jusqu'à devenir un motif : t-shirt, mug. Trois fonds de marque portent chacun la version de logo qui convient. |
| `So Matcha Brandboard - Naris Queth.jpg` (café) | Le personnage du logo est réutilisé en très grand sur le tote. L'enseigne drapeau reprend le logotype complet, et le tablier porte un logotype centré à hauteur de poitrine. |
| `NOVA Clothing Brand Identity.jpg` (mode) | Les publications sociales sont un **système** : accroche en capitales grasses en haut à gauche, logo en bas à gauche, photo ou aplat. On y voit l'étiquette suspendue, l'enseigne ronde avec le symbole seul et la boîte d'envoi. |
| `Red Branding … Feminine Luxury.jpg` (culture) | Affiche abribus : photo traitée en monochrome de la primaire, titre en grande composition calée à gauche, date en cartouche. La version « strict » de l'affiche en vient. |
| `Agro Branding project.jpg` (agro) | Le symbole recadré en filigrane sur les cartes et l'étiquette. Le casque et l'uniforme portent le logo à petite taille, à hauteur de poitrine. |

Canaux Are.na pour la composition (API publique `search/channels`, appelée le 2026-11-11 avec l'en-tête
`User-Agent: Charta/0.1`). On ne fait que les consulter, sans rien télécharger ni analyser :

- **Restauration**
  - https://www.are.na/victoria-costa/restaurant-identity (262 blocs)
  - https://www.are.na/this-is-pp/identity-cafe-restaurant
  - https://www.are.na/shannon-mclean/precedents-restaurants-and-hotels
- **Affiche alimentaire**
  - https://www.are.na/tess-rouault/food-poster-oczlsypk_l4
  - https://www.are.na/mona-monahan/food-beverage-posters
- **Menu**
  - https://www.are.na/dione/menu-design-alxxegl_pd8
  - https://www.are.na/haley-penn-avqghczj_vm/menu-design-ideas-p9ftrn9uhzu
- **Emballage et étiquette**
  - https://www.are.na/crosbie-francis/package-label-identity (293 blocs)
  - https://www.are.na/raf-a/packaging-label-design-references
- **Cartes de visite**
  - https://www.are.na/isabelle-cordero/the-business-card-1e01fuavd1o (231 blocs)
  - https://www.are.na/danik-katsl/business-card-wakzemsiokc
- **Vitrine et enseigne**
  - https://www.are.na/michael-mason/storefront-signage-k2wwdff0hxa
  - https://www.are.na/corinne-ang/let-s-get-physical-hjcw9mgsaxw
- **Cosmétique**
  - https://www.are.na/hong-kyu-park/cosmetic_packaging
- **Uniforme**
  - https://www.are.na/patrick-connell/team-uniform-design

Les requêtes « lanyard badge » et « instagram grid brand » ne renvoient aucun canal utile. Pour ces deux supports, la
référence reste le corpus (NOVA) et les chartes institutionnelles (ETA : avatar, post).

Sources humaines pour les systèmes complets :
- https://www.underconsideration.com/brandnew/archives/new_logo_and_identity_for_burger_king_by_jones_knowles_ritchie.php
- https://underconsideration.com/brandnew/archives/industry/food/

### 0.2 Les données disponibles (et celles qui manquent)

Ce que le document fournit (`packages/document/src/schema.ts`, `apps/web/src/studio/workspace/brand-view.ts`) :

| Donnée | Source | Usage dans les gabarits |
|---|---|---|
| `brand.name` | document | logotype de repli, mentions, crédit |
| `mission`, `vision` | document (rédigés par l'IA ou l'utilisateur, `written`) | texte long : verso de carte, menu (chapô), étiquette |
| `values[4]` (`label`, `description`) | document | mots-clés de campagne (série d'affiches, une valeur par affiche) |
| `tone.axes[4]`, `tone.examples[3]` | document | choix de composition (`moodOf`), accroches **marquées « exemple de ton »** |
| `archetype` (12) | document | traitement photo, géométrie de la composition |
| `colors` primary, accent, neutralLight, neutralDark, extra ≤ 4 ; `share` mesurée | document | fonds, duotone, encre, motif |
| `pairing` (display, text) | document → `PAIRINGS` | accroche (display), mentions (text) |
| variantes du logo (`color`, `vector`, `mono-black`, `mono-white`, `favicon`, `horizontal`, `vertical` si fournies) | assets | version selon le fond (`logoFor`, seuil 2,2:1 existant) |
| `rules` : `clearSpaceRatio`, minimums par version (`versions.full`, `versions.symbol`, en px et en mm) | document | zone de protection et taille minimale **dans chaque gabarit** |
| motif : `motifCells` (`repeat`, `turn`, `checker`, `scatter`), tiré du symbole (`MotifGrid`) | calculé | zone motif |
| `sector` (`project.industryLabel` → `REFERENCE_SECTORS`), `brief` | projet | mots-clés photo, choix des applications |

Le document ne fournit **pas** :
- de slogan ;
- d'adresse, de téléphone, de site, de réseaux sociaux ;
- de nom de plat ni de prix ;
- de nom de personne.

Pour ces trous, la règle est fixe. Chaque champ absent est rempli par un **gabarit de champ** neutre, visiblement
générique : « Prénom Nom », « Fonction », « +00 0 00 00 00 00 », « nom@domaine », « Nom du plat », « 00 ». Une
légende accompagne chaque application : « Exemple de composition. Les coordonnées et l'accroche sont des
exemples. » Charta n'invente jamais une adresse plausible ni un plat plausible. Le ticket U-02 ajoute au document
deux champs **facultatifs**, saisis par l'utilisateur : `brand.tagline` et `brand.contact` (adresse, téléphone,
e-mail, site, réseau). Dès qu'ils existent, ils remplacent les exemples et la légende disparaît.

**Origine de l'accroche**, du plus sûr au moins sûr. Le niveau utilisé est écrit dans la colonne de spécifications de
la page.
1. `brand.tagline` saisi par l'utilisateur.
2. `tone.examples[i]`, avec la légende « accroche : exemple tiré du ton de voix (page Ton) ».
3. Un `values[i].label` seul, en très grand (une valeur par affiche de la série).
4. `brand.name`.

---

## 1. Les applications construites, par secteur

Pour chaque secteur, le tableau donne les applications qu'une charte professionnelle montre et ce qui les rend
vivantes. Les applications en gras sont produites en premier.

| Secteur | Applications | Ce qui les rend vivantes |
|---|---|---|
| **Restauration** | **affiche campagne (plat)**, **cartes recto-verso**, **badge du personnel**, menu, étiquette de vente à emporter, sac kraft, Instagram carré et story, vitrine et enseigne drapeau, tablier | le plat en photo, cadré serré et vu d'en haut, viré dans la palette ; le motif qui déborde de la photo ; l'accroche dans la display ; le logo blanc sur la zone calme ; le menu qui reprend la grille de l'affiche |
| **Café, boulangerie** | affiche produit (tasse, viennoiserie), carte de fidélité au verso de la carte de visite, étiquette de sachet, gobelet (scène courbe, C-05), Instagram, enseigne drapeau, tablier | gros plan de matière (mousse, croûte) ; symbole agrandi et recadré jusqu'au motif (COFFEE'S WORLD) ; tampon ou étiquette ronde |
| **Mode** | affiche campagne (silhouette), étiquette suspendue, étiquette tissée, sac boutique, boîte d'envoi, Instagram (série), enseigne ronde | photo de personne en pied, grande accroche en capitales sur la photo (NOVA) ; symbole seul sur les petits supports ; sac en aplat de la primaire |
| **Tech, application** | affiche ou bannière (sans photo, ou avec écran), cartes recto-verso, **badge d'événement et lanyard**, Instagram, écran de téléphone (`phone-table`), t-shirt | composition graphique pure : motif en trame, chiffre ou mot géant, interface simplifiée ; badge avec rôle en aplat de couleur |
| **Institution, association** | affiche d'information (zone émetteur fixe, ETA), cartes, badge nominatif, kakémono, signalétique d'accueil, publications | grille stricte, bloc-marque toujours en ouverture, photo documentaire non retouchée, légende et crédit normés (UNV) |
| **Cosmétique** | affiche produit (flacon), étiquette de flacon et de pot, boîte, sac boutique, Instagram (grille éditoriale), carte de visite | nature morte claire, beaucoup de blanc, ton sur ton ; texte fin, très espacé ; logo petit et centré ; étiquette qui reprend une teinte claire de la primaire |

Ce que les six secteurs partagent, et que les gabarits imposent :
1. **Une seule idée par support.** Une photo **ou** un motif fort, jamais les deux à pleine intensité. Le motif peut
   toucher la photo par un bord.
2. **Le logo à la bonne échelle.** Il n'est jamais centré en géant, sauf sur un support d'identité (enseigne, recto de
   carte). Sur une affiche, il occupe de 18 à 25 % de la largeur.
3. **Trois couleurs de la marque au plus par support** (BBC p16, dans la recherche sur le contenu).
4. **La même grille d'un support à l'autre.** Le menu, l'affiche et la publication partagent le module et la marge.
   C'est ce qui fait « système ».

---

## 2. Les gabarits génératifs

### 2.0 Règles communes à tous les gabarits

**Unité et grille.**
- Le module vaut `m = largeur du support / 12`.
- La marge extérieure vaut `1 m`, et `0,75 m` pour les formats de moins de 60 mm de côté (carte, badge).
- La gouttière vaut `m / 4`.
- Sur un support imprimé, le fond perdu est de 3 mm et la zone de sécurité de 3 mm à l'intérieur du format. Le texte
  et le logo restent dans la zone de sécurité.
- La rangée de base est `m / 2` : le haut des blocs de texte et du logo s'aligne sur une rangée.

**Échelle typographique des gabarits**, en multiples de `m` pour que les gabarits restent proportionnels :

| Rôle | Corps | Police | Interlignage | Approche | Casse |
|---|---|---|---|---|---|
| Accroche | 1,6 m (affiche) à 0,9 m (publication) | display | 0,95 | −0,02 em | casse de phrase ; capitales seulement si `bold-display` ou si l'archétype est `hero` ou `outlaw` |
| Sous-titre | 0,45 m | display | 1,1 | 0 | casse de phrase |
| Texte | 0,26 m, plancher 7 pt à l'impression | text | 1,35 | 0 | casse de phrase |
| Mentions, crédit | 0,18 m, plancher 6 pt à l'impression (CFD) et 22 px à l'écran sur 1080 px | text | 1,3 | +0,04 em | capitales espacées (`caps` de `art/chrome.tsx`) |

Les planchers en points priment sur le calcul en `m`. Sur un petit format, le texte ne descend pas sous 6 ou 7 pt.
Si la place manque, le gabarit retire une ligne : il ne réduit jamais le corps en dessous du plancher.

**Choix de composition.** Il se fait en deux temps, par une fonction pure et testable.
1. **Famille**, par `moodOf(tone.axes)`, déjà écrit dans `art/mood.ts` : `warm`, `strict` ou `editorial`.
2. **Traitement de l'image et géométrie**, par l'archétype :

| Archétype | Traitement photo | Géométrie | Motif |
|---|---|---|---|
| jester, outlaw, hero | **duotone** neutralDark → primary (Warunk) | photo coupée en biais ou en coin, accroche très grande | `scatter`, à pleine couleur |
| everyman, caregiver, innocent | **naturel réchauffé** (balance blanche vers la neutralLight) | photo dans une forme (cercle, arche, ou bloc arrondi au rayon dérivé du symbole) sur un aplat | `repeat`, en bordure |
| lover, magician, creator, explorer | **naturel contrasté**, noirs bouchés dans la neutralDark | photo à fond perdu, texte posé sur la zone calme | `turn`, en filigrane à 12 % |
| ruler, sage | **monochrome** de la primaire (luminance → primaire assombrie ou éclaircie) | grille stricte, partage photo/texte en 7/5 colonnes | `checker` dans un seul cartouche, ou aucun motif |

La famille désigne la composition **de tête**. Les autres compositions servent aux supports suivants de la même série
(`variantFor`), pour que deux affiches de la page ne soient jamais identiques.

**Contraintes de lisibilité**, vérifiées par le calcul. Un échec ne passe jamais en silence : le gabarit se corrige
ou change de composition.
- **Texte sur aplat** : 4,5:1 au minimum sous 24 px équivalents, 3:1 au-dessus (WCAG 2.2, 1.4.3 et « large text »,
  https://www.w3.org/TR/WCAG22/#contrast-minimum). L'encre est choisie par `inkOn` ; si rien ne passe, le fond
  change de rôle.
- **Texte sur photo** : on mesure la luminance de la photo **traitée** sous le rectangle du texte, sur une vignette de
  256 px. Le contraste doit passer sur **95 % des pixels** de la zone.
  1. Si ce n'est pas le cas, on ajoute un **voile** : un dégradé de la neutralDark, 60 % d'opacité au plus, limité à
     la zone et à sa marge.
  2. Si le voile ne suffit pas, on passe à la composition « bandeau » : le texte sort de la photo et se pose sur un
     aplat.
- **Logo** : sa version est choisie par `logoFor` (le seuil de 2,2:1 est conservé). Sur une photo, on mesure aussi
  la zone de protection.
  1. Si moins de 90 % des pixels de la zone atteignent 3:1 avec la version choisie, on passe à l'autre version
     monochrome.
  2. Si ce n'est toujours pas suffisant, le logo se pose dans un **cartouche** de la neutralLight, de la taille de sa
     zone de protection (ANF p8, TBS p4).
- **Zone de protection** : `clearSpaceRatio × hauteur du logo` sur les quatre côtés. Aucune autre zone ne la
  chevauche, motif compris ; le motif s'arrête à sa limite.
- **Taille minimale** : la hauteur imprimée du logo est au moins `versions.full.heightMm`, et `versions.symbol` en
  dessous de ce seuil (le symbole seul remplace alors le logo complet). À l'écran, on applique les mêmes règles en
  px. Sinon, on prend le défaut actuel de `rules` (`origin: 'default'`, signalé dans la colonne de spécifications).
- **Densité** : trois couleurs de la marque au plus, en plus du noir et du blanc de la photo. Accroche limitée à 6 mots
  et 3 lignes sur l'affiche, à 8 mots et 3 lignes sur la publication. Au-delà, on coupe à la ponctuation la plus
  proche ; sinon on passe au niveau d'accroche suivant (§0.2).

### 2.1 Affiche campagne (priorité 1)

**Format** : rapport 1:√2, celui de l'A3 (297 × 420 mm), également valable pour l'A2 et le 40 × 60. Grille de
12 colonnes et 17 rangées de `m`. La zone de sécurité tient sur 10 × 15 modules.

**Zones**
- **P, photo** : le plat, recadré au centre d'intérêt fourni par l'API (sinon au centre).
- **A, accroche** : de 1 à 3 lignes.
- **L, logo** : sa version et sa zone de protection.
- **Mo, motif** : `MotifGrid`, de la taille d'un module.
- **Me, mentions** : nom de la marque, `values[i].label` ou mention « Exemple », crédit photo obligatoire en 0,18 m.

**Quatre compositions** (colonnes C, rangées R, comptées à partir de 1) :

| Id | Nom | P | A | L | Mo | Quand |
|---|---|---|---|---|---|---|
| `bleed-corner` | Coin perdu (Warunk) | C5-12 × R1-10, à fond perdu en haut et à droite, duotone | C1-8 × R11-14, sur l'aplat primaire | C1-4 × R2-3 | bande de 2 modules qui longe le bord gauche de P | `warm` × jester, outlaw ou hero ; `editorial` × duotone |
| `plate-circle` | Plat dans le cercle | disque de 8 m de diamètre centré en C3-10 × R3-10 ; plat vu d'en haut, naturel réchauffé | C2-11 × R12-14, centrée | C5-8 × R15-16, centré | `repeat` en couronne autour du disque, à 1 m | `warm` × everyman, caregiver ou innocent ; restauration et café par défaut |
| `full-bleed` | Plein cadre | toute la surface | C1-9 × R13-15, sur la zone la plus calme (rangée basse ou haute choisie par la mesure de luminance) | C10-12 × R15-16 | filigrane `turn` à 12 % sur la zone A seulement | `editorial` |
| `split` | Partage | C6-12 × R1-17, monochrome | C1-5 × R3-9, calée à gauche | C1-3 × R15-16 | `checker` dans un cartouche C1-5 × R11-13, ou rien | `strict` |
| `type-only` | Typographique | aucune | C1-12 × R4-12, très grande, sur aplat ; valeur ou accroche | C1-3 × R15-16 | `scatter` à pleine couleur sur R13-17 | aucune photo disponible (§3), ou `strict` × sage ou ruler sans photo |

**Série.** La page « Campagne » montre 2 affiches côte à côte. Elles ont la même composition de tête, la même photo
ou deux photos différentes, et deux accroches de niveaux différents (par exemple `tone.examples[0]` et
`values[0].label`). C'est la preuve qu'il s'agit d'un système et non d'un visuel unique.

### 2.2 Cartes de visite recto-verso (priorité 2)

**Format** : 85 × 55 mm (ETA). Fond perdu de 3 mm, sécurité de 4 mm. Grille de 12 × 8 modules de 7,08 mm ; la marge
est réduite à 0,75 m (5,3 mm).

**Recto, identité** (trois compositions) :
- `field` : aplat de la primaire, logo `mono-white` ou couleur centré, hauteur limitée à 40 % de la carte. Familles
  `warm` et `editorial`.
- `motif` : `MotifGrid` à fond perdu en primaire et accent, avec le logo dans un cartouche de la neutralLight. Si le
  motif est fort (jester, creator), on l'utilise aussi au verso.
- `quiet` : fond neutralLight, logo couleur calé en haut à gauche C1-4, filet de l'accent en pied. Famille `strict`.

**Verso, coordonnées**, sur la neutralLight :
- Nom (texte 0,45 m, plancher 9 pt) et fonction (6,5 pt minimum), en C1-8 × R1-3.
- Bloc contact (7 pt), en C1-8 × R5-7.
- Symbole ou favicon, en C10-12 × R1-2.

Les exemples de champ (§0.2) restent tant que `brand.contact` est absent. Le verso peut porter la mission (au plus
22 mots, 7 pt) si la famille est `editorial`. Pour un café, le verso peut accueillir une variante « carte de fidélité »
(8 ou 10 tampons dessinés avec le symbole). C'est une option du gabarit, jamais une donnée.

**Contraintes.** Le logo ne descend jamais sous `versions.full.heightMm`. Sur une carte de 55 mm, c'est le cas le plus
fréquent où le gabarit doit passer au symbole. Tout texte est en 6,5 pt au moins.

### 2.3 Badge et lanyard (priorité 3)

**Format** : carte CR80 (54 × 85,6 mm, norme ISO/IEC 7810 ID-1), portrait. La fente de 13 × 3 mm est centrée à 4 mm
du haut : les 12 premiers mm sont réservés. Grille de 8 × 12 modules de 6,75 mm.

**Zones**
- En-tête R1-2 : réservé à la fente, en aplat.
- Logo R2-3, centré ou calé à gauche selon la famille.
- Photo d'identité R4-8 : un **cadre vide** pointillé, « photo », car Charta ne fournit jamais un visage.
- Nom R9 (12 pt minimum) et rôle R10, dans une **bande de rôle** en aplat (primaire, accent, extra[0]…). Le rôle
  montré est un exemple (« Équipe », « Invité »).
- Pied R12 : motif sur une rangée.

**Lanyard** : un ruban de 20 mm, montré déroulé à plat. Le motif `repeat` du symbole s'y répète tous les 3 modules,
en `mono-white` sur la primaire, et le logotype horizontal (s'il existe) apparaît tous les 120 mm.

Pour la restauration, le badge se décline en **badge de service** (épinglé, 76 × 25 mm) : logo et prénom d'exemple
seulement.

**Contraintes** : le nom doit rester lisible à 1 m, soit un plancher de 12 pt. Le contraste de la bande de rôle est
d'au moins 4,5:1.

### 2.4 Menu

**Format** : A4 portrait, ou 1/3 A4 (99 × 210 mm) pour une carte de table. Ces formats sont la base de la scène
`menu-table`. On garde la grille de l'affiche : 12 colonnes.

**Zones**
- En-tête R1-3 : logo et chapô (mission, au plus 25 mots, signalée comme texte de la marque).
- Rubriques : titre en display 0,45 m. Les lignes de plat sont des **exemples de structure** : « Nom du plat »,
  description « courte description », et un prix « 00 » aligné à droite sur des chiffres tabulaires, avec des points
  de conduite ou un blanc selon la famille.
- Pied : symbole, mentions et allergènes (« Liste des allergènes : exemple »).

**Compositions**
- `classic` : centrée, filets fins (`strict` × lover ou ruler).
- `column` : deux colonnes calées à gauche (`editorial`).
- `stamp` : une photo de plat dans un cercle en tête, et le motif en marge (`warm`).

**Contraintes** : texte en 8 pt minimum (lecture en salle peu éclairée), prix alignés, au plus 3 couleurs.

### 2.5 Étiquette d'emballage

**Formats**
- Rond de 60 mm (pot, boîte de vente à emporter).
- Bandeau de 210 × 50 mm (bol, comme le bandeau de Warunk).
- Étiquette suspendue de 50 × 90 mm (mode, cosmétique).

**Zones** : logo ou symbole, nom du produit (« Nom du produit », exemple), mention réglementaire (« Poids net :
exemple »), motif.

**Compositions**
- `seal` : un tampon rond, avec le texte en arc autour du symbole, si la famille est `warm`.
- `band` : un bandeau de motif sur lequel le logo est réservé dans un cartouche.
- `minimal` : un fond neutralLight et un logo petit et centré. Ce choix vaut pour la cosmétique, ou pour `strict` ×
  lover.

**Contraintes** : symbole seul sous `versions.full.heightMm` ; mentions en 6 pt minimum.

### 2.6 Instagram : publication carrée, portrait et story

**Formats**
- Carré de 1080 × 1080 px. C'est la résolution maximale que cite l'aide d'Instagram : « up to 1080x1080 pixels »,
  https://help.instagram.com/1631821640426723.
- Portrait 4:5, 1080 × 1350 px.
- Story 9:16, 1080 × 1920 px. On y réserve 250 px en haut et 340 px en bas pour l'interface. Ces zones sont une valeur
  d'usage courante, **non trouvée** dans l'aide officielle : elle doit être affichée comme telle.

La grille est de 12 colonnes, avec un module de 90 px. Le texte fait 22 px au minimum, et la plupart des accroches
sont rendues au-delà de 60 px.

**Compositions** : elles reprennent celles de l'affiche (§2.1), recadrées. Une **grille de profil** de 3 × 3
publications montre l'alternance photo, aplat et motif ; c'est ce qui rend une marque « vivante » sur un réseau
(NOVA). L'ordre de l'alternance est fixe : photo, aplat avec une valeur, motif, puis on recommence, en décalant d'une
case à chaque rangée.

**Story** : photo plein cadre, accroche dans le tiers du haut sous la zone réservée, logo au-dessus de la zone basse.

### 2.7 Vitrine, enseigne drapeau, sac, uniforme

**Vitrine (vinyle sur verre)**
- Une seule couleur, la `mono-white` ou la primaire si son contraste avec un intérieur sombre est suffisant.
- Le logo est calé à 1,4 m du sol sur la photo (milieu de la scène `storefront-sign`).
- Les horaires sont des **exemples** (« Lun–Ven 00h–00h »).

**Enseigne drapeau** : disque ou carré. Elle porte le symbole seul si le logo complet ne tient pas au minimum, puis le
logotype en face B. Scène `blade-sign-street`.

**Sac kraft**
- Impression en 1 couleur, la neutralDark ou la primaire si son contraste avec le kraft atteint 3:1.
- Logo centré, de 40 % de la largeur ; motif en soufflet.
- Scènes `paper-bag` et `tote-terracotta` (motif `repeat` en grand, So Matcha).

**Uniforme**
- Tablier : logo de 80 à 90 mm de large à hauteur de poitrine.
- Poche : symbole de 35 mm.
- Ces valeurs viennent de la pratique d'atelier et sont signalées « à confirmer avec le brodeur ». Le gabarit les
  rend sous forme de cotes. Fil : la version monochrome qui contraste avec la couleur du tissu. Scène `apron`.

---

## 3. Les photographies

### 3.1 Ordre retenu

1. **Photos libres Pexels, puis Unsplash** (clés gratuites créées par le propriétaire). C'est la voie par défaut
   pour la restauration, le café, la mode et la cosmétique.
2. **Composition graphique pure**, motif et typographie. Elle est toujours disponible : c'est le repli de tout échec
   et le choix par défaut pour la tech et pour `strict` × sage ou ruler. On ne la vit pas comme un défaut : c'est la
   composition `type-only`, dessinée pour être forte.
3. **Génération Gemini Image**, en option future, désactivée tant qu'aucune facturation n'existe (quota gratuit nul ;
   https://ai.google.dev/gemini-api/docs/pricing). Elle servira seulement aux plats et aux objets, jamais à un logo,
   un visage réel ou une marque tierce. Ses images porteront la mention « image générée ».

Pinterest et Are.na **ne sont jamais une source de photos**. Ils restent des inspirations de composition, consultées
par un humain.

### 3.2 Sélection

**Requête**
- Elle part d'un dictionnaire par secteur, en anglais. Pour `restaurant` : « plated dish top view », « food overhead
  table », « dish close up » ; pour `cafe-bakery` : « coffee cup top view », « pastry close up ».
- Elle peut porter un **mot saisi par l'utilisateur** : le nom de son plat phare, par exemple. Charta ne devine pas
  le plat.
- Orientation : `portrait` pour l'affiche, `squarish` pour la publication.

**Filtre de couleur**
- Pexels accepte une couleur hexadécimale (`color`, « any hexidecimal color code »,
  https://www.pexels.com/api/documentation/). On envoie la **primaire**.
- Unsplash n'accepte que 11 noms de couleur (`black_and_white`, `orange`, `teal`…,
  https://unsplash.com/documentation#search-photos). On envoie le nom le plus proche de la primaire, en ΔE OKLab.

**Classement local**, sur les vignettes (≤ 400 px) :
- On extrait 5 couleurs dominantes par le `color-engine` existant.
- Score = 0,5 × proximité OKLab avec la palette + 0,3 × **calme d'une zone** (une région à faible variance de
  luminance assez grande pour l'accroche) + 0,2 × cadrage vu d'en haut (rapport d'aspect, sujet centré).
- On montre **6 candidates**, et **l'utilisateur choisit**. Charta ne publie pas sans ce choix. Une photo choisie peut
  être recadrée et changée de traitement.

**Traitement** : duotone, naturel réchauffé, naturel contrasté ou monochrome (§2.0). Il est appliqué dans le navigateur
au rendu, sur la photo servie par la source. Le fichier source n'est jamais modifié ni stocké.

**Crédit et droits**
- Le crédit figure dans la zone Me du gabarit (« Photo : Nom / Pexels ») et dans la colonne de spécifications de la
  page.
- Pour Unsplash : affichage par hotlink des URL de l'API, appel de `download_location` à chaque photo retenue, et
  crédit avec lien vers le photographe et Unsplash
  (https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines).
- Pour Pexels : lien « Photos provided by Pexels » et crédit.

**À vérifier dans U-03** :
- que le traitement en canevas fonctionne sur les URL de l'API (en-têtes CORS de chaque CDN) ;
- que l'export PDF, qui incorpore la photo traitée, reste compatible avec l'obligation de hotlink d'Unsplash. Si ce
  n'est pas le cas, on prend Pexels pour l'export.

**Clés** : elles restent côté serveur, dans une route du web ou du worker, et les variables d'environnement sont
validées par Zod. Chaque réponse d'API est validée par Zod. On garde en cache, par requête, les identifiants, l'auteur
et les URL, jamais l'image.

Débits publiés :
- Unsplash : 50 requêtes par heure en démo (recherche sur les sources du 2026-11-11).
- Pexels : 200 requêtes par heure.
- Une marque consomme 2 à 4 recherches.

### 3.3 Ce qui est faisable aujourd'hui sans dépense

| Voie | Dépense | Compte | État |
|---|---|---|---|
| Composition graphique pure | non | non | faisable tout de suite (U-01, U-02, U-05) |
| Pexels, Unsplash | non | oui, clés gratuites (en cours chez le propriétaire) | dès réception des clés (U-03) |
| Openverse (`https://api.openverse.org/v1/images/`) | non | **non** : répond sans clé (essai du 2026-11-11 : 240 résultats pour « pasta dish », licences CC) | repli de développement seulement : qualité inégale (Flickr), licence et crédit propres à chaque image ; filtre `license_type=commercial,modification` obligatoire |
| Gemini Image | oui (facturation) | oui | option future, derrière un drapeau |

---

## 4. Le rendu

### 4.1 Une description, deux rendus

Le gabarit produit une **description de mise en page** pure et sérialisable. C'est une liste de nœuds positionnés en
mm ou en px : aplat, image (identifiant de photo et traitement), logo (version, boîte), texte (police, corps, lignes
déjà coupées), motif (cellules de `motifCells`). Elle est calculée par une fonction pure :

`layoutCollateral(kind, brand, photo?, measure) → Result<Layout, LayoutError>`

La mesure du texte (`measure`) est **injectée**, ce qui garde le paquet pur. La sortie est testable sans navigateur
(zones qui ne se chevauchent pas, contrastes, minimums). Deux moteurs la rendent :

1. **SVG (React)**, pour la page de la charte et l'export PDF. C'est du vectoriel : le logo est le fichier
   `vector`/`mono-*`, et le texte reste du texte.
2. **Canvas 2D**, pour la texture d'une scène. Il remplace les fonctions de `apps/web/src/studio/mockups/artwork.ts`
   (`poster`, `cardFront`, `cardBack`), dont la version actuelle couvre déjà l'idée en version minimale. Le canevas est
   rendu au côté long de 2048 px, déjà utilisé.

### 4.2 La page « à plat » (A4 paysage, dans le cadre `SheetFrame`)

On garde la grille de page existante (`T`, `M` de `art/chrome.tsx`) :
- **8 colonnes sur 12 pour les objets** ;
- **4 colonnes pour la spécification**.

La spécification se présente en cartouche chiffré :
- format et fond perdu ;
- grille (12 × 17, `m` = 24,75 mm en A3) ;
- hauteur du logo en mm et sa règle ;
- contraste mesuré de l'accroche (« 7,2:1 ») ;
- origine de l'accroche ;
- crédit photo.

Les objets sont posés sur la neutralLight avec une ombre portée unique, douce (0 2 m 4 m, 12 % neutralDark), et
**cotés** : filets de cote en 0,5 pt, valeurs en capitales espacées.

Quatre pages construites remplacent les trios de scènes des sections `stationery`, `social-media`, `menu`,
`packaging`, `signage` et `uniform` (§4 de la recherche sur le contenu) :
1. **Campagne** : 2 affiches.
2. **Papeterie et badge** : carte recto et verso, badge et lanyard.
3. **Réseaux** : grille de 3 × 3 et une story.
4. **Lieu** : menu, étiquette, vitrine et tablier, cotés. Elle n'est ajoutée que pour les secteurs qui la demandent.

### 4.3 La page « en situation »

La **même** texture que la page à plat est posée sur une scène.

- **Scènes PSD à slot.** Le slot `role: "poster"` reçoit déjà une illustration par `drawArtwork`, et la carte UV porte
  la perspective et le maillage du PSD :
  - `poster-held`, `poster-hanging` et `poster-living` (Firmbee, CC0) ;
  - `cards-floating` et `cards-stack` pour les cartes (`card-front`, `card-back`).

  Ces trois affiches sont aujourd'hui dans `RETIRED_SCENES`, « jugées faibles », parce qu'elles montraient un aplat et
  une phrase. Avec une affiche composée (photo de plat, motif, logo), on les **réévalue** dans U-06. On garde les deux
  meilleures. Les critères : la lumière, l'échelle et l'absence de décor hors palette.
- **Scènes photo à surface.** `poster-frame-console`, `menu-table`, `phone-table`, `storefront-sign`.
  - Le contrat `logoBox` n'accepte que `fit: 'contain'`. Le ticket U-06 ajoute `fit: 'cover'`, avec
    `paddingRatio: 0` : la texture remplit le quad sous le masque, et l'éclairage `shade` et le grain restent ceux de la
    photo.
  - L'écran de `phone-table` reçoit la publication carrée ou la story, avec la finition `screen` existante.
- **Règle d'or du rendu.** Le logo n'est jamais redessiné par un modèle. Il est rendu à partir de ses fichiers, comme
  dans tout le moteur (ADR-008).

### 4.4 Mouvement dans le studio

**Changer de composition** (le bouton « autre composition », qui parcourt `variantFor`)
- Fondu enchaîné de 240 ms, avec la courbe `cubic-bezier(0.2, 0, 0, 1)`.
- Aucun déplacement de bloc.
- Avec `prefers-reduced-motion: reduce`, le remplacement est instantané.

**Passer de la page à plat à la page en situation** : sans transition dans le PDF. Dans le studio, la même règle :
fondu de 240 ms, instantané si l'utilisateur réduit les animations.

**Ce qui est exclu** :
- les parallaxes ;
- les apparitions décalées ;
- l'animation du logo. Le logo animé est un sujet de charte (motion), pas un effet d'interface.

---

## 5. Tickets et ordre de construction

L'ordre suit ce qui impressionne le plus pour une marque de restauration : une affiche de plat crédible, à plat puis
en situation, en 6 tickets. Les lignes sont comptées hors tests.

| # | Ticket | Périmètre | Lignes | Dépend de |
|---|---|---|---|---|
| U-01 | **ADR-036 « applications construites »** et contrat `CollateralKind` / `Layout` (nœuds, zones, unités, erreurs) dans `@app/contracts` ; `compositionFor(kind, mood, archetype)` pur | contracts, docs | ~250 | — |
| U-02 | **Moteur de gabarit pur** `layoutCollateral` : grille en `m`, zones, coupe du texte (mesure injectée), planchers en pt, version et minimum du logo, zone de protection, motif ; champs facultatifs `brand.tagline` et `brand.contact` dans le schéma du document (rétrocompatibles) | nouveau module pur, dans `packages/document/src/collateral/` (pas de nouveau paquet) | ~320 | U-01 |
| U-03 | **Photos** : route serveur Pexels et Unsplash (clés en variables d'environnement validées par Zod, réponses validées par Zod), dictionnaire de requêtes par secteur, mot saisi par l'utilisateur, classement OKLab et zone calme, crédit, `download_location`, cache des métadonnées ; panneau « Choisir la photo » (6 candidates) ; vérification CORS et export | apps/web (route et panneau), color-engine (lecture seule) | ~300 | U-01 |
| U-04 | **Traitement et lisibilité sur photo** : duotone, naturel réchauffé, naturel contrasté, monochrome (canevas ou WebGL) ; mesure de luminance sous les zones ; voile, repli « bandeau », cartouche du logo | apps/web | ~220 | U-02, U-03 |
| U-05 | **Affiche campagne** : les 5 compositions, rendu SVG, page « Campagne » (2 affiches et cartouche de spécification), `type-only` sans photo | apps/web/studio/pages | ~300 | U-02 (U-04 pour la photo) |
| U-06 | **Affiche en situation** : `drawArtwork('poster')` branché sur la description de mise en page ; `fit: 'cover'` dans `logoBox` (contrat et moteur) pour `poster-frame-console` ; réévaluation et réactivation de deux scènes `poster-*` ; capture Playwright de La Mèza **et** d'une marque d'un autre secteur | contracts, mockup-engine, apps/web | ~260 | U-05 |
| U-07 | **Cartes de visite recto-verso** : 3 rectos, verso coordonnées (exemples ou `brand.contact`), variante fidélité ; page « Papeterie » ; `card-front` et `card-back` de `cards-floating` et `cards-stack` | apps/web | ~280 | U-02, U-06 |
| U-08 | **Badge CR80 et lanyard**, badge de service ; ajout à la page « Papeterie » ; pas de scène tant qu'aucune photo d'objet vierge libre n'est produite (voir la recherche sur les objets courbes, §4) | apps/web | ~220 | U-07 |
| U-09 | **Instagram** : carré, 4:5, story avec zones réservées, grille de profil 3 × 3 ; page « Réseaux » ; écran de `phone-table` | apps/web | ~280 | U-05 |
| U-10 | **Menu** : A4 et 1/3 A4, 3 compositions, lignes d'exemple, prix tabulaires ; scène `menu-table` | apps/web | ~280 | U-05 |
| U-11 | **Étiquette et sac** : rond, bandeau, étiquette suspendue ; scènes `paper-bag`, `gift-box`, `tote-terracotta` | apps/web | ~250 | U-02 |
| U-12 | **Lieu** : vitrine, enseigne drapeau, tablier (cotes « à confirmer avec le brodeur ») ; scènes `storefront-sign`, `blade-sign-street`, `apron` ; page « Lieu » ajoutée selon le secteur | apps/web | ~250 | U-02 |
| U-13 | **Plan de la charte** : les sections `stationery`, `social-media`, `menu`, `packaging`, `signage` et `uniform` pointent vers leurs pages construites (et non plus vers `mockupScenes`) ; mise à jour de `16_GUIDELINE_RULES.md` (R17 : une application montrée à plat et cotée, puis en situation) | contracts, apps/web, docs | ~200 | U-05, U-07, U-09 à U-12 |

**Chemin critique de la démonstration.** Pour une marque de restauration : U-01 → U-02 → U-03 → U-04 → U-05 → U-06,
environ 1 650 lignes. Le résultat est une page « Campagne » avec deux affiches de plat composées, puis la même affiche
encadrée sur la console et tenue à la main.

Pour avancer sans dépendre des clés, on peut faire **U-03 en parallèle** de U-02. U-05 se démontre d'abord en
`type-only`.

Ensuite viennent U-07 et U-08, qui forment la papeterie qu'un jury regarde en premier après l'affiche. Puis U-09 à
U-12 selon le secteur, et U-13 pour fermer le plan.

**Revue à chaque ticket**
- Les agents `typescript-reviewer` et `code-reviewer`.
- `security-reviewer` pour U-03 : clés, Zod, aucune URL de photo construite à partir d'une entrée utilisateur non
  validée.
- `frontend-a11y` pour U-04 et U-05 : contrastes mesurés.
- Capture Playwright sur **deux marques de secteurs différents**, pour qu'aucun gabarit ne soit réglé sur La Mèza.

## 6. Risques

- **Photos.** La qualité dépend des banques. Un plat local précis, par exemple un plat camerounais, peut manquer chez
  Pexels et Unsplash. Le choix humain parmi 6 candidates et le repli `type-only` couvrent ce risque.
- **Hotlink d'Unsplash et export PDF.** La compatibilité est à vérifier dans U-03. Si la réponse est non, Pexels sert
  à l'export.
- **Accroches.** Les `tone.examples` sont des phrases d'exemple du ton, pas un slogan validé. Tant que
  `brand.tagline` est vide, la légende « exemple » reste obligatoire.
- **Valeurs non sourcées.** Les zones réservées de la story Instagram et les cotes de broderie ne viennent pas d'une
  source officielle lue. Elles sont affichées comme des valeurs d'usage.
