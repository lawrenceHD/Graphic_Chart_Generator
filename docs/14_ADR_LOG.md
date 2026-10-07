# 14 — Journal des décisions d'architecture (ADR)

> Les ADR sont **immuables**. Pour changer une décision, on ajoute un nouvel ADR qui **remplace** le précédent (statut « Supersedé par ADR-0xx »).
> Date de toutes les décisions initiales : 2026-10-07. Statut : **Accepté** sauf mention.

---

## ADR-001 — TypeScript partout, monorepo, abandon de Spring Boot
**Contexte** : le corpus v3 décrivait deux backends (Spring Boot et Next.js/Node). Un seul développeur plus un agent de code ; les bibliothèques d'image, de vectorisation et de rendu de l'écosystème Node/WASM sont riches ; les contrats (Zod) se partagent entre client, serveur et worker.
**Décision** : monorepo pnpm + Turborepo, TypeScript strict, Next.js (web) et Node (worker). Spring Boot est abandonné et archivé.
**Conséquences** : un seul langage et des types partagés ; le code Java existant est perdu (≈ 2 jours de scaffolding) ; la sécurité d'entreprise repose sur la discipline du projet (`can()`, tests d'accès) plutôt que sur un framework.
**Alternatives rejetées** : Spring Boot + Next.js (double dérive de contrats, double outillage) ; Python pour le rendu (runtime supplémentaire sans besoin avéré).

## ADR-002 — Politique de versions
**Contexte** : Spring Boot 3.3 hors support depuis 2025, Next.js 15 en fin de support le 2026-10-21 ; les noms et quotas de modèles IA changent vite.
**Décision** : utiliser les **dernières versions stables** au moment de T-001, **épinglées exactement** dans le fichier de verrouillage ; Node.js LTS ; Next.js sur la branche active ; revue mensuelle des versions de support ; le modèle IA est **configuré** par variable d'environnement.
**Conséquences** : une revue mensuelle obligatoire ; les API de bibliothèque sont vérifiées dans la version installée (`AGENTS.md` §3).

