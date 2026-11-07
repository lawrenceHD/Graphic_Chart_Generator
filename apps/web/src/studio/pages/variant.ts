import { z } from 'zod';
import type { PageType } from '@app/contracts';
import type { ColorRole } from '../workspace/brand-view';
import type { SceneId } from '../mockups/mockup-stage';

// A plan can ask for several pages of one type. Each page reads its own rank among them (taken from its id,
// `page-<type>` then `page-<type>-2`..., so deleting or moving a page never changes what the others show),
// and no two pages of a type show the same thing. Past the content a type really has, a page says so
// instead of repeating another one (`beyond`): the plan should group those sections.
export interface Occurrence {
  /** Rank of this page among the pages of its type, from 0. */
  readonly index: number;
  /** How many pages of this type the document holds. */
  readonly count: number;
}

export const SINGLE: Occurrence = { index: 0, count: 1 };

export interface Beyond {
  readonly kind: 'beyond';
  readonly rank: number;
}

const beyond = (rank: number): Beyond => ({ kind: 'beyond', rank });

function rankFromId(id: string, type: PageType): number | null {
  const base = `page-${type}`;
  if (id === base) return 0;
  const suffix = id.startsWith(`${base}-`) ? id.slice(base.length + 1) : '';
  if (!/^\d+$/u.test(suffix)) return null;
  const occurrence = Number(suffix);
  return occurrence >= 2 ? occurrence - 1 : null;
}

export function occurrencesOf(
  pages: readonly { readonly id: string; readonly type: PageType }[],
): readonly Occurrence[] {
  const count = new Map<PageType, number>();
  for (const { type } of pages) count.set(type, (count.get(type) ?? 0) + 1);
  const seen = new Map<PageType, number>();
  return pages.map(({ id, type }) => {
    const position = seen.get(type) ?? 0;
    seen.set(type, position + 1);
    return { index: rankFromId(id, type) ?? position, count: count.get(type) ?? 1 };
  });
}

const NEUTRALS: readonly ColorRole[] = ['neutralLight', 'neutralDark'];
const DETAIL_ROLES: readonly ColorRole[] = ['primary', 'accent', 'neutralLight', 'neutralDark'];

export type PaletteView =
  | { readonly kind: 'overview' }
  | { readonly kind: 'roles'; readonly roles: readonly ColorRole[] }
  | { readonly kind: 'detail'; readonly role: ColorRole; readonly half: 0 | 1 }
  | Beyond;

/** Alone: the four roles. Several: primary, accent, neutrals, an overview, then each tint scale in two halves. */
export function paletteView({ index, count }: Occurrence): PaletteView {
  if (count <= 1) return { kind: 'overview' };
  if (index === 0) return { kind: 'roles', roles: ['primary'] };
  if (index === 1) return { kind: 'roles', roles: ['accent'] };
  if (index === 2) return { kind: 'roles', roles: NEUTRALS };
  if (index === 3) return { kind: 'overview' };
  const detail = index - 4;
  const role = DETAIL_ROLES[detail % 4];
  if (role === undefined || detail >= 8) return beyond(index);
  return { kind: 'detail', role, half: detail < 4 ? 0 : 1 };
}

export type GlyphSet = 'upper' | 'lower' | 'figures' | 'accents';
const GLYPH_SETS: readonly GlyphSet[] = ['upper', 'lower', 'figures', 'accents'];

export type TypeView =
  | { readonly kind: 'both' | 'headings' | 'text' }
  | { readonly kind: 'glyphs'; readonly family: 'display' | 'text'; readonly set: GlyphSet }
  | Beyond;

/** Alone: both families. Several: headings, text, both, then each family's alphabet in four sets. */
export function typeView({ index, count }: Occurrence): TypeView {
  if (count <= 1) return { kind: 'both' };
  if (index === 0) return { kind: 'headings' };
  if (index === 1) return { kind: 'text' };
  if (index === 2) return { kind: 'both' };
  const glyph = index - 3;
  const set = GLYPH_SETS[glyph % 4];
  if (set === undefined || glyph >= 8) return beyond(index);
  return { kind: 'glyphs', family: glyph < 4 ? 'display' : 'text', set };
}

