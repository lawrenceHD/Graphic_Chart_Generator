# Verdict V3 — promptfoo (outil npm)

Valideur V3, 2026-11-07. Code lu à `1084fd33e60039841e5697c12a535ba13631ecc2` (HEAD du dépôt, fichiers `package.json`, `LICENSE`, `src/telemetry.ts`, `src/globalConfig/accounts.ts` via raw.githubusercontent). Métadonnées du registre npm : `promptfoo@0.125.1` (dernier publié), `dist.integrity` `sha512-nogBhixdp69icwkg1EI0syZ4zAmAjJyWeLcqxAkTldbHi0qirOslwHvkUQhQmg65lQLrIKyMOMLXlBlSc6LRrg==`. Le commit HEAD n'est pas forcément celui de la 0.125.1 : épingler par version + intégrité npm, pas par ce commit. Rien installé ni exécuté. Licence MIT (LICENSE vérifié).

**Verdict : REFUSÉ comme `devDependency` du lockfile principal.** Réévaluable après la présélection du 09/11, avec autorisation écrite du propriétaire (ADR-026), dans un dossier outil isolé (voir plus bas).

## Preuves

- Taille : 766 fichiers, 32,9 Mo dépaqués (registre). **76 `dependencies`** directes (`npm view`), **24 `optionalDependencies`** (AWS SDK, Azure, `sharp`, `@libsql/client` natif côté dépendances, `pdf-parse`, `@modelcontextprotocol/*`), **13 `peerDependencies`**. Dans `package.json` du dépôt : 74 + 22. Cela représente des centaines de paquets transitifs ajoutés à `pnpm-lock.yaml` : surface de chaîne d'approvisionnement sans commune mesure avec le besoin (évaluer quelques prompts).
- Recoupements gênants : `drizzle-orm`, `openai`, `@anthropic-ai/sdk`, `ai`, `zod` y sont aussi en dépendance directe (risque de duplication/version divergente avec `drizzle-orm@0.45.4`, `zod@4.6.7`, que le projet épingle).
- Scripts de cycle de vie : un seul, `"prepare": "husky || exit 0"` (publication ; non exécuté chez le consommateur d'un tarball). Les dépendances transitives peuvent en porter : à contrôler avec `pnpm install --ignore-scripts` + allowlist `onlyBuiltDependencies`.
- `engines.node >=22.22.0` : compatible avec Node 24.20 local, mais à ajouter aux contraintes du CI.
- **Télémétrie activée par défaut** : `src/telemetry.ts:23` `if (getEnvBool('PROMPTFOO_DISABLE_TELEMETRY') || getEnvBool('IS_TESTING')) return null;` (désactivation par variable d'environnement seulement). Envoi vers PostHog (`posthog-node`, l.27-31) **et** requête `fetchWithProxy(R_ENDPOINT, { method: 'POST', body: JSON.stringify({ event, environment, email: personProperties.email, meta: { user_id, ...propertiesWithMetadata } }) })` (l.168-185) : événement d'usage avec un identifiant, la version, l'indicateur CI et l'**email** s'il a été enregistré (`accounts.ts:75-83` `getUserEmail`/`setUserEmail`). Les valeurs de `R_ENDPOINT` / `EVENTS_ENDPOINT` sont des constantes non lues (fichier de constantes non téléchargé) ; non vérifié. `accounts.ts:198` : `PROMPTFOO_CLOUD_API_URL` par défaut `https://api.promptfoo.app` (fonctions cloud/partage). Je n'ai pas audité le contrôle de mise à jour ni les commandes `share`/`redteam` : à relire avant tout usage.
- Appels réseau fonctionnels : tout test réel appelle les API de modèles (Gemini/Anthropic) avec des clés ; le red-team génère des attaques via un service distant par défaut (non vérifié ici). Incompatible avec `AGENTS.md` (Zod aux frontières IA, isolation des tokens) sans cadrage.

## Alternative recommandée

Le besoin R2 (évals de prompts) est couvert sans dépendance par le skill `eval-harness` et `docs/07_AI_COPILOT.md` §5 (jeu d'évaluation maison, Zod + Vitest). Si promptfoo est quand même voulu :
1. Autorisation écrite du propriétaire (ADR-026).
2. Dossier `tools/evals/` **hors workspace pnpm**, son propre `package.json` + lockfile, version exacte `0.125.1` (ou la plus récente à ce moment) vérifiée contre `dist.integrity`, jamais ajouté à `pnpm-lock.yaml` du dépôt principal.
3. `PROMPTFOO_DISABLE_TELEMETRY=1` imposé dans le script, `--ignore-scripts`, clés API limitées en lecture au job concerné, aucun email enregistré.
4. Pas en CI avant relecture de `R_ENDPOINT` et du comportement `share`/`update-check`.
