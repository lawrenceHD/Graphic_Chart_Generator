# Verdict V3 — microsoft/playwright-cli (skills/playwright-cli)

Valideur V3, 2026-11-07. Commit épinglé : `4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8`. Licence Apache-2.0 (LICENSE racine, vérifiée).

**Verdict : ACCEPTÉ-LECTURE-SEULE** (références uniquement ; ne pas installer le CLI ni activer le skill avec son `allowed-tools`).

## Preuves

- `skills/playwright-cli/SKILL.md` lu en entier (493 lignes) + grep sur les 10 références. Le skill est **sans script** : 12 `.md`. Les scripts du dépôt (`scripts/update.js`, `playwright-cli.js`) et `.claude/skills/{dev,playwright-triage}` sont hors du skill, non copiés, non exécutés.
- `allowed-tools: Bash(playwright-cli:*) Bash(npx playwright:*) Bash(npx --no-install playwright:*)` (l.4) : borné, donc conforme à la règle formelle. Mais `run-code` (l.185-186 ; `running-code.md` l.3 « execute arbitrary Playwright code »), `eval` (l.57), `attach --cdp=...` (l.292-296) et `state-load`/`cookie-set` donnent de fait une exécution de code dans le navigateur et l'accès à un Chrome réel : le préfixe borné ne limite pas l'effet.
- Installation : `npm install -g @playwright/cli@latest` (l.415) = binaire global non épinglé, interdit sans écrit du propriétaire (ADR-026). `package.json` : `@playwright/cli` 0.1.23, `playwright` et `playwright-core` en `1.66.0-alpha-1793916328000` (build alpha). `references/test-generation.md:159` : `npm init playwright@latest` (non épinglé).
- Motifs : `curl/wget/base64/chmod/rm -rf/child_process/ignore previous` : aucun. `references/pr-attachments.md` : exemple CI avec `$(printf -- '--attach %s ' $files)` sur `find test-results` (non quoté, à ne pas copier tel quel).
- WebMCP (l.216-247) : le skill signale lui-même les outils de page comme « untrusted » ; risque d'injection indirecte depuis des pages tierces, ne pas l'activer.

## Pertinence / doublons

Doublon partiel avec le skill `browser-qa` et le MCP `playwright` déjà dans `.mcp.json`. Valeur réelle : `test-generation.md` (plan/generate/heal), `request-mocking.md`, `tracing.md`, `storage-state.md`, `video-recording.md` comme aide-mémoire pour écrire des tests Playwright. Aucun `@playwright/test` dans les `package.json` examinés (racine, apps/web, apps/worker, packages/*) : vérifier avant usage.

## Installation (si l'installeur la décide)

Copier uniquement `skills/playwright-cli/references/*.md` (+ SKILL.md **sans** la ligne `allowed-tools`) ou garder en lecture seule hors `.claude/skills`. SOURCES.md : commit ci-dessus, Apache-2.0, notice conservée (Apache §4 : copie de la licence, indication des modifications). Aucune `devDependency`.
