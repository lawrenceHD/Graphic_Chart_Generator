# Décisions du propriétaire

Décisions prises en conversation, qui ne figurent pas (encore) dans `docs/`. Ajout seulement : une décision
remplacée est marquée **remplacée** avec un renvoi, jamais effacée. Les décisions antérieures au 2026-10-18 sont
reprises de `PROJECT_HANDOFF.md` (dossier de reprise du 2026-10-13).

## Addenda T-002 (2026-10-08 → 13)
- R2 retiré de la CSP de T-002, aucun domaine R2 n'étant défini. **Remplacée** par ADR-023/024 (v4.1) : l'origine
  `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` est dans `img-src` et `connect-src`.
- Extension de périmètre autorisée dans `packages/contracts/src/index.ts` pour exporter `Env` et `ProblemDetails`.

## Addenda T-003 — règles D1 à D9 (2026-10-12)
- **D1** : `zod`, `fractional-indexing`, `fast-check` (dev) autorisés en versions exactes ; ne pas réimplémenter
  l'indexation fractionnaire.
- **D2** : `Result<T,E>` avec `ok()` / `err()`. **Remplacée** par ADR-017 : `Result` vient de `@app/kernel`.
- **D3/D4** : `PageType` = `cover | manifesto | logo | clear-space | do-dont | palette | contrast | typography |
  tone-of-voice | mockup | tokens` ; plusieurs pages mockup autorisées. `PAIRING_IDS` = catalogue fermé de 8 ids ;
  autre valeur → `INVALID_COMMAND`.
- **D5** : `apply` ne génère ni identifiant ni date ; `AddPage.pageId` vient de l'appelant (repris par ADR-019).
- **D6** : `SetColorToken.source` vaut `user` par défaut, l'inverse restaure hex et source. `SetBrandField` : liste
  blanche. `SetPageField` : `title` ou clé de premier niveau existante de type chaîne. Surcharges : `background`
  hex, `layout` ∈ `split | grid | full-bleed | minimal`. Logo : ratio [0,10 ; 0,50], px entier [8 ; 512],
  mm [2 ; 100]. Position explicite conservée exactement.
- **D7/D8** : chaînes NFC ≤ 2000, refus de `<` suivi d'une lettre, `/` ou `!` ; hex en majuscules ; taille en octets
  UTF-8 de `JSON.stringify(doc)` ≤ 512 Kio ; `schemaVersion` = 1.
- **D9** : fast-check génère des documents et commandes valides ; chaque type de commande a un test d'inversion ;
  deep-freeze côté tests seulement.

## Addenda T-003 — règles R6 à R8 (2026-10-12)
- **R6** : axes de ton = 4 ids distincts, entiers 0–100 ; 3 exemples ≤ 200 ; `VariantRef` (≤ 8, `kind` unique).
- **R7** : `Page.data` = enregistrement JSON sûr (pas de `__proto__`, `constructor`, `prototype`, pas de valeur non
  sérialisable). `SelectScene` écrit `data.mockup = { sceneId, finish, foilMetal? }`.
- **R8** : `migrate(input: unknown)` → `UNKNOWN_SCHEMA_VERSION` ou `INVALID_DOCUMENT` ; identité pour un v1 valide ;
  jamais d'exception ni de mutation.
- **Inverse de `SelectScene`** : commande interne `RestoreMockup`, hors de la liste des commandes utilisateur.

## T-004 (2026-10-13)
- `pnpm-workspace.yaml` : `allowBuilds.esbuild: true` autorisé.
- GO du propriétaire sur T-004 (v4.0).
- Teinte des gris = `0`. **Remplacée** par la v4.1 (ticket T-004 test 4 bis, ADR-021) : `h = null`. GO à
  reconfirmer.

## Environnement (2026-10-13)
- Node 22 demandé. **Remplacée** par ADR-026 : Node 24 (`.nvmrc`).
- Docker inutilisable sur le poste (virtualisation désactivée) : PostgreSQL natif avec le rôle `postgres`.
  `.env.local` est rempli par le propriétaire ; l'agent ne le lit ni ne l'affiche jamais.

## 2026-10-18
- `origin/main` (PR #1, spec v4.1) est la **source de vérité**. Le travail local T-002 à T-004 est refait dessus,
  même au prix de grosses modifications ; l'ancien travail est conservé sous les tags `backup/pre-v4.1/*`.
- Importer d'ECC et de `logo-design-skill` ce qui sert au projet (sélection et raisons dans
  `.claude/skills/SOURCES.md`), ainsi que les MCP importants, pour un travail partagé entre Claude et Gemini.
- Mettre en place un CHANGELOG et des fichiers de relais écrits pendant les tâches (`journal/PROTOCOL.md`).
- L'agent a demandé, sans réponse à ce jour : pousser les branches ; corriger les 9 défauts de l'analyse du code ;
  activer les hooks ; trancher les bloqueurs de T-005, T-007 et T-010 (voir `HANDOFF.md`).
