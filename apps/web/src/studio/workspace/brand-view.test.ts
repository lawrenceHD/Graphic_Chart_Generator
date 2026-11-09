import { BrandDocumentSchema } from '@app/document';
import { describe, expect, it } from 'vitest';
import { demoFor } from '../../landing/demo';

const { document: DEMO_DOCUMENT, view: DEMO_VIEW } = demoFor('la-meza');
import { briefLead, briefStatement, orderedPages } from './brand-view';

const BRIEF = [
  "# LA MEZA — Brief d'identité visuelle",
  '',
  '> **Objet de ce document** : donner à une IA tout le contexte nécessaire.',
  '',
  '---',
  '',
  '## 1. Le projet en une phrase',
  '',
  "**LA MEZA** réunit des personnes qui ne se connaissent pas autour d'une même table. Le projet vise loin.",
  '',
  '- **Mission** : organiser et animer des rencontres conviviales.',
].join('\n');

describe('what the pages read from the brief (quoted, never invented)', () => {
  it('takes the first sentence of the prose, not the title or a quote', () => {
    expect(briefLead(BRIEF)).toBe(
      "LA MEZA réunit des personnes qui ne se connaissent pas autour d'une même table.",
    );
    expect(briefLead(null)).toBeNull();
    expect(briefLead('# Titre seulement')).toBeNull();
  });

  it('finds a labelled statement wherever it sits', () => {
    expect(briefStatement(BRIEF, ['mission'])).toBe(
      'organiser et animer des rencontres conviviales.',
    );
    expect(briefStatement(BRIEF, ['vision'])).toBeNull();
  });
});

describe('the landing example', () => {
  it('is a valid document, composed and edited by the real engine', () => {
    expect(BrandDocumentSchema.safeParse(DEMO_DOCUMENT).success).toBe(true);
    expect(DEMO_DOCUMENT.tokens.typography.pairingId).toBe('warm-serif');
    expect(DEMO_VIEW.colors.primary).toBe('#D88F7A');
    expect(orderedPages(DEMO_DOCUMENT).map((page) => page.type)).toEqual([
      'cover',
      'manifesto',
      'logo',
      'clear-space',
      'do-dont',
      'palette',
      'contrast',
      'typography',
      'tone-of-voice',
      'mockup',
      'tokens',
    ]);
  });
});
