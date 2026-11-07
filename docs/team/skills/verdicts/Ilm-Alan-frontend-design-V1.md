# Verdict V1 — Ilm-Alan/frontend-design

- Verdict : **ACCEPTÉ** (installation sous un nom distinct, usage sur demande).
- Commit à épingler : `f8966e6cc9b90247aa102d71f7e675ec3462b419`.
- Licence : MIT (`LICENSE.txt` : « Copyright (c) 2025 Alan »).
- Contenu : 3 fichiers seulement (`SKILL.md` 115 l., `README.md`, `LICENSE.txt`), tous lus. Aucun script, aucun binaire, pas d'`allowed-tools` (frontmatter l.1-4 : `name`, `description` seulement).
- Grep `curl|wget|eval|exec|base64|npx|pip |chmod|ignore previous|rm -rf|process.env|child_process|http` : seules occurrences = trois `git clone https://github.com/Ilm-Alan/frontend-design.git` dans `README.md` l.10, 16, 30 (documentation d'installation, non exécutée).

## Qualité et apport
- Huit « ancres » esthétiques verrouillées sur des tokens CSS (`SKILL.md` l.48-94 : Swiss, Industrial, Brutalist, Aurora, Chaotic, Retro-Futuristic, Organic, Lo-Fi) et un processus court (l.14-24 : contexte, ancre, différenciateur, système, implémentation).
- **Apport nouveau** par rapport à impeccable et ux-ui-agent-skills : la discipline de **contenu** (l.28-40) : pas de données inventées (`a.chen@grid.co`), pas de libellés de remplissage, pas de remplacement thématique du texte d'interface standard (« Authenticate Session » au lieu de « Next »), pas de glyphes unicode en guise d'icônes. Directement utile pour les maquettes et la démo La Mèza.
- Contreparties : l'obligation « hybrider = erreur de catégorie » (l.24) et les listes « Breaks if » (ex. l.52, 58) sont rigides et peuvent entrer en conflit avec la direction propre de Charta (thèmes jour/nuit/système, tokens maison). Le skill se déclare « Reach for the unexpected » : à encadrer.
- Redondance avec impeccable : partielle (même vocation, nom identique `frontend-design`).

## Conditions d'installation
1. Renommer le dossier/le champ `name` en `frontend-anchors` (collision de nom avec `frontend-design` d'impeccable et d'Anthropic).
2. Ne l'invoquer que sur demande explicite ; impeccable reste prioritaire (règle « design d'abord »).
3. Ajouter la ligne dans `.claude/skills/SOURCES.md` avec le commit ci-dessus et le sha256 du tarball.
