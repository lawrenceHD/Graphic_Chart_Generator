# Architecture de Scalabilité, Performance & Gestion des Ressources
## BrandForge Studio (Ultra Edition)

---

## 1. Objectifs de Performance & Budgets (Core Web Vitals)

Pour garantir une expérience digne des applications SaaS les plus véloces :

| Métrique | Seuil Cible | Stratégie d'Optimisation |
| :--- | :--- | :--- |
| **LCP (Largest Contentful Paint)** | $< 1.2\text{ s}$ | Assets d'interface pré-rendus, polices hébergées localement avec `next/font`, images WebP/AVIF. |
| **INP (Interaction to Next Paint)** | $< 50\text{ ms}$ | Traitement asynchrone hors du thread principal, composants clients légers (`use client` repoussé aux feuilles). |
| **CLS (Cumulative Layout Shift)** | $= 0.00$ | Réservation stricte d'espace via des boîtes `aspect-ratio` et des conteneurs squelettes aux cotes exactes. |
| **TTFB (Time to First Byte)** | $< 150\text{ ms}$ | Rendu Edge / Node.js avec mise en cache Cloudflare sur les routes publiques. |

---

## 2. Découplage Synchrone / Asynchrone : Architecture BullMQ & Workers

La génération d'une charte complète comporte deux types d'opérations :
1. **Opérations Lentes / Légères en calcul** (Analyse IA multimodale, extraction K-Means, règles typographiques) : Exécutées en **temps réel avec streaming**.
2. **Opérations Lourdes en mémoire et CPU** (Composition 4K haute résolution, ombrage volumétrique, shaders de matière, compilation de vidéos 3D) : Exécutées via **file d'attente asynchrone**.

```
                ┌──────────────────────────────────────┐
                │        Client Web (Next.js)          │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼ POST /api/generate
                ┌──────────────────────────────────────┐
                │          API Route Handler           │
                │    1. Analyse IA & Streaming JSON    │
                │    2. Mise en file job lourd         │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼ Enqueue Job
                ┌──────────────────────────────────────┐
                │          Redis Queue (BullMQ)        │
                └──────────────────┬───────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
       ┌───────────────────────┐       ┌───────────────────────┐
       │   Worker Graphique 1  │       │   Worker Graphique 2  │
       │   Sharp 4K Rendering  │       │   Three.js Turnaround │
       └───────────┬───────────┘       └───────────┬───────────┘
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼ Upload Asset
                       ┌───────────────────────┐
                       │  Cloudflare R2 Bucket │
                       └───────────────────────┘
```

### 2.1 Avantages de l'Architecture par Workers
* Le serveur web Next.js ne subit **aucun pic de CPU ou de saturation de RAM** lors des exports 4K simultanés.
* Tolérance aux pannes : en cas d'erreur sur un fichier particulièrement complexe, le job est relancé automatiquement (stratégie exponentielle *backoff*).
* Scalabilité horizontale : ajout instantané de workers de rendu en fonction de la charge utilisateur.

---

## 3. Streaming des Réponses & Feedback Utilisateur en Direct

* Utilisation de l'API **Server-Sent Events (SSE)** ou des **ReadableStreams** natifs de l'App Router.
* Dès que l'IA produit une section de la charte (ex. la palette ou le manifeste), elle est envoyée au client par tronçons (*chunks*).
* Le studio affiche les données au fur et à mesure sans forcer l'utilisateur à attendre la totalité du traitement.

---

## 4. Stratégie de Caching & Gestion des Assets 4K

1. **Format des Livrables** :
   * Prévisualisation Studio : images WebP compressées (72 DPI, 1200px) pour une fluidité absolue à 60 FPS.
   * Téléchargement & Export Print : fichiers pleine définition PNG / TIFF (300 DPI, 4K UHD).
2. **CDN & Cache Headers** :
   * Les mockups et assets générés possèdent un hash de contenu immuable (`/mockups/:brandId/:hash.png`).
   * En-tête de cache : `Cache-Control: public, max-age=31536000, immutable`.
3. **Optimisation Mémoire Côté Serveur (Sharp)** :
   * Activation du streaming direct sans mise en mémoire tampon de buffers non nécessaires (`sharp.cache(false)` sur les traitements ponctuels très volumineux pour libérer l'espace immédiatement).

---

## 5. Gestion de la Base de Données & Requêtage

* **Pooling de Connexions** : Utilisation d'un gestionnaire de pool (ex. PgBouncer) pour limiter la consommation de connexions sur PostgreSQL.
* **Indexation Rigoureuse** :
  * Index B-Tree sur `brand_identity.owner_id` et `brand_identity.created_at`.
  * Index GIN sur les colonnes JSONB pour permettre des recherches ultra-rapides sur les tags d'univers ou les codes couleurs.
* **Pagination au Curseur** : Pour la liste des projets récents, utilisation exclusive de la pagination par curseur (`WHERE id > :last_id LIMIT 20`) plutôt que `OFFSET / LIMIT` qui dégrade les performances sur les grands volumes.
