import { composeInitialDocument, type BrandDocument } from '@app/document';
import { monochromeSvg } from '@app/logo-kit';
import { brandView, type BrandView } from '../../studio/workspace/brand-view';
import type { ProjectSummary } from '../../studio/workspace/document-client';
import { DEFAULT_EXAMPLE_ID, getExample } from './index';
import type { DemoExample } from './schema';

const SVG_URI = 'data:image/svg+xml,';
// Surfaces from this luminance on are knocked out of the one-colour drawing (lettering on a badge stays
// legible): the same threshold as logo-kit's knockout drawing.
const KNOCKOUT_LUMINANCE = 0.6;

/**
 * White and black variants of a vector example logo, computed by logo-kit's monochrome engine (the logo is
 * recoloured, never redrawn). A raster logo has none: no one-colour file is fabricated for it.
 */
export function monoVariantsOf(logo: string): {
  readonly black: string | null;
  readonly white: string | null;
} {
  if (!logo.startsWith(SVG_URI)) return { black: null, white: null };
  let svg: string;
  try {
    svg = decodeURIComponent(logo.slice(SVG_URI.length));
  } catch {
    return { black: null, white: null };
  }
  const variant = (target: '#000000' | '#FFFFFF'): string | null => {
    const made = monochromeSvg(svg, target, { lightThreshold: KNOCKOUT_LUMINANCE });
    return made.ok && made.value.path === 'structural'
      ? `${SVG_URI}${encodeURIComponent(made.value.svg)}`
      : null;
  };
  return { black: variant('#000000'), white: variant('#FFFFFF') };
}

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
  const mono = monoVariantsOf(example.logo);
  return {
    example,
    document: composed.value,
    view: {
      ...view,
      written: true,
      logo: {
        color: example.logo,
        vector: null,
        // Hand-drawn variants when the example carries them, else derived by logo-kit, else none (raster).
        'mono-black': example.monoLogos?.black ?? mono.black,
        'mono-white': example.monoLogos?.white ?? mono.white,
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
