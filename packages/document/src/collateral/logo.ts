import type { Box, LayoutError, LayoutNode, Paint } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import type { BrandDocument } from '../schema.js';
import { logoTone } from './ink.js';

type LogoNode = Extract<LayoutNode, { readonly kind: 'logo' }>;
type Rules = BrandDocument['tokens']['logo'];
type Version = {
  readonly form: LogoNode['form'];
  readonly aspect: number;
  readonly minimum: number;
};

export type LogoShape = {
  // Width / height of the full logo and, when there is one, of the symbol alone.
  readonly aspect: number;
  readonly symbolAspect?: number | undefined;
};

export type LogoPlacement = {
  readonly zone: Box;
  readonly align: 'left' | 'center' | 'right';
  readonly vertical: 'top' | 'middle';
  readonly maxWidth: number;
  readonly maxHeight: number;
  readonly background: Paint | null;
  readonly preferSymbol?: boolean;
};

/** Smallest height of each version: measured per version when known, else the default rule (§2.0). */
export function minimums(rules: Rules, unit: 'mm' | 'px'): { full: number; symbol: number } {
  const fallback = unit === 'mm' ? rules.minSizeMm : rules.minSizePx;
  const of = (size: { heightMm: number; heightPx: number } | undefined) =>
    size === undefined ? fallback : unit === 'mm' ? size.heightMm : size.heightPx;
  return { full: of(rules.versions?.full), symbol: of(rules.versions?.symbol) };
}

function heightFor(aspect: number, ratio: number, place: LogoPlacement): number {
  return Math.min(
    place.maxWidth / aspect,
    place.zone.w / (aspect + 2 * ratio),
    place.zone.h / (1 + 2 * ratio),
    place.maxHeight,
  );
}

/**
 * The logo at the largest size its zone allows with its clear space on the four sides (clearSpaceRatio ×
 * height). Under the minimum of the full logo the symbol takes over; when nothing holds, the error says so.
 */
export function placeLogo(
  colors: BrandDocument['tokens']['colors'],
  rules: Rules,
  unit: 'mm' | 'px',
  baseline: number,
  shape: LogoShape,
  place: LogoPlacement,
): Result<LogoNode, LayoutError> {
  const ratio = rules.clearSpaceRatio;
  const minimum = minimums(rules, unit);
  const full: Version = { form: 'full', aspect: shape.aspect, minimum: minimum.full };
  const symbol: Version | null =
    shape.symbolAspect === undefined
      ? null
      : { form: 'symbol', aspect: shape.symbolAspect, minimum: minimum.symbol };
  const order: readonly Version[] =
    symbol === null ? [full] : place.preferSymbol === true ? [symbol, full] : [full, symbol];
  let tallest = 0;
  for (const option of order) {
    const height = heightFor(option.aspect, ratio, place);
    const placed = position(place, option.aspect, ratio, height, baseline);
    tallest = Math.max(tallest, placed.box.h);
    if (placed.box.h + 1e-9 < option.minimum) continue;
    return ok({
      kind: 'logo',
      zone: 'logo',
      ...placed,
      form: option.form,
      tone: place.background === null ? 'white' : logoTone(colors, place.background),
      background: place.background,
      minimum: option.minimum,
    });
  }
  return err({
    code: 'LOGO_BELOW_MINIMUM',
    height: Math.round(tallest * 100) / 100,
    minimum: minimum.full,
  });
}

function position(
  place: LogoPlacement,
  aspect: number,
  ratio: number,
  start: number,
  baseline: number,
): { box: Box; clearSpace: Box } {
  const zone = place.zone;
  let height = start;
  let top: number;
  if (place.vertical === 'top') {
    // The top of the logo sits on a baseline row; the logo shrinks if the row pushes it out of its zone.
    top = Math.ceil((zone.y + ratio * height) / baseline - 1e-9) * baseline;
    const room = zone.y + zone.h - top;
    if (height * (1 + ratio) > room) height = Math.max(0, room / (1 + ratio));
  } else {
    top = zone.y + (zone.h - height) / 2;
  }
  const width = height * aspect;
  const outer = width + 2 * ratio * height;
  const left =
    place.align === 'left'
      ? zone.x + ratio * height
      : place.align === 'right'
        ? zone.x + zone.w - outer + ratio * height
        : zone.x + (zone.w - width) / 2;
  const pad = ratio * height;
  return {
    box: { x: left, y: top, w: width, h: height },
    clearSpace: { x: left - pad, y: top - pad, w: width + 2 * pad, h: height + 2 * pad },
  };
}
