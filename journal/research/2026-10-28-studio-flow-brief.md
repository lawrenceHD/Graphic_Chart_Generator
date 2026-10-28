# Parcours studio complet — dossier de reprise (2026-10-28)

> But : construire, dans `apps/web`, le parcours **Accueil → Démarrer → Studio (génération en direct) → édition →
> export**, au niveau de la maquette `prototypes/studio` et de l'inspiration du propriétaire, avec les skills de
> design installés. Ce document rassemble tout ce qu'il faut ; il ne contient pas de code.
> Contexte : mode compétition GDG Fest (présélection 2026-11-09), `journal/OWNER_DECISIONS.md`.

## 0. Reprendre chez soi (à coller dans une nouvelle session)

```
Lis HANDOFF.md puis journal/research/2026-10-28-studio-flow-brief.md. Mode compétition GDG Fest.
Construis le parcours studio décrit (§8, dans l'ordre), en utilisant le skill impeccable
(init, document, shape, puis build, critique, audit, polish) et le dossier d'inspiration
C:\Users\KURO\Documents\Projects\inspi studio. Vérifie chaque écran dans Chromium (Playwright est installé).
Réponds en français.
```

Lancer l'environnement (Git Bash, racine) : `pnpm dev:storage` · `. tools/dev-env.sh; cd apps/worker && pnpm start` ·
`. tools/dev-env.sh; cd apps/web && pnpm.cmd dev` (relancer une fois si l'avertissement de sécurité Next l'arrête) ·
`pnpm db:migrate` après un changement de schéma · maquette : `cd prototypes/studio && npm run dev` (port 5180).

Captures de référence : `journal/research/captures-2026-10-28/` (SETO, maquette accueil, Démarrer et studio
généré, app réelle J2).

## 1. Le parcours voulu (propriétaire)

1. **Accueil** : celle de la maquette (`prototypes/studio/src/screens/Landing.tsx`), validée par le propriétaire.
2. **Démarrer** : nom, logo, brief → projet (fait en J2, `/start`).
3. **Studio** sur le modèle de l'inspiration **SETO** : on passe les données, l'IA analyse et explique dans un
   **chat** ; **au centre, la génération en direct** des pages de la charte puis des mockups ; chaque page et chaque
   mockup **modifiable individuellement** ; pages **en paysage par défaut**, portrait possible par page.
4. Modifications par le chat (copilote) ou à la main (inspecteur), annulables.
5. Export (PDF ou planche) pour la démo.

## 2. Sources visuelles, par ordre d'autorité

| Source | Ce qu'on en garde |
|---|---|
| **Inspiration SETO** (`inspi studio/download.jpg`) | 3 colonnes : navigation fine à gauche, zone centrale aérée avec **saisie en bas** (Attach, Settings, Options, micro, envoi), historique à droite ; cartes d'action au repos ; fond clair laiteux, coins très arrondis, ombres douces, dégradé pêche discret. |
| **Maquette studio** (`prototypes/studio`, capture `proto-studio-done`) | Déjà la bonne topologie : barre haute (retour, marque, état « Charte prête », annuler/rétablir, partager, thème, Exporter) ; colonne gauche Analyse + Journal + suggestions + saisie « Demander une modification… » ; **toile pointillée** avec pages en cartes et zoom ; inspecteur droit Palette (couleurs dépliables, teinte, couleurs trouvées) + Typographie (4 couples). Pages en **portrait** : à passer en paysage. |
| **Critique impeccable du 2026-10-23** (`.impeccable/critique/…prototypes-studio.md`, 23/40) | À corriger en portant : studio sans `h1` ; 21 cibles < 44 px en mobile ; journal SSE brut à remplacer par des cartes d'étape lisibles ; toile sous-utilisée (grille sur 2 rangées) ; Démarrer doit mettre le logo en premier ; états d'erreur absents ; inspecteur non lié à la page choisie ; pas de saisie hex ; « Partager » inactif ; contraste couverture `#111` sur `#E24329` 3,50:1. |
| **`docs/09_DESIGN_SYSTEM.md`** | Principes : l'interface s'efface devant les couleurs de la marque ; **zones d'aperçu sur gris neutre (chroma 0)** ; une action principale par écran ; ≤ 3 surfaces en verre ; WCAG 2.2 AA ; composants clés (`PageCanvas` virtualisé, `PageInspector`, `CopilotPanel`, `HistoryMenu`, `ExportDialog`, `MockupStage`, `ColorPicker`, `TypographyPicker`). **Écarts à acter** : 09 dit « thème sombre par défaut » et « landing gelée » ; décisions du propriétaire : thèmes jour/nuit/système (2026-10-23) et landing de la maquette (2026-10-28). |
| **Tokens de `apps/web`** (`src/app/globals.css`) | Échelle typographique `xs…3xl` (12 → 48 px) : pas de 4xl/5xl ; `--color-*` remis à zéro : pas de `white`, n'utiliser que les tokens (`ink`, `ink-2`, `ink-3`, `surface`, `elevated`, `line`, `line-strong`, `accent`, `on-accent`, `success`, `warning`, `danger`). Les titres XXL de la landing demandent un token d'affichage à ajouter (DESIGN.md). |

