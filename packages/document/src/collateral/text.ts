import type { Box, HeadlineOrigin, LayoutError, LayoutNode, Paint, Zone } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { BrandDocument } from '../schema.js';
import { inkOn, paint } from './ink.js';

/** Width of a line of text, in the unit of the format; injected so that the package stays pure. */
export type MeasureText = (text: string, font: 'display' | 'text', size: number) => number;

type TextNode = Extract<LayoutNode, { readonly kind: 'text' }>;
type Font = TextNode['font'];

const MM_PER_PT = 25.4 / 72;
// WCAG "large text" is 18 pt, 24 CSS px; in mm at 96 px to the inch.
const LARGE_MM = (24 * 25.4) / 96;
const LARGE_PX = 24;

export function fromPt(unit: 'mm' | 'px', pt: number, px: number): number {
  return unit === 'mm' ? pt * MM_PER_PT : px;
}

export function isLarge(unit: 'mm' | 'px', size: number): boolean {
  return size >= (unit === 'mm' ? LARGE_MM : LARGE_PX) - 1e-9;
}

/**
 * Greedy line breaking at spaces. ok(null) when a word is wider than the box or there are more lines than
 * allowed; INVALID_MEASURE when the injected measure does not return a finite width.
 */
export function breakLines(
  text: string,
  width: number,
  maxLines: number,
  font: Font,
  size: number,
  measure: MeasureText,
): Result<string[] | null, LayoutError> {
  const words = text
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  if (words.length === 0) return ok(null);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    const measured = measure(candidate, font, size);
    if (!Number.isFinite(measured) || measured < 0) return err({ code: 'INVALID_MEASURE' });
    if (measured <= width) {
      current = candidate;
      continue;
    }
    if (current === '') return ok(null);
    lines.push(current);
    const alone = measure(word, font, size);
    if (!Number.isFinite(alone) || alone < 0) return err({ code: 'INVALID_MEASURE' });
    if (alone > width) return ok(null);
    current = word;
  }
  lines.push(current);
  return ok(lines.length <= maxLines ? lines : null);
}

export type TextStyle = {
  readonly zone: Zone;
  readonly role: TextNode['role'];
  readonly font: Font;
  readonly size: number;
  readonly leading: number;
  readonly tracking: number;
  readonly uppercase: boolean;
  readonly align: TextNode['align'];
};

export type TextContext = {
  readonly unit: 'mm' | 'px';
  readonly colors: BrandDocument['tokens']['colors'];
  readonly measure: MeasureText;
};

function inked(context: TextContext, background: Paint | null, size: number) {
  if (background === null) {
    // On a photo the contrast is measured by U-04 under the treated image; light ink by default.
    return {
      ink: paint(context.colors, 'neutralLight'),
      contrast: null,
    };
  }
  return inkOn(context.colors, background, isLarge(context.unit, size));
}

/**
 * A block of paragraphs at a fixed size. When the zone is full, the last lines are left out and counted in
 * `dropped`: the size never goes under its floor (§2.0).
 */
export function textBlock(
  context: TextContext,
  style: TextStyle,
  box: Box,
  paragraphs: readonly string[],
  background: Paint | null,
  example: boolean,
): Result<TextNode, LayoutError> {
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const text = style.uppercase ? paragraph.toUpperCase() : paragraph;
    const broken = breakLines(text, box.w, 12, style.font, style.size, context.measure);
    if (!broken.ok) return broken;
    if (broken.value === null) return err({ code: 'TEXT_DOES_NOT_FIT', zone: style.zone });
    lines.push(...broken.value);
  }
  const capacity = Math.min(12, Math.floor(box.h / (style.size * style.leading) + 1e-9));
  if (capacity < 1 || lines.length === 0)
    return err({ code: 'TEXT_DOES_NOT_FIT', zone: style.zone });
  const kept = lines.slice(0, capacity);
  const { ink, contrast } = inked(context, background, style.size);
  return ok({
    kind: 'text',
    ...style,
    box,
    lines: kept,
    ink,
    contrast,
    example,
    dropped: lines.length - kept.length,
  });
}

type Candidate = { readonly origin: HeadlineOrigin; readonly text: string };

/** Headline sources from the safest to the least safe (§0.2); item `series` of a series starts lower. */
export function headlineCandidates(brand: BrandDocument['brand'], series: number): Candidate[] {
  const list: Candidate[] = [];
  if (brand.tagline !== undefined) list.push({ origin: 'tagline', text: brand.tagline });
  const example = brand.tone.examples[series % brand.tone.examples.length] ?? '';
  if (example.trim() !== '') list.push({ origin: 'tone-example', text: example });
  const value = brand.values[series % brand.values.length];
  if (value) list.push({ origin: 'value', text: value.label });
  list.push({ origin: 'name', text: brand.name });
  return list.slice(Math.min(series, list.length - 1));
}

const STOP = /[,;:.!?…]$/u;

/** At most `maxWords`; a longer text is cut at the last punctuation within them, else refused. */
export function withinWords(text: string, maxWords: number): string | null {
  const words = text
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > 0);
  if (words.length <= maxWords) return words.join(' ');
  for (let count = maxWords; count > 0; count -= 1) {
    const last = words[count - 1] ?? '';
    if (STOP.test(last)) {
      const cut = words.slice(0, count).join(' ');
      return /[!?.…]$/u.test(cut) ? cut : cut.replace(/[,;:]$/u, '');
    }
  }
  return null;
}

/**
 * The headline: the first source that fits within the words, lines and height of its zone, at the largest
 * of the sizes offered; a source that does not fit hands over to the next one (§2.0, density).
 */
export function headline(
  context: TextContext,
  style: Omit<TextStyle, 'size'>,
  box: Box,
  candidates: readonly Candidate[],
  sizes: readonly number[],
  limits: { readonly words: number; readonly lines: number },
  background: Paint | null,
): Result<{ readonly node: TextNode; readonly origin: HeadlineOrigin }, LayoutError> {
  for (const candidate of candidates) {
    const fitted = withinWords(candidate.text, limits.words);
    if (fitted === null) continue;
    const text = style.uppercase ? fitted.toUpperCase() : fitted;
    for (const size of sizes) {
      const broken = breakLines(text, box.w, limits.lines, style.font, size, context.measure);
      if (!broken.ok) return broken;
      const lines = broken.value;
      if (lines === null || lines.length * size * style.leading > box.h + 1e-9) continue;
      const { ink, contrast } = inked(context, background, size);
      const node: TextNode = {
        kind: 'text',
        ...style,
        size,
        box,
        lines,
        ink,
        contrast,
        example: candidate.origin !== 'tagline',
        dropped: 0,
      };
      return ok({ node, origin: candidate.origin });
    }
  }
  return err({ code: 'TEXT_DOES_NOT_FIT', zone: style.zone });
}
