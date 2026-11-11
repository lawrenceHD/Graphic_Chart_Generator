# Contenu des chartes graphiques : moins de pages, plus de matière (recherche du 2026-11-11)

> Demande du propriétaire : une charte générée avec **le moins de pages possible**, mais un **contenu beaucoup plus
> riche et précis** dans chaque section. Ce document est une recherche. Il ne modifie ni le code ni les règles
> (`16_GUIDELINE_RULES.md` reste la norme tant que le propriétaire n'a rien tranché).

## 0. Méthode et corpus

**Corpus privé lu** : texte extrait par `vectorcraft-cli 0.23.0 --safe-mode convert` (`VECTORCRAFT_NO_PREFS=1`), dans un
dossier temporaire hors du dépôt. Le PDF Instacart ne contient pas de texte : ses pages 2, 3, 25, 75 et 86 ont été
rendues en PNG à 60 ppi et lues à l'image. `charte1.pdf`, `charte2.pdf` et `gj.pdf` font **0 octet** dans
`corpus-reel/chartes/` : ils sont vides et n'ont pas pu être lus. Le fichier « bbc »
(`20231129_charte-graphique-bbc_…`) est la charte **BlaBlaCar** (« Master Guidelines, Light Version, May 2023 »),
pas celle de la BBC. `.cache/corpus-private/charters/` contient les mêmes PDF, avec en plus des logos et des fichiers
`truth.json`.

| Code | Charte | Pages | Type |
|---|---|---|---|
| POR | Porto, *Manual de identidade* (Eduardo Aires, 2017) | 175 | ville |
| ETA | Charte graphique de l'État (SIG, juin 2021) | 174 | institution |
| UNV | Volontaires des Nations unies, « Notre charte graphique » | 100 | ONG internationale |
| INS | Instacart Guidelines v1 (2022) | 100 | tech, distribution alimentaire |
| CFD | CFDT, charte 2ᵉ édition (2013), avec charte édition et charte vidéo | 71 | syndicat |
| SLK | Slack Brand Guidelines | 60 | tech SaaS |
| BC | Baud Communauté (janvier 2022) | 50 | intercommunalité |
| BBC | BlaBlaCar Master Guidelines Light (2023) | 47 | tech, mobilité |
| CAP | APEFE (« CAPEFE ») | 31 | coopération internationale |
| NEV | Ville de Nevers (2018) | 24 | ville |
| ANF | ANFA (annexe charte graphique) | 21 | association professionnelle |
| AGR | Institut Agro | 17 | enseignement supérieur |
| DT | Data Terra (2020, v1.02) | 12 | infrastructure de recherche |
| TBS | TB-Speed (2017) | 10 | projet de santé |

**Sources publiques** (recherche web du 2026-11-11 ; l'URL est donnée à chaque citation). Plusieurs portails ont
refusé la lecture automatique (Mastercard : 403 ; Standards Manual : 429 ; Mailchimp : connexion coupée). Pour ces
sources, seuls les extraits renvoyés par la recherche ont servi, et ils sont signalés comme tels. Les chiffres de
sites tiers non officiels (Netflix, Airbnb) ne sont pas repris comme des faits.

**Charta lu** : `docs/14_ADR_LOG.md` (ADR-028), `docs/16_GUIDELINE_RULES.md`, `packages/contracts/src/reference.ts`
(30 sections), `packages/contracts/src/document-types.ts` (11 types de page, `PAGE_CAPACITY`),
`packages/ai/src/references/direction.ts`, `packages/ai/src/plan/chart-plan.ts`, `packages/document/src/compose.ts`,
`apps/web/src/studio/pages/*` (builders, `variant.ts`).

---

## 1. Les sections des chartes étudiées : fréquence et nombre de pages

« Fréquence » : nombre de chartes du corpus (14 lisibles) qui traitent la section de façon identifiable (titre de
page ou de chapitre). « Pages typiques » : la fourchette basse vient des petites chartes (10 à 31 pages), la haute
des grandes (47 à 175 pages). Les numéros de page du sommaire d'Instacart, de Slack, de BlaBlaCar et d'UNV servent de
mesure.

| # | Section | Fréquence | Pages typiques (petite → grande charte) | Exemples |
|---|---|---|---|---|
| 1 | Couverture | 14/14 | 1 | toutes |
| 2 | Sommaire | 13/14 | 1 | INS p3, SLK p3, CAP p2, AGR p2, DT, NEV, TBS p2 |
| 3 | Introduction, objectifs, mode d'emploi | 10/14 | 1 → 2 | ETA p2-3, UNV p3, CAP p4, BC, TBS p2, INS p2 (« quick start guide ») |
| 4 | Histoire et sens du signe (concept) | 12/14 | 1 → 4 | POR (« O Ponto »), BBC p6-7, AGR p5, NEV p3, CFD p4, BC, TBS p3, CAP |
| 5 | Mission, valeurs, personnalité | 6/14 | 1 → 6 | SLK p6-11, UNV p8, INS « Framework » p2-6, CFD (ADN), BC (objectifs) |
| 6 | Ton de voix, principes d'écriture | 3/14 | 1 → 4 | SLK p13-16, UNV p8-12 (principes et « énoncé standard »), CFD (charte vidéo) |
| 7 | Architecture de marque, émetteurs, sous-marques | 8/14 | 1 → 20 | ETA (bloc-marque, intitulés), POR (entreprises municipales), BBC p3-4, SLK p37-43, DT (pôles), CFD, CAP, UNV |
| 8 | Logo principal et ses éléments | 14/14 | 1 → 3 | toutes |
| 9 | Construction et grille du logo | 6/14 | 1 → 3 | ETA p13 (cotes X/3, 3/4X, 11/6X), POR, AGR p10, TBS p4, BBC p7, BC |
| 10 | Versions et usage sur fonds (couleur, noir, blanc, négatif, photo) | 14/14 | 1 → 4 | BBC p9 (A/B/C), AGR p12-15, SLK p22-23, DT p5, NEV, CFD |
| 11 | Zone de protection | 13/14 | 1 | voir §2.3 |
| 12 | Taille minimale | 14/14 | 1 | voir §2.3 |
| 13 | Taille et placement par format | 5/14 | 1 → 10 | POR (A5 → outdoor), ANF p6-7, ETA (cadre, zones), CFD, NEV (logo d'angle) |
| 14 | Co-branding, partenaires, bailleurs | 6/14 | 1 → 3 | ETA (zone partenaires), SLK p39, NEV (co-signature), CAP (bailleurs), BC, POR |
| 15 | Interdits du logo | 13/14 | 1 → 2 | SLK p24, BBC p12, AGR, DT p8, ANF p9, TBS p8, ETA p13 |
| 16 | Palette avec valeurs | 14/14 | 1 → 6 | toutes |
| 17 | Pantone (C et/ou U) donné | 10/14 | dans 16 | POR, ETA, BBC, AGR, NEV, UNV, TBS, ANF, CFD (INS : champ prévu, vide) |
| 18 | Proportions d'usage des couleurs | 3/14 | 1 | BBC p14, INS p25 (rôles), SLK |
| 19 | Teintes et nuancier | 4/14 | 1 → 2 | BBC p15 (60/40/20 %), ETA (thème clair et foncé), CFD, DT (dégradés) |
| 20 | Combinaisons accessibles (contraste) | 3/14 | 1 | SLK p28, BBC p16, ETA p48 |
| 21 | Typographie : familles et spécimen | 14/14 | 1 → 12 | toutes |
| 22 | Police de repli (bureautique ou web) | 7/14 | dans 21 | BBC (Questrial, Mulish), SLK (Proxima Nova pour G Suite), NEV (Arial 11), UNV, CAP, ANF, BC |
| 23 | Hiérarchie typographique chiffrée | 5/14 | 1 → 3 | SLK p33 (48/30/24/18 pt), BBC p18, POR (7 pt/8,5 pt), CFD (6 pt), INS |
| 24 | Typographie et langues | 2/14 | 1 | SLK p35 (japonais −15 %, FR/ES/DE +20 à 30 % de texte), BBC (cyrillique) |
| 25 | Éléments graphiques, motif, territoire | 7/14 | 1 → 12 | POR (« A Malha », 12 p), AGR p5-6, BC (ruban, cartouches), CFD (typo de ponctuation), DT, NEV, ETA (cadre) |
| 26 | Iconographie, pictogrammes | 6/14 | 1 → 4 | POR, CFD (pictos), BC, DT, SLK p45, INS p69-72 |
| 27 | Illustration | 4/14 | 1 → 12 | INS p57-68, BBC p29-36, SLK p44, CFD |
| 28 | Photographie | 5/14 | 1 → 14 | BBC p22-28, UNV p62-75, INS p45-56, SLK p48, AGR p14-15 (logo sur visuel) |
| 29 | Data visualisation | 1/14 | 1 | DT |
| 30 | Grille et mise en page, gabarits | 5/14 | 1 → 10 | ETA (zones émetteur, partenaires, expression), INS p73-82, CFD (structures), NEV, ANF |
| 31 | Motion et vidéo | 4/14 | 1 → 11 | INS p83-93, SLK p50, CFD (charte vidéo), ETA (intro, outro, sous-titres, LSF) |
| 32 | Papeterie | 9/14 | 1 → 8 | ETA, POR, DT, CAP, UNV, BC, NEV, ANF, CFD |
| 33 | Outils bureautiques (PPT, Word, signature e-mail) | 5/14 | 1 → 4 | ETA, DT, CAP, UNV, BC |
| 34 | Édition, affiches, publications | 7/14 | 1 → 30 | ETA, CFD (p80-112), NEV, CAP, BC, POR, DT |
| 35 | Signalétique, kakémono, événement | 5/14 | 1 → 4 | ETA, DT, UNV, POR (métro), NEV (panneau de chantier) |
| 36 | Web, réseaux sociaux, favicon, avatar | 6/14 | 1 → 6 | ETA (UI kit, avatar, cover, post), NEV, BC, AGR p9 (favicon), CFD, INS |
| 37 | Produits dérivés | 4/14 | 1 → 2 | DT, UNV, POR, SLK p58 |
| 38 | Interface produit | 3/14 | 1 → 6 | INS p75 et p94+, SLK p46, ETA (UI kit) |
| 39 | Gouvernance, marque déposée, contacts, téléchargements | 7/14 | 1 → 9 | SLK p51-59, BBC p47, CAP p31, UNV (boîte à outils), TBS, ETA, NEV |

**Constats chiffrés.**

- **Le noyau commun tient en 9 sections** présentes dans 13 ou 14 chartes sur 14 : couverture, sommaire, logo,
  versions et fonds, zone de protection, taille minimale, interdits, palette, typographie. Ensuite viennent
  l'histoire du signe (12/14), l'introduction (10/14), Pantone (10/14) et la papeterie (9/14).
- **Les petites chartes regroupent, les grandes découpent.** TB-Speed (10 p.) met une règle par page. Data Terra
  (12 p.) met la zone de protection et la taille minimale **sur la même page** (p9). Institut Agro (17 p.) réunit
  zone et taille à la p10. ANFA (21 p.) met la taille minimale, l'espace protégé et sa formule (« X = A ») sur une
  seule page (p5). Une charte courte n'est donc pas pauvre : elle **empile les spécifications** sur la page.
- **Les chartes longues ne sont pas plus « riches » par page.** Porto consacre 10 pages à un tableau de tailles
  (une page par format), et Instacart 15 pages au logo. La longueur vient du découpage, pas de règles en plus. Les
  12 à 14 pages denses visées par le propriétaire peuvent donc contenir toutes les règles d'une charte de 50 pages.

---

## 2. Ce qu'une charte pro met dans chaque section

Chaque bloc liste le **contenu attendu**, puis des **exemples tirés des sources**.

### 2.1 Couverture, sommaire, mode d'emploi

- **Couverture** : nom de la marque, « Charte graphique » ou « Brand guidelines », **version et date** (DT :
  « 2020 – v1.02 » ; TBS : « Novembre 2017 » ; INS : « Version 1 » dans l'en-tête de chaque page), émetteur (ETA :
  « Service d'information du Gouvernement »).
- **Sommaire numéroté par chapitre et par page** : INS p3 (« Logo 7, Color 22, Typography 33… ») ; CAP p2
  (A, B, C, D avec numéros de page).
- **Mode d'emploi** sur une page : à qui sert la charte, ce qui est obligatoire et ce qui est libre, où trouver les
  fichiers, qui contacter. Exemples : UNV p3 (« boîte à outils : www.unv.org/branding/tools ») ; TBS p2 (« le cadre
  […] n'est pas figé ; il évoluera ») ; CAP p4 (« L'utilisation du logo n'est pas facultative ») ; ETA p3 (trois
  grands principes).

### 2.2 Plateforme de marque : histoire, mission, valeurs, personnalité

- **Le sens du signe, décomposé** : chaque partie du logo et ce qu'elle signifie. Exemples : BBC p6-7 (guillemet =
  début d'une conversation ; « Passenger and Driver + Social connection ») ; NEV p3 (quatre flèches qui forment le
  « N », puis cinq qualités : simplicité, solidité, dynamisme, ouverture, numérique) ; AGR p5 (le « a » de « Agro »,
  la main formée par l'index et le pouce, le soleil) ; CFD p4 (rond = humanité ; deux points = dialogue social).
- **Mission et vision en une phrase chacune** : SLK p6 (« Our mission is to make people's working lives simpler,
  more pleasant and more productive »).
- **Valeurs, chacune bornée** : SLK p13 (« Confident (never cocky) », « Witty (but never silly) », « Helpful (never
  overbearing) »). Mailchimp utilise la même forme « X mais pas Y » (extraits de recherche sur
  https://styleguide.mailchimp.com/voice-and-tone/).
- **Règles de nom** : SLK p6 (« Slack » s'emploie seulement comme adjectif, jamais comme verbe, pluriel ou
  possessif).
- **Texte standard réutilisable** (boilerplate) : UNV, « Énoncé standard » p12.

### 2.3 Logo (le cœur de la charte)

**a. Anatomie et construction**
- Les éléments nommés (symbole, logotype, signature) et leur ordre fixe : ETA p13 (« Marianne en entrée, devise en
  fin, l'ordre des éléments doit toujours être respecté ») ; SLK p19 (octothorpe + logotype en Hellix Bold).
- La **grille de construction, avec des cotes relatives à une unité X** : ETA p13 (X/3, 3/4X, 11/6X) ; NASA, *Graphics
  Standards Manual* de 1975, page « The Logotype: Grid Drawing for Large Applications »
  (https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf).
- Le lettrage : sur mesure ou police nommée. BBC p7 : « bespoke piece of typography, never attempt to recreate it ».

**b. Versions, toujours montrées sur leur fond**
- Principale (horizontale ou verticale) et secondaire, chacune avec son cas d'usage : SLK p19 (le logo horizontal est
  la version principale ; le logo empilé sert aux grands formats, jamais aux petits) ; BBC p8 (verticale principale,
  horizontale secondaire).
- Positif, négatif, monochrome noir, monochrome blanc, **fond par fond**, avec les combinaisons interdites :
  BBC p9 (trois « colourways », chacune liée à un fond, et « aucune version n'est compatible avec le BlaBlaGreen ») ;
  AGR p13 (« sur fond orange charté, logo noir et blanc ; sur fond clair, logo noir ; sur teinte foncée, logo
  blanc ») ; NEV (« uniquement bleu sur blanc ou blanc sur bleu »).
- **Sur photographie** : AGR p14-15 (assombrir ou éclaircir le visuel ; sur un fond complexe, ajouter une forme du
  territoire graphique en réserve) ; TBS p4 (le cadre technique sert de cartouche sur un fond qui gêne la lecture) ;
  ANF p8 (fond perturbant : le logo reprend sa zone de protection sur fond blanc).
- **Logo pour les petites tailles** : SLK p20 (version dédiée entre 50 et 90 px de large) ; AGR p9 (« version
  symbole, utilisée pour les photos de profil sur les réseaux sociaux et comme favicon »).

**c. Zone de protection, chiffrée par une mesure du logo**

| Charte | Unité de la zone |
|---|---|
| AGR p10 | hauteur du « a » de « agro » |
| TBS p4 | hauteur du « e » (réductible à la moitié si la place manque) |
| ANF p5 | « X = A » (hauteur du A de ANFA) |
| NEV p4 | deux fois l'épaisseur des chevrons |
| POR | moitié de la largeur et de la hauteur du carré |
| SLK p39 | largeur d'un octothorpe (entre deux logos partenaires) |
| DT p9 | 2 cm (valeur absolue, pratique la plus faible) |
| TfL | 0,25 × la largeur de la barre du roundel (https://content.tfl.gov.uk/tfl-basic-elements-standards-issue-08.pdf) |
| Mastercard | ¼ de la largeur d'un cercle du symbole (https://www.mastercard.com/brandcenter/ca/en/brand-requirements/mastercard.html) |
| Spotify | moitié de la hauteur de l'icône, guide partenaires 2015 (https://developer.spotify.com/documentation/design) |
| Deutsche Bahn | moitié de la hauteur du logo, sur tous les côtés (https://marketingportal.extranet.deutschebahn.com/marketingportal-en/Brand-Codes/Logo) |
| Shopify | X = hauteur d'x du logotype (https://www.shopify.com/ng/brand-assets) |

**d. Tailles minimales, en impression (mm) et à l'écran (px), par version**

| Charte | Impression | Écran |
|---|---|---|
| ETA p13 | Marianne : 2,5 mm de haut | 12 px |
| BBC p10 | trois versions : 25 mm, 15 mm, 5 mm | 120 px, 100 px, 30 px |
| UNV p22 | logo : 20 mm de large ; signature : 10 mm (verticale), 30 mm (horizontale) | 100 px ; 30 px et 85 px |
| SLK p20 | — | logo pour petites tailles de 50 à 90 px de large ; symbole de 15 à 20 px de haut |
| POR | trois versions : 10 mm, 5 mm, 3 mm de haut | — |
| CFD | 7 mm | — |
| CAP | 8 mm | — |
| TBS p5 | 5 mm | — |
| NEV | 15 mm de haut (ou 17,5 mm) | — |
| AGR p10 | 25 mm | — |
| BC | 30 mm | — |
| ANF p5 | 33 mm de long | — |
| DT p10 | 1 cm (logos des services) | — |
| Spotify | icône 6 mm, logo 20 mm | icône 21 px, logo 70 px (https://developer.spotify.com/documentation/design) |
| Mastercard (2016) | 8,9 mm | 24 px (https://brand.mastercard.com/debit/mastercard-brand-mark.html) |
| TfL | logotype 18 mm, ensemble 32 mm, roundel avec texte 12 mm | — |

Règle pro : **une taille minimale par version**, pas une seule pour tout le logo (BBC, UNV, POR, Spotify), et le
renvoi vers le symbole seul en dessous.

**e. Taille et placement selon le format** (ce qui manque le plus aux petites chartes)
- POR : un **tableau des hauteurs fixes** (A5 : 10 mm en version complexe, 5 mm en version simple ; A4 : 13 mm et
  8 mm ; A3 : 10 à 12 mm ; affiche 50×70 cm : 20 mm ; MUPI 120×176 cm : 40 mm ; outdoor : 150 mm) et **un
  emplacement** (« en bas à droite, ou le plus à droite parmi les autres logos »).
- ANF p6-7 : taille du logo = **1/3 de la largeur** du format (A4 portrait et paysage) ; placé en tête, calé à gauche
  ou à droite, ou en pied à droite, avec une marge au moins égale à la zone de protection.
- ETA : bloc-marque **toujours en ouverture** des supports, dans une « zone émetteur » fixe.
- Deutsche Bahn : le logo précède la communication, donc il se place en haut ; des modèles à tailles prédéfinies
  existent (lien DB ci-dessus).

**f. Co-branding**
- SLK p39 : Slack d'abord ; espace d'un octothorpe, partagé en deux par un filet vertical ; logo partenaire aligné
  sur la ligne de base optique du logotype.
- ETA : zone partenaires réglée (partenaire principal, partenaires secondaires, co-émetteurs à droite du bloc-marque
  pour les communiqués conjoints).
- BC : logos voisins alignés et séparés. CAP : visibilité due aux bailleurs de fonds. NEV : principe de
  co-signature.

**g. Favicon, icône d'application, avatar** : AGR p9 (symbole = favicon et avatar) ; ETA (avatar pour les réseaux
sociaux). Le niveau pro ajoute le jeu de tailles 16, 32, 180 et 512 px et la forme du masque (rond pour un avatar,
carré arrondi pour une icône d'application).

**h. Logo animé** : SLK p50 (chaque vidéo finit par le logo, animé ou fixe ; filigrane en haut à gauche à 50 %
d'opacité) ; GitHub publie une animation de l'Invertocat pour les génériques de fin, dont le fichier source est
fourni sur demande (https://brand.github.com/motion-identity).

**i. Interdits illustrés**, de 8 à 14 cas : SLK p24 ; BBC p12 (14 cas, dont « Don't scale the Bs individually »,
« Don't flip the Bs », « Don't create a new lockup », et une ancienne version barrée) ; DT p8 (9 cas, dont « ne pas
baisser l'opacité », « ne pas associer d'autre logo », « ne pas utiliser sur fond agité ») ; ETA p13 (spécifiques au
système : centrer, changer l'ordre, changer la graisse de l'intitulé, autre police).

### 2.4 Couleur

- **Fiche complète par couleur** : nom propre à la marque, HEX, RVB, CMJN, **Pantone C et U** (papier couché et non
  couché), et pour chaque code la consigne de son usage. Exemples : POR (Pantone Blue 072C pour le couché, 072U pour
  le non-couché, CMJN pour la quadrichromie, RVB pour l'écran, chaque code avec sa phrase d'usage) ; UNV p58
  (« Pantone pour les objets publicitaires, CMJN pour les publications, RVB et HEX pour le numérique ») ; ETA
  (24 couleurs nommées, par exemple Tuile, Glycine, Menthe ou Café crème #D8C634 / 605U).
- **Noms de couleur liés à la marque** : INS p25 (Kale #003D29, Carrot #FF7009, Cashew #FAF1E5) ; BBC (BlaBlaBlue,
  BlaBlaDarkBlue) ; Duolingo (« Feather Green », tiré de la mascotte, https://design.duolingo.com/identity/color).
- **Rôle et proportion** : INS p25 (« Kale et Cashew sont notre noir et blanc ; Carrot est le "palette cleanser" ») ;
  BBC p14 (« la taille de chaque bloc représente sa présence ») ; UNV (« le gris est réservé aux paragraphes, plus
  chaleureux que le noir »).
- **Teintes** : BBC p15 (teintes à 60, 40 et 20 %, plus une teinte 10 % plus foncée **réservée au numérique**) ;
  ETA p48 (chaque couleur déclinée pour le thème clair et le thème foncé, des pastels pour l'illustration, trois fluos
  à utiliser avec parcimonie).
- **Combinaisons et accessibilité** : SLK p28 (matrice de couples texte/fond qui passent le contraste, avec
  l'exception écrite : « Never typeset small blue text on aubergine ») ; BBC p16 (tableau avant-plan/arrière-plan,
  « pas plus de trois couleurs de marque dans un même design »).
- **Interdits couleur** : BBC p17 (« Don't create new colours / use black and white / add gradients / use too many
  colours / add textures / create transparency »).
- **Couleurs exceptionnelles** : POR (l'or, réservé aux objets de la présidence) ; ETA (deuil national).
- **Architecture par couleur** : DT p11 (une couleur par pôle) ; UNV (palette secondaire autorisée pour la
  signature).

### 2.5 Typographie

- **Familles, rôle et origine** : nom, fonderie ou dessinateur, année, licence. Exemples : POR (« Regular », Henrik
  Kubel / A2Type, 2012, du Light au Black) ; ETA p42-44 (Marianne, avec l'histoire de son dessin, et Spectral en
  complément).
- **Graisses autorisées par usage** : BBC p18 (texte courant en Light ou Regular uniquement) ; ETA (six graisses).
- **Hiérarchie chiffrée** :
  - SLK p33 : Headline 48 pt, Subtitle 30 pt, Quote 24 pt, Body 18 pt.
  - BBC p18 : titres égaux au texte ou multiples de 2× (2×, 4×, 6×, 8×, 10×).
  - POR (papeterie) : 7 pt sur 8,5 pt d'interlignage.
  - CFD : mentions en 6 pt Gotham Narrow Book.
  - Material Design 3 (référence web) : rôles display, headline, title, body et label en L/M/S (Body Large 16/24,
    Headline Large 32/40, Display Large 57/64), https://developer.android.com/develop/ui/compose/themes.
- **Approche et casse** : SLK p29-30 (Larsseit : crénage optique, approche 0, casse de phrase, jamais tout en
  capitales ; sur le web, −1 px sur les petits titres et −2 px sur les grands ; Circular : −10 en print, 0 px sur le
  web, −0,2 px pour un paragraphe d'accroche).
- **Alignement** : BBC p18 (texte calé à gauche ; centré seulement pour les déclarations courtes).
- **Polices de repli** : BBC p19 (Questrial quand GT Eesti manque ; Mulish pour le cyrillique) ; SLK p33 (Proxima
  Nova dans Google Slides) ; NEV (Arial 11 au minimum pour les courriers) ; CAP (Arial).
- **Langues** : SLK p35 (japonais 15 % plus petit, Noto Sans dans l'app ; FR, ES, DE et PT 10 % plus petits avec
  20 à 30 % de caractères en plus).
- **Interdits typographiques** : BBC p21 (effets, autre police, déformation, couleur nouvelle, guillemets
  alternatifs).
- **Typographie propriétaire d'expression** : CFD (police de ponctuation, « une lettre, deux au maximum par mot »).

### 2.6 Éléments graphiques et motif

- **Tiré du logo, avec ses règles de variation** : AGR p6 (trois formes issues du logo ; taille, couleur, inclinaison
  et transparence variables) ; POR « A Malha » (pictogrammes de la ville, liaisons entre icônes, construction de la
  trame, trames thématiques, trame et logo) ; INS p75 (« les angles vifs et ronds du symbole définissent les
  éléments d'interface et les cadres ») ; NEV (logo d'angle) ; BC (ruban, cartouches).
- **Ce qui est figé et ce qui est libre** ; un exemple juste, un exemple faux.

### 2.7 Iconographie

- Style (trait ou plein), épaisseur, rayon des angles, grille de dessin (24 px, par exemple), taille minimale,
  couleurs, familles d'usage. Exemples : SLK p45 (familles « Slack.com, Roles, Miscellaneous, Events ») ; CFD (pictos
  juridiques en blanc ou en orange, avec ou sans rond, taille minimale) ; POR (un pictogramme par lieu) ; Duolingo
  (formes toujours arrondies, « les formes pointues ne sont pas dans la marque »,
  https://design.duolingo.com/illustration).

### 2.8 Photographie

- **Principes nommés** : BBC p23 (« Emotionally authentic, Get local, Bright and optimistic, Diverse and proud ») ;
  SLK p48 (une échelle « du familier à l'aspirationnel » par catégorie : avatars, nature morte, lifestyle).
- **Catégories du parcours** : BBC p24 (avant le trajet, pendant, à destination).
- **Lumière et traitement** : BBC (« strong, warm, white light », lumière naturelle).
- **Éthique, consentement, légende et crédit** : UNV p62-75 (demander la permission ; ne jamais révéler l'identité
  d'une personne vulnérable ; légende normée « Nom, Volontaire de l'ONU national(e)/international(e), fonction,
  agence, pays », placée en bas à gauche).
- **Logo sur photo** : AGR p14-15.
- **Exemples justes et faux**, toujours.

### 2.9 Illustration

- Style, palette réduite, formes, personnages, ombres. Duolingo : peu de couleurs pour rester lisible en petit ;
  l'ombre est toujours plus foncée que sa surface ; règles pour les yeux et le nez des personnages
  (https://design.duolingo.com/illustration/characters). SLK p44 : « human, approachable, smart, witty but never
  silly ». INS p57-68 et BBC p29-36 y consacrent 8 à 12 pages.

### 2.10 Grille, mise en page, gabarits

- **Zones fixes** : ETA (zone émetteur, zone partenaires, zone d'expression ; formats verticaux et horizontaux,
  print et web) ; CFD (logo en haut à gauche avec la signature, titre en haut qui « répond » au logo, marge
  d'informations à gauche, adresse web dans la marge).
- **Grille chiffrée** : INS p86 (grille de carrés pour le 16:9, soit 120 px pour un écran de 1920×1080) ; ETA
  (affiche A4 : marges de 17 mm, modules de 11,4 mm et multiples) ; NASA (formats de couverture et grilles
  intérieures des publications, lien NASA ci-dessus).
- **Gabarits** : en-tête de lettre, carte de visite (85×55 mm), carte de correspondance (210×100 mm),
  communiqué, chacun **coté** (ETA, ANF, CAP).

### 2.11 Ton de voix et écriture

- **Principes** : UNV p8 (« comprendre les besoins, s'exprimer avec clarté, rester cohérent, communiquer avec
  assurance, partager notre fierté ») ; SLK p13-16 (le ton varie selon le public et le contexte, sans devenir trop
  familier ; ni jargon ni clichés de la Silicon Valley ; termes exclusifs interdits).
- **Une voix constante, un ton qui s'adapte** : Mailchimp (extraits de recherche,
  https://styleguide.mailchimp.com/voice-and-tone/) ; Shopify Polaris (« Be real, but not too tough or overly
  familiar », https://polaris.shopify.com/content/voice-and-tone).
- **Règles d'écriture vérifiables** : Monzo (voix active, pas de jargon, les mots du client, phrases courtes,
  https://monzo.com/tone-of-voice/).
- **Vocabulaire à dire et à ne pas dire**, avec des exemples de phrases réécrites.

### 2.12 Motion et vidéo

- **Principes de mouvement** (vitesse, sens, courbes d'accélération), animation du logo, génériques, synthés,
  sous-titres. Exemples : INS p83-93 (11 pages, dont la grille 16:9) ; SLK p50 (synthés : nom en Larsseit Bold, titre
  en Circular Book, fond à 80 % d'opacité ; filigrane à 50 %) ; ETA (intro et outro, filigrane, sous-titres, synthés,
  **bulle LSF**) ; CFD (structure d'une vidéo : début, présentation de l'interlocuteur, fin avec appel à l'action ;
  « le spectateur décide de rester dans les 10 à 15 premières secondes ») ; GitHub (principes de motion,
  https://brand.github.com/motion-identity/motion-guidelines).

### 2.13 Applications

- **Papeterie cotée** : POR (papier Munken Lynx 110 g, impression en Pantone Blue 072U) ; ETA (en-tête A4, carte
  85×55 mm, correspondance 210×100 mm, enveloppe, chemise).
- **Bureautique** : ETA (signature e-mail, masques Word, présentations A4 et 16:9) ; UNV (signature électronique,
  présentations) ; CAP (signature des courriels).
- **Numérique** : ETA (header, footer, avatar, cover, post, affichage fixe et animé) ; NEV (Facebook, site).
- **Signalétique** : ETA (plaque, fond de scène, pupitre, kakémono) ; POR (métro) ; NEV (panneau de chantier).
- **Objets** : DT (goodies) ; UNV (articles publicitaires) ; SLK p58 (règles du merchandising).

### 2.14 Gouvernance et ressources

- Où trouver les fichiers (BBC « Download our logos » ; UNV, URL de la boîte à outils), contact du service
  communication (CAP p31, BBC p47, TBS p2), droits et marque déposée (SLK p51-59), version et historique. Le cas de
  Mastercard montre l'enjeu : en 2016, Pentagram a dessiné le nouveau signe pour coexister avec les anciens pendant
  la transition (https://www.creativereview.co.uk/the-new-mastercard-logo-by-pentagram/). En 2019, le nom a été
  retiré du logo (https://www.dezeen.com/2019/01/10/mastercard-rebrand-pentagram-design/). Une charte pro dit donc
  **quelle version est en vigueur** (BBC p12 : « this previously created version should not be used anymore »).

---

## 3. Proposition : un jeu minimum de 14 pages denses (A4 paysage)

Principe : **une page = un sujet complet**. Le visuel domine ; une colonne de spécifications (cartouche chiffré)
remplace les pages découpées. La règle R19 (« ≤ 60 mots ») limiterait la prose, pas les données : les tableaux de
valeurs ne comptent pas dans ces 60 mots (à confirmer par le propriétaire).

| Page | Contenu obligatoire | Fusionne aujourd'hui |
|---|---|---|
| 1. Couverture | nom, « Charte graphique », version, date, émetteur | cover |
| 2. Sommaire et mode d'emploi | sommaire numéroté ; à qui sert la charte ; obligatoire ou libre ; fichiers ; contact ; version en vigueur | contents, closing |
| 3. Plateforme de marque | sens du signe décomposé (schéma légendé) ; mission ; vision ; 3 à 5 valeurs « X mais pas Y » ; règles de nom | brand-story, values |
| 4. Ton de voix | 3 à 4 principes ; axes ; 3 phrases « à dire / à éviter » ; vocabulaire ; texte standard | tone-of-voice |
| 5. Logo : anatomie et construction | éléments nommés ; grille avec l'unité X et ses cotes ; police du logo (R21) ; versions principale et secondaire avec leur cas d'usage | logo, logo-construction |
| 6. Versions et fonds | matrice fond clair, foncé, couleur de marque, photo claire, photo foncée × version adaptée ; un cas faux ; symbole seul, favicon 16/32/180/512 px, avatar | logo-variants, usages |
| 7. Protection et tailles | zone en X (mesure du logo) ; tailles minimales **par version** en mm et en px ; tableau de hauteurs par format (A5, A4, A3, affiche, écran 1920 px) ; placement par défaut | clear-space, minimum-size |
| 8. Co-branding et interdits | règle de cohabitation (ordre, espace, alignement) ; grille de 9 à 12 interdits barrés et légendés | misuse |
| 9. Couleurs : valeurs et rôles | fiche par couleur : nom, HEX, RVB, CMJN (approximation signalée), Pantone C/U si connu ; rôle en une ligne ; proportions propres à la marque | palette, color-ratio |
| 10. Couleurs : teintes et accessibilité | teintes (print et numérique) ; matrice texte/fond avec ratios WCAG, interdits barrés ; interdits couleur | contrast |
| 11. Typographie : familles | spécimen, graisses permises par usage, licence et source ; repli web et bureautique ; langues | typography |
| 12. Hiérarchie typographique | titre, sous-titre, chapô, texte, légende : corps en pt et en px, interlignage, approche, casse, alignement, sur un vrai texte ; interdits typographiques | type-hierarchy |
| 13. Langage visuel | motif ou formes issus du logo et leur règle ; pictogrammes (grille, trait, taille minimale) ; direction photo **ou** illustration (principes, juste et faux) | pattern, iconography, photography, illustration |
| 14. Mise en page et applications clés | grille cotée (marges, colonnes, zone du logo) ; 2 à 3 applications cotées : carte de visite, en-tête, post social ; tokens en annexe | grid-layout, stationery, social-media, tokens |

### Pages conditionnelles par secteur (de 1 à 4 de plus)

| Secteur | Pages ajoutées | Appui |
|---|---|---|
| Restauration, café, boulangerie | menu et carte (grille, hiérarchie des prix) ; emballage et vente à emporter ; enseigne et vitrine ; tenue | ADR-028 (sections `menu`, `packaging`, `uniform`) ; aucune charte du corpus : à sourcer par la bibliothèque Pinterest |
| Tech, SaaS, application | interface (composants nés du logo, INS p75) ; icône d'application et motion ; illustration ; mode sombre et tokens | INS, SLK, BBC, Duolingo, GitHub |
| Institution, collectivité, association | architecture des émetteurs ; partenaires et bailleurs ; bureautique ; signalétique et événement ; accessibilité (sous-titres, LSF) | ETA, POR, NEV, BC, CAP, CFD, UNV |
| Mode, beauté, luxe | direction photo détaillée (2 pages) ; étiquette et emballage ; boutique | à sourcer (pas de charte de ce secteur dans le corpus) |
| ONG, santé, humanitaire | éthique de la photo et légendes ; texte standard ; visibilité des bailleurs | UNV, CAP, TBS |
| Mobilité, transport | véhicules ; signalétique ; sous-marques | BBC, POR (métro), TfL, NASA (véhicules) |
| Recherche, données | data visualisation ; couleurs par pôle | DT |
| Média, syndicat, vidéo | charte vidéo (génériques, synthés, sous-titres) | CFD, ETA, SLK |

Avec ce jeu, une charte compte **14 pages** (de 15 à 18 avec le secteur), au lieu de 16 à 18 pages minces
aujourd'hui, pour environ **trois fois plus de règles chiffrées**.

---

## 4. Écart avec Charta aujourd'hui

**Cause commune.** Les 30 sections de la recherche (`reference.ts`) sont projetées sur **11 types de page**
(`SECTION_PAGE_TYPE`, `chart-plan.ts`), et `variant.ts` choisit le contenu d'une page **selon son rang parmi les pages
du même type**, pas selon sa section. Conséquences :

- `contents`, `brand-story`, `values` et `closing` sont tous de type `manifesto`. Le premier montre la vue
  d'ensemble, puis viennent mission, vision et valeurs (`manifestoView`). La page titrée « Sommaire » n'est donc
  **pas un sommaire**, et « Clôture » affiche les valeurs.
- 13 sections (`pattern`, `photography`, `illustration`, `stationery`, `packaging`, `signage`, `social-media`,
  `website`, `merchandise`, `uniform`, `vehicle`, `menu`) sont de type `mockup`. Chacune montre **trois scènes de
  mockup tournantes** (`mockupScenes`), sans rapport avec son titre. « Photographie » n'a aucune direction photo, et
  « Motifs » aucun motif.
- `iconography` est de type `logo` et `grid-layout` de type `typography` : ces pages affichent une vue du logo ou une
  page de glyphes.
- C'est ce qui produit 16 à 18 pages dont plusieurs se répètent ou ne disent rien. Il faut **moins de pages, chacune
  rendue selon sa section**.

| Section | Charta aujourd'hui | Manque ou reste superficiel |
|---|---|---|
| Couverture | nom, page cover | version, date, émetteur |
| Sommaire, mode d'emploi | pas de vrai sommaire (vue manifesto) ; la navigation du studio liste les pages mais n'est pas imprimée | sommaire numéroté, mode d'emploi, contact, fichiers à télécharger (R24) |
| Histoire, valeurs | mission, vision, 4 valeurs (texte de l'utilisateur, R4) | sens du signe décomposé sur le logo ; valeurs bornées « X mais pas Y » ; règles de nom ; texte standard |
| Ton de voix | 4 curseurs (`TONE_AXIS_IDS`) et jusqu'à 3 exemples | principes, phrases à dire et à éviter, vocabulaire, ton selon le contexte |
| Logo, construction | vue `construction` et recadrage du symbole (favicon) | cotes en X, désignation des éléments, version principale et secondaire avec leur cas d'usage |
| Versions et fonds | couleur, négatif, noir, blanc (R5) | photo claire et photo foncée, cas faux, jeu de tailles du favicon, avatar, logo pour petites tailles |
| Zone de protection | `clearSpaceRatio` 0,25 × H par défaut (`compose.ts`) | unité tirée d'une lettre ou d'une partie du logo (R6 la demande, le défaut est une marge arbitraire) |
| Taille minimale | 24 px et 12 mm, identiques pour toutes les marques (`compose.ts`) ; logo à ×1, ×2, ×4 | une valeur **par version** ; calcul selon le détail le plus fin du dessin ; tableau des tailles par format ; placement |
| Co-branding | absent | règle d'ordre, d'espace et d'alignement |
| Interdits | 14 cas (`DO_DONT_PANELS`), dont 12 qui peuvent avoir chacun sa page | bonne base ; un cas par page est l'inverse du but : une grille de 9 à 12 cas sur une page suffit ; ajouter « recréer », « réorganiser » et « ancienne version » |
| Palette | HEX, RVB, OKLCH, CMJN calculés ; parts fixes 34/24/22/20 | **Pantone** (absent du code) ; noms de couleur ; rôle en une ligne ; proportions propres à la marque ; jusqu'à 12 pages possibles, à regrouper en 2 |
| Contraste | matrice et couples (R3) | interdits couleur (dégradé, couleur inventée, trop de couleurs) ; teintes print et numérique |
| Typographie | familles, licence, glyphes en 4 jeux sur plusieurs pages | **polices de repli** web et bureautique ; graisses permises par usage ; langues ; les 8 pages de glyphes peuvent tenir sur une seule |
| Hiérarchie typographique | H1, H2, H3, chapô, texte, légende en unités de page relatives, interligne fixe à 1,1 | corps en pt et en px, interlignage, approche, casse et alignement **écrits** (R14) ; interdits typographiques (R15 sans rendu) |
| Motif, éléments graphiques | page mockup | motif réel tiré du logo et ses règles (R16) |
| Iconographie | vue du logo | style, grille, trait, taille minimale, exemples |
| Photographie | page mockup | principes, catégories, lumière, éthique, légende, juste et faux |
| Illustration | page mockup | style, palette, formes |
| Grille et mise en page | page de glyphes | marges, colonnes, zones, gabarits cotés |
| Motion | absent | principes, logo animé, génériques |
| Applications | 23 scènes de mockup en trios | rendu réel et utile ; manque la **cote** (dimensions, position du logo, corps du texte) qui en fait une règle et pas seulement une image |
| Bureautique | absent | signature e-mail, modèle de présentation |
| Architecture de marque | absent du vocabulaire | utile pour les institutions et les marques à plusieurs offres |
| Tokens | page dédiée | utile en tech ; ailleurs, à mettre en annexe ou dans l'export |

### Pistes (à décider, aucune n'est engagée)
1. Rendre **une page par section** (pas par type), avec une vue propre à chaque section, et plafonner le plan au
   jeu de 14 pages (§3), plus les pages du secteur.
2. Ajouter au contrat les données qui manquent : Pantone facultatif, tailles minimales par version, tableau des
   tailles par format, unité de protection nommée (« hauteur du a »), règles typographiques chiffrées, polices de
   repli, principes de ton.
3. Mesurer sur le logo plutôt que fixer : unité X, taille minimale déduite de l'épaisseur du trait le plus fin.
4. Mettre à jour `16_GUIDELINE_RULES.md` : R19 (densité des données), R12 (repli web), R7 (par version et par
   format), nouvelles règles pour le co-branding, la photographie et le ton.
