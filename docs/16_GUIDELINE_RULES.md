# 16 — Règles de la charte graphique (base normative de la génération)

> Statut : **normatif** (ADR-028). Toute page générée respecte ces règles ; une règle ne se contourne pas, elle se
> modifie ici par décision du propriétaire. Ordre : de la plus importante à la plus simple. Chaque règle porte sa
> **vérification** (ce que le code ou la revue contrôle) et ses **sources** : le corpus de chartes réelles du
> propriétaire (`corpus-reel/chartes/`, 14 chartes, privé) et des guides publics.
>
> Corpus : Slack, BlaBlaCar (« bbc »), Instacart, Charte de l'État, Data Terra, Ville de Nevers, CFDT, Porto
> (manual-14-digital), Institut Agro, CAPEFE, UNV (Volontaires ONU), Bâtir/« BC », ANFA (annexe), TB Speed.

---

## Niveau 1 — Intégrité de la marque (jamais négociable)

**R1. Le logo est sacré.** On montre et on dérive le dessin fourni ; on ne le redessine, ne le recompose, ne le
re-crénage jamais, et aucune IA ne le génère. Les déclinaisons (noir, blanc, ton sur ton, favicon) sont des
recolorations structurelles du même dessin.
*Vérif.* : `logo-kit` ne modifie que les peintures ; score de structure ≥ 0,9 (§5.2 de `05_ENGINES.md`).
*Sources* : toutes les chartes (« le logotype n'est pas modifiable », Data Terra p4 ; Slack p24 « do not re-create »).

**R2. Les couleurs de marque sont exactes et spécifiées pour chaque usage.** Chaque couleur principale est donnée
en HEX et RVB (écran), CMJN (impression) et, si connue, Pantone ; les valeurs viennent de l'extraction, jamais d'une
estimation libre ; la conversion CMJN est signalée comme approximation tant qu'aucun profil ICC n'est choisi.
*Vérif.* : `color-engine` ; écart ΔE_OK affiché si une couleur est retouchée.
*Sources* : État p40+, ANFA p4, Institut Agro p11, BC p17, CAPEFE p18.

**R3. Lisibilité minimale garantie.** Tout couple texte/fond proposé respecte WCAG AA (4,5:1 texte courant, 3:1
grands titres et éléments graphiques) ; un couple qui échoue n'est jamais présenté comme recommandé, il est montré
comme interdit.
*Vérif.* : `contrastRatio` sur chaque combinaison de la page Contraste et de la page Fonds.

**R4. Aucune information inventée.** Mission, valeurs, histoire, chiffres et noms de polices sans preuve ne sont pas
affirmés : texte vide à compléter, ou marqué « proposé ». La police d'origine du logo n'est nommée que si elle est
vérifiée (voir R21).

## Niveau 2 — Les règles d'usage du logo (le cœur de toute charte)

**R5. Versions du logo, dans cet ordre** : version principale couleur ; version **négative** (blanche) sur la
couleur principale de la marque ; version **noire** (monochrome) ; version **blanche** sur fond sombre ; si le logo
a un symbole séparable, **symbole seul** (usage réduit : favicon, avatar). Chaque version est montrée sur le fond
auquel elle est destinée, avec son nom et son usage en une ligne.
*Sources* : Institut Agro p12 (couleur, blanc, noir, noir et blanc), Data Terra p5, BlaBlaCar p9 (colourways
A/B/C), Slack p23 (one-color), CFDT p6.

**R6. Zone de protection définie par le logo lui-même.** L'unité *x* est une mesure du dessin (hauteur d'une lettre,
du symbole ou d'une de ses parties), jamais une marge arbitraire ; la zone vaut *x* (ou un multiple) sur les quatre
côtés et se conserve à toute échelle. Le schéma montre : le logo, le cadre de la zone en trait fin, l'unité *x*
reportée sur chaque côté (forme fantôme de l'élément de référence ou cote fléchée), la légende « x = … ».
*Sources* : Instacart p15 (« C » fantôme), BlaBlaCar p10 (« B »), CAPEFE p14 (« E »), Institut Agro p10, Data
Terra p9 (cotes x), ANFA p6 ; guides publics (hauteur d'une lettre du logo).

**R7. Taille minimale en deux unités.** Une taille minimale **impression (mm)** et **écran (px)**, mesurée sur la
largeur (ou la hauteur pour un logo vertical), illustrée par le logo rendu à cette taille. En dessous : utiliser le
symbole seul.
*Sources* : BlaBlaCar p10 (15 mm / 100 px), État p13 (2,5 mm / 12 px), Instacart p15, Institut Agro p10 (25 mm),
UNV p22.

**R8. Les interdits : une grille de 6 à 12 cas, chacun barré et légendé.** Présentation professionnelle commune :
vignettes identiques en grille (3×2, 3×3 ou 4×3), logo réellement transformé, **barre diagonale rouge** (ou croix
rouge) sur la vignette, légende courte à l'impératif sous chaque vignette (« Ne pas déformer »). Cas, par
priorité : déformer (étirer/écraser) ; pivoter ; changer les couleurs ; recolorer une partie seulement ; contour
seul ; ajouter un effet (ombre, dégradé, lueur) ; transparence ; fond peu contrasté ; fond chargé ou photo sans
réserve ; recadrer ; réorganiser ou redimensionner les éléments entre eux ; changer la typographie du nom.
*Sources* : Slack p24 (10 cas), BlaBlaCar p12 (12 cas), Institut Agro p16 (9 cas), ANFA p9, TB Speed p8, CFDT p9.

**R9. Usage sur fonds.** Une page montre le logo sur : fond clair, fond sombre, couleur de marque, photo claire et
photo sombre, avec la version adaptée à chacun, et un cas interdit (version inadaptée ou fond trop chargé).
*Sources* : BlaBlaCar p9, ANFA p8 (fonds de couleurs), Slack p22-23, État (usages sur fonds).

## Niveau 3 — Système de couleur

**R10. Hiérarchie et proportions.** Couleurs principales (1–2), secondaires, neutres ; proportions d'usage
montrées (barre ou blocs proportionnels, par exemple 60/30/10). Les couleurs du logo sont toujours les principales.
*Sources* : Slack p25-26, Instacart p25, BC p17.

**R11. Nuancier et combinaisons validées.** Échelle de teintes par couleur principale ; combinaisons texte/fond
autorisées avec leur ratio de contraste (R3).
*Sources* : BlaBlaCar p17 (combinations), État.

## Niveau 4 — Typographie

**R12. Rôles typographiques nommés.** Une famille de titre et une famille de texte (ou une seule famille en
plusieurs graisses) ; police de **remplacement bureautique** (Arial, Calibri…) pour Word/PowerPoint.
*Sources* : CAPEFE p17 (Dita/Roboto + Arial), ANFA p11 (Gotham Rounded, Arial, Calibri), CFDT p12, BC p18.

**R13. Spécimen complet** pour chaque famille : nom, source et licence, graisses disponibles, alphabet capitales et
minuscules, chiffres, accents français (À É È Ê Ç Œ) et ponctuation.
*Sources* : État p42-44, CAPEFE p17, TB Speed p9.

**R14. Hiérarchie appliquée** : titre, sous-titre, chapô, texte, légende, avec corps, graisse, interlignage et
approche, montrée sur un vrai texte de la marque.
*Sources* : Slack p31 (type specimen), Instacart p41.

**R15. Interdits typographiques** : effets, couleurs hors palette, déformation, autre police, faux gras/italique.
*Sources* : BlaBlaCar p21.

## Niveau 5 — Éléments graphiques et applications

**R16. Éléments de langage visuel** issus du logo (motif, forme, ruban, pictogrammes) : déclinés sans déformer le
logo, avec règles d'usage. *Sources* : BC p22-31 (ruban, pictos), CFDT p56-58, Porto (malha).

**R17. Applications du secteur** choisies par la recherche de références (ADR-028) : papeterie (carte, en-tête,
enveloppe), numérique (réseaux sociaux, site, signature e-mail), et celles du secteur (menu, enseigne, emballage,
uniforme, véhicule…). Chaque mockup montre le logo selon R5-R9.
*Sources* : Nevers p8-23, CFDT p25-50, ANFA p11-20, BC p32+.

## Niveau 6 — Mise en page des pages de la charte

**R18. Gabarit constant** : format A4, paysage par défaut et portrait par page (décision du propriétaire 2026-10-30, remplace le 16:9 de l’ADR-027), marges et grille
identiques sur toutes les pages, en-tête courant (marque, « Charte graphique », section) et numéro de page.
**R19. Une idée par page**, titre de section en grand, texte court (≤ 60 mots) à côté du visuel, visuel dominant.
**R20. Ordre des sections** : couverture, sommaire, marque (histoire, valeurs, ton), logo (R5-R9), couleurs,
typographie, éléments graphiques, applications, contacts/clôture.
*Sources* : Slack p3, CAPEFE p2, Institut Agro p2 (sommaires) ; ADR-028.

## Niveau 7 — Détails de finition

**R21. Police d'origine du logo** : nommée seulement si vérifiée par comparaison visuelle (rendu du même mot) ;
sinon « police proche libre » clairement annoncée comme alternative.
**R22. Valeurs mesurées en chiffres tabulaires**, unités toujours écrites (mm, px, pt), séparateur décimal français.
**R23. Légendes et numérotation** de chaque vignette (A, B, C… comme BlaBlaCar p9) pour que la charte se cite
facilement.
**R24. Liens de téléchargement** des fichiers du logo depuis la page Logo (BlaBlaCar p8 « Download our logos »).

---

## Sources publiques

- Guides consultés via la recherche « brand guidelines logo clear space minimum size misuse » (2026-10-29) :
  [Runway](https://runway.com/brand-guidelines), [RSNA](https://www.rsna.org/style-guide/rsna-brand/design),
  [Abertay](https://abertay.ac.uk/media/jefa5nql/abertay-brand-guidelines-logo-use.pdf),
  [APSCo](https://uk.apsco.org/hubfs/APSCo%20United%20Kingdom%20Brand%20Guidelines%20for%20third%20parties%20and%20members%202026.pdf),
  [Agat Labs](https://agatlabs.com/legal/logo-guidelines/) : zone de protection fondée sur une lettre du logo,
  taille minimale en mm et px, interdits (étirer, pivoter, recolorer, réorganiser, éléments dans la zone, fond
  chargé), passage au symbole seul aux petites tailles.
