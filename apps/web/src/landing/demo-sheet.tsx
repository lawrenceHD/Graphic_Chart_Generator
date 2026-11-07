'use client';

import type { PageType } from '@app/contracts';
import { RENDERERS } from '../studio/pages/pages';
import { SHEET_WORDS } from '../studio/pages/sheet-words';
import { orderedPages } from '../studio/workspace/brand-view';
import { demoFor } from './demo';

// A page of an example brand, drawn by the studio's own renderers: what the landing shows is what the
// product composes, at any size (the sheet scales with its container). Without `exampleId`, the default example.
const YEAR = 2026;

function pagesOf(exampleId: string | undefined) {
  const { document, view } = demoFor(exampleId);
  return { view, pages: orderedPages(document).filter((page) => page.type !== 'mockup') };
}

export function DemoSheet({
  type,
  exampleId,
}: {
  readonly type: Exclude<PageType, 'mockup'>;
  readonly exampleId?: string;
}) {
  const { view, pages } = pagesOf(exampleId);
  const index = pages.findIndex((page) => page.type === type);
  const page = pages[index];
  if (page === undefined) return null;
  const Renderer = RENDERERS[type];
  return (
    <Renderer
      context={{
        view,
        words: SHEET_WORDS[view.language],
        number: index + 1,
        total: pages.length,
        portrait: false,
        title: page.title,
        background: undefined,
        year: YEAR,
      }}
    />
  );
}

export function demoTitle(type: PageType, exampleId?: string): string {
  return pagesOf(exampleId).pages.find((page) => page.type === type)?.title ?? type;
}
