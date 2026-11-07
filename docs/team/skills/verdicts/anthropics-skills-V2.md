# anthropics/skills — verdict V2 (sécurité)

> Valideur V2, 2026-11-07. Tarball codeload du commit, extrait dans un dossier vide ; rien exécuté, rien installé. Périmètre : `frontend-design`, `theme-factory`, `brand-guidelines`, `canvas-design`, `webapp-testing`.

**Commit à épingler : `2c5958ecac7cee2b583967a2c4981d0f4a75c579`** (HEAD le 2026-11-07).

## Verdicts par dossier

| Dossier | Verdict | Raison |
|---|---|---|
| `frontend-design` | **ACCEPTÉ** | 2 fichiers (SKILL.md 71 l., LICENSE.txt). Prose seule, aucun script. |
| `theme-factory` | **ACCEPTÉ** | SKILL.md + 10 fiches `themes/*.md` (~500 o chacune) + `theme-showcase.pdf` (124 Ko, 10 pages, aucun `/JavaScript`, `/JS`, `/OpenAction`, `/Launch`). Texte seul. |
| `brand-guidelines` | **ACCEPTÉ-LECTURE-SEULE** | Sûr, mais c'est la charte Anthropic (orange `#d97757`, Poppins/Lora, python-pptx) : inutile pour Charta, à lire comme exemple de structure uniquement. |
| `canvas-design` | **ACCEPTÉ** | SKILL.md 129 l. + 28 familles de polices `.ttf` (5,5 Mo, chacune avec sa licence OFL). Aucun script. Binaires = polices uniquement (`file` : TrueType). Lourd : copier sans `canvas-fonts/` si inutile. |
| `webapp-testing` | **ACCEPTÉ-LECTURE-SEULE** | Voir ci-dessous : `scripts/with_server.py` exécute des commandes shell arbitraires par conception. |

## Preuves

- Aucun `allowed-tools` dans les cinq SKILL.md (frontmatter : `name`, `description`, `license` seulement).
- Grep `curl|wget|eval|base64|npx|pip install|chmod|ignore previous|<!--|https?://` sur les 5 dossiers : seules occurrences = `http://localhost:5173` dans `webapp-testing/SKILL.md:59` et `examples/*.py`. Aucune URL externe, aucun commentaire HTML.
- Scan Unicode invisible (U+200B..200F, 202A..202E, 2060..2064, FEFF, tags U+E0000+) : **0 occurrence** dans tous les `.md`/`.py`.
- Licence : Apache-2.0 (en-tête de `frontend-design/LICENSE.txt`) ; `LICENSE.txt` présent par dossier ; les 4 autres sont des Apache-2.0 de 11 345 o (variante légèrement différente de `frontend-design`, 10 174 o, sans impact). Polices : OFL par fichier. La racine du dépôt n'a pas de licence : n'extraire que ces dossiers.

## webapp-testing (point d'attention)

- `scripts/with_server.py:69-74` : `subprocess.Popen(server['cmd'], shell=True, ...)` : exécute la chaîne passée par `--server`. C'est le comportement documenté (`SKILL.md:41`), pas une porte dérobée : aucun réseau (uniquement `socket.create_connection(('localhost', port))`, l.28), aucun accès disque hors processus lancés.
- `SKILL.md:14` ordonne : « DO NOT read the source until you try running the script first » (script « boîte noire »). **Mauvaise pratique du point de vue de la chaîne** : ce n'est pas une injection (pas d'action malveillante), mais c'est une consigne qui décourage l'audit. Ignorée ; j'ai lu les 4 scripts en entier.
- Exemples Python : écrivent dans `/mnt/user-data/outputs/` et `/tmp/` (chemins Linux d'un autre environnement), pas de lecture de secrets.
- Exige Playwright Python (`pip install playwright` non fourni) : dépendance non autorisée par ADR-026 ; le projet a déjà le MCP `playwright`. Donc lecture seule (patron « reconnaissance puis action »), ne pas exécuter `with_server.py`.

## Injection

Aucune tentative d'injection visant à me faire agir. Seule consigne atypique : `webapp-testing/SKILL.md:14` (ne pas lire les sources), ignorée.

## Conditions d'installation

Copier uniquement le dossier de chaque skill, sans `.git`. Ne copier `webapp-testing/scripts/` et `examples/` que si le propriétaire l'autorise.
