# Verdict V4 (sécurité) — promptfoo (outil npm)

Commit source lu : `1084fd33e60039841e5697c12a535ba13631ecc2` (package.json = 0.125.1, publiée le 2026-10-25, MIT). Version à épingler si autorisé : `promptfoo@0.125.1` exacte (registre : éditeur de confiance GitHub Actions OIDC, attestation de provenance SLSA ; pas de `gitHead` publié).

## Verdict : REFUSÉ en l'état (devDependency du monorepo) ; ACCEPTÉ envisageable seulement hors lockfile
Raison : télémétrie opt-out par défaut incluant l'e-mail, appels réseau sortants multiples, exécution de code non sandboxée, ~2 800 paquets dans l'arbre.

## Preuves
- **Télémétrie activée par défaut** (`src/telemetry.ts`) : PostHog (`https://a.promptfoo.app`) seulement si `PROMPTFOO_DISABLE_TELEMETRY` est absent (l.20-23) ; en plus, `sendEvent` fait un POST vers `https://r.promptfoo.app/` (l.133-150) avec `user_id`, **email** (`personProperties.email`, via `getUserAuthInfo()`), version Node, plateforme, indicateur CI. Endpoints : `src/constants.ts:43-46`. Même désactivée, `record()` appelle `recordTelemetryDisabled()` qui envoie un événement « telemetry disabled » par `sendEvent`, donc le POST `r.promptfoo.app` part quand même (l.97-105 et 118-122).
- **Autres appels réseau** : vérification de mise à jour `api.promptfoo.dev/api/latestVersion` (`src/updates.ts`, coupée par `PROMPTFOO_DISABLE_UPDATE`) ; `pypi.org/pypi/modelaudit/json` ; génération distante red-team vers `api.promptfoo.app` (coupée par `PROMPTFOO_DISABLE_REMOTE_GENERATION`, `src/envars.ts:46-55`) ; partage (`PROMPTFOO_DISABLE_SHARING`) ; `CONSENT_ENDPOINT` (e-mail, red-team « harmful »). Sans ces variables, des prompts du projet peuvent quitter la machine.
- **Exécution de code non sandboxée par conception** : `SECURITY.md` (Security Model) : assertions, providers à script, transforms, hooks, plugins exécutent du code utilisateur sans isolation ; UI locale et serveur MCP ne sont pas une frontière de sécurité. Ne jamais lancer sur une config ou un dépôt non fiable.
- **Chaîne de dépendances** : `package-lock.json` = 2 797 entrées ; 74 dépendances directes, 22 optionnelles (AWS, Azure, sharp, MCP SDK…), 13 peer. Scripts d'installation dans le lockfile : `core-js`, `esbuild`, `fsevents` (et `sharp`, `protobufjs`, `@huggingface/transformers` en `onlyBuiltDependencies`). Le paquet publié n'a pas de `postinstall` (seulement `prepare: husky || exit 0`, non exécuté pour une installation depuis le registre). L'ajouter à `pnpm-lock.yaml` exige l'autorisation écrite ADR-026.
- **Historique de compromission** : aucune entrée de logiciel malveillant ni avis trouvé pour `promptfoo` (recherche OSV/web, une passe). Le lockfile 0.125.1 ne contient aucune des versions compromises de la campagne npm de septembre 2025 (chalk 5.6.1, debug 4.4.2, ansi-styles 6.2.2, etc. ; vérifié par script sur 19 versions connues).
- Aucune tentative d'injection trouvée dans les fichiers lus (telemetry, updates, envars, SECURITY, package.json). Les ~6 000 autres fichiers n'ont pas été lus intégralement.

## Conditions si le propriétaire veut quand même l'utiliser
1. Hors `pnpm-lock.yaml` : `npx promptfoo@0.125.1` dans un dossier isolé (ou conteneur), jamais en devDependency du monorepo.
2. Variables obligatoires : `PROMPTFOO_DISABLE_TELEMETRY=1`, `PROMPTFOO_DISABLE_UPDATE=1`, `PROMPTFOO_DISABLE_REMOTE_GENERATION=1`, `PROMPTFOO_DISABLE_SHARING=1`. Noter que le POST « telemetry disabled » reste émis : pare-feu ou proxy sortant à prévoir, ou accepter ce résidu sans e-mail (ne pas se connecter à un compte promptfoo).
3. Aucune clé d'API de production dans l'environnement ; aucun provider `exec:`/script ; ne pas exposer `promptfoo view` ni `mcp`.
4. Alternative moins coûteuse : le skill `eval-harness` déjà présent.
