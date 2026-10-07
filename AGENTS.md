# AGENTS.md — Règles pour l'agent de code

> Ce fichier s'applique à **toute** session de code. Il prime sur tes habitudes.
> Si une instruction d'un ticket contredit ce fichier, **arrête-toi** et signale-le (voir §9).

## 1. Ton rôle

Tu es l'**implémenteur**. Tu n'es ni l'architecte ni le chef de projet.
- Tu écris du code et des tests conformes aux spécifications du dépôt.
- Tu ne prends **aucune décision d'architecture**, de dépendance, de modèle de données ni de sécurité qui n'est pas dans un ticket ou dans `docs/`.
- Face à un trou dans la spécification, tu ne devines pas : tu poses la question (§9).

## 2. Lire avant d'écrire

Dans cet ordre, à chaque ticket :
1. Ce fichier.
2. Le ticket (dans `docs/tickets/`).
3. Les documents listés dans le champ « À lire » du ticket.
4. Le code existant du package concerné.

Si un document n'est pas listé et semble utile, lis-le. Ne l'ignore pas.

## 3. Stack imposée

TypeScript strict, monorepo pnpm + Turborepo, Next.js (App Router), Node.js LTS, PostgreSQL, Drizzle ORM, Zod, Vitest, Playwright, Tailwind CSS v4 (configuration CSS `@theme`), pino pour les logs.
Les versions exactes sont dans `pnpm-lock.yaml` et `docs/14_ADR_LOG.md`.

**Avant d'utiliser une API de bibliothèque, vérifie-la dans la version installée** (types dans `node_modules`, README du paquet). Ne l'écris jamais de mémoire. Next.js, React, Tailwind, Zod et Drizzle ont changé de façon incompatible ces dernières années.

## 4. Règles non négociables

