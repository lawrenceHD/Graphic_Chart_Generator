# Verdict V1 — anthropics/skills (5 dossiers)

- Commit à épingler : `2c5958ecac7cee2b583967a2c4981d0f4a75c579` (HEAD relevé par `git ls-remote`, tarball codeload lu).
- Licence : chaque dossier porte un `LICENSE.txt` Apache-2.0 (« Copyright 2026 Anthropic, PBC », ligne 190). Le dépôt racine n'a aucun LICENSE : ne copier que les dossiers.
- Aucun des 5 `SKILL.md` ne déclare `allowed-tools`. Grep `curl|wget|eval|base64|npx -y|pip install|chmod|ignore previous|rm -rf|process.env|child_process` : aucune occurrence dans les 5 `SKILL.md` ni dans les scripts, sauf `subprocess` dans `with_server.py` (voir plus bas).
- `SKILL.md` lus intégralement : les 5. Scripts lus intégralement : `with_server.py` (106 l.), 3 exemples Python.

| Skill | Verdict |
|---|---|
| frontend-design | ACCEPTÉ-LECTURE-SEULE |
| theme-factory | REFUSÉ |
| brand-guidelines | REFUSÉ |
| canvas-design | REFUSÉ |
| webapp-testing | REFUSÉ |

## frontend-design — ACCEPTÉ-LECTURE-SEULE
- 2 fichiers (SKILL.md 71 l., LICENSE.txt), aucun script, aucun réseau. Sûr à installer techniquement.
- Qualité : bonne, courte. Apport réel et nouveau : la liste de calibrage des « tells » d'une page générée (`SKILL.md` l.38-45 : crème + terracotta, noir + vert acide, kit « SaaS-card », chrome de gabarit) et le processus « plan de tokens, relecture contre le brief, build, critique » (l.36-53).
- Redondance : forte avec `impeccable` (même nom `frontend-design`, même vocation : direction esthétique, anti-défauts IA). Risque de double consigne contradictoire et de collision de nom.
- Décision : lecture seule. Extraire la liste des « tells » (l.38-45) comme checklist de revue vers `docs/team/`, ne pas installer à côté d'impeccable.

## theme-factory — REFUSÉ
- Cible les diaporamas (`SKILL.md` l.14 : « presentation slide decks »), 10 thèmes génériques en .md (palette 4 couleurs + polices DejaVu, ex. `themes/tech-innovation.md`).
- Contient un binaire `theme-showcase.pdf` (124 Ko), refus par défaut des binaires. Aucune pertinence pour Next.js/Tailwind/Zod ; Charta a son propre moteur de couleurs et ses thèmes jour/nuit/système.

## brand-guidelines — REFUSÉ
- Applique la charte **d'Anthropic** (couleurs `#141413`, `#d97757`…, Poppins/Lora, l.19-35) via `python-pptx` (l.72). Hors sujet, risque de marque (usage de l'identité d'un tiers).

## canvas-design — REFUSÉ
- Produit des affiches PNG/PDF (« creating a poster », l.3) ; 5,5 Mo de binaires (~80 fichiers `.ttf` + OFL dans `canvas-fonts/`).
- Le texte pousse à la surenchère (« countless hours », répété l.48, 83, 114, 122) sans pertinence pour une interface Next.js. Non pertinent, binaires.

## webapp-testing — REFUSÉ
- `scripts/with_server.py` l.68-74 : `subprocess.Popen(server['cmd'], shell=True, ...)` ; l.88 `subprocess.run(args.command)` : exécute des chaînes arbitraires fournies à la ligne de commande, `shell=True`. Le `SKILL.md` l.14 demande de traiter le script en « boîte noire » sans le lire : pratique à proscrire.
- Python + Playwright Python (non installés dans le projet) ; chemins Linux codés en dur (`/mnt/user-data/outputs`, `/tmp`, exemples).
- Redondant : le serveur MCP `playwright` du dépôt et le skill `browser-qa` (axe-core, trois points de rupture) couvrent déjà ce besoin.
