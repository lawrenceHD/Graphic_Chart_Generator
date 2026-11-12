import {
  CollateralLayoutSchema,
  COMPOSITIONS,
  type Box,
  type CollateralLayout,
  type LayoutNode,
} from '@app/contracts';
import { describe, expect, it } from 'vitest';
import type { BrandDocument } from '../schema.js';
import { makeDocument } from '../test-fixtures.js';
import { layoutCollateral, type CollateralInput, type MeasureText } from './layout.js';

// A text measure that behaves like a sans serif: every character takes 0.55 em.
const measure: MeasureText = (text, _font, size) => text.length * size * 0.55;
const MM_PER_PT = 25.4 / 72;
const EPS = 1e-6;

const placeholders = {
  name: 'Prénom Nom',
  role: 'Fonction',
  phone: '+00 0 00 00 00 00',
  email: 'nom@domaine',
  website: 'www.domaine',
};
const photo = { id: 'pexels-123', credit: 'Photo : Nom / Pexels' };

function poster(input: Partial<CollateralInput> = {}, document: BrandDocument = makeDocument()) {
  return layoutCollateral(
    document,
    { kind: 'poster', mood: 'warm', logo: { aspect: 3 }, photo, ...input },
    measure,
  );
}

function expectOk(result: ReturnType<typeof layoutCollateral>): CollateralLayout {
  if (!result.ok) throw new Error(`layout failed: ${JSON.stringify(result.error)}`);
  return result.value;
}

function texts(layout: CollateralLayout) {
  return layout.nodes.flatMap((node) => (node.kind === 'text' ? [node] : []));
}

function logo(layout: CollateralLayout) {
  const node = layout.nodes.find((item) => item.kind === 'logo');
  if (node?.kind !== 'logo') throw new Error('no logo');
  return node;
}

function overlaps(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
  );
}

function inside(inner: Box, outer: Box): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  );
}

function brandRoles(nodes: readonly LayoutNode[]): Set<string> {
  const roles = new Set<string>();
  for (const node of nodes) {
    if (node.kind === 'fill' || node.kind === 'motif') roles.add(node.paint.role);
    if (node.kind === 'text') roles.add(node.ink.role);
  }
  roles.delete('white');
  roles.delete('black');
  return roles;
}

const darkBrand: BrandDocument = (() => {
  const document = makeDocument();
  return {
    ...document,
    brand: { ...document.brand, archetype: 'hero' },
    tokens: {
      ...document.tokens,
      colors: {
        ...document.tokens.colors,
        primary: { hex: '#7A1E12', source: 'extracted' },
        accent: { hex: '#F2B33D', source: 'extracted' },
        neutralLight: { hex: '#F6EFE4', source: 'derived' },
        neutralDark: { hex: '#1B1410', source: 'derived' },
      },
    },
  };
})();

