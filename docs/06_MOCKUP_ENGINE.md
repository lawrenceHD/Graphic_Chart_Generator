# 06 — Moteur de mockups

> Statut : **validé** — Version 4.0 — 2026-10-07
> Package : `mockup-engine` (**navigateur uniquement**). Décision : ADR-008.
> Remplace : `ARCHITECTURE.md` §3.

## 1. Principe

Un mockup est une **photo de scène** (sans logo) sur laquelle le logo est plaqué par calcul : projection en perspective, fusion, ombres, reflets, relief. L'IA générative n'intervient **jamais** sur le logo ni sur la scène finale.

Le rendu se fait dans le navigateur (WebGL2). Le même module pourra tourner plus tard dans Chromium côté worker (backlog) : il ne dépend donc d'aucune interface propre à l'application.

Un logo n'est pas « vectoriel » dans un mockup : le rendu final est un **raster**. La netteté vient de **rasteriser le logo à la résolution de destination** puis de le projeter **une seule fois** avec sur-échantillonnage.

## 2. Périmètre MVP

| Scène | Surface | Finitions |
|---|---|---|
| Carte de visite (vue de dessus) | 1 plan | plate, embossage, dorure |
| Écran d'ordinateur | 1 plan | plate |
| Affiche / cadre mural | 1 plan | plate, embossage |

Hors MVP : surfaces courbes (flacons, tissus), verre dépoli, rétro-éclairage, scènes multi-surfaces.

## 3. Format d'une scène

Dossier `assets/scenes/<sceneId>/` :

```
base.webp          # photo de scène 3840×2160, sans logo (sRGB)
shadow.webp        # occlusion/ombre propre à la zone du logo, niveaux de gris (multiplie)
spec.webp          # reflets spéculaires de la zone, niveaux de gris (additionne)
scene.json
LICENSE.md         # origine et droits de chaque élément
```

```json
{
  "id": "business-card-01",
  "schemaVersion": 1,
  "category": "stationery",
  "size": { "width": 3840, "height": 2160 },
  "surfaces": [
    {
      "id": "front",
      "quad": [[1210, 640], [2480, 705], [2430, 1390], [1175, 1320]],
      "logoBox": { "aspect": 1.75, "fit": "contain", "paddingRatio": 0.18 },
      "baseTint": [0.96, 0.95, 0.93],
      "light": { "direction": [-0.4, -0.6, 0.69] },
      "finishes": ["flat", "emboss", "foil"]
    }
  ]
}
```

