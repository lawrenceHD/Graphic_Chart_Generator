import { motifFor, type LayoutError, type LayoutNode } from '@app/contracts';
import { err, ok } from '@app/kernel';
import type { Build, Template } from './build.js';
import { cells, content, intersect, onBaseline, sheet } from './geometry.js';
import { paint } from './ink.js';
import { placeLogo } from './logo.js';
import { fromPt, textBlock, type TextStyle } from './text.js';

/** Card front, 85 × 55 mm: the identity side, logo at most 40 % of the height (§2.2). */
export function cardFront(build: Build, composition: 'field' | 'motif' | 'quiet'): Template {
  const { frame } = build;
  const area = content(frame);
  const quiet = composition === 'quiet';
  const background = paint(build.colors, quiet ? 'neutralLight' : 'primary');
  const nodes: LayoutNode[] = [
    { kind: 'fill', zone: 'background', box: sheet(frame), shape: 'rect', paint: background },
  ];
  if (composition === 'motif') {
    nodes.push({
      kind: 'motif',
      zone: 'motif',
      box: sheet(frame),
      shape: 'rect',
      hole: null,
      pattern: motifFor(build.archetype).pattern,
      cell: frame.module,
      opacity: 1,
      paint: paint(build.colors, 'accent'),
      exclude: [],
    });
  }
  // On the motif the logo sits in a cartouche of the light neutral, the size of its clear space.
  const cartouche = composition === 'motif' ? paint(build.colors, 'neutralLight') : null;
  const mark = placeLogo(build.colors, build.rules, build.unit, frame.baseline, build.logo, {
    zone: quiet ? intersect(cells(frame, 1, 6, 1, 3), area) : area,
    align: quiet ? 'left' : 'center',
    vertical: quiet ? 'top' : 'middle',
    maxWidth: area.w,
    maxHeight: 0.4 * frame.height,
    background: cartouche ?? background,
  });
  if (!mark.ok) return mark;
  if (cartouche !== null) {
    nodes.push({
      kind: 'fill',
      zone: 'logo',
      box: mark.value.clearSpace,
      shape: 'rect',
      paint: cartouche,
    });
  }
  nodes.push(mark.value);
  if (quiet) {
    const rule = frame.module / 4;
    nodes.push({
      kind: 'fill',
      zone: 'rule',
      box: {
        x: -frame.bleed,
        y: frame.height - rule,
        w: frame.width + 2 * frame.bleed,
        h: rule + frame.bleed,
      },
      shape: 'rect',
      paint: paint(build.colors, 'accent'),
    });
  }
  return ok({ nodes, headline: null, exampleLegend: false });
}

/**
 * Card back: name and role (always generic, Charta never knows a person), the contact block from
 * brand.contact or generic fields, the symbol top right (§2.2).
 */
export function cardBack(build: Build): Template {
  const { frame, placeholders } = build;
  if (placeholders === undefined) {
    const error: LayoutError = { code: 'INVALID_INPUT', issues: ['placeholders'] };
    return err(error);
  }
  const m = frame.module;
  const area = content(frame);
  const zone = (c1: number, c2: number, r1: number, r2: number) =>
    onBaseline(intersect(cells(frame, c1, c2, r1, r2), area), frame.baseline);
  const background = paint(build.colors, 'neutralLight');
  const nodes: LayoutNode[] = [
    { kind: 'fill', zone: 'background', box: sheet(frame), shape: 'rect', paint: background },
  ];
  const style = (zoneId: TextStyle['zone'], size: number, leading: number): TextStyle => ({
    zone: zoneId,
    role: 'body',
    font: 'text',
    size,
    leading,
    tracking: 0,
    uppercase: false,
    align: 'left',
  });

  const contact = build.brand.contact;
  const typed =
    contact === undefined
      ? []
      : [contact.address, contact.phone, contact.email, contact.website, contact.social];
  const lines = typed.filter((line): line is string => line !== undefined);
  const blocks = [
    {
      style: style('name', Math.max(0.45 * m, fromPt(build.unit, 9, 22)), 1.1),
      box: zone(1, 8, 1, 2),
      text: [placeholders.name],
      example: true,
    },
    {
      style: style('role', Math.max(0.26 * m, fromPt(build.unit, 6.5, 22)), 1.3),
      box: zone(1, 8, 3, 3),
      text: [placeholders.role],
      example: true,
    },
    {
      style: style('contact', Math.max(0.26 * m, fromPt(build.unit, 7, 22)), 1.35),
      box: zone(1, 8, 5, 7),
      text:
        lines.length > 0 ? lines : [placeholders.phone, placeholders.email, placeholders.website],
      example: lines.length === 0,
    },
  ];
  for (const block of blocks) {
    const node = textBlock(build, block.style, block.box, block.text, background, block.example);
    if (!node.ok) return node;
    nodes.push(node.value);
  }

  const mark = placeLogo(build.colors, build.rules, build.unit, frame.baseline, build.logo, {
    zone: intersect(cells(frame, 9, 12, 1, 3), area),
    align: 'right',
    vertical: 'top',
    maxWidth: area.w,
    maxHeight: Number.POSITIVE_INFINITY,
    background,
    preferSymbol: true,
  });
  if (!mark.ok) return mark;
  nodes.push(mark.value);
  return ok({ nodes, headline: null, exampleLegend: true });
}
