# Spécifications du Moteur de Studio Interactif (Workspace, Chat & Live Canvas)
## BrandForge Studio (Ultra Edition)

---

## 1. Vision du Studio Interactif : L'OS Créatif de Marque

Le concept passe d'un générateur linéaire statique à un **Studio de Co-Création Vivant** combinant :
1. **Un Espace Multi-Projets** (Dashboard organisationnel avec persistance et versions).
2. **Un Copilote IA Conversationnel Spécialisé** (Chat contextuel avec ingestion de documents PDF/DOCX/Images).
3. **Un Canvas / Document Interactif en Direct** (Visualisation page par page avec modifications granulaires ciblées ou globales via prompts).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                BRANDFORGE STUDIO WORKSPACE                                  │
├───────────────────────────────────┬─────────────────────────────────────────────────────────┤
│    COPILOTE DE MARQUE (VOLET GAUCHE)│           LIVE BRAND CANVAS (VOLET DROIT)               │
│                                   │                                                         │
│  [Projet : Lumina Cosmetics v2]   │  [Page 1: Cover]  [Page 2: Manifesto]  [Page 3: Logo]   │
│                                   │  ┌───────────────────────────────────────────────────┐  │
│  💬 Chat & Ingestion de Briefs    │  │                                                   │  │
│  - "Modifie la page 4 pour y      │  │                 PAGE 4 : MOCKUP PACKAGING          │  │
│     intégrer un mockup de flacon  │  │                                                   │  │
│     en verre dépoli avec dorure"  │  │   [Rendu 4K Photoréaliste avec Shaders Actifs]   │  │
│                                   │  │                                                   │  │
│  📎 Documents joints (Brief.pdf)  │  └───────────────────────────────────────────────────┘  │
│                                   │  ✨ Prompt Ciblé Page 4 : [Écrire une consigne...]      │
│  🔘 Portée : [Page 4] | [Global]  │                                                         │
└───────────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 2. Architecture Haute Performance : Résolution des Angles Morts

### 2.1 Angle Mort n°1 : L'Arbre de Document (AST) & Patchs Granulaires (JSON Patch RFC 6902)
* **Problème** : Si l'utilisateur demande en prompt *"Rends le slogan de la page 2 plus percutant"*, régénérer tout le document réinjecterait 15 secondes de calcul, recalculerait les mockups inutilement et coûterait cher en tokens.
* **Solution de Haute Performance** :
  * Le Brand Book est modélisé sous la forme d'un **Document AST (Abstract Syntax Tree)** où chaque page est un nœud autonome.
  * Le Copilote IA n'émet pas un document complet à chaque prompt, mais un **diff / patch JSON ciblé** (ex. `op: replace, path: /pages/1/manifesto/slogan, value: "..."`).
  * Seul le composant React de la page concernée se re-rend (`React.memo` + sélecteurs Zustand ciblés).

### 2.2 Angle Mort n°2 : Héritage des Tokens de Marque (Global vs Local)
* **Règle de propagation** :
  * **Prompt Global** (ex. : *"Bascule la couleur d'accent vers un bleu cobalt électrique"* ) : Met à jour la racine du système de marque (`brand.tokens.accent`). Toutes les pages consommant ce token s'actualisent instantanément en cascade.
  * **Prompt Local** (ex. : *"Sur cette page de papeterie, utilise un fond anthracite plutôt que blanc"* ) : Crée un `override` local confiné à cette page spécifique sans polluer les directives globales de la charte.

### 2.3 Angle Mort n°3 : Virtualisation du DOM & Économie GPU (60 FPS Constants)
* **Problème** : Un Brand Book complet comporte entre 10 et 25 pages avec des rendus graphiques 4K. Charger 25 pages en pleine définition dans le navigateur saturerait la mémoire graphique (VRAM) et ferait chuter le framerate.
* **Solution Technique** :
  * **Virtualisation de Canvas (Intersection Observer)** : Seules les pages visibles dans le viewport (ou à proximité immédiate $\pm 1$ page) chargent la texture haute résolution.
  * **Proxy Basse Résolution (LQIP)** : Les pages hors champ affichent un aperçu vectoriel ultra-léger ou un SVG basse fidélité généré instantanément.

### 2.4 Angle Mort n°4 : Ingestion de Documents & Contexte Long (RAG / File Context)
* **Problème** : L'utilisateur peut uploader un brief PDF de 40 pages, une étude de marché ou des guidelines existantes.
* **Solution Technique** :
  * Extraction et découpage du document côté serveur (parsing PDF/DOCX sans bloquer le thread principal).
  * Résumé structuré injecté dans la mémoire de travail du copilote pour guider la direction artistique sans saturer la fenêtre de contexte de l'IA.

### 2.5 Angle Mort n°5 : Système de Time-Machine (Undo / Redo & Branches)
* Chaque modification effectuée par un prompt (qu'elle soit locale ou globale) crée un point de restauration immuable (*snapshot*).
* L'utilisateur peut tester des idées les yeux fermés et revenir en arrière instantanément (`Ctrl+Z` ou sélecteur d'historique).

---

## 3. Schéma de Données : Structure d'un Projet & de ses Pages

```typescript
export interface BrandProject {
  id: string; // UUID v4
  title: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
  
  // Contexte et Briefing
  briefing: {
    userPrompt: string;
    uploadedFiles: Array<{ name: string; url: string; size: number }>;
    extractedSummary?: string;
  };

  // Système de Tokens Globaux
  tokens: {
    colors: BrandColorPalette;
    typography: BrandTypography;
    rules: BrandRules;
    logoAssets: LogoVariants;
  };

  // Pages du Document AST (Modifiables individuellement)
  pages: Array<BrandBookPage>;

  // Historique de Chat avec le Copilote
  chatHistory: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    targetPageId?: string; // Si le prompt ciblait une page précise
    timestamp: string;
  }>;
}

export interface BrandBookPage {
  id: string;
  index: number;
  type: 'COVER' | 'STORYTELLING' | 'LOGO_SYSTEM' | 'CLEAR_SPACE' | 'COLORS' | 'TYPOGRAPHY' | 'MOCKUP_HERO' | 'DO_AND_DONTS';
  title: string;
  layout: 'split' | 'grid' | 'full_bleed' | 'minimal';
  data: Record<string, unknown>; // Données spécifiques au type de page
  localOverrides?: Record<string, unknown>; // Surcharges locales de design
  isRegenerating?: boolean;
}
```

---

## 4. Protocole de Communication Temps Réel (Streaming Bidirectionnel)

Quand l'utilisateur écrit un prompt :
1. **Émission** : Le client envoie l'instruction avec le `targetScope` (`global` ou `pageId: "page-4"`).
2. **Streaming du Texte** : Le copilote commence à répondre dans le chat pour expliquer sa démarche créative (*"J'ai retravaillé la composition de la page 4 en appliquant une dorure à chaud sur le packaging..."*).
3. **Streaming d'Événement (SSE Patch)** : En parallèle, un flux d'événements met à jour l'AST de la page en direct sur le canvas.
4. **Transition Visuelle** : La page 4 applique un fondu croisé à 60 FPS sans aucun clignotement ni rafraîchissement des autres pages.
