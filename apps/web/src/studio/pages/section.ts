import { GuidelineSectionSchema, type GuidelineSection, type PageType } from '@app/contracts';
import { z } from 'zod';
import type { SceneId } from '../mockups/mockup-stage';

// A page drawn by its guideline section (ADR-035), read from `page.data.section`. Older documents have
// none: their pages keep the views chosen by rank (variant.ts).

const SectionData = z.object({ section: GuidelineSectionSchema });

export function sectionOfData(data: unknown): GuidelineSection | null {
  const parsed = SectionData.safeParse(data);
  return parsed.success ? parsed.data.section : null;
}

export interface OutlineEntry {
  readonly type: PageType;
  readonly title: string;
  readonly section: GuidelineSection | null;
}

/** The pages of the document in reading order, as the contents page and the renderers read them. */
export function outlineOf(
  pages: readonly { readonly type: PageType; readonly title: string; readonly data: unknown }[],
): readonly OutlineEntry[] {
  return pages.map(({ type, title, data }) => ({ type, title, section: sectionOfData(data) }));
}

/**
 * Section of the page drawn at `number` (from 1). The canvas and the print view number pages in reading
 * order, as the outline does; type and title must agree, so a stale outline never mislabels a page.
 */
export function sectionAt(
  outline: readonly OutlineEntry[] | undefined,
  number: number,
  type: PageType,
  title: string,
): GuidelineSection | null {
  const entry = outline?.[number - 1];
  return entry !== undefined && entry.type === type && entry.title === title ? entry.section : null;
}

export function manifestoBySection(
  section: GuidelineSection | null,
): 'contents' | 'overview' | null {
  if (section === 'contents' || section === 'closing') return 'contents';
  return section === 'brand-story' || section === 'values' ? 'overview' : null;
}

export function logoBySection(
  section: GuidelineSection | null,
): 'construction' | 'variants' | null {
  if (section === 'logo' || section === 'logo-construction') return 'construction';
  return section === 'logo-variants' ? 'variants' : null;
}

export function typeBySection(section: GuidelineSection | null): 'families' | 'hierarchy' | null {
  if (section === 'typography') return 'families';
  return section === 'type-hierarchy' ? 'hierarchy' : null;
}

export type MockupSectionView =
  | { readonly kind: 'scenes'; readonly scenes: readonly [SceneId, SceneId, SceneId] }
  | { readonly kind: 'pattern' }
  | { readonly kind: 'missing' };

// Each application section shows scenes of its own subject. The library has no vehicle: that page says
// so instead of showing a sign in its place.
const SCENES: Partial<Record<GuidelineSection, readonly [SceneId, SceneId, SceneId]>> = {
  stationery: ['business-cards-sage', 'a4-sheet', 'stationery-flatlay'],
  menu: ['menu-table', 'place-cards', 'napkin-plate'],
  packaging: ['paper-bag', 'gift-box', 'mailer-box-blue'],
  signage: ['storefront-sign', 'blade-sign-street', 'poster-frame-console'],
  'social-media': ['phone-table', 'cards-floating', 'laptop-desk'],
  website: ['laptop-desk', 'phone-table', 'notebook-flatlay'],
  merchandise: ['mug-white', 'tote-terracotta', 'notebook-flatlay'],
  uniform: ['apron', 'tote-terracotta', 'invitation'],
};

export function mockupBySection(section: GuidelineSection | null): MockupSectionView | null {
  if (section === null) return null;
  if (section === 'pattern') return { kind: 'pattern' };
  const scenes = SCENES[section];
  if (scenes !== undefined) return { kind: 'scenes', scenes };
  return section === 'vehicle' ? { kind: 'missing' } : null;
}

/**
 * Fallback of a face of the catalogue, by its class: Georgia for a serif, Arial for a sans. Both ship with
 * Windows and macOS, so a document made in an office suite keeps the class of the brand face.
 */
export function fallbackOf(css: string): { readonly office: string; readonly web: string } {
  return /,\s*serif\s*$/u.test(css)
    ? { office: 'Georgia', web: 'Georgia, serif' }
    : { office: 'Arial', web: 'Arial, Helvetica, sans-serif' };
}

export type TypeLevel = 'h1' | 'h2' | 'h3' | 'lead' | 'body' | 'caption';

export interface TypeRow {
  readonly level: TypeLevel;
  readonly pt: number;
  readonly px: number;
  readonly leadingPt: number;
  /** Tracking in thousandths of an em (InDesign's unit; CSS letter-spacing = value / 1000 em). */
  readonly tracking: number;
  readonly family: 'display' | 'text';
  readonly weight: number;
}

/** Body text of the scale: 10 pt in print, 16 px on screen (the browser default). */
export const SCALE = { bodyPt: 10, bodyPx: 16, ratio: 1.25 } as const;

const LEVELS: readonly {
  readonly level: TypeLevel;
  readonly step: number;
  readonly leading: number;
  readonly tracking: number;
  readonly family: 'display' | 'text';
  readonly weight: number;
}[] = [
  { level: 'h1', step: 4, leading: 1.2, tracking: -20, family: 'display', weight: 700 },
  { level: 'h2', step: 3, leading: 1.2, tracking: -10, family: 'display', weight: 600 },
  { level: 'h3', step: 2, leading: 1.2, tracking: 0, family: 'display', weight: 600 },
  { level: 'lead', step: 1, leading: 1.25, tracking: 0, family: 'text', weight: 500 },
  // 1.5 for running text: WCAG 2.2 success criterion 1.4.12 (text spacing).
  { level: 'body', step: 0, leading: 1.5, tracking: 0, family: 'text', weight: 400 },
  { level: 'caption', step: -1, leading: 1.5, tracking: 0, family: 'text', weight: 500 },
];

const half = (value: number): number => Math.round(value * 2) / 2;

/** The hierarchy of the charter: a modular scale of ratio 1.25 (major third) on a 10 pt / 16 px body. */
export function typeScale(): readonly TypeRow[] {
  return LEVELS.map(({ level, step, leading, tracking, family, weight }) => {
    const pt = half(SCALE.bodyPt * SCALE.ratio ** step);
    return {
      level,
      pt,
      px: Math.round(SCALE.bodyPx * SCALE.ratio ** step),
      leadingPt: half(pt * leading),
      tracking,
      family,
      weight,
    };
  });
}

/** Section of the page a renderer draws (null: older document, or a view built without one). */
export function sectionOf(
  context: {
    readonly view: { readonly outline?: readonly OutlineEntry[] };
    readonly number: number;
    readonly title: string;
  },
  type: PageType,
): GuidelineSection | null {
  return sectionAt(context.view.outline, context.number, type, context.title);
}
