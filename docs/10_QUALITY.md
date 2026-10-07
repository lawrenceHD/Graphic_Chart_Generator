# 10 — Qualité, tests et Definition of Done

> Statut : **validé** — Version 4.0 — 2026-10-07
> Remplace : `ACCEPTANCE_CRITERIA.md` §1 et §3, parties qualité de `PROGRESS_TRACKER.md`.

## 1. Principe

**« Spécifié » n'est pas « implémenté », et « implémenté » n'est pas « vérifié ».** Un module n'est terminé que lorsque ses critères d'acceptation sont couverts par des tests exécutés et relus. Un build qui passe ne prouve rien.

## 2. Pyramide de tests

| Niveau | Outil | Cible |
|---|---|---|
| Unitaires | Vitest | Packages purs : `color-engine`, `document`, `svg-engine`, `logo-kit` |
| Propriétés | fast-check | Idempotence, aller-retour, invariants |
| Contrats / golden | Vitest + `docs/golden/` | Formules vérifiées par des valeurs externes |
| Intégration | Vitest + PostgreSQL de test (conteneur) | Routes, `can()`, files de tâches |
| Composants | Testing Library | UI critique (dropzone, timeline, éditeur) |
| E2E | Playwright | Parcours complets |
| Visuel | Playwright (captures) + différence perceptuelle | Mockups, PDF, variantes de logo |
| Accessibilité | axe + checklist manuelle | Chaque page et jalon |
| Performance | Lighthouse CI + budgets de bundle | Landing, studio |
| Sécurité | Corpus d'attaque, tests d'accès par route, gitleaks, audit des dépendances | CI |
| IA | Jeu d'or + enregistrement/rejeu | `packages/ai` |

Couverture visée (indicative, **jamais un but en soi**) : ≥ 90 % de lignes sur les packages purs, ≥ 70 % sur le reste. La qualité des assertions prime : voir le test de sabotage ci-dessous.

## 3. Test de sabotage

À la fin de chaque ticket, l'agent **casse volontairement** une ligne de la logique principale (inversion d'une comparaison, constante modifiée) et vérifie qu'au moins un test échoue. Le résultat figure dans le rapport. Le chef de projet peut refaire l'expérience à la revue. Un test qui ne détecte aucun sabotage est réécrit.

## 4. Definition of Done (par ticket)

```
[ ] Les tests d'acceptation du ticket existent, échouaient avant le code, passent maintenant.
[ ] pnpm verify passe (lint, types, tests, build, règles de dépendances).
[ ] TypeScript strict : aucun `any`, aucun `@ts-ignore`, aucun `as` de contournement.
[ ] Toute frontière est validée par Zod.
[ ] Si le ticket touche une route : can() appelé, test d'accès non autorisé présent.
[ ] Aucune dépendance ajoutée sans autorisation.
[ ] Test de sabotage réalisé et noté.
[ ] Si le ticket touche l'UI : axe sans violation, parcours clavier vérifié, tokens uniquement.
[ ] Aucun secret, aucune donnée utilisateur dans les logs.
[ ] Rapport de fin de ticket complet (AGENTS.md §10), avec la sortie réelle des commandes.
[ ] Revue du chef de projet : GO.
[ ] docs/PROGRESS_TRACKER.md mis à jour (statuts honnêtes).
```

## 5. Definition of Done (par jalon)

```
[ ] Tous les tickets du jalon sont GO.
[ ] Parcours E2E du jalon vert sur l'environnement de préproduction.
[ ] Checklist d'accessibilité manuelle réalisée.
[ ] Budgets de performance respectés.
[ ] Revue de sécurité (08_SECURITY_PRIVACY.md §6).
[ ] Sauvegarde et restauration testées (à partir de la Phase 2).
[ ] Journal de décision (ADR) à jour.
```

## 6. Corpus d'attaque SVG (obligatoire pour T-007)

Chaque cas est un fichier dans `packages/svg-engine/fixtures/attacks/` avec le résultat attendu : **refus avec code** ou **sortie nettoyée sans le motif**. Aucun ne doit atteindre le rendu.

