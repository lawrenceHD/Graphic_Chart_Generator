# JustasMonkev/mcp-accessibility-scanner — verdict V2 (sécurité)

> Valideur V2, 2026-11-07. Tarball codeload du HEAD + tarball npm `5.0.0` téléchargé (sans installation) pour comparer ; aucun `npm install`, aucun `npx`.

**Verdict : ACCEPTÉ-LECTURE-SEULE dès maintenant ; passage à ACCEPTÉ conditionnel autorisé uniquement après autorisation écrite du propriétaire et selon les conditions ci-dessous.**
(Aucun code malveillant trouvé ; c'est la surface d'attaque d'un navigateur piloté par agent, non le paquet, qui impose la prudence.)

## Commit / version à épingler

- **npm : `mcp-accessibility-scanner@5.0.0`**, publié le 2026-11-02, `shasum 745e96a4c0fd7b9957ecb8fa25669d3ed48c828d` (recalculé sur la tarball téléchargée : identique), `integrity sha512-7jHCcv5kdp+n8xfzGpf+/VZfl9pbTqvkRVt0yDupMmCvwNjzHsUUOFPF6X+aEQFfiqyUM2qCrSoodBRSELNKXw==`.
- **Source : tag `5.0.0` = `3634de9f0140b7ac9d19306175a7fadb84acd551`**. Le HEAD audité (`429584e9e698c5bd1bec7d77bf824e8aee402280`) est **en avance** : `playwright` 1.65.0 contre 1.63.0 dans la version publiée, 4 modules de plus dans `src/utils/` (`cdpConnection`, `errors`, `httpUrl`, `terminal`), `server.json` resté à 4.0.0. Ne pas confondre HEAD et paquet publié.
- Pas d'attestation de provenance npm (`dist` ne contient que `signatures`) : le lien entre source GitHub et paquet publié n'est pas prouvé cryptographiquement. Mitigation : la `lib/` publiée est du JS non minifié (0 ligne > 1000 car.), fichiers `.js.map` fournis, mêmes modules que `src/` (hors les 4 ajouts du HEAD).

## Analyse du code

- Licence MIT (`package.json`, `LICENSE`) ; fichiers de dérivation `NOTICE.md` (code Microsoft Playwright MCP, Apache-2.0).
- **Aucune URL sortante non documentée** : grep des URLs dans `src/` et dans la `lib/` publiée : uniquement `dequeuniversity.com/rules/axe/` (lien dans les rapports, `src/tools/axe.ts:103`), `http://myproxy` (aide CLI). Aucune télémétrie.
- `fetch` : un seul appel, `auditSite.ts:361` (sitemap du site audité, `redirect: 'manual'`, `credentials: 'omit'`, limite 10 Mio l.342, 15 s, redirections revalidées). Pas de POST sortant.
- `child_process` : 3 fichiers seulement (`browserContextFactory.ts:391` lancement `--cdp-launch-command` fourni par l'utilisateur ; `extension/cdpRelay.ts:211` ouverture du navigateur pour l'extension ; `tools/install.ts:17,72,~101` : `fork` du CLI Playwright `install <channel>`, et `powershell.exe` à chemin absolu SYSTEMROOT pour détecter l'architecture, script fixe `-NoProfile -NonInteractive`).
- Pas d'`eval`/`new Function` ; `node:vm` : un seul `new vm.Script('validate()')` (`webmcp.js:27`), chaîne fixe.
- Pas de scripts `preinstall/postinstall` dans `package.json`. **Un script de dépendance** : `re2` (module natif, `allowScripts` : `fsevents`, `re2`) télécharge/compile `re2.node`. Lockfile : 311 entrées, toutes `registry.npmjs.org`.
- Dépendances de production (11) : `@modelcontextprotocol/{client,node,server}`, `axe-core` (4.14.0, épinglé), `commander`, `debug`, `playwright`/`playwright-core` (épinglés), `re2`, `ws`, `zod`. **Plages `^` pour 9 sur 11** ; le `package-lock.json` est dans GitHub mais **absent du tarball npm** (`files`), donc `npx` résout les transitives à la volée, hors de toute vérification de lockfile.
- Fichiers de contexte agent dans le dépôt (`AGENTS.md`, `CLAUDE.md`, `SKILL.md`, `CONTEXT.md`, `.codex/skills/pre-push-review/SKILL.md`) : consignes de développement, aucune injection. `SKILL.md:5` impose `npx --allow-scripts=re2 mcp-accessibility-scanner interactive` (sans `-y`). Unicode invisible : 0 dans tout le dépôt.

## Surface d'attaque propre à l'outil (à encadrer)

- **Pouvoirs larges** : `browser_navigate` (n'importe quelle URL), `browser_evaluate` (JS arbitraire dans la page, `evaluate.ts`, type `destructive`), `browser_file_upload` (lecture de fichiers locaux, filtre `allowedUploadDirs` seulement si configuré, `files.ts:26`), `browser_install`, `browser_pdf_save`, `browser_network_request(s)`, `--extension` / `--cdp-endpoint` (session du navigateur réel de l'utilisateur).
- **Injection par page** : tout contenu de page analysé (snapshots, textes) est une donnée non fiable qui arrive dans le contexte de l'agent ; en plus, `README.md` (~l.289) : « Page-provided WebMCP tools remain discoverable by default and are outside this policy » : une page malveillante peut exposer des outils à l'agent, non filtrables par `--blocked-tools`.
- `allowedTools` **n'est pas une liste blanche** (README ~l.282) : n'utiliser que `--blocked-tools`.
- `README.md:289` : bloquer `browser_click` n'empêche pas un clic via `browser_evaluate`.

## Réponse sur `npx -y`

**Inacceptable.** `npx -y` installe sans demande la dernière version (aucune épinglerie), avec les transitives `^` résolues à chaque lancement, exécute le script `re2`, et peut changer de comportement sans trace dans le dépôt (l'`.mcp.json` du projet est revu par `mcp-dependency-review`, qui rejette les références mutables). Même `npx --allow-scripts=re2 mcp-accessibility-scanner@5.0.0` sans `-y` reste une résolution transitive libre.

## Conditions pour un éventuel passage à ACCEPTÉ

1. Autorisation écrite du propriétaire (script de dépendance `re2`, accès réseau, navigateur piloté).
2. Installation locale dans un dossier d'outil hors du dépôt (jamais `pnpm-lock.yaml`) : `npm install --ignore-scripts mcp-accessibility-scanner@5.0.0`, lockfile généré et conservé, vérification de l'`integrity` ci-dessus, puis `npm rebuild re2` après revue. `.mcp.json` : `"command": "node", "args": ["<dossier>/node_modules/mcp-accessibility-scanner/cli.js", ...]`, pas de `npx`.
3. Options impératives : `--headless --isolated --no-sandbox` interdit hors conteneur (retirer `--no-sandbox`) ; **jamais** `--extension`, `--cdp-endpoint`, `--user-data-dir` de la session personnelle, `--ignore-https-errors`.
4. Restreindre : `--allowed-origins localhost;127.0.0.1` (Chromium local seulement, `networkPolicy.ts:21`), `--blocked-tools browser_evaluate,browser_file_upload,browser_install,browser_pdf_save,browser_network_request,browser_network_requests` selon le besoin ; `--output-dir` explicite.
5. Pas d'audit de pages tierces non fiables avec cet agent (injection via WebMCP).

## Injection

Aucune tentative d'injection trouvée dans le dépôt ou le paquet.
