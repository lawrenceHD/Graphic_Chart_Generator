# Prototype du studio (Charta)

Maquette navigable du produit, jetable :
- accueil ;
- démarrage ;
- espace de travail « façon Stitch » qui construit la charte en direct.

Elle valide la direction avant T-020 à T-022. Elle n'entre pas dans `pnpm verify` ; elle a ses propres contrôles.

## Lancer

```sh
pnpm build                 # à la racine : moteurs compilés (color-engine, logo-kit, svg-engine)
pnpm corpus:fetch          # à la racine : corpus privé (logos de démonstration)
cd prototypes/studio
npm install
npm run brands             # passe les logos du corpus dans les vrais moteurs → src/data/ (ignoré par git)
npm run dev                # http://localhost:5180, et l'adresse réseau pour le téléphone
```

## Ce qui est réel, ce qui est simulé

**Réel** :
- palettes, rôles, échelles, contrastes ;
- variantes noir et blanc, zone de protection, favicon, interdits.

Ils sont calculés par les moteurs du dépôt. Dans l'inspecteur, les contrastes sont recalculés par `color-engine` à chaque modification.

**Simulé** :
- le flux SSE : il rejoue exactement les événements de `GET /projects/:id/events` (T-019) sur une minuterie ;
- l'envoi du fichier ;
- le copilote : les puces exécutent des commandes locales ;
- les exports.

**Mockups** : vectoriels. Les scènes photographiques relèvent de T-025.

**Logos** : ce sont des marques déposées tirées du corpus privé. Ils ne sont jamais commités : `src/data/` est ignoré par git et par Prettier.

## Mockups photoréalistes (Nano Banana)

`npm run mockups` génère, pour chaque marque de démo, 7 photographies :
- cartes de visite, devanture, tote bag, t-shirt, application, affichage, signalétique ;
- réalisées avec Gemini à partir du **vrai logo** ;
- écrites dans `src/data/mockups/` (ignoré par git).

L'accueil les affiche automatiquement à la place des mockups vectoriels.

La clé se trouve dans `prototypes/studio/.env.local` (`GEMINI_API_KEY=…`, ignoré par git), et le script ne l'affiche jamais. Pour une reprise :
- `GEN_SCENES=cards,store` limite le passage à certaines scènes ;
- `GEN_MODEL=…` impose un modèle.

**Prérequis** : la facturation doit être activée sur le projet Google de la clé. En formule gratuite, le quota des modèles d'image est de 0 (`limit: 0`).

## Contrôles

`node scripts/gates.mjs` contrôle 3 écrans, en 320, 390 et 1440 px, avec et sans réduction des animations :
- axe (WCAG 2.2 AA) ;
- débordement horizontal ;
- cibles ≥ 24 px ;
- erreurs de page.

`node scripts/shots.mjs <url> <dossier>` fait les captures.
