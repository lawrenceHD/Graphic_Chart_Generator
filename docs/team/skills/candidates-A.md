# Candidats A — design, front, rendu (R3, R4, R5, R7)

> Chercheur A, 2026-11-07. Source : API GitHub non authentifiée. Rien installé, aucun script exécuté, aucun contenu téléchargé.
> Verdict de sécurité : aucun (réservé aux valideurs). « Fichiers » = blobs du dépôt entier ; l'installeur ne copie que le dossier du skill.
> Commit « à relever » = limite de débit de l'API atteinte ; le valideur doit épingler le commit HEAD au moment de la lecture.
> Déjà présents (non reproposés) : impeccable, ux-ui-agent-skills, ECC (react-patterns, frontend-a11y, nextjs-turbopack, i18n-sync, browser-qa).

| # | Dépôt | Commit | Licence | Étoiles | MàJ | Fichiers | Scripts | Rôle | Pourquoi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | anthropics/skills (seulement `frontend-design`, `theme-factory`, `brand-guidelines`, `canvas-design`, `webapp-testing`) | 2c5958ecac7c | Apache-2.0 (LICENSE.txt par skill, frontend-design vérifié) | 188 k | 2026-11-06 | 446 (5 dossiers : quelques fichiers chacun) | O (`webapp-testing` : Python) | R4, R5, R7, R3 | Source officielle. `theme-factory` et `brand-guidelines` : structure de charte ; `webapp-testing` : Playwright pour captures de rendu. Le dépôt racine n'a pas de licence : n'extraire que les dossiers avec LICENSE.txt. |
| 2 | fatihaydost/brand-identity-skill | 3ba008e57b93 | MIT | 335 | 2026-11-04 | 352 (dont evals) | O (61 `.sh/.mjs`, surtout `evals/`) | R7 | Identité de marque comme un système (logo, couleurs, typographie, kit). Cœur du métier de Charta ; copier uniquement le skill, pas `evals/`. |
| 3 | Ilm-Alan/frontend-design | à relever | MIT | 161 | 2026-09-26 | 3 | N | R4, R5 | Le plus léger : 8 directions esthétiques, aucun script. Complète impeccable sans le doubler (à comparer). |
| 4 | blakee-marcus/tailwindcss-skill | à relever | MIT | 0 | 2026-10-29 | 129 (benchmarks) | O (fixtures vite) | R5, R7 | Évite le mélange Tailwind v3/v4 (`@theme`, utile pour les tokens). Peu d'étoiles : risque de maturité. |
| 5 | vladzima/colormason | à relever | MIT | 3 | 2026-09-03 | 12 | O (2 Python) | R7 | Rampes OKLCH depuis une couleur de marque + contrôle WCAG ; recoupe `color-engine`, utile comme référence de méthode (lecture seule). |
| 6 | uxKero/anydesign | d81bd8957a21 | MIT | 241 | 2026-09-15 | 48 | O (9 : Python, capture de site) | R7 | Analyse images/sites/Figma, produit un design system. Les scripts de capture touchent le réseau : lecture seule du `SKILL.md`. |
| 7 | robert-cronin/vectorize-logo | à relever | MIT | 1 | 2026-11-04 | 9 | O (5 Python) | R3 / logo-kit | Vectorisation d'un logo raster plat en SVG par primitives ; petit, lisible, à auditer. Peu d'étoiles. |
| 8 | leonmeerfeld/logo-vectorize | à relever | MIT | 2 | 2026-10-03 | 62 (exemples) | O (11 `.mjs`) | logo-kit, R7 | Trois niveaux d'abstraction SVG ; alternative au n°7. |
| 9 | JustasMonkev/mcp-accessibility-scanner | à relever | MIT | 59 | 2026-11-07 | 271 | O (186 `.js/.ts`, paquet npm) | R5 | Serveur MCP d'audit a11y (axe + Playwright). Passe par `mcp-dependency-review` (version épinglée, jamais `npx -y`). |
| 10 | priyankark/a11y-mcp | à relever | MPL-2.0 | 53 | 2026-10-26 | non relevé | O (paquet npm) | R5 | Alternative plus petite au n°9 ; MPL-2.0 : copyleft par fichier, usage en outil sans souci. |
| 11 | Moh4696/open-3d-skills | 7b04ab4 (arbre) | MIT | 282 | 2026-10-31 | 64 | O (22 dont `install.sh`) | R3 mockups WebGL | Huit skills pour scènes three.js ; ne prendre que les skills pertinents, jamais `install.sh`. |
| 12 | viettranx/3dviz-pro-max | à relever | MIT | 1 057 | 2026-09-11 | 2 112 | O (407) | R3 mockups WebGL | Très complet en visualisation three.js, mais trop lourd : lecture seule, extraire une checklist seulement. |
| 13 | kaankiziltug/logo-design-skill | à relever | MIT | 6 216 | 2026-11-06 | 1 565 | O (15 Python : catalogue, export) | R7 | Référence logo/marque très populaire ; trop gros pour installation, bon pour lecture seule des gabarits d'export de variantes. |

## Écarté

- **Sans licence ou propriétaire** : vercel-labs/agent-skills (`web-design-guidelines`, `react-best-practices`) et vercel-labs/next-skills n'ont aucun LICENSE à la racine (API : null) ; dequelabs/axe-mcp-server-public est propriétaire ; prangishviliAbe/agent-skills, ADS-skill : NONE.
- **Périmé ou ambigu** : arvindrk/extract-design-system (dernier commit 2026-06-19, > 3 mois) ; edisonmbli/refactoring-ui-skill, artemnovitckii/claude-animation-skills, AThevon/genjutsu, netresearch-branding : NOASSERTION.
- **Hors sujet ou déjà couvert** : nexu-io/open-design, huashu-design (workspaces ou PPTX, trop larges), diagram-design (diagrammes), skills vidéo ; ux-ui-agent-skills et impeccable déjà installés.