- `quad` : 4 coins **dans l'ordre haut-gauche, haut-droit, bas-droit, bas-gauche**, en pixels de la scène.
- `logoBox.aspect` : rapport largeur/hauteur de la zone imprimable ; le logo y est placé en `contain` avec `paddingRatio` de marge.
- `light.direction` : vecteur unitaire (x vers la droite, y vers le bas, z vers l'observateur).
- Validation Zod du `scene.json` ; une scène invalide est refusée au chargement.

Catalogue : `assets/scenes/index.json` liste les scènes par `category` (voir `07_AI_COPILOT.md` pour la classification). Catégorie de repli : `generic`.

## 4. Mathématiques

### 4.1 Homographie

On cherche `H` (3×3, `h33 = 1`) tel que le carré unité `(u, v) ∈ [0,1]²` est envoyé sur le quadrilatère de la scène. Pour chaque correspondance `(x, y) → (X, Y)` :

```
x·h11 + y·h12 + h13 − X·x·h31 − X·y·h32 = X
x·h21 + y·h22 + h23 − Y·x·h31 − Y·y·h32 = Y
```

Les 4 correspondances donnent un système 8×8 résolu par élimination de Gauss avec pivot partiel. Application : `w = h31·x + h32·y + 1`, `X = (h11·x + h12·y + h13)/w`, `Y = (h21·x + h22·y + h23)/w`.

**Vecteur de référence** : carré unité `(0,0) (1,0) (1,1) (0,1)` vers `(100,50) (420,80) (400,300) (120,260)` :

| h11 | h12 | h13 | h21 | h22 | h23 | h31 | h32 |
|---|---|---|---|---|---|---|---|
| 290,384615 | 36,538462 | 100 | 24,358974 | 245,833333 | 50 | −0,070513 | 0,137821 |

Points de contrôle : `(0,5 ; 0,5)` → `(254,8837 ; 179,0698)` ; `(0,25 ; 0,75)` → `(184,2066 ; 221,4760)`. Tolérance 0,001 px. Fichier : `docs/golden/color.golden.json`, clé `homography`.

### 4.2 Rendu par projection inverse

Le fragment shader travaille **dans l'espace de la scène**. Pour chaque pixel `p = (X, Y)` : `uv = H⁻¹ · (X, Y, 1)`, puis division par la composante `w`. Si `uv` est hors de `[0,1]²`, le logo ne contribue pas.

- **Sur-échantillonnage 4×** (grille 2×2 de sous-pixels) pour éviter le crénelage des bords.
- Texture du logo en **mipmaps** avec filtrage trilinéaire ; anisotropie maximale disponible (`EXT_texture_filter_anisotropic`).
- Le logo est **rasterisé à la résolution réelle de la surface projetée** (au moins la largeur du quad en pixels × 1,5), jamais agrandi depuis une miniature.
- Alpha **prémultiplié** pour toutes les fusions.

### 4.3 Finitions

Notations : `B` = couleur de la scène, `A` = alpha du logo projeté, `S` = ombre (0–1), `P` = spéculaire (0–1), `L` = vecteur de lumière unitaire.

**Impression plate (`flat`)** :
```
ink   = logo.rgb · baseTint            // l'encre prend la teinte du support
mixed = mix(B.rgb, B.rgb · ink, A · 0.92)   // multiplication, sauf logo clair
if luminance(logo.rgb) > 0.8:  mixed = mix(B.rgb, ink, A · 0.92)   // encre claire : fusion normale
out   = mixed · mix(1.0, S, 0.6)
```

**Embossage / débossage (`emboss` / `deboss`)** :
1. Carte de hauteur `Hm` = flou gaussien (rayon 2,5 px à 3840 de large) de `A`.
2. Normale : `N = normalize(vec3(−k·∂Hm/∂x, −k·∂Hm/∂y, 1))`, `k = 6` (inversé pour `deboss`).
3. Éclairage : `shade = dot(N, L) − dot(vec3(0,0,1), L)`.
4. `out = B.rgb + shade · 0.35` + ombre portée décalée de `(2, 3)` px dans la direction opposée à `L`, intensité 0,25, flou 3 px.
5. L'encre peut être **absente** (embossage à sec) ou présente (option).

**Dorure (`foil`)** :
1. Même normale que l'embossage (relief léger).
2. Rampe métallique : `t = clamp(0.5 + 0.5·dot(reflect(−L, N), V) + 0.15·noise(uv·40), 0, 1)`, `V = (0,0,1)`.
3. `foil = mix(foilDark, foilLight, smoothstep(0.15, 0.85, t))` avec `foilDark = (0.45, 0.33, 0.12)`, `foilLight = (1.0, 0.86, 0.5)` pour l'or ; `(0.55, 0.57, 0.6)` / `(0.95, 0.96, 0.98)` pour l'argent.
4. `out = mix(B.rgb, foil, A) + P · A · 0.5`.

Les constantes ci-dessus sont des **valeurs de départ** ; elles sont ajustées visuellement lors de la revue (§7) mais leur structure est contractuelle.

### 4.4 Sortie

- Aperçu : 1280 px de large, rendu à chaque changement (cible < 100 ms).
- Export : 3840 × 2160, rendu sur un `OffscreenCanvas` ; si la texture maximale du GPU est inférieure, **rendu par tuiles** de 2048 px assemblées. Format PNG (sRGB).
- Le **hash de rendu** = SHA-256 de `sceneId + schemaVersion + finish + sha256(logoVariant) + couleurs d'encre + version du moteur`. Le résultat est téléversé comme asset `mockup_render` et réutilisé tant que le hash ne change pas.

## 5. API du package

```ts
type RenderRequest = {
  scene: SceneDefinition;            // validé par Zod
  surfaceId: string;
  logoSvg: string;                   // SVG ASSAINI uniquement
  finish: 'flat' | 'emboss' | 'deboss' | 'foil';
  foilMetal?: 'gold' | 'silver';
  size: { width: number; height: number };
};
renderMockup(canvas, request, loaders): Promise<Result<RenderMeta, RenderError>>;
```

- `loaders` (chargement d'images et du logo) est **injecté** pour permettre les tests.
- Erreurs prévisibles : `WEBGL_UNAVAILABLE`, `TEXTURE_TOO_LARGE` (puis repli par tuiles), `SCENE_INVALID`, `LOGO_RASTERIZATION_FAILED`.
- Le logo SVG est rasterisé via un `<img>` alimenté par une URL `blob:` ; **jamais** injecté dans le DOM.
- Si WebGL2 est indisponible : message clair, aperçu statique de la scène, aucune plantade.

## 6. Production des scènes

La production des scènes est le vrai poste de travail. Elle n'est **pas** confiée à l'agent de code.

### 6.1 Méthode recommandée : Blender (logiciel libre)

1. Modéliser la scène (carte, écran, cadre) avec une caméra fixe à 3840 × 2160.
2. Sources autorisées pour modèles et lumières : créées pour le projet, ou licence **CC0** (par exemple Poly Haven), la licence étant consignée dans `LICENSE.md`.
3. Rendre : `base` (sans logo), `shadow` (passe d'occlusion de la zone), `spec` (passe spéculaire de la zone).
4. Exporter les **coins du quad** par script : projeter les 4 sommets du plan du logo dans l'image de la caméra (coordonnées pixel). Aucun placement à la main.
5. Écrire `scene.json` et vérifier avec le validateur du package.

Avantages : droits entièrement maîtrisés, passes parfaites, scènes reproductibles.

### 6.2 Méthode alternative : images générées

Une image de base peut être produite par un modèle d'image **à condition** que les conditions d'utilisation autorisent l'usage commercial, que l'image soit **sans logo ni texte**, et que les 4 coins soient placés à la main. Qualité des ombres et du relief moins garantie. À valider scène par scène.

### 6.3 Checklist de scène

- [ ] Résolution 3840 × 2160, sRGB, sans logo ni texte lisible.
- [ ] Quad ordonné, coins en pixels entiers.
- [ ] Passes `shadow` et `spec` alignées (même résolution).
- [ ] `LICENSE.md` complet.
- [ ] Rendu de test avec 3 logos (clair, sombre, très fin) examiné par le propriétaire.

## 7. Revue visuelle (obligatoire)

Le shader est l'un des points faibles connus de l'agent de code. Protocole :

1. Le chef de projet fournit les formules (§4) : l'agent les **traduit**, il ne les invente pas.
2. Tests numériques automatiques : homographie (§4.1), coins projetés, bornes de sortie.
3. Tests visuels automatiques : comparaison avec des images de référence (tolérance perceptuelle) pour 3 logos de test × 3 scènes × finitions.
4. **Revue humaine** : le propriétaire fournit des captures d'écran des rendus ; le chef de projet valide ou ajuste les constantes.

## 8. Critères d'acceptation

- **AC-M1** : les 4 coins du logo projeté coïncident avec le quad à ±0,5 px.
- **AC-M2** : le logo ne présente ni flou ni crénelage visible à 100 % sur le 3840 × 2160 (revue humaine + différence perceptuelle vs référence).
- **AC-M3** : changer la couleur d'un logo en SVG simple met à jour l'aperçu en moins de 200 ms.
- **AC-M4** : export 3840 × 2160 en moins de 3 s sur l'ordinateur de référence.
- **AC-M5** : sans WebGL2, l'application ne plante pas et explique la situation.
- **AC-M6** : un SVG non assaini est refusé par `renderMockup`.
