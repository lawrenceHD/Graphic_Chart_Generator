# Inspirations de mockups et de pages d'usage du logo — état, sources, pipeline

> Recherche du 2026-11-11, aucun code modifié. Les constats sur le dépôt viennent de la lecture des fichiers cités et
> de comptages faits ce jour. Les points juridiques résument les conditions publiées par chaque service (liens
> fournis) : ce n'est pas un avis juridique.

## 0. En bref

- **Le parcours ne lance aucune recherche par marque.** Le worker appelle `runResearch` (lecture du logo par Gemini,
  embedding, puis classement sur l'index déjà collecté). `buildDeepQueries` calcule bien 8 requêtes propres à la marque,
  mais elles ne servent qu'à la trace du rejeu et au script `research.mjs` : **aucun code ne les exécute**.
- **Le corpus utile est plus petit qu'il n'y paraît** : 1 500 images collectées sur 19 secteurs, mais seulement
  **492 analysées, sur 8 secteurs** ; les images brutes ont été supprimées (plan de nuit). **Restaurant : 3 références
  indexées**, finance, cosmétiques hors 81, tech, santé : 0. On ne peut plus réanalyser sans recollecter.
- **Pinterest interdit ce que fait `collect.py`** (extraction automatisée, stockage, usage pour l'IA sans accord). Le
  chemin propre : liens donnés par l'utilisateur, widgets officiels d'intégration pour l'affichage, Are.na (API ouverte
  sans clé) pour chercher, Unsplash ou Pexels pour les photos d'objets, Freepik/Magnific (payant) pour les mockups.
- Le studio montre aujourd'hui la « preuve » sous forme d'**identifiants opaques** (`e1_AfqPShw…`), ni image, ni lien,
  ni auteur. Il faut un panneau d'inspirations sourcées.

---

## 1. Ce qui existe dans le dépôt

### 1.1 Les outils (`tools/references/`)

| Fichier | Rôle | État |
|---|---|---|
| `collect.py` | Collecte Pinterest par secteur avec `pinterest-dl` (scraper tiers), 30 images par requête, ≥ 700×700, légende JSON, `manifest.json` | Fonctionne (`.venv/Scripts/pinterest-dl.exe` présent). Hors parcours : lancé à la main. |
| `sectors.json` | 19 secteurs, 2 ou 3 requêtes génériques chacun (« restaurant branding mockup », « fintech brand identity »…) | Requêtes larges, aucune ne vise la page d'usage du logo. |
| `analyze.py` | Fiche Gemini vision (`gemini-3.5-flash-lite`, sortie structurée : `kind`, `sections`, `mockups`, `styles`, classes typo, espace blanc, fond, palette, `quality` 1-5, `insight`) + embedding `gemini-embedding-2` 768 dim. Reprise, rythme du niveau gratuit (`--pace 4.5`). | Fonctionne. A été interrompu après 492 images (quota). |
| `fetch-on-demand.mjs` (`pnpm refs:on-demand`) | Pour UNE tâche (`--task mockups|charter`, `--sector`, `--subject`) : liens de pins ou d'images (`i.pinimg.com`, CDN Behance) lus comme un aperçu de lien (`og:image` seul), dépôt manuel (`--dir`), ou `--search` optionnel (même scraper). Analyse, ajoute à `corpus-reel/on-demand/index.jsonl` + `sources.json` (URL, sha256, date), **supprime les images brutes**. 1 requête / 2 s, arrêt sur 401/403/429. | Écrit et testé (`on-demand.test.ts`), **jamais exécuté** : `corpus-reel/on-demand/` n'existe pas. Hors parcours. |
| `research.mjs` | Lance `researchBrand` en ligne de commande et affiche `deepQueries` | Outil de développeur. |
| `derive-stats.mjs` (`pnpm refs:stats`) | Statistiques agrégées commitables (`derived/library-stats.json`) | À jour (492). |

### 1.2 Le paquet `packages/ai/src/references/` et `research.ts`

- `rank.ts` : score = similarité visuelle 0,40 + secteur 0,25 (avec secteurs voisins, `sectors.ts`) + styles 0,20 +
  palette ΔE OKLab 0,10 + qualité 0,05 ; bonus d'adéquation du `kind` selon `purpose` (`charter` ou `mockups`) ;
  MMR pour la diversité ; plancher qualité 3/5 ; 12 références retenues.
- `direction.ts` : plan de charte (sections communes + sections vues dans ≥ 25 % des références), mockups classés par
  fréquence (`mockups.ts` replie les synonymes : « mug » → « coffee cup »), vote des classes typo, de l'espace blanc,
  du fond. Chaque recommandation garde ses références.
- `on-demand.ts` : partie pure du téléchargement à la demande (`parseSourceLink`, `extractPreviewImage`,
  `onDemandQueries`, `createPacer`).
- `research.ts` : `researchBrand` → lecture du logo + embedding + `rankReferences` + `buildArtDirection` +
  `recommendPairings` + `buildDeepQueries(reading, direction.mockups)`.

### 1.3 Ce qui est branché dans le parcours

`apps/worker/src/index.ts` : si une clé Gemini est configurée, `aiResearch` → `runResearch` (`packages/ai/src/run-research.ts`)
avec `readIndex: () => readCorpusIndex(corpusDir)` (concatène tous les `index.jsonl` sous `corpus-reel/`), `purpose: 'charter'`.
Sortie gardée : **le `ChartPlan` seul** (sections, titres, `evidence` = ids de références). Repli sur le plan standard de
16 pages si l'IA, l'index ou le plan échoue (`planWithFallback`), rejeu enregistré pour la démo.

| Élément | Branché ? |
|---|---|
| Lecture du logo, embedding, classement sur l'index local | Oui (étape 4 de l'analyse) |
| Plan de pages sourcé (`evidence`) | Oui ; le studio l'affiche en pied de page : `evidenceLine` montre les 3 premiers ids (`apps/web/src/studio/pages/variant.ts`) |
| `direction.mockups` (scènes conseillées), typo, fond, conseils | **Non** : calculés puis jetés (seul `plan` traverse `aiResearch`) ; les scènes viennent de `sceneCategory` et de `mockupScenes` |
| `purpose: 'mockups'` | Non : le worker envoie toujours `charter` |
| `buildDeepQueries` → collecte | **Non** : aucune exécution, ni dans le worker ni dans un job |
| `fetch-on-demand.mjs` | Non (script manuel, jamais lancé) |
| Affichage d'images d'inspiration avec source | Non (les ids ne sont ni cliquables ni illustrés ; l'index ne garde pas l'URL, seule `manifest.json` la garde) |

