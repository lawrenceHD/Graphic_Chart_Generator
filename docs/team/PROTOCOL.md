# PROTOCOL — comment l'équipe travaille en parallèle

> Complète `AGENTS.md`, qui prime en cas de doute technique.

## 1. Règles

1. **Un rôle = un périmètre exclusif de fichiers** (colonne « Possède » de `ROSTER.md`). Un besoin hors périmètre devient une **demande dans la file** (`docs/team/QUEUE.md`), jamais une modification directe.
2. **Un worktree par rôle**, branche `comp/<rôle>-<sujet>`, fichiers possédés uniquement.
3. **Point de jonction unique** : `packages/contracts`, écrit par R1 seulement.
4. **Ordre de merge** (avance rapide, `pnpm verify` vert avant chaque merge) : contracts, puis document et ai, puis worker, puis web.
5. **Revue indépendante (RR)** relit chaque merge et peut le bloquer.
6. **Arbitrage** : R0 pour l'architecture. Le **propriétaire** pour les dépendances (ADR-026), les hooks, les secrets et le périmètre.
7. Règles du dépôt inchangées : TDD avec test de sabotage, zéro `any`, Zod aux frontières, packages purs, pas de dépense sans accord, lockfile modifié par pnpm seulement.
8. Pas de TODO dans le code (interdit par `AGENTS.md`) : l'engagement va dans un ADR.

## 2. Gabarit de lancement d'un agent de rôle

À copier dans la consigne d'un nouvel agent :

```
Rôle : <R-n, nom>. Lis dans l'ordre : AGENTS.md, docs/team/ROSTER.md, docs/team/PROTOCOL.md,
docs/team/STATE.md, le ticket concerné, le dernier ADR de docs/14_ADR_LOG.md.
Tu possèdes uniquement : <périmètre>. Tout autre besoin : écris-le dans docs/team/QUEUE.md.
Livrable : <...>. Critère d'acceptation vérifiable : <...>.
Fais passer pnpm verify, rapporte les sorties réelles des commandes, mets à jour docs/team/STATE.md.
Réponds en français, concis.
```

## 3. Reprise après fermeture de la conversation

Une nouvelle conversation lit, dans cet ordre : `AGENTS.md`, `docs/team/README.md`, `docs/team/STATE.md`, `docs/team/ROSTER.md`, `docs/team/QUEUE.md`, `journal/OWNER_DECISIONS.md`. Les agents lancés dans une conversation ne survivent pas : on les recrée avec le gabarit ci-dessus.

## 4. Mise à jour de l'état

Chaque agent termine sa tâche en mettant à jour `docs/team/STATE.md` (ce qui est fait, vérifié ou pas, blocages). Statuts autorisés, comme `docs/PROGRESS_TRACKER.md` : Spécifié, Implémenté, Vérifié.
