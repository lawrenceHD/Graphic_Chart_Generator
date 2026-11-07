# Verdict V1 — JustasMonkev/mcp-accessibility-scanner (paquet npm)

- Verdict : **REFUSÉ** (en l'état). Alternative couverte par l'existant : axe-core via le MCP `playwright` du dépôt et le skill `browser-qa`.
- Licence : MIT (`LICENSE`, « Copyright (c) 2025 JustasM » ; fichiers dérivés de Playwright MCP sous Apache-2.0 de Microsoft, en-têtes de `cli.js`, `index.js`).

## Version et commit : incohérences à connaître
- npm `latest` = `5.0.0` (publié le 2026-11-02), `dist.integrity` = `sha512-7jHCcv5kdp+n8xfzGpf+/VZfl9pbTqvkRVt0yDupMmCvwNjzHsUUOFPF6X+aEQFfiqyUM2qCrSoodBRSELNKXw==`, `shasum` `745e96a4c0fd7b9957ecb8fa25669d3ed48c828d`. Aucune attestation de provenance (`dist.attestations` = absent).
- Le champ npm `gitHead` = `0044268e54ddc0b6ca75a1729a30fbcbef22cc2a` correspond en réalité au code **4.0.1** (son `package.json` dit 4.0.1) : provenance du tarball non vérifiable par ce champ.
- Le tag GitHub `5.0.0` = commit `3634de9f0140b7ac9d19306175a7fadb84acd551` ; son `package.json` (version 5.0.0, `playwright` 1.63.0) correspond au tarball npm 5.0.0. **C'est le commit à épingler si le dossier est rouvert.**
- Le HEAD (`429584e9e698c5bd1bec7d77bf824e8aee402280`, lu en premier) est en avance de la version publiée (`package.json` : `playwright` 1.65.0, Node `^24.15.0 || >=26`) : ne pas auditer ce HEAD pour juger le paquet npm.
- Tarball npm 5.0.0 téléchargé (152 fichiers, `lib/` JS compilé, `.map`) et comparé : mêmes 28 outils que le tag.

## Preuves de risque (code source lu en partie : `src` ≈ 640 Ko, lecture intégrale non réalisée)
- Lus : `tools/evaluate.ts`, `tools/files.ts`, `tools/install.ts`, `networkPolicy.ts`, sites de `spawn`, liste de tous les `process.env`, `package.json`, `server.json`, `.mcp.json`, `cli.js`, `index.js`, `SKILL.md` du dépôt (début), README (greps).
- Surface d'attaque (c'est un fork complet de Playwright MCP) :
  - `tools/evaluate.ts` l.36-52 : `browser_evaluate`, JavaScript arbitraire dans la page (`type: 'destructive'`).
  - `tools/files.ts` l.100-107 : `browser_file_upload`, envoi de fichiers locaux à partir de chemins absolus.
  - `tools/install.ts` l.52-56 : `browser_install` (téléchargement de navigateur, capacité `install`).
  - `browserContextFactory.ts` l.18, 388-394 : `spawn(cdpLaunch.command, args, { env: { ...process.env } })` : `--cdp-launch-command` exécute une commande arbitraire avec tout l'environnement.
  - `extension/cdpRelay.ts` l.17, 211 : autre `spawn`.
  - `config.ts` l.368-413 : 45 variables `PLAYWRIGHT_MCP_*` lisibles (dont `AUTH_TOKEN`, `CDP_HEADERS`, `EXTENSION_TOKEN`).
- Dépendance native : `package.json` `allowScripts: { "re2@1.27.0": true }` ; README l.95 : le script d'installation de `re2` télécharge ou compile `re2.node`. Autorisation écrite du propriétaire requise (SKILLS-CHAIN §3).
- Dépendances directes : 11 (`@modelcontextprotocol/*` 2.x, `playwright` 1.63.0, `ws`, `re2`, `zod` 4.x…), transitives non auditées.
- Aucun appel réseau sortant propre relevé par grep (`fetch(`, URL en dur) hors Playwright et le robot d'exploration `audit_site` (sitemap, liens). `README.md` recommande `npx --allow-scripts=re2 mcp-accessibility-scanner` **sans version** (l.149, 166), contraire à `mcp-dependency-review`.
- `.mcp.json` du dépôt : chemin personnel `/Users/justas/Desktop/...` (inoffensif, mais signe d'un dépôt de développement).

## Pertinence et redondance
- Utile : `scan_page` (axe + WCAG 2.2), `audit_keyboard`, `scan_page_matrix` (6 variantes dont 200 % de zoom, forced-colors, reduced-motion).
- Redondant : le MCP `playwright` est déjà dans `.mcp.json` ; `browser-qa` et `ux-ui-agent-skills:a11y-audit` couvrent axe-core. Le gain ne justifie pas un second pilote de navigateur avec JS arbitraire.

## Conditions pour reconsidérer
1. Épingler `mcp-accessibility-scanner@5.0.0` (intégrité ci-dessus), jamais `npx` flottant.
2. `--allowed-tools scan_page,audit_keyboard,scan_page_matrix,browser_navigate,browser_close` et `--blocked-tools browser_evaluate,browser_file_upload,browser_install` ; `--allowed-origins localhost:3000` ; `--headless --isolated` ; pas de `--caps install` ni `--cdp-launch-command`.
3. Autorisation écrite pour le script `re2`, revue de `.mcp.json` par `mcp-dependency-review`.
4. Lecture intégrale des 28 outils et du chemin réseau (non faite ici).
