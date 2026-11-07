# CONSENSUS — verdicts des valideurs (2026-11-07)

> Règle : deux avis indépendants (V1/V2 pour le lot A, V3/V4 pour le lot B). Le verdict retenu est **le plus prudent des deux**.
> Aucun skill n'est installé par ce fichier. Détail et preuves : `verdicts/<nom>-V<n>.md`.
> Limites des valideurs : lectures partielles sur les gros fichiers (brand-identity-skill, code du MCP, promptfoo). Une lecture partielle ne vaut pas une preuve d'innocuité.

## Lot A (design, front, rendu)

| Candidat | V1 | V2 | Retenu | Remarque |
|---|---|---|---|---|
| Ilm-Alan/frontend-design (`f8966e6cc9b9`) | ACCEPTÉ | ACCEPTÉ | **ACCEPTÉ** | MIT, 3 fichiers, sans script. À renommer `frontend-anchors` (collision de nom), invocation sur demande seulement |
| vladzima/colormason (`41c466a66473`) | LECTURE SEULE | ACCEPTÉ | **LECTURE SEULE** | Chevauche `color-engine`, suppose Python. Dossier `colormason/` seul, sans `examples/` |
| anthropics/skills : frontend-design (`2c5958ecac7c`) | LECTURE SEULE | ACCEPTÉ | **LECTURE SEULE** | Doublon d'impeccable ; seule la liste des défauts typiques d'une interface IA est nouvelle |
| fatihaydost/brand-identity-skill (`3ba008e57b93`) | LECTURE SEULE | LECTURE SEULE | **LECTURE SEULE** | SKILL.md et références seulement. Scripts refusés : `uv run` non épinglé, récupération d'URL sans garde SSRF, `eval`, pilotage de Chrome |
| anthropics/skills : theme-factory | REFUSÉ | ACCEPTÉ | **REFUSÉ** | Désaccord ; pensé pour des diaporamas, hors stack |
| anthropics/skills : canvas-design | REFUSÉ | ACCEPTÉ | **REFUSÉ** | Désaccord ; affiches PNG/PDF, 5,5 Mo de polices binaires |
| anthropics/skills : brand-guidelines | REFUSÉ | LECTURE SEULE | **REFUSÉ** | Charte d'Anthropic, inutile pour Charta |
| anthropics/skills : webapp-testing | REFUSÉ | LECTURE SEULE | **REFUSÉ** | `with_server.py` lance des commandes arbitraires (`shell=True`) ; redondant avec le MCP Playwright et `browser-qa` |
| JustasMonkev/mcp-accessibility-scanner | REFUSÉ | LECTURE SEULE (conditionnel) | **REFUSÉ** | `npx -y` inacceptable (dépendances non épinglées, script natif `re2`, pas d'attestation) |

## Lot B (sécurité, qualité, IA, ops)

| Candidat | V3 | V4 | Retenu | Remarque |
|---|---|---|---|---|
| trailofbits : sharp-edges (`e4dd0bb5`) | ACCEPTÉ | ACCEPTÉ | **ACCEPTÉ** | `allowed-tools: Read Grep Glob`, aucun script. Licence CC-BY-SA-4.0 : attribution obligatoire |
| trailofbits : agentic-actions-auditor | LECTURE SEULE | LECTURE SEULE | **LECTURE SEULE** | Retirer `Bash` à l'installation |
| trailofbits : differential-review | REFUSÉ | LECTURE SEULE | **REFUSÉ** | `Bash` non borné + `Write`, corpus Solidity, doublon de `code-reviewer` |
| microsoft/playwright-cli (skill, `4bc00fb7`) | LECTURE SEULE | LECTURE SEULE | **LECTURE SEULE** | Le CLI `@playwright/cli` n'est pas validé (dépendance, ADR-026) ; `run-code` et `eval` exécutent du JS |
| getsentry : gha-security-review (`e94f2221`) | LECTURE SEULE | LECTURE SEULE | **LECTURE SEULE** | Utile pour `ci.yml` ; retirer `Bash` et `Task` |
| getsentry : security-review | REFUSÉ | LECTURE SEULE | **REFUSÉ** | Collision de nom avec le skill local ; licence CC-BY-SA-4.0 (pas Apache-2.0 comme dans `candidates-B.md`) |
| promptfoo | REFUSÉ | REFUSÉ | **REFUSÉ en devDependency** | Télémétrie active par défaut, 2 797 entrées de lockfile. Seul usage envisageable : `npx promptfoo@0.125.1` isolé, hors lockfile, télémétrie coupée : décision du propriétaire |
| squawk | ACCEPTÉ (binaire v2.71.0) | ACCEPTÉ (npm 2.70.0) | **ACCEPTÉ sous autorisation** | Les deux valideurs divergent sur la version et la voie (binaire GitHub sans sha256 publié, ou paquet npm en retard qui ajoute au lockfile). Post-09/11, rôle R10 |

## Obligations de licence

- Trail of Bits (CC-BY-SA-4.0) : conserver LICENSE et attribution dans le dossier installé. Le partage à l'identique ne vise que la diffusion d'une version **modifiée** ; copier sans modifier.
- Apache-2.0 / MIT : conserver les fichiers LICENSE.

## Installable maintenant (texte pur, sans script, sans dépendance)

1. `Ilm-Alan/frontend-design` renommé `frontend-anchors`.
2. `trailofbits/sharp-edges`.

Tout le reste : lecture seule (checklists dans `docs/team/skills/`, jamais exécutées), refus, ou décision du propriétaire.
