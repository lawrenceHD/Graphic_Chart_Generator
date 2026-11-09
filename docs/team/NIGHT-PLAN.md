# NIGHT-PLAN — travail autonome du 2026-11-09 au 2026-11-10

> Autorisation du propriétaire : aucun accord requis, décider avec les agents et exécuter jusqu'à réalisation. Quota Claude : environ 80 % consommé, remise à zéro à 4h30. Économiser : pas plus de 6 agents simultanés, jamais de relecture de fichiers déjà connus.

## Règles
- Chaque sous-agent invoque réellement ses skills et agents (vérifier la trace avec Grep sur `"name":"Skill"`), sinon rapport refusé.
- Les copies isolées partent de `main` : le premier ordre est `git reset --hard comp/j3-studio` (ou rebase).
- Aucun logo ni image généré sur l'accueil. Accueil : base `prototypes/studio` (5180), complétée par `docs/team/landing/01-04`.
- Pas de push. Pas de dépense. Pas de binaire ni dépendance sans ADR.

## Ordre de fusion dans `comp/j3-studio` (pnpm verify vert entre chaque)
1. Compléments R3 (worker) puis sécurité (R6/R9).
2. Entrée multi-logos et manifeste.
3. Mockups modifiables (studio).
4. Scènes et vrais logos (landing/examples, public/scenes).
5. Accueil (en dernier : il dépend des exemples et des scènes).

## Ensuite (vagues suivantes, par priorité)
- Vague A : `pnpm verify` complet, corriger les régressions ; supprimer les 1,33 Go d'images Pinterest (`corpus-reel/pinterest/*.jpg|png|webp` et légendes), garder `index.jsonl`, `manifest.json`, `chartes/`, `on-demand/` ; terminer la suppression de `prototypes/showcase-flow` (dist, node_modules) et la committer.
- Vague B : P1 critique studio restant : cohérence des données (marque, ratios 2,36 vs 2,4, DEMO_VIEW vs studio) ; P2 : hiérarchie de l'export, inspecteur qui suit la page visible.
- Vague C : QA navigateur (browser-qa, a11y-audit) de /, /tarifs, /connexion, /inscription, /projets, /start, studio ; corrections.
- Vague D : décision `/fr` et `/en` pour l'indexation anglaise (ADR), export par un invité (règle et copy), tokens gratuits ou Pro.
- Vague E : docs (STATE.md, CHANGELOG, ADR), mémoire du projet à jour, relecture finale (code-reviewer, typescript-reviewer, security-reviewer).

## Journal
- 2026-11-09 : plan écrit. Agents en cours : accueil, scènes et vrais logos, multi-fichiers, mockups modifiables, sécurité, compléments R3.
