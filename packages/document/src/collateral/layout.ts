import {
  COLLATERAL_FORMATS,
  COMPOSITIONS,
  CollateralKindSchema,
  CompositionSchema,
  compositionFor,
  formatGrid,
  MoodSchema,
  needsPhoto,
  treatmentFor,
  type Box,
  type CollateralLayout,
  type Composition,
  type LayoutError,
  type LayoutNode,
  type Zone,
} from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { z } from 'zod';
import type { BrandDocument } from '../schema.js';
import type { Build, Template } from './build.js';
import { cardBack, cardFront } from './card.js';
import { overlaps, type Frame } from './geometry.js';
import { poster } from './poster.js';
import type { MeasureText } from './text.js';

export type { MeasureText } from './text.js';

const Text = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => !/<[A-Za-z/!]/u.test(value));

export const CollateralInputSchema = z
  .object({
    kind: CollateralKindSchema,
    // moodOf(tone.axes) in the studio.
    mood: MoodSchema,
    // Absent: compositionFor leads, then seriesComposition for the next items of a series.
    composition: CompositionSchema.optional(),
    series: z.number().int().min(0).max(11).default(0),
    photo: z
      .object({ id: Text(200), credit: Text(160) })
      .strict()
      .optional(),
    // The calmer band of the photo for `full-bleed`, measured by U-04.
    calm: z.enum(['top', 'bottom']).default('bottom'),
    logo: z
      .object({
        aspect: z.number().min(0.05).max(20),
        symbolAspect: z.number().min(0.05).max(20).optional(),
      })
      .strict(),
    // Visibly generic fields in the language of the interface (« Prénom Nom »), for the card back.
    placeholders: z
      .object({
        name: Text(60),
        role: Text(60),
        phone: Text(40),
        email: Text(80),
        website: Text(80),
      })
      .strict()
      .optional(),
  })
  .strict();
export type CollateralInput = z.input<typeof CollateralInputSchema>;

function inKind(composition: Composition, list: readonly Composition[]): boolean {
  return list.includes(composition);
}

function template(build: Build, kind: CollateralInput['kind'], composition: Composition): Template {
  if (kind === 'poster') {
    switch (composition) {
      case 'bleed-corner':
      case 'plate-circle':
      case 'full-bleed':
      case 'split':
      case 'type-only':
        return poster(build, composition);
    }
  }
  if (kind === 'card-front') {
    switch (composition) {
      case 'field':
      case 'motif':
      case 'quiet':
        return cardFront(build, composition);
    }
  }
  if (kind === 'card-back') return cardBack(build);
  return err({ code: 'KIND_NOT_BUILT', kind });
}

type Solid = { readonly zone: Zone; readonly box: Box; readonly strong: boolean };

/** Text and clear space never overlap; a motif stops at the clear space and at text it would drown. */
function settle(nodes: readonly LayoutNode[]): Result<LayoutNode[], LayoutError> {
  const solids: Solid[] = nodes.flatMap((node): Solid[] => {
    if (node.kind === 'text') return [{ zone: node.zone, box: node.box, strong: false }];
    if (node.kind === 'logo') return [{ zone: 'logo', box: node.clearSpace, strong: true }];
    return [];
  });
  for (const [index, a] of solids.entries()) {
    for (const b of solids.slice(index + 1)) {
      if (overlaps(a.box, b.box)) return err({ code: 'ZONES_OVERLAP', zones: [a.zone, b.zone] });
    }
  }
  return ok(
    nodes.map((node) =>
      node.kind === 'motif'
        ? {
            ...node,
            exclude: solids
              .filter(
                (solid) => (solid.strong || node.opacity >= 0.5) && overlaps(solid.box, node.box),
              )
              .map((solid) => solid.box),
          }
        : node,
    ),
  );
}

/**
 * The layout of one collateral, pure and serialisable (ADR-036): the SVG page and the canvas texture of a
 * scene draw the same description. The text measure is injected; every failure is a LayoutError.
 */
export function layoutCollateral(
  document: BrandDocument,
  rawInput: unknown,
  measure: MeasureText,
): Result<CollateralLayout, LayoutError> {
  const parsed = CollateralInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err({
      code: 'INVALID_INPUT',
      issues: parsed.error.issues.map((issue) => issue.path.map(String).join('.') || 'input'),
    });
  }
  const input = parsed.data;
  const { brand, tokens } = document;
  const hasPhoto = input.photo !== undefined;
  const composition =
    input.composition ?? compositionFor(input.kind, input.mood, brand.archetype, hasPhoto);
  if (!inKind(composition, COMPOSITIONS[input.kind])) {
    return err({ code: 'COMPOSITION_NOT_IN_KIND', composition });
  }
  if (needsPhoto(composition) && !hasPhoto) return err({ code: 'PHOTO_REQUIRED', composition });

  const format = COLLATERAL_FORMATS[input.kind];
  const grid = formatGrid(input.kind);
  const frame: Frame = {
    width: format.width,
    height: format.height,
    bleed: format.bleed,
    safety: format.safety,
    module: grid.module,
    margin: grid.margin,
    baseline: grid.baseline,
  };
  const build: Build = {
    frame,
    unit: format.unit,
    colors: tokens.colors,
    measure,
    brand,
    rules: tokens.logo,
    logo: input.logo,
    archetype: brand.archetype,
    uppercase:
      tokens.typography.pairingId === 'bold-display' ||
      brand.archetype === 'hero' ||
      brand.archetype === 'outlaw',
    treatment: treatmentFor(brand.archetype),
    series: input.series,
    calm: input.calm,
    photo: input.photo,
    placeholders: input.placeholders,
  };
  const built = template(build, input.kind, composition);
  if (!built.ok) return built;
  const nodes = settle(built.value.nodes);
  if (!nodes.ok) return nodes;
  return ok({
    kind: input.kind,
    composition,
    unit: format.unit,
    width: format.width,
    height: format.height,
    bleed: format.bleed,
    grid,
    nodes: nodes.value,
    headline: built.value.headline,
    logoRule:
      tokens.logo.origin === 'measured' && tokens.logo.versions !== undefined
        ? 'measured'
        : 'default',
    exampleLegend: built.value.exampleLegend,
  });
}
