# Enregistrements de recherche de démo

Un fichier `<empreinte>-png.json` par logo d'exemple (`apps/web/src/landing/examples`), validé par `parseRecording`.
La clé est l'empreinte du PNG rendu du logo : si un logo d'exemple change, régénérer.

Rejeu (aucun appel Gemini pour ces logos, même sans quota) :

    RESEARCH_RECORD_DIR=apps/worker/recordings

Le worker charge ce dossier au démarrage ; un fichier invalide est signalé (`research_recording_rejected`). En mode live
le dossier sert aussi de rejeu si Gemini échoue, et reçoit les nouveaux enregistrements.

Régénération (une recherche live par exemple, aucun retry, arrêt au premier 429) :

    AI_API_KEY=... node tools/references/record-demo.mjs [--only id1,id2]

Variables : `AI_API_KEY` (clé Gemini, jamais écrite), `AI_MODEL` (défaut `gemini-3.5-flash-lite`),
`RESEARCH_CORPUS_DIR` (corpus privé, défaut `corpus-reel` ; sans bibliothèque aucun enregistrement n'est produit).
Prérequis : `pnpm -r --filter "./packages/*" build`.

Le dossier est vide tant que la génération n'a pas été faite avec une clé valide.
