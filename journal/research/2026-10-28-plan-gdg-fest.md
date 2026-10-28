# Plan GDG Fest — présélection du 2026-11-09

| Jour | Livrable | État |
|---|---|---|
| J1 (28/10) | `main` à jour, navigateur Chromium, stockage S3 local ou Google Cloud (`R2_ENDPOINT`) | fait (stockage : binaire à fournir par le propriétaire) |
| J2-J3 | Écran Démarrer (session invitée, Turnstile de test, projet) ; La Mèza accepté (SVG à texte vivant → repli PNG ; logo blanc détecté) | à faire |
| J3-J5 | Gemini (clé AI Studio gratuite) : lecture du logo et du brief, manifeste, valeurs, ton, expliqués dans le chat | à faire |
| J5-J8 | Espace de travail trois colonnes, toile en direct : couverture, logo et variantes, palette, contrastes, typographie, ton ; paysage par défaut | à faire |
| J8-J9 | Mockups : 6 à 8 scènes Flow recolorées à la palette, logo posé par calcul | à faire |
| J10 | Copilote : commandes en langage naturel, annulables | à faire |
| J11 | Export (PDF ou planche), mise en ligne Cloud Run | à faire |
| J12 | Répétitions, vidéo de secours (Omni dans Flow), pitch | à faire |

Réserve : voix (Gemini Live API), ZIP de tokens.

## Scènes à générer dans Google Flow (Nano Banana), à la main

Règles communes, à ajouter à chaque consigne : *16:9, 4K if available, photorealistic, soft natural window light,
shallow depth of field, the printable surface is completely blank (no text, no logo, no pattern), surface facing
the camera at a gentle angle, no hands, no people, no watermark.* Télécharger l'image d'origine, sans retouche.

1. **Carte de visite** — *Two blank cotton business cards, one stacked over the other, on warm linen tablecloth, a
   ceramic espresso cup slightly out of focus, editorial flat lay, premium stationery photography.*
2. **Menu de table** — *A blank folded A5 dinner menu standing on a restaurant table set for six, warm candlelight,
   terracotta and sage tableware, blurred guests' glasses in the background.*
3. **Tote bag** — *A blank natural canvas tote bag hanging on a wooden peg against a warm plaster wall, morning light,
   fabric folds visible.*
4. **Enseigne murale** — *A blank brushed brass wall plaque mounted beside the entrance of an upscale restaurant,
   dusk, warm interior light through the window.*
5. **Tasse** — *A blank matte ceramic cup on a sage linen napkin, overhead three-quarter view, crumbs of bread,
   intimate dinner atmosphere.*
6. **Papeterie complète** — *Brand stationery flat lay: blank letterhead, blank envelope with wax seal, two blank
   business cards, pen, sprigs of dried herbs, on beige paper, top-down view, Dribbble-style presentation.*
7. **Écran mobile** — *A smartphone with a pure white blank screen lying on a wooden dining table next to a wine
   glass, top-down three-quarter view, warm evening light.*
8. **Affiche encadrée** — *A blank white poster in a thin oak frame on a warm off-white wall above a dining
   sideboard with a ceramic vase, soft daylight.*

Dossier de dépôt : à indiquer à l'agent ; l'import et le placement des coins passent par `MCP-IMAGE-GENERATION`
(`scene-editor.html`, puis `finalize_scene`).