// The 14 distinct panels the do/don't pages can show, in the order of the pages that enlarge one each.
export const DO_DONT_PANELS = [
  'stretch',
  'rotate',
  'recolor',
  'effect',
  'contrast',
  'busy',
  'crowd',
  'white',
  'dark',
  'primary',
  'accent',
  'same',
  'transparent',
  'ok',
] as const;
export type DoDontPanel = (typeof DO_DONT_PANELS)[number];

export type DoDontView =
  | { readonly kind: 'logo' | 'colours' }
  | { readonly kind: 'single'; readonly panel: DoDontPanel }
  | Beyond;

/** Alone: the logo page. Several: logo, colours, then one enlarged case per page. */
export function doDontView({ index, count }: Occurrence): DoDontView {
  if (count <= 1 || index === 0) return { kind: 'logo' };
  if (index === 1) return { kind: 'colours' };
  const panel = DO_DONT_PANELS[index - 2];
  return panel === undefined ? beyond(index) : { kind: 'single', panel };
}

// Every scene once; a page takes three consecutive ones, three further on than the page before, so that
// no two pages (13 at most) show the same trio.
const SCENE_ORDER: readonly SceneId[] = [
  'cards-floating',
  'a4-sheet',
  'cards-stack',
  'poster-living',
  'poster-held',
  'poster-hanging',
  'mug-white',
  'mug-stripes',
  'place-cards',
  'menu-table',
  'storefront-sign',
  'gift-box',
  'paper-bag',
];

export type MockupView =
  { readonly kind: 'scenes'; readonly scenes: readonly [SceneId, SceneId, SceneId] } | Beyond;

export function mockupScenes({ index, count }: Occurrence): MockupView {
  if (count <= 1) return { kind: 'scenes', scenes: ['cards-floating', 'a4-sheet', 'mug-white'] };
  if (index >= SCENE_ORDER.length) return beyond(index);
  const at = (offset: number): SceneId | undefined =>
    SCENE_ORDER[(index * 3 + offset) % SCENE_ORDER.length];
  const [first, second, third] = [at(0), at(1), at(2)];
  if (first === undefined || second === undefined || third === undefined) return beyond(index);
  return { kind: 'scenes', scenes: [first, second, third] };
}

export type ManifestoView =
  { readonly kind: 'overview' | 'mission' | 'vision' | 'values' } | Beyond;

export function manifestoView({ index, count }: Occurrence): ManifestoView {
  if (count <= 1) return { kind: 'overview' };
  const kinds = ['overview', 'mission', 'vision', 'values'] as const;
  const kind = kinds[index];
  return kind === undefined ? beyond(index) : { kind };
}

export type LogoView =
  { readonly kind: 'overview' | 'construction' | 'variants' | 'usages' } | Beyond;

export function logoView({ index, count }: Occurrence): LogoView {
  if (count <= 1) return { kind: 'overview' };
  const kinds = ['overview', 'construction', 'variants', 'usages'] as const;
  const kind = kinds[index];
  return kind === undefined ? beyond(index) : { kind };
}

export type ClearSpaceView = { readonly kind: 'overview' | 'zone' | 'minimum' } | Beyond;

export function clearSpaceView({ index, count }: Occurrence): ClearSpaceView {
  if (count <= 1) return { kind: 'overview' };
  const kinds = ['overview', 'zone', 'minimum'] as const;
  const kind = kinds[index];
  return kind === undefined ? beyond(index) : { kind };
}

export type ContrastView = { readonly kind: 'matrix' | 'pairs' } | Beyond;

export function contrastView({ index, count }: Occurrence): ContrastView {
  if (count <= 1) return { kind: 'matrix' };
  if (index === 0) return { kind: 'matrix' };
  return index === 1 ? { kind: 'pairs' } : beyond(index);
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
