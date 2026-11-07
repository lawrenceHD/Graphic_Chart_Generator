# vladzima/colormason — verdict V2 (sécurité)

> Valideur V2, 2026-11-07. Tarball codeload, dossier vide ; aucun script exécuté (analyse statique de `palette.py`).

**Verdict : ACCEPTÉ** pour le dossier `colormason/` uniquement (SKILL.md + `references/` + `scripts/palette.py`). Ne pas copier `examples/` ni `.github/`. Utilité fonctionnelle : recoupe `color-engine` ; à décider par le chef de projet, pas par la sécurité.
**Commit à épingler : `41c466a664732c8ef9efc7b7dc01951cda7ae9c0`** (HEAD le 2026-11-07).

## Preuves

- Frontmatter (`colormason/SKILL.md:1-10`) : `license: MIT`, `compatibility: Requires Python 3.8+ (stdlib only). No network access, no npm/pip installs.` ; aucun `allowed-tools`.
- `scripts/palette.py` (505 l., lu en entier) : imports uniquement `argparse, json, math, sys` (l.14-17). Aucun `open()`, `subprocess`, `os`, `socket`, `urllib`, `eval`, `exec`, `base64`, `environ`. Entrée : arguments CLI ; sortie : `print()` sur stdout, avertissements sur stderr (l.~490-497). Calcul OKLCH/WCAG pur et déterministe.
- Validation d'entrée : `hex_to_rgb` rejette tout ce qui n'est pas 6 chiffres hex (`ValueError` → `SystemExit`).
- `references/*.md` et `README.md` : aucun curl/wget/eval/base64/commentaire HTML/URL d'exfiltration (la seule URL externe est l'image du README sur `cdn.arbatov.dev`, non chargée par le skill). Scan Unicode invisible : 0.
- `README.md:27` propose `npx skills add vladzima/colormason` : instruction d'installation pour l'humain, **à ne pas utiliser** (installation non épinglée).
- Licence MIT, « Copyright (c) 2026 vladzima ».
- `examples/poster.py` (hors périmètre, non à installer) : importe `subprocess` et lance `convert` (ImageMagick) l.341 ; sans danger mais exclu.
- `.github/workflows/ci.yml` : CI du dépôt, non installée.

## Condition

Exécution de `palette.py` : acceptable avec `python -I` (même si le code est stdlib seule). Pas d'accès disque ni réseau, donc sans risque de fuite.

## Injection

Aucune.
