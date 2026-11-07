# Verdict V1 — fatihaydost/brand-identity-skill

- Verdict : **ACCEPTÉ-LECTURE-SEULE** (uniquement `skills/brand-identity/SKILL.md` et `references/*.md`). Exécution des scripts : **REFUSÉE**.
- Commit à épingler : `3ba008e57b9363cf2a9117303237f951a7c1ef00`.
- Licence : MIT (`LICENSE`, « Copyright (c) 2026 Fatih Aydost »). Polices embarquées avec OFL ; `THIRD_PARTY_NOTICES.md` de 27 Ko. Pas d'`allowed-tools` dans le frontmatter.

## Preuves
- Taille : 352 fichiers au dépôt ; le skill seul pèse ~4,4 Mo : 24 scripts Python (`logolib.py` 128 Ko, `cdplib.py` 79 Ko, `site_palette.py` 74 Ko, `kit_build.py` 57 Ko…, ≈ 1,0 Mo de code), `site/site_engine.js` 98 Ko, catalogues JSON de 1,2 Mo et 580 Ko, `gallery.html` 312 Ko, `languages.json.gz`.
- **Lecture intégrale des scripts : impossible dans le cadre de la mission** (≈ 1,1 Mo de code). Lus entièrement : `SKILL.md` (120 l.), `pydeps.py` (partiel : l.20-60 et 100-160), `references/ai-defaults.md` (début), `references/cohesion.md` (40 premières lignes). Le reste : grep seulement. Sans lecture intégrale, aucun avis « exécutable » n'est défendable.
- Exécution/réseau relevés par grep :
  - `scripts/pydeps.py` l.34-35 : propose `curl -LsSf https://astral.sh/uv/install.sh | sh` et `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"` ; `ensure()` (l.133-160) relance le script dans un environnement `uv` construit à la volée depuis `requirements.txt` (`fonttools`, `uharfbuzz`, `skia-pathops`) : installation de dépendances à l'exécution.
  - `SKILL.md` l.26 : « With uv the scripts fetch their own packages ».
  - `scripts/typelib.py` l.40-42, 253-312 ; `font_audit.py` l.42, 866 : téléchargements depuis `raw.githubusercontent.com/google/fonts` et `fonts.googleapis.com`/`fonts.gstatic.com`.
  - `scripts/cdplib.py` (websocket DevTools), `render_png.py` : lancement d'un Chrome/Chromium local piloté par CDP (`subprocess`, l.35 et 717-805).
  - `scripts/site_palette.py`, `site_preview.py` : `site extract <URL>` charge un site tiers dans le navigateur ; `scripts/site/site_engine.js` contient 12 `eval(...)` (l.260, 393, 758, 839, 854, 929, 1079, 1098, 1249…).
  - `os.environ.get("BI_CDP_TRACE")` ouvre un fichier de trace en écriture (`cdplib.py` l.49).
- Aucun `ignore previous`, aucun motif d'injection dans `SKILL.md` ni dans `references/`.

## Pertinence et redondance
- Pertinence : le cœur de métier de Charta (logo, typographie, palette, kit) est le même. La méthode (mécanisme unique, axes `warm_cool`…, test de réflexe contre les défauts de l'IA, honnêteté mesuré/jugement : `SKILL.md` l.49-63, 101-107 ; `references/cohesion.md`, `ai-defaults.md`) est de bonne qualité et nouvelle par rapport à impeccable/ux-ui-agent-skills.
- Mais le skill duplique des briques que Charta possède déjà (`color-engine`, `logo-kit`, `svg-engine`, exports de tokens) et dépend de Python + Chrome + `uv`, hors stack TypeScript/Zod. Windows 11 : chemin `%LOCALAPPDATA%\brand-identity\venv` (pydeps.py l.72-73).
- Pas de Zod, pas de TS : aucun code réutilisable.

## Décision
- Lecture seule : extraire en checklist `references/ai-defaults.md`, `cohesion.md`, `critique.md`, `type.md`, `color.md` vers `docs/team/` ; ne rien installer sous `.claude/skills/` (le `SKILL.md` ordonne l'exécution des scripts).
- À relire avant extraction : les `references/*.md` n'ont été lus qu'en partie (693 lignes au total).
