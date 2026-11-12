'use client';

import { contrastRatio } from '../../../brand/color';
import type { BrandView } from '../../workspace/brand-view';
import { LogoImage, logoOn } from '../sheet';
import { motifCells, type MotifField, type MotifKind } from './motif';

export const fieldColor = (view: BrandView, field: MotifField): string =>
  field === 'primary'
    ? view.colors.primary
    : field === 'accent'
      ? view.colors.accent
      : field === 'light'
        ? view.colors.neutralLight
        : view.colors.neutralDark;

/** The logo version that reads on a field (a flat of the brand), reversed on dark, colour on light. */
export const markOn = (view: BrandView, background: string): string =>
  contrastRatio(background, view.colors.primary) < 1.3
    ? logoOn(view, background, false)
    : logoOn(view, background, true);

/**
 * The mark as a pattern, edge to edge: a grid of flat cells, no gap, no frame, the logo set straight on
 * each flat (never in a plate), always upright. Drawn from the logo, so every brand gets its own.
 */
export function MotifGrid({
  view,
  kind,
  cols,
  rows,
}: {
  readonly view: BrandView;
  readonly kind: MotifKind;
  readonly cols: number;
  readonly rows: number;
}) {
  const cells = motifCells({ cols, rows, seed: view.name, kind });
  return (
    <div
      className="grid size-full"
      style={{
        gridTemplateColumns: `repeat(${String(cols)}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${String(rows)}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((cell) => {
        const background = fieldColor(view, cell.field);
        return (
          <div
            key={`${String(cell.col)}-${String(cell.row)}`}
            className="grid place-items-center overflow-hidden"
            style={{ background }}
          >
            {cell.mark ? (
              <LogoImage src={markOn(view, background)} className="h-[56%] w-[56%]" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
