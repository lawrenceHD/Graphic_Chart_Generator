# Architecture Backend & Rôle Intégral du Système
## Option Spring Boot 3 (Java 21) vs Next.js Fullstack

---

## 1. Réponse Directe : Peut-on faire le Backend avec Spring ?

**OUI, et c'est un excellent choix d'architecture d'entreprise.**

Si vous venez de l'écosystème Java ou souhaitez une séparation stricte et industrielle entre le client et le serveur :
* **Frontend** : Next.js 15 (React 19, Tailwind CSS, Framer Motion) dédié à l'UI/UX, aux animations 60 FPS et au rendu interactif.
* **Backend** : **Spring Boot 3.x (Java 21 LTS)** dédié à la logique métier, la sécurité d'entreprise, les transactions de données et l'orchestration de l'IA.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND NEXT.JS 15 (REACT 19)                     │
│    UI Studio, Live Canvas, Drag & Drop, Animations Framer Motion        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                     Requêtes REST / SSE (Port 8080)
                     Tokens JWT (Authorization: Bearer)
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    BACKEND SPRING BOOT 3 (JAVA 21 LTS)                  │
│                                                                         │
│  [Spring Security 6]  ➜ Authentification, JWT, RBAC, Protection CSRF    │
│  [Spring Web / WebFlux] ➜ API REST & Streaming SSE (Chat Copilote)      │
│  [Spring Data JPA]    ➜ Persistance PostgreSQL, Transactions ACID       │
│  [Spring AI / REST]   ➜ Connexion sécurisée Gemini API / Ollama         │
│  [Moteur Graphique]   ➜ Validation SVG, K-Means, Shaders de Mockups     │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
        ┌───────────▼───────────┐         ┌───────────▼───────────┐
        │  PostgreSQL (Supabase)│         │ Cloudflare R2 / MinIO │
        │  Tables, Users, AST   │         │ Stockage Assets & 4K  │
        └───────────────────────┘         └───────────────────────┘
