# Mockups sur objets courbes : recherche et conception

> 2026-11-11. Recherche et conception seulement : ce document n'implémente rien. Périmètre visé : `packages/mockup-engine`, `packages/contracts` (schéma de scène), `tools/psd-mockups/bake.py`, et à terme un outil interne de saisie des scènes.
> Les URL ont été vérifiées le 2026-11-11 par une requête HTTP, sauf celles marquées « (403 anti-robot) » : le site refuse les clients automatiques et le contenu n'a pas pu être relu.

## 0. Résumé

- **Ce qui manque.** Le moteur sait poser un logo sur un quadrilatère plat (homographie) ou rejouer une carte UV cuite depuis un PSD. Il ne sait pas *calculer* une surface courbe. Le seul objet courbe actif, `mug-white`, n'a en pratique aucune courbure horizontale. On l'a mesuré sur sa carte UV (§1.3).
- **Recommandation.** Ajouter une géométrie de surface **« révolution »** (cylindre, cône, profil de bouteille) et une géométrie **« maillage »** (grille de Bézier N×M, comme le Warp de Photoshop). Les deux produisent, par une fonction pure de `mockup-engine`, **la même carte UV** que celle que `bake.py` cuit déjà. Le shader de slot existant la consomme donc sans changement de principe. Il faut y ajouter un canal « orientation », qui sert au masque de la face cachée, aux reflets et au Fresnel.
- **Saisie.** Six clics suffisent pour un cylindre ou un cône : gauche, droite et avant de l'ellipse du haut, puis de celle du bas. Les clics sont aimantés sur les contours de la photo. L'IA (Gemini, hors ligne, au moment de créer la scène) propose ces six points en JSON validé par Zod ; l'humain les confirme. L'IA ne dessine jamais le logo.
- **photocraft (storytold)** expose bien une ligne de commande et un serveur MCP. En revanche, le rendu des objets dynamiques en perspective et déformés n'est pas encore fusionné : les PR sont ouvertes au 2026-11-11. Il peut servir d'oracle de contrôle, pas de moteur de production (§3).
- **PSD gratuits courbes.** Seuls les fichiers CC0 de Firmbee sont compatibles avec un SaaS, et nous les avons déjà. Pixeden, ls.graphics et GraphicBurger interdisent explicitement d'offrir leurs fichiers à des tiers ; mockups-design.com interdit de les redistribuer en format ouvert (§4). Il vaut donc mieux produire nos propres photos d'objets vierges et poser la géométrie calculée dessus.
- **Chiffrage :** 10 tickets, environ 2 000 lignes hors tests. Le premier résultat démontrable (un mug et un gobelet de vrais cylindres) arrive après 5 tickets (§7).

---

## 1. État des lieux dans Charta (lu dans le code)

### 1.1 Les trois mécanismes existants

| Mécanisme | Où | Ce qu'il fait | Limite pour un objet courbe |
|---|---|---|---|
| Homographie | `packages/mockup-engine/src/homography.ts`, `scene.ts` (`parseScene` calcule une homographie par `surface.quad`) | Carré unité vers quadrilatère, inversée dans le shader (`uInverse`, `logoUv()` de `render/shaders.ts`) | Projection plane uniquement : pas de compression aux bords, pas de face cachée |
| Déplacement (plis) | `render/shaders.ts` (`uDisplace`), `render/uniforms.ts` (`DISPLACE[material]`) | Décale la lecture du logo selon la pente de luminance de la photo : `q = p + slope * uDisplace` | Petits décalages locaux (tissu) ; ne fait pas « tourner » une image autour d'un objet |
| Scènes PSD cuites | `tools/psd-mockups/bake.py`, `render/psd.ts`, `render/psd-compositor.ts`, schéma `PsdSceneSchema` (`packages/contracts/src/mockup-scene.ts`) | Pour chaque pixel, une carte UV 16 bits (`uv-*.png`, `vv-*.png` : octet fort en R, faible en G, couverture en B) donne le point de l'illustration affiché ; elle porte la perspective (`nonAffineTransform`) et la déformation personnalisée (`warpCustom`, patchs de Bézier bicubiques) de l'objet dynamique | Ne vaut que ce que le graphiste du PSD a déformé ; aucune géométrie n'est calculée par Charta |

Le schéma de surface photo (`SceneSurface`) n'accepte qu'un `quad` de quatre coins. `docs/06_MOCKUP_ENGINE.md` §2 classe explicitement « surfaces courbes (flacons, tissus) » hors MVP. Il faudra donc un ADR (proposé : ADR-034).

### 1.2 Les scènes

`SCENES` (`apps/web/src/studio/mockups/mockup-stage.tsx`, ligne 36) compte 24 scènes actives. Une seule est un objet courbe passé par le PSD : `mug-white` (Firmbee, CC0). `tote-terracotta` et `apron` sont des scènes photo à masque, avec déplacement de tissu. `paper-bag` et `gift-box` sont des quads plats. `mug-stripes` figure dans `RETIRED_SCENES` (« jugée faible »). `cup-pink`, un gobelet Firmbee, a été cuit puis retiré par le commit `673ff6b` (« off-palette cup removed ») ; sa spécification `tools/psd-mockups/specs/cup-pink.json` est restée.

