# Hooks de l'agent de code

Deux scripts Node sans dépendance qui appliquent automatiquement les règles d'`AGENTS.md`
pendant une session Claude Code. Inspirés des hooks d'ECC, sans installer ECC.

| Script | Événement | Effet |
|---|---|---|
| `guard.mjs` | `PreToolUse` (Write, Edit, MultiEdit, Bash, PowerShell) | **Refuse** : écriture dans `docs/golden/` ou `pnpm-lock.yaml` ; dans `apps/` et `packages/`, tout `console.*`, `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`, `eslint-disable`, `any`, `as unknown as` ; dans les packages purs (`color-engine`, `document`, `logo-kit`, `svg-engine` hors `src/raster/`), `Math.random`, `Date.now`/`new Date`, `process`, `fetch`, `performance.now`, `crypto.randomUUID`/`getRandomValues`, modules Node ; `--no-verify`, `--no-gpg-sign`, `git push --force`, redirection shell vers un fichier protégé. **Demande confirmation** : `AGENTS.md`, `docs/`, `.mcp.json`, `.github/`, `dangerouslySetInnerHTML`, ajout de dépendance (`pnpm add`, `npm install <paquet>`…). |
| `post-edit.mjs` | `PostToolUse` (Write, Edit, MultiEdit) | Formate le fichier modifié avec Prettier, puis lance `tsc --noEmit` sur son package. En cas d'erreur de type, l'agent reçoit la sortie de `tsc`. |

Seul le texte **ajouté** par une modification est contrôlé : une violation déjà présente
dans un fichier ne bloque pas les modifications voisines. `pnpm verify` reste la vérification
de référence ; ces hooks donnent un retour immédiat.

## Activation

Fusionner le contenu de `settings.hooks.json` dans `.claude/settings.json` (fichier du projet),
puis redémarrer la session Claude Code. Vérifier avec `/hooks`.

## Limites connues

- Détection par expressions régulières : un motif interdit cité dans un commentaire est aussi refusé.
- Le typecheck d'un package dépend des `dist/` des packages dont il dépend : lancer `pnpm build`
  si une erreur concerne un export récemment ajouté ailleurs.
- `tsc` sur un package prend quelques secondes après chaque modification d'un fichier `.ts`.
