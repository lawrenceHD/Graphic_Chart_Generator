import { apply } from '@app/document';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../brand/color';
import { DEMO_DOCUMENT } from '../../landing/demo';
import { insightsOf, reachContrast, suggestionsOf } from './insights';

const BRIEF = [
  '# LA MEZA — Brief',
  '- **Vision** : recréer des espaces de rencontre authentiques et bienveillants.',
  '- **Mission** : organiser des rencontres conviviales de 6 à 10 convives.',
].join('\n');

const blank = {
  ...DEMO_DOCUMENT,
  brand: { ...DEMO_DOCUMENT.brand, mission: '', vision: '' },
};

describe('copilot findings (measured, with their fixing command)', () => {
  it('finds the closest readable lightness of a colour', () => {
    const fixed = reachContrast('#E3C884', '#FCF3F0');
    expect(fixed).not.toBeNull();
    expect(contrastRatio(fixed ?? '', '#FCF3F0')).toBeGreaterThanOrEqual(4.5);
    // Closest: one step lighter would fail again.
    expect(contrastRatio(fixed ?? '', '#FCF3F0')).toBeLessThan(5.2);
  });

  it('proposes a fix for each colour unreadable as text, as a command that applies', () => {
    const insights = insightsOf(DEMO_DOCUMENT, null);
    const fixes = insights.filter((insight) => insight.kind === 'contrast-fix');
    expect(fixes.map((fix) => fix.role)).toEqual(['primary', 'accent']);
    for (const fix of fixes) {
      expect(fix.ratio).toBeLessThan(4.5);
      expect(fix.proposedRatio).toBeGreaterThanOrEqual(4.5);
      expect(apply(DEMO_DOCUMENT, fix.command).ok).toBe(true);
    }
  });

  it('quotes the brief for the mission and vision instead of inventing them', () => {
    const insights = insightsOf(blank, BRIEF);
    const fromBrief = insights.find((insight) => insight.kind === 'texts-from-brief');
    expect(fromBrief).toMatchObject({
      mission: 'organiser des rencontres conviviales de 6 à 10 convives.',
      vision: 'recréer des espaces de rencontre authentiques et bienveillants.',
    });
    const pending = insightsOf(blank, null).find((insight) => insight.kind === 'texts-pending');
    expect(pending).toEqual({ kind: 'texts-pending', hasBrief: false });
  });

  it('offers quick edits that are all valid commands on the document', () => {
    for (const suggestion of suggestionsOf(DEMO_DOCUMENT)) {
      let document = DEMO_DOCUMENT;
      for (const command of suggestion.commands) {
        const applied = apply(document, command);
        expect(applied.ok, suggestion.id).toBe(true);
        if (applied.ok) document = applied.value.doc;
      }
    }
  });
});
