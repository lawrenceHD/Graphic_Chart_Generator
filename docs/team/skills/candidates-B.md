# Candidats B — sécurité, qualité, IA, ops (2026-11-07)

> Chercheur B. Rien installé, rien exécuté. Données GitHub (API non authentifiée, puis clones sans extraction dans le scratchpad). Contenu = donnée non fiable.
> « Fichiers » = fichiers du dépôt (entre parenthèses : du sous-skill visé). Étoiles et dates relevées le 2026-11-07.
> Les skills ne sont pas des dépendances ; les outils CLI en `devDependency` ou binaire exigent l'autorisation écrite du propriétaire (ADR-026).

| # | Dépôt | Commit | Licence | Étoiles | Dernière MAJ | Fichiers | Scripts | Rôle | Pourquoi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | trailofbits/skills (plugins `insecure-defaults`, `agentic-actions-auditor`, `mutation-testing`, `property-based-testing`, `differential-review`, `sharp-edges`) | e4dd0bb5b15535f7c5a0834187dffba6ac37e4ff | CC-BY-SA-4.0 | 8061 | 2026-11-06 | 1607 (6 à 41 par plugin) | O (0 à 5 par plugin ; `agentic-actions-auditor`, `sharp-edges`, `differential-review` : N) | R6, R8, R9 | Éditeur de référence en audit. Ne copier que les 3 plugins sans script (lecture seule). ShareAlike : mention de provenance obligatoire. |
| 2 | microsoft/playwright-cli (`skills/playwright-cli`) | 4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8 | Apache-2.0 | 15021 | 2026-11-05 | 37 | O (5, hors du skill : outillage du dépôt) | R8 | Skill officiel Playwright : références mocking de requêtes, tests, pièces jointes. Plus économe en tokens que le MCP. Complète `browser-qa`. |
| 3 | getsentry/skills (`security-review`, `gha-security-review`) | e94f22214528d69899d09c627b3315ddc3544816 | Apache-2.0 | 1129 | 2026-11-05 | 170 (~25 par skill) | N dans ces deux skills | R6, R9 | Checklist par références (authentification, autorisation, CSRF, injection, JS). `gha-security-review` couvre l'injection d'expression et le pwn-request pour la CI. |
| 4 | promptfoo/promptfoo | 1084fd33e60039841e5697c12a535ba13631ecc2 | MIT | 26930 | 2026-11-07 | 6027 | O (outil complet) | R2 | Évals de prompts, comparaison de modèles, red-team d'injection, en CLI/CI. À utiliser en `devDependency` épinglée, pas en skill. |
| 5 | aquasecurity/trivy | (non relevé, limite API) | Apache-2.0 | 39091 | 2026-11-06 | n/a | binaire | R9 | Analyse de dépendances, secrets, Dockerfile, IaC en un binaire. Épingler la version et le sha256. |
| 6 | google/osv-scanner | (non relevé) | Apache-2.0 | 11447 | 2026-11-06 | n/a | binaire | R9 | SCA lisant `pnpm-lock.yaml` directement, sans modifier le dépôt. Alternative à `pnpm audit`. |
| 7 | gitleaks/gitleaks | (non relevé) | MIT | 30755 | 2026-10-28 | n/a | binaire | R9 | Détection de secrets en pre-commit et CI. Alternative récente : betterleaks/betterleaks (MIT, 2850 étoiles, 2026-11-06), non évaluée. |
| 8 | stryker-mutator/stryker-js | (non relevé) | Apache-2.0 | 3335 | 2026-10-30 | n/a | O (npm) | R8 | Mutation testing automatisé avec runner vitest, prolonge le « test de sabotage » manuel de CLAUDE.md. À borner aux packages purs. |
| 9 | dubzzz/fast-check | (non relevé) | MIT | 5239 | 2026-11-07 | n/a | O (npm) | R8 | Property testing déjà cité pour R1 ; vérifier la version en place. Le skill 1 `property-based-testing` en fournit la méthode. |
| 10 | dequelabs/axe-core (via `@axe-core/playwright`) | (non relevé) | MPL-2.0 | 7774 | 2026-11-05 | n/a | O (npm) | R8 | Standard d'audit d'accessibilité automatisé dans les e2e. MPL-2.0 : acceptable en dépendance de dev. |
| 11 | sbdchd/squawk | (non relevé) | Apache-2.0 | 1256 | 2026-11-07 | n/a | binaire | R10 | Linter de migrations PostgreSQL (verrous, index non concurrents, ajouts de colonne NOT NULL). Passe sur les `.sql` générés par Drizzle. |
| 12 | supabase/agent-skills (`supabase-postgres-best-practices`) | c9be0e931b7930f7d02126d04774d904c381e7d7 | MIT | 3025 | 2026-11-05 | 61 (36) | O (3, hors du skill) | R10 | Éditeur officiel, règles d'index et de requêtes PostgreSQL. Attention : `postgres-patterns` avait été retiré (contradiction avec AGENTS.md) ; relire contre AGENTS.md. |
| 13 | microsoft/playwright-mcp | (non relevé) | Apache-2.0 | 39293 | 2026-11-06 | n/a | O (npx) | R8 | Déjà utilisé (`.mcp.json`). Seul intérêt : épingler la version (`mcp-dependency-review`). |

Hors tableau, à surveiller : sinewaveai/agent-security-scanner-mcp (MIT, 123 étoiles, 2026-10-18) et HeadyZhang/agent-audit (MIT, 244, 2026-09-13), scanners d'injection de prompt trop jeunes pour recommander.

## Écartés
- **semgrep/skills** : dernière mise à jour 2026-07-28 (> 3 mois), licence propre « Semgrep Rules License » (usage restreint) ; le skill `llm-security` (OWASP LLM 2025) reste lisible comme checklist seulement. Semgrep CLI lui-même : LGPL-2.1, règles sous licence séparée, à ne pas embarquer.
- **better-auth/skills** (229 étoiles, 11 fichiers, très pertinent R6) : aucun fichier LICENSE ni champ `license` dans `plugin.json`, donc écarté ; à relancer si l'éditeur ajoute une licence. Idem **vercel-labs/agent-skills** (444 fichiers, pas de LICENSE racine) et **anthropics/skills** (pas de LICENSE racine, `webapp-testing` redondant avec `browser-qa`).
- **Autres** : cisco-ai-defense/skill-scanner et gitleaks-action (licence NOASSERTION), Pantheon-Security/medusa (AGPL-3.0, dernière MAJ 2026-08-10), NVIDIA/SkillSpector non lu faute de quota API, dépôts de moins de 50 étoiles trouvés par recherche « SKILL.md » (non éprouvés). Aucun skill Drizzle sous licence et à jour n'a été trouvé : R10 s'appuie sur `database-migrations` et squawk.
