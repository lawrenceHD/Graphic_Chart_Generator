# WORK-RULES — règles de travail permanentes (décision du propriétaire, 2026-11-09)

> S'applique à toute session et à tout agent, en complément de `AGENTS.md` (qui prime) et `CLAUDE.md`. Rien ne s'exécute en dehors de ces règles.

## 1. Jamais sans skills
- Avant de produire quoi que ce soit, invoquer les skills qui couvrent la tâche **avec l'outil Skill**, et suivre leurs instructions. Lire un fichier de skill ne compte pas.
- Interface : `impeccable` (shape, craft, polish, critique), `ux-ui-agent-skills:design-doctrine` en premier, puis `apply-aesthetic`, `design-component`, `design-tokens`, `ux-writing` selon le besoin ; `frontend-a11y`, `react-patterns`, `nextjs-turbopack`.
- Sécurité : `security-review`, `sharp-edges`. IA : `eval-harness`, `prompt-caching-strategy`. Données : `database-migrations`. Textes : `i18n-sync`. Fin de tâche : `verification-loop`, `conventional-commit-review`. QA navigateur : `browser-qa`, `ux-ui-agent-skills:a11y-audit`.
- Un travail dont la trace ne montre aucun appel de skill est **refusé** et refait.

## 2. Jamais sans agents, jamais sans concertation
- Toute tâche est confiée à l'agent dont le rôle la couvre (`docs/team/ROSTER.md` et `.claude/agents/`) : `design-director`, `marketing-strategist`, `seo-specialist`, `uiux-lead`, `code-reviewer`, `typescript-reviewer`, `security-reviewer`, `silent-failure-hunter`, `ux-ui-agent-skills:design-critic`, `impeccable-*`, plus les rôles R1 à R11.
- **Concertation avant d'agir** : pour toute décision qui touche plusieurs rôles (page, schéma, parcours, sécurité, copy), consulter par écrit les rôles concernés (brief dans `docs/team/…` ou message) et trancher en notant la décision dans `STATE.md` ou un ADR. Une page publique passe par design-director, marketing-strategist, seo-specialist et uiux-lead **avant** le code.
- **Revue avant clôture** : `typescript-reviewer` et `code-reviewer` sur tout diff ; `security-reviewer` si entrée utilisateur, auth, upload, API ; `silent-failure-hunter` si gestion d'erreurs ; `design-critic` sur toute interface rendue.
- Le lanceur **vérifie la trace** du sous-agent (Grep `"name":"Skill"` et `"name":"Agent"` dans son fichier de sortie) avant de croire son rapport.

## 3. Hygiène d'exécution
- Un rôle = un périmètre de fichiers (`PROTOCOL.md`). Un besoin hors périmètre devient une entrée de `docs/team/QUEUE.md`.
- Les copies de travail isolées partent de `main` par défaut : premier ordre à tout agent, `git reset --hard comp/j3-studio` (si propre) ou `git rebase comp/j3-studio`.
- TDD avec test de sabotage, `pnpm verify` vert avant toute fusion dans `comp/j3-studio`, commits Conventional avec la ligne `Co-Authored-By`.
- Ne jamais supprimer un dossier de prototype, de cache ou de données sans le dire : vérifier la cible, privilégier le récupérable.
- Pas de logo, d'image, de chiffre, de témoignage inventés sur l'accueil. Pas de push, de dépense ni de dépendance sans ADR.
- Économiser le quota : pas plus de 6 agents simultanés, ne pas relire ce qui est connu.

## 4. Mémoire de travail (obligatoire)
- Fin de chaque tâche : une ligne dans `CHANGELOG.md` (Unreleased) et une mise à jour de `docs/team/RESUME.md` (état, prochain pas).
- Toute astuce ou erreur évitable devient une règle ici ou dans la mémoire du projet.
