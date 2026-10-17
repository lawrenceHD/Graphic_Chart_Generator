# P-001b — Recherche documentaire : marché africain (focus Afrique francophone)

> Statut : **proposition — non validée** — recherche du 2026-10-17
> Complète `P-001_ENTRETIENS_UTILISATEURS.md`. **Ne remplace pas des entretiens** : une recherche en ligne
> montre ce qui est publié (prix, concurrents, usages), pas ce que ressentent tes futurs clients.
> Limite : les groupes Facebook privés ne sont pas accessibles sans compte ; aucun témoignage Facebook n'a pu être lu.
> Niveau de confiance noté pour chaque constat : **fort** (source primaire ou plusieurs sources concordantes),
> **moyen** (une source crédible), **faible** (blog, vendeur, source unique ou non vérifiée).

## 1. Verdict par hypothèse (H1 à H6 de P-001)

| # | Hypothèse | Ce que disent les sources | Verdict | Confiance |
|---|---|---|---|---|
| H1 | Les entreprises ayant un logo souffrent d'une identité incohérente | Pas de mesure directe en Afrique francophone. En Afrique du Sud, une étude sur 265 PME constate une faible orientation marque [1] ; une étude 2026 (384 répondants) montre que les entrepreneurs informels voient le branding comme une **dépense non essentielle**, mais qu'un minimum de cohérence améliore visibilité et fidélité [2]. Le marché des services « logo flou → vectoriel », « l'imprimeur refuse mon fichier » [3] montre une douleur concrète, mais **sur les fichiers**, pas sur la « charte ». | **Plausible, mais la douleur porte sur les fichiers utilisables, pas sur la cohérence** | Faible à moyenne |
| H2 | Ils ont déjà payé pour résoudre le problème | Agences camerounaises : forfait logo + carte + plaquette à **50 000 FCFA**, logo + charte à **150 000 FCFA**, premium dès 300 000 FCFA [4] ; Nigeria : logo de ₦5 000 à ₦50 000, identité complète de ₦50 000 à ₦300 000 [5]. Les graphistes eux-mêmes sous-facturent [5]. | **Oui, mais pour de petits montants**, et la charte est souvent vendue avec le logo | Moyenne |
| H3 | L'exactitude (contrastes, couleurs calculées) compte | Aucune source n'en parle côté entrepreneurs. Les plaintes visibles portent sur des **logos flous, des fichiers JPG ou capturés, inutilisables chez l'imprimeur** [3]. | **Non démontré** : reformuler la promesse en « fichiers qui marchent partout » | Faible |
| H4 | Les designers freelance gagneraient du temps | Pas de donnée directe. Indice : les graphistes nigérians sous-facturent et cherchent à vendre des livrables plus complets [5] ; Adobe a lancé en avril 2026 un générateur de chartes **pour Illustrator**, donc pour des designers [6]. | **Plausible et peut-être le meilleur segment payant** | Faible |
| H5 | Les développeurs veulent des tokens | Aucune donnée trouvée pour l'Afrique. | **Non documenté** | — |
| H6 | Un prix acceptable existe | Repères : Canva Pro Nigeria **₦5 500/mois ou ₦44 000/an** après une hausse [7] ; Looka ≈ **96 $/an** [8] ; Brandmark **35 à 195 $ en paiement unique** [9] ; un outil gratuit fait déjà une partie du travail [10]. La carte bancaire et l'abonnement sont des freins ; le mobile money domine (voir §3). | **Paiement unique, petit montant, mobile money** | Moyenne |

## 2. Concurrence (vérifiée le 2026-10-17)

