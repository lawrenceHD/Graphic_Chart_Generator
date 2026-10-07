# Politique de Sécurité, Durcissement (Hardening) & Conformité RGPD
## BrandForge Studio (Ultra Edition)

---

## 1. Modèle de Menaces & Défense en Profondeur (OWASP 2025/2026)

La manipulation de fichiers vectoriels (SVG), d'images haute résolution et de briefs d'entreprises impose une sécurité de niveau bancaire. Aucune faille ne doit permettre d'exécuter du code arbitraire ou d'accéder aux données d'un autre utilisateur.

```
                      ┌─────────────────────────────────────────┐
                      │   Cloudflare Turnstile (Anti-Bot/DDoS)  │
                      └────────────────────┬────────────────────┘
                                           │
                      ┌────────────────────▼────────────────────┐
                      │  Rate Limiting (Redis Sliding Window)   │
                      └────────────────────┬────────────────────┘
                                           │
                      ┌────────────────────▼────────────────────┐
                      │  Sanitisation Stricte SVG & Magic Bytes │
                      └────────────────────┬────────────────────┘
                                           │
                      ┌────────────────────▼────────────────────┐
                      │  Isolation Tenancy / RLS (Anti-IDOR)    │
                      └────────────────────┬────────────────────┘
                                           │
                      ┌────────────────────▼────────────────────┐
                      │  Stockage Chiffré AES-256 (Cloud R2)    │
                      └─────────────────────────────────────────┘
```

---

## 2. Sécurisation Critique des Uploads de Fichiers

### 2.1 Le Danger Spécifique des Fichiers SVG (XSS & XXE)
Le format SVG étant un dialecte XML, il est susceptible d'héberger du code JavaScript malveillant (`<script>`, balises `onload=...`) ou des entités externes (XXE / SSRF).

**Mesures de Protection Obligatoires** :
1. **Assainissement Côté Serveur** : Tout SVG téléversé passe obligatoirement par un analyseur XML strict (`DOMPurify` avec profil SVG strict ou `sanitize-svg`).
   * Suppression de toutes les balises `<script>`, `<iframe>`, `<object>`, `<embed>`, `<foreignObject>`.
   * Suppression de tous les gestionnaires d'événements (`onclick`, `onload`, `onerror`, etc.).
   * Interdiction absolue des entités externes DTD (`<!ENTITY ...>`).
2. **Vérification par Signature Binaire (Magic Bytes)** :
   * Ne jamais se fier à l'extension du fichier ou au header `Content-Type`.
   * Inspection des premiers octets du flux (`file-type` pour vérifier la signature PNG `89 50 4E 47`, JPEG `FF D8 FF`, SVG `<?xml` ou `<svg`).
3. **Quotas Stricts** :
   * Taille maximale de fichier autorisée : **25 Mo**.
   * Dimensions maximales d'image raster : $8192 \times 8192 \text{ px}$ (protection contre les *Decompression Bombs* ou *Pixel Flooding*).

---

## 3. Prévention des Injections & Insecure Direct Object References (IDOR)

### 3.1 Protection Anti-IDOR & Isolation des Projets
* Chaque projet de charte graphique est identifié par un **UUID v4 cryptographiquement sécurisé**.
* Toute requête d'accès ou de modification (`GET /api/brands/:id`, `PATCH /api/brands/:id`) applique une vérification stricte de possession :
  * Si l'utilisateur est authentifié : vérification de l'ID propriétaire en base.
  * Si session invitée : jeton de session éphémère signé par HMAC-SHA256 stocké dans un cookie `HttpOnly`.

### 3.2 Requêtes Base de Données 100% Paramétrées
* Utilisation exclusive de **Drizzle ORM** avec requêtes préparées.
* Zéro concaténation de chaînes SQL.

---

## 4. Limitation de Débit (Rate Limiting) & Anti-Abus

Pour prévenir le déni de service et la surconsommation des APIs d'IA (Gemini) et de traitement graphique :

| Route / Action | Limite Autorisée | Algorithme & Stockage |
| :--- | :--- | :--- |
| **Génération de Charte (IA + 4K)** | 5 requêtes / minute par IP | Fenêtre glissante (*Sliding Window*) Redis |
| **Upload d'Assets** | 15 uploads / minute par IP | Fenêtre glissante Redis |
| **Consultation Publique (Brand Portal)** | 60 requêtes / minute par IP | Token Bucket Redis |
| **Formulaire Public Sans Compte** | Protégé par Cloudflare Turnstile | Validation de captcha invisible |

---

## 5. En-têtes HTTP de Sécurité (Security Headers)

Appliqués au niveau du middleware Next.js pour toutes les réponses HTTP :

```typescript
export const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://generativelanguage.googleapis.com; frame-src https://challenges.cloudflare.com; object-src 'none';"
  }
];
```

---

## 6. Confidentialité des Données & Conformité RGPD

1. **Propriété Intellectuelle** : L'utilisateur conserve 100 % des droits patrimoniaux et moraux sur son logo, sa charte et les mockups générés.
2. **Non-Réutilisation IA** : Les données téléversées et prompts ne sont en aucun cas envoyés pour réentraîner des modèles publics tiers.
3. **Cycle de Rétention des Fichiers Temporaires** :
   * Les fichiers sources temporaires des sessions non enregistrées sont purgés automatiquement après **24 heures**.
   * Les utilisateurs inscrits peuvent supprimer définitivement l'ensemble de leurs projets et assets en un clic (*Droit à l'oubli*).
