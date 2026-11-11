# Landing Charta : brief marketing et copy (FR / EN)

> Auteur : stratège marketing. Statut : proposition au 2026-11-09. Aucune statistique, aucun témoignage, aucun logo client. Sources : `apps/web/PRODUCT.md`, `docs/01_PRODUCT_MVP.md`, `docs/team/business-model.md`, `messages/product.*.json`, code de `src/studio` et `src/landing`.
> Convention : `[à valider]` = décision propriétaire non prise. `[à vérifier]` = fait à confirmer dans le code avant publication.

## 1. Cible et douleur

**Cible principale : designers freelances et petites agences** (et, en second, fondateurs qui possèdent déjà un logo).

Douleur, formulée sans chiffre inventé :
- Une charte, c'est une part de jugement (le logo, la direction) et une grande part de production répétitive : palette en plusieurs formats, matrice de contrastes, variantes noir/blanc/favicon, zone d'exclusion, mise en page, mockups, fichiers à livrer.
- Cette part systématique mange le temps, se refait à chaque client et se facture mal.
- Côté fondateur : un logo, mais rien de présentable à envoyer à un partenaire ou un imprimeur.

Ce que la cible veut : garder le jugement, déléguer la production, livrer quelque chose de signable.

## 2. Proposition de valeur (une phrase)

**FR** : Déposez un logo et un brief : Charta mesure, compose et exporte une charte graphique complète, que vous reprenez page par page.
**EN**: Drop a logo and a brief: Charta measures, composes and exports a complete brand guideline that you then edit page by page.

Différenciateurs tenus (voir §8) : le logo n'est jamais redessiné par une IA ; chaque valeur est calculée et sourcée ; chaque modification s'annule ; l'export est réel.

## 3. Ordre narratif des sections

1. **Hero** : accroche, un seul CTA, aperçu réel (planches + mockup).
2. **Problème** : la part répétitive d'une charte.
3. **Démonstration** : l'atelier avec une charte d'exemple (palette, contrastes, typo, tokens), marque fictive.
4. **Méthode** : déposer, regarder, ajuster.
5. **Mises en situation** : mur de mockups calculés.
6. **Preuves vérifiables** : bloc de réassurance (§7).
7. **Ce que vous emportez** : exports.
8. **Tarifs** (version courte, lien vers `/tarifs`).
9. **FAQ** : 6 objections.
10. **CTA final**.

Règle : un seul CTA principal par écran, « Essayer sans compte ». Le CTA secondaire (« Voir une charte ») est un lien discret.

## 4. Hero : 3 variantes de titre

| # | FR | EN |
|---|---|---|
| A | Votre logo devient une charte complète. | Your logo becomes a complete brand guideline. |
| B | La production d'une charte, sans les jours qui vont avec. | The production work of a brand guideline, minus the days it takes. |
| C | Le logo, vous l'avez. La charte, c'est fait. | You have the logo. The guideline is done. |

**Recommandation : A pour le titre, B en sous-titre reformulé.**
Pourquoi :
- A est déjà dans `homePage.hero.title` (cohérence, rien à re-traduire), concret, vérifiable en un coup d'œil sur l'aperçu, et parle aussi bien au fondateur qu'au designer.
- B vise le designer mais promet du temps gagné sans le mesurer : acceptable en sous-titre qualitatif, risqué en titre (le jury demandera la preuve).
- C est mémorable mais « c'est fait » surpromet : la charte se reprend et s'ajuste, elle n'est pas figée.

### Hero : copy final

| Élément | FR | EN |
|---|---|---|
| Surtitre | Charte graphique · pages A4 · mises en situation | Brand guideline · A4 pages · mockups |
| Titre | Votre logo devient une charte complète. | Your logo becomes a complete brand guideline. |
| Sous-titre | Déposez le fichier et un court brief. Charta mesure les couleurs, vérifie chaque contraste, compose les pages et les mises en situation. Vous reprenez ensuite chaque page, à la main ou en parlant au copilote. | Drop the file and a short brief. Charta measures the colours, checks every contrast, and composes the pages and mockups. You then take over each page, by hand or by talking to the copilot. |
| CTA principal | Essayer sans compte | Try without an account |
| Lien secondaire | Voir une charte d'exemple | See an example guideline |
| Micro-texte | Sans carte bancaire. Votre logo n'est jamais redessiné. | No credit card. Your logo is never redrawn. |
| Mention exemples | Marques fictives créées pour la démonstration, pas des clients. | Fictional brands made for the demonstration, not clients. |