| Produit | Accepte un logo existant ? | Ce qu'il produit | Prix | Confiance / source |
|---|---|---|---|---|
| **colorcodes.io — Brand Guide Generator** | **Oui** | Extraction de palette depuis le logo, dans le navigateur ; dégradés de teintes ; ratios de contraste (sans verdict WCAG) ; HEX/RVB/CMJN/HSL ; typographie ; page usage avec do/don't ; **PDF**. Variantes **non générées** (à fournir) ; pas de zone d'exclusion ; pas de tokens. | **Gratuit** | Fort (page de l'outil) [10] |
| **Adobe — Brand Guidelines Generator** (Illustrator) | Oui | Couverture, variantes de logo, interdits, palette, typographie, applications ; plans de travail modifiables. Exige Illustrator 2023+. | Abonnement Adobe | Moyenne [6] |
| **Brandmark** | Non (crée un logo) | Logo ; guide de marque à partir de 95 $ | 35 / 95 / 195 $ (unique) | Fort (page tarifs) [9] |
| **Looka** | Non indiqué | Logo, kit de marque, modèles réseaux sociaux ; guide « basique » selon les comparatifs | 20 / 65 $ (unique), ≈ 96 $/an (kit) | Moyenne (tiers concordants) [8][11] |
| **Canva Brand Kit** | Oui (stockage) | Range logo, couleurs, polices pour les modèles. **Aucun guide, aucune variante, aucun contraste.** | Pro (prix locaux au Nigeria, au Kenya…) | Moyenne [7][12] |
| **Brand AI** (Nairobi) | Profil de marque | Plateforme de gestion de marque et de designs ; **38 102 entreprises inscrites**, présente au Nigeria et en Afrique du Sud | Non trouvé | Moyenne (presse kényane, sept. 2026) [13] |
| Magnt, BrandBookPro, Brandize, SVG Genie… | Variable | Générateurs de guides souvent « minces » (une couleur et une police, sans vraies règles) | 0 à 50 $ | Faible (pages vendeurs) [11][14] |

**Constat important :** la combinaison « extraction de palette + contrastes + PDF » existe déjà **gratuitement** (colorcodes.io). Elle ne suffit donc pas à différencier le produit. Ce qu'aucun concurrent trouvé ne fait ensemble :
1. **Générer** les variantes (noir, blanc, favicon) à partir d'un logo existant, y compris d'un **JPG flou** (vectorisation avec score de fidélité) ;
2. Contrastes avec **verdict WCAG** et combinaisons recommandées ;
3. Textes de marque **en français**, adaptés au contexte local ;
4. Paiement en **mobile money**, en FCFA.

## 3. Contexte d'usage en Afrique francophone

| Constat | Implication produit | Confiance |
|---|---|---|
| Cameroun : **55,5 % mobile / 44,5 % ordinateur** (août 2026) [15]. L'ordinateur pèse encore beaucoup (sites suivis par StatCounter, biais possible). | Studio utilisable sur ordinateur **et** consultation / partage parfaits sur téléphone. | Moyenne |
| Afrique subsaharienne : 1 Go coûte en moyenne **2,4 % du revenu mensuel** ; un appareil 4G environ 26 % du PIB mensuel par habitant [16]. | Budgets de poids stricts ; mockups 4K **optionnels**, PDF léger, aperçus compressés. | Moyenne |
| Le commerce passe par **WhatsApp et Facebook** : 74 % de PME informelles sud-africaines préfèrent WhatsApp [17] ; 69 % des utilisateurs de réseaux sociaux au Nigeria ont déjà acheté ou vendu par ce biais [18]. | Les livrables les plus utiles sont **aux formats WhatsApp / Facebook** (photo de profil, couverture, statut, catalogue). Aujourd'hui « kits réseaux sociaux » est **hors MVP** : à reconsidérer. | Moyenne |
| Paiement : pas de Stripe au Cameroun ; Paystack (Stripe) en couverture limitée en Côte d'Ivoire ; rails dominants : **MTN MoMo, Orange Money, Wave** [19]. CinetPay : frais d'environ 2,5 à 3,5 % [20], mais **incident de cybersécurité et retards de paiement signalés en 2025** [20]. CamPay relie MTN et Orange au Cameroun [19]. | Paiement **à l'acte** (export payant) plutôt qu'abonnement ; agrégateur mobile money à choisir avec prudence (diligence sur CinetPay, NotchPay, CamPay). | Moyenne |
| Canva multiplie ses prix locaux et reste l'outil dominant des petites entreprises et créateurs [7][21]. | Ne pas concurrencer Canva : **l'alimenter** (export d'un kit importable dans Canva : couleurs, polices, logos). | Moyenne |
| Dépôt de marque OAPI : la représentation du logo est demandée (fichier vectoriel et PNG selon un blog), coût total d'environ 600 000 FCFA [22]. | Piste : export « représentation du logo pour dépôt » ; **à vérifier** dans le guide officiel de l'OAPI avant toute promesse. | Faible |

## 4. Ce que ça change pour le projet

1. **Repositionner la promesse.** Au lieu de « charte exacte et accessible », plutôt : *« Ton logo, même flou, devient des fichiers propres et une charte prête à envoyer à ton imprimeur, ton graphiste et sur WhatsApp. »* L'exactitude reste la qualité interne, pas l'argument de vente.
2. **Remonter la vectorisation en priorité n°1.** C'est la douleur la plus visible (logos JPG, captures d'écran) et ce que les outils gratuits ne font pas. Le spike T-011 doit être fait en premier.
3. **Ajouter un kit WhatsApp / Facebook** (formats officiels) dans le MVP, et reporter les mockups 3D/WebGL après la bêta.
4. **Deux segments à tester en parallèle** : (a) les **graphistes**, qui revendent la charte à leurs clients : prix plus élevé, outil de productivité ; (b) les **entrepreneurs**, en paiement unique et petit montant par mobile money.
5. **Prix à tester** : environ 2 000 à 5 000 FCFA par export pour l'entrepreneur, abonnement léger pour le graphiste. Ce sont des **hypothèses de test** déduites des repères ci-dessus, pas des prix validés.
6. **Export compatible Canva** (couleurs, polices, logos) plutôt que de reproduire un éditeur de visuels.

## 5. Valider sans organiser d'entretiens

Ce que tu peux faire seul, depuis Facebook et WhatsApp, en deux à trois semaines :

1. **Questionnaire court** (Google Forms, 7 questions tirées de P-001 §3, parties 2, 3 et 5) publié dans 3 à 5 groupes Facebook d'entrepreneurs et de graphistes camerounais et ivoiriens, et sur ton statut WhatsApp. Objectif : 30 réponses. Les questions portent sur **la dernière fois** que le problème est arrivé, pas sur des intentions.
2. **Offre « concierge »** : proposer gratuitement à 5 entreprises de transformer leur logo en fichiers propres et en charte, faite à la main ou avec les outils existants. Observer ce qu'elles utilisent vraiment une semaine après.
3. **Page de test** : une page qui décrit l'offre, avec un prix affiché et un bouton « Être prévenu » relié à WhatsApp. Le taux de clic mesure l'intérêt réel.
4. **Publication-test dans les groupes de graphistes** : « Combien de temps vous prend la charte d'un client ? Qu'est-ce qui est le plus pénible ? » Les réponses publiques sont des verbatims exploitables.

Critère de passage suggéré : au moins **10 personnes** laissent un contact WhatsApp et au moins **3** acceptent de payer un export (ou une précommande) au prix testé.

## 6. Sources

1. [SME brand development in an emerging economy — ResearchGate](https://www.researchgate.net/publication/384852674_Small_and_medium-sized_enterprise_brand_development_in_an_emerging_economy_The_view_of_the_ownermanager)
2. [Branding as a Strategic Constraint — Retail and Marketing Review, mars 2026](https://retailandmarketingreview.co.za/previous-issues/volume-22-issue-1-march-2026/branding-as-a-strategic-constraint-enhancing-identity-and-visibility-in-south-africas-informal-micro-textile-sector/)
3. [ComeUp — services de vectorisation de logo flou](https://comeup.com/fr/service/533776/transformer-votre-logo-flou-en-fichier-vectoriel-net-et-redimensionnable-a-l-infini)
4. [Promillys Cameroun — tarifs](https://promillys.cm/nos-tarifs/)
5. [Profolio.ng — salaires graphistes Nigeria](https://www.profolio.ng/graphic-designer/salary-guide) ; [Naijasabi — graphic design business Nigeria 2026](https://naijasabi.com.ng/how-to-start-graphic-design-business-nigeria-2026-canva-adobe-clients/)
6. [Adobe Exchange — Brand Guidelines Generator](https://exchange.adobe.com/apps/cc/205093/brand-guidelines-generator)
7. [Innovation Village — Canva hausse le prix de Pro au Nigeria](https://innovationvillage-newsletter.beehiiv.com/p/canva-hikes-pro-subscription-in-nigeria)
8. [Toolradar — Looka pricing](https://toolradar.com/tools/looka/pricing) ; [PricingSaaS — Looka](https://pricingsaas.com/companies/looka)
9. [Brandmark — pricing](https://brandmark.io/pricing/)
10. [colorcodes.io — Brand Guide Generator](https://colorcodes.io/brand-guide-generator)
11. [SVG Genie — comparatif de 7 outils (2026, rédigé par un concurrent)](https://www.svggenie.com/blog/ai-brand-identity-tools-compared-2026)
12. [Style Factory — Canva Pro vs Free (2026)](https://www.stylefactoryproductions.com/blog/canva-pro-vs-free)
13. [The Standard (Kenya) — Brand AI](https://www.standardmedia.co.ke/business/article/2001557450/how-newsroom-error-birthed-global-ai-platform)
14. [Magnt — Best brand guidelines generators 2026 (rédigé par un concurrent)](https://magnt.com/blog/best-brand-guidelines-generators-2026)
15. [StatCounter — Cameroun, mobile vs ordinateur](https://gs.statcounter.com/platform-market-share/desktop-mobile/cameroon)
16. [GSMA — The Mobile Economy Sub-Saharan Africa 2024](https://event-assets.gsma.com/pdf/GSMA_ME_SSA_2024_Web.pdf) ; [TechAfrica News — checkpoint 2025 vs 2026](https://techafricanews.com/2026/03/05/2025-vs-2026-mobile-industry-checkpoint-has-anything-actually-changed-for-africa/)
17. [AVODA Group — WhatsApp & TikTok commerce en Afrique](https://avodagroup.org/whatsapp-tiktok-commerce-africa/)
18. [Sagaci Research — Rise of social commerce in Africa](https://sagaciresearch.com/rise-of-social-commerce-in-africa/)
19. [Dodo Payments — Accept payments in Africa](https://dodopayments.com/blogs/accept-payments-africa) ; [DEV — Paiements au Cameroun avec CamPay](https://dev.to/agbor_thomasayukcarmelo/mobile-money-is-the-api-youre-missing-shipping-payments-in-cameroon-with-campay-296d)
20. [Kolonell — CinetPay, tarifs 2026](https://kolonell.com/fr/blog/cinetpay-integration-tarifs-commissions-cote-ivoire-2026) ; [TechCabal — CinetPay](https://techcabal.com/fr/?p=179865)
21. [The Kenya Times — Africa's Digital Economy 2026](https://thekenyatimes.com/latest-kenya-times-news/africas-digital-economy/)
22. [Kolonell — Marque OAPI, coût et procédure 2026](https://kolonell.com/fr/blog/marque-commerciale-oapi-depot-cout-procedure-2026) ; [OAPI — guide de dépôt des marques (sgg.cg)](https://www.sgg.cg/txts-droit-reg/OAPI-Guide-depot-marques.pdf)
