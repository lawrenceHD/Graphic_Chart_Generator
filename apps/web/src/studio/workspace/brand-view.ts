import type { PageType, VariantKind } from '@app/contracts';
import type { BrandDocument, Page } from '@app/document';
import { PAIRINGS, type Pairing } from '../../brand/pairings';
import { assetUrl, type ProjectSummary } from './document-client';

// What every page renderer reads: the document, flattened into the values a guideline prints. Pure, so the
// canvas, the print view and the tests draw from the same source.
export type ColorRole = 'primary' | 'accent' | 'neutralLight' | 'neutralDark';
export const COLOR_ROLES: readonly ColorRole[] = [
  'primary',
  'accent',
  'neutralLight',
  'neutralDark',
];

export interface BrandView {
  readonly name: string;
  /** Language of the guideline pages: the project's, not the interface's. */
  readonly language: 'fr' | 'en';
  readonly sector: string | null;
  readonly brief: string | null;
  readonly colors: Readonly<Record<ColorRole, string>>;
  readonly extra: readonly string[];
  readonly sources: Readonly<Record<ColorRole, 'extracted' | 'derived' | 'user'>>;
  readonly pairing: Pairing;
  /** Logo files by kind; the colour logo is always there (the sanitised upload). */
  // horizontal and vertical exist only when the user supplied them (optional: older views omit them).
  readonly logo: Readonly<Record<Exclude<VariantKind, 'horizontal' | 'vertical'>, string | null>> &
    Readonly<Partial<Record<'horizontal' | 'vertical', string | null>>> & {
      readonly color: string;
    };
  readonly needsReview: readonly VariantKind[];
  readonly rules: BrandDocument['tokens']['logo'];
  readonly mission: string;
  readonly vision: string;
  readonly values: BrandDocument['brand']['values'];
  readonly tone: BrandDocument['brand']['tone'];
  readonly archetype: BrandDocument['brand']['archetype'];
  /** True once the AI (or the user) wrote the brand texts; until then the pages say so. */
  readonly written: boolean;
}

export function brandView(document: BrandDocument, project: ProjectSummary): BrandView {
  const { colors } = document.tokens;
  const variant = (kind: VariantKind): string | null => {
    const found = document.assets.variants.find((entry) => entry.kind === kind);
    return found === undefined ? null : assetUrl(found.assetId);
  };
  const brief = project.briefText?.trim() ?? '';
  const { brand } = document;
  return {
    name: brand.name,
    language: project.language,
    sector: project.industryLabel,
    brief: brief === '' ? null : brief,
    colors: {
      primary: colors.primary.hex,
      accent: colors.accent.hex,
      neutralLight: colors.neutralLight.hex,
      neutralDark: colors.neutralDark.hex,
    },
    extra: colors.extra.map((entry) => entry.hex),
    sources: {
      primary: colors.primary.source,
      accent: colors.accent.source,
      neutralLight: colors.neutralLight.source,
      neutralDark: colors.neutralDark.source,
    },
    pairing: PAIRINGS[document.tokens.typography.pairingId],
    logo: {
      color: variant('color') ?? assetUrl(document.assets.logoSanitizedId),
      vector: variant('vector'),
      'mono-black': variant('mono-black'),
      'mono-white': variant('mono-white'),
      favicon: variant('favicon'),
      horizontal: variant('horizontal'),
      vertical: variant('vertical'),
    },
    needsReview: document.assets.variants
      .filter((entry) => entry.needsReview)
      .map((entry) => entry.kind),
    rules: document.tokens.logo,
    mission: brand.mission,
    vision: brand.vision,
    values: brand.values,
    tone: brand.tone,
    archetype: brand.archetype,
    written: brand.mission.trim() !== '' || brand.vision.trim() !== '',
  };
}

/** Pages in reading order (fractional positions compare as strings, ADR-018). */
export function orderedPages(document: BrandDocument): readonly Page[] {
  return [...document.pages].sort((a, b) => (a.position < b.position ? -1 : 1));
}

/** First sentence of the brief, for the cover and the empty manifesto (never invented text). */
const plain = (text: string): string =>
  text
    .replace(/\*\*|__|`/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();

const clip = (text: string, max: number): string =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * First sentence of the brief's prose: headings, quotes, rules and list items are skipped, so a Markdown
 * brief gives its opening paragraph, not its title.
 */
export function briefLead(brief: string | null, max = 180): string | null {
  if (brief === null) return null;
  const firstLine = brief
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter((line) => !/^(#|>|-{3,}|[-*+]\s|\d+[.)]\s|\|)/u.test(line))
    .map(plain)
    .find((line) => line.length > 40);
  if (firstLine === undefined) return null;
  const sentence = /^(.+?[.!?])(\s|$)/u.exec(firstLine)?.[1] ?? firstLine;
  return clip(sentence, max);
}

/** A labelled statement of the brief ("**Mission** : …", "Vision: …"), quoted as written. */
export function briefStatement(
  brief: string | null,
  labels: readonly string[],
  max = 400,
): string | null {
  if (brief === null) return null;
  for (const line of brief.split(/\n+/u)) {
    const text = plain(line.replace(/^[\s>*+-]+/u, ''));
    for (const label of labels) {
      const match = new RegExp(`^${label}\\s*:\\s*(.+)$`, 'iu').exec(text);
      if (match?.[1] !== undefined && match[1].length > 12) return clip(match[1], max);
    }
  }
  return null;
}

/** Analysis step after which a page of this type can be drawn (09 §7 timeline). */
export const PAGE_STEP: Readonly<Record<PageType, 1 | 2 | 3 | 4>> = {
  cover: 1,
  logo: 1,
  'clear-space': 1,
  'do-dont': 1,
  palette: 2,
  contrast: 2,
  manifesto: 3,
  typography: 3,
  'tone-of-voice': 3,
  mockup: 4,
  tokens: 4,
};