## 3. Ce qui existe déjà (réutilisable tel quel)

- **Pages** : `/` (fondations T-020, à remplacer par la landing), `/start` (J2), `/studio/[id]` (dépôt + timeline).
- **API** (`docs/04_API_CONTRACTS.md`) : `POST /projects`, `POST /guest-sessions`, `GET /projects/:id` → **`{ project,
  document }`** (le document complet est lisible), `POST /projects/:id/commands` `{ baseSeq, command }` →
  `{ seq, document }`, `undo`, `redo`, `revisions/:seq/undo`, `GET revisions`, `GET /assets/:id/content` (logo
  assaini et variantes), `POST /analyze`, flux SSE `GET /events` (`asset.status`, `analysis.step`,
  `analysis.done { seq }`, `export.status`).
- **Commandes du document** (`packages/document/src/command-schema.ts`) : `SetColorToken`, `SetTypographyPairing`,
  `SetBrandField`, `SetPageField`, `SetPageOverride` / `ClearPageOverride` (`background`, `layout`),
  `SetLogoRules`, `ReorderPage`, `AddPage`, `RemovePage`, `SelectScene`. C'est exactement l'outillage de
  l'inspecteur et du copilote.
- **Document initial** (étape 4) : pages de `01 §4` dans l'ordre, ids `page-<type>`, couleurs, variantes
  (`color`, `mono-black`, `mono-white`), couple typographique, règles du logo ; manifeste et ton **vides** tant que
  Gemini n'est pas branché (`AI_NOT_CONFIGURED`).
- **Composants web** : `Button`, `StatusMessage`, `PreferencesBar` (thème, langue), `LogoDropzone`,
  `AnalysisTimeline`, `StartForm`, flux SSE `subscribeProjectEvents`, envoi `uploadLogo`, `startAnalysis`.
- **Moteurs** : `color-engine` (palettes, échelles, matrice de contraste), `logo-kit` (variantes, favicon, règles),
  `mockup-engine` (homographie, placement, schéma de scène). 7 scènes prêtes dans
  `../MCP-IMAGE-GENERATION/scenes_work/` (carte de visite, affiche, ordinateur, mur d'accueil, enseigne, t-shirt,
  tote bag) ; génération de nouvelles scènes automatisable (Cloudflare FLUX, gratuit) : **pas de Flow manuel**.
- **Gemini** : clé dans `.env.local` (`AI_API_KEY`), texte OK (`gemini-3-flash-preview` ; `gemini-3.8-flash`
  recommandé par Google) ; images **sans quota** sans facturation.

## 4. Inventaire de la maquette à porter (fichier:ligne)

