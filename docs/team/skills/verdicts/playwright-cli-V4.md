# Verdict V4 (sécurité) — microsoft/playwright-cli, skill `skills/playwright-cli`

Commit à épingler : `4bc00fb7fa5b4329f2fb53ac4743a066c2c664e8`. Apache-2.0. Éditeur : Microsoft.

## Verdict : ACCEPTÉ-LECTURE-SEULE
Le contenu du skill est sain, mais il ne sert à rien sans le binaire `@playwright/cli` (npm), dépendance nécessitant l'autorisation écrite du propriétaire (ADR-026) et non validée ici. Le skill seul = documentation de commandes.

## Preuves
- `SKILL.md` l.4 : `allowed-tools: Bash(playwright-cli:*) Bash(npx playwright:*) Bash(npx --no-install playwright:*)` : borné (pas de Bash libre, pas de WebFetch). Meilleur du lot sur ce point.
- 10 fichiers de skill (SKILL.md + 9 références, 69 Ko), aucun script. Grep `curl|wget|base64|chmod|ignore previous` : rien. Unicode invisible / commentaire HTML : aucun.
- Risques de capacité (pas de malveillance) : `playwright-cli eval` et `run-code` exécutent du JS arbitraire (`references/running-code.md`) ; `state-save auth.json` et `cookie-*` lisent/écrivent cookies et jetons sur disque (`references/storage-state.md:12,233,246`) ; `route` peut modifier des en-têtes. L'allowed-tools borné ne limite donc pas ce que `run-code` peut faire. Règles : ne jamais charger un état d'authentification réel, ne pas committer `auth.json` ni `storage-state-*.json`.
- Hors skill (le CLI, lu pour information) : `playwright-cli.js` lance `npm view @playwright/cli version` (chaîne constante, `shell: true`, délai 1,5 s) au plus une fois par jour, sauf si `NO_UPDATE_NOTIFIER` ou `CI` est défini. `package.json` dépend de `playwright@1.66.0-alpha-1793916328000` : alpha épinglée, à ne pas adopter telle quelle.
- `scripts/update.js` (`execSync('node playwright-cli.js install --skills')`) est de l'outillage du dépôt, hors skill : ne pas copier.
- Aucune tentative d'injection.
