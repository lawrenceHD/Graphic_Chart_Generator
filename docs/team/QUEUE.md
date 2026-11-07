# QUEUE — demandes entre rôles

> Un rôle qui a besoin d'une modification hors de son périmètre l'écrit ici. Le propriétaire du fichier la traite.
> Format : `- [ ] <de> → <vers> : <demande> (critère de fin : …)`

(vide)

## R3 (worker) : à brancher quand R2 aura mergé

- [ ] R3 → R2/R0 : brancher la recherche IA au worker. `apps/worker/src/research.ts` expose `ResearchPort`, `defaultResearch` (plan standard 16 pages), `replayResearch`/`loadRecordedResearch` (rejeu) et l'adaptateur `aiResearch(call)`. Quand `@app/ai` exposera une fonction qui produit un `ChartPlan`, ajouter dans `apps/worker/src/index.ts` : `research = aiResearch((input) => <fonction R2>(deps, input))` quand `aiConfigured` et pas de rejeu. Aucun autre fichier à changer (critère de fin : un test d'intégration avec transport simulé obtient un plan non standard).
- [ ] R3 → R1 : le contrat `analysis.step` plafonne `step` à 4 (`project-events.ts`) ; la recherche est donc faite dans l'étape 4 et son avertissement (`RESEARCH_UNAVAILABLE`, `RESEARCH_FAILED`, `RESEARCH_PLAN_INVALID`) est le `code` de l'événement `done` de l'étape 4. Si une étape 5 ou un événement `analysis.warning` dédié est souhaité, R1 doit étendre le contrat, puis le web (timeline) suivra.
- Configuration du rejeu (démo) : variable `RESEARCH_REPLAY_FILE` = chemin d'un JSON validé par `ChartPlanSchema`. Fichier illisible ou invalide : le worker refuse de démarrer (erreur de configuration, pas de repli silencieux).