**Réponse à la question** : après l'analyse d'un logo, Charta **ne cherche rien de nouveau** pour la marque ; il classe
le corpus déjà collecté.

### 1.4 Le corpus (comptage du 2026-11-11)

- `corpus-reel/pinterest/manifest.json` : **1 500 images collectées** (sources `i.pinimg.com/originals/…`, pin d'origine).
- `corpus-reel/pinterest/index.jsonl` : **492 références analysées** (4,3 Mo, embeddings 768 dim).
- Images brutes : **0** dans les 19 dossiers de secteur (supprimées, `docs/team/NIGHT-PLAN.md` vague A). Seuls l'index
  et le manifeste restent. Le README du corpus note qu'ils ne sont pas dans le dépôt privé de sauvegarde.
- Autres dossiers : 35 images en vrac à la racine, 28 fichiers dans `new/`, 11 chartes PDF dans `chartes/` (non indexés
  par `analyze.py`).

| Secteur | Collectées | Indexées |
|---|---:|---:|
| agriculture-food-products | 87 | 87 |
| consulting-legal | 88 | 88 |
| beauty-cosmetics | 81 | 81 |
| cafe-bakery | 81 | 81 |
| education | 75 | 75 |
| african-brands | 74 | 73 |
| fashion | 59 | 4 |
| **restaurant** | 78 | **3** |
| finance | 90 | 0 |
| health-clinic | 90 | 0 |
| hospitality-events | 90 | 0 |
| media-music-creative | 90 | 0 |
| real-estate-construction | 86 | 0 |
| retail-ecommerce | 86 | 0 |
| tech-startup | 82 | 0 |
| transport-logistics | 83 | 0 |
| ngo-community | 75 | 0 |
| sport-fitness | 75 | 0 |
| kids-family | 30 | 0 |
| **Total** | **1 500** | **492** |

Types d'images indexées : brand-board 203, logo-presentation 84, guideline-spread 75, mockup-scene 60, packaging 37,
stationery 14, social-media 7, signage 6, apparel 5, other 1. Qualité : 5/5 = 353, 4/5 = 114, 3/5 = 24, 2/5 = 1.
Mockups les plus vus : carte de visite 121, gobelet 54, tote bag 50, papier à en-tête 41, carnet 37, sac papier 35,
enseigne 30, enveloppe 30, smartphone 29.

Conséquences : pour La Mèza (restauration), le classement repose sur 3 références du secteur plus les secteurs voisins
(café-boulangerie, agroalimentaire). Une fintech ou une marque tech ne trouve **aucune** référence de son secteur
(avertissement `sector-not-indexed`). Les **pages d'usage du logo** (taille minimale, zone de protection, interdits)
ne sont pas un `kind` à part : elles se fondent dans `guideline-spread` et `logo-presentation`.

---

## 2. Sources : accès technique et droits

Légende : **Montrer** = afficher l'image dans le studio ; **Stocker** = garder une copie ; **IA** = l'envoyer à Gemini
(analyse, embedding).

| Source | Accès technique | Montrer | Stocker | IA | Verdict pour Charta |
|---|---|---|---|---|---|
| **Pinterest** | API v5 OAuth, app approuvée (Trial puis Standard : vidéo du flux OAuth exigée). Recherche publique : `GET /v5/search/partner/pins` (`term`, `country_code`, `locale`, `limit`), **bêta, non ouverte à toutes les apps**, « top 10 pins » selon le support. Les autres recherches ne portent que sur les tableaux et pins de l'utilisateur connecté. Aucune API publique de recherche visuelle (Lens) trouvée. Apps créées après le 14/09/2026 : `403 PINNER_DATA_ACCESS_DENIED` possible sans autorisation. | Oui, avec lien vers le pin et mention Pinterest, sans filtre ni recouvrement ; le widget officiel d'intégration est la voie sûre | **Non** (« you may not store any information accessed through any Pinterest Materials ») | **Non** sans accord exprès (entraîner, ajuster ou « améliorer » un modèle) ; extraction automatisée interdite | `collect.py` et `--search` contreviennent aux règles. Garder : liens fournis par l'utilisateur + widget d'intégration. Demander l'accès à `search/partner/pins` (compte développeur, gratuit). |
| **Dribbble** | API v2 OAuth, 60 req/min, 1 440/jour ; seulement les shots de l'utilisateur connecté, **pas de recherche** | Oui pour ses propres shots | Non (« scraping, copying, saving, or storing our data is strictly prohibited ») | Non précisé : demander | Pas de recherche possible. Liens fournis par l'utilisateur, affichés en lien sortant. |
| **Behance** | API publique fermée aux nouveaux clients (support Behance, réponses Adobe : migration sans date) | Lien sortant | Non | Non | Liens fournis par l'utilisateur seulement (le CDN Behance est déjà admis par `parseSourceLink`). |
| **Are.na** | API v2 **ouverte sans clé pour le public** : `https://api.are.na/v2/search/channels?q=brand+guidelines` répond (`authenticated: false`, ~70 pages de 5 canaux) ; aussi `/v2/search/blocks` | Avec lien vers le bloc et sa source d'origine | À éviter (conditions : pas de téléchargement en masse sans accord) | Non mentionné ; demander | **Meilleure source de recherche gratuite et propre** : canaux tenus par des designers (« logo guidelines », « brand guidelines », « mockups »). Usage modéré, demande d'accès élargi par contact. |
| **Unsplash** | API, 50 req/h en démo, 1 000/h en production ; `GET /search/photos` (`color`, `orientation`, `content_filter`) | Oui, en **hotlink** obligatoire des URL de l'API, crédit photographe + Unsplash | Non (usage des URL de l'API) ; signaler les téléchargements (`/photos/:id/download`) | Voir unsplash.com/data (accord séparé) | Bon pour les photos d'objets et de lieux servant de fond de scène, affichées par hotlink. |
| **Pexels** | API, 200 req/h, 20 000/mois (relevable gratuitement) ; `/v1/search` (`orientation`, `size`, `color` hex, `locale`) | Oui, lien « Photos provided by Pexels » + crédit | Non précisé (licence Pexels permissive pour les photos) | Non précisé | Alternative à Unsplash, filtre couleur hex utile pour accorder une scène à la palette. |
| **Freepik / Magnific** (marque renommée, la doc redirige vers `docs.magnific.com`) | API par clé `x-magnific-api-key` ; `GET /v1/resources?term=…&filters[content_type][mockup]=1&filters[license][freemium]=1` | Selon licence (gratuite : attribution) | Selon licence | Selon conditions IA | **Seule source de mockups PSD par API.** Crédits d'essai (~5 € annoncés par des sources tierces, à vérifier), puis payant. Décision du propriétaire. |
| **Envato** | API Market (OAuth, recherche d'items, GraphicRiver) ; Elements : API réservée aux affiliés | Aperçus | Non (pas d'extraction) | Non | Payant à l'usage ; peu utile pour l'inspiration. |
| **Mockup World** | Pas d'API ; chaque mockup a la licence de son auteur (« A free download does not, by itself, define the permitted uses ») | Lien | Selon auteur | Selon auteur | Catalogue manuel pour la réalisation de nos propres scènes, pas pour l'inspiration automatique. |
| **Brand New (UnderConsideration)** | Pas d'API ; critiques éditoriales, partie des visuels réservée aux abonnés | Lien sortant | Non | Non | Lecture humaine : excellente pour les « sample applications » d'une refonte. |
| **Fonts In Use** | Pas d'API trouvée ; contenu reproduit au titre du fair use, licence non commerciale | Lien sortant | Non | Non | Source humaine pour la typographie en situation. |
| **Mobbin** | Pas d'API publique ; offres Free/Pro/Team | Non | Non | Non | Interfaces d'apps (fintech) : référence humaine, compte payant. |
| **Savee** | La charte d'usage interdit l'extraction sauf API publique explicitement permise (aucune trouvée) | Lien | Non | Non | Lien sortant seulement. |
| **Cosmos, Designspiration** | Pas d'API publique trouvée | Lien | Non | Non | Lien sortant seulement. |

