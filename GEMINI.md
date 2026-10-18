# GEMINI.md — Instructions pour Antigravity / Gemini CLI

Ce projet est régi par :
1. [`AGENTS.md`](./AGENTS.md) : règles fondamentales (TDD, Zod, pureté des packages, périmètre, rapport). **Il prime sur tout.**
2. [`CLAUDE.md`](./CLAUDE.md) : protocole de session continue et de transition entre tickets (s'applique aussi à Gemini).
3. [`journal/PROTOCOL.md`](./journal/PROTOCOL.md) : **protocole de relais** entre agents et entre postes.

## Avant toute action
- Lire [`HANDOFF.md`](./HANDOFF.md) (état vivant), puis la dernière session de `journal/sessions/` et
  `journal/OWNER_DECISIONS.md`. Commande : `/reprendre` (Gemini CLI : `.gemini/commands/`, Antigravity :
  `.agent/workflows/`).
- Pendant le travail, écrire les points de relais aux moments fixés par `journal/PROTOCOL.md` §2 (`/relais`).
  Un agent peut être coupé à tout moment : ce qui n'est pas écrit est perdu.

## Skills et agents de revue
Les skills sont dans `.claude/skills/` et les agents de revue dans `.claude/agents/` (format Markdown commun).
Gemini ne les charge pas automatiquement : consulter [`.claude/skills/INDEX.md`](./.claude/skills/INDEX.md), puis
ouvrir le `SKILL.md` du domaine avant de commencer. Pour une revue de fin de ticket, appliquer la grille de l'agent
voulu (`.claude/agents/<nom>.md`).

## MCP
Configuration projet : `.gemini/settings.json` (Gemini CLI). Antigravity utilise sa configuration globale
`~/.gemini/config/mcp_config.json`. Serveurs retenus : Playwright, Context7 (documentation à jour d'une bibliothèque,
toujours recoupée avec la version installée dans `node_modules`), GitHub (jeton dans la variable
`GITHUB_PERSONAL_ACCESS_TOKEN`, jamais dans un fichier), Cloudflare Docs (R2, Turnstile).

## Consigne d'exécution
- Applique rigoureusement `AGENTS.md` et `CLAUDE.md`. Concision maximale, TDD systématique, `pnpm verify` (sous
  PowerShell : `pnpm.cmd verify`) avant chaque rapport.
- Ne lis, ne copie et n'affiche jamais `.env.local`.