## ADR-003 — PostgreSQL, Drizzle ORM, UUID v7
**Décision** : PostgreSQL ; Drizzle ORM + drizzle-kit (migrations versionnées) ; UUID v7 générés par l'application ; colonnes `jsonb` validées par Zod ; verrouillage optimiste par `seq`/`version`.
**Conséquences** : pas de synchronisation de schéma automatique en production ; migrations rétro-compatibles d'une version.
**Alternatives rejetées** : Supabase géré (pause d'inactivité, couplage) ; Prisma (poids, générateur) ; UUID v4 (mauvais pour les index et la pagination par curseur).

## ADR-004 — Hébergement : VPS + Docker Compose + Caddy
**Contexte** : le worker a besoin de processus longs, de mémoire et de Chromium ; le plan gratuit d'un hébergeur serverless est réservé à un usage non commercial et plafonne la taille des requêtes ; le « 0 € » de l'ancien corpus ne tient pas.
**Décision** : un VPS (4 vCPU / 8 Go de départ), Docker Compose, Caddy pour TLS et en-têtes, Cloudflare en DNS/proxy, `staging` et `prod` séparés.
**Conséquences** : coût mensuel réel assumé ; exploitation (mises à jour, sauvegardes) à notre charge, cadrée par `11_INFRA_COSTS.md`.
**Alternatives rejetées** : serverless pour tout (worker impossible) ; Kubernetes (surdimensionné).

## ADR-005 — File de tâches : pg-boss dans PostgreSQL
**Décision** : pg-boss ; pas de Redis. Jobs idempotents, 3 tentatives avec recul exponentiel.
**Conséquences** : une dépendance de moins ; débit limité (largement suffisant) ; migration vers un autre système possible derrière une interface.
**Alternatives rejetées** : BullMQ + Redis (interrogation continue, composant supplémentaire).

## ADR-006 — IA : API payante derrière un port, modèle configurable
**Décision** : le produit appelle l'**API Gemini payante** (clé dédiée, facturation activée) via `AiPort`. L'abonnement grand public sert au développement uniquement. Modèle dans `AI_MODEL`. Plafonds budgétaires obligatoires. Sorties structurées validées par Zod. Tests par enregistrement/rejeu.
**Conséquences** : coût variable mesuré ; conditions d'usage et de confidentialité du palier payant à relire avant la bêta ; fournisseur interchangeable.
**Alternatives rejetées** : palier gratuit (quotas instables, usage commercial et données potentiellement non conformes) ; modèle local (qualité inférieure).

## ADR-007 — Document unique + commandes typées (pas de JSON Patch libre)
**Décision** : un projet = un document JSONB ; toute modification = une **commande** typée (Zod) appliquée par une fonction pure retournant `{doc, inverse}` ; révisions numérotées ; annulation par application de l'inverse ; pages adressées par `id`.
**Conséquences** : liste blanche naturelle pour le copilote ; undo/redo simple ; conflits détectables (`baseSeq`) ; chaque nouvelle capacité d'édition exige une nouvelle commande.
**Alternatives rejetées** : JSON Patch RFC 6902 généré par l'IA (chemins fragiles, pas de liste blanche) ; tables de pages séparées (transactions multi-lignes, historique complexe).

## ADR-008 — Mockups : rendu navigateur (WebGL), scènes produites en 3D
**Décision** : le rendu est un module navigateur (`mockup-engine`) ; les scènes sont produites sous Blender (ou images sous licence maîtrisée) avec quadrilatère exporté par script ; trois scènes planes au MVP ; export 3840 × 2160 par rendu local, téléversé et indexé par hash.
**Conséquences** : pas de rendu 4K serveur au MVP ; variabilité de GPU à gérer (repli par tuiles) ; un rendu serveur par Chromium pourra réutiliser le même module (backlog).
**Alternatives rejetées** : Sharp seul (pas de transformation de perspective) ; génération d'images par IA (déformation des logos et du texte) ; OpenCV côté serveur (poids et gain faible pour des plans).

## ADR-009 — PDF : Chromium dans le worker, livrable RVB « de référence »
**Décision** : le PDF est produit en imprimant dans Chromium la route interne `/print/[id]`, qui utilise les **mêmes composants** que l'éditeur. Livrable étiqueté **« PDF de référence (RVB) »** ; les valeurs CMJN sont présentées en texte. Le PDF/X avec profil de sortie est au backlog.
**Conséquences** : un seul rendu (pas de divergence éditeur/PDF) ; texte et SVG restent vectoriels ; Chromium consomme de la mémoire (concurrence limitée).
**Alternatives rejetées** : `@react-pdf/renderer` (deuxième moteur de mise en page, RVB seulement, SVG partiel) ; génération PDF côté serveur Java (abandonné avec ADR-001).

## ADR-010 — Authentification par cookies de session
**Décision** : sessions en base, cookie `HttpOnly; Secure; SameSite=Lax` ; **aucun jeton dans `localStorage`** ; SSE par `fetch` (pas `EventSource` avec en-tête) ; bibliothèque candidate Better Auth, **confirmée ou remplacée par le spike T-013** (alternative Auth.js). Mode invité par session signée distincte.
**Conséquences** : même domaine enregistrable pour l'application et l'API ; protection CSRF par `Origin`.
**Alternatives rejetées** : JWT Bearer dans le navigateur (exposé au XSS, incompatible avec `EventSource`).

## ADR-011 — SVG : liste blanche, reconstruction, refus des textes
**Décision** : assainissement par liste blanche d'éléments et d'attributs avec reconstruction de l'arbre ; `DOCTYPE` et entités refusés ; références uniquement locales ; `<text>` refusé au MVP (rendu non déterministe sans polices) avec message d'aide ; rasterisation dans un processus isolé.
**Conséquences** : certains logos légitimes sont refusés avec une explication ; la règle sera revue après les retours de la bêta.
**Alternatives rejetées** : liste noire (contournable) ; DOMPurify seul (ne couvre pas le XXE ni le rendu côté serveur).

## ADR-012 — Couleur : OKLab, histogramme, CMJN par ICC uniquement
**Décision** : extraction par histogramme exact + fusion par ΔE_OK (déterministe) ; OKLCH pour dériver, mapper le gamut et produire les échelles ; WCAG pour les contrastes ; CMJN **uniquement** par profil ICC (spike T-010), masqué si indisponible ; **Pantone hors MVP**.
**Conséquences** : pas de K-Means (non déterministe) ; libellés honnêtes (« indicatif ») ; vecteurs de référence externes.
**Alternatives rejetées** : K-Means en RVB ; formule RVB→CMJN naïve ; table Pantone sans licence.

## ADR-013 — Stockage : Cloudflare R2, envois par URL présignée
**Décision** : fichiers dans R2 (API S3) ; envoi direct du navigateur par URL présignée de courte durée ; statut de quarantaine jusqu'au scan ; rendus identifiés par hash.
**Conséquences** : les fichiers ne transitent pas par l'application (limite de taille des requêtes) ; politique de purge nécessaire pour les rendus anciens.

## ADR-014 — Sécurité applicative
**Décision** : CSP avec nonces (pas d'`unsafe-eval`/`unsafe-inline`), fonction `can()` unique pour toute autorisation, tests d'accès générés par table de routes, limites de débit par identité **et** par IP, `gitleaks` en CI.
**Conséquences** : un test de table de routes oblige à déclarer chaque route ; toute dérogation à la CSP exige un ADR.

## ADR-015 — Méthode : tickets, agent de code, relais, revue
**Décision** : le chef de projet écrit des tickets avec tests d'acceptation exécutables ; l'agent applique `AGENTS.md` ; le propriétaire relaie ; verdict du chef de projet obligatoire avant fusion ; suivi honnête en trois statuts (spécifié, implémenté, vérifié).
**Conséquences** : discipline de découpage (tickets S/M) ; une session d'agent par ticket.

---

## Décisions ouvertes

| # | Sujet | Échéance |
|---|---|---|
| O-1 | Nom du produit (`13_NAMING.md`) | Fin de P0 |
| O-2 | Bibliothèque CMJN (spike T-010) | Début de P1 |
| O-3 | Outil de vectorisation (spike T-011) | Début de P1 |
| O-4 | Bibliothèque d'authentification (spike T-013) | Début de P2 |
| O-5 | Modèle de tarification et fournisseur de paiement (dépend du pays d'établissement) | P5 |
| O-6 | Auto-hébergement d'un PaaS (Coolify/Dokploy) ou script de déploiement | Fin de P2 |
| O-7 | Thème clair | Après la bêta |