Point Gemini : les images envoyées au **niveau gratuit** de l'API Gemini peuvent servir à Google pour améliorer ses
produits (conditions des « Unpaid Services »). C'est acceptable pour des images publiques d'inspiration, **pas pour le
logo privé d'un client** : à trancher par le propriétaire (le parcours envoie déjà le logo).

---

## 3. Requêtes qui ramènent les meilleurs résultats

### 3.1 Principes

- Nommer l'**objet** et le **format** avant le secteur : « coffee cup mockup » rapporte des scènes ; « restaurant
  branding » rapporte surtout des planches (brand boards).
- Les pages d'usage se trouvent avec le **vocabulaire des chartes** : « logo clear space », « minimum size », « logo
  misuse », « logo don'ts », « logo construction grid », « logo lockup », « responsive logo », « app icon grid »,
  « brand guidelines spread ».
- Ajouter un **qualificatif d'esprit** (warm, playful, editorial, minimal, premium, bold) et un **qualificatif de
  rendu** (« photography », « realistic », « flat lay », « in situ ») ; éviter « free », « template », « psd » qui
  ramènent des gabarits de banques d'images.
- L'anglais rapporte 5 à 10 fois plus que le français ; une requête française par lot suffit pour l'ancrage local
  (« charte graphique restaurant »).
