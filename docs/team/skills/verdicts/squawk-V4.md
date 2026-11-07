# Verdict V4 (sécurité) — sbdchd/squawk

Version à épingler : `squawk-cli@2.70.0` (npm, publiée le 2026-10-15) ; `gitHead` du paquet = `aef68d413ddcf38876cf47a8e693c20f9ebf6aa0`. Licence « Apache-2.0 OR MIT ».

## Verdict : ACCEPTÉ, sous autorisation écrite du propriétaire (ADR-026 : dépendance/binaire) et version exacte
Meilleur candidat « binaire » du lot côté chaîne d'approvisionnement.

## Preuves (tarball npm téléchargé et extrait dans un dossier vide ; rien installé ni exécuté)
- `package.json` de 2.70.0 : **aucun script** (`preinstall`/`install`/`postinstall` absents). Les binaires viennent de 7 paquets plateforme en `optionalDependencies` épinglés à la même version (`@squawk-cli/win32-x64`, `linux-x64`, `darwin-arm64`…), sans téléchargement à l'installation ni appel à GitHub Releases.
- Le wrapper `js/index.js` (≈ 80 lignes, lu en entier) ne fait que résoudre `@squawk-cli/<plateforme>/bin/squawk(.exe)` par `require.resolve` puis `spawn` avec `process.argv`, signaux relayés. Aucun réseau, `eval`, lecture de fichiers sensibles ni de variables d'environnement. `js/bin/squawk` : 3 lignes. Aucune télémétrie.
- Provenance : `squawk-cli` et `@squawk-cli/win32-x64` publiés par « GitHub Actions » en éditeur de confiance OIDC (`_npmUser.trustedPublisher`) ; attestation SLSA v1 (`dist.attestations`) et signatures de registre présentes. Le paquet plateforme n'a ni scripts ni dépendances.
- sha512 tarball principal : `sha512-2MIi7E/0xTbG43cOoLGu4oqxAa1EMPgfY1TS2NV7eLaSm1kTrq3u0E1MRQOQii8J/AbyJU32zdodcsXk2/IJ3A==`. sha512 `@squawk-cli/win32-x64@2.70.0` : `sha512-qs7s4Imajti+75GQDRFlBaM2Gv12HzXyQ6kCtlVR28SA/+pnWmg/mFBIOKz94fifdBGdGNoGw7H4znJOtmdqfQ==`.
- Limites : le **binaire Rust n'a pas été décompilé ni scanné** ; la confiance repose sur la provenance du CI. Aucun fichier `.sha256` trouvé à l'URL de release devinée (404, non concluant : API GitHub saturée). L'installeur vérifie l'intégrité par le champ `integrity` du lockfile pnpm et `npm audit signatures`.
- Conditions : (1) version exacte sans `^`, installation avec `--ignore-scripts` ; (2) l'entrée du lockfile est produite par pnpm seulement ; (3) ne lui donner que les `.sql` de migration générés par Drizzle, aucun jeton, aucune option d'intégration GitHub/PR ; (4) vérifier `squawk --version` avant usage.
