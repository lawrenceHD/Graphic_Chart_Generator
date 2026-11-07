import type { PageType } from '@app/contracts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEMO_VIEW } from '../../landing/demo';
import { RENDERERS } from './pages';
import { SHEET_WORDS } from './sheet-words';
import type { SheetContext } from './sheet';

function render(
  type: Exclude<PageType, 'mockup'>,
  index: number,
  count: number,
  evidence: readonly string[] = [],
): string {
  const Renderer = RENDERERS[type];
  const context: SheetContext = {
    view: DEMO_VIEW,
    words: SHEET_WORDS[DEMO_VIEW.language],
    number: index + 1,
    total: 16,
    portrait: false,
    title: `${type} ${String(index)}`,
    background: undefined,
    year: 2026,
    occurrence: { index, count },
    evidence,
  };
  return renderToStaticMarkup(<Renderer context={context} />);
}

describe.each(['palette', 'do-dont', 'typography'] as const)('%s pages of one document', (type) => {
  const count = type === 'palette' ? 3 : 2;

  it('never render two identical pages', () => {
    const pages = Array.from({ length: count }, (_, index) => render(type, index, count));
    expect(new Set(pages).size).toBe(count);
  });

  it('differ from the single-page rendering', () => {
    const single = render(type, 0, 1);
    // The first do/don't page is the logo one, which is the single-page rendering.
    for (let index = type === 'do-dont' ? 1 : 0; index < count; index += 1)
      expect(render(type, index, count)).not.toBe(single);
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
    for (const type of ['palette', 'do-dont', 'typography'] as const)
      expect(render(type, 1, 2)).not.toMatch(/monospace|font-mono/u);
  });
});