- Pour l'usage du logo, viser des **marques réelles** : « <marque> brand guidelines logo » (Spotify, Wise, Atlassian…).

### 3.2 Restauration conviviale (type La Mèza)

Mockups : `restaurant menu mockup warm`, `takeaway packaging branding bistro`, `paper bag kraft logo mockup restaurant`,
`restaurant storefront signage branding`, `waiter apron logo embroidery`, `table setting branding napkin coaster`,
`neighborhood restaurant brand identity playful`, `mediterranean restaurant branding`, `pizza box branding`,
`charte graphique restaurant convivial`.
Usage du logo : `restaurant brand guidelines logo usage`, `restaurant logo clear space minimum size`,
`food brand logo variations stamp monogram`, `restaurant logo lockup horizontal stacked`, `restaurant brand book spread`.

### 3.3 Fintech

Mockups : `fintech app branding mockup`, `bank card design mockup branding`, `fintech brand identity system bold`,
`neobank brand identity`, `payment terminal branding mockup`, `fintech billboard branding`, `app icon fintech grid`.
Usage du logo : `fintech brand guidelines logo`, `app icon construction grid`, `logo safe area minimum size digital`,
`responsive logo system`, `logo on photography rules`, `co-branding lockup partner logo guidelines`.

### 3.4 Cosmétiques

