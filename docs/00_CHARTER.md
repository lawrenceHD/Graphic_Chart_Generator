# 00 — Charte du projet

> Statut : **validé** — Version 4.0 — 2026-10-07
> Remplace : `CAHIER_DES_CHARGES.md` §1 et §5.

## 1. Problème

Une charte graphique professionnelle prend des jours de travail d'un studio et coûte plusieurs centaines à plusieurs milliers d'euros. Les indépendants, petites entreprises et startups qui ont déjà un logo se retrouvent avec une identité utilisée de façon incohérente : couleurs approximatives, logo déformé, aucun fichier propre, aucun contraste vérifié.

## 2. Promesse

> **Dépose ton logo. Obtiens en quelques minutes une charte graphique exacte, accessible et exploitable, que tu peux modifier en parlant.**

Trois engagements mesurables :
1. **Exactitude** : les couleurs, ratios de contraste et variantes de logo sont **calculés**, pas imaginés.
2. **Fidélité** : le tracé du logo n'est jamais modifié par une IA générative.
3. **Exploitabilité** : le résultat se télécharge (PDF de référence, logos SVG/PNG, tokens de design) et s'utilise tel quel.

## 3. Public cible

| Persona | Besoin | Priorité |
|---|---|---|
| **Fondateur / indépendant** avec un logo existant | Une charte présentable à ses clients, partenaires et prestataires | Primaire |
| **Designer freelance** | Gagner du temps sur la partie systématique d'une charte | Secondaire |
| **Développeur / agence web** recevant un logo | Des tokens de design et des variantes propres | Secondaire |

Hypothèse à valider avant la bêta : au moins 5 entretiens avec des représentants du persona primaire.

## 4. Positionnement et différenciation

À vérifier par une étude de 5 à 8 concurrents (Looka, Canva Brand Kit, Brandmark, outils de guidelines type Frontify ou Zeroheight, etc.) avant toute affirmation publique. Ne jamais écrire qu'un concurrent « ne fait pas X » sans l'avoir vérifié à la date de publication.

Différenciateurs visés (à prouver, pas à affirmer) :
- **Palette accessible par construction** : matrice de contrastes complète de la palette.
- **Moteur déterministe** : le logo reste intact, les variantes sont calculées.
- **Édition par commandes** : modification en langage naturel, historique et annulation.
- **Sortie développeur** : `design-tokens.json` et configuration prête à l'emploi.

## 5. Principes directeurs

1. **Déterministe avant génératif.** Ce qui peut être calculé l'est. L'IA rédige, classe et propose.
2. **Le logo est sacré.** Aucun modèle génératif ne le redessine, ne le retouche, ne le « reconstruit ».
3. **Spécifier avant coder.** Pas de code sans ticket, pas de ticket sans critères d'acceptation exécutables.
4. **Petit et vérifié vaut mieux que grand et présumé.** Un module n'est « fini » que s'il est testé.
5. **Honnêteté des promesses.** Aucune affirmation produit ou juridique (CMJN, Pantone, RGPD, chiffres) qui ne soit pas vraie et vérifiable.
6. **Le serveur fait le minimum.** Rendu et assemblage côté navigateur quand c'est possible.
7. **Sécurité par défaut.** Toute entrée utilisateur est hostile jusqu'à preuve du contraire.
8. **Accessible par défaut.** WCAG 2.2 AA est un critère de livraison, pas une finition.
9. **Coût mesuré.** Chaque appel IA et chaque rendu sont comptés et plafonnés.
10. **Un chemin, une vérité.** Une décision = un ADR. Pas de document concurrent.

## 6. Hors périmètre (non-objectifs du MVP)

Explicitement **exclus** tant que le MVP n'est pas en production :
- Génération ou retouche de logo par IA.
- Références Pantone (licence), CMJN « certifié », PDF/X imprimeur.
- Visualiseur 3D interactif et export vidéo.
- Équipes, rôles multiples, commentaires collaboratifs.
- Multi-logos par projet, kits réseaux sociaux, papeterie complète.
- Application mobile native.
- Plus de deux langues d'interface (français et anglais seulement).

