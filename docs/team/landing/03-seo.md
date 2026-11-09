# 03 · SEO de la landing et des pages publiques

Rôle : seo-specialist. Date : 2026-11-09. Sources : `apps/web/PRODUCT.md`, `src/app/*`, `src/i18n/request.ts`, `02-marketing-copy.md`.

## 1. Constat technique (vérifié dans le code)

- **La locale est un cookie** (`NEXT_LOCALE`, puis `Accept-Language`, puis `fr`), **pas un segment d'URL** (`i18n/request.ts`). Une URL = une page, deux langues selon le visiteur.
- Conséquence : **pas de hreflang réel possible** (deux alternatives à la même URL sont invalides). On émet un **canonical absolu auto-référent** + `og:locale` / `og:locale:alternate`. Googlebot n'envoie pas de cookie : il indexe la version **française** (défaut). **L'anglais n'est pas indexable aujourd'hui** ; assumé (marché FR d'abord, `PRODUCT.md`).
- Si l'EN devient un objectif : segment `/en/...` + `alternates.languages` + `x-default`. Décision propriétaire, hors périmètre.
- Le layout appelle `await connection()` : rendu par requête (nonce CSP, ADR-024), donc pas de HTML mis en cache CDN : le TTFB compte (§7).
- `APP_URL` existe déjà dans `@app/contracts` (env validé Zod) : base des URLs absolues.
- Polices auto-hébergées (`@fontsource-variable`), 17 familles importées globalement par `styles/fonts.css`.

## 2. Intentions de recherche

| Intention | FR | EN | Page |
|---|---|---|---|
| Informationnelle | « qu'est-ce qu'une charte graphique », « exemple de charte graphique » | « brand guidelines examples », « brand style guide » | blog futur, hors scope |
| Transactionnelle principale | « générateur de charte graphique », « créer une charte graphique à partir de mon logo » | « brand guidelines generator », « brand guidelines from logo » | `/` |
| Secondaire | « charte graphique PDF », « palette de couleurs depuis un logo », « logo noir et blanc » | « logo color palette extractor », « brand guidelines PDF » | `/` |
| Mises en situation | « mockups de marque », « mise en situation de logo » | « brand mockups », « logo mockup generator » | `/` (section mockups) |
| Prix | « prix charte graphique », « charte graphique gratuite » | « free brand guidelines generator » | `/tarifs` |

Un mot-clé principal par page, variantes naturelles dans h2 et paragraphes, zéro bourrage. Pas de « n°1 », « meilleur », ni chiffre non étiqueté démonstration.

## 3. Plan Hn de la landing (`/`)

Un seul `h1`. Aligné sur l'ordre narratif de `02-marketing-copy.md` (§3 et §5) ; le copy final de ce fichier prime sur les libellés ci-dessous.

- `h1` : hero, « Votre logo devient une charte complète. » (EN : « Your logo becomes a complete brand guideline. »). « charte graphique » et « logo » dans le lead.
- `h2` problème (5.1) : une phrase contenant « charte graphique ».
- `h2` démonstration / atelier (5.2) ; chaque marque d'exemple en `h3` seulement si c'est du texte réel, sinon `figcaption`.
- `h2` méthode (5.3) : « Trois gestes, une charte. » ; déposez / regardez / ajustez en `h3`.
- `h2` mises en situation (5.4) : contient « mises en situation » ou « mockups ».
- `h2` ce que vous emportez (5.5) : PDF, fichiers logo, tokens CSS / Tailwind / Figma.
- `h2` tarifs (5.6) si présent sur la landing ; `h2` FAQ (§6 du brief) avec chaque question en `h3`.
- `h2` CTA final : « Déposez votre logo. »
- Pas de `h4+`. Un texte purement décoratif (grands chiffres, mots d'ambiance) n'est pas un Hn : `<p aria-hidden>`.

## 4. Métadonnées par page

Title <= 60 caractères, description <= 155. « Charta » = nom produit (O-1 ouverte : le lire depuis `common.appName`).

**`/` (indexable)**
- FR title : `Charta · Une charte graphique complète à partir de votre logo` (existant, 61 car.)
- FR desc : `Déposez votre logo : Charta mesure les couleurs, vérifie les contrastes et compose la charte graphique, les mises en situation et les fichiers.`
- EN title : `Charta · Brand guidelines generated from your logo`
- EN desc : `Drop your logo: Charta measures its colors, checks every contrast and builds the brand guideline, the mockups and the files.`

**`/tarifs` (indexable)**
- FR : `Tarifs · Charta` ; `Commencez gratuitement avec trois projets. Les plans payants arrivent après la bêta ; prix indicatifs, aucun paiement possible pour l'instant.`
- EN : `Pricing · Charta` ; `Start free with three projects. Paid plans arrive after the beta; indicative prices, no payment is possible yet.`

**`/connexion`, `/inscription` : noindex, hors sitemap**
- FR : `Connexion · Charta` / `Créer un compte · Charta` ; `Retrouvez vos chartes graphiques.` / `Créez un compte pour enregistrer vos chartes.`
- EN : `Sign in · Charta` / `Create an account · Charta` ; `Find your brand guidelines again.` / `Create an account to save your brand guidelines.`

**Open Graph / Twitter** : `og:type=website`, `og:url` = canonical, `og:site_name`, `og:locale` + alternate ; `twitter:card=summary_large_image` seulement si une image existe, sinon `summary` (le helper le gère).
**Image OG à produire** : 1200x630, vraie page de charte d'un exemple sur fond neutre, <= 200 Ko, `apps/web/public/og/home.png`. Absente aujourd'hui.

## 5. JSON-LD (honnête)

Un `<script type="application/ld+json">` avec le **nonce CSP** (voir `security-headers.ts` pour la façon de le lire), échappé par `JSON.stringify(x).replace(/</g, '\\u003c')`.
- `/` : `Organization` (`name`, `url` seulement ; pas de `logo`, `sameAs`, adresse tant que non fournis) et `SoftwareApplication` (`applicationCategory: "DesignApplication"`, `operatingSystem: "Web"`, `offers` à prix 0 uniquement si le plan gratuit reste réel).
- `/tarifs` : `FAQPage` seulement si la FAQ est affichée en clair, avec exactement le texte rendu. Gain faible, à faire en dernier.
- **Jamais** `aggregateRating`, `Review`, nombre d'utilisateurs, `Product` : aucun client réel (`PRODUCT.md`, engagements de marque).

## 6. Sitemap, robots, canonical

- `sitemap.xml` (livré) : `/` et `/tarifs`, sans `lastModified` (pas de source honnête de date).
- `robots.txt` (livré) : `Allow: /`, `Disallow: /api/ /studio/ /projets /start`, `Sitemap:` absolu depuis `APP_URL`. `/start` est le CTA principal mais sans contenu à indexer : les visiteurs suivent le lien normalement.
- Canonical toujours absolu, sans query. Les écrans auth portent `robots: noindex` dans leurs métadonnées ET sont absents du sitemap (ne pas les mettre en `Disallow`, sinon le noindex n'est pas lu).
- `proxy.ts` doit laisser passer `/robots.txt` et `/sitemap.xml` : à vérifier par `curl` en dev.

## 7. Budget Core Web Vitals (page très animée, beaucoup d'images)

Mesure : mobile milieu de gamme, 4G lente, build de prod. P75 : **LCP <= 2,5 s, CLS <= 0,05, INP <= 200 ms**, TBT labo <= 200 ms. Poids : JS + CSS critiques <= 170 Ko gz ; images au-dessus de la ligne de flottaison <= 250 Ko ; chargement initial total <= 800 Ko, le reste différé.

- **LCP** : élément LCP = le h1 (texte) ou une seule feuille du hero. Image : `next/image` `priority` + `fetchPriority="high"`, `sizes` exact, AVIF/WebP. Le h1 est présent et visible dans le HTML serveur (pas de `opacity:0` sans repli en attendant du JS).
- **Images** : `next/image` partout, dimensions réservées (`width`/`height` ou conteneur `aspect-ratio`), lazy hors hero, `decoding="async"`, `sizes` réalistes, `alt` descriptif réel (« Page palette de la charte de <marque> ») ou `alt=""` si décoratif. Mur de mockups : vignettes <= 60 Ko, plein format à la demande.
- **Lazy mount** (`lazy-mount.tsx`) : IntersectionObserver avec `rootMargin` ~ 300 px ; **réserver la place** (même hauteur avant et après montage) pour CLS 0. Les textes (h2, paragraphes, alt) restent dans le HTML serveur : un placeholder sémantique, jamais un vide. Aucun contenu clé monté seulement au scroll.
- **Polices** : sur `/`, seules Bricolage Grotesque et Geist sont nécessaires ; vérifier dans le réseau qu'aucune des 15 autres (pages de charte) n'est téléchargée. `preload` (woff2 latin) limité à ces deux. `font-display: swap` avec fallback à métriques ajustées (`size-adjust`) pour éviter le décalage.
- **CLS** : rien d'injecté au-dessus du contenu ; la nav flottante est `position: fixed` sans changer de hauteur dans le flux ; animations **uniquement `transform` / `opacity`** ; thème déjà rendu côté serveur.
- **INP** : listeners de scroll passifs ou CSS (`animation-timeline: view()` avec repli) ; tâches longues découpées ; WebGL / canvas initialisés en idle et seulement quand visibles.
- **Mouvement** : `prefers-reduced-motion` coupe les animations non essentielles.
- **TTFB** (rendu par requête) : HTML léger, `Suspense` pour streamer les sections basses ; alerter si TTFB prod > 600 ms.

## 8. Règles pour le constructeur

1. Un seul `h1`, pas de saut de niveau, Hn = texte réel.
2. Chaque page publique : `generateMetadata` via `buildPageMetadata` (`apps/web/src/lib/seo.ts`), plus de `title` seul.
3. Textes méta dans `messages/product.{fr,en}.json` (clés `metaDescription`), jamais en dur ; skill `i18n-sync`.
4. Aucun nom de marque d'exemple dans le code (`check-brand-names.ts`).
5. Chaque image : alt réel ou vide, dimensions réservées, `sizes`, lazy sauf LCP.
6. Contenu essentiel dans le HTML initial (testable : `curl /` contient le h1 et les h2).
7. Aucun chiffre, avis, logo client ou comparatif non démo ; chiffre de démonstration étiqueté.
8. Liens internes en vrais `<a href>` avec texte explicite.
9. Animations `transform` / `opacity`, `prefers-reduced-motion` respecté.
10. Avant livraison : Lighthouse mobile en prod, `curl /robots.txt /sitemap.xml`.

## 9. Snippet pour l'agent de la landing

```tsx
// apps/web/src/app/page.tsx
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('homePage');
  return buildPageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    path: '/',
    locale: await getLocale(), // typé string par next-intl : passer par resolveLocale si le typage l'exige
    siteOrigin: getRuntimeEnv().APP_URL,
    siteName: 'Charta',
  });
}
```
Auth : même appel avec `indexable: false`. Tarifs : `path: '/tarifs'`. Clés i18n à ajouter : `homePage.metaDescription`, `pricing.metaDescription`, `auth.loginDescription`, `auth.signupDescription`.

## 10. Livré / reste à faire

Livré : `src/lib/seo.ts` + test, `src/app/sitemap.ts`, `src/app/robots.ts`. Reste : branchement des `generateMetadata`, clés i18n, image OG, JSON-LD, mesure Lighthouse.