Mockups : `skincare packaging mockup minimal`, `dropper bottle branding`, `cosmetic jar label mockup`,
`beauty brand identity editorial`, `clean beauty packaging pastel`, `cosmetics shopping bag branding`,
`skincare social media branding grid`.
Usage du logo : `beauty brand guidelines logo usage`, `cosmetics logo on packaging placement`,
`monogram logo variations luxury`, `logo minimum size packaging label`, `brand guidelines serif luxury`.

### 3.5 Construction automatique (à partir de `LogoReading` et de `direction.mockups`)

```
mockups   : "<objet> mockup <esprit> <secteur>"           (3 objets conseillés par direction.mockups)
scène     : "<objet> <secteur> branding photography"       (photo réelle plutôt que gabarit)
usage     : "<secteur> brand guidelines logo usage"
            "<lettrage> logo clear space minimum size"     (ex. "script logo", "monogram logo")
            "logo variations <esprit>"
ancrage   : "charte graphique <secteur FR>"
```
`buildDeepQueries` couvre déjà les lignes 1, 3 et le lettrage ; il lui manque les requêtes d'**usage du logo** et de
**scène photographique**, et une séparation par destination (`mockups` / `usage`).

---

## 4. Exemples remarquables

Pages d'usage du logo (marques réelles, consultables publiquement) :

