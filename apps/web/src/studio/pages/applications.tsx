'use client';

import { MockupStage, type SceneId } from '../mockups/mockup-stage';
import { SheetFrame, u, type SheetContext } from './sheet';

// Applications (R17 of 16_GUIDELINE_RULES.md): the brand on its collateral, in designers' Photoshop
// mockups replayed with the brand's own artwork — the page every reference guideline ends its logo part on.
export function Applications({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const scene = (id: SceneId, className: string) => (
    <MockupStage
      scene={id}
      view={view}
      label={`${view.name} — ${words.applications.alt}`}
      failedLabel={words.applications.failed}
      retryLabel={words.applications.retry}
      className={className}
    />
  );
  return (
    <SheetFrame context={context} lead={words.lead.applications} wide>
      <div className="grid h-full grid-cols-5 grid-rows-2" style={{ gap: u(1.2) }}>
        <div className="col-span-3 row-span-2 min-h-0 overflow-hidden">
          {scene(
            'cards-floating',
            'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover',
          )}
        </div>
        <div className="col-span-2 min-h-0 overflow-hidden">
          {scene('a4-sheet', 'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover')}
        </div>
        <div className="col-span-2 min-h-0 overflow-hidden">
          {scene('mug-white', 'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover')}
        </div>
      </div>
    </SheetFrame>
  );
}
