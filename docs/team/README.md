# docs/team — reprendre le projet avec l'équipe d'agents

Point d'entrée pour une **nouvelle conversation**. Les agents d'une conversation précédente n'existent plus : on les recrée.

## Ordre de lecture

1. `../../AGENTS.md` (prime sur tout) et `../../CLAUDE.md`
2. `STATE.md` : objectif, constats vérifiés, plan, décisions en attente
3. `ROSTER.md` : les rôles, leur périmètre, leurs skills
4. `PROTOCOL.md` : règles de parallélisme et gabarit de lancement d'un agent
5. `SKILLS-CHAIN.md` : chercheurs, valideurs, installeurs
6. `QUEUE.md` : demandes entre rôles
7. `../../journal/OWNER_DECISIONS.md`

## Rappel de l'objectif

Charta est un SaaS qui génère des chartes graphiques professionnelles pour designers à partir d'un logo et d'un brief. La Mèza est un exemple de démo, pas le produit. Le jury GDG Fest (présélection le 2026-11-09) doit voir un niveau professionnel et un SaaS crédible (compte, tarifs, parcours).

## Pour relancer l'équipe

Demander à Claude : « lis `docs/team/README.md` puis relance l'équipe selon `STATE.md` ». Il recrée les agents avec le gabarit de `PROTOCOL.md` §2.
