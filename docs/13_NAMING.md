# 13 — Choix du nom

> Statut : **ouvert** — décision attendue avant la fin de la Phase 0.
> Contrainte technique : le code n'utilise pas le nom (`@app/*`, variable `APP_NAME`) ; le renommage final est une opération d'une heure.

## 1. Cahier des charges du nom

Court (≤ 7 lettres de préférence), précis, beau à lire et à dire, **prononçable en français et en anglais**, évoquant la charte, la règle, la couleur ou le tracé sans être littéral. Pas de trait d'union, pas de mot-valise forcé, pas de « Brand… », « …ly », « …ify ». Il doit supporter un joli logo : le produit fabrique des identités, la sienne doit être exemplaire.

## 2. Candidats

| Nom | Sens et évocation | Atouts | Risques à vérifier |
|---|---|---|---|
| **Charta** | Latin « papier, charte » ; proche de *charte* (FR) et de *chart/charter* (EN) | Lien direct avec « charte graphique », international, élégant, 6 lettres | Un éditeur d'art italien porte ce nom (autre secteur, mais à cadrer) ; `.com` probablement pris |
| **Trame** | Tissage, structure, trame d'impression (demi-teinte) | Évoque la grille et l'imprimé, mot français précis, très graphique | Mot courant (référencement difficile) ; prononciation anglophone incertaine |
| **Norma** | « La règle, la norme » | Court, sonore, sens fort (des règles d'usage) | Nom très répandu (marques, prénom) ; référencement difficile |
| **Aplat** | Terme de métier : surface de couleur unie | Très « designer », distinctif, 5 lettres | Opaque pour les non-francophones ; « à plat » peut sembler terne |
| **Regula** | Latin « règle » (aussi la règle du graphiste) | Musical, sens juste | **Une entreprise de vérification de documents porte ce nom** (à confirmer) : conflit probable |
| **Gamut** | Étendue des couleurs reproductibles | Précis pour la couleur | Terme générique, probablement très pris |
| **Kern** | Crénage typographique | Très court, clin d'œil de métier | Générique ; sens « noyau » en allemand ; nombreux usages |
| **Livrée** | Ensemble des couleurs d'une marque (véhicules, uniformes) | Poétique, sens exact | Accent, difficile à l'international |
| **Colophon** | Page finale d'un livre signée par ses artisans | Beau, culturel | Long ; une fonderie typographique porte ce nom |
| ~~Mire~~ | Mire de réglage, viser | Court | **Écarté** : *mire* signifie « bourbier » en anglais |

## 3. Ma recommandation

1. **Charta** — le meilleur compromis entre sens, élégance et portée internationale. Premier choix à tester.
2. **Trame** — le plus « studio » et le plus français ; excellent si la cible est francophone.
3. **Norma** — alternative courte et forte si Charta est indisponible.

Les trois sont des **hypothèses de travail**. Je n'ai pas vérifié leur disponibilité (domaine, marque, réseaux) : une recherche générale ne m'a signalé aucun produit homonyme évident dans le secteur des chartes graphiques, mais ce n'est **pas** une vérification.

## 4. Méthode de vérification (à faire avant tout achat)

Pour chacun des 3 noms retenus, dans cet ordre (arrêt dès qu'un critère éliminatoire apparaît) :

1. **Domaine** : disponibilité de `.com`, `.app`, `.studio`, `.io`, `.fr` selon les marchés. Éliminatoire : aucune extension acceptable.
2. **Marque** : recherche d'antériorités dans les registres des marchés visés (classes de Nice 9, 35, 42 au minimum, plus 41 si formation). Éliminatoire : marque identique ou très proche dans les classes 9, 35 ou 42.
3. **Collision d'usage** : noms de dépôts, paquets npm, applications sur les boutiques, comptes de réseaux sociaux, résultats de moteurs de recherche (page 1 doit être rendable).
4. **Sens et sonorité** : vérification dans les langues des marchés cibles (sens négatif, grossier ou ridicule).
5. **Test d'oreille** : dire le nom à 5 personnes (francophones et anglophones), au téléphone : l'orthographe est-elle devinée ?
6. **Test visuel** : en 30 minutes, dessiner un logotype simple. Le nom se laisse-t-il bien mettre en forme ?

### Grille de choix

| Critère | Poids | Charta | Trame | Norma |
|---|---|---|---|---|
| Disponibilité domaine/marque | 30 % | à mesurer | à mesurer | à mesurer |
| Sens et pertinence | 20 % | 5 | 4 | 4 |
| Prononçable FR/EN | 15 % | 5 | 3 | 5 |
| Mémorisable, court | 15 % | 4 | 5 | 5 |
| Potentiel de marque (logo) | 10 % | 4 | 5 | 3 |
| Référencement (SEO) | 10 % | 3 | 2 | 2 |

Les notes sont mes appréciations sur 5 ; la ligne « disponibilité » est la seule qui peut renverser le classement.

## 5. Après le choix

1. Acheter le domaine principal et les variantes évidentes ; réserver les noms de comptes.
2. Renseigner `APP_NAME` et les textes d'interface.
3. **Utiliser le produit pour créer sa propre charte** : sert de démonstration et de test grandeur nature.
4. Déposer la marque (selon avis d'un conseil en propriété industrielle) avant le lancement public.
5. Mettre à jour `README.md` (remplacer « Atelier (nom de code provisoire) »).
