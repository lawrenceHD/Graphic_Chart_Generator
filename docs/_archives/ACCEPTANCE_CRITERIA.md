# Critères d'Acceptation, Matrice de Tests & Definition of Done (DoD)
## BrandForge Studio (Ultra Edition)

---

## 1. Définition du Terminé (Definition of Done - DoD)

Une fonctionnalité n'est considérée comme **terminée** et éligible pour la production que si elle valide l'ensemble des critères suivants :

```
[ ] 1. Code TypeScript 100% typé (zéro type 'any' implicite ou explicite).
[ ] 2. Schémas Zod implémentés pour toutes les entrées/sorties API et formulaires.
[ ] 3. Tests unitaires (Vitest) écrits et passants avec couverture > 85% sur la couche Domaine.
[ ] 4. Respect strict de la grille 8pt et des tokens OKLCH sans styles arbitraires non documentés.
[ ] 5. Score d'accessibilité WCAG 2.2 AA validé (zéro erreur Axe / Lighthouse Accessibility = 100).
[ ] 6. Temps de réponse de l'interface < 50ms et maintien de 60 FPS sur les animations Framer Motion.
[ ] 7. Fichiers téléversés assainis contre les failles XSS et XXE.
[ ] 8. Journal de progression (docs/PROGRESS_TRACKER.md) mis à jour avec le statut et la justification technique.
```

---

## 2. Critères d'Acceptation par Module Fonctionnel

### 2.1 Module 1 : Dropzone & Ingestion Multimodale
* **AC-1.1** : L'utilisateur peut glisser-déposer ou sélectionner un fichier SVG ou PNG.
* **AC-1.2** : Tout fichier non image ou dépassant 25 Mo est rejeté avec un message d'erreur explicite et bienveillant.
* **AC-1.3** : Si le fichier est un SVG, le parseur assainit l'arbre XML et supprime tout script ou balise suspecte sans altérer les tracés visibles.
* **AC-1.4** : Le champ de description accepte du texte libre et propose des suggestions dynamiques selon l'univers saisi.

### 2.2 Module 2 : Analyse Colorimétrique & Ratios WCAG
* **AC-2.1** : L'algorithme K-Means extrait au minimum la couleur dominante, la couleur d'accent et une couleur neutre.
* **AC-2.2** : Chaque couleur est calculée et affichée sous 4 formats : HEX, RVB, CMJN (profil FOGRA39) et référence Pantone approchante.
* **AC-2.3** : Le ratio de contraste entre le fond et le texte est calculé mathématiquement ; un badge vert WCAG AAA s'affiche si le ratio $\ge 7:1$, ou orange si $\ge 4.5:1$ (AA).

### 2.3 Module 3 : Système de Logo & Déclinaisons
* **AC-3.1** : Génération instantanée de 3 variantes vectorielles propres :
  * Monochrome Noir (`#000000`) sur fond transparent.
  * Monochrome Blanc (`#FFFFFF`) sur fond transparent.
  * Favicon carré centré avec marge de sécurité.
* **AC-3.2** : Calcul mathématique de la zone d'exclusion (*clear space*) basée sur un élément proportionnel du logo (hauteur ou symbole $X$).
* **AC-3.3** : Génération de 4 règles incontournables de « Do & Don'ts » avec aperçu visuel (interdiction de déformation, de rotation anormale, de changement de palette non autorisé).

### 2.4 Module 4 : Génération des Mockups 4K
* **AC-4.1** : Les scènes sélectionnées correspondent précisément à l'univers identifié (ex. flacon cosmétique pour la beauté, interface laptop pour le SaaS).
* **AC-4.2** : Le logo est projeté avec une déformation de perspective correcte sans pixelisation ni déformation du tracé vectoriel original.
* **AC-4.3** : L'effet de matière sélectionné (embossage, dorure ou sérigraphie) applique un masque de relief et d'ombrage cohérent avec la source lumineuse de la scène.
* **AC-4.4** : Possibilité de télécharger le rendu en résolution native **4K UHD (3840 x 2160 px)** en moins de 3 secondes.

### 2.5 Module 5 : Studio de Visualisation & Édition
* **AC-5.1** : Toute modification d'une nuance de couleur via le sélecteur répercute instantanément le changement sur tous les composants de l'interface et sur les aperçus de mockups.
* **AC-5.2** : Le sélecteur typographique permet de basculer parmi 5 couples de polices Google Fonts harmonieuses avec aperçu en temps réel.
* **AC-5.3** : La timeline de progression anime chaque étape avec un micro-texte d'état captivant.

### 2.6 Module 6 : Export PDF Vectoriel Haute Définition
* **AC-6.1** : Le PDF généré contient la totalité de la charte (Couverture, Manifeste, Logo & Variantes, Règles d'Exclusion, Palette & Normes Print, Typographie, Mockups).
* **AC-6.2** : Les textes et logos dans le PDF sont vectoriels (aucun flou lors d'un zoom à 800%).
* **AC-6.3** : La génération et le téléchargement du PDF s'effectuent sans blocage de l'interface utilisateur.

---

## 3. Matrice de Tests Automatisés

```
┌────────────────────────────────────────────────────────┐
│                   E2E TESTS (Playwright)               │
│  Parcours complet : Upload -> Analyse -> Custom -> PDF │
├────────────────────────────────────────────────────────┤
│             INTEGRATION TESTS (Testing Library)        │
│  Composants Studio, Formulaires, Dropzone, Shaders     │
├────────────────────────────────────────────────────────┤
│                 UNIT TESTS (Vitest)                    │
│  Calculs WCAG, K-Means, Conversions CMJN, Parsing SVG  │
└────────────────────────────────────────────────────────┘
```

* **Tests Unitaires (Vitest)** :
  * `contrast.test.ts` : Vérification des calculs de luminance relative et ratios WCAG.
  * `color-converter.test.ts` : Précision des conversions RVB vers CMJN et distance $\Delta E$.
  * `svg-sanitizer.test.ts` : Élimination certifiée des vecteurs d'attaque XSS (`<script>`, handlers JS).
* **Tests End-to-End (Playwright)** :
  * Upload d'un logo de test, validation du déclenchement des requêtes et de la bonne réception du Brand Book.
