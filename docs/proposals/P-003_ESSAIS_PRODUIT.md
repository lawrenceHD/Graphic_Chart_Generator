# P-003 — Essais du produit avec de vrais utilisateurs

> Statut : **proposition — non validée** — 2026-11-11
> Objet : savoir si le produit qui tourne aujourd'hui sert quelqu'un, avant d'écrire le plugin Figma et le PDF serveur.
> Complète `P-001_ENTRETIENS_UTILISATEURS.md` (qui interroge sur le problème, sans produit) : ici la personne
> utilise Charta avec **son propre logo**, et on regarde ce qu'elle fait.

## 1. Ce qu'on cherche à savoir

| # | Hypothèse | Elle est fausse si… |
|---|---|---|
| E1 | Un indépendant obtient une charte sans aide. | Moins de 4 sur 5 arrivent au studio avec une charte complète sans qu'on intervienne. |
| E2 | Le résultat est assez bon pour être envoyé à un prestataire. | Moins de 3 sur 5 disent qu'ils l'enverraient tel quel ou après une retouche qu'ils savent faire dans le studio. |
| E3 | Les fichiers exportés servent. | Personne n'ouvre ni ne réutilise un fichier exporté pendant la séance. |
| E4 | Un designer y voit un gain de temps sur la partie systématique. | Les 2 designers décrivent le résultat comme à refaire entièrement. |
| E5 | Ce qui bloque un designer est l'absence de reprise dans son outil. | Aucun designer ne demande Figma, Illustrator ou InDesign sans y être amené. |

E5 décide de la suite : si elle est fausse, le plugin Figma n'est pas la priorité.

## 2. Qui

- **5 indépendants ou fondateurs** qui ont un logo depuis au moins six mois et pas de charte.
- **2 designers** qui livrent des chartes à des clients.
- Pas de proches hors cible. Noter comment chaque personne a été trouvée.
- Demander à chacun d'apporter le fichier de son logo, celui qu'il enverrait à un imprimeur.

## 3. Séance (30 minutes, une personne, son ordinateur ou le vôtre)

Règles : ne pas montrer, ne pas expliquer, ne pas défendre le produit. Si la personne est bloquée plus de deux
minutes, noter où, puis débloquer d'une phrase.

1. **Départ (2 min)** : « Voici un outil qui fabrique une charte graphique à partir d'un logo. Faites-le avec le vôtre. »
   Ouvrir la page d'accueil et se taire.
2. **Création (8 min)** : dépôt du logo, brief, arrivée au studio. Noter le fichier apporté (SVG, PNG, JPEG, PDF, `.ai`),
   les refus et les messages lus ou ignorés.
3. **Lecture (5 min)** : « Regardez ce que vous avez obtenu. » Noter ce qui est regardé en premier et ce qui fait réagir.
4. **Retouche (7 min)** : « Changez ce qui ne vous convient pas. » Noter si la personne passe par l'inspecteur,
   le copilote ou renonce.
5. **Sortie (5 min)** : « Récupérez ce dont vous avez besoin pour un imprimeur, puis pour un développeur. »
6. **Trois questions (3 min)** : À qui l'enverriez-vous, tel quel ? Qu'est-ce qui manque pour le faire ?
   Qu'avez-vous payé, ou que paieriez-vous, pour ce résultat ? Noter les phrases exactes, sans commenter.

Aux designers, ajouter : « Que feriez-vous de ce résultat dans votre travail pour un client ? »

## 4. Grille (une ligne par séance)

| Personne | Profil | Fichier apporté | Arrivé seul au studio (E1) | Minutes jusqu'à la charte | Premier blocage | Enverrait tel quel (E2) | Fichier réutilisé (E3) | Outil demandé (E5) | Prix cité | Phrase à retenir |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | |

## 5. Avant la première séance

- Lancer le worker avec une clé Gemini valide et vérifier une charte complète sur un logo de test.
- Avoir sous la main un logo en PNG de basse qualité et un SVG avec du texte non vectorisé : ce sont les deux cas
  que les gens apportent le plus souvent et qui échouent le plus.
- Enregistrer l'écran si la personne l'accepte ; sinon noter l'heure de chaque blocage.

## 6. Ce qu'on décide ensuite

- E1 ou E2 fausse : corriger le parcours avant toute nouvelle fonction.
- E5 vraie : plugin Figma. E5 fausse et E3 vraie pour l'imprimeur : PDF serveur d'abord.
- Prix cités : alimenter `docs/team/business-model.md`, qui ne contient aujourd'hui que des hypothèses.