| Exemple | URL | Ce qui le rend bon |
|---|---|---|
| Spotify, guide de design | https://developer.spotify.com/documentation/design | Règles chiffrées et imprimables : zone d'exclusion = moitié de la hauteur de l'icône, minimum 70 px / 20 mm (logo) et 21 px / 6 mm (icône), vert seulement sur noir ou blanc, sinon monochrome ; interdits concrets (rotation, remplissage, logo dans une phrase). Modèle pour notre page « taille minimale ». |
| Atlassian, logos | https://atlassian.design/foundations/logos | Système de **verrouillages** (logo + nom d'app, attribution, propriété), taille minimale pour les versions à signature (280 px), interdiction de recomposer. Modèle pour une marque à sous-marques. |
| TikTok, brandbook | https://tiktokbrandbook.com/d/HhXfjVK1Poj9/design#/basics/logo | Logos primaire, secondaire, tertiaire et co-branding, cité par Frontify. Hiérarchie claire des variantes. |
| Wise Design | https://wise.design/foundations/logo | Fintech : logo, drapeau (symbole), fonds autorisés ; site rendu en JavaScript, non lu par l'outil, à vérifier à l'œil. |
| Uber Brand | https://brand.uber.com/ | Référence de site de marque modulaire (logo, couleur, typo, iconographie, photo) ; rendu JavaScript, à vérifier à l'œil. |
| NASA Graphics Standards Manual (1975) | https://www.standardsmanual.com/products/nasa-graphics-standards-manual | Le classique : construction du « worm », grilles, applications (véhicules, papeterie). Référence pour la page construction. |
| Frontify, guide de l'usage du logo | https://www.frontify.com/en/guide/logo-usage-guidelines | Liste des 10 composants d'une page d'usage (variantes, tailles, espacement, couleurs, placement, interdits, co-branding, usage externe) : bonne grille de contrôle pour notre plan. |

Mockups et applications :

| Exemple | URL | Ce qui le rend bon |
|---|---|---|
| Burger King par Jones Knowles Ritchie, critique Brand New (2021) | https://www.underconsideration.com/brandnew/archives/new_logo_and_identity_for_burger_king_by_jones_knowles_ritchie.php | Restauration conviviale exemplaire : emballages, uniformes, enseignes et app forment un système ; le logo vit à toutes les tailles. Une partie des visuels est réservée aux abonnés. |
| Brand New, archive « food » | https://underconsideration.com/brandnew/archives/industry/food/ | Toutes les refontes de la restauration avec leurs applications : la meilleure source humaine pour choisir des scènes crédibles. |
| Are.na, canaux « brand guidelines » | https://www.are.na/search/brand%20guidelines | Sélections de designers, accessibles par API sans clé. |
| Recherches de départ (à ouvrir à la main) | https://www.behance.net/search/projects/logo%20guidelines · https://dribbble.com/search/logo-guidelines · https://www.pinterest.com/search/pins/?q=logo%20clear%20space%20minimum%20size | Points d'entrée manuels ; les liens retenus passent ensuite par `refs:on-demand --url`. |

Ce qui distingue une bonne page d'usage : (1) des **valeurs mesurables** (zone de protection exprimée dans une unité du
logo, minimum en px **et** en mm) ; (2) chaque variante liée à un **cas d'usage** (horizontal pour l'en-tête, symbole
pour l'icône d'app) ; (3) des **interdits montrés**, pas décrits ; (4) les **fonds autorisés** sur une grille de
couleurs et de photos. Un bon mockup : objet réel du secteur, lumière naturelle, logo à l'échelle juste (pas centré
géant), deux à trois applications par planche au plus, palette de la marque reprise dans le décor.

---

## 5. Pipeline proposé pour Charta

### 5.1 Étapes

1. **Requêtes** (pur, `packages/ai`) : étendre `buildDeepQueries` en `buildInspirationQueries(reading, direction)` →
   `{ mockups: string[], usage: string[], scenes: string[] }`, 4 + 3 + 3 requêtes au plus (§3.5), langue EN + 1 FR.
