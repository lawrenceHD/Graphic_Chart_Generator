import { motifFor, type Box, type LayoutNode, type MotifPattern, type Paint } from '@app/contracts';
import { ok } from '@app/kernel';
import type { Build, Template } from './build.js';
import { cells, content, intersect, onBaseline, sheet, toBleed } from './geometry.js';
import { paint } from './ink.js';
import { placeLogo } from './logo.js';
import { fromPt, headline, headlineCandidates, textBlock } from './text.js';

type PosterComposition = 'bleed-corner' | 'plate-circle' | 'full-bleed' | 'split' | 'type-only';
type Cells = readonly [number, number, number, number];
type Role = 'primary' | 'accent' | 'neutralLight';

type Spec = {
  // null: the photo covers the sheet and every zone sits on it.
  readonly background: Role | null;
  readonly photo: {
    readonly cells: Cells;
    readonly shape: 'rect' | 'circle';
    readonly bleed: boolean;
  } | null;
  readonly headline: {
    readonly cells: Cells;
    readonly align: 'left' | 'center';
    readonly sizes: readonly number[];
  };
  readonly logo: { readonly cells: Cells; readonly align: 'left' | 'center' | 'right' };
  readonly motif: {
    readonly cells: Cells;
    readonly ring: boolean;
    readonly pattern: MotifPattern | null;
    readonly opacity: number;
    readonly paint: Role;
  };
  readonly mentions: readonly [number, number];
};

const POSTER_SIZES = [1.6, 1.3, 1] as const;

// The zones of §2.1, in columns and rows of modules counted from 1 (null pattern: the archetype's own).
function spec(composition: PosterComposition, calm: 'top' | 'bottom'): Spec {
  switch (composition) {
    case 'bleed-corner':
      return {
        background: 'primary',
        photo: { cells: [5, 12, 1, 10], shape: 'rect', bleed: true },
        headline: { cells: [1, 8, 11, 14], align: 'left', sizes: POSTER_SIZES },
        logo: { cells: [1, 4, 2, 3], align: 'left' },
        motif: { cells: [3, 4, 1, 10], ring: false, pattern: null, opacity: 1, paint: 'accent' },
        mentions: [1, 12],
      };
    case 'plate-circle':
      return {
        background: 'neutralLight',
        photo: { cells: [3, 10, 3, 10], shape: 'circle', bleed: false },
        headline: { cells: [2, 11, 12, 14], align: 'center', sizes: POSTER_SIZES },
        logo: { cells: [5, 8, 15, 16], align: 'center' },
        motif: {
          cells: [2, 11, 2, 11],
          ring: true,
          pattern: 'repeat',
          opacity: 1,
          paint: 'primary',
        },
        mentions: [1, 12],
      };
    case 'full-bleed': {
      const rows: Cells = calm === 'top' ? [1, 9, 2, 4] : [1, 9, 13, 15];
      return {
        background: null,
        photo: { cells: [1, 12, 1, 17], shape: 'rect', bleed: true },
        headline: { cells: rows, align: 'left', sizes: POSTER_SIZES },
        logo: { cells: [10, 12, 15, 16], align: 'right' },
        motif: { cells: rows, ring: false, pattern: 'turn', opacity: 0.12, paint: 'neutralLight' },
        mentions: [1, 12],
      };
    }
    case 'split':
      return {
        background: 'neutralLight',
        photo: { cells: [6, 12, 1, 17], shape: 'rect', bleed: true },
        headline: { cells: [1, 5, 3, 9], align: 'left', sizes: POSTER_SIZES },
        logo: { cells: [1, 3, 15, 16], align: 'left' },
        motif: {
          cells: [1, 5, 11, 13],
          ring: false,
          pattern: 'checker',
          opacity: 1,
          paint: 'primary',
        },
        mentions: [1, 5],
      };
    case 'type-only':
      return {
        background: 'primary',
        photo: null,
        headline: { cells: [1, 12, 4, 12], align: 'left', sizes: [2.4, 2, 1.6] },
        logo: { cells: [1, 3, 15, 16], align: 'left' },
        motif: {
          cells: [1, 12, 13, 17],
          ring: false,
          pattern: 'scatter',
          opacity: 1,
          paint: 'accent',
        },
        mentions: [1, 12],
      };
  }
}

