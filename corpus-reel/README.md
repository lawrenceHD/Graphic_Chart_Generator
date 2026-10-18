# Corpus réel (local, jamais commité)

Logos et chartes graphiques trouvés en ligne (Pinterest, Behance…), déposés par le propriétaire pour tester le
produit sur de vrais fichiers. Ils appartiennent à leurs auteurs : ce dossier est **ignoré par Git** (seul ce README
est suivi), comme la bibliothèque de `tools/logo-library/`.

## Sauvegarde et partage
Le dépôt public ne reçoit jamais ces fichiers. Ils sont rangés et versionnés dans le dépôt **privé**
`lawrenceHD/Graph_Charta` (lots `raw/`, chartes PDF `charters/`, bibliothèque de 1 432 SVG `library/`), récupérable
sur une autre machine par `pnpm corpus:fetch` (dans `.cache/corpus-private/`, accès SSH requis).

## Rôle
- **Complément** du corpus de 20 logos de `packages/svg-engine/fixtures/` (`docs/05_ENGINES.md` §6), créé pour le
  projet et versionné. Le corpus réel ne le remplace pas et ne sert jamais de fixture de test commitée.
- **Vérité terrain réelle** : quand une charte d'une page donne les codes couleur de la marque, on compare la palette
  extraite du logo (T-005) aux codes officiels.
- **Robustesse** : JPEG compressés, fonds texturés, petites résolutions, comme ce que les utilisateurs enverront.

## Comment déposer
En vrac : le propriétaire dépose tout à la racine du dossier, l'agent trie ensuite en un dossier par marque
(nom en minuscules sans espaces) :

```
corpus-reel/
  cafe-lumen/
    logo.png          ← le logo seul, le plus grand possible (SVG, PNG, JPEG ou WebP)
    charte.jpg        ← facultatif : la charte d'une page (couleurs, typos, variantes)
    notes.txt         ← facultatif : lien d'origine, codes couleur s'ils sont lisibles
```

Un logo sans charte est utile aussi. Idéal : un mélange de cas (1 à 4 couleurs, dégradés, logo blanc sur fond
foncé, monogramme, logo avec texte fin), de 5 à 15 marques.

## Critères d'exploitabilité (vérifiés par l'agent)
| Critère | Exploitable | Limite | Inexploitable |
|---|---|---|---|
| Taille du logo | ≥ 500 px de côté | 200–500 px | < 200 px |
| Isolement | logo seul, fond uni | fond uni avec marge irrégulière | logo sur photo ou mockup |
| Compression | PNG ou JPEG net | JPEG avec halos légers | artefacts visibles, filigrane |
| Charte | codes hex/RGB lisibles | couleurs visibles sans codes | absente (le logo reste utile) |
