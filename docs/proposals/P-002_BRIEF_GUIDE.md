# P-002 — Brief guidé

> Statut : **proposition — non validée** — 2026-10-17
> Remplacerait : `docs/01_PRODUCT_MVP.md` US-03 (champ libre de 8 000 caractères comme entrée principale).
> Sources de méthode : modules 10 à 50 du skill `brand-discovery` (raison d'être, positionnement, public, archétype de Mark & Pearson, ton).

## 1. Problème

Un brief en texte libre donne à l'IA une entrée très variable. Un fondateur pressé écrit deux lignes, et le manifeste, les valeurs et le ton deviennent génériques. C'est le premier risque de qualité de l'analyse IA (`docs/07_AI_COPILOT.md` §3.4 : « si le brief est pauvre, reste générique »).

## 2. Proposition

Remplacer le champ libre par **six questions courtes**, une par écran, toutes facultatives, suivies d'un champ libre optionnel. Durée visée : **moins de 2 minutes**.

| # | Question affichée | Saisie | Champ alimenté | Technique d'origine |
|---|---|---|---|---|
| 1 | Comment s'appelle ta marque ? | Texte ≤ 60 | `brand.name` (**valeur de l'utilisateur, jamais réécrite**) | — |
| 2 | Que fais-tu, et pour qui ? | Texte ≤ 300 | `industryLabel`, contexte de `mission` | Positionnement, public |
| 3 | Si ta marque disparaissait demain, qu'est-ce qui manquerait à tes clients ? | Texte ≤ 400 | `mission`, `vision`, `values` | « Nécrologie de marque » (question projective) |
| 4 | Choisis trois mots qui décrivent ta marque | 3 puces parmi une liste fermée d'au moins 30 adjectifs, ou saisie libre ≤ 24 chacun | `archetype`, `values`, `tone.examples` | Personnalité, archétype |
| 5 | Un mot que ta marque ne doit **jamais** évoquer | Puce ou texte ≤ 24 | Contrainte négative du prompt | « Anti-personnalité » |
| 6 | Où places-tu ta marque sur ces quatre curseurs ? | 4 curseurs 0–100, position « je ne sais pas » par défaut | `tone.axes` (**valeur de l'utilisateur prioritaire sur l'IA**) | Axes de ton de `07_AI_COPILOT.md` §3.2 |
| 7 | Autre chose à savoir ? (facultatif) | Texte ≤ 8 000 | Contexte libre | Brief actuel |

Choix volontairement écarté : demander « une marque que tu admires ». L'IA risquerait d'en reproduire le style ou le vocabulaire, ce qui contredit la règle « refus des contenus usurpant une marque connue » (`07_AI_COPILOT.md` §4.2).

La liste de la question 4 remplace les « suggestions d'univers » statiques d'AC-03.2 : même contrainte (liste statique, aucun appel IA), mais elle alimente directement l'analyse.

## 3. Données

```ts
// packages/contracts — forme indicative, le schéma Zod ferait foi
type BriefAnswers = {
  brandName?: string;            // ≤ 60, NFC
  offerAndAudience?: string;     // ≤ 300
  missingIfGone?: string;        // ≤ 400
  keywords?: string[];           // 0 à 3, chacun ≤ 24
  neverEvoke?: string;           // ≤ 24
  toneAxes?: {                   // undefined = « je ne sais pas »
    formalCasual?: number;       // 0–100
    seriousPlayful?: number;
    classicAvantGarde?: number;
    soberExpressive?: number;
  };
  freeText?: string;             // ≤ 8 000
};
```

Impact sur le modèle de données : la colonne `projects.brief_text` deviendrait `projects.brief jsonb` validée par ce schéma, à l'écriture comme à la lecture (`03_DATA_MODEL.md` §1). À trancher avant T-014.

## 4. Règles pour l'IA

1. Les réponses sont insérées dans des balises `<brief_answers>`, échappées, et restent des **données** (`07_AI_COPILOT.md` §3.4).
2. **Priorité aux valeurs de l'utilisateur** : `brandName` et les curseurs renseignés sont recopiés tels quels dans le document ; l'IA ne les propose pas. Un curseur absent est proposé par l'IA.
3. `neverEvoke` devient une contrainte explicite : aucun texte généré ne doit aller dans ce sens.
4. Les trois mots doivent être **visibles** dans le résultat : au moins l'un d'eux sert de valeur ou guide l'archétype, et `rationale` explique le lien.
5. Si toutes les réponses sont vides, le comportement actuel s'applique (textes sobres et génériques).

## 5. Critères d'acceptation proposés

- **AC-03G.1** Les six questions sont facultatives et navigables au clavier ; « Passer » et « Retour » sont disponibles sur chaque écran ; la progression est annoncée (`aria-live`).
- **AC-03G.2** Médiane du temps de saisie < 2 minutes (mesure produit).
- **AC-03G.3** `brandName` et chaque curseur renseigné se retrouvent **à l'identique** dans le document généré (test automatique).
- **AC-03G.4** Aucun texte généré ne contient le mot de `neverEvoke` ni ses formes fléchies évidentes (test sur le jeu d'évaluation).
- **AC-03G.5** Jeu d'évaluation (`07_AI_COPILOT.md` §5) : chaque marque reçoit des réponses guidées. La proposition n'est adoptée que si la note humaine moyenne de pertinence progresse d'au moins **0,3 point** sur 5 par rapport au brief libre, à coût par charte comparable (±20 %).
- **AC-03G.6** Toutes les chaînes d'interface et la liste d'adjectifs existent en français et en anglais.

## 6. Documents à modifier si la proposition est validée

| Document | Changement |
|---|---|
| `01_PRODUCT_MVP.md` | US-03 réécrite ; AC-03.2 remplacé par la question 4. |
| `03_DATA_MODEL.md` | `brief_text` → `brief jsonb`. |
| `07_AI_COPILOT.md` | §3.1 entrées, §3.4 prompt, §5 jeu d'évaluation (comparaison guidé / libre). |
| `09_DESIGN_SYSTEM.md` | Composant `BriefWizard` dans la liste des composants clés. |
| `14_ADR_LOG.md` | ADR « brief guidé » si adopté. |

## 7. Questions ouvertes

1. La liste d'adjectifs est-elle commune à toutes les langues (traduction) ou propre à chaque langue ?
2. Faut-il valider cette proposition auprès des personnes interrogées (P-001) avant de l'écrire dans la spec ? Recommandation : oui, montrer les six questions en fin d'entretien.
