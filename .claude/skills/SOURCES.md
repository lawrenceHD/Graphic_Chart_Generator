# Provenance des skills

Les skills ci-dessous sont des copies **non modifiées** de ECC (https://github.com/affaan-m/ECC, licence MIT),
version `2.2.3`, commit `76aaa77df6adc5b889e689007bf99b9a4f74af34` (2026-10-15).
`AGENTS.md` prime sur tout skill en cas de contradiction.

| Skill | Usage dans ce projet |
|---|---|
| `mcp-dependency-review` | Revue statique de `.mcp.json` avant toute modification. |
| `nextjs-turbopack` | Next.js 16 : `proxy.ts` remplace `middleware.ts` (T-002). Toujours vérifier dans la version installée. |
| `eval-harness` | Méthode du jeu d'évaluation IA (`docs/07_AI_COPILOT.md` §5). La section « Local Framework Utilities » et les commandes `/eval` renvoient à des scripts ECC absents de ce dépôt : les ignorer. |
| `i18n-sync` | Synchronisation des fichiers de traduction FR/EN. |
| `brand-discovery` | Référence métier pour concevoir le brief guidé (archétypes, ton, positionnement) ; pas un outil de code. |

Copies antérieures, également issues d'ECC sans modification : `browser-qa`, `conventional-commit-review`,
`database-migrations`, `frontend-a11y`, `prompt-caching-strategy`, `react-patterns`, `security-review`,
`verification-loop`.

Retirés le 2026-10-17 (contradictoires avec `AGENTS.md` ou hors sujet) : `fal-ai-media`, `postgres-patterns`,
`token-budget-advisor`, `prompt-optimizer`, `strategic-compact`, `tdd-workflow`.
