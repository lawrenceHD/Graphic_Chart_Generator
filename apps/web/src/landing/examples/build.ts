import { composeInitialDocument, type BrandDocument } from '@app/document';
import { brandView, type BrandView } from '../../studio/workspace/brand-view';
import type { ProjectSummary } from '../../studio/workspace/document-client';
import { DEFAULT_EXAMPLE_ID, getExample } from './index';
import type { DemoExample } from './schema';

export interface BuiltExample {
  readonly example: DemoExample;
  readonly document: BrandDocument;
  readonly view: BrandView;
}

/**
 * A real guideline, not a mock-up: the document is composed by composeInitialDocument from the example's colours
 * and texts, then read through the studio's own brandView.
 */
export function buildExample(example: DemoExample): BuiltExample {
  const project: ProjectSummary = {
    id: example.projectId,
    title: example.name,
    industryLabel: example.sector,
    language: example.language,
    briefText: example.briefText,
    status: 'ready',
  };
  const composed = composeInitialDocument({
    brandName: example.name,
    language: example.language,
    logoSanitizedId: 'demo-logo',
    colors: example.colors,
    variants: [{ assetId: 'demo-logo', kind: 'color', needsReview: false }],
    brand: {
      mission: example.mission,
      vision: example.vision,
      values: example.values,
      archetype: example.archetype,
      tone: example.tone,
      pairingId: example.pairingId,
    },
  });
  if (!composed.ok)
    throw new Error(`example ${example.id} does not compose: ${composed.error.code}`);
  const view = brandView(composed.value, project);
  return {
    example,
    document: composed.value,
    view: {
      ...view,
      written: true,
      logo: {
        color: example.logo,
        vector: null,
        'mono-black': null,
        'mono-white': null,
        favicon: null,
      },
    },
  };
}

const cache = new Map<string, BuiltExample>();

/** The built example of an identifier; the default example when the identifier is unknown or absent. */
export function builtExample(id: string = DEFAULT_EXAMPLE_ID): BuiltExample {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const example = getExample(id) ?? getExample(DEFAULT_EXAMPLE_ID);
  if (example === undefined) throw new Error('the example set is empty');
  const built = buildExample(example);
  cache.set(id, built);
  return built;
}
