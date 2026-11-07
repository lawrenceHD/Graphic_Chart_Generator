# QUEUE — demandes entre rôles

> Un rôle qui a besoin d'une modification hors de son périmètre l'écrit ici. Le propriétaire du fichier la traite.
> Format : `- [ ] <de> → <vers> : <demande> (critère de fin : …)`

- [ ] R7 → R9 : brancher la garde de marque sur `pnpm verify`. Elle tourne déjà dans `pnpm test` (`brand-leaks.test.ts`) ; pour une étape dédiée : `node apps/web/src/landing/examples/check-brand-names.ts` (Node 24, code de sortie 1 en cas de fuite) (critère de fin : l'étape figure dans `verify` et échoue si la marque apparaît hors tests, fixtures, `landing/examples/data`).
- [ ] R7 → R5 : `landing-hero.tsx`, `landing-sections.tsx` lisent encore `DEMO_VIEW` (exemple par défaut). Utiliser `demoFor(id)` et `<DemoSheet exampleId>` pour proposer un sélecteur d'exemples (3 marques, 2 langues) (critère de fin : la landing peut montrer chaque exemple de `EXAMPLES`). Modifs R7 déjà faites dans ces fichiers : `demo.ts`, `demo-sheet.tsx`, paramètre `brand` des clés `landing.pages.caption` et `landing.inside.lead` (`landing-sections.tsx`), un commentaire (`landing.tsx`).
- [ ] R7 → R8/R4/R5 : tests restants avec La Mèza en donnée d'entrée (worker, ai, mockup-engine, start-form, use-studio, brand-view, insights, svg-text, logo-tone, logo-dropzone) : à passer en `describe.each(EXAMPLES)` par leur propriétaire s'ils doivent dépendre d'une marque (critère de fin : plus aucun nom de marque dans un test hors `examples`).
