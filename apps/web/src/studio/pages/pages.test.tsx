import type { PageType } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import { RENDERERS } from './pages';
import { SHEET_WORDS } from './sheet-words';
import type { SheetContext } from './sheet';

type Rendered = Exclude<PageType, 'mockup'>;

// Same title and number for every page: only the rank can make two renderings differ.
function render(
  type: Rendered,
  index: number,
  count: number,
  evidence: readonly string[] = [],
): string {
  const Renderer = RENDERERS[type];
  const context: SheetContext = {
    view: DEMO_VIEW,
    words: SHEET_WORDS[DEMO_VIEW.language],
    number: 1,
    total: 16,
    portrait: false,
    title: 'Page',
    background: undefined,
    year: 2026,
    occurrence: { index, count },
    evidence,
  };
  return renderToStaticMarkup(<Renderer context={context} />);
}

const distinct = (type: Rendered, count: number): number =>
  new Set(Array.from({ length: count }, (_, index) => render(type, index, count))).size;

describe('cover', () => {
  it('carries the title, the edition and the logo of the brand, whatever cover its tone selects', () => {
    const words = SHEET_WORDS[DEMO_VIEW.language];
    const html = render('cover', 0, 1);
    expect(html).toContain(words.guideline);
    expect(html).toContain(words.edition(2026));
    expect(html).toMatch(/<img[^>]*alt="[^"]+"/u);
    expect(html.match(/<h1/gu)).toHaveLength(1);
  });

  it('does not repeat itself when a guideline holds two covers', () => {
    expect(render('cover', 0, 2)).not.toBe(render('cover', 1, 2));
  });
});

describe('pages of one type never repeat', () => {
  it.each(['palette', 'typography', 'do-dont'] as const)('%s, 11 pages', (type) => {
    expect(distinct(type, 11)).toBe(11);
  });

  it.each([
    ['manifesto', 4],
    ['logo', 4],
    ['clear-space', 3],
    ['contrast', 2],
  ] as const)('%s has its own content on each of its %i first pages', (type, capacity) => {
    expect(distinct(type, capacity)).toBe(capacity);
  });

  it.each(['manifesto', 'logo', 'clear-space', 'contrast'] as const)(
    '%s says so past its content instead of repeating a page',
    (type) => {
      const html = render(type, 9, 11);
      expect(html).toContain(SHEET_WORDS.fr.beyond(9));
      expect(html).not.toBe(render(type, 0, 11));
    },
  );

  it('the first manifesto page stays the single-page rendering', () => {
    expect(render('manifesto', 0, 4)).toBe(render('manifesto', 0, 1));
  });
});

describe('palette pages', () => {
  it('show only the colours of their group', () => {
    const accent = render('palette', 1, 3);
    expect(accent).toContain(DEMO_VIEW.colors.accent);
    expect(accent).not.toContain(`>${SHEET_WORDS.fr.roles.primary}<`);
  });
});

describe('evidence', () => {
  it('shows the references at the foot of the page', () => {
    const html = render('palette', 0, 1, ['logo.svg', 'site: couleurs']);
    expect(html).toContain('Preuve : logo.svg, site: couleurs');
  });

  it('shows nothing without evidence', () => {
    expect(render('palette', 0, 1)).not.toContain('Preuve');
  });
});

describe('sheet rules', () => {
  it('uses no monospace face on the sheets', () => {
    for (const type of ['palette', 'do-dont', 'typography', 'manifesto', 'logo'] as const)
      for (let index = 0; index < 4; index += 1)
        expect(render(type, index, 4)).not.toMatch(/monospace|font-mono/u);
  });
});