### 1.3 Mesure sur `mug-white` : le logo n'épouse pas le mug

Lecture de `apps/web/public/scenes/mug-white/uv-slot-1.png`. La zone couverte va de x = 921 à 1323 et de y = 761 à 1248, sur une image de 2400 × 1594. Sur la ligne médiane, la dérivée du/dx (normalisée par la largeur de la zone) vaut :

| Position dans la largeur | 3 % | 10 % | 25 % | 50 % | 75 % | 90 % | 97 % |
|---|---|---|---|---|---|---|---|
| du/dx × largeur | 0,978 | 0,982 | 0,990 | 1,000 | 1,006 | 1,009 | 1,009 |

La densité est constante à 2 % près. Le bord bas est cintré (30 px plus bas au centre qu'aux bords), le bord haut est droit. Sur la photo, la zone occupe environ 55 % de la largeur du corps du mug, ce qui correspond à un arc d'environ ±34°. Ce chiffre est estimé à l'œil sur un recadrage. Sur un vrai cylindre, la densité au bord devrait tomber à cos 34° ≈ 0,83. Le logo actuel est donc un autocollant plat dont le bas est courbé. C'est l'écart que voit le propriétaire.

### 1.4 Défauts repérés dans `bake.py`, à corriger dans tous les cas

1. **Préréglages de déformation ignorés en silence.** `warp_points()` et `uv_map()` ne traitent que `warpStyle == warpCustom`. Un objet dynamique déformé par un préréglage (Arc, Bulge, Flag…) est cuit **sans** sa déformation, et rien ne le signale. Le contrôle d'IoU ≥ 0,95 ne le détecte que si l'écart est gros.
2. **Maillages divisés.** Le code suppose une grille carrée (`n = sqrt(len)`). Un Warp divisé (*split warp*, grilles M×N) serait mal lu. Ce point vient de la lecture du code ; nous n'avons pas de fichier pour le vérifier.
3. **Ordre perspective/déformation.** `bake.py` évalue la grille de Bézier puis applique l'homographie exacte à chaque point. D'après la PR photocraft #12428, Photoshop fait l'inverse : il fait passer les **points de contrôle** par l'homographie, puis évalue le Bézier dans le document. L'écart est de « plusieurs pixels sur une balle ou un cylindre vus de biais ». Source : https://github.com/storytold/photocraft/pull/12428

---

## 2. Comment font les professionnels

### 2.1 Photoshop

- **Objet dynamique + Déformation (Édition > Transformation > Déformation).** Le graphiste place le visuel dans un objet dynamique. Il le déforme ensuite par une grille de Bézier (4×4 points par patch, grilles plus fines ou divisées dans les versions récentes) ou par un préréglage (Arc, Renflement…). Le PSD stocke la grille (`customEnvelopeWarp.meshPoints`) et les quatre coins (`nonAffineTransform`). C'est ce que `bake.py` relit. Aide Adobe : https://helpx.adobe.com/photoshop/using/warp-images-shapes-paths.html (403 anti-robot). Objets dynamiques : https://helpx.adobe.com/photoshop/using/create-smart-objects.html (403 anti-robot). Lecture des descripteurs par psd-tools : https://psd-tools.readthedocs.io/en/latest/reference/psd_tools.api.smart_object.html
- **Perspective Warp (Déformation de la perspective).** On définit des plans (quadrilatères) sur l'image, puis on les recale. C'est l'outil des objets *à facettes* : boîte, sac en papier plié, enseigne d'angle. Ce n'est pas un outil de courbe. Pour Charta, l'équivalent est une **suite de quads qui partagent une arête**, ce que le schéma sait presque faire avec plusieurs surfaces. https://helpx.adobe.com/photoshop/using/perspective-warp.html (403 anti-robot)
- **Carte de déplacement (Filtre > Déformation > Dispersion / Displace).** On utilise une copie de la photo désaturée et contrastée, enregistrée en PSD gris. 128 est neutre ; chaque niveau décale les pixels d'une fraction de l'échelle horizontale et verticale choisie. Le filtre est appliqué en filtre dynamique sur l'objet dynamique pour le tissu froissé ou le papier gaufré. Notre `uDisplace` en est l'équivalent analytique : il utilise la pente de luminance plutôt qu'une carte. https://helpx.adobe.com/photoshop/using/filter-effects-reference.html (403 anti-robot) ; principe général : https://en.wikipedia.org/wiki/Displacement_mapping
- **Ombrage par modes de fusion.** Au-dessus du visuel, et écrêtée sur lui, on place une copie de la photo en **Produit** (*Multiply*), qui reprend les ombres, puis une couche en **Superposition** ou **Lumière tamisée**, qui reprend le modelé. Les reflets vont en **Écran** ou **Densité linéaire −** (*Linear Dodge*), souvent sur un **masque de reflets** peint à la main pour qu'une céramique brillante garde ses reflets *par-dessus* l'encre. `render/psd.ts` sait déjà rejouer ces modes (`BLEND_CODES`). https://helpx.adobe.com/photoshop/using/blending-modes.html (403 anti-robot)
- **3D.** Les fonctions 3D de Photoshop ont été retirées. Ce n'est plus une voie pour les mockups PSD gratuits récents. Source non relue : https://helpx.adobe.com/photoshop/kb/3d-faq.html (403 anti-robot).

### 2.2 Les générateurs en ligne

Ce qui suit vient de leurs pages d'accueil, consultées le 2026-11-11. Les détails internes ne sont pas publics, et nous ne les inventons pas.

- **Placeit** (https://placeit.net/). Bibliothèque de photos-modèles par catégorie : tasses (*Coffee Mugs*), vêtements, casquettes. Le site affiche des rubriques « 3D Mockups » et « AI-Made Mockups ». Le modèle économique repose sur des milliers de photos préparées une par une, pas sur une géométrie calculée.
- **Smartmockups**, racheté par Canva (https://smartmockups.com/, 403 anti-robot). Mockups photo dans le navigateur, intégrés à Canva.
- **Mockey** (https://mockey.ai/). « 30,000+ Mockup Templates », rubriques « Flat Mockups / Video Mockups / 3D Mockups ». Il annonce : « Tweak color, design placement and warping with just a click ». La déformation y est donc un réglage de l'utilisateur.
- **Artboard Studio** (https://artboard.studio/). Éditeur dans le navigateur qui annonce « All of our mockups, 3D models and animations ». Les objets courbes y sont des **modèles 3D** rendus dans le navigateur, et non des photos.
- **Mockup World** (https://www.mockupworld.co/faq/). Agrégateur. Sa FAQ dit : « check the license supplied by its creator. A free download does not, by itself, define the permitted uses ». La licence est donc à vérifier fiche par fiche.
- **Pixeden** (https://www.pixeden.com/license). PSD premium et gratuits, dont beaucoup d'objets courbes. La licence interdit de « redistribute, resell, lease, license, sub-license or offer our resources to any third party » (§4).

**Ce qu'on en retient.** Le marché suit deux voies. La première est la photo préparée à la main dans Photoshop (Placeit, PSD) : réaliste, mais chaque scène coûte du travail humain, et la déformation n'est souvent qu'approximative, comme le montre notre propre mug. La seconde est la 3D (Artboard Studio, rubriques 3D de Mockey et Placeit) : géométrie exacte, mais l'aspect est moins photographique. La voie de Charta est une troisième : une **vraie photo + une géométrie calculée**. Elle combine la photo de la première et l'exactitude de la seconde.

---

## 3. Dépôts GitHub `storytold`

L'API publique `GET https://api.github.com/users/storytold/repos?per_page=100`, appelée sans authentification, renvoie 80 dépôts. Les plus pertinents :

| Dépôt | Rôle | Licence |
|---|---|---|
| **photocraft** (https://github.com/storytold/photocraft) | « An open-source photo editor written from scratch in pure Rust » : la copie de Photoshop | Apache-2.0 (badge README : MIT OR Apache-2.0) |
| photocraft-corpus | PSD de test (« oracle » Photoshop) | Apache-2.0 |
| vectorcraft | Illustrator ; déjà intégré à Charta (ADR-033, `vectorcraft-cli`) | Apache-2.0 |
| lightcraft, effectcraft, texturecraft, materialcraft | Photo non destructive, compositing, peinture de texture 3D, matériaux | Apache-2.0 |
| artcraft, craft-libs, craft-launcher, figcraft, designcraft, pdfcraft, wordcraft, deckcraft… | Suite « Craft » | Apache-2.0 |

**Le README de photocraft**, lu via `GET /repos/storytold/photocraft/readme`, puis `docs/development.md` et `docs/target-app-parity.md`, montre ceci :

- **Ligne de commande : oui.** `photocraft-cli run wave.psd --cmd <commande> --params '<json>' --out wave-final.png`, `photocraft-cli batch`, `photocraft-cli mcp` (serveur MCP), `photocraft-cli serve` (session JSON). « Every menu item, tool and dialog runs a command from one registry of 500+ commands. »
- **Remplacer le contenu : oui.** `docs/development.md` décrit `document.inspect`, qui liste les sources des objets dynamiques, et précise que « Replace Contents changes them all ». Le nom exact de la commande n'a pas été relevé.
- **Rendu de la déformation : pas encore fiable.** La grille de parité indique « smart-object perspective (FILE-215-6) » parmi les points **ouverts**. Les PR qui font rendre les objets dynamiques déformés sous perspective « comme Photoshop » sont **toutes ouvertes, non fusionnées** au 2026-11-11 : #8139 (créée le 2026-10-21), #12428 et #12723 (créées le 2026-11-09). Le projet se déclare lui-même « early alpha ».
- **Réponse.** photocraft expose une ligne de commande capable d'ouvrir un PSD, d'en remplacer l'objet dynamique et d'exporter un PNG. Le rendu fidèle de la **perspective + déformation** d'un objet dynamique n'est pas dans la branche principale aujourd'hui. Rien n'a été téléchargé ni exécuté. Usage possible plus tard, une fois ces PR fusionnées : un **oracle de contrôle** pour `bake.py`, en comparant notre carte UV au rendu de photocraft. Il passerait par le même chemin que `vectorcraft-cli` (outil externe du worker, ADR-033), jamais par le rendu en direct, qui doit rester en WebGL dans le navigateur.

---

## 4. PSD gratuits à licence claire avec objets courbes

Le critère n'est pas « gratuit pour un usage commercial ». Charta **sert les calques cuits à des tiers**, ses utilisateurs, dans un logiciel. C'est exactement ce que la plupart des licences interdisent.

| Source | Objets courbes | Licence (citation) | Compatible avec Charta ? |
|---|---|---|---|
| Firmbee — https://firmbee.com/white-coffee-mug-free-psd-mockup, https://firmbee.com/mug-with-green-stripes, https://firmbee.com/pink-coffee-cup | Mug blanc, mug rayé, gobelet | « Licence for this free mockup PSD White coffee mug is CC0. You can copy, modify, distribute… even for commercial purposes » | **Oui**, déjà cuits (mug-white actif, mug-stripes retiré, cup-pink retiré). Le reste du catalogue des freebies de Firmbee, parcouru sur 5 pages, ne contient ni bouteille ni canette |
| Pixeden — https://www.pixeden.com/license | Nombreux (bouteilles, canettes) | « You cannot however redistribute, resell, lease, license, sub-license or offer our resources to any third party » | **Non** |
| ls.graphics — https://www.ls.graphics/license | Nombreux (« Cup Mockups ») | « You may not include Products as attachments in resalable web applications, templates, frameworks, or software programs » | **Non** |
| GraphicBurger — https://www.graphicburger.com/license/ | Quelques-uns | « You do not have the rights to resell, sublicense or redistribute (even for free) the files on its own or as a separate attachment » | **Non** : nos calques cuits sont une redistribution séparée |
| mockups-design.com — https://mockups-design.com/license/ | Bouteilles, canettes, tubes | « You may not distribute Mockup files… in an open format, such as PSD… or TIF » ; seul le résultat aplati est libre | **Risqué** : `base.webp` + calques + cartes UV restent une forme décomposée. Avis juridique nécessaire, à ne pas utiliser par défaut |
| Unblast — https://unblast.com/license/ | Variés | Licence propre à chaque auteur | Au cas par cas |
| Mockup World — https://www.mockupworld.co/faq/ | Variés | Renvoie à l'auteur | Au cas par cas |

**Recommandation.** Ne plus chercher de PSD. La géométrie de révolution du §5 rend le PSD inutile pour les objets courbes : il suffit d'une **photo d'un objet vierge**. Les sources possibles :

1. Nos propres photos d'objets vierges (mug, bouteille en verre, canette, gobelet, tote, casquette). C'est la seule voie sans aucun doute de licence, et elle respecte la règle « pas d'images générées sur l'accueil ».
2. Des photos du domaine public ou CC0, vérifiées fichier par fichier : https://commons.wikimedia.org/wiki/Commons:Licensing, https://www.rawpixel.com/category/53/public-domain.
3. Le pack photographique généré déjà utilisé par le studio. Il est hors de question pour la page d'accueil.

Les trois PSD Firmbee restent la base d'un test : celui qui vérifie que la nouvelle géométrie reproduit ou corrige leur carte UV.

---

## 5. Mathématiques

Les coordonnées sont des pixels de la scène, y vers le bas. Une ellipse s'écrit E(c, a, b, φ) : centre c, demi-axes a ≥ |b|, axe principal e = (cos φ, sin φ), normale n = (−sin φ, cos φ).

### 5.1 Une section circulaire vue en perspective

Un cercle 3D (le bord d'un mug) se projette en conique, ici une ellipse. On paramètre le cercle par l'angle θ mesuré **depuis le point le plus proche de l'observateur** (θ = 0 devant, ±π/2 aux silhouettes) :

```
p(θ) = c + a·sin θ·e + b·cos θ·n
```

- **Saisie à 3 points par ellipse**, à gauche L, à droite R et devant F : c = (L+R)/2, a = |R−L|/2, e = (R−L)/|R−L|, b = (F−c)·n. Le signe de b dit si l'on voit l'objet d'en haut (b > 0, l'arc avant est en bas) ou d'en bas. On valide |(F−c)·e| ≤ 0,1·a ; au-delà, la saisie est refusée avec un message.
- **Approximation assumée.** En perspective exacte, le centre de l'ellipse n'est pas l'image du centre du cercle, et les points de silhouette ne sont pas exactement les extrémités du grand axe. L'écart croît avec le rapport rayon / distance de l'objet ; il est négligeable pour un objet photographié à distance normale. Un test chiffrera l'écart sur des projections synthétiques exactes. Pour une précision complète, il existe la pose exacte à partir de deux cercles parallèles, mais elle demande un étalonnage de la caméra.
- **Paramétrage exact pour plus tard.** La conique image se calcule à partir de 5 points (https://en.wikipedia.org/wiki/Conic_section). L'ajustement robuste d'une ellipse sur des contours détectés se fait par la méthode directe des moindres carrés de Fitzgibbon, Pilu et Fisher (IEEE TPAMI 21(5), 1999, https://doi.org/10.1109/34.765658).

### 5.2 Cylindre

Deux ellipses : E_h en haut et E_b en bas de la bande imprimable. Les génératrices (les droites verticales du cylindre) sont parallèles en 3D, donc leurs images concourent au **point de fuite V**, intersection des droites (L_h L_b) et (R_h R_b). Si ces droites sont parallèles à l'image, V est à l'infini.

Pour un point (θ, s), avec s ∈ [0, 1] la hauteur de 0 (haut) à 1 (bas) :

```
p_h = p_h(θ),  p_b = p_b(θ)                        (même θ sur les deux ellipses)
P(θ, s) = ((1−s)·w_h·p_h + s·w_b·p_b) / ((1−s)·w_h + s·w_b)
w_h = a_h,  w_b = a_b
```

Il s'agit d'une interpolation **homogène** : la profondeur varie le long de la génératrice. Pour un cylindre, le rayon apparent est inversement proportionnel à la profondeur, donc w ∝ a, sans aucune saisie supplémentaire. Si a_h = a_b, on retombe sur l'interpolation linéaire. On peut aussi forcer la correspondance exacte en faisant passer la génératrice par V et en l'intersectant avec l'arc avant de E_b. C'est plus exact, mais plus coûteux : on le réserve à la cuisson.

**Placement physique du logo.**

- Rayon image a, hauteur image de l'axe ℓ = |c_b − c_h|. Le rapport b/a vaut le sinus de l'angle de vue sur l'axe, donc la hauteur vraie est H = ℓ / √(1 − (b/a)²), à l'échelle du rayon.
- Un logo de largeur relative W (en unités du rayon) couvre Δθ = W radians. u ∈ [0, 1] donne θ = θ₀ + (u − ½)·Δθ ; v ∈ [0, 1] donne s = s₀ + v·(s₁ − s₀).
- Le rapport d'aspect de la « boîte unité » de la surface vaut donc (r·Δθ) / (H·(s₁ − s₀)), calculé à partir de la géométrie. `placeLogo(logoBox, aspect)` (`placement.ts`) reste inchangé : on lui donne cet aspect au lieu de celui d'un quad.

**Compression aux bords.** Elle vient seule : ∂P/∂u ∝ a·cos θ·Δθ. La densité relative au bord vaut cos θ. Pour l'arc de ±34° du §1.3, cela donne 0,83 au bord, au lieu du 1,0 actuel.

**Partie cachée.** En projection orthographique, un point est visible si cos θ > 0. En perspective, la limite recule légèrement en deçà de ±90° : la silhouette est tangente depuis l'œil. On utilise donc la **silhouette saisie** (L et R) comme limite, ce qui revient à |θ| < π/2 dans notre paramétrage. Un logo qui déborde de l'arc visible est coupé net, comme sur un vrai mug. Le studio affiche alors un avertissement (« le logo dépasse la face visible ; réduisez-le »). Il ne le comprime pas en silence. La couverture est adoucie près de la silhouette par `smoothstep(0, ε, cos θ)`, avec ε correspondant à environ 1 px, pour éviter les escaliers.

**Occultations** (anse devant le corps, main qui tient la bouteille). On réutilise le `mask` des scènes photo : la couverture finale vaut couverture géométrique × masque.

### 5.3 Cône (gobelet, verre à bière, abat-jour)

On garde les mêmes six points, avec a_h ≠ a_b. Les génératrices concourent à l'image du **sommet** A, intersection des deux silhouettes ; c'est le même calcul que V. Le rapport a_h/a_b mélange cette fois le rayon et la profondeur. Par défaut, on fixe w_h = w_b (interpolation affine, écart faible pour un gobelet). Si la scène renseigne le rapport physique des rayons r_h/r_b, on prend w_h/w_b = (a_h/a_b)/(r_h/r_b).

Pour le logo, u correspond à θ et v à s, avec Δθ = W / r(s_milieu). Le logo suit donc les cercles du gobelet : horizontal sur l'objet, plus étroit vers le bas. Cela correspond à l'impression réelle : un gobelet est imprimé à plat sur sa **développée**, un secteur de couronne (https://en.wikipedia.org/wiki/Developable_surface), avec un visuel pré-cintré pour paraître droit une fois roulé.

### 5.4 Révolution générale (bouteille, canette à épaulement)

On généralise le cylindre et le cône par un **profil** r(s) : une polyligne saisie sur la silhouette gauche (la droite est symétrique), plus les deux ellipses d'extrémité. Pour chaque s, a(s) vaut la demi-largeur de la silhouette, et b(s) vaut a(s)·k(s), où k interpole linéairement b_h/a_h et b_b/a_b (l'angle de vue varie lentement le long de l'objet). Le cylindre et le cône en sont deux cas particuliers, ce qui justifie **un seul type de schéma `revolution`**. Le logo doit rester dans une bande où r varie de moins de 10 %. Au-delà (col de bouteille), la scène refuse le placement ou propose la bande du corps.

### 5.5 Méthode générale : maillage de Bézier N×M (comme le Warp de Photoshop)

C'est le cas des objets qui ne sont pas de révolution : tote froissé, casquette, sac en papier plié, coussin.

- **Grille** de (3k+1) × (3m+1) points de contrôle, soit k × m patchs bicubiques, au format exact du `customEnvelopeWarp` de Photoshop (https://en.wikipedia.org/wiki/B%C3%A9zier_surface). Le point (u, v) du patch (i, j) s'écrit Σ B_a(u)·B_b(v)·P_{3j+b, 3i+a}, où B sont les polynômes de Bernstein. C'est déjà la fonction `warp_points()` de `bake.py` ; on la porte en TypeScript pur.
- **Perspective + grille.** On suit l'ordre de Photoshop : on fait passer les points de contrôle par l'homographie, puis on évalue (§1.4, point 3).
- **Saisie.** On part d'un quad (grille 4×4 = 1 patch). On subdivise en 2×2 ou 3×3 patchs, puis on fait glisser les points ; les tangentes restent continues entre patchs.
- **Tissu.** La grille donne la forme générale (la courbure d'une casquette, le ventre d'un tote). Le `uDisplace` existant ajoute les plis fins par-dessus.
- **Sac en papier plié, boîte.** Plusieurs quads à arête commune suffisent : c'est l'équivalent de Perspective Warp, moins cher qu'une grille.

### 5.6 De la géométrie à une carte UV par pixel

Le même chemin sert à tous les types :

1. **Maillage direct.** On échantillonne (u, v) sur une grille de C × R sommets et on calcule P(u, v), ainsi que, pour la révolution, la **visibilité** cos θ. L'erreur de corde vaut a·(Δθ/C)²/8. Pour a = 400 px, Δθ = π et C = 64, on obtient 0,12 px : 64 colonnes suffisent.
2. **Rastérisation** des triangles avec interpolation barycentrique de (u, v, cos θ). On ignore les triangles où cos θ ≤ 0 (face cachée) et ceux qui sont retournés (aire signée négative).
   - **Sur GPU, à l'exécution :** on dessine le maillage en WebGL2, dans un framebuffer RGBA8 à deux cibles (MRT, `drawBuffers`). On encode u et v sur 16 bits, octet fort en R et faible en G, **exactement comme les `uv-*.png` cuits** ; B porte la couverture, et une troisième cible la visibilité. Le shader de slot de `render/psd.ts` (`uKind == 2`) lit alors cette texture sans changer son décodage.
   - **Sur CPU, pur et testable :** le même rastériseur en TypeScript sert aux tests, à la cuisson hors ligne et au rendu serveur éventuel.
3. **Échantillonnage du logo.** Il passe par `textureGrad(uLogo, uv, dFdx(uv), dFdy(uv))` pour un mipmapping correct. Il remplace le suréchantillonnage 2×2 par homographie de `SURFACE`, qui ne s'applique pas à une carte UV.

### 5.7 Éclairage repris de la photo

1. **Diffus.** On garde `shade = luma(base) / luma(tint)` (`SURFACE`, `shaders.ts`). Sur la photo d'un mug vierge, cet ombrage contient déjà l'assombrissement vers les silhouettes. Le logo multiplié par shade s'assombrit donc correctement vers les bords. C'est le mode Produit des pros.
2. **Reflets par-dessus l'encre.** C'est le défaut actuel : la branche logo plafonne à `min(shade, 1.15)`. Le reflet d'une céramique brillante disparaît donc sous le logo, alors qu'en vrai il passe par-dessus, puisque l'encre est sous l'émail. On propose de séparer, sur une surface de révolution, un profil diffus D(θ) ajusté par moindres carrés à k₀ + k₁·max(0, cos(θ − θ_L)) (lambertien, sur la médiane de chaque génératrice) et un résidu spéculaire S = max(0, L − D). Sur un cylindre, les reflets sont des bandes verticales le long des génératrices, ce qui rend cette séparation stable. On compose ensuite `encre × D`, puis `écran(S × brillance[matériau])`, avec une brillance nulle pour le papier et le tissu, et forte pour la céramique, le verre et le métal. C'est l'équivalent calculé du « masque de reflets » peint par les pros. La séparation se fait une fois, à la création de la scène, et produit un `highlights-*.png`.
3. **Fresnel et finitions.** La visibilité cos θ sert aussi de facteur d'incidence : l'encre se fond légèrement dans le reflet vers les silhouettes, (1 − cos θ)⁵ × brillance. Les finitions qui utilisent une normale (dorure, gaufrage) combinent la normale du relief du logo avec la normale de la surface n(θ) = (sin θ, 0, cos θ), au lieu de la seule normale de l'écran. La dorure d'un mug « tourne » alors avec lui.

---

## 6. Conception dans Charta

### 6.1 Schéma (`packages/contracts/src/mockup-scene.ts`)

On ajoute une union discriminée `SurfaceGeometry`. Le champ `quad` actuel reste accepté tel quel, pour ne casser aucune scène.

```ts
// Esquisse de conception, non implémentée.
const Point = z.tuple([z.number().nonnegative(), z.number().nonnegative()]);
const EllipseBy3 = z.strictObject({ left: Point, right: Point, front: Point });

export const SurfaceGeometry = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('quad'), quad: z.tuple([PixelCorner, PixelCorner, PixelCorner, PixelCorner]) }),
  z.strictObject({
    kind: z.literal('revolution'),
    top: EllipseBy3,
    bottom: EllipseBy3,
    profile: z.array(Point).max(32).optional(),       // silhouette gauche ; absent = cylindre ou cône
    radiusRatio: z.number().positive().max(10).optional(), // r_haut / r_bas physique (cône)
    band: z.strictObject({ from: Unit, to: Unit }),   // hauteur imprimable, 0 = haut
    arcDegrees: z.number().positive().max(180),       // largeur maximale du logo autour de l'axe
    centreDegrees: z.number().min(-90).max(90).default(0),
  }),
  z.strictObject({
    kind: z.literal('mesh'),
    cols: z.number().int().min(4).max(31), // 3k+1
    rows: z.number().int().min(4).max(31), // 3m+1
    points: z.array(Point),                // rows × cols, ligne par ligne
  }),
]);
```

- `SceneSurface` reçoit `geometry: SurfaceGeometry.optional()`. Si le champ est absent, on prend `{ kind: 'quad', quad }`. Une vérification `superRefine` contrôle le nombre de points, les points intérieurs à l'image, (F−c)·e et l'absence de grille retournée.
- `parseScene` (`scene.ts`) remplace `homographies` par `mappings: Map<string, SurfaceMapping>`, avec `SurfaceMapping = { kind: 'homography', h } | { kind: 'uvMesh', mesh }`. L'erreur `SCENE_INVALID` garde sa forme actuelle.
- Les scènes PSD reçoivent en option, sur un `slot`, `geometry` à la place de `uv`/`vv`. Cela permet de **recalculer** la carte d'un PSD (par exemple `mug-white` en vrai cylindre) tout en gardant ses calques d'ombre et de reflets.

### 6.2 Fonctions pures (`packages/mockup-engine/src/geometry/`)

Ces fonctions n'utilisent ni DOM, ni `Math.random`, ni `Date`. Elles renvoient des `Result` typés.

| Fonction | Entrée → sortie | Propriétés testées (TDD, une par sabotage) |
|---|---|---|
| `ellipseFrom3(e)` | 3 points → `Ellipse` | Un cercle de face (b = 0) donne une ellipse plate ; F décalé de plus de 0,1·a est refusé |
| `revolutionFrame(g)` | géométrie → V ou A, H, aspect | Silhouettes parallèles : V à l'infini ; l'aspect est égal au rapport physique attendu |
| `revolutionPoint(frame, θ, s)` | → point image + cos θ | θ = 0 donne l'arc avant ; s = 0 et s = 1 retombent sur les ellipses |
| `bezierMeshPoint(grid, u, v)` | → point image | Une grille régulière donne l'identité bilinéaire ; même résultat que `bake.py` sur `mug-white` |
| `tessellate(mapping, C, R)` | → `UvMesh` (positions, uv, visibilité, triangles) | Aucun triangle visible à cos θ ≤ 0 |
| `rasterizeUv(mesh, w, h)` | → `{ u, v, coverage, facing }` en `Float32Array` | Aller-retour à 0,5 px près ; densité au bord = cos θ ± 2 % ; zéro couverture sur la face cachée ; arc → 0 donne le même résultat que l'homographie du quad équivalent |
| `encodeUvMap(map)` | → octets RGBA identiques au format `uv-*.png` | Décodage par `decodeUv` (`render/psd.ts`) sans perte au-delà de 1/65535 |
| `separateHighlights(lum, mapping)` | → profil D(θ), carte S | Photo synthétique lambertienne + reflet gaussien : S retrouve le reflet, D le lobe |

### 6.3 Rendu (`render/`)

- Nouveau programme `UV_PASS` (sommet : position du maillage ; fragment : encodage 16 bits sur deux cibles) qui écrit une texture par surface courbe. Il est exécuté **une fois par scène** et mis en cache : la géométrie ne dépend pas de la marque.
- `SURFACE` reçoit `uMapping` (0 homographie, 1 texture UV), `uFacing` et `uHighlights`. Pour une surface courbe, `logoUv(p)` lit la texture au lieu de `uInverse`. La couverture est multipliée par le masque et par la visibilité, les reflets sont ajoutés par-dessus l'encre, et le Fresnel s'applique près des silhouettes.
- Repli sans WebGL2 : on affiche un aperçu statique, comme aujourd'hui. Le rastériseur CPU permettrait un rendu Canvas 2D lent, mais ce n'est pas prioritaire.

### 6.4 Saisie (outil interne de création de scènes)

C'est une page réservée au développement, sur le modèle des outils `tools/`. Elle affiche la photo avec des poignées :

- **révolution :** 6 poignées (G, D, Avant × haut, bas). Chaque poignée est **aimantée** sur le maximum de gradient de la photo, à ±8 px le long de la normale du contour. Deux poignées optionnelles bornent la bande imprimable, et des points optionnels décrivent le profil de silhouette ;
- **maillage :** on part du quad, avec des boutons « Subdiviser » et « Lisser », et on fait glisser les points de contrôle ;
- un aperçu en direct montre une **mire** (damier numéroté) projetée. C'est le test visuel le plus parlant : les cases doivent se serrer vers les bords et disparaître derrière la silhouette ;
- l'export produit `scene.json`, la carte de reflets et un aperçu `preview.jpg`.

### 6.5 Place de l'IA

Toujours **hors ligne, à la création de la scène**, donc sans aucun coût par rendu. L'IA ne touche jamais aux pixels du logo.

| Niveau | Moyen | Ce qu'il fournit | Statut |
|---|---|---|---|
| 0 | Aimantation sur les contours | Précision au pixel des clics humains | À faire (C-07) |
| 1 | Vision classique : masque de l'objet, silhouettes par RANSAC, ellipse du bord par Fitzgibbon | Les 6 points, sans modèle | À faire (C-08) |
| 2 | **Gemini** (déjà intégré) : le modèle reçoit la photo et renvoie `{ kind, top:{left,right,front}, bottom:{…}, band }` en coordonnées normalisées 0–1000, comme ses boîtes de détection (https://ai.google.dev/gemini-api/docs/image-understanding : « The coordinates, relative to image dimensions, scale to [0, 1000] ») | Une première pose des poignées, puis le niveau 0 l'affine ; JSON validé par Zod à la frontière, comme le veut la règle du projet ; l'humain confirme | À faire (C-08) ; attention au quota de Gemini sans facturation |
| 3 | Segmentation SAM 2 (https://github.com/facebookresearch/sam2, Apache-2.0) ; normales par Marigold (https://github.com/prs-eth/Marigold, code Apache-2.0) ou profondeur par Depth Anything V2 (https://github.com/DepthAnything/Depth-Anything-V2 : « Small » Apache-2.0, Base/Large/Giant CC-BY-NC-4.0, donc **seul Small est utilisable**) | Le masque d'occultation automatique, et pour un tote ou une casquette, une grille initiale déduite des normales | Recherche, plus tard |

Les générateurs « AI-made » (Placeit, Mockey) produisent l'image entière par un modèle. Charta s'y refuse : le logo n'est jamais redessiné. L'IA y sert à mesurer la géométrie, pas à peindre.

---

## 7. Tickets

Le mode compétition autorise plus de 400 lignes par ticket ; nous restons pourtant sous ce seuil, ticket par ticket. Les lignes sont comptées hors tests.

| # | Ticket | Périmètre | Lignes | Dépend de |
|---|---|---|---|---|
| C-01 | ADR-034 « surfaces calculées : révolution et maillage » ; mise à jour de `06_MOCKUP_ENGINE.md` §2–§4 | docs | ~120 (doc) | — |
| C-02 | `SurfaceGeometry` dans `@app/contracts` + rétrocompatibilité de `quad` + `slot.geometry` | contracts | ~150 | C-01 |
| C-03 | `ellipseFrom3`, `revolutionFrame`, `revolutionPoint` (cylindre, cône, profil) | mockup-engine | ~250 | C-02 |
| C-04 | `tessellate`, `rasterizeUv`, `encodeUvMap` (CPU, pur) ; `parseScene` vers `mappings` | mockup-engine | ~250 | C-03 |
| C-05 | `UV_PASS` sur GPU (MRT, cache par scène), branche `uMapping` de `SURFACE`, `textureGrad` ; QA headless en swiftshader | mockup-engine/render + mockup-stage | ~280 | C-04 |
| C-06 | Éclairage courbe : `separateHighlights`, reflets par-dessus l'encre, Fresnel, normale de surface pour dorure et gaufrage | mockup-engine | ~250 | C-05 |
| C-07 | Outil de saisie (poignées, aimantation, mire, export) | tools ou page de développement | ~380 | C-04 |
| C-08 | Proposition des points par vision classique + Gemini (Zod, eval sur 10 photos) | worker/ai | ~300 | C-07 |
| C-09 | `bake.py` : ordre de Photoshop (points de contrôle par l'homographie), refus explicite des préréglages de déformation et des grilles non carrées, `slot.geometry` pour recalculer `mug-white` en cylindre | tools | ~150 | C-02, C-04 |
| C-10 | Scènes : `mug-white` en vrai cylindre, puis 4 photos maison (mug de trois quarts, gobelet carton, bouteille verre, canette, tote) ; licences et `LICENSE.md` | public/scenes | données | C-05, C-07 |

**Chemin critique jusqu'à un résultat démontrable :** C-01 → C-02 → C-03 → C-04 → C-05, plus le cylindre de `mug-white` par C-09 et C-10. Cela représente environ 1 100 lignes et donne un mug dont le logo se serre vers les bords et disparaît derrière la silhouette. C-06 apporte le réalisme de la céramique (reflets sur le logo). C-07 et C-08 rendent la création de scènes rapide. Le maillage de Bézier (tote, casquette) réutilise C-04 et C-05 : il ne demande que l'évaluation de la grille, déjà comprise dans C-09, et sa saisie dans C-07.

## 8. Risques et points non vérifiés

- La qualité de l'approximation orthographique par section (§5.1) n'est pas chiffrée. C-03 doit la mesurer contre des projections synthétiques exactes avant d'être accepté.
- Les pages d'aide d'Adobe et la page de Smartmockups n'ont pas pu être relues (403). Les descriptions du §2.1 viennent du format PSD tel que relu par `bake.py` et psd-tools, et des pratiques courantes des mockups.
- L'état de photocraft évolue vite : deux de ses PR (#12428, #12723) ont été ouvertes le 2026-11-09, la troisième (#8139) le 2026-10-21. Il faudra revérifier avant d'en faire un oracle.
- Les objets transparents (bouteille en verre vue à travers, étiquette visible à l'envers à l'arrière) ne sont pas couverts par cette conception.
- La licence de mockups-design.com reste à soumettre à un juriste avant tout usage.
