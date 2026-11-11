# Point de reprise — 2026-11-11

> Tout ce qu'il faut pour relancer une session : état du dépôt, ce qui a été fait, analyse des dépôts
> `storytold`, et la suite. Détail des constats : `docs/team/audit/2026-11-11-analyse-et-nettoyage.md`.

## 1. État du dépôt

- Branche `comp/j3-studio`, 24 commits locaux depuis `b2a4e7f`, **rien n'est poussé**.
- `pnpm verify` vert : 1 295 tests, build, 0 violation de dépendances.
- Plus aucune copie de travail d'agent (`.claude/worktrees/` supprimé). Dossier projet : environ 2,5 Go.
- Non commités, laissés tels quels : `.gemini/settings.json` (modifié avant la session), `.claude/skills/impeccable/`.
- Une seule branche non fusionnée : `comp/pdf-manifest`, remplacée par ADR-033 (à supprimer).

### Lancer le produit
```sh
node tools/dev-storage/server.mjs                                   # stockage local, port 9000
. tools/dev-env.sh && cd apps/web && pnpm.cmd dev                   # web, port 3000
. tools/dev-env.sh && cd apps/worker && pnpm.cmd build && pnpm.cmd start   # worker
```
Ouvrir `http://localhost:3000` (pas `127.0.0.1` : la page ne s'hydrate pas en mode dev). PostgreSQL doit tourner.

## 2. Ce qui a été fait le 2026-11-11

**Réparations**
- L'analyse échouait pour tout logo (`RASTER_FAILED`) depuis le 9 novembre : les liens de `node_modules` passaient
  par une copie de travail d'agent. Copies supprimées, liens refaits (`pnpm install --frozen-lockfile`).
- `pnpm verify` était rouge : build (`robots.ts`, `sitemap.ts` lisaient `APP_URL` au build), test de durée du
  nettoyeur de manifeste, 19 fichiers non formatés, un test instable du nettoyeur SVG.

**Nettoyage**
- 11 copies de travail supprimées (8,2 Go), leur travail non commité sauvé en commits `wip`.
- 1 524 images de `corpus-reel/pinterest/` envoyées à la **Corbeille** (1,33 Go, récupérables) ; index et analyses gardés.
- Restes de prototypes et 14 branches locales déjà fusionnées supprimés.

**Produit**
- Mur de 48 logos de marques retiré de l'accueil. Les quatre marques d'exemple restent (votre décision), avec la
  mention « sans lien avec Charta » ; les textes qui les disaient « fictives » sont corrigés (FR et EN).
- Fusionnés : mockups modifiables (27 scènes, version du logo, finition et couleur par objet, annuler/rétablir,
  export PNG et ZIP), refonte des pages couverture, logo et zone d'exclusion, variantes des logos d'exemple.
- Revue du travail fusionné : trois défauts corrigés (sélection d'un objet au clic, export de la scène dirigée,
  Ctrl+Z dans un champ de texte).
- Titres de page dans la langue du projet ; recherche de références active (le worker trouve le corpus).
  Une charte de test : 18 pages de règles dont six de secteur, environ 75 s.

## 3. Avis sur le produit (résumé)

- **Amateurs, fondateurs, indépendants avec un logo : oui**, dès maintenant.
- **Designers professionnels : pas encore.** Le résultat reste enfermé dans le studio web et un PDF imprimé depuis
  le navigateur ; ni CMJN ni PDF imprimeur ; rien à reprendre dans Figma, Illustrator ou InDesign.
- **Aucune demande démontrée** : aucun entretien, aucun prix validé, aucun utilisateur extérieur.
- **La méthode pèse trop** : douze rôles, quatre systèmes de reprise, onze copies de travail ont cassé le parcours
  principal sans que personne ne le voie.

## 4. Ce qui reste ouvert

| Sujet | État | Qui décide |
|---|---|---|
| `comp/pdf-manifest` (lire le texte d'un PDF déposé) | Remplacée : le brief PDF est lu par `vectorcraft-cli` (ADR-033) | Branche à supprimer |
| SVG avec texte non vectorisé, logos `.ai` / `.eps` / `.pdf` | Refusés ou convertis en image | Voir §5, essai `vectorcraft-cli` |
| Navigation entre les pages d'une charte de 30 pages | Absente | À construire |
| Deux défauts mineurs des mockups | Liste d'objets parfois en retard ; numéros décalés si un masque ne charge pas | À corriger |
| Marques d'exemple réelles | Gardées avec mention | À remplacer avant un lancement commercial |
| `gemini key.txt` à la racine | En clair, jamais commité | À déplacer dans un gestionnaire de mots de passe |
| PDF serveur | Non commencé, demande un navigateur côté worker (dépendance) | Après les essais |
| Plugin Figma | Non commencé | Après les essais (hypothèse E5 du protocole) |

## 5. Dépôts du compte GitHub `storytold` (analyse du 2026-11-11)

Lu : la liste des 80 dépôts, les README de `vectorcraft`, `craft-libs`, `figcraft`, `designcraft`, `pdfcraft`,
`indd-utils`, `craft-fonts`, et le code de la commande `vectorcraft-cli`. **Rien n'a été téléchargé ni exécuté.**

**Ce que c'est** : l'équipe ArtCraft, une suite d'une quinzaine d'applications de bureau en Rust qui refont
Photoshop, Illustrator, InDesign, Figma, Acrobat, etc. Licence Apache-2.0 ou MIT, dépôts mis à jour le jour même.
Toutes se déclarent en alpha ou pré-alpha. Charta est en TypeScript : on ne peut pas importer ce code, seulement
appeler leurs outils en ligne de commande depuis le worker. Leur nom et leurs logos sont des marques déposées.

| Dépôt | Ce qu'il apporterait à Charta | Verdict |
|---|---|---|
| `vectorcraft` (le « clone d'Illustrator ») | `vectorcraft-cli convert IN OUT --outline-text` : lit `.ai`, EPS, PDF, SVG, Affinity ; écrit SVG, PDF, `.ai`, EPS, texte converti en tracés | **À tester maintenant** |
| `craft-libs`, crate `craft-cms` | Couleurs ICC et conversion CMJN, absente de la charte | Plus tard : compilation à part ; profil CMJN synthétique, donc valeurs indicatives |
| `designcraft` | Export IDML (InDesign) et PDF/X-4 | Trop tôt : pré-alpha |
| `figcraft` | Ouvre les `.fig` « au mieux », ne les écrit pas | Ne remplace pas le plugin Figma |
| `pdfcraft` | Lecture et édition de PDF | Inutile pour le PDF serveur : nos pages sont du HTML |
| `craft-fonts` | Polices libres avec licences | Marginal, catalogue déjà présent |

Le reste (voix, Unreal, capture de mouvement, outils internes) ne concerne pas Charta.

**Pourquoi `vectorcraft-cli` compte** : il couvrirait trois manques d'un coup.
1. SVG avec texte non vectorisé (aujourd'hui : conversion en image en un clic).
2. Logos en `.ai`, `.eps`, `.pdf`, aujourd'hui refusés, alors que c'est ce qu'un designer ou un imprimeur envoie.
3. Kit logo en `.ai`, EPS et PDF, en plus du SVG et du PNG.

**Réserves**
- Ils s'estiment à environ 65 % prêts pour un vrai travail et citent « l'échange fiable de fichiers `.ai` » parmi
  ce qui manque.
- La conversion du texte en tracés ne marche que si la police est sur le serveur ; sinon le repli actuel reste nécessaire.
- Archive Linux de 154 Mo ; pas d'archive séparée de la commande, sauf pour macOS.

**Essai fait le 2026-11-11 avec votre accord** : concluant, voir `docs/proposals/P-004_ESSAI_VECTORCRAFT.md`
(somme et signature vérifiées, six conversions fidèles, sorties acceptées par l'import de Charta ; une police
absente est refusée côté Charta). Branché le 2026-11-11 : ADR-033.

Protocole suivi :
1. Télécharger `vectorcraft-0.23.0-windows-x64-portable.zip` (159 Mo, version du 2026-11-09) dans un dossier isolé,
   vérifier `SHA256SUMS.txt`.
2. Convertir cinq vrais fichiers : le SVG de La Mèza avec son texte vivant, un `.ai`, un EPS, un PDF, un SVG propre.
3. Comparer chaque résultat à l'original (rendu, tracés, couleurs).
4. Si c'est bon : ADR pour la dépendance, puis une étape du worker dans un processus isolé, comme le rasteriseur.

## 6. Ordre de la suite

1. Fait le 2026-11-11 : `vectorcraft-cli` branché (ADR-033), `comp/pdf-manifest` remplacée.
2. **Sept essais réels** : cinq indépendants, deux designers, chacun avec son logo. Protocole et grille :
   `docs/proposals/P-003_ESSAIS_PRODUIT.md`. C'est à vous de les mener.
3. Selon les essais : plugin Figma (si les designers demandent la reprise dans leur outil) ou PDF serveur.
4. Réduire la méthode à un seul fichier de reprise.

## 7. Pour relancer

Dire à la prochaine session : « lis `POINT-DE-REPRISE.md` et continue », en précisant votre réponse au point 1 du §6.