| # | Vecteur | Résultat attendu |
|---|---|---|
| 1 | `<script>alert(1)</script>` dans le SVG | Refus `FORBIDDEN_CONTENT` |
| 2 | `onload`, `onclick`, `onerror`, `onmouseover` sur divers éléments | Refus |
| 3 | `<a xlink:href="javascript:…">` | Refus |
| 4 | `href="javascript:…"` sur `<use>` | Refus |
| 5 | `<foreignObject>` contenant HTML et script | Refus |
| 6 | `<iframe>`, `<object>`, `<embed>` | Refus |
| 7 | `<animate>` ou `<set>` visant `href` vers `javascript:` | Refus |
| 8 | `<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` | Refus |
| 9 | Entités paramétriques et internes (« billion laughs ») | Refus avant expansion |
| 10 | `<image href="http://…">` (SSRF) | Refus |
| 11 | `<image href="file:///…">` | Refus |
| 12 | `<use href="http://…#a">` externe | Refus |
| 13 | `style="background:url(http://…)"` | Refus |
| 14 | `<style>@import url(http://…);</style>` | Refus |
| 15 | `fill="url(http://…#g)"` | Refus |
| 16 | `<feImage href="http://…">` | Refus |
| 17 | `data:text/html;base64,…` dans un `href` | Refus |
| 18 | `&#106;avascript:` (références numériques) | Refus |
| 19 | Casse et espaces : `JaVa\tScRiPt:` | Refus |
| 20 | Namespaces d'éditeur (`sodipodi:*`, `inkscape:*`) contenant du contenu | Supprimés, fichier accepté |
| 21 | Profondeur 10 000 d'éléments `<g>` imbriqués | Refus `TOO_COMPLEX` |
| 22 | 500 000 nœuds | Refus `TOO_COMPLEX` |
| 23 | Cycle `<use>` (A référence B référence A) | Refus |
| 24 | `<use>` en cascade exponentielle (bombe d'expansion) | Refus (budget d'expansion) |
| 25 | Valeur d'attribut de 10 Mo | Refus |
| 26 | BOM et déclaration XML avec encodage inattendu | Normalisé ou refus clair |
| 27 | SVG polyglotte (début d'une image ou d'un HTML) | Refus (octets magiques) |
| 28 | `<text>` présent | Refus `UNSUPPORTED_FEATURE` avec indice |
| 29 | `<svg>` sans `viewBox` ni dimensions | Accepté, `viewBox` calculé |
| 30 | Référence à un `id` inexistant | Référence supprimée, avertissement |

Chaque ajout de règle au sanitizer s'accompagne d'un cas d'attaque.

Corpus équivalent pour les rasters (bombes de décompression, dimensions extrêmes, PNG tronqué, métadonnées EXIF malicieuses) et pour les archives DOCX/PDF si le brief document est activé.

## 7. Tests d'accès par route (SEC-08)

Générés par table : pour chaque route et chaque méthode, on exécute la requête avec : (a) aucun acteur, (b) un autre utilisateur, (c) une session invitée étrangère, (d) un lien de partage (lecture seule) sur une route d'écriture. Résultat attendu : `401` ou `404`, **jamais** `200`. Une route sans entrée dans la table fait échouer la CI.

## 8. Intégration continue

Pipeline GitHub Actions, déclenché à chaque pull request :

1. Installation (cache pnpm), vérification du fichier de verrouillage.
2. `gitleaks` (secrets).
3. Lint + typecheck + règles de dépendances.
4. Tests unitaires, propriétés, golden (packages purs).
5. Tests d'intégration (PostgreSQL de test en conteneur).
6. Build.
7. E2E Playwright sur le build.
8. axe, Lighthouse CI, taille de bundle.
9. Audit des dépendances (alerte sur vulnérabilité haute ou critique).

Fusion interdite si une étape échoue. Les branches sont protégées. Les dépendances sont mises à jour par un outil automatique (revue mensuelle).

## 9. Ordinateur de référence

Les mesures de performance (« 3 s », « 60 images/s ») sont définies **par rapport à une machine de référence** que le propriétaire décrit au démarrage de la Phase 3 (processeur, mémoire, GPU, navigateur). Les mesures sont refaites sur un second appareil plus modeste (téléphone ou portable d'entrée de gamme).

## 10. Critères d'acceptation transverses

- **AC-T1** Aucun `any` dans le code livré (règle de lint en erreur).
- **AC-T2** Aucune route sans `can()` ni sans test d'accès.
- **AC-T3** Toute chaîne d'interface est traduite (fr, en).
- **AC-T4** Aucune requête réseau vers un domaine tiers non listé dans la CSP.
- **AC-T5** Les vecteurs de `docs/golden/` sont reproduits dans leurs tolérances.
- **AC-T6** Le démarrage échoue si une variable d'environnement est absente ou invalide.