/** Campaign poster, A3 ratio, 12 × 17 modules (§2.1). */
export function poster(build: Build, composition: PosterComposition): Template {
  const { frame } = build;
  const m = frame.module;
  const layout = spec(composition, build.calm);
  const area = content(frame);
  const zone = (at: Cells): Box => intersect(cells(frame, ...at), area);
  const background: Paint | null =
    layout.background === null ? null : paint(build.colors, layout.background);
  const nodes: LayoutNode[] = [];

  if (background !== null) {
    nodes.push({
      kind: 'fill',
      zone: 'background',
      box: sheet(frame),
      shape: 'rect',
      paint: background,
    });
  }
  const photo = layout.photo === null || build.photo === undefined ? null : layout.photo;
  let disc: Box | null = null;
  if (photo !== null && build.photo !== undefined) {
    const box = cells(frame, ...photo.cells);
    disc = photo.shape === 'circle' ? box : null;
    nodes.push({
      kind: 'image',
      zone: 'photo',
      box: photo.bleed ? toBleed(frame, box) : box,
      shape: photo.shape,
      photoId: build.photo.id,
      treatment: build.treatment,
    });
  }
  const motifBox = cells(frame, ...layout.motif.cells);
  nodes.push({
    kind: 'motif',
    zone: 'motif',
    box: layout.motif.ring ? motifBox : toBleed(frame, motifBox),
    shape: layout.motif.ring ? 'ring' : 'rect',
    hole: layout.motif.ring ? disc : null,
    pattern: layout.motif.pattern ?? motifFor(build.archetype).pattern,
    cell: m,
    opacity: layout.motif.opacity,
    paint: paint(build.colors, layout.motif.paint),
    exclude: [],
  });

  const title = headline(
    build,
    {
      zone: 'headline',
      role: 'headline',
      font: 'display',
      leading: 0.95,
      tracking: -0.02,
      uppercase: build.uppercase,
      align: layout.headline.align,
    },
    onBaseline(zone(layout.headline.cells), frame.baseline),
    headlineCandidates(build.brand, build.series),
    layout.headline.sizes.map((factor) => factor * m),
    { words: 6, lines: 3 },
    background,
  );
  if (!title.ok) return title;
  nodes.push(title.value.node);

  const mark = placeLogo(build.colors, build.rules, build.unit, frame.baseline, build.logo, {
    zone: zone(layout.logo.cells),
    align: layout.logo.align,
    vertical: 'top',
    maxWidth: 0.22 * frame.width,
    maxHeight: Number.POSITIVE_INFINITY,
    background,
  });
  if (!mark.ok) return mark;
  nodes.push(mark.value);

  // Mentions sit in the foot margin, on a baseline row, inside the safety zone.
  const columns = cells(frame, layout.mentions[0], layout.mentions[1], 1, 1);
  const foot = onBaseline(
    {
      x: Math.max(columns.x, area.x),
      y: frame.height - frame.margin,
      w: 0,
      h: frame.margin - frame.safety,
    },
    frame.baseline,
  );
  const right = Math.min(columns.x + columns.w, area.x + area.w);
  const credit = photo !== null && build.photo !== undefined ? [build.photo.credit] : [];
  const mentions = textBlock(
    build,
    {
      zone: 'mentions',
      role: 'caption',
      font: 'text',
      size: Math.max(0.18 * m, fromPt(build.unit, 6, 22)),
      leading: 1.3,
      tracking: 0.04,
      uppercase: true,
      align: 'left',
    },
    { ...foot, w: right - foot.x },
    [build.brand.name, ...credit],
    background,
    false,
  );
  if (!mentions.ok) return mentions;
  nodes.push(mentions.value);

  return ok({
    nodes,
    headline: title.value.origin,
    exampleLegend: build.brand.tagline === undefined,
  });
}
