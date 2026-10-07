# 09 — Design system, accessibilité et performance UI

> Statut : **validé** — Version 4.0 — 2026-10-07
> Remplace : `UI_UX_DESIGN_SYSTEM.md`. Conserve la direction artistique, corrige les objectifs irréalistes.

## 1. Direction artistique

Un outil de précision pour créatifs : sobre, net, rapide. Références d'esprit : Linear, Vercel, Apple. **L'interface s'efface devant les couleurs de la marque de l'utilisateur.**

Principes :
1. **Neutralité chromatique des zones d'aperçu** : le fond de toute prévisualisation de logo ou de palette est un gris neutre (OKLCH chroma 0). Un fond teinté fausse la perception des couleurs.
2. **Thème sombre par défaut**, thème clair au backlog. Les composants sont écrits avec des tokens pour que le thème clair ne soit qu'un jeu de variables.
3. **Effets de verre : sobriété.** Au plus **3 surfaces en verre dépoli visibles** simultanément, jamais sous du texte de contenu (seulement navigation et barres flottantes). Désactivés sous `prefers-reduced-transparency`, ou lorsque la fluidité mesurée passe sous 50 images par seconde : fond opaque de remplacement.
4. **Densité maîtrisée** : une action principale par écran, hiérarchie par la taille et le poids, pas par les effets.
5. **La landing est gelée** (voir `12_WORKFLOW_ROADMAP.md` §7) : aucun nouveau travail visuel avant la bêta.

## 2. Tokens

Aucune couleur hexadécimale, aucun espacement arbitraire, aucun rayon arbitraire dans un composant. Tailwind CSS v4 : tokens déclarés dans le CSS (`@theme`).

```css
:root {
  /* Surfaces (thème sombre par défaut) */
  --bg-canvas:        oklch(0.14 0.01 260);
  --bg-surface:       oklch(0.18 0.012 260);
  --bg-elevated:      oklch(0.22 0.015 260);
  --bg-preview:       oklch(0.30 0 0);          /* fond NEUTRE des aperçus */
  --border-subtle:    oklch(0.30 0.015 260 / 0.6);
  --border-strong:    oklch(0.45 0.02 260);

  /* Texte (ratios vérifiés avec color-engine en CI) */
  --text-primary:     oklch(0.97 0 0);
  --text-secondary:   oklch(0.78 0.01 260);
  --text-muted:       oklch(0.66 0.01 260);     /* ≥ 4,5:1 sur --bg-surface */

  /* Accent de l'interface (≠ couleurs de marque de l'utilisateur) */
  --accent:           oklch(0.68 0.19 268);
  --accent-contrast:  oklch(0.16 0.02 268);
  --focus-ring:       oklch(0.80 0.15 268);

  /* États (toujours avec icône + texte) */
  --success: oklch(0.74 0.17 150);
  --warning: oklch(0.80 0.15 80);
  --danger:  oklch(0.66 0.21 25);

  /* Espacement : grille 4/8 */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
}
```

**Règle de vérification** : un test de CI calcule, avec `color-engine`, les ratios de contraste des paires `texte/fond` déclarées dans un tableau de référence (`design-tokens.contrast.ts`) et échoue sous 4,5 (texte) ou 3 (composants).

## 3. Typographie de l'interface

- Titres : une police géométrique ou grotesque auto-hébergée. Corps et données : une police lisible (Inter ou Geist). Codes HEX et mesures : police à chasse fixe (Geist Mono ou équivalent).
- Échelle modulaire : 12, 14, 16, 20, 24, 32, 48 px. Interligne ≥ 1,5 pour le texte courant.
- Polices **auto-hébergées**, sous-ensembles latins étendus (accents), `font-display: swap`, préchargement des polices critiques.

## 4. Mouvement

```ts
export const spring = { type: 'spring', stiffness: 380, damping: 30, mass: 0.8 } as const;
export const fade   = { duration: 0.2, ease: [0.16, 1, 0.3, 1] } as const;
```

- Retour visuel d'une interaction : ≤ 100 ms.
- `prefers-reduced-motion: reduce` → plus aucun déplacement, uniquement des changements d'opacité instantanés ou ≤ 100 ms.
- Aucune animation ne bloque l'interaction ; aucune boucle infinie sans possibilité de pause.
- Les animations n'agissent que sur `transform` et `opacity`.

## 5. Accessibilité (WCAG 2.2 niveau AA)

Cible : **AA solide partout**, AAA pour le texte courant quand c'est réaliste. Le niveau AAA complet sur tout le produit n'est pas un objectif.

