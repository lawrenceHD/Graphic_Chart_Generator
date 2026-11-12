'use client';

import { MockupStage, type SceneId } from '../mockups/mockup-stage';
import { SheetFrame, occurrenceOf, u, type SheetContext } from './sheet';
import { BeyondPage } from './beyond';
import { mockupScenes, type MockupView } from './variant';
import { mockupBySection, sectionOf } from './section';
import { SECTION_WORDS } from './section-words';
import { VisualLanguage } from './visual-language';

// Applications (R17 of 16_GUIDELINE_RULES.md): the brand on its collateral, in designers' Photoshop
// mockups replayed with the brand's own artwork — the page every reference guideline ends its logo part on.
export function Applications({ context }: { readonly context: SheetContext }) {
  const { view, words } = context;
  const section = sectionOf(context, 'mockup');
  const bySection = mockupBySection(section);
  const sectionWords = SECTION_WORDS[view.language].applications;
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
  if (bySection?.kind === 'pattern') return <VisualLanguage context={context} />;
  if (bySection?.kind === 'missing')
    return (
      <SheetFrame context={context} lead={words.lead.applications}>
        <p
          className="m-0 grid h-full place-items-center text-balance"
          style={{ fontSize: u(1.4), opacity: 0.6 }}
        >
          {sectionWords.missing}
        </p>
      </SheetFrame>
    );
  const shown: MockupView = bySection ?? mockupScenes(occurrenceOf(context));
  if (shown.kind === 'beyond') return <BeyondPage context={context} rank={shown.rank} />;
  const [lead, top, bottom] = shown.scenes;
  return (
    <SheetFrame
      context={context}
      lead={words.lead.applications}
      wide
      {...(section === 'stationery'
        ? {
            aside: (
              <p className="m-0" style={{ fontSize: u(0.85), lineHeight: 1.4, opacity: 0.7 }}>
                {sectionWords.formats}
              </p>
            ),
          }
        : {})}
    >
      <div className="grid h-full grid-cols-5 grid-rows-2" style={{ gap: u(1.2) }}>
        <div className="col-span-3 row-span-2 min-h-0 overflow-hidden">
          {scene(lead, 'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover')}
        </div>
        <div className="col-span-2 min-h-0 overflow-hidden">
          {scene(top, 'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover')}
        </div>
        <div className="col-span-2 min-h-0 overflow-hidden">
          {scene(bottom, 'h-full [&>div]:h-full [&>div]:!aspect-auto [&_canvas]:object-cover')}
        </div>
      </div>
    </SheetFrame>
  );
}
