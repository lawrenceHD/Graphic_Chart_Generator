# P-004 — Essai de `vectorcraft-cli` 0.23.0 (2026-11-11)

Essai accordé par le propriétaire le 2026-11-11. Rien n'est branché dans Charta : ce document dit ce que le
programme fait sur de vrais fichiers, pour décider d'un ADR.

## Provenance

- Archive : `vectorcraft-0.23.0-windows-x64-portable.zip` (158 721 510 octets), release `v0.23.0` du dépôt
  GitHub `storytold/vectorcraft`, publiée le 2026-11-09.
- SHA-256 : `a3995376d0871afa3002a55f83b4c5666d17fe223fe72e57b4a2b8cc56657a7a`, identique à `SHA256SUMS.txt`.
- Signature de `SHA256SUMS.txt` : bonne (clé « ArtCraft Linux Release Signing Key », empreinte
  `2B76 741B 414A AD6C D33E 6312 13A0 05C0 B9D7 C3ED`). La clé vient de la même release : cela prouve
  l'intégrité du téléchargement, pas l'identité de l'éditeur.
- Exécuté hors du dépôt, dans le dossier temporaire de la session, avec `--safe-mode` (aucun plug-in) et
  `VECTORCRAFT_NO_PREFS=1` (aucune préférence écrite). Les fichiers d'essai étaient des copies.

## Fichiers et résultats

Commande : `vectorcraft-cli --safe-mode convert IN OUT [--artboard N] [--outline-text]`. Chaque SVG produit a
ensuite été passé dans l'import de Charta (`sanitizeSvg` puis le rasteriseur isolé de `@app/svg-engine`).

| Fichier d'entrée | Sortie | Durée | Import Charta | Rendu |
|---|---|---|---|---|
| SVG avec deux `<text>` (Georgia, Arial), texte « La Mèza » accentué | SVG, `--outline-text` | 0,8 s | Accepté ; l'original est refusé (`<text>`) | Identique, accent et espacement des lettres gardés |
| `la maza.ai` (Illustrator, CMJN, 2 plans de travail) | SVG du plan 1 et du plan 2 | 0,4 à 0,6 s | Accepté | Fidèle (formes, couleurs) |
| `Logo ngo.ai` (vrai logo La Mèza, polices Anecor Gheroos et Eternalo) | SVG du plan 1, `--outline-text` | 1,0 s | Accepté | Fidèle, texte en tracés |
| `la maza.ai` lu comme PDF | SVG | 0,7 s | Accepté | Identique à la lecture `.ai` |
| `la maza.ai` vers EPS, puis EPS vers SVG | EPS puis SVG | 0,6 s puis 0,3 s | Accepté | Fidèle |
| SVG propre (`logo-martinets.svg`) | SVG | 0,2 s | Accepté | Inchangé |

Tous les SVG produits ne contiennent ni `<text>`, ni `<image>`, ni script, ni `foreignObject`. Le seul
avertissement de l'import est `DROPPED_ATTRIBUTE` (attributs `data-name` retirés), sans effet sur le rendu.

## Limites trouvées

1. **Police absente : remplacement silencieux.** Un texte dans une police non installée est converti quand
   même, en Source Sans 3, avec code de sortie 0 et un simple avertissement dans le JSON
   (`fonts that aren't available were written in the fallback font`). Charta doit lire `vectorcraft-cli info`
   avant la conversion et refuser, ou proposer le repli actuel, si une police a `"missing": true`. Sinon le
   logo change de dessin sans que personne le voie.
2. **Plan de travail entier.** La sortie a la taille du plan de travail (A4 paysage ici), le logo y est petit.
   Il faut recadrer sur les tracés (le calcul `svgBBox` de Charta existe déjà) et laisser choisir le plan
   de travail quand il y en a plusieurs.
3. **Avertissements d'import des `.ai`.** « brushes … left out » et « objects … came in as their drawn look » :
   le dessin est gardé, l'édition non. Sans conséquence pour Charta, qui ne fait que lire.
4. **Pas d'EPS réel testé** : l'EPS de l'essai a été écrit par vectorcraft lui-même. Un EPS venu d'un autre
   logiciel reste à essayer.
5. **Poids** : 327 Mo décompressés pour Windows, environ 154 Mo d'archive pour Linux (le serveur). Le
   programme est une application de bureau complète ; il n'existe pas d'archive de la seule commande
   hors macOS.
6. **Maturité** : version 0.23, mises à jour presque quotidiennes ; l'éditeur se dit lui-même à environ
   65 % prêt.

## Recommandation

Le programme fait ce qui manque à Charta, vite et proprement, et sa sortie passe notre propre contrôle
d'import. Proposition d'ADR :

- étape du worker dans un processus isolé (comme le rasteriseur : délai, mémoire, dossier de lecture seul),
  `--safe-mode`, `VECTORCRAFT_NO_PREFS=1`, version figée et vérifiée par SHA-256 dans l'image du serveur ;
- entrée acceptée : `.ai`, `.eps`, `.pdf` et SVG avec texte ; sortie SVG passée ensuite dans `sanitizeSvg`
  comme tout SVG déposé ;
- refus explicite si une police manque (point 1), recadrage sur les tracés (point 2) ;
- le repli actuel (conversion en image) reste en place si le programme échoue ou est absent.

Décision au propriétaire : l'ADR ajoute un binaire externe de 150 Mo à l'image du serveur.
