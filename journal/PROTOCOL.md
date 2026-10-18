# Protocole de relais entre agents

But : n'importe quel agent (Claude Code, Gemini CLI, Antigravity), sur n'importe quel poste, reprend le travail là
où le précédent s'est arrêté, **même si celui-ci a été coupé net** (limite de jetons, plantage, changement de PC).
Les conversations des agents ne sont pas partagées entre postes : seul le dépôt Git l'est.

## 1. Les fichiers et leur rôle

| Fichier | Rôle | Mode d'écriture |
|---|---|---|
| [`HANDOFF.md`](../HANDOFF.md) | **État vivant** : tâche en cours, branche, étape, prochaine action exacte, questions ouvertes | Réécrit à chaque jalon ; toujours vrai |
| [`CHANGELOG.md`](../CHANGELOG.md) | Modifications notables, par ticket (format Keep a Changelog) | Ajout à chaque ticket ou correctif livré |
| `journal/sessions/AAAA-MM-JJ-<agent>-<sujet>.md` | Journal d'une session : ce qui a marché (avec preuve), échoué (avec la raison), décidé | Ajout seulement, jamais réécrit |
| [`journal/OWNER_DECISIONS.md`](./OWNER_DECISIONS.md) | Décisions du propriétaire prises **en conversation** (arbitrages, addenda, GO) | Ajout seulement, daté, avec la source |
| `sortie tikets/T-0xx.md` | Rapport de fin de ticket (`AGENTS.md` §10) | Une fois par ticket, mis à jour si le ticket est repris |

Les spécifications (`docs/`) restent la source de vérité et ne sont modifiées que par le chef de projet. Une
décision du propriétaire qui contredit `docs/` est consignée dans `OWNER_DECISIONS.md` **et** signalée dans
`HANDOFF.md` comme « à reporter dans `docs/` ».

## 2. Quand écrire (points de relais)

1. **Démarrage** : lire `HANDOFF.md`, puis la dernière session de `journal/sessions/`, puis `git log -5` et
   `git status`. Si `HANDOFF.md` contredit Git, **Git fait foi** : corriger `HANDOFF.md` d'abord. Inscrire
   l'agent, la date et la tâche dans `HANDOFF.md` ; créer le fichier de session.
2. **Après chaque jalon** — tests écrits et rouges, tests verts, `pnpm verify` vert, sabotage fait, commit — mettre à
   jour la section « Étape » de `HANDOFF.md` (2 à 5 lignes) et ajouter une ligne au journal de session.
3. **Dès qu'une décision est donnée** par le propriétaire : l'écrire dans `OWNER_DECISIONS.md` avant de continuer.
4. **Dès qu'un blocage apparaît** : l'écrire dans « Questions ouvertes » de `HANDOFF.md` au format BLOCKER
   d'`AGENTS.md` §9.
5. **Avant de s'arrêter** (fin de session, contexte presque plein, `/compact`, interruption annoncée) :
   `HANDOFF.md` complet, puis commit de relais `wip(<ticket>): relais — <étape>` sur la branche du ticket, y compris
   pour du code non terminé. Un commit de relais ne prétend jamais que les tests passent.
6. **Fin de ticket** : rapport `sortie tikets/T-0xx.md`, entrée `CHANGELOG.md`, `HANDOFF.md` pointant le ticket
   suivant et ses dépendances.

Écrire **peu et souvent** : un relais qui n'a pas été écrit avant la coupure est perdu.

## 3. Règles

- Une affirmation sans preuve va dans « non vérifié ». « Les tests passent » exige la sortie réelle de la commande.
- Jamais de secret ni de contenu de `.env.local` dans ces fichiers.
- Les fichiers de relais sont commités **avec** le travail qu'ils décrivent. Un relais entre postes exige un
  `git push` de la branche, que l'agent ne fait **que** si le propriétaire l'a autorisé (consigné dans
  `OWNER_DECISIONS.md`).
- Un agent qui reprend ne refait pas une décision déjà consignée et ne relance pas une approche notée comme échouée
  sans raison nouvelle.

## 4. Gabarit d'un fichier de session

```markdown
# Session AAAA-MM-JJ — <agent> — <ticket ou sujet>

## Objectif
## Journal (une ligne par jalon : heure, étape, preuve)
## Ce qui a marché (preuve)
## Ce qui a échoué (raison exacte)
## Décisions (renvoi vers OWNER_DECISIONS.md si décision du propriétaire)
## État en fin de session (branche, dernier commit, verify)
```

## 5. Commandes de reprise

- Claude Code : `/reprendre` (reprise) et `/relais` (écrire un point de relais), dans `.claude/commands/`.
- Gemini CLI : `/reprendre` et `/relais`, dans `.gemini/commands/`.
- Tout autre agent : suivre §2 à la main.
