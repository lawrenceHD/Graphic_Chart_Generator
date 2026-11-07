import { z } from 'zod';
import type { PageType } from '@app/contracts';
import type { ColorRole } from '../workspace/brand-view';
import type { SceneId } from '../mockups/mockup-stage';

// A plan can ask for several pages of one type (three palettes, two do/don't, two typography, two
// mockups). Each page reads its own place among them, so that no two pages of a charter are identical.
export interface Occurrence {
  /** Place of this page among the pages of its type, from 0. */
  readonly index: number;
  /** How many pages of this type the document holds. */
  readonly count: number;
}

export const SINGLE: Occurrence = { index: 0, count: 1 };

export function occurrencesOf(
  pages: readonly { readonly type: PageType }[],
): readonly Occurrence[] {
  const count = new Map<PageType, number>();
  for (const { type } of pages) count.set(type, (count.get(type) ?? 0) + 1);
  const seen = new Map<PageType, number>();
  return pages.map(({ type }) => {
    const index = seen.get(type) ?? 0;
    seen.set(type, index + 1);
    return { index, count: count.get(type) ?? 1 };
  });
}

const ALL_ROLES: readonly ColorRole[] = ['primary', 'accent', 'neutralLight', 'neutralDark'];
const NEUTRALS: readonly ColorRole[] = ['neutralLight', 'neutralDark'];

/** Colour roles a palette page is about: all of them alone, a colour per page from three pages up. */
export function paletteRoles({ index, count }: Occurrence): readonly ColorRole[] {
  if (count <= 1) return ALL_ROLES;
  if (count === 2) return index % 2 === 0 ? ['primary', 'accent'] : NEUTRALS;
  const group: readonly (readonly ColorRole[])[] = [['primary'], ['accent'], NEUTRALS];
  return group[index % 3] ?? ALL_ROLES;
}

export type TypeFocus = 'both' | 'headings' | 'text';

export function typeFocus({ index, count }: Occurrence): TypeFocus {
  if (count <= 1) return 'both';
  return index % 2 === 0 ? 'headings' : 'text';
}

export type DoDontFocus = 'logo' | 'colours';

export function doDontFocus({ index, count }: Occurrence): DoDontFocus {
  if (count <= 1) return 'logo';
  return index % 2 === 0 ? 'logo' : 'colours';
}

// Three scenes per mockup page: the first page is the stationery, the next ones show other objects.
const SCENE_SETS: readonly (readonly [SceneId, SceneId, SceneId])[] = [
  ['cards-floating', 'a4-sheet', 'mug-white'],
  ['cards-floating', 'a4-sheet', 'cards-stack'],
  ['poster-living', 'mug-stripes', 'storefront-sign'],
  ['poster-held', 'menu-table', 'gift-box'],
  ['poster-hanging', 'place-cards', 'paper-bag'],
];

export function mockupScenes({ index, count }: Occurrence): readonly [SceneId, SceneId, SceneId] {
  if (count <= 1) return SCENE_SETS[0] ?? ['cards-floating', 'a4-sheet', 'mug-white'];
  const rest = SCENE_SETS.slice(1);
  return rest[index % rest.length] ?? ['cards-floating', 'a4-sheet', 'cards-stack'];
}

const EvidenceDataSchema = z.object({ evidence: z.array(z.string()) });

/** References of proof (a file, a page of the site, a corpus entry) the plan attached to a page. */
export function evidenceOf(data: unknown): readonly string[] {
  const parsed = EvidenceDataSchema.safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.evidence.map((entry) => entry.trim()).filter((entry) => entry !== '');
}

const EVIDENCE_SHOWN = 3;

/** One discreet line for the foot of a page, or null when the page carries no proof. */
export function evidenceLine(label: string, evidence: readonly string[]): string | null {
  if (evidence.length === 0) return null;
  const shown = evidence.slice(0, EVIDENCE_SHOWN).join(', ');
  const more = evidence.length - EVIDENCE_SHOWN;
  return `${label} : ${shown}${more > 0 ? `, +${String(more)}` : ''}`;
}
