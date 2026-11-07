# Showcase Flow — Prototype Complet Charta Studio

> Emplacement : `prototypes/showcase-flow`  
> Généré le 2026-11-03 à la demande du propriétaire.  
> Contexte : Mode compétition GDG Fest (présélection le 2026-11-09).

Ce dossier contient l'implémentation complète et autonome du parcours utilisateur de bout en bout de **Charta**, articulé autour des 8 inspirations visuelles sélectionnées et des spécifications du projet.

---

## 1. Comment lancer le prototype

Dans votre terminal (Git Bash ou PowerShell) :

```bash
# 1. Se placer dans le dossier du prototype
cd prototypes/showcase-flow

# 2. Lancer le serveur de développement Vite
npm run dev
```

Puis ouvrir dans votre navigateur :  
👉 **`http://localhost:5190`** (ou `npm run preview` pour tester le bundle de production sur le port 5195).

---

## 2. Parcours complet modélisé

1. **Page d'Accueil Animée (`Landing.tsx`)** :
   - Header en capsule fixe avec bascule de thème et liens d'accès direct.
   - Hero section avec dégradé expressif et mise en valeur des promesses déterministes.
   - **Atelier interactif dès le Hero** (inspiré des réf. Pinterest 02 & 03) : sélecteur de marques en direct (Instacart, Basecamp, GitLab, BlaBlaCar), extraction de palette immédiate, aperçu du code `tokens.json` et scène de mockup 4K.
   - Les 3 piliers fondateurs en cartes néo-brutalistes (Réf. 01).
   - Bannière CTA finale immersive.

2. **Passerelle d'Accès & Authentification (`Auth.tsx`)** :
   - Connexion OAuth 1-clic (Google, GitHub) + formulaire Email/Mot de passe.
   - **Mode Invité Sans Friction** : encart dédié permettant de tester l'outil immédiatement sans inscription préalable (suppression du mur de conversion).

3. **Tableau de Bord Utilisateur (`Dashboard.tsx`)** :
   - **Sidebar complète** : navigation (Mes Projets, Tokens de Design, Mockups 4K), sélecteur de thème, profil utilisateur et bouton de déconnexion.
   - **Le Gros Bouton « + NOUVEAU PROJET »** : proéminent dans la bannière hero principale et accessible en raccourci dans la sidebar.
   - Cartes de statistiques néo-brutalistes pastel (projets actifs, planches A4 générées, conformité WCAG 2.2 AA).
   - Grille des chartes récentes avec affichage des palettes actives à 4 nuances et bouton d'ouverture instantané dans le Studio.

4. **Wizard de Nouveau Projet (`NewProjectModal.tsx`)** :
   - Dépôt du logo en premier (drag & drop SVG / PNG).
   - Raccourcis pour tester avec des logos officiels réels.
   - Saisie du nom de marque et du secteur d'activité.
   - Lancement de la génération en direct.

5. **Le Studio sur Plans de Travail Illustrator (`Studio.tsx`)** :
   - **Barre supérieure façon Illustrator** : retour dashboard, sélecteur de marque, Undo/Redo, Zoom fluide (50% à 150%), bouton d'adaptation à l'écran, bascule A4 Paysage / Portrait, bouton d'exportation.
   - **Colonne gauche** : Pipeline SSE nodulaire avec liaisons (Réf. 05) + Chat Copilote Gemini avec suggestions rapides de modifications de marque.
   - **Toile Infinie centrale (Fond Blueprint Réf. 04)** : Les 6 plans de travail A4 disposés en rangées élégantes :
     - *Plan 1 : Couverture éditoriale de la charte*.
     - *Plan 2 : Système de Logo & Variantes* (Principal, Mono Noir, Mono Blanc, Zone d'exclusion).
     - *Plan 3 : Palette Chromatique & Matrice de Contrastes WCAG* (Réf. 01).
     - *Plan 4 : Typographie & Hiérarchie des Titres* (Display + Body specimen).
     - *Plan 5 : Piliers de Marque Canvas 6 Blocs* (Réf. 07 : Vision, Why, What, How, Mission, Values).
     - *Plan 6 : Scènes de Vie Photoréalistes* (Projection d'homographie 4K).
   - **Colonne droite** : Inspecteur contextuel synchronisé avec le plan actif (sélecteur de couleur et saisie Hex, typographies, sélecteur de scènes mockups).

6. **Fenêtre d'Exportation Multi-Formats (`ExportModal.tsx`)** :
   - Téléchargement du Livre de Marque PDF A4.
   - Archive Développeur `.zip` (`tokens.json`, CSS variables, Tailwind config, SVG assainis).
   - Planches & Mockups 4K haute définition.
   - Teaser vidéo de marque animé (Remotion).

---

## 3. Captures de vérification Playwright

Des captures d'écran de chaque étape ont été enregistrées dans :  
📁 `journal/research/captures-flow/`
- `01-landing.png`
- `02-auth.png`
- `03-dashboard.png`
- `04-new-project-modal.png`
- `05-studio.png`
- `06-export-modal.png`
