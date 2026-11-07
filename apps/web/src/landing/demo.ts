import type { BrandDocument } from '@app/document';
import type { BrandView } from '../studio/workspace/brand-view';
import { builtExample } from './examples/build';

// The landing shows a real guideline composed by Charta from a demonstration brand. Which brand is data
// (landing/examples/data), never code: ask for one by identifier with demoFor(id).
export function demoFor(id?: string): {
  readonly document: BrandDocument;
  readonly view: BrandView;
} {
  const { document, view } = builtExample(id);
  return { document, view };
}

const DEFAULT = demoFor();

export const DEMO_DOCUMENT: BrandDocument = DEFAULT.document;
export const DEMO_VIEW: BrandView = DEFAULT.view;
