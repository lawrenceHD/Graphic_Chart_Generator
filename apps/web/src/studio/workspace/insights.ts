import type { Command } from '@app/document';
import { contrastRatio, hexToOklch, withHue, withLightness } from '../../brand/color';
import { nextPairing } from '../../brand/pairings';
import type { BrandDocument } from '@app/document';
import type { PairingId } from '@app/contracts';
import { briefStatement, type ColorRole } from './brand-view';

// What the copilot says once the guideline is ready, and the edits it proposes. Each finding carries its
// evidence (a measured value) and, when there is one, the command that fixes it: the AI layer will phrase
// them (07 §4); the measurements and the commands are already the engines'.
export type Insight =
  | {
      readonly kind: 'palette';
      readonly primary: string;
      readonly accent: string;
      readonly found: number;
    }
  | {
      readonly kind: 'contrast-ok';
      readonly text: ColorRole;
      readonly background: ColorRole;
      readonly ratio: number;
    }
  | {
      readonly kind: 'contrast-fix';
      readonly role: ColorRole;
      readonly against: ColorRole;
      readonly ratio: number;
      readonly proposed: string;
      readonly proposedRatio: number;
      readonly command: Command;
    }
  | { readonly kind: 'typography'; readonly pairingId: PairingId }
  | { readonly kind: 'texts-pending'; readonly hasBrief: boolean }
  | {
      readonly kind: 'texts-from-brief';
      readonly mission: string | null;
      readonly vision: string | null;
      readonly commands: readonly Command[];
    }
  | { readonly kind: 'review'; readonly variants: readonly string[] };

const TEXT_MIN = 4.5;

const colorsOf = (document: BrandDocument): Record<ColorRole, string> => ({
  primary: document.tokens.colors.primary.hex,
  accent: document.tokens.colors.accent.hex,
  neutralLight: document.tokens.colors.neutralLight.hex,
  neutralDark: document.tokens.colors.neutralDark.hex,
});

/**
 * Closest lightness of `hex` (same hue and chroma) that reaches `target` against `background`, searched
 * towards the side that increases contrast. Null when no lightness reaches it in gamut.
 */
export function reachContrast(hex: string, background: string, target = TEXT_MIN): string | null {
  const start = hexToOklch(hex).L;
  const darker = hexToOklch(background).L > 0.5;
  for (let step = 1; step <= 100; step += 1) {
    const L = darker ? start - step * 0.01 : start + step * 0.01;
    if (L < 0 || L > 1) return null;
    const candidate = withLightness(hex, L);
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return null;
}

export function insightsOf(document: BrandDocument, brief: string | null): readonly Insight[] {
  const colors = colorsOf(document);
  const found = 4 + document.tokens.colors.extra.length;
  const insights: Insight[] = [
    { kind: 'palette', primary: colors.primary, accent: colors.accent, found },
  ];
  // Text pairs a guideline relies on: body text (dark neutral) and coloured text (primary, accent) on the
  // light neutral. A failing colour gets the closest lightness that reads, same hue and chroma.
  const pairs: readonly ColorRole[] = ['neutralDark', 'primary', 'accent'];
  for (const role of pairs) {
    const ratio = contrastRatio(colors[role], colors.neutralLight);
    const proposed = ratio < TEXT_MIN ? reachContrast(colors[role], colors.neutralLight) : null;
    if (proposed === null) {
      insights.push({ kind: 'contrast-ok', text: role, background: 'neutralLight', ratio });
      continue;
    }
    insights.push({
      kind: 'contrast-fix',
      role,
      against: 'neutralLight',
      ratio,
      proposed,
      proposedRatio: contrastRatio(proposed, colors.neutralLight),
      command: {
        type: 'SetColorToken',
        token: role,
        hex: proposed,
        source: 'derived',
        expect: colors[role],
      },
    });
  }
  insights.push({ kind: 'typography', pairingId: document.tokens.typography.pairingId });
  const review = document.assets.variants
    .filter((variant) => variant.needsReview)
    .map((variant) => variant.kind);
  if (review.length > 0) insights.push({ kind: 'review', variants: review });
  if (document.brand.mission.trim() === '' && document.brand.vision.trim() === '') {
    // Quoted from the brief, never written for the user: the copilot offers to carry them over.
    const mission = briefStatement(brief, ['mission']);
    const vision = briefStatement(brief, ['vision']);
    const commands: Command[] = [];
    if (mission !== null)
      commands.push({ type: 'SetBrandField', field: 'mission', value: mission, expect: '' });
    if (vision !== null)
      commands.push({ type: 'SetBrandField', field: 'vision', value: vision, expect: '' });
    insights.push(
      commands.length > 0
        ? { kind: 'texts-from-brief', mission, vision, commands }
        : { kind: 'texts-pending', hasBrief: brief !== null },
    );
  }
  return insights;
}

/** Quick edits offered as chips; each is one reversible command on the current document. */
export type Suggestion =
  | { readonly id: 'swap'; readonly commands: readonly Command[] }
  | { readonly id: 'complementary'; readonly commands: readonly Command[] }
  | { readonly id: 'typeface'; readonly commands: readonly Command[] }
  | { readonly id: 'darker-primary'; readonly commands: readonly Command[] };

export function suggestionsOf(document: BrandDocument): readonly Suggestion[] {
  const colors = colorsOf(document);
  const hue = hexToOklch(colors.primary).h ?? 0;
  const pairingId = document.tokens.typography.pairingId;
  return [
    {
      id: 'swap',
      commands: [
        {
          type: 'SetColorToken',
          token: 'primary',
          hex: colors.accent,
          source: 'user',
          expect: colors.primary,
        },
        {
          type: 'SetColorToken',
          token: 'accent',
          hex: colors.primary,
          source: 'user',
          expect: colors.accent,
        },
      ],
    },
    {
      id: 'complementary',
      commands: [
        {
          type: 'SetColorToken',
          token: 'accent',
          hex: withHue(colors.accent, hue + 180),
          source: 'derived',
          expect: colors.accent,
        },
      ],
    },
    {
      id: 'typeface',
      commands: [
        { type: 'SetTypographyPairing', pairingId: nextPairing(pairingId), expect: pairingId },
      ],
    },
    {
      id: 'darker-primary',
      commands: [
        {
          type: 'SetColorToken',
          token: 'primary',
          hex: withLightness(colors.primary, hexToOklch(colors.primary).L - 0.08),
          source: 'derived',
          expect: colors.primary,
        },
      ],
    },
  ];
}
