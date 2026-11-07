# Verdict V3 — sbdchd/squawk (linter de migrations PostgreSQL)

Valideur V3, 2026-11-07. Release lue : `v2.71.0` (redirection de `github.com/sbdchd/squawk/releases/latest`), commit du tag `a8cf181356a658b8b2b46b5afd18d1d8f2b18a10` (`git ls-remote`). Licence : **Apache-2.0 OU MIT** (fichiers `LICENSE-APACHE` et `LICENSE-MIT` ; le registre npm indique « (Apache-2.0 OR MIT) » : candidates-B ne cite qu'Apache-2.0). Aucun binaire exécuté.

**Verdict : ACCEPTÉ**, par **binaire épinglé** (pas npm), sous réserve de l'autorisation écrite du propriétaire pour un binaire et un accès réseau CI (SKILLS-CHAIN §3, ADR-026).

## Preuves

- Réseau : dans le code source du tag, `reqwest` n'est référencé que par `crates/squawk_github` (Cargo.toml l.23), utilisé dans `crates/squawk/src/main.rs` par la sous-commande **`UploadToGithub`** (l.25, 65, 231) qui parle à `api.github.com`. La commande de lint (`squawk fichier.sql`) n'en dépend pas ; aucune occurrence de « telemetry » ou « analytics » dans les `.rs`/`Cargo.toml`. Ne jamais utiliser `upload-to-github`.
- Fonction : règles de verrous (index non concurrent, `ADD COLUMN ... NOT NULL` sans défaut, renommage, changement de type), adaptées aux SQL générés par `drizzle-kit generate` (`packages/db/drizzle/0000_initial_schema.sql`… existent). Complète le skill `database-migrations` ; pas de doublon.
- Fragilité : la version npm `squawk-cli` est en retard (latest `2.70.0`, dernière modif 2026-10-15) sur la release GitHub `2.71.0`. Le paquet npm tire un binaire par plateforme via `optionalDependencies` (`@squawk-cli/win32-x64` 2.70.0 …), donc **ajoute des entrées au lockfile** : à éviter.

## Épinglage par sha256 (calculé ici sur les actifs téléchargés depuis la release `v2.71.0`)

| Actif | URL | sha256 |
|---|---|---|
| Windows x64 | `https://github.com/sbdchd/squawk/releases/download/v2.71.0/squawk-windows-x64.exe` (21 108 224 octets) | `3299e2f9e41ab5d6274cad64a061488a370a0310a02d17e0dcf3845ad779beec` |
| Linux x64 (CI `ubuntu-latest`) | `https://github.com/sbdchd/squawk/releases/download/v2.71.0/squawk-linux-x64` (29 252 088 octets) | `ab978cb412e5e5eb2f06aaa4c5035a1567f6eba53274d7d1e068f73169b88bbd` |

Limites : la release ne publie pas de fichier `.sha256` (HTTP 404 sur `squawk-windows-x64.exe.sha256`) : ces empreintes sont de la confiance à la première utilisation (TOFU), calculées depuis HTTPS GitHub. Recommandation à l'installeur : retélécharger deux fois, comparer, et conserver le sha256 dans `tools/squawk/SHA256SUMS`. Vérification : `sha256sum -c`. Procédure Windows : `curl -L -o tools/bin/squawk.exe <url>` puis `Get-FileHash -Algorithm SHA256`, refus si différent. Ne pas committer le binaire (gitignore), le télécharger au besoin et le vérifier avant exécution ; en CI, même vérification avant `chmod +x` (le `chmod` serait le seul ajout, légitime).

## Usage recommandé

`squawk packages/db/drizzle/*.sql` en étape CI séparée, non bloquante au début (les migrations initiales créent des tables et déclenchent peu de règles, mais prévoir `--exclude` documenté pour les faux positifs). Pas dans `pnpm verify` tant que le binaire n'est pas autorisé par écrit.

Pas testé en exécution (protocole du lot : aucun binaire lancé). Premier essai par l'installeur dans un dossier vide, sans secrets, sur une copie des `.sql`.
