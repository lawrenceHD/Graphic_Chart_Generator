# CLAUDE.md — Instructions de Session Continue pour Claude Code & Antigravity

> **Règle absolue** : Ce fichier s'applique conjointement avec [`AGENTS.md`](./AGENTS.md). En cas de doute technique sur le projet, [`AGENTS.md`](./AGENTS.md) prime.

---

## 1. Contexte d'Exécution & Profil des Modèles

Tu opères avec des modèles de frontière (**Claude Opus 5.5 / Sonnet 5.5** ou **Gemini 3.8 Flash High**). 
Ton niveau de raisonnement est maximal : 
- **Zéro bavardage** : Ne paraphrase pas la demande de l'utilisateur, ne donne pas de cours théorique sur TypeScript ou Zod.
- **Concision chirurgicale** : Concentre-toi sur le plan d'action, le code, les tests et les sorties réelles de commandes.
- **Économie de tokens** : Ne lis jamais de fichiers complets quand une inspection ciblée suffit.
- **Lockfile** : n'édite jamais `pnpm-lock.yaml` à la main ; seul pnpm le modifie, et uniquement pour une dépendance autorisée par le ticket (ADR-026).

---

## 2. Protocole de Session Continue (Multi-Ticket)

**L'utilisateur peut travailler dans une session continue unique** (tolérée par ADR-026 ; une session par ticket reste recommandée par `docs/12_WORKFLOW_ROADMAP.md` §3). Ne demande pas à l'utilisateur de fermer la session entre deux tickets : applique le protocole de transition ci-dessous.

### A. Cycle d'exécution d'un ticket (T-xxx)
Pour chaque ticket confié dans la session :
1. **Cadrage strict** :
   - Lis le ticket dans `docs/tickets/`.
   - Lis les documents listés dans le champ « À lire » du ticket et les fichiers du package concerné.
   - Si un document non listé semble utile, lis-le (`AGENTS.md` §2) ; ne lis pas les archives (`docs/_archives/`).
2. **TDD non négociable** (`AGENTS.md` §4) :
   - Écris d'abord les tests d'acceptation dans le package visé.
   - Exécute le test et vérifie qu'il échoue (état rouge) : `pnpm test --filter <package>`.
   - Écris le code minimal pour faire passer le test (état vert).
   - Réalise le **test de sabotage** : casse volontairement une ligne de la logique métier, vérifie l'échec du test, puis restaure la ligne.
3. **Validation globale** :
   - Exécute `pnpm verify` (script complet dans `package.json`). Aucun avertissement ou erreur toléré.
4. **Rapport obligatoire (`AGENTS.md` §10)** :
   - Fournis le rapport exact avec les sorties réelles des commandes.

### B. Protocole de transition inter-tickets (Context Reset)
Dès qu'un ticket est terminé et validé :
1. **Purge mentale (Mental Flush)** :
   - Considère le ticket précédent comme scellé.
   - Oublie les détails de conception internes du ticket précédent. Ne relis **pas** les fichiers du ticket précédent lors du ticket suivant, sauf si ce dernier en dépend explicitement (`Dépend de`).
2. **Gestion proactive du `/compact`** :
   - Tous les **2 à 3 tickets résolus**, ou si la session accumule de longs diffs de code, propose explicitement à l'utilisateur de lancer `/compact`.
   - Si tu rédiges le résumé de compactage, résume uniquement :
     - Les tickets complétés et leurs exports clés.
     - L'état de `pnpm verify`.
     - Le prochain ticket à traiter et ses dépendances.
3. **Isolation du nouveau périmètre** :
   - Attends l'instruction ou le ticket suivant et repars d'un scope vierge de lecture.

---

## 3. Règles Techniques Impératives (`AGENTS.md`)

- **Zéro `any`** (explicite ou implicite), zéro `as` de contournement, pas de `@ts-ignore`. Utilise `unknown` puis validation Zod.
- **Zod à chaque frontière** : données utilisateur, HTTP, variables d'environnement, communication IA.
- **Packages purs** (`color-engine`, `document`, `svg-engine`, `logo-kit`) :
  - Interdiction absolue d'accéder à `process`, `fetch`, `Date`, `Math.random` ou au disque dans ces packages (injecte-les si nécessaire).
- **Architecture & Dépendances** :
  - Respect strict de la hiérarchie (`packages/*` ne dépend jamais de `apps/*` ni d'un package situé au-dessus).
  - Vérifié par `dependency-cruiser` lors de `pnpm verify`.
- **Git** : Commits atomiques au format Conventional Commits (`feat(color-engine): ...`, `test(document): ...`).
- **Taille** : Moins de 400 lignes de modification par ticket hors tests.

---

## 4. Quand s'arrêter immédiatement (BLOCKER)

Arrête-toi et préviens l'utilisateur avec la section :
`BLOCKER — <problème> — Options : A) … B) … — Ta recommandation : …`
si :
- Une spécification est ambiguë ou contradictoire.
- Une nouvelle dépendance non autorisée semble requise.
- Un vecteur de référence de `docs/golden/` semble faux.
- Le ticket dépasse 400 lignes.

---

## 5. Agents de Review, Skills & Outils MCP Disponibles

Le dépôt dispose des agents et compétences suivants (dans `.claude/`, provenance dans `.claude/skills/SOURCES.md`) :
- **Agents de review** (à lancer en fin de ticket, avant le rapport) :
  - `typescript-reviewer` : Traque les `any`, non-null assertions `!`, casts `as` et promesses non gérées.
  - `code-reviewer` : Audit qualité, régression et couverture de cas limites avant validation.
  - `security-reviewer` : Vérification des injections, conformité Zod et isolation des tokens.
  - `silent-failure-hunter` : Détection des erreurs silencieuses et des `catch` vides.
- **Skills** :
  - `nextjs-turbopack` : Next.js 16 (`proxy.ts` remplace `middleware.ts`).
  - `browser-qa`, `frontend-a11y`, `react-patterns` : QA visuelle, accessibilité, React.
  - `database-migrations` : Migrations Drizzle sûres.
  - `i18n-sync` : Traductions FR/EN.
  - `eval-harness` : Jeu d'évaluation IA (`docs/07_AI_COPILOT.md` §5).
  - `mcp-dependency-review` : Revue de `.mcp.json` avant toute modification.
  - `security-review`, `verification-loop`, `conventional-commit-review`, `prompt-caching-strategy`.
  - `brand-discovery` : Référence métier (archétypes, ton) pour le brief guidé ; pas un outil de code.
- **Hooks** (`tools/agent-hooks/`, activation décrite dans son README) : refus automatique des violations d'`AGENTS.md`, formatage et typecheck après chaque modification.
- **Outils MCP (`.mcp.json`)** :
  - `playwright` : Navigation et capture visuelle des composants / scènes WebGL.

