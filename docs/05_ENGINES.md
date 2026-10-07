# 05 — Moteurs déterministes

> Statut : **validé** — Version 4.0 — 2026-10-07
> Packages concernés : `color-engine`, `svg-engine`, `logo-kit`.
> Cette spécification donne **les formules et les règles exactes**. L'agent de code ne les réinterprète pas (`AGENTS.md` §8).
> Vecteurs de référence : `docs/golden/color.golden.json` (calculés indépendamment, en Python, et recoupés avec les valeurs publiées de Sharma et al. pour CIEDE2000).

---

## 1. Conventions

- Couleur d'entrée/sortie : chaîne `#RRGGBB` **en majuscules**. Toute entrée est validée (`^#[0-9A-Fa-f]{6}$`) puis normalisée. Les formes courtes (`#RGB`) sont refusées au niveau des contrats, acceptées uniquement par un parseur dédié.
- Les canaux 8 bits sont arrondis au plus proche (`Math.round`) ; les calculs internes restent en `number` double précision.
- Fonctions **pures**, sans état, sans horloge, sans aléatoire. Mêmes entrées → mêmes sorties, à l'octet près.
- Les seuils de contraste se comparent sur la valeur **non arrondie**.

---

## 2. `color-engine`

### 2.1 Conversions

**sRGB ↔ linéaire** (par canal, valeur `c` dans [0, 1]) :
- vers linéaire : `c ≤ 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`
- depuis linéaire : `x ≤ 0.0031308 ? 12.92·x : 1.055·x^(1/2.4) − 0.055` (avec `x` borné à [0, 1] avant conversion)

**Luminance relative** (WCAG) : `L = 0.2126·R + 0.7152·G + 0.0722·B` sur les canaux linéaires.

**sRGB (linéaire) → OKLab** (Ottosson) :
```
l = 0.4122214708·R + 0.5363325363·G + 0.0514459929·B
m = 0.2119034982·R + 0.6806995451·G + 0.1073969566·B
s = 0.0883024619·R + 0.2817188376·G + 0.6299787005·B
l' = cbrt(l)   m' = cbrt(m)   s' = cbrt(s)
L = 0.2104542553·l' + 0.7936177850·m' − 0.0040720468·s'
a = 1.9779984951·l' − 2.4285922050·m' + 0.4505937099·s'
b = 0.0259040371·l' + 0.7827717662·m' − 0.8086757660·s'
```

**OKLab → sRGB (linéaire)** :
```
l' = L + 0.3963377774·a + 0.2158037573·b
m' = L − 0.1055613458·a − 0.0638541728·b
s' = L − 0.0894841775·a − 1.2914855480·b
l = l'^3   m = m'^3   s = s'^3
R =  4.0767416621·l − 3.3077115913·m + 0.2309699292·s
G = −1.2684380046·l + 2.6097574011·m − 0.3413193965·s
B = −0.0041960863·l − 0.7034186147·m + 1.7076147010·s
```

**OKLCH** : `C = √(a² + b²)`, `h = atan2(b, a)` en degrés dans [0, 360). **La teinte d'une couleur achromatique (C < 0,0004) est indéfinie** : la retourner comme `0` et ne jamais l'utiliser en comparaison.

**HSL** : formule standard, utilisée uniquement pour l'affichage.

### 2.2 Contraste WCAG 2.2

`ratio = (Lmax + 0.05) / (Lmin + 0.05)`, symétrique, dans [1, 21].

Classification (`wcagLevel(ratio)`), sur valeur non arrondie :