## 7. Indicateurs de succès

| Indicateur | Cible bêta | Mesure |
|---|---|---|
| Temps jusqu'à la première charte | < 3 min (médiane) | Événements produit |
| Taux de réussite de l'analyse (logo valide) | ≥ 95 % | Logs |
| Validité JSON de l'IA après nouvelle tentative | ≥ 99 % | Évaluation (`07_AI_COPILOT.md`) |
| Taux de réussite des exports PDF | ≥ 98 % | Logs |
| Coût IA moyen par charte | ≤ plafond défini en `11_INFRA_COSTS.md` | `usage_events` |
| Core Web Vitals (p75) | LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 | Mesure terrain |
| Accessibilité | 0 violation axe, parcours clavier complet validé à la main | CI + checklist |

## 8. Contraintes

- **Budget** : un VPS et un nom de domaine sont acceptés, ainsi que l'API IA payante à coût plafonné. Détail : `11_INFRA_COSTS.md`.
- **Équipe** : une personne propriétaire/opératrice, un chef de projet et tech lead (cette documentation), un agent de code. Pas de parallélisme à planifier.
- **Qualité** : exigence maximale. En cas de conflit entre vitesse et exactitude, on choisit l'exactitude.

## 9. Rôles

| Rôle | Responsabilités |
|---|---|
| **Propriétaire / opérateur** | Priorités métier, exécution des commandes, tests manuels, compte fournisseurs, décisions finales. |
| **Chef de projet / tech lead** | Spécifications, architecture, tickets, revue, sécurité, qualité, planning, tenue du corpus. |
| **Agent de code** | Implémentation et tests selon `AGENTS.md`. Aucune décision structurante. |

## 10. Registre des risques

| # | Risque | Probabilité | Impact | Réponse |
|---|---|---|---|---|
| R1 | Variantes de logo de mauvaise qualité (SVG complexes, PNG vectorisés) | Haute | Élevé | Spike précoce, score de qualité (IoU), avertissements explicites, validation par l'utilisateur |
| R2 | Mockups photoréalistes trop longs à produire | Haute | Élevé | 3 scènes planes au MVP, pipeline Blender, licences maîtrisées |
| R3 | CMJN ICC non fiable | Moyenne | Moyen | Spike dédié, libellé « indicatif », sinon masquage |
| R4 | Dérive du coût IA | Moyenne | Élevé | Plafonds par utilisateur et globaux, mesure continue, port interchangeable |
| R5 | Faiblesses de l'agent de code (API inventées, tests creux) | Haute | Élevé | `AGENTS.md`, vecteurs de référence, revue systématique, test de sabotage |
| R6 | Faille de sécurité sur l'upload (SVG, PDF, DOCX) | Moyenne | Critique | Allowlist, quarantaine, corpus d'attaque, traitement isolé |
| R7 | Promesse juridique fausse (RGPD, droits, marques) | Moyenne | Élevé | Revue `08_SECURITY_PRIVACY.md`, textes validés avant publication |
| R8 | Dispersion du périmètre / polissage visuel prématuré | Haute | Moyen | Gel de la landing, MVP strict, un seul tableau de bord de suivi |
| R9 | Nom indisponible ou conflictuel | Moyenne | Moyen | Vérification avant tout achat, code indépendant du nom |
| R10 | Dépendances obsolètes (frameworks, modèles IA) | Haute | Moyen | Versions épinglées, revue mensuelle, port IA interchangeable |

## 11. Glossaire

- **Charte / brand book** : document décrivant l'identité visuelle d'une marque.
- **Tokens de design** : valeurs nommées (couleurs, typographies) consommables par du code.
- **Clear space** : zone d'exclusion autour du logo.
- **Commande** : modification typée et réversible du document de marque.
- **Golden vector** : valeur de référence calculée indépendamment du code, utilisée comme vérité dans les tests.
- **Spike** : exploration limitée dans le temps qui produit une décision, pas du code de production.
