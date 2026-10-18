# Bibliothèque de logos de référence

`pnpm logos:fetch` télécharge dans `.cache/logo-library/` (ignoré par Git) la bibliothèque de
[logo-design-skill](https://github.com/kaankiziltug/logo-design-skill), au commit figé dans `fetch.mjs` :
1 432 logos SVG réels, classés par type de marque, technique, géométrie, sujet, couleur et secteur
(`catalog.json`, `classifications.json`), avec une galerie locale (`gallery.html`).

## Droits — à lire avant usage
Chaque logo est une **marque de son propriétaire**. La licence MIT du dépôt ne s'y applique pas.
- **Autorisé** : étudier la construction et les conventions d'un secteur ; vérifier localement que
  l'assainisseur SVG (T-007) et la rasterisation (T-008) supportent de vrais fichiers d'éditeurs ;
  alimenter le skill `logo-design` (`search_library.py`).
- **Interdit** : commiter ces fichiers, en faire des fixtures de test versionnées (`docs/05_ENGINES.md` §6 exige
  des logos libres de droits), les intégrer à l'application, aux mockups, aux exemples ou au marketing.

## Usage avec le skill `logo-design`
Le skill cherche `assets/library/` à côté de son `SKILL.md`. Pour l'activer en local, copier ou lier le dossier
`.cache/logo-library/skills/logo-design/assets` dans `.claude/skills/logo-design/` ; ce dossier est ignoré par Git.