2. **Collecte** (worker ou outil, port injecté), par ordre de conformité :
   - a. **index local** (l'existant, toujours) ;
   - b. **Are.na** `search/blocks` et `search/channels` (gratuit, sans clé), 1 requête / 2 s, plafond 40 candidats ;
   - c. **liens fournis par l'utilisateur** (Pinterest, Behance, Dribbble) : déjà géré par `parseSourceLink` /
     `extractPreviewImage` ;
   - d. **Pinterest `search/partner/pins`** si l'accès est accordé (10 résultats par terme) ;
   - e. **Unsplash / Pexels** pour les photos d'objets des scènes (filtre couleur = couleur primaire).
   Le scraper `pinterest-dl` sort du parcours (et `--search` devrait être retiré ou réservé à un usage explicitement
   accepté par le propriétaire).
3. **Filtre qualité** (Gemini vision, niveau gratuit) : fiche existante d'`analyze.py`, enrichie de deux champs :
   `kind` « logo-usage » (zone de protection, taille minimale, interdits, construction) et `fit` 1-5 à l'esprit de la
   marque. Envoi en **miniature** (≤ 512 px) : moins de jetons, et la plupart des sources servent des aperçus légers.
   Rejet : qualité < 4, texte illisible, filigrane, rendu IA évident, doublon (embedding cosinus > 0,95).
4. **Sélection** : `rankReferences` avec `purpose: 'mockups'` pour les scènes et un nouveau `purpose: 'usage'` ;
   MMR ; **6 à 10 inspirations** : 4-6 mockups, 2-3 pages d'usage, 0-1 planche de marque.
5. **Décision** (`buildArtDirection`, déjà écrit) : scènes = objets les plus fréquents des retenues, croisés avec le
   catalogue de scènes WebGL disponibles ; mise en page = vote fond / espace blanc / grille ; sections d'usage à
   produire (zone de protection, minimum, interdits, variantes) d'après les pages d'usage retenues. Faire traverser
   `direction` jusqu'au document (aujourd'hui seul `plan` passe), avec `evidence`.
6. **Affichage dans le studio** : panneau « Inspirations » séparé de la charte, vignette **servie par la source**
   (widget Pinterest, hotlink Unsplash, image Are.na), titre, auteur si connu, **lien vers l'original**, mention
   « Inspiration externe, propriété de son auteur — non intégrée à votre charte ». Jamais dans l'export PDF, jamais en
   arrière-plan d'une page. Le pied de page « preuve » renvoie vers ces vignettes au lieu d'afficher des ids.
7. **Conservation** : garder la fiche, l'embedding et l'URL source (comme `sources.json`) ; jamais l'image, sauf
   source qui l'autorise. Bouton « retirer » et purge sur demande de l'auteur (Dribbble exige 24 h).

### 5.2 Coût et quotas (niveau gratuit)

Par marque : 1 lecture de logo + 1 embedding (existant) + ~30 candidats × (1 fiche + 1 embedding) ≈ 62 appels. Au
rythme d'`analyze.py` (4,5 s), ~5 minutes : trop long en direct. Donc : tâche **en arrière-plan** après l'analyse, la
charte s'ouvre avec l'index local et le panneau se remplit ensuite ; cache par requête (même secteur + esprit = mêmes
candidats) ; plafond de candidats par jour. Réutiliser `withBudget` et l'arrêt `AI_QUOTA`.

### 5.3 Gratuit / compte / dépense (à faire décider)

| Élément | Gratuit sans compte | Compte gratuit à créer | Dépense |
|---|---|---|---|
| Index local, classement, direction | Oui (existant) | | |
| Are.na (recherche publique) | Oui | Compte pour un accès élargi (contact Are.na) | |
| Liens fournis par l'utilisateur | Oui (existant) | | |
| Pinterest `search/partner/pins` | | App développeur + compte Business, accès bêta à demander, passage Standard (vidéo OAuth) | |
| Widget d'intégration Pinterest | Oui | | |
| Unsplash | | Clé API (démo 50 req/h, production sur dossier) | |
| Pexels | | Clé API | |
| Gemini vision et embedding | | Clé existante, niveau gratuit (données réutilisables par Google) | Niveau payant si la confidentialité des logos l'exige |
| Freepik / Magnific (mockups PSD) | | Compte | Crédits API (essai puis prépayé) |
| Envato, Mobbin, Brand New (abonnement) | | | Abonnements |

