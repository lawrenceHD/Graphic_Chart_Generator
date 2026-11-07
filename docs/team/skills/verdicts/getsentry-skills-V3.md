# Verdict V3 — getsentry/skills (security-review, gha-security-review)

Valideur V3, 2026-11-07. Commit épinglé : `e94f22214528d69899d09c627b3315ddc3544816`. Licence du dépôt : Apache-2.0 (LICENSE racine). **Correction à candidates-B** : `skills/security-review/LICENSE` déclare le contenu de référence « derived from the OWASP Cheat Sheet Series … CC BY-SA 4.0 » (SKILL.md l.9 idem). Les références de `security-review` sont donc sous CC-BY-SA-4.0, pas Apache-2.0.

| Skill | Verdict | Raison |
|---|---|---|
| security-review | **REFUSÉ** (doublon + licence) | Même nom que `.claude/skills/security-review` déjà présent (ECC ; `diff -rq` : contenus différents, collision de nom). `allowed-tools: Read Grep Glob Bash Task` (l.4) : Bash non borné. Références OWASP en CC-BY-SA. |
| gha-security-review | **ACCEPTÉ-LECTURE-SEULE** | Contenu de qualité, Apache-2.0, sans script ; mais `allowed-tools: Read Grep Glob Bash Task` (l.4). Utile seulement pour `ci.yml`. |

## Preuves

Lus en entier : les deux `SKILL.md`. Grep (curl, wget, eval, exec, base64, npx -y, pip install, chmod, ignore previous, rm -rf, process.env, child_process, « without asking ») sur les ~25 références + `docker.md`, `javascript.md`, `python.md` ; références échantillonnées, non relues ligne à ligne. Aucun script exécutable (`.md` + LICENSE + SPEC.md). Les occurrences sont des exemples vulnérables (`javascript.md:44,134,137`, `supply-chain.md:235,258` « preinstall: curl ... | bash // DANGEROUS »). Aucune injection de consigne détectée. Les skills ne font aucune requête réseau eux-mêmes. `.agents/skills/` du dépôt est une copie identique (`diff -rq`), ignorée.

### security-review
Contenu orienté Django/Python (« Django settings », `languages/python.md`) avec un guide JS/Next (`javascript.md`) utile mais redondant avec le skill local et l'agent `security-reviewer`. Les règles « HIGH confidence only / Do Not Flag » sont bonnes, mais l'apport marginal ne justifie ni la collision de nom ni la CC-BY-SA. Option : consulter `references/modern-threats.md` (prototype pollution, injection de prompt LLM) et `ssrf.md` à la demande depuis le tarball, sans copie.

### gha-security-review
Checklist de 8 contrôles (pwn request, injection d'expression, `author_association`, épinglage SHA des actions tierces, runners). `ci.yml` épingle déjà par SHA (`actions/checkout@11d5960...`), n'a ni `pull_request_target` ni `issue_comment` : surface actuelle faible. Usage en revue ponctuelle si le CI évolue (job de déploiement). Si copié : retirer `Bash`/`Task` du frontmatter (adaptation ; Apache §4 : indiquer la modification, conserver LICENSE/NOTICE).

Obligations CC-BY-SA en cas de copie d'une référence OWASP : voir `trailofbits-skills-V3.md` (attribution OWASP + CC BY-SA 4.0 ; SA dès partage d'une version modifiée).