Note : « Sans carte bancaire » est vrai (aucun paiement n'existe). À retirer le jour où un paiement existe.

## 5. Copy final par section

### 5.1 Problème

| | FR | EN |
|---|---|---|
| Titre | Le jugement, c'est votre métier. Le reste est répétitif. | Judgement is your craft. The rest is repetition. |
| Texte | Palette en cinq formats, matrice de contrastes, variantes noir et blanc, zone d'exclusion, mise en page, mockups, fichiers à livrer : à chaque marque, on refait les mêmes gestes. Charta s'en charge, pour que votre temps aille à la direction. | Palette in five formats, contrast matrix, black and white variants, clear space, layout, mockups, files to deliver: with every brand, the same steps again. Charta handles them so your time goes to direction. |

### 5.2 Démonstration (atelier)

| | FR | EN |
|---|---|---|
| Titre | L'atelier, avec une vraie charte | The workshop, with a real guideline |
| Sous-titre | Une marque d'exemple composée par les mêmes moteurs que la vôtre. Changez de page, lisez les mesures. | An example brand composed by the same engines as yours. Switch pages, read the measurements. |
| Micro-texte | Exemple de démonstration, pas un client. | Demonstration example, not a client. |
| Légendes | Couleurs mesurées sur le logo · Contrastes · Tokens exportés · Typographie | Colours measured on the logo · Contrasts · Exported tokens · Typography |

### 5.3 Méthode

| | FR | EN |
|---|---|---|
| Titre | Trois gestes, une charte. | Three steps, one guideline. |
| 1 | **Déposez.** SVG, PNG, WebP ou JPEG. Le fichier est vérifié et assaini avant toute lecture ; l'original reste privé. | **Drop.** SVG, PNG, WebP or JPEG. The file is checked and sanitised before anything reads it; the original stays private. |
| 2 | **Regardez.** L'analyse avance en direct : lecture du logo, palette et contrastes, typographie, assemblage. Les pages se posent au fur et à mesure. | **Watch.** The analysis runs live: logo reading, palette and contrasts, typography, assembly. Pages land one by one. |
| 3 | **Ajustez.** Une couleur, une police, un format, ou une phrase au copilote. Chaque modification est une commande que vous pouvez annuler. | **Adjust.** A colour, a font, a format, or one sentence to the copilot. Every change is a command you can undo. |

### 5.4 Mises en situation

| | FR | EN |
|---|---|---|
| Titre | Votre logo, posé sur de vrais objets. | Your logo, placed on real objects. |
| Texte | Cartes, affiches, mug, enseigne, sac, papier à en-tête : le logo est placé au pixel près, avec perspective et ombres calculées. Il n'est jamais redessiné. | Cards, posters, mug, signage, bag, letterhead: the logo is placed pixel-exact, with computed perspective and shading. It is never redrawn. |
| Micro-texte | Objets photographiés ; marques d'exemple fictives. | Photographed objects; fictional example brands. |

`[à vérifier]` la liste exacte des scènes affichées (le catalogue de `mockup-stage.tsx` contient 13 scènes : cartes, feuille A4, affiches, mugs, cartons de table, menu, enseigne, boîte cadeau, sac papier). Écrire uniquement ce qui est à l'écran.

### 5.5 Ce que vous emportez

| | FR | EN |
|---|---|---|
| Titre | Des fichiers que vous pouvez livrer. | Files you can actually hand over. |
| Liste | Charte en PDF, toutes les pages, vectorielles · Kit logo en .zip : couleur, noir, blanc et couleur principale, SVG et PNG de 512 à 2 048 px, avec les règles d'usage · Favicon · Variables CSS, thème Tailwind et design tokens W3C (DTCG) pour Figma | Guideline as PDF, all pages, vector · Logo kit .zip: colour, black, white and main colour, SVG and PNG from 512 to 2,048 px, with usage rules · Favicon · CSS variables, Tailwind theme and W3C design tokens (DTCG) for Figma |
| Micro-texte | Le PDF est un document de référence en RVB : il n'est pas présenté comme prêt pour l'impression. | The PDF is an RGB reference document: it is not presented as print-ready. |

### 5.6 Tarifs (version landing) `[à valider]`

Prix et plans : hypothèses du propriétaire (`pricing-plans.ts`, `business-model.md` §2, décisions §7 ouvertes). Aucun paiement n'existe.

| | FR | EN |
|---|---|---|
| Titre | Gratuit pour commencer. | Free to start. |
| Sous-titre | Trois projets gratuits. Les plans payants arrivent après la bêta. | Three free projects. Paid plans arrive after the beta. |
| Gratuit | **Gratuit** · 0 € · Pour essayer et pour un premier client. 3 projets, export PDF, fichiers du logo, copilote. | **Free** · €0 · To try it out and for a first client. 3 projects, PDF export, logo files, copilot. |
| Pro | **Pro** · 15 € par mois (prix indicatif, à valider) · Pour les indépendants et les designers. Plus de projets sous usage équitable, tokens CSS, Tailwind et Figma, mises en situation en haute définition. Bientôt disponible. | **Pro** · €15 per month (indicative price, to be validated) · For freelancers and designers. More projects under fair use, CSS, Tailwind and Figma tokens, high-definition mockups. Coming soon. |
| Agence | **Agence** · 49 € par mois (prix indicatif, à valider) · Pour les studios qui livrent plusieurs marques. Équipe, partage client, charte à votre nom. Bientôt disponible. | **Agency** · €49 per month (indicative price, to be validated) · For studios delivering several brands. Team, client sharing, white-label guideline. Coming soon. |
| Avertissement | Prix indicatifs, non facturés pour l'instant : aucun paiement n'est possible. | Indicative prices, not billed yet: no payment is possible. |
| Lien | Voir tous les tarifs | See all pricing |

Écarts à arbitrer avec le propriétaire (issus de `business-model.md`) :
- « Projets illimités » du Pro est remplacé ici par « usage équitable » (la marge Pro gros utilisateur tombe à 51 %).
- Équipe, partage client, marque blanche, accompagnement : **non livrés**, donc « Bientôt » obligatoire.
- Mises en situation HD : 3840 × 2160 non vérifié, ne pas écrire de résolution.
- Tokens réservés au Pro : choix produit non tranché ; aujourd'hui tout est accessible. Ne pas écrire « réservé » tant que ce n'est pas décidé.

### 5.7 CTA final

| | FR | EN |
|---|---|---|
| Titre | Déposez votre logo. | Drop your logo. |
| Sous-titre | La première charte se compose en quelques minutes, sans compte. | The first guideline comes together in minutes, no account needed. |
| Bouton | Essayer sans compte | Try without an account |
| Lien | Créer un compte | Create an account |

« Quelques minutes » : formulation qualitative, cohérente avec le critère AC-04.4 (analyse < 30 s au p90 sur jeu de test, hors mockups) ; ne pas citer ce chiffre en public sans mesure en production.

## 6. FAQ : 6 vraies objections

| # | FR | EN |
|---|---|---|
| 1 | **Une IA va-t-elle redessiner mon logo ?** Non. Le logo n'est jamais redessiné par un modèle génératif. Variantes et mises en situation sont calculées à partir de votre fichier. | **Will an AI redraw my logo?** No. The logo is never redrawn by a generative model. Variants and mockups are computed from your file. |
| 2 | **Le résultat est-il au niveau d'un designer ?** Charta fait la partie systématique (palette, contrastes, variantes, mise en page, fichiers). La direction reste la vôtre : chaque page se reprend à la main ou au copilote, et vous jugez le résultat. | **Is the result designer-grade?** Charta does the systematic part (palette, contrasts, variants, layout, files). Direction stays yours: every page can be edited by hand or with the copilot, and you judge the result. |
| 3 | **Que devient mon logo, et à qui appartient la charte ?** Le logo est assaini, reste privé et n'est lisible que depuis votre projet. Vous conservez vos droits sur vos logos ; les conditions sur les textes et mises en page générés seront précisées dans les conditions d'utilisation. | **What happens to my logo, and who owns the guideline?** The logo is sanitised, stays private and is only readable from your project. You keep your rights on your logos; terms on generated texts and layouts will be set out in the terms of use. |
| 4 | **Le PDF est-il prêt pour l'imprimerie ?** Non : c'est un PDF de référence en RVB, texte et logos en vectoriel. Il n'est pas présenté comme prêt pour l'impression. | **Is the PDF print-ready?** No: it is an RGB reference PDF with vector text and logos. It is not presented as print-ready. |
| 5 | **Quels fichiers puis-je déposer ?** SVG (5 Mo au plus), PNG, WebP ou JPEG (10 Mo et 8 192 × 8 192 px au plus). Un SVG avec texte non vectorisé est signalé : exportez-le avec les textes en contours. | **Which files can I drop?** SVG (up to 5 MB), PNG, WebP or JPEG (up to 10 MB and 8,192 × 8,192 px). An SVG with unconverted text is flagged: export it with text outlined. |
| 6 | **Puis-je essayer sans compte, et combien ça coûte ?** Oui : une session invitée permet de tester, un projet conservé 24 h. Le plan gratuit offre 3 projets. Les plans payants ne sont pas encore ouverts et leurs prix sont indicatifs. | **Can I try it without an account, and what does it cost?** Yes: a guest session lets you test, one project kept for 24 hours. The free plan offers 3 projects. Paid plans are not open yet and their prices are indicative. |

`[à vérifier]` avant publication de la réponse 6 : ce qu'un invité peut exporter (le MVP dit « export complet et sauvegarde durable demandent un compte », `01_PRODUCT_MVP.md` §1 ; le code d'export n'a pas été vu bloquer un invité). Ne pas écrire « exportez sans compte » tant que ce n'est pas tranché.

## 7. Bloc de réassurance vérifiable

Chaque ligne renvoie à un fait lisible dans le dépôt.

| Affirmation (FR / EN) | Preuve |
|---|---|
| Le logo n'est jamais redessiné par une IA. / The logo is never redrawn by an AI. | `PRODUCT.md` Positioning 3 ; mockups = homographie et rendu calculé |
| Chaque valeur affichée est calculée, avec sa source. / Every displayed value is computed, with its source. | Moteur couleur, contrastes WCAG 2.2 (`01_PRODUCT_MVP.md` US-05) |
| Chaque modification s'annule et se rétablit. / Every change can be undone and redone. | Commandes typées, annulation serveur (ADR-018) |
| Le fichier est vérifié et assaini avant lecture. / The file is checked and sanitised before reading. | US-02, assainissement SVG, type lu dans les octets |
| Palette, matrice de contrastes, variantes noir/blanc/favicon, règles du logo. / Palette, contrast matrix, black/white/favicon variants, logo rules. | Pages `studio/pages/*` (palette, contrast, logo-page, clear-space, do-dont) |
| Export : PDF, kit logo .zip, variables CSS, thème Tailwind, tokens DTCG. / Export: PDF, logo-kit .zip, CSS variables, Tailwind theme, DTCG tokens. | `export-dialog.tsx`, `logo-kit-export.ts`, `export-files.ts` |
| Français et anglais. / French and English. | `messages/fr.json`, `en.json`, `product.*.json` |
| Marques d'exemple fictives, pas des clients. / Example brands are fictional, not clients. | `PRODUCT.md`, `check-brand-names.ts` |

Format conseillé : quatre lignes courtes maximum à l'écran (reprendre `homePage.promise.*`), le reste en détail dépliable.

## 8. Promesses INTERDITES (non tenues ou non prouvées)

1. Tout chiffre de gain : « en 5 minutes », « 10 fois plus vite », « jours économisés » en valeur. Seul « en quelques minutes » ou « sans les jours de production » reste qualitatif et à relire.
2. « Des milliers de marques / designers », « utilisé par », « ils nous font confiance », logos clients, témoignages, notes, récompenses (le GDG Fest n'est pas gagné).
3. « Prêt pour l'impression », « CMJN exact », « PDF/X » : le PDF est RVB et passe par la fenêtre d'impression du navigateur ; le CMJN est indicatif.
4. « Niveau agence / remplace un directeur artistique ou un designer ». Dire « reprend la partie systématique ».
5. « Génération de logo » ou « logo par IA » : Charta ne crée pas de logo.
6. « Projets illimités » : le Pro est prévu en usage équitable ; aucun plan payant n'est ouvert.
7. Équipe, partage avec les clients, charte en marque blanche, accompagnement dédié, analyses prioritaires, lien de partage lecture seule : non livrés (US-14 *Should*). Seulement avec « Bientôt ».
8. Mockups « 4K » ou « haute définition » avec une résolution : non vérifié.
9. « Conforme WCAG » sans nuance : on **mesure** les contrastes de la palette selon WCAG 2.2 ; on ne certifie pas l'accessibilité du site du client.
10. « Données jamais utilisées pour entraîner une IA », « conforme RGPD », « 100 % privé » : conditions du palier IA et textes juridiques non finalisés. Dire seulement : logo assaini, privé, lisible depuis votre projet.
11. « Références copiées de Behance / Dribbble / Pinterest » ou « analyse de ces plateformes » : pas d'API publique, références citées jamais copiées, sources licites uniquement.
12. « Vos projets sont sauvegardés pour toujours » pour un invité : 24 h.
13. Prix présentés comme fermes, ou « abonnez-vous » : aucun paiement n'existe.
14. Marché « Afrique francophone » en argument de page : hypothèse inférée, non confirmée.
15. Citer La Mèza ou toute marque d'exemple comme client ; les exemples sont des marques fictives ou cédées pour la démonstration.

## 9. Points ouverts pour le propriétaire

- Choix du CTA vers l'inscription tant que le paiement n'existe pas : proposer « Créer un compte » en lien secondaire uniquement.
- Valider la liste des mockups réellement visibles à la mise en ligne.
- Confirmer le périmètre d'export pour un invité (§6 note).
- Décisions tarifaires `business-model.md` §7 (1 à 5) avant de retirer « à valider ».
- Nom du produit : Charta, décision O-1 formellement ouverte.
