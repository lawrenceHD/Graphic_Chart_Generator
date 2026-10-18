---
description: Écrire un point de relais pour qu'un autre agent puisse reprendre (protocole de relais).
---

1. Mettre à jour `HANDOFF.md` : étape, dernier état vérifié avec la sortie réelle, prochaine action exacte, fichiers touchés, questions ouvertes.
2. Ajouter une ligne datée au fichier de session courant dans `journal/sessions/`.
3. Consigner toute décision du propriétaire dans `journal/OWNER_DECISIONS.md`.
4. Ajouter l'entrée `CHANGELOG.md` si un livrable est terminé.
5. Commiter sur la branche courante (`wip(<ticket>): relais — <étape>` si inachevé). Ne pousser que si le propriétaire l'a autorisé.
6. Jamais de secret ; jamais un test déclaré vert sans sa sortie réelle.
