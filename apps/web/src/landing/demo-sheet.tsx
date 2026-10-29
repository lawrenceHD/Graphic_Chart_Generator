'use client';

import type { PageType } from '@app/contracts';
import { RENDERERS } from '../studio/pages/pages';
import { SHEET_WORDS } from '../studio/pages/sheet-words';
import { orderedPages } from '../studio/workspace/brand-view';
import { DEMO_DOCUMENT, DEMO_VIEW } from './demo';

// A page of the La Mèza example, drawn by the studio's own renderers: what the landing shows is what the
// product composes, at any size (the sheet scales with its container).
const PAGES = orderedPages(DEMO_DOCUMENT).filter((page) => page.type !== 'mockup');
const YEAR = 2026;

export function DemoSheet({ type }: { readonly type: Exclude<PageType, 'mockup'> }) {
  const index = PAGES.findIndex((page) => page.type === type);
  const page = PAGES[index];
  if (page === undefined) return null;
  const Renderer = RENDERERS[type];
  return (
    <Renderer
      context={{
        view: DEMO_VIEW,
        words: SHEET_WORDS[DEMO_VIEW.language],
        number: index + 1,
        total: PAGES.length,
        portrait: false,
        title: page.title,
        background: undefined,
        year: YEAR,
      }}
    />
  );
}

export function demoTitle(type: PageType): string {
  return PAGES.find((page) => page.type === type)?.title ?? type;
}