```

---

## 2. À Quoi Sert Entièrement le Backend ? (Ce qu'il va gérer)

Le backend est le **gardien de la sécurité, le chef d'orchestre de l'IA et l'usine de production graphique**. Le frontend n'est qu'un écran d'affichage ; c'est le backend qui effectue tout le travail critique :

### 2.1 Gestion des Utilisateurs & Sécurité (Le Gardien)
1. **Authentification & Inscription** :
   * Hachage cryptographique des mots de passe avec **Argon2id** ou **BCrypt**.
   * Émission et rotation de paires de jetons : `Access Token` (JWT courte durée, 15 min) et `Refresh Token` (en base, révocable).
   * Social Login (Google / GitHub OAuth2).
2. **Autorisations & Contrôle d'Accès (RBAC)** :
   * Vérification systématique : *"L'utilisateur connecté a-t-il le droit d'accéder ou de modifier ce projet ?"* (Protection absolue contre les failles IDOR).
   * Rôles : `ADMIN`, `CREATOR`, `CLIENT_VIEWER`.
3. **Protection contre les Attaques** :
   * Limitation de débit (Rate Limiting via seau de jetons / Bucket4j ou Redis) pour éviter qu'un script n'épuise vos quotas d'IA.
   * Assainissement anti-XSS et anti-injections SQL.

---

### 2.2 Orchestration de l'IA & Copilote en Streaming (Le Cerveau)
1. **Protection des Clés d'API** :
   * La clé d'API (Gemini, Claude, OpenAI) ne doit **JAMAIS** se trouver côté frontend dans le navigateur de l'utilisateur. Le backend agit comme un sas étanche.
2. **Traitement Multimodal & Prompt Engineering** :
   * Le backend reçoit l'image du logo et le texte du brief.
   * Il construit les prompts stricts avec schéma JSON attendu (Mission, Valeurs, Typographies idéales, Codes couleurs).
3. **Streaming Temps Réel (Server-Sent Events - SSE)** :
   * Quand l'utilisateur discute avec le copilote dans le chat, le backend ouvre un flux `SseEmitter` pour streamer la réponse mot par mot et pousser en parallèle les patchs de modification de page.

---

### 2.3 Persistance & Gestion du Cycle de Vie des Projets (La Mémoire)
1. **CRUD des Projets de Marque** :
   * Créer, dupliquer, modifier, archiver ou supprimer un projet.
2. **Stockage de l'Arbre de Document (AST)** :
   * Sauvegarde de la structure complète de la charte en format `JSONB` dans PostgreSQL (les pages, les tokens de couleurs, les polices).
3. **Time-Machine (Historique des Versions & Undo/Redo)** :
   * À chaque modification majeure ordonnée par prompt, le backend enregistre un *snapshot* immuable permettant de revenir en arrière à tout moment.
4. **Gestion des Documents de Brief** :
   * Extraction du texte brut depuis les PDF (`Apache PDFBox` en Java) ou les fichiers Word (.docx via `Apache POI`).

---

### 2.4 Pipeline Graphique & Rendu des Mockups (L'Usine)
1. **Assainissement des Fichiers SVG Téléversés** :
   * Analyse du code XML du logo avec validation stricte pour supprimer toute balise malveillante (`<script>`, balises d'événements).
2. **Calculs Colorimétriques Physiques** :
   * Algorithme d'extraction des couleurs dominantes (K-Means).
   * Calcul mathématique certifié des contrastes WCAG 2.2 AAA.
   * Conversion mathématique du profil sRGB vers **CMJN (ISO Coated)** et **Pantone Solid Coated**.
3. **Génération des Variantes de Logo** :
   * Rendu automatique des versions monochrome noir, monochrome blanc et favicon.
4. **File d'Attente pour Rendus 4K** :
   * Traitement en arrière-plan des scènes 4K haute résolution sans bloquer les requêtes utilisateur.

---

### 2.5 Moteur d'Exportation & Stockage Cloud (L'Éditeur)
1. **Compilation du Brand Book PDF** :
   * Assemblage vectoriel des pages de la charte en un PDF haute définition prêt pour l'impression (300 DPI) via des moteurs comme `OpenPDF` ou microservice d'export.
2. **Génération du Pack d'Assets (ZIP)** :
   * Création à la volée d'une archive compressée contenant tous les logos, favicons, règles et mockups.
3. **Génération d'URLs Présignées (Presigned URLs)** :
   * Envoi direct et sécurisé des fichiers lourds vers le stockage Cloud (Cloudflare R2 ou MinIO) sans saturer la bande passante du serveur d'application.

---

## 3. Architecture Technique Détaillée : Package Spring Boot 3

Si nous déployons le backend en **Spring Boot 3**, voici l'organisation modulaire des paquetages Java :

```
src/main/java/com/brandforge/
├── BrandforgeApplication.java          # Point d'entrée de l'application
│
├── config/                             # Configurations Spring
│   ├── SecurityConfig.java            # Spring Security 6, JWT Filter, CORS
│   ├── CorsConfig.java                # Autorisation des origines Frontend
│   └── AiClientConfig.java            # Configuration du client d'API IA
│
├── domain/                             # Entités & Cœur Métier (Pure Java)
│   ├── model/
│   │   ├── User.java                  # Entité Utilisateur
│   │   ├── Workspace.java             # Entité Espace de travail
│   │   ├── Project.java               # Entité Projet de charte
│   │   ├── BrandPage.java             # Entité Page du Brand Book
│   │   └── ColorToken.java            # Value Object couleur (HEX/RGB/CMYK)
│   └── enums/
│       ├── Role.java                  # ADMIN, USER
│       └── PageType.java              # COVER, MANIFESTO, COLORS, MOCKUP...
│
├── repository/                         # Accès Données (Spring Data JPA)
│   ├── UserRepository.java
│   ├── ProjectRepository.java
│   └── BrandPageRepository.java
│
├── service/                            # Logique Métier & Cas d'Utilisation
│   ├── AuthService.java               # Inscription, Login, Hash Argon2
│   ├── ProjectService.java            # CRUD Projets & Gestion de versions
│   ├── BrandAnalysisService.java      # Pipeline d'analyse Logo + K-Means
│   ├── AiCopilotService.java          # Dialogue IA & Streaming SSE
│   ├── ImageProcessingService.java    # Variantes de logo & Mockups
│   └── PdfExportService.java          # Compilation du Brand Book PDF
│
└── web/                                # Contrôleurs API REST & DTOs
    ├── AuthController.java            # /api/v1/auth (login, register)
    ├── ProjectController.java         # /api/v1/projects (CRUD)
    ├── StudioController.java          # /api/v1/studio/chat (SSE Streaming)
    ├── ExportController.java          # /api/v1/export (PDF, ZIP)
    └── dto/                           # Data Transfer Objects validés (@Valid)
        ├── AuthRequest.java
        ├── ProjectCreateRequest.java
        └── BrandPatchRequest.java
```

---

## 4. Comparatif Objectif : Spring Boot vs Next.js Fullstack

| Critère | Backend Spring Boot 3 (Java) | Backend Next.js Fullstack (Node/TS) |
| :--- | :--- | :--- |
| **Profil & Cible** | Standard d'or des architectures d'entreprise bancaires et industrielles. | Idéal pour startups modernes, vitesse de développement maximale. |
| **Sécurité & Rôles** | Inégalé avec **Spring Security 6** (filtres précis, RBAC granulaire). | Très bon avec **Better-Auth** ou Lucia, mais configuration manuelle. |
| **Partage de Code** | Deux langages distincts (Java côté back, TypeScript côté front). | Un seul langage partagé (**TypeScript**) de bout en bout (mêmes interfaces). |
| **Performance I/O** | Exceptionnelle avec les **Virtual Threads (Java 21)**. | Excellente grâce à l'Event Loop asynchrone de Node.js. |
| **Complexité de Déploiement** | Nécessite un conteneur Docker / VPS ou serveur Java (ex. Render, Railway, AWS). | Se déploie en 1 clic sur Vercel à 0 €. |
