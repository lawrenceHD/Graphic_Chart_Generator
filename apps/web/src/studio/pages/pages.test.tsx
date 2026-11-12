import type { GuidelineSection, PageType } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import { RENDERERS } from './pages';
import { SHEET_WORDS } from './sheet-words';
import type { SheetContext } from './sheet';
import type { BrandView } from '../workspace/brand-view';
import type { OutlineEntry } from './section';
import { SECTION_WORDS } from './section-words';

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

// ADR-035: a page drawn by the section its plan gave it, read from the document outline.
function renderSection(
  type: PageType,
  section: GuidelineSection,
  view: BrandView = DEMO_VIEW,
): string {
  const outline: readonly OutlineEntry[] = [
    { type: 'cover', title: 'Couverture', section: 'cover' },
    { type, title: 'Page', section },
    { type: 'palette', title: 'Couleurs', section: 'palette' },
  ];
  const Renderer = RENDERERS[type];
  const context: SheetContext = {
    view: { ...view, outline },
    words: SHEET_WORDS[view.language],
    number: 2,
    total: 3,
    portrait: false,
    title: 'Page',
    background: undefined,
    year: 2026,
    occurrence: { index: 0, count: 2 },
  };
  return renderToStaticMarkup(<Renderer context={context} />);
}

describe('pages drawn by their section', () => {
  const words = SECTION_WORDS[DEMO_VIEW.language];

  it('the contents lists every page with its number, and says what is required', () => {
    const html = renderSection('manifesto', 'contents');
    expect(html).toContain(words.contents.list);
    expect(html).toContain('Couverture');
    expect(html).toContain('Couleurs');
    expect(html).toContain(words.contents.requiredText(words.contents.pages([3])));
    expect(html).not.toContain(SHEET_WORDS.fr.manifesto.mission);
  });

  it('the brand platform keeps the manifesto, not the contents', () => {
    expect(renderSection('manifesto', 'brand-story')).not.toContain(words.contents.list);
  });

  it('the hierarchy gives every level in pt and px, with leading and tracking', () => {
    const html = renderSection('typography', 'type-hierarchy');
    expect(html).toContain('24,5 pt · 39 px');
    expect(html).toContain('10 pt · 16 px');
    expect(html).toContain('15 pt');
    for (const dont of words.hierarchy.donts) expect(html).toContain(dont);
  });

  it('the families give the fallback of each face for office suites and the web', () => {
    const html = renderSection('typography', 'typography');
    expect(html).toContain(words.families.fallback);
    expect(html).toMatch(/Georgia|Arial/u);
    expect(html).toContain(DEMO_VIEW.pairing.display.name);
    expect(html).not.toBe(renderSection('typography', 'type-hierarchy'));
  });

  it('the logo anatomy and the versions are two different pages', () => {
    expect(renderSection('logo', 'logo')).not.toBe(renderSection('logo', 'logo-variants'));
  });

  it('the visual language shows the pattern and says photography is not defined', () => {
    const html = renderSection('mockup', 'pattern');
    expect(html).toContain(words.pattern.imageryText);
  });

  it('a page with no scene for its subject says so', () => {
    expect(renderSection('mockup', 'vehicle')).toContain(words.applications.missing);
  });
});

describe('measured values', () => {
  const words = SECTION_WORDS.fr;

  it('the palette prints the share of each colour measured on the logo, and the Pantone caution', () => {
    const view: BrandView = { ...DEMO_VIEW, shares: { primary: 0.62 } };
    const html = renderSection('palette', 'palette', view);
    expect(html).toContain(words.palette.share(62));
    expect(html).toContain(words.palette.pantone);
  });

  it('the clear-space page gives the minimum of each version and what x is', () => {
    const full = { heightPx: 24, widthPx: 68, heightMm: 5, widthMm: 14.5 };
    const view: BrandView = {
      ...DEMO_VIEW,
      rules: {
        ...DEMO_VIEW.rules,
        origin: 'measured',
        clearSpaceSource: 'element',
        versions: { full },
      },
    };
    const html = renderSection('clear-space', 'clear-space', view);
    expect(html).toContain(words.clearSpace.element);
    expect(html).toContain(words.clearSpace.size('68 px', '24 px'));
    expect(html).toContain(words.clearSpace.size('14,5 mm', '5 mm'));
    expect(html).toContain(words.clearSpace.symbolNone);
  });

  it('says when the rules are defaults, not measures', () => {
    const view: BrandView = { ...DEMO_VIEW, rules: { ...DEMO_VIEW.rules, origin: 'default' } };
    expect(renderSection('clear-space', 'clear-space', view)).toContain(words.clearSpace.defaults);
  });
});
