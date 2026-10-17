# P-001 — Entretiens utilisateurs et étude de concurrence

> Statut : **proposition — non validée** — 2026-10-17
> Objet : valider le persona, le problème et la valeur **avant** la fin de la tranche 1, au lieu de « avant la bêta » (`docs/00_CHARTER.md` §3–§4).
> Méthode : diagnostic produit (skill `product-lens`, mode 1) et principe des entretiens centrés sur les faits passés plutôt que sur les intentions (on ne demande jamais « est-ce que tu utiliserais… ? »).

## 1. Ce qu'on cherche à savoir

| # | Hypothèse | Elle est fausse si… |
|---|---|---|
| H1 | Les fondateurs et indépendants **ayant déjà un logo** souffrent d'une identité utilisée de façon incohérente. | Moins de 3 personnes sur 5 citent un incident concret dans les 12 derniers mois. |
| H2 | Ils ont déjà essayé de résoudre le problème (studio, freelance, Canva, modèle Word…). | Aucun n'a dépensé de temps ou d'argent pour cela. |
| H3 | L'**exactitude** (couleurs, contrastes, variantes propres) compte pour eux, pas seulement l'esthétique. | Personne ne mentionne un problème de couleurs, de fichiers ou de logo déformé sans y être amené. |
| H4 | Les designers freelance gagneraient du temps sur la partie systématique d'une charte. | Ils décrivent cette partie comme rapide ou déjà outillée. |
| H5 | Les développeurs veulent des tokens et des variantes prêts à l'emploi. | Ils récupèrent déjà les couleurs depuis un fichier Figma sans difficulté. |
| H6 | Il existe un prix acceptable pour l'export complet. | Aucune personne n'accepte un engagement concret (liste d'attente, précommande, mise en relation). |

## 2. Recrutement

- **5 fondateurs ou indépendants** ayant un logo depuis au moins 6 mois (persona primaire).
- **3 designers freelance** qui livrent des chartes.
- **2 développeurs** ou agences web qui reçoivent des logos de clients.
- Exclure les proches qui ne correspondent pas au persona. Noter comment chaque personne a été trouvée.

## 3. Script (30 minutes)

Règles : une question à la fois ; demander un **exemple précis** à chaque réponse vague ; ne pas présenter le produit avant la partie 4 ; ne pas contredire.

### Partie 1 — Contexte (5 min)
1. Parle-moi de ton activité. Depuis quand existe ton logo, qui l'a créé ?
2. Où ton logo et tes couleurs apparaissent-ils aujourd'hui ? (site, réseaux, documents, imprimés, enseigne)

### Partie 2 — Le dernier épisode réel (10 min)
3. Raconte-moi **la dernière fois** que tu as dû transmettre ton logo ou tes couleurs à quelqu'un (imprimeur, développeur, partenaire). Que s'est-il passé ?
4. Quels fichiers as-tu envoyés ? Où les as-tu trouvés ? Combien de temps ça a pris ?
5. Est-ce qu'un résultat t'a déçu (couleur différente, logo flou ou déformé, mauvais fichier) ? Qu'as-tu fait ensuite ?

### Partie 3 — Solutions actuelles (5 min)
6. As-tu déjà une charte graphique ou un « brand kit » ? Qui l'a faite, combien elle a coûté (temps ou argent) ?
7. Si non : qu'est-ce qui t'en a empêché ?
8. Quels outils utilises-tu pour tes visuels ? (Canva, Figma, un freelance…)

### Partie 4 — Réaction à un exemple (7 min)
Montrer **une charte d'exemple** générée à la main pour un logo fictif (palette, contrastes, variantes, zone d'exclusion, typographie, une page de manifeste).
9. Qu'est-ce que tu regardes en premier ? Qu'est-ce qui t'est utile, inutile ?
10. Qu'est-ce qui manque pour que tu puisses l'envoyer tel quel à un prestataire ?
11. Le texte (mission, valeurs, ton) : utile, ou tu le réécrirais entièrement ?

### Partie 5 — Engagement (3 min)
12. Combien as-tu payé, ou serais-tu prêt à payer, pour un livrable de ce type ? (noter la réponse sans commenter)
13. Veux-tu tester la version bêta avec ton propre logo ? (noter : oui avec e-mail, oui sans e-mail, non)
14. Connais-tu quelqu'un dans la même situation que je pourrais interroger ?

## 4. Grille de synthèse (une ligne par entretien)

| Personne | Persona | Incident récent (H1) | Solution essayée et coût (H2) | Exactitude citée spontanément (H3) | Utile / inutile (partie 4) | Prix cité | Engagement (e-mail, mise en relation) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

Citer les phrases exactes dans une colonne « verbatim » séparée. Ne pas résumer une réponse avant d'avoir noté la phrase.

## 5. Étude de concurrence (5 à 8 produits)

Règle de la charte : **aucune affirmation sur un concurrent sans vérification datée et sourcée**.

| Produit | Cible | Accepte un logo existant ? | Palette / contrastes | Variantes de logo | PDF de charte | Tokens développeur | Édition après génération | Prix | Vérifié le | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| Looka | | | | | | | | | | |
| Canva Brand Kit | | | | | | | | | | |
| Brandmark | | | | | | | | | | |
| Frontify | | | | | | | | | | |
| Zeroheight | | | | | | | | | | |
| (autre) | | | | | | | | | | |

Méthode : créer un compte gratuit quand c'est possible, téléverser le **même logo de test** partout, faire une capture de chaque résultat.

## 6. Synthèse produit (à remplir après les entretiens)

Les sept questions du diagnostic `product-lens`, avec la preuve issue des entretiens :

1. **Pour qui exactement ?** (une personne précise, pas une catégorie)
2. **Quelle douleur ?** (fréquence, gravité, solution actuelle)
3. **Pourquoi maintenant ?**
4. **La version idéale ?**
5. **Le plus petit produit qui prouve la thèse ?**
6. **Ce qu'on ne construit pas ?**
7. **Comment saura-t-on que ça marche ?** (une métrique)

**Décision** : GO / AJUSTER LE PERSONA / AJUSTER LE PÉRIMÈTRE, avec la liste des changements à apporter à `docs/00_CHARTER.md` et `docs/01_PRODUCT_MVP.md`.
