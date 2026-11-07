# Charta : modèle économique (brouillon)

> Statut : **brouillon d'analyste, 2026-11-07**. Aucun prix ici n'est décidé. Tout chiffre étiqueté `H` est une **hypothèse** ; « Constaté » = lu dans le dépôt ou sur une page officielle à la date indiquée.
> Sources dépôt : `apps/web/PRODUCT.md`, `docs/07_AI_COPILOT.md` §2, `docs/11_INFRA_COSTS.md` §10-11, `docs/14_ADR_LOG.md` (ADR-030, O-5), `apps/web/src/landing/pricing-plans.ts`, `apps/web/src/server/plans.ts`, `packages/ai/src/safety/budget.ts`.

## 1. À qui on vend

- **Constaté** (`apps/web/PRODUCT.md`) : fondateurs et indépendants qui ont déjà un logo ; designers freelances et agences (gain sur la partie systématique d'une charte) ; développeurs et agences web qui reçoivent un logo (variantes propres, tokens).
- **Inféré, non confirmé par le propriétaire** : marché de départ = Afrique francophone (Cameroun), français puis anglais. `PRODUCT.md` le dit lui-même (« inferred, owner not yet explicit »). Les prix en euros ci-dessous en dépendent.
- **À valider** : la disposition des designers à payer. Aucune étude ni entretien n'existe dans le dépôt (les propositions `docs/proposals/` ne sont pas validées).

## 2. Ce que donne chaque plan

Plans de la page `/tarifs` (`landing/pricing-plans.ts`) : Gratuit 0 € / Pro 15 € / Agence 49 € par mois, **prix à valider**, aucun paiement.

| Fonction | Existe aujourd'hui (constaté) | Plan affiché | Remarque |
|---|---|---|---|
| Quota de 3 projets | Oui, `server/plans.ts`, refus `QUOTA_PROJECTS` (ADR-030) | Gratuit | Constante de code, pas de table `subscriptions` |
| Export PDF de la charte | Oui, mais par la boîte d'impression (critique `.impeccable/critique/2026-10-30…`) | Gratuit | Pas de PDF serveur |
| Fichiers logo et variantes | Oui, `studio/workspace/logo-kit-export.ts` | Gratuit | |
| Copilote | Oui, `copilot-panel.tsx` | Gratuit | Coûte des jetons : plafonner les tours |
| Tokens CSS, Tailwind, DTCG/Figma | Oui, `export-files.ts` | Pro | Aujourd'hui accessible à tous : le réserver au Pro est un choix produit, pas une contrainte technique |
| Mockups haute définition | Mockups présents ; le 3840 x 2160 n'est **pas vérifié** par moi | Pro | À contrôler avant de le promettre |
| Projets illimités | Non (seule la limite gratuite existe) | Pro | Voir §3 : « illimité » doit devenir un plafond d'usage |
| Analyses prioritaires | Non | Pro | **Prévu** |
| Équipe, partage client, marque blanche, accompagnement | Non (partage = US-14 *Should*, non livré) | Agence | **Prévu** : ne pas vendre avant livraison |

Recommandation (H) : la page n'annonce que ce qui existe ; les lignes **Prévu** portent « Bientôt ». Le Pro dit « usage équitable » plutôt qu'« illimité ». Cohérence : deux constantes `PLANS` (`landing/pricing-plans.ts` et `server/plans.ts`) risquent de diverger ; à unifier après O-5.

## 3. Économie unitaire

### 3.1 Prix du modèle
- **Constaté** (page officielle `aistudio.google.com/docs/pricing`, lue le 2026-11-07 via un résumé automatique, **à re-vérifier à la date d'achat**) : famille Flash 3.x à 0,75 $ entrée / 3,75 $ sortie par million de jetons ; Flash-Lite 3.5 à 0,30 / 2,50 ; Flash-Lite 3.1 à 0,25 / 1,50 ; niveau gratuit disponible sur ces modèles ; plusieurs prix 3.x augmentent le 2026-12-01 ou le 2027-01-01 ; les modèles 2.5 sont dépréciés le 2026-12-01.
- **Inconnu** : la valeur de `AI_MODEL` en production (`.env.example` : `replace-me-locally`). Je calcule donc avec deux couples **illustratifs** : A = 0,75 / 3,75 ; B = 0,30 / 2,50 ($ par million de jetons). Taux H0 : 1 $ = 0,92 € (non vérifié).
- Les conditions du palier payant (conservation, entraînement) sont à relire avant la bêta (`07_AI_COPILOT.md` §2).

### 3.2 Coût d'une charte
Formule du projet : `coût_charte = jetons_entrée x prix_entrée + jetons_sortie x prix_sortie`.

Plafonds **constatés** : analyse, sortie <= 2 000 jetons ; copilote <= 1 000 jetons par tour ; `DEFAULT_BUDGET` de la recherche = 6 appels, 4 000 000 caractères, 2 000 jetons de sortie par requête (total sortie <= 12 000).

Volumes **hypothétiques** (aucun mesuré ; la mesure sur le jeu d'or de 40 marques, prévue par `11_INFRA_COSTS.md` §11, n'est pas faite) :
- H1 analyse : 3 000 jetons entrée, 2 000 sortie.
- H2 recherche : 6 appels x 8 000 entrée = 48 000 ; 12 000 sortie (pire cas du plafond).
- H3 copilote : 10 tours x 6 000 entrée = 60 000 ; 10 000 sortie.

Couple A ($) :
- analyse = 3 000 x 0,75/1e6 + 2 000 x 3,75/1e6 = 0,00225 + 0,0075 = **0,00975**
- recherche = 48 000 x 0,75/1e6 + 12 000 x 3,75/1e6 = 0,036 + 0,045 = **0,081**
- copilote = 60 000 x 0,75/1e6 + 10 000 x 3,75/1e6 = 0,045 + 0,0375 = **0,0825**
- total = **0,173 $** soit environ **0,16 €** (H0).

Couple B : 0,0059 + 0,0444 + 0,043 = **0,093 $** (environ 0,09 €). Avec les relances du schéma (jusqu'à 2), le pire cas triple à peu près : **<= 0,5 €**.

À valider : coût IA par charte de l'ordre de **0,1 à 0,5 €** (H). Un compte gratuit (3 projets) coûte donc environ 0,3 à 1,5 € une fois.

### 3.3 Autres coûts
- H4 fixe mensuel : VPS 4 vCPU / 8 Go ~ 30 € (`11_INFRA_COSTS.md` : « quelques dizaines d'euros au plus », sans chiffre) ; domaine ~ 15 €/an = 1,25 €/mois ; e-mail transactionnel 0 à 5 € ; Sentry, R2, sauvegardes ~ 0 au départ. **Fixe retenu : 35 €/mois.** Prix réels : « prix non vérifié à la date d'achat », à remplir : VPS [ ] ; R2 [ ] ; e-mail [ ] ; domaine [ ].
- H5 stockage et calcul variables par abonné : 0,2 € (Pro), 0,5 € (Agence). Surveiller les rendus 4K sur R2.
- H6 frais de paiement : 5 % du prix (**non vérifié**, à remplacer par le tarif du fournisseur choisi).
- H7 coût du gratuit : 100 nouveaux comptes gratuits par mois x 0,5 € = 50 €/mois. **Fixe modélisé F = 35 + 50 = 85 €/mois.**

### 3.4 Marge par plan payant (cible projet : >= 70 %)
H8 usage : Pro = 10 chartes/mois ; Agence = 40 ; coût IA 0,16 € par charte.
- Pro à 15 € : coût = 10 x 0,16 + 0,2 + 0,05 x 15 = 1,6 + 0,2 + 0,75 = 2,55 € ; marge = 12,45 / 15 = **83 %**.
- Pro gros utilisateur (40 chartes) : 6,4 + 0,2 + 0,75 = 7,35 € ; marge **51 %**, sous la cible. Il faut un plafond d'usage équitable à environ 22 chartes/mois (coût <= 4,5 € pour 70 %). **Décision à prendre.**
- Agence à 49 € : 6,4 + 0,5 + 2,45 = 9,35 € ; marge **81 %**.

## 4. Trois scénarios

Mix H9 : 80 % Pro / 20 % Agence. Seuil = F / contribution moyenne (prix - coût variable : IA 1,6 Pro, 6,4 Agence, stockage et frais de paiement inclus).

| Scénario | Pro / Agence | Contribution Pro | Contribution Agence | Moyenne | Seuil (abonnés) | Marge Pro / Agence |
|---|---|---|---|---|---|---|
| Prudent | 9 / 29 € | 6,75 | 20,65 | 9,53 | 85 / 9,53 = 8,9 -> **9** | 75 % / 71 % |
| Central | 15 / 49 € | 12,45 | 39,65 | 17,89 | 85 / 17,89 = 4,75 -> **5** | 83 % / 81 % |
| Ambitieux | 25 / 79 € | 21,95 | 68,15 | 31,19 | 85 / 31,19 = 2,7 -> **3** | 88 % / 86 % |

**Sensibilité, coût IA x 2** (IA Pro 3,2 €, Agence 12,8 €) :
- Prudent : contributions 5,15 et 14,25, moyenne 6,97, seuil **13** ; marges 57 % et 49 % : **sous la cible**.
- Central : 10,85 et 33,25, moyenne 15,33, seuil **6** ; marges 72 % et 68 % (Agence juste sous 70).
- Ambitieux : 20,35 et 61,75, moyenne 28,63, seuil **3** ; marges tenues.

Lecture : le prix prudent ne tient pas la cible si l'IA double ; le central la tient de justesse. Les seuils excluent le temps humain et le support, et supposent que les abonnés existent : **aucune demande n'est démontrée**.

## 5. Tarification locale (options, aucun fournisseur recommandé)

Constaté : rien n'est décidé (O-5 : « dépend du pays d'établissement »). Options à instruire, chacune **à vérifier** (frais, couverture, conditions pour une société établie hors zone, délais de reversement) :
- Carte bancaire internationale via une plateforme de paiement en ligne. Limite probable (supposé) : peu de cartes internationales dans une partie du public visé.
- Mobile Money (Afrique centrale et de l'Ouest) via un agrégateur local ou régional.
- Virement ou facture manuelle pour les agences.
- Revendeur de logiciel qui gère la TVA (« merchant of record ») : simplifie la fiscalité, rogne la marge.
- Devises : XAF (parité fixe avec l'euro, 655,957 XAF pour 1 EUR : à reconfirmer), EUR, USD. Question ouverte : prix en EUR convertis, ou grille XAF propre (le pouvoir d'achat local est très inférieur à 15 €) ?
- Une grille XAF distincte change tout §4 (le coût IA reste en USD). **À valider auprès de prospects réels.**

## 6. Risques

- **Abus du gratuit via sessions invitées** (constaté : sessions invitées de 24 h, `POST /api/v1/guest-sessions`, Turnstile) : on peut enchaîner des sessions ; `AI_DAILY_BUDGET_EUR` et `AI_USER_DAILY_TOKENS` sont **spécifiés**, leur application effective n'est pas vérifiée par moi.
- **Coût IA** : hausses de prix annoncées (§3.1), dépréciation de modèles, aucune mesure réelle.
- **Dépendance fournisseur** : un seul adaptateur Gemini en production ; le port `AiPort` prévoit un second fournisseur (spécifié). Le niveau gratuit actuel ne sert pas à vendre.
- **Droits des logos clients** : l'utilisateur dépose le logo de tiers ; CGU et garantie à rédiger ; textes juridiques obligatoires avant bêta (`01_PRODUCT_MVP.md` §7).
- **RGPD** : logos et briefs envoyés à un sous-traitant IA ; conservation et entraînement du palier payant à relire ; registre des sous-traitants.
- **Promesse contre livraison** : vendre équipe, marque blanche, partage avant livraison.

## 7. Décisions et mesures

À décider par le propriétaire :
1. Pays d'établissement et fournisseur de paiement (O-5), donc devises.
2. Pro « illimité » ou plafond d'usage équitable (et sa valeur).
3. Tokens réservés au Pro ou offerts.
4. Grille en EUR ou en XAF.
5. Quota gratuit : 3 projets, ou limite en chartes générées.

À mesurer (instrumentation à prévoir ; `usage_events` est spécifié) : jetons réels et coût par charte (moyenne, p95), appels de recherche par charte, tours de copilote par projet, conversion visiteur -> invité -> compte -> 3e projet (friction du quota), taux d'échec d'export, coût du gratuit par compte, sessions invitées par IP et par jour.

## 8. Pitch jury en 5 lignes (honnête)

1. Charta transforme un logo et un brief en charte graphique complète, éditable à la main ou au copilote.
2. L'IA lit, explique et cite ; les moteurs calculent couleurs, contrastes et variantes ; le logo n'est jamais redessiné.
3. Modèle prévu : gratuit limité à 3 projets (déjà appliqué côté serveur), plans Pro et Agence en hypothèse de prix.
4. Coût IA estimé à 0,1 à 0,5 € par charte : hypothèse en cours de mesure, pas un résultat.
5. Aucun paiement, aucun abonné payant, aucun revenu à ce jour : valider le prix auprès de vrais designers est l'étape suivante.