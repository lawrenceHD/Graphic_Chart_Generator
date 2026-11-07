# QUEUE — demandes entre rôles

> Un rôle qui a besoin d'une modification hors de son périmètre l'écrit ici. Le propriétaire du fichier la traite.
> Format : `- [ ] <de> → <vers> : <demande> (critère de fin : …)`

(vide)
- [ ] R5 → R7 : `landing/examples` + `DemoSheet` générique (prop d'exemple), et retirer les clés `landing.*` de `messages/{fr,en}.json` devenues inutilisées (critère : `listExamples()` renvoie les 3 marques, atelier sans importer `demo.ts`).
- [ ] R5 → R0 : exclure `prototypes/showcase-flow` de `prettier --check` (`.prettierignore`), `pnpm verify` échoue sur 13 fichiers du prototype (critère : `pnpm format:check` vert).
- [ ] R5 → R7 : `product.*.json` est ma fusion de messages ; l'intégrer dans `fr.json`/`en.json` si vous préférez un seul fichier.