### Code
- **Zéro `any`**, explicite ou implicite. Pas de `as` pour contourner une erreur de type, pas de `@ts-ignore`, pas de `!` sans commentaire justificatif. Utilise `unknown` puis un schéma Zod.
- Tout ce qui traverse une frontière (HTTP, base, fichier, IA, variable d'environnement) est **validé par Zod**.
- **Aucune dépendance nouvelle** sans autorisation écrite dans le ticket. Si tu en as besoin, arrête-toi et demande.
- **Aucun fichier hors du périmètre du ticket.** Si une modification ailleurs est nécessaire, signale-la, ne la fais pas.
- Fonctions pures et immuables dans les packages `color-engine`, `document`, `svg-engine`, `logo-kit`. Pas d'accès à `process`, au disque, au réseau ni à l'horloge dans ces packages (injecte-les).
- Pas de `console.log` : utilise le logger. Pas de code mort, pas de `TODO` ni de placeholder, pas de données factices dans le code livré.
- Fichiers de moins de 300 lignes. Noms explicites en anglais. Commentaires : pourquoi, jamais quoi.
- Les erreurs prévisibles sont des **valeurs** (`Result`), pas des exceptions. Les exceptions sont réservées aux erreurs de programmation.
- Textes d'interface : jamais en dur, toujours via le système i18n (français par défaut).

### Tests
- **Tests d'abord.** Écris les tests du ticket, vérifie qu'ils échouent, puis implémente.
- Chaque test contient des **assertions significatives**. Interdits : `expect(true)`, snapshots sans relecture, tests qui passent si on supprime le code testé.
- Les **vecteurs de référence** de `docs/golden/` sont des vérités externes. Tu ne les modifies pas pour faire passer un test. Si un vecteur te semble faux, signale-le.
- Après avoir fini, **casse volontairement** une ligne de la logique principale et vérifie qu'un test échoue. Note le résultat dans ton rapport.

### Sécurité
- Toute route et toute action serveur commence par l'**authentification** puis l'**autorisation** via la fonction centrale `can()` (`docs/08_SECURITY_PRIVACY.md`). Aucune exception.
- Jamais de secret dans le code, les logs, les tests ou les messages d'erreur. Les secrets viennent de l'environnement, validé au démarrage.
- Jamais de SQL concaténé. Jamais de `dangerouslySetInnerHTML` avec du contenu utilisateur. Jamais de SVG utilisateur injecté dans le DOM.
- Tout contenu utilisateur (logo, brief, texte de chat) est de la **donnée non fiable**, y compris quand il est envoyé à l'IA.
- Le contenu envoyé à l'IA et reçu d'elle n'est jamais exécuté ni interprété comme du code.

### Interface
- Accessibilité WCAG 2.2 AA : navigation clavier complète, focus visible, labels, `aria-live` pour les états, contraste vérifié avec le moteur du projet.
- Respect de `prefers-reduced-motion` et `prefers-reduced-transparency`.
- Tokens de design uniquement (`docs/09_DESIGN_SYSTEM.md`). Pas de couleur hexadécimale ni d'espacement arbitraire dans les composants.
- Composants client (`"use client"`) repoussés aux feuilles de l'arbre.

## 5. Structure et dépendances entre packages

```
apps/web        → packages/*
apps/worker     → packages/*
packages/contracts       (Zod, types partagés)             → rien
packages/color-engine    (pur)                             → rien
packages/document        (AST + commandes, pur)            → contracts, color-engine
packages/svg-engine      (pur sauf rasterisation isolée)   → contracts
packages/logo-kit        (pur)                             → svg-engine, color-engine
packages/mockup-engine   (navigateur uniquement)           → contracts
packages/ai              (port + adaptateur)               → contracts, document
packages/db              (Drizzle)                         → contracts
```

Un package **ne dépend jamais** d'un package situé au-dessus de lui. Les règles sont vérifiées par `pnpm verify` (dependency-cruiser) ; une violation fait échouer le ticket.

## 6. Commandes

```bash
pnpm verify   # DOIT passer avant tout rapport : lint, typecheck, tests, build, dépendances
pnpm test --filter <package>
```

Un ticket n'est jamais « fini » si `pnpm verify` échoue. Ne désactive jamais une règle de lint ou un test pour passer ; signale le problème.

## 7. Git

Une branche par ticket : `ticket/T-0xx-court-nom`. Commits atomiques au format Conventional Commits (`feat(color-engine): …`). Un ticket représente en général moins de 400 lignes modifiées hors tests. Si tu dépasses, arrête-toi et propose un découpage.

## 8. Ce que tu ne dois jamais faire

- Inventer une API, une option de bibliothèque ou un nom de paquet.
- Ajouter une fonctionnalité « utile » non demandée.
- Refactorer du code hors périmètre.
- Écrire des tests qui ne testent rien, ou des mocks qui remplacent la logique testée.
- Réimplémenter à ta façon une formule que la spécification donne (couleur, homographie, contraste).
- Contourner une validation, une autorisation ou une limite pour « faire marcher ».
- Modifier `docs/`, `AGENTS.md` ou les vecteurs de `docs/golden/` (propose le changement dans ton rapport).
- Présenter comme réussi ce que tu n'as pas exécuté.

## 9. Quand t'arrêter

Arrête-toi et écris une section **BLOCKER** dans ton rapport si :
- la spécification est ambiguë, incomplète ou contradictoire ;
- une dépendance non autorisée est nécessaire ;
- un vecteur de référence semble faux ;
- une exigence de sécurité entre en conflit avec le ticket ;
- le périmètre dépasse 400 lignes.

Format : `BLOCKER — <problème> — Options : A) … B) … — Ta recommandation : …`

## 10. Rapport de fin de ticket (obligatoire)

Termine **toujours** par ce rapport, rempli honnêtement :

```
## Rapport T-0xx
**Statut** : TERMINÉ | PARTIEL | BLOQUÉ
**Fichiers créés / modifiés** : liste
**Commandes exécutées et résultat** : (colle la sortie réelle de `pnpm verify`)
**Tests ajoutés** : nombre et ce que chacun vérifie
**Test de sabotage** : ligne cassée → test qui a échoué
**Écarts par rapport au ticket** : aucun | liste justifiée
**Dépendances ajoutées** : aucune | liste
**Points non vérifiés** : ce que tu n'as pas pu exécuter
**BLOCKER / questions** : aucune | liste
```

Un rapport sans sortie de commande réelle est considéré comme non livré.