describe('layoutCollateral, poster (§2.1)', () => {
  it.each(COMPOSITIONS.poster.map((composition) => [composition]))(
    'builds %s within the rules of §2.0',
    (composition) => {
      for (const document of [makeDocument(), darkBrand]) {
        const layout = expectOk(poster({ composition }, document));
        expect(CollateralLayoutSchema.safeParse(layout).success).toBe(true);
        const safe = { x: 3, y: 3, w: 297 - 6, h: 420 - 6 };
        const solids: { zone: string; box: Box }[] = [];
        for (const text of texts(layout)) {
          expect(inside(text.box, safe), `${composition} ${text.zone}`).toBe(true);
          const floorPt = text.role === 'caption' ? 6 : 7;
          expect(text.size).toBeGreaterThanOrEqual(floorPt * MM_PER_PT - EPS);
          if (text.contrast !== null) {
            expect(text.contrast).toBeGreaterThanOrEqual(text.size >= 6.35 ? 3 : 4.5);
          }
          solids.push({ zone: text.zone, box: text.box });
        }
        const mark = logo(layout);
        expect(inside(mark.clearSpace, safe)).toBe(true);
        expect(inside(mark.box, mark.clearSpace)).toBe(true);
        expect(mark.box.h).toBeGreaterThanOrEqual(mark.minimum);
        expect(mark.box.w).toBeLessThanOrEqual(0.25 * 297 + EPS);
        solids.push({ zone: 'logo', box: mark.clearSpace });
        for (const [index, a] of solids.entries()) {
          for (const b of solids.slice(index + 1)) {
            expect(overlaps(a.box, b.box), `${composition}: ${a.zone} / ${b.zone}`).toBe(false);
          }
        }
        for (const node of layout.nodes) {
          if (node.kind !== 'motif') continue;
          const crossed = node.exclude.some((box) => overlaps(box, mark.clearSpace));
          expect(!overlaps(node.box, mark.clearSpace) || crossed).toBe(true);
        }
        expect(brandRoles(layout.nodes).size).toBeLessThanOrEqual(3);
      }
    },
  );

  it('places the logo top on a baseline row and the photo node only when there is a photo', () => {
    const layout = expectOk(poster({ composition: 'split' }));
    const mark = logo(layout);
    const rows = mark.box.y / layout.grid.baseline;
    expect(Math.abs(rows - Math.round(rows))).toBeLessThan(1e-6);
    expect(layout.nodes.some((node) => node.kind === 'image')).toBe(true);
    const typeOnly = expectOk(poster({ composition: 'type-only' }));
    expect(typeOnly.nodes.some((node) => node.kind === 'image')).toBe(false);
  });

  it('leads with compositionFor when no composition is asked', () => {
    expect(expectOk(poster()).composition).toBe('plate-circle');
    expect(expectOk(poster({ mood: 'strict' })).composition).toBe('split');
    expect(expectOk(poster({ photo: undefined })).composition).toBe('type-only');
  });

  it('refuses a photo composition without a photo', () => {
    expect(poster({ composition: 'split', photo: undefined })).toEqual({
      ok: false,
      error: { code: 'PHOTO_REQUIRED', composition: 'split' },
    });
  });

  it('stops the motif band of bleed-corner at the clear space of the logo it crosses', () => {
    const layout = expectOk(poster({ composition: 'bleed-corner' }));
    const motif = layout.nodes.find((node) => node.kind === 'motif');
    if (motif?.kind !== 'motif') throw new Error('no motif');
    expect(motif.exclude).toContainEqual(logo(layout).clearSpace);
    expect(motif.box.y).toBe(-3);
  });

  it('keeps a scatter motif off the mentions, but lets a 12 % watermark run under the headline', () => {
    const typeOnly = expectOk(poster({ composition: 'type-only' }));
    const scatter = typeOnly.nodes.find((node) => node.kind === 'motif');
    const mentions = texts(typeOnly).find((text) => text.zone === 'mentions');
    if (scatter?.kind !== 'motif' || !mentions) throw new Error('missing nodes');
    expect(scatter.exclude).toContainEqual(mentions.box);
    const lover: BrandDocument = {
      ...makeDocument(),
      brand: { ...makeDocument().brand, archetype: 'lover' },
    };
    const watermark = expectOk(poster({ composition: 'full-bleed', mood: 'editorial' }, lover));
    const turn = watermark.nodes.find((node) => node.kind === 'motif');
    if (turn?.kind !== 'motif') throw new Error('no motif');
    expect(turn.opacity).toBe(0.12);
    expect(turn.exclude).toEqual([]);
  });

  it('refuses a composition of another kind and a kind not built yet', () => {
    expect(poster({ composition: 'quiet' })).toEqual({
      ok: false,
      error: { code: 'COMPOSITION_NOT_IN_KIND', composition: 'quiet' },
    });
    const menu = layoutCollateral(
      makeDocument(),
      { kind: 'menu', mood: 'warm', logo: { aspect: 3 } },
      measure,
    );
    expect(menu).toEqual({ ok: false, error: { code: 'KIND_NOT_BUILT', kind: 'menu' } });
  });

  it('validates its input with Zod', () => {
    const result = layoutCollateral(makeDocument(), { kind: 'poster', mood: 'loud' }, measure);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('refuses a measure that is not a finite width', () => {
    const broken: MeasureText = () => Number.NaN;
    expect(
      layoutCollateral(
        makeDocument(),
        { kind: 'poster', mood: 'warm', logo: { aspect: 3 } },
        broken,
      ),
    ).toEqual({ ok: false, error: { code: 'INVALID_MEASURE' } });
  });

  it('is deterministic', () => {
    expect(poster({ composition: 'bleed-corner' })).toEqual(
      poster({ composition: 'bleed-corner' }),
    );
  });
});

describe('headline origin (§0.2)', () => {
  const headline = (layout: CollateralLayout) =>
    texts(layout).find((text) => text.zone === 'headline');

  it('uses the tagline first and drops the example legend', () => {
    const base = makeDocument();
    const document = { ...base, brand: { ...base.brand, tagline: 'Le goût du marché' } };
    const layout = expectOk(poster({}, document));
    expect(layout.headline).toBe('tagline');
    expect(headline(layout)?.lines.join(' ')).toBe('Le goût du marché');
    expect(layout.exampleLegend).toBe(false);
  });

  it('falls back to a tone example, shown as an example', () => {
    const layout = expectOk(poster());
    expect(layout.headline).toBe('tone-example');
    expect(headline(layout)?.lines.join(' ')).toBe('Une voix précise.');
    expect(layout.exampleLegend).toBe(true);
  });

  it('opens the second poster of a series one level further down', () => {
    const layout = expectOk(poster({ series: 1 }));
    expect(layout.headline).toBe('value');
    expect(headline(layout)?.lines.join(' ')).toBe('Soin');
  });

  it('never titles a poster with a placeholder value of compose.ts', () => {
    const base = makeDocument();
    const placeholder = (index: number) => ({ label: `Valeur ${String(index)}`, description: '' });
    const unwritten: BrandDocument = {
      ...base,
      brand: {
        ...base.brand,
        mission: '',
        vision: '',
        values: [placeholder(1), placeholder(2), placeholder(3), placeholder(4)],
        tone: { ...base.brand.tone, examples: ['', '', ''] },
      },
    };
    for (const series of [0, 1]) {
      const layout = expectOk(poster({ series }, unwritten));
      expect(layout.headline).toBe('name');
      expect(headline(layout)?.lines.join(' ')).toBe('Atelier Demo');
    }
    // A value with an empty description is not a written value, even when the mission is written.
    const halfWritten: BrandDocument = {
      ...unwritten,
      brand: { ...unwritten.brand, mission: 'Créer avec soin' },
    };
    expect(expectOk(poster({}, halfWritten)).headline).toBe('name');
  });

  it('cuts a long sentence at its punctuation, else takes the next level', () => {
    const base = makeDocument();
    const withComma = {
      ...base,
      brand: {
        ...base.brand,
        tone: {
          ...base.brand.tone,
          examples: ['Du marché au plat, sans détour ni artifice inutile', 'b', 'c'],
        },
      },
    };
    expect(headline(expectOk(poster({}, withComma)))?.lines.join(' ')).toBe('Du marché au plat');
    const noStop = {
      ...withComma,
      brand: {
        ...withComma.brand,
        tone: {
          ...withComma.brand.tone,
          examples: ['un deux trois quatre cinq six sept', 'b', 'c'],
        },
      },
    };
    const layout = expectOk(poster({}, noStop));
    expect(layout.headline).toBe('value');
  });

  it('sets the headline in capitals for bold-display', () => {
    const base = makeDocument();
    const document: BrandDocument = {
      ...base,
      tokens: { ...base.tokens, typography: { pairingId: 'bold-display' } },
    };
    const text = headline(expectOk(poster({}, document)));
    expect(text?.uppercase).toBe(true);
    expect(text?.lines.join(' ')).toBe('UNE VOIX PRÉCISE.');
  });
});

describe('logo minimum (§2.0)', () => {
  function withVersions(symbol: boolean): BrandDocument {
    const base = makeDocument();
    const size = (heightMm: number) => ({
      heightPx: 20,
      widthPx: 60,
      heightMm,
      widthMm: 3 * heightMm,
    });
    return {
      ...base,
      tokens: {
        ...base.tokens,
        logo: {
          ...base.tokens.logo,
          origin: 'measured',
          versions: symbol ? { full: size(30), symbol: size(5) } : { full: size(30) },
        },
      },
    };
  }

  it('switches to the symbol under the minimum of the full logo', () => {
    const layout = expectOk(
      layoutCollateral(
        withVersions(true),
        { kind: 'card-front', mood: 'strict', logo: { aspect: 3, symbolAspect: 1 } },
        measure,
      ),
    );
    expect(logo(layout).form).toBe('symbol');
    expect(logo(layout).minimum).toBe(5);
    expect(layout.logoRule).toBe('measured');
  });

  it('fails loudly when neither version holds', () => {
    const result = layoutCollateral(
      withVersions(false),
      { kind: 'card-front', mood: 'strict', logo: { aspect: 3 } },
      measure,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('LOGO_BELOW_MINIMUM');
  });
});

describe('business card (§2.2)', () => {
  it.each(COMPOSITIONS['card-front'].map((composition) => [composition]))(
    'builds the %s front with the logo in its clear space',
    (composition) => {
      const layout = expectOk(
        layoutCollateral(
          darkBrand,
          { kind: 'card-front', mood: 'warm', composition, logo: { aspect: 3 } },
          measure,
        ),
      );
      expect(CollateralLayoutSchema.safeParse(layout).success).toBe(true);
      const mark = logo(layout);
      expect(inside(mark.clearSpace, { x: 4, y: 4, w: 77, h: 47 })).toBe(true);
      expect(mark.box.h).toBeLessThanOrEqual(0.4 * 55 + EPS);
      expect(layout.exampleLegend).toBe(false);
    },
  );

  it('fills the back with generic examples while brand.contact is absent', () => {
    const layout = expectOk(
      layoutCollateral(
        makeDocument(),
        { kind: 'card-back', mood: 'warm', logo: { aspect: 3, symbolAspect: 1 }, placeholders },
        measure,
      ),
    );
    const contact = texts(layout).find((text) => text.zone === 'contact');
    expect(contact?.lines).toEqual(['+00 0 00 00 00 00', 'nom@domaine', 'www.domaine']);
    expect(contact?.example).toBe(true);
    expect(layout.exampleLegend).toBe(true);
    for (const text of texts(layout)) {
      expect(text.size).toBeGreaterThanOrEqual((text.zone === 'name' ? 9 : 6.5) * MM_PER_PT - EPS);
    }
  });

  it('uses brand.contact when the user typed it', () => {
    const base = makeDocument();
    const document = {
      ...base,
      brand: { ...base.brand, contact: { phone: '+237 6 99 00 11 22', website: 'lameza.cm' } },
    };
    const layout = expectOk(
      layoutCollateral(
        document,
        { kind: 'card-back', mood: 'warm', logo: { aspect: 3, symbolAspect: 1 }, placeholders },
        measure,
      ),
    );
    const contact = texts(layout).find((text) => text.zone === 'contact');
    expect(contact?.lines).toEqual(['+237 6 99 00 11 22', 'lameza.cm']);
    expect(contact?.example).toBe(false);
  });

  it('needs the placeholders for the back', () => {
    const result = layoutCollateral(
      makeDocument(),
      { kind: 'card-back', mood: 'warm', logo: { aspect: 3 } },
      measure,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_INPUT');
  });

  it('drops lines rather than going under the floor, and says so', () => {
    const base = makeDocument();
    const long = 'Une adresse très longue qui occupe plusieurs lignes dans le bloc de contact';
    const document = {
      ...base,
      brand: {
        ...base.brand,
        contact: {
          address: `${long} ${long}`,
          phone: '1',
          email: 'a@b',
          website: 'c',
          social: 'd',
        },
      },
    };
    const layout = expectOk(
      layoutCollateral(
        document,
        { kind: 'card-back', mood: 'warm', logo: { aspect: 3, symbolAspect: 1 }, placeholders },
        measure,
      ),
    );
    const contact = texts(layout).find((text) => text.zone === 'contact');
    expect(contact?.dropped).toBeGreaterThan(0);
    expect(contact?.size).toBeCloseTo(7 * MM_PER_PT, 6);
  });
});