### 5.4 Décisions à prendre par le propriétaire

1. Retirer `collect.py` / `--search` du flux (non conforme aux règles Pinterest) et ne garder l'index actuel que pour la
   démo interne, ou le reconstruire à partir de sources conformes ?
2. Demander l'accès Pinterest (`search/partner/pins`) et créer les clés Unsplash / Pexels ?
3. Logo client au niveau gratuit de Gemini : accepté, ou passer au niveau payant ?
4. Budget Freepik/Magnific pour des mockups réalistes ?
5. Lancer la collecte d'inspirations pour chaque marque en arrière-plan (≈ 60 appels Gemini) ou seulement sur bouton
   « Chercher des inspirations » ?

---

## Sources

- Pinterest, règles développeur : https://policy.pinterest.com/en/developer-guidelines
- Pinterest, niveaux d'accès : https://developers.pinterest.com/docs/key-concepts/access-tiers/
- Pinterest, recherche par API (support) : https://community.pinterest.biz/t/does-pinterest-api-allow-search/28879
- Pinterest, `search/partner/pins` (spécification OpenAPI) : https://apis.io/apis/pinterest/pinterest-search-api/ ·
  https://developers.qodex.ai/pinterest-collections/pinterest-rest-api-5-12-0/search-partner-pins/search-pins-by-a-given-search-term
- Pinterest, demandes d'accès : https://community.pinterest.biz/t/update-developer-app-approvals/45527?page=10
- Dribbble, conditions de l'API : https://developer.dribbble.com/terms/ ; API v2 : https://developer.dribbble.com/v2/
- Behance, API fermée : https://experienceleaguecommunities.adobe.com/adobe-developer-20/where-can-i-find-behance-api-144990 ·
  https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/63322822/behance-api-not-let-me-create-api-key ·
  https://wordpress.org/support/topic/api-behance-not-available/
- Are.na, API : https://api.are.na/v2/search/channels?q=brand+guidelines ; conditions : https://www.are.na/terms
- Unsplash, documentation : https://unsplash.com/documentation ; conditions API : https://unsplash.com/api-terms
- Pexels, documentation : https://www.pexels.com/api/documentation/
- Freepik / Magnific : https://docs.magnific.com/introduction ·
  https://docs.magnific.com/api-reference/resources/get-all-resources · https://FREEPIK.COM/api/pricing ·
  https://usagepricing.com/blueprint/freepik
- Envato, conditions API : https://help.market.envato.com/hc/en-us/articles/42875085863705-Envato-Market-API-Terms ·
  https://build.envato.com/api
- Mockup World, FAQ licences : https://www.mockupworld.co/faq/
- Fonts In Use : https://fontsinuse.com/terms-and-conditions-of-use/ · https://www.fontsinuse.com/faq
- Savee, charte d'usage : https://savee.it/aup
- Mobbin, conditions (copie tierce) : https://backiee.wasmer.app/https_www_mobbin_com/terms
- Gemini API, conditions : https://ai.google.dev/gemini-api/terms
- Exemples : https://developer.spotify.com/documentation/design · https://atlassian.design/foundations/logos ·
  https://tiktokbrandbook.com/d/HhXfjVK1Poj9/design#/basics/logo · https://wise.design/foundations/logo ·
  https://brand.uber.com/ · https://www.standardsmanual.com/products/nasa-graphics-standards-manual ·
  https://www.frontify.com/en/guide/logo-usage-guidelines ·
  https://www.underconsideration.com/brandnew/archives/new_logo_and_identity_for_burger_king_by_jones_knowles_ritchie.php ·
  https://underconsideration.com/brandnew/archives/industry/food/
- Recueils d'exemples : https://www.manypixels.co/blog/post/best-brand-guide-examples ·
  https://www.ebaqdesign.com/blog/brand-guidelines · https://brandyhq.com/blog/logo-usage-guidelines/