| Élément | Maquette | Verdict |
|---|---|---|
| Landing complète | `screens/Landing.tsx` (1 514 l.) : Nav 150, Hero 278, Fan 400, LogoWall 431, Metrics 493, Manifesto 521, FlowGraph 569, Journey 716, Hanging 898, Inside 1027, MockupShowcase 1150, Faq 1263, FinalCta 1319, Footer 1385 | Porter en sections ; corriger le P0 du hero masqué (`fx.tsx:141`) ; retirer le pied de page copié de Resend (`Landing.tsx:1458`) ; chiffres et logos de marques réelles = démonstration à étiqueter, aucune affirmation commerciale. |
| Barre haute studio | `screens/Studio.tsx:242` `TopBar`, `ProgressPill` 296 | Porter. |
| Analyse + journal | `Timeline` 364, `StepRow` 406, `EventLog` 471 | Timeline déjà portée (T-021) ; journal à réécrire en phrases (pas de JSON). |
| Chat / consigne | `Prompt` 533 (suggestions + saisie) | Devient le `CopilotPanel` : messages, explications de l'analyse, suggestions. |
| Toile | `Canvas` 657, `BoardSlot` 604 | `PageCanvas` : pages paysage 16:9, apparition en direct, zoom, sélection. |
| Pages | `boards/Boards.tsx` : Cover 108, Logo 149, Palette 197, Contrast 267, Type 342, Rules 406, Mockup 441 ; `Sheet` 43, `Skeleton` 93 | 7 rendus à porter et relier au **vrai document** ; **manquent** : manifeste, zone d'exclusion, ton de voix, annexe tokens. |
| Inspecteur | `Inspector` 891, `PaletteEditor` 747, `FontPicker` 858 | Porter, lier à la page choisie, ajouter la saisie hex, émettre des commandes. |
| Mockups | `mockups/Mockups.tsx` (cartes, icône, devanture, tote, t-shirt, papier à lettres, mobile, post) | Remplacer par `mockup-engine` + scènes photo (rendu calculé, logo intact). |
| Export | `components/ExportDialog.tsx` | Porter ; retirer les mentions internes (« T-028 et T-029 »). |
| Mobile | `MobileStudio` 922 | Après la démo (bureau d'abord pour le jury). |
| Effets | `components/fx.tsx` (Tilt, Counter, Magnetic, Reveal, SplitWords, Float), `Burst.tsx` | Dépendent de `motion` : voir §7. |

## 5. Ce qui manque, par écran

**Accueil** : portage de la landing ; token d'affichage XXL ; images de la section mockups produites par notre moteur.

**Démarrer** (fait) : à ajuster selon la critique → logo en premier ; style aligné sur la landing.

**Studio — génération en direct** :
- Données : lire `GET /projects/:id` au chargement et après `analysis.done` ; relire le document après chaque
  commande (`{ seq, document }`).
- **Apparition des pages pendant l'analyse** : aujourd'hui seul `analysis.done` porte le document. Proposition :
  squelettes par étape (étape 2 → palette et contrastes, 3 → manifeste, typographie, ton, 4 → toutes), puis
  remplissage au `done`. Mieux pour le jury : un événement `document.page` par page composée (contrat SSE à
  étendre, `docs/04` §5).
- **Format de page** : ajouter `format: 'landscape' | 'portrait'` aux `PageOverrides` (schéma `packages/document`,
  défaut paysage, commande `SetPageOverride` déjà générique) ; migration de schéma du document.
- Rendus des 11 types de page (§4) en 16:9, chacun avec ses états vide / chargement / rempli / erreur.
- Sélection d'une page → inspecteur de cette page ; édition → commande → nouvelle révision ; annuler/rétablir.
- Logo et variantes affichés depuis `/assets/:id/content` (sur gris neutre, 09 §1).

**Chat (copilote)** :
- J3 : analyse Gemini (`BrandAnalysis`, `docs/07` §3, sortie structurée Zod) → étape 3 remplit manifeste, valeurs,
  archétype, ton, couple typographique ; le chat affiche la `rationale` (« ta couleur sable n'est pas lisible sur
  blanc, je propose… »).
- J10 : `POST /projects/:id/copilot` (flux `message.delta`, `command.applied`, `confirm.required`, `error`,
  `done`) et `GET /chat` : **non implémentés** ; le copilote n'utilise que les commandes du document (07 §4.2).
- `packages/ai` est **vide** : adaptateur Gemini, `FakeAdapter` pour les tests, plafonds de coût (07 §2).

**Mockups** : catalogue de scènes (les 7 + générations Cloudflare), sélection par `SelectScene`, rendu
`mockup-engine` (homographie, ombre, multiplication) côté navigateur, recoloration des zones à la palette.

**Export** : planche PNG ou PDF de démonstration ; `/print/[id]` et job `export.pdf` (T-028) si le temps le permet.

## 6. Décisions déjà prises (ne pas reposer)

Nom « La Mèza » ; logo du propriétaire, démo publique autorisée ; `Fichier 3/4/5/7` = variantes ; mode compétition
(tickets > 400 lignes) ; carte blanche hors dépenses ; pas de Flow manuel ; Gemini sans facturation (texte) ;
paysage par défaut ; thèmes jour/nuit/système ; landing de la maquette.

## 7. Décisions à demander au propriétaire en début de session

1. **Dépendances** : `motion` (animations de la landing et apparition des pages) et `lucide-react` (icônes) sont
   utilisés par la maquette mais **non autorisés** dans `apps/web` ; `react-colorful` est prévu par 09 §7.
   Recommandation : autoriser `motion` et `react-colorful`, garder des SVG maison à la place de `lucide-react`.
2. **Thème du studio par défaut** : SETO est clair ; 09 disait sombre. Recommandation : système (déjà le défaut).
3. **Événement `document.page`** pour une vraie génération page par page (recommandé pour le jury).
4. **SVG vectorisé de « La Mèza » corrigé** (texte vectorisé dans Illustrator) pour une démo nette.

## 8. Ordre de construction recommandé (avec les skills)

1. **`/impeccable init`** → `PRODUCT.md` (réponses : §1 de ce document, `docs/00_CHARTER.md`, public « fondateurs
   avec un logo », compétition GDG Fest).
2. **`/impeccable document`** → `DESIGN.md` depuis `apps/web` (tokens) **et** la maquette (monde visuel validé) ;
   y acter l'échelle d'affichage, les thèmes, le gris neutre des aperçus.
3. **`/impeccable shape`** sur le studio (surface *Operate*, construction pilotée par le code) avec SETO et la
   capture de la maquette comme références ; puis **`concept-seed --scope surface --mode operate`** pour la toile.
4. Construire dans cet ordre, chaque étape vérifiée dans Chromium puis `pnpm verify` :
   a. J3 Gemini (adaptateur, `BrandAnalysis`, étape 3 réelle) ;
   b. coque du studio (barre, chat, toile, inspecteur) + lecture du document ;
   c. format paysage/portrait + rendus des 11 pages ;
   d. génération en direct (squelettes puis `document.page`) ;
   e. inspecteur → commandes, annuler/rétablir ;
   f. mockups (scènes + `mockup-engine`) ;
   g. copilote (chat → commandes) ;
   h. landing de la maquette ;
   i. export, puis mise en ligne Cloud Run (stockage Google Cloud via `R2_ENDPOINT`).
5. Après chaque surface : **`/impeccable critique`** puis **`/impeccable audit`**, `ux-ui-agent-skills:a11y-audit`,
   et **`/impeccable polish`** avant la démo. Relectures de code : `typescript-reviewer`, `silent-failure-hunter`,
   `security-reviewer` (J2 et J3 n'en ont pas encore eu).
