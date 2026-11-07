# Verdict V3 — trailofbits/skills (agentic-actions-auditor, sharp-edges, differential-review)

Valideur V3 (généraliste), 2026-11-07. Commit épinglé : `e4dd0bb5b15535f7c5a0834187dffba6ac37e4ff` (tarball codeload, extrait en dossier vide ; rien exécuté).
Licence : CC-BY-SA-4.0 (fichier `LICENSE` racine, ligne 1 « Attribution-ShareAlike 4.0 International »).

| Plugin | Verdict | Raison |
|---|---|---|
| sharp-edges | **ACCEPTÉ** (sous-ensemble) | `allowed-tools: Read Grep Glob` (SKILL.md l.4), agent `tools: Read, Grep, Glob`. Aucun script, aucun réseau. |
| agentic-actions-auditor | **ACCEPTÉ-LECTURE-SEULE** | `allowed-tools: Read Grep Glob Bash` (l.4) : Bash non borné au frontmatter, limité seulement par le texte (l.95-107 « Bash is ONLY for gh api »). Pertinence faible aujourd'hui. |
| differential-review | **REFUSÉ** | `allowed-tools: Read Write Grep Glob Bash` (l.4 ; `commands/diff-review.md` l.4 idem) ; corpus orienté Solidity ; doublon de `code-reviewer` et `security-review`. |

## Preuves

Fichiers lus : SKILL.md des trois plugins en entier, agent `sharp-edges-analyzer.md` (en-tête + grep), `adversarial-modeler.md` (en-tête), `commands/diff-review.md`, `plugin.json`, `openai.yaml`, README. Les ~30 fichiers `references/` ont été passés au grep (curl, wget, eval, exec, base64, npx -y, pip install, chmod, ignore previous, rm -rf, process.env, child_process, WebFetch, URLs) et échantillonnés, pas relus ligne à ligne. Aucun script (`.py`, `.sh`, `.js`) dans les trois plugins ; seulement `.md`, `.json`, `.yaml`, un `.svg` (sans script/href/onload).

Grep : toutes les occurrences de `eval`, `exec`, `curl`, `rm -rf`, `base64` sont des exemples de code vulnérable ou des motifs à détecter (ex. `vector-g-eval-of-ai-output.md:67-78`, `lang-php.md:167-170`, `case-studies.md:186`). Aucune consigne du type « ignore previous », aucune demande d'installer ou d'exécuter quoi que ce soit. Seule requête réseau : `gh api repos/{owner}/{repo}/contents/...` (agentic-actions-auditor, SKILL.md l.72-80), mode « audit distant » facultatif.

### sharp-edges
Utile pour l'axe « pit of success » : schémas Zod, config/env, API de packages (`config-patterns.md`, `auth-patterns.md`, `lang-javascript.md`). Partiellement redondant avec `typescript-reviewer` et `silent-failure-hunter` (catégorie 5 « Silent Failures »), mais méthode distincte (trois adversaires). Installation recommandée : `SKILL.md`, `agents/sharp-edges-analyzer.md`, `references/{config-patterns,auth-patterns,crypto-apis,case-studies,lang-javascript}.md`. Les liens vers `lang-c/go/rust/...` seraient cassés (acceptable), ou garder tout le dossier (141 Ko).

### agentic-actions-auditor
`ci.yml` n'utilise aucune action IA (checkout, gitleaks-action, pnpm/action-setup, setup-node) ni `pull_request_target`/`issue_comment`. À consulter seulement si `claude-code-action` / `run-gemini-cli` est ajouté. Pas d'installation active ; si copié, retirer `Bash` (modification = adaptation, voir licence).

### differential-review
`methodology.md`/`patterns.md` : 22 occurrences Solidity/reentrancy/`onlyOwner` (grep), exemples `*.sol`. Impose d'écrire un fichier rapport (« Output report only to chat (file required) » listé en « Don't », SKILL.md l.210). Bash non borné + Write suffisent au rejet (SKILLS-CHAIN §2). Doublon : `code-reviewer`, `security-review`, `verification-loop` (phase diff review).

## Obligations CC-BY-SA-4.0 pour un dépôt privé/commercial (information, pas un avis juridique)

1. **Attribution (BY)** : conserver le nom de l'auteur (Trail of Bits), l'URL du dépôt, le lien vers la licence et son nom ; l'inscrire dans `.claude/skills/SOURCES.md` (dépôt, commit, licence, modifié oui/non). Indiquer les modifications (ex. retrait de `allowed-tools: Bash`).
2. **Partage à l'identique (SA)** : se déclenche seulement quand on **partage** le matériel adapté. Un usage interne dans un dépôt privé, sans diffusion, n'impose rien. Dès que le dépôt (ou un zip) est transmis à un tiers (jury, prestataire, dépôt public pour le concours, open-source), la version **modifiée** doit être placée sous CC-BY-SA-4.0 (ou licence compatible), avec la mention.
3. **Périmètre** : la SA vise le fichier adapté, pas le code produit du projet, tant que le skill reste un fichier distinct (collection) et n'est pas fondu dans la documentation propre ou le produit. Ne pas recopier de passages dans `docs/` ni dans le code.
4. Ne pas suggérer l'aval de Trail of Bits. Pas de garantie. Les licences CC déconseillent l'usage pour du logiciel ; ici c'est de la documentation.
5. Recommandation : copier **non modifié** (moins de changements à documenter) ; si un retrait de `Bash` est nécessaire, le noter dans SOURCES.md.

Autorisation écrite du propriétaire : aucune dépendance de lockfile, hook ni binaire pour sharp-edges ; requise pour exécuter le mode distant (`gh api`) d'agentic-actions-auditor.
