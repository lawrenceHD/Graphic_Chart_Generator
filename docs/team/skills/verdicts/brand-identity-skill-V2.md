# fatihaydost/brand-identity-skill — verdict V2 (sécurité)

> Valideur V2, 2026-11-07. Tarball codeload, dossier vide ; rien exécuté, aucun `uv`/`pip`.
> Portée de l'audit : `SKILL.md` lu en entier ; `pydeps.py`, chemins réseau (`typelib.py`, `site_palette.py`, `font_audit.py`), sous-processus (`brand.py`, `pipeline.py`, `kit_build.py`, `render_png.py`, `cdplib.py`, `site_preview.py`) lus aux points d'appel ; grep exhaustif des 24 scripts Python (21 400 lignes) sur réseau, exec, eval, base64, environ, pickle, ctypes, shutil.rmtree. Je n'ai **pas** relu ligne à ligne les 21 400 lignes de calcul (logolib, colorlib, etc.) : voir réserve.

**Verdict : ACCEPTÉ-LECTURE-SEULE** (références `references/*.md` et `SKILL.md` comme checklists ; ne pas exécuter `scripts/` sans autorisation écrite du propriétaire).
**Commit à épingler (si lecture ou installation ultérieure) : `3ba008e57b9363cf2a9117303237f951a7c1ef00`** (HEAD le 2026-11-07, v1.1.1 par `plugin.json`).

## Aucune malveillance trouvée

- Pas d'`allowed-tools` (frontmatter `SKILL.md:1-5` : `name`, `description`, `license: MIT`).
- Aucun appel `eval`/`exec`/`pickle`/`marshal`/`ctypes`/`os.system` ; les `base64` servent aux captures PNG CDP et aux polices intégrées ; aucun `POST` (`Request(...)` seulement en GET : `typelib.py:95`, `site_palette.py:399`).
- Aucune lecture de `.env`, `.ssh`, clés ou jetons ; `os.environ` limité à des variables de navigateur/cache (`BRAND_IDENTITY_BROWSER`, `XDG_CACHE_HOME`, `PLAYWRIGHT_BROWSERS_PATH`, `LOCALAPPDATA`...).
- Les hôtes contactés correspondent à la section « Network and privacy » du README (`README.md:168-179`) : `fonts.googleapis.com`, `fonts.gstatic.com` (`typelib.py:41,306`), `raw.githubusercontent.com/google/fonts` (`typelib.py:40`, `font_audit.py:42`), PyPI via uv, et les sites fournis par l'utilisateur. Pas de télémétrie.
- Commentaires HTML : uniquement dans des gabarits (`templates/mock-sites/*.html`, `presentlib.py`) ; Unicode invisible : un seul U+FEFF, dans une chaîne `_JS_WS` de `site_palette.py:684` (liste d'espaces JavaScript, bénin).
- Pas d'injection dans `SKILL.md`, `references/*.md` (grep `ignore previous|curl|wget|secret|token` : rien d'actionnable). `.claude/` ne contient que `.gitkeep`. Pas de hooks, pas de `.mcp.json`. Seuls `.sh` : 6 `evals/*/scaffold.sh` (copient des fichiers, `scaffold.sh:2`), non installés.
- CI : actions épinglées par SHA (`.github/workflows/test.yml:23,26`).
- Licence MIT (+ `THIRD_PARTY_NOTICES.md`, `TRADEMARKS.md`).

## Raisons de ne pas l'exécuter (risques réels, pas malveillants)

1. **Installation de paquets cachée** : `SKILL.md:26` « With uv the scripts fetch their own packages » ; `pydeps.py:7-9` lance `uv run --no-project --with-requirements requirements.txt` à la volée. Dépendances : `fonttools[woff]>=4.50`, `uharfbuzz>=0.40`, `skia-pathops>=0.8` (bornes basses seulement, **non épinglées**, wheels natifs). Équivalent d'un `pip install` sans lockfile : interdit sans ADR/autorisation (ADR-026). `pydeps.py:34-35` affiche en plus `curl ... | sh` / `irm ... | iex` pour installer uv (affichage seul, jamais exécuté par le script).
2. **Récupération d'URL arbitraires sans garde SSRF** : `site_palette.py:383-415` télécharge n'importe quelle URL http(s) (redirections suivies, 5 max) avec `ctx.check_hostname = False` et `ctx.verify_mode = ssl.CERT_NONE` (TLS non vérifié, par analogie avec `ignoreHTTPSErrors` de Playwright), et accepte `file://` (l.344-349). Aucun filtre localhost/IP privées/métadonnées cloud. Risque : si l'agent est amené (injection par une page tierce) à fournir une URL interne, le script la lit et la rend dans un navigateur.
3. **Lancement de Chrome** via DevTools (`cdplib.py`, `render_png.py` : `subprocess.Popen`, `taskkill /F /T` sous Windows `render_png.py:168-171`). Local, mais exécute un binaire de la machine.
4. **Écritures hors projet** : cache `~/.cache/brand-identity` (polices, venv de repli) via `typelib.py:76`, `pydeps.py:71-74`.
5. **Taille** : 352 fichiers dans le dépôt, 21 400 lignes Python, 61 `.sh/.mjs` (`evals/`) selon le chercheur : audit exhaustif non raisonnable avant le 09/11, d'où la lecture seule. Recoupe aussi le cœur du produit (`logo-kit`, `color-engine`).

## Réserve

Verdict « pas de malveillance détectée » fondé sur grep exhaustif + lecture des points sensibles, pas sur une relecture intégrale de `logolib.py` (2 767 l.), `cdplib.py` (1 651 l.), `site_palette.py` (1 520 l.) etc. Une promotion à ACCEPTÉ exigerait : relecture complète, `requirements.txt` épinglé avec hashes, suppression de `CERT_NONE`, garde SSRF.

## Conditions de lecture seule

Copier au plus `skills/brand-identity/SKILL.md` et `references/*.md` (ou les lire sur le tarball épinglé). Ne pas copier `scripts/`, `assets/` (JSON, `languages.json.gz`, `gallery.html` inclus), `evals/`, `.claude-plugin/`. Ne pas lancer `brand.py`, `pydeps.py`, ni `uv run`.

## Injection

Aucune tentative d'injection trouvée.