Exigences vérifiables :
- Navigation clavier complète de tous les parcours (Tab, Maj+Tab, Entrée, Espace, Échap, flèches dans les composites). Aucun piège au clavier.
- Focus visible sur tout élément interactif (`--focus-ring`, 2 px, décalage 2 px), contraste ≥ 3:1 avec l'arrière-plan.
- Cibles tactiles ≥ 24 × 24 px (WCAG 2.2, 2.5.8), 44 px visés sur mobile.
- Tout état (succès, erreur, avertissement) combine **icône + texte + couleur**.
- Zones dynamiques annoncées (`aria-live="polite"` pour la progression ; `assertive` réservé aux erreurs bloquantes).
- Formulaires : label explicite, erreur liée au champ (`aria-describedby`), erreurs actionnables.
- Alternatives textuelles pour les mockups et visuels de la charte (description générée à partir des données, pas de « image »).
- `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast` respectés.
- Glisser-déposer : toujours une alternative sans glisser (bouton « Choisir un fichier »).
- Texte redimensionnable à 200 % sans perte de contenu ; reflow à 320 px de large.

Vérifications : axe en CI (zéro violation), **checklist manuelle** à chaque jalon (clavier seul, lecteur d'écran, zoom 200 %, contraste forcé). Le score Lighthouse n'est qu'un indicateur : il ne prouve pas la conformité.

## 6. Performance de l'interface

Budgets : `02_ARCHITECTURE.md` §8. Règles :
- Composants serveur par défaut ; `"use client"` aux feuilles.
- `mockup-engine`, éditeur de couleurs et PDF chargés **à la demande**.
- Listes et pages du studio **virtualisées** : seules les pages visibles (±1) sont rendues en pleine définition ; les autres en aperçu léger.
- Images : dimensions réservées (`aspect-ratio`) pour un CLS nul ; formats WebP/AVIF.
- Test sur un appareil de référence modeste (à définir par le propriétaire) avant chaque jalon.

## 7. Pages et composants

### Pages (MVP)
| Page | Contenu |
|---|---|
| `/` | Landing **statique**, sobre (gel du travail visuel existant) |
| `/connexion`, `/inscription`, `/mot-de-passe` | Authentification |
| `/studio` | Liste des projets |
| `/studio/[id]` | Éditeur : volet de gauche (copilote et inspecteur), centre (charte paginée), barre supérieure (annuler/rétablir, exports) |
| `/partage/[token]` | Vue lecture seule (*Should*) |
| `/legal/*` | CGU, confidentialité, mentions |
| `/print/[id]` | Route interne de rendu PDF (jeton requis) |

### Composants clés
`Dropzone` (avec alternative clavier), `AnalysisTimeline` (4 étapes, `aria-live`), `PaletteGrid`, `ContrastMatrix`, `ColorPicker` (react-colorful, étiquetage accessible), `TypographyPicker`, `PageCanvas` (virtualisé), `PageInspector`, `CopilotPanel` (flux SSE), `HistoryMenu` (annuler/rétablir), `ExportDialog`, `MockupStage`.

### Timeline d'analyse (textes de départ, en français)
1. « Lecture du logo et vérification du fichier… »
2. « Extraction de la palette et calcul des contrastes… »
3. « Rédaction du manifeste et choix typographique… »
4. « Assemblage de la charte… »

(Les mockups sont rendus à la demande, pas dans cette timeline.)

## 8. Catalogue typographique fermé

Couples proposés (tous sous licence ouverte **SIL OFL** sur Google Fonts, à confirmer fichier par fichier lors de l'intégration ; polices **auto-hébergées**, jamais chargées depuis un CDN tiers). Chaque entrée précise le titre, le corps et l'ambiance. L'IA ne peut choisir que parmi ces identifiants.

| `pairingId` | Titres | Corps | Ambiance |
|---|---|---|---|
| `editorial-classic` | Playfair Display | Source Sans 3 | Éditorial, élégant |
| `modern-geometric` | Plus Jakarta Sans | Inter | Moderne, polyvalent |
| `tech-grotesk` | Space Grotesk | Inter | Technique, startup |
| `warm-serif` | Fraunces | Work Sans | Chaleureux, artisanal |
| `luxury-light` | Cormorant Garamond | Montserrat | Luxe, raffiné |
| `friendly-soft` | DM Serif Display | DM Sans | Accessible, convivial |
| `bold-display` | Bricolage Grotesque | Inter | Affirmé, créatif |
| `humanist-book` | Libre Baskerville | Lato | Sérieux, institutionnel |

Critères d'acceptation du catalogue :
- support des caractères accentués du français et de l'anglais (latin étendu) ;
- licence vérifiée et copiée dans `assets/fonts/<police>/LICENSE.txt` ;
- aperçu validé visuellement par le propriétaire à 3 tailles (titre, corps, légende) ;
- fichiers WOFF2 (web) ; TTF/OTF disponibles pour le rendu PDF si nécessaire.

L'ajout d'un couple passe par un ticket (licence + aperçu + test de rendu PDF).
