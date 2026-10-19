# Entrées de l'utilisateur, variantes fournies, polices de référence

> Note de recherche, 2026-10-19. Demande du propriétaire : l'utilisateur ne dépose pas seulement un logo. Il peut
> aussi fournir :
> - ses variantes de logo ;
> - une description, en texte ou en documents ;
> - un slogan ;
> - le nom de la marque ;
> - ses polices de référence.
>
> Peut-on retrouver et exploiter ces polices, y compris avec des outils externes ?
>
> Statut : **proposition** de découpage. `docs/` reste la règle tant que le chef de projet ne l'a pas modifié.

## 1. Ce que la spécification couvre aujourd'hui

- **AC-02** : un seul logo.
- **AC-03** : un texte libre (≤ 8 000 caractères) et, en *Could*, l'import d'un brief PDF ou DOCX.
- **US-08** : la typographie est choisie par l'IA dans un **catalogue fermé** (`09_DESIGN_SYSTEM.md` §8).

Rien de prévu pour les variantes fournies, le nom, le slogan ni les polices de l'utilisateur.

## 2. Les entrées proposées

| Entrée | Forme | Usage dans la charte |
|---|---|---|
| Nom de la marque | texte (≤ 80) | couverture, pages typographiques, mockups |
| Slogan | texte (≤ 160) | couverture, page « voix », mockups |
| Logo principal | SVG, PNG, JPEG, WebP (existant) | toutes les pages |
| **Variantes fournies** | mêmes formats, chacune étiquetée : horizontale, verticale, symbole seul, monochrome noir, monochrome blanc, autre | **prioritaires** sur les variantes générées ; les générées restent proposées en complément |
| Description | texte, et/ou documents PDF, DOCX, TXT (≤ 3, ≤ 10 Mo) | étape 3 (IA) : manifeste, ton, mots-clés |
| **Polices de référence** | fichier TTF, OTF, WOFF2 ; ou un nom saisi ; ou rien (détection) | page typographie, exports |

## 3. Les polices : ce qui est possible, et ce qui ne l'est pas

1. **Fichier fourni par l'utilisateur.** C'est le chemin fiable : il possède la police.
   - On lit les tables `name` : famille, style, concepteur, texte de licence et URL de licence.
   - On lit le champ `OS/2.fsType`, qui donne les droits d'incorporation :
     - **restreinte** (bit 1) → aperçu seulement, jamais incorporée dans un export ;
     - **aperçu et impression** ou **modifiable** → incorporée en sous-ensemble dans le PDF ;
     - **installable** → idem.
   - Le fichier suit les règles des assets :
     - quarantaine et contrôle des octets magiques ;
     - stockage privé ;
     - jamais servi à des tiers.
2. **Nom saisi.**
   - Correspondance exacte dans le catalogue ouvert (Google Fonts, licence OFL) → utilisable telle quelle.
   - Sinon (DaFont, fonderies commerciales) → **pas de téléchargement automatique** :
     - les licences DaFont varient d'une police à l'autre, et la mention du site n'est qu'indicative ;
     - un usage « personnel » ne couvre pas une application web ;
     - les conditions des sites l'interdisent souvent.

     On demande le fichier, et on propose la police libre la plus proche (point 3).
3. **Détection depuis le logo.** Le mot-symbole est presque toujours vectorisé, sans texte, donc pas de nom de police
   dans le fichier. Trois voies :
   - **Comparaison de formes, déterministe et sans IA** :
     - rendre le nom de la marque dans chaque police du catalogue ;
     - normaliser la hauteur et binariser ;
     - comparer au mot-symbole (IoU, puis distance de chanfrein sur les contours) ;
     - sortir 3 propositions avec un pourcentage de ressemblance.

     Explicable et testable. C'est la voie recommandée.
   - **Modèle libre** [gaborcselle/font-identifier](https://huggingface.co/gaborcselle/font-identifier) (MIT,
     ResNet18) : catalogue limité, à évaluer sur le corpus.
   - **IA de vision** (Gemini, payante) : propose un nom en clair. Cela devient un indice à confirmer, jamais une vérité.
4. **Ce qu'on ne fera pas** :
   - récupérer une police propriétaire sans licence ;
   - la « reconstruire » à partir du logo.

## 4. Découpage en étapes

1. **E1, contrats et données.** Champs `brandName` et `tagline` du projet. Types d'assets `logo_variant_user`
   (avec rôle), `brief_doc` (existant), `font_user`. Limites et validation Zod.
   Décision du chef de projet attendue : nouveaux types d'assets (`03_DATA_MODEL.md`).
2. **E2, variantes fournies.**
   - Scan identique au logo.
   - Rôle choisi par l'utilisateur, avec une suggestion déduite des proportions et des couleurs.
   - La charte montre la variante fournie ; la générée apparaît en « proposition » si son score de structure ou de
     fidélité diffère.
3. **E3, documents.**
   - Extraction du texte dans un worker isolé, avec un délai de 20 s (AC-03.3).
   - Nettoyage, puis envoi à l'étape 3 de l'IA.
   - Dépendance d'extraction PDF et DOCX à autoriser (ADR-026).
4. **E4, polices fournies.**
   - Lecture `name` et `OS/2`.
   - Verdict de licence affiché (icône, texte, couleur).
   - Sous-ensemble pour le PDF ; aperçu dans le studio.
   - Dépendance d'analyse de police à autoriser (fontkit ou opentype.js).
5. **E5, police par nom.**
   - Correspondance avec Google Fonts (métadonnées publiques).
   - Sinon : demande du fichier, et propositions libres proches (E6).
6. **E6, détection de la police du mot-symbole.**
   - Le comparateur de formes ci-dessus.
   - Banc sur le corpus privé : les 8 chartes réelles donnent la vraie police, ce qui permet de mesurer le taux de
     bonnes propositions dans le top 3.
7. **E7, interface.**
   - Écran « Démarrer » structuré, avec divulgation progressive sur mobile : nom, slogan, logo et variantes,
     description et documents, polices.
   - Chaque champ facultatif sauf le logo.
   - Prototype : `prototypes/studio`, écran Démarrer.

## 5. Ordre recommandé

1. E7, en maquette : valider l'expérience.
2. E1, puis E4, la police fournie (forte valeur, risque faible).
3. E2.
4. E6, avec banc et seuils.
5. E5.
6. E3, qui dépend de T-030 et suivants pour l'IA.