| Ratio | Niveau retourné |
|---|---|
| `< 3` | `fail` |
| `≥ 3` et `< 4.5` | `large-ui` (grand texte, composants d'interface) |
| `≥ 4.5` et `< 7` | `aa` |
| `≥ 7` | `aaa` |

Affichage : valeur **tronquée** à 2 décimales (jamais arrondie vers le haut : `4.499` s'affiche `4.49`, jamais `4.50`).

### 2.3 Distance de couleur

- **ΔE_OK** : distance euclidienne dans OKLab (échelle 0–1). Utilisée pour fusionner et comparer dans l'extraction.
- **ΔE2000** (CIEDE2000, Sharma et al. 2005) : utilisée pour qualifier l'écart de gamut du CMJN. Implémentation exacte selon l'article ; recoupée par les trois paires publiées (`docs/golden`).

### 2.4 Extraction de palette

Entrée : image décodée RGBA (largeur, hauteur, `Uint8ClampedArray`), **réduite par l'appelant à 512 px maximum sur le plus grand côté avec un noyau « plus proche voisin »** (aucun mélange de couleurs). Paramètres par défaut : `mergeThreshold = 0.04`, `minShare = 0.005`, `maxClusters = 8`, `chromaticThreshold = 0.04`.

Algorithme (chaque étape est déterministe) :

1. **Pixels retenus** : `alpha ≥ 230`. Les pixels semi-transparents (bords) sont ignorés.
2. **Fond opaque** : si ≥ 90 % des pixels du pourtour sont de la même couleur (ΔE_OK < 0,01) **et** que cette couleur couvre ≥ 30 % des pixels retenus, elle est exclue (logo sur fond uni).
3. **Bords anti-aliasés** : exclure les pixels dont au moins un voisin (haut, bas, gauche, droite) diffère de plus de 0,05 en ΔE_OK. **Repli** : si après cette exclusion il reste moins de 1 % des pixels retenus, on la désactive (traits très fins).
4. **Histogramme exact** : comptage par couleur RGB distincte.
5. **Tri** : population décroissante ; à égalité, hexadécimal croissant.
6. **Fusion gloutonne** : pour chaque couleur dans l'ordre, si une grappe existante est à ΔE_OK < `mergeThreshold` de son **centre** (la couleur la plus lourde de la grappe, jamais une moyenne), on l'y ajoute ; sinon on crée une grappe.
7. **Filtrage** : supprimer les grappes de part < `minShare` des pixels retenus, sauf s'il en reste moins de 2. Limiter à `maxClusters` en fusionnant les plus petites dans la plus proche.
8. **Sortie** : liste triée par part décroissante : `{ hex, share, oklab, oklch }`.

Cas particulier : aucune grappe (image vide ou entièrement transparente) → erreur de valeur `EMPTY_IMAGE`.

### 2.5 Attribution des rôles

Une grappe est **chromatique** si `C ≥ chromaticThreshold`, sinon **neutre**.

| Rôle | Règle | Si impossible |
|---|---|---|
| `primary` | Grappe chromatique de plus grande part (à égalité : plus grand `C`) | Plus grande grappe, quelle que soit sa nature |
| `accent` | Parmi les autres grappes chromatiques de part ≥ 2 % et ΔE_OK(primary) ≥ 0,12 : celle de plus grand `C` | **Dérivée** (§2.6) |
| `neutralDark` | Grappe neutre de plus faible `L`, avec `L ≤ 0.35` | **Dérivée** |
| `neutralLight` | Grappe neutre de plus forte `L`, avec `L ≥ 0.90` | **Dérivée** |
| `extra` | Jusqu'à 4 grappes restantes de part ≥ 2 % | Liste vide |

Chaque jeton porte `source: 'extracted' | 'derived'`.

### 2.6 Couleurs dérivées

Soit `(Lp, Cp, hp)` l'OKLCH du `primary`. Si `primary` est achromatique, `hp = fallbackHue` (paramètre, défaut `265`). Toute couleur dérivée est ramenée dans le gamut sRGB (§2.7) puis arrondie.

| Rôle dérivé | L | C | h |
|---|---|---|---|
| `accent` | `Lp < 0.60 ? 0.75 : 0.55` | `clamp(Cp, 0.10, 0.20)` | `(hp + 180) mod 360` si `primary` chromatique, sinon `fallbackHue` |
| `neutralLight` | 0.97 | `primary` chromatique ? 0.01 : 0 | `hp` |
| `neutralDark` | 0.20 | `primary` chromatique ? 0.02 : 0 | `hp` |

### 2.7 Mappage de gamut

Pour un `(L, C, h)` hors gamut sRGB : **réduction de chroma par dichotomie** à `L` et `h` constants. Une couleur est dans le gamut si ses trois canaux linéaires sont dans `[−1e-6, 1 + 1e-6]`. 24 itérations. La chroma retournée est la plus grande dans le gamut.

### 2.8 Échelles de teintes

Pour un jeton de couleur, produire 11 pas (`50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`) :

- Lightness fixe par pas : `[0.97, 0.94, 0.88, 0.80, 0.71, 0.62, 0.53, 0.44, 0.35, 0.26, 0.19]`.
- Teinte : celle du jeton, constante.
- Chroma de base : `Cbase` du jeton. Poids `w(L)` : `1` pour `0.35 ≤ L ≤ 0.75`, décroissance linéaire vers `0.25` à `L = 0.97` et vers `0.50` à `L = 0.19`. `C = Cbase · w(L)`, puis mappage de gamut.
- Propriétés testées : lightness strictement décroissante, teinte constante à ±1°, toutes les valeurs dans le gamut.

### 2.9 Matrice de contraste

Pour la palette `[primary, accent, neutralLight, neutralDark, ...extra]` : toutes les paires ordonnées `(texte, fond)`, hors diagonale. Chaque cellule : `{ ratio, level }`. Pour chaque fond, `bestText` = couleur de la palette (ou noir `#000000` / blanc `#FFFFFF`) au ratio maximal.

Exports : tableau dans la charte, `contrast-matrix.csv`, `design-tokens.json`.

### 2.10 CMJN indicatif

Contrat : `toCmykIndicative(hex) → { c, m, y, k: entiers 0–100, gamutDeltaE: number, profile: 'FOGRA39' }` ou `unavailable`.

- Conversion **par profil ICC** (LittleCMS) : sRGB (IEC 61966-2.1) → profil FOGRA39 (famille ISO Coated v2 ECI), intention colorimétrique relative avec compensation du point noir.
- `gamutDeltaE` : ΔE2000 entre la couleur source et la couleur retrouvée après aller-retour par le profil. Au-delà de **5**, l'interface affiche « couleur hors gamut d'impression, approximée ».
- **Interdit** : toute formule RVB→CMJN « naïve ». Si le moteur ICC est indisponible, la valeur CMJN est **masquée**, jamais approximée.
- Libellé : « CMJN indicatif (FOGRA39) — à valider avec l'imprimeur ». Jamais « certifié ».
- Le choix de la bibliothèque est tranché par le **spike T-010** ; la licence du profil ICC (ECI) est vérifiée et conservée dans `assets/icc/`.

### 2.11 Vecteurs de référence (extrait)

Tolérances : ratio ±0,001 ; OKLab ±0,001 ; ΔE2000 ±0,0001.

| Test | Entrée | Attendu |
|---|---|---|
| Contraste | `#000000` / `#FFFFFF` | 21,0000 |
| Contraste | `#FFFFFF` / `#FFFFFF` | 1,0000 |
| Contraste | `#777777` / `#FFFFFF` | 4,4781 → `large-ui` (jamais `aa`) |
| Contraste | `#767676` / `#FFFFFF` | 4,5422 → `aa` |
| Contraste | `#595959` / `#FFFFFF` | 7,0047 → `aaa` |
| Contraste | `#FF0000` / `#FFFFFF` | 3,9985 |
| Contraste | `#1F4BFF` / `#FFFFFF` | 5,9851 |
| Contraste | `#FFD60A` / `#000000` | 14,8750 |
| OKLab | `#FFFFFF` | L 1,0000 ; a 0 ; b 0 |
| OKLab | `#FF0000` | L 0,6280 ; a 0,2249 ; b 0,1258 |
| OKLab | `#1F4BFF` | L 0,5217 ; a −0,0209 ; b −0,2657 |
| ΔE_OK | `#000000` / `#FFFFFF` | 1,0000 |
| ΔE_OK | `#FF0000` / `#00FF00` | 0,5198 |
| ΔE2000 (Sharma 1) | (50 ; 2,6772 ; −79,7751) / (50 ; 0 ; −82,7485) | 2,0425 |
| ΔE2000 (Sharma 2) | (50 ; 3,1571 ; −77,2803) / (50 ; 0 ; −82,7485) | 2,8615 |
| ΔE2000 (Sharma 3) | (50 ; 2,8361 ; −74,0200) / (50 ; 0 ; −82,7485) | 3,4412 |

Liste complète et formats : `docs/golden/color.golden.json` (version 2). Sections : `contrast`, `formatRatio`, `srgbToLinear`, `oklab`, `deOk`, `lab_D65`, `deltaE2000_sharma` (8 paires publiées), `homography` (directe et inverse), `gamutMapping`, `scales`, `derivedColors`.

**Provenance** (indiquée dans `_meta.provenance`) : les sections `deltaE2000_sharma`, `lab_D65` (cinq valeurs externes) et les ratios WCAG de référence sont **externes** ; `gamutMapping`, `scales`, `derivedColors` et `homography` sont les sorties d'une implémentation de référence **de cette spécification** (elles détectent un écart entre le code et le texte, pas une erreur du texte lui-même). Non couverts par le fichier : extraction de palette (cas générés dans les tests de T-005) et CMJN (spike T-010).

---

## 3. `svg-engine` — assainissement

**Objectif** : produire, à partir d'un SVG inconnu, un SVG **reconstruit** contenant uniquement des éléments et attributs de la liste blanche, ou refuser le fichier avec un code précis. **La sortie n'est jamais le texte d'origine** : elle est re-sérialisée à partir de l'arbre filtré.

### 3.1 Avant l'analyse

1. Taille ≤ 5 Mo (contrôlée avant lecture complète).
2. Octets : premier contenu `<?xml` ou `<svg` après un éventuel BOM et espaces.
3. **Aucun `DOCTYPE`, aucune entité** : toute occurrence de `<!DOCTYPE` ou `<!ENTITY` → refus `ASSET_SVG_FORBIDDEN_CONTENT`. Le parseur XML est configuré sans traitement de DTD ni entités externes, avec limites de profondeur (64), de nœuds (50 000), d'attributs par élément (64) et de longueur de valeur (10 000 caractères).

### 3.2 Éléments

| Règle | Éléments |
|---|---|
| **Autorisés** | `svg`, `g`, `defs`, `title`, `desc`, `path`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `linearGradient`, `radialGradient`, `stop`, `clipPath`, `mask`, `symbol`, `use`, `pattern`, `filter`, `feGaussianBlur`, `feOffset`, `feColorMatrix`, `feBlend`, `feMerge`, `feMergeNode`, `feFlood`, `feComposite`, `feDropShadow`, `style` (voir §3.4) |
| **Refus du fichier** | `script`, `foreignObject`, `iframe`, `object`, `embed`, `animate`, `animateMotion`, `animateTransform`, `set`, `a`, `audio`, `video`, `canvas`, `image`, `feImage`, `font-face`, `cursor` |
| **Refus (MVP, fonctionnalité non supportée, code `ASSET_SVG_UNSUPPORTED_FEATURE`)** | `text`, `tspan`, `textPath` — indice : « exporte le logo en convertissant les textes en contours » |
| **Supprimés silencieusement** | `metadata`, commentaires, instructions de traitement, éléments d'espaces de noms d'éditeurs (`sodipodi:*`, `inkscape:*`, `sketch:*`…) |
| **Tout le reste** | Supprimé avec avertissement `DROPPED_ELEMENT` |

### 3.3 Attributs et valeurs

- **Liste blanche** d'attributs de géométrie et de présentation : `id`, `class` (consommé par l'inlining puis supprimé), `x y width height cx cy r rx ry fx fy fr x1 y1 x2 y2`, `d`, `points`, `transform`, `viewBox`, `preserveAspectRatio`, `fill`, `fill-opacity`, `fill-rule`, `stroke`, `stroke-width`, `stroke-opacity`, `stroke-linecap`, `stroke-linejoin`, `stroke-miterlimit`, `stroke-dasharray`, `stroke-dashoffset`, `opacity`, `clip-path`, `clip-rule`, `mask`, `filter`, `offset`, `stop-color`, `stop-opacity`, `gradientUnits`, `gradientTransform`, `spreadMethod`, `patternUnits`, `patternContentUnits`, `patternTransform`, `clipPathUnits`, `maskUnits`, `maskContentUnits`, `href`, `xlink:href`, `stdDeviation`, `dx`, `dy`, `in`, `in2`, `result`, `mode`, `type`, `values`, `flood-color`, `flood-opacity`, `xmlns`, `xmlns:xlink`, `version`.
- **Refus du fichier** : tout attribut dont le nom commence par `on` ; toute valeur contenant `javascript:`, `data:`, `vbscript:`, ou une séquence `&#` suspecte décodant ces motifs.
- `href` / `xlink:href` : uniquement `^#[A-Za-z_][\w.-]*$` (référence locale). Toute autre valeur → refus `ASSET_SVG_FORBIDDEN_CONTENT`.
- Toute valeur contenant `url(` doit correspondre exactement à `^url\(#[A-Za-z_][\w.-]*\)$`. Sinon refus.
- Attribut `style` : analysé, ses propriétés de la liste blanche sont **converties en attributs**, le reste est supprimé ; `@import` et `url()` non locaux → refus.
- Tout autre attribut : supprimé avec avertissement `DROPPED_ATTRIBUTE`.

### 3.4 Élément `<style>`

Analysé avec un parseur CSS ; seuls les sélecteurs simples (élément, `.classe`, `#id`) et les propriétés de la liste blanche sont pris en charge ; ils sont **inlinés** dans les attributs des éléments ciblés, puis l'élément `<style>` est supprimé. `@import`, `@font-face`, `url()` non local, sélecteurs complexes (combinateurs, pseudo-classes) → refus `ASSET_SVG_UNSUPPORTED_FEATURE`.

### 3.5 Intégrité des références

- Les `id` sont rendus uniques ; une référence vers un `id` absent est supprimée avec avertissement.
- `use` : références locales seulement, **cycles interdits** (refus), profondeur ≤ 8, budget d'expansion total ≤ 100 000 nœuds.

### 3.6 Normalisation de sortie

- L'élément racine est `<svg xmlns="http://www.w3.org/2000/svg">`. Un `viewBox` est **obligatoire** : dérivé de `width`/`height` s'ils existent, sinon de la boîte englobante calculée par la rasterisation isolée.
- Les attributs `width` et `height` de la racine sont supprimés (le dimensionnement est géré par l'appelant).
- Sortie encodée en UTF-8, sans déclaration de DOCTYPE.

### 3.7 Rasterisation isolée

- Réalisée par **resvg** dans un **processus séparé**, sans réseau, sans accès au système de fichiers hors répertoire temporaire, délai de 5 s, mémoire plafonnée (512 Mo).
- Sert à : boîte englobante, aperçu raster, extraction de palette (512 px), variantes PNG, score de fidélité.
- Seul un SVG déjà assaini peut être rasterisé.

### 3.8 Propriétés exigées (testées)

1. **Idempotence** : `sanitize(sanitize(x)) ≡ sanitize(x)`.
2. **Sortie propre** : aucun motif interdit ne subsiste dans la sortie, sur tout le corpus d'attaque (`10_QUALITY.md` §6) et sur des SVG générés aléatoirement (fast-check).
3. **Fidélité** : pour 10 logos légitimes, la rasterisation avant et après assainissement diffère d'au plus 0,5 % des pixels.
4. **Déterminisme** : mêmes octets → mêmes octets.

---

## 4. Images raster

- Décodage avec limite de pixels (`limitInputPixels` ≈ 67 M, et refus > 8192 × 8192).
- Correction d'orientation EXIF puis **suppression des métadonnées**.
- Conversion en PNG RGBA normalisé pour l'analyse.
- Les JPEG sans transparence passent par la règle de fond opaque (§2.4 étape 2).

### Vectorisation (raster → SVG)

Utilisée pour les variantes d'un logo raster. Candidat : vtracer ; **choix tranché par le spike T-011** (critère : IoU ≥ 0,97 sur le corpus de 20 logos, voir ci-dessous). Chaîne : fond retiré → alpha ou luminance → binarisation → vectorisation → `svgo` → assainissement (§3).

---

## 5. `logo-kit`

### 5.1 Encre et fond d'un logo

Pour décider quoi remplir en monochrome :
- **Surface encre** = toutes les surfaces dessinées dont la luminance relative < 0,9.
- **Surface claire** = luminance ≥ 0,9.
- Si le logo contient au moins une surface encre, les surfaces claires sont traitées comme **évidements** (transparentes dans les variantes monochromes). Si le logo n'a **que** des surfaces claires (logo blanc), elles sont conservées.

Cette règle est une heuristique : elle est documentée dans l'interface et soumise à validation visuelle (T-008).

### 5.2 Variantes monochromes

**Chemin structurel** (SVG simple : ni `mask`, ni `filter`, ni raster intégré) :
1. Calculer la peinture effective de chaque forme (héritage des `g`).
2. `fill` effectif ≠ `none` et surface encre → `fill = cible` ; surface claire (cf. 5.1) → forme supprimée ; `none` → conservé.
3. `stroke` effectif ≠ `none` → `stroke = cible`.
4. Dégradés → remplacés par la cible ; `fill-opacity`/`opacity` conservés.
5. Supprimer les définitions devenues inutilisées.

**Chemin raster** (SVG complexe ou logo raster) : rasterisation à 2048 px sur fond transparent → surface encre binarisée (seuil 0,5) → vectorisation → assainissement.

Cible : `#000000` ou `#FFFFFF`.

### 5.3 Score de fidélité

`IoU = |A ∩ B| / |A ∪ B|` entre le masque « encre » de l'original et celui de la variante, rasterisés à 1024 px.
- `≥ 0,97` : variante validée ; `< 0,97` : variante marquée « à vérifier » avec avertissement visible.
- Le score est enregistré dans `assets.meta`.

### 5.4 Favicon

- Boîte englobante du logo (hors marges vides) : `W × H`.
- Côté du carré : `S = max(W, H) / 0.8` (le logo occupe 80 % du plus grand côté, marge de sécurité de 10 % de chaque côté).
- Logo centré dans le carré. Fond transparent par défaut ; option fond uni (couleur du jeton) avec coins arrondis (rayon 18 % de `S`).
- Sorties : SVG, PNG 16, 32, 48, 180 (apple-touch), 192, 512.

### 5.5 Zone d'exclusion (clear space)

- `H` = hauteur de la boîte englobante du logo.
- `X = clearSpaceRatio × H`, avec `clearSpaceRatio` ∈ [0,10 ; 0,50], **0,25 par défaut**.
- Zone d'exclusion = boîte englobante élargie de `X` sur les quatre côtés.
- Le schéma généré montre le logo, le rectangle de zone en pointillés et quatre carrés de côté `X` aux coins.
- **Taille minimale** (recommandation, valeurs par défaut modifiables) : hauteur 24 px en numérique, 12 mm en impression. Affichée comme une recommandation, jamais comme une norme.
- `X` est une **convention** de présentation : l'interface ne prétend pas qu'elle soit calculée à partir d'un élément du logo.

### 5.6 Do & Don't

Quatre panneaux SVG générés avec le logo réel, chacun avec une icône de croix, un libellé texte et une couleur (jamais la couleur seule) :
1. **Déformation** : mise à l'échelle horizontale ×1,4.
2. **Rotation** : −15°.
3. **Recoloration** : variante monochrome dans une couleur hors palette (complémentaire de l'accent).
4. **Fond inadapté** : fond choisi dans la palette (ou gris généré) dont le contraste avec la couleur principale du logo est **< 3**, calculé par le moteur.

---

## 6. Corpus de logos de test

Jeu de **20 logos** maintenu dans `packages/svg-engine/fixtures/` (droits libres ou créés pour le projet) :
- 6 SVG simples (1, 2, 3 couleurs), 4 SVG avec dégradés, 2 avec masques ou filtres, 2 avec traits fins, 2 PNG sur transparent, 2 PNG sur fond blanc, 2 JPEG.
- Pour chacun : palette attendue (écrite à la main), variantes attendues validées visuellement par le propriétaire, score IoU de référence.

Ce corpus est la **vérité terrain** des tickets T-005, T-008 et T-011.
