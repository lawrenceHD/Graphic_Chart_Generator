'use client';

import type { PageType } from '@app/contracts';
import type { BrandDocument, Page } from '@app/document';
import { Columns2, Maximize2, Minus, Plus, RectangleHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { EMPTY_INPUTS, type BrandInputs } from '../brand-inputs-model';
import { BrandInputsPanel } from '../brand-inputs-panel';
import { MockupStage, SCENES, type SceneId } from '../mockups/mockup-stage';
import { RENDERERS } from '../pages/pages';
import { SHEET_WORDS } from '../pages/sheet-words';
import { evidenceOf, occurrencesOf, type Occurrence } from '../pages/variant';
import type { Timeline } from '../timeline';
import type { Notice } from '../upload-batch';
import { PAGE_STEP, brandView, orderedPages, type BrandView } from './brand-view';
import type { ProjectSummary } from './document-client';
import { IconButton } from './top-bar';
import type { Phase } from './use-studio';

// The drafting table (DESIGN.md): guideline sheets laid out in reading order, then the computed mockups.
// While the analysis runs, each page waits for its step, then is "composed" (sweep) and laid down.
export type Selection =
  | { readonly kind: 'page'; readonly id: string }
  | { readonly kind: 'mockup'; readonly id: SceneId };

const INITIAL_PAGES: readonly PageType[] = [
  'cover',
  'manifesto',
  'logo',
  'clear-space',
  'do-dont',
  'palette',
  'contrast',
  'typography',
  'tone-of-voice',
  'tokens',
];

const SHEET_WIDTH = 620;
const GAP = 56;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.6;
const clampZoom = (value: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function SheetLabel({
  number,
  title,
  selected,
  portrait,
  onSelect,
}: {
  readonly number: number;
  readonly title: string;
  readonly selected: boolean;
  readonly portrait: boolean;
  readonly onSelect?: () => void;
}) {
  const t = useTranslations('workspace');
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`mb-2.5 flex h-9 items-center gap-2 rounded-full px-2.5 text-[15px] transition-colors ${selected ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
    >
      <span className="tabular font-mono text-xs">{String(number).padStart(2, '0')}</span>
      <span>{title}</span>
      {portrait ? (
        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-ink-3">
          {t('format.portrait')}
        </span>
      ) : null}
    </button>
  );
}

function stepState(timeline: Timeline, type: PageType): 'waiting' | 'composing' {
  const step = timeline.steps[PAGE_STEP[type] - 1];
  return step?.state === 'running' || step?.state === 'done' ? 'composing' : 'waiting';
}

function PendingSheet({
  type,
  state,
}: {
  readonly type: PageType;
  readonly state: 'waiting' | 'composing';
}) {
  const t = useTranslations('workspace');
  return (
    <div
      className={`relative aspect-[297/210] w-full overflow-hidden rounded-[14px] border border-line bg-surface ${state === 'composing' ? 'sweep' : ''}`}
    >
      <div className="absolute inset-0 flex flex-col gap-4 p-8" aria-hidden="true">
        <div className="skeleton h-3 w-1/3 rounded-full" />
        <div className="mt-4 grid flex-1 grid-cols-12 gap-5">
          <div className="col-span-4 flex flex-col gap-3">
            <div className="skeleton h-9 w-4/5 rounded-lg" />
            <div className="skeleton h-3 w-full rounded-full" />
            <div className="skeleton h-3 w-2/3 rounded-full" />
          </div>
          <div className="skeleton col-span-8 rounded-xl" />
        </div>
      </div>
      <p className="absolute right-4 bottom-3 m-0 font-mono text-[11px] text-ink-3">
        {state === 'composing' ? t('composing') : t('waitingStep', { step: PAGE_STEP[type] })}
      </p>
    </div>
  );
}

function SheetSlot({
  page,
  index,
  total,
  occurrence,
  view,
  year,
  selected,
  onSelect,
}: {
  readonly page: Page;
  readonly index: number;
  readonly total: number;
  readonly occurrence: Occurrence;
  readonly view: BrandView;
  readonly year: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const type = page.type;
  const portrait = page.overrides.format === 'portrait';
  const words = SHEET_WORDS[view.language];
  const style: CSSProperties & Record<'--d', string> = { '--d': `${String(index * 0.07)}s` };
  const Renderer = RENDERERS[type];
  return (
    <div className="sheet-in min-w-0" style={style}>
      <SheetLabel
        number={index + 1}
        title={page.title}
        selected={selected}
        portrait={portrait}
        onSelect={onSelect}
      />
      <div
        role="button"
        tabIndex={-1}
        onPointerDown={onSelect}
        className={`rounded-[16px] shadow-[0_1px_2px_oklch(0.2_0.01_60/0.06),0_18px_40px_-18px_oklch(0.2_0.01_60/0.32)] outline-2 outline-offset-[6px] transition-[outline-color] ${selected ? 'outline-ink' : 'outline-transparent'} ${portrait ? 'mx-auto w-[56%]' : ''}`}
      >
        <Renderer
          context={{
            view,
            words,
            number: index + 1,
            total,
            portrait,
            title: page.title,
            background: page.overrides.background,
            year,
            occurrence,
            evidence: evidenceOf(page.data),
          }}
        />
      </div>
    </div>
  );
}

export function PageCanvas({
  phase,
  timeline,
  document,
  project,
  selection,
  onSelect,
  onSend,
  onReload,
  notices,
  partial,
  sending,
}: {
  readonly phase: Phase;
  readonly timeline: Timeline;
  readonly document: BrandDocument | null;
  readonly project: ProjectSummary | null;
  readonly selection: Selection | null;
  readonly onSelect: (selection: Selection) => void;
  readonly onSend: (inputs: BrandInputs) => void;
  readonly onReload: () => void;
  readonly notices: readonly Notice[];
  readonly partial: boolean;
  readonly sending: boolean;
}) {
  const t = useTranslations('workspace');
  const tStudio = useTranslations('studio');
  const tDrop = useTranslations('dropzone');
  const [inputs, setInputs] = useState<BrandInputs>(EMPTY_INPUTS);
  const area = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.62);
  const [columns, setColumns] = useState<1 | 2 | null>(null);
  const [year] = useState(() => new Date().getFullYear());
  const cols = columns ?? 1;
  const gridWidth = SHEET_WIDTH * cols + GAP * (cols - 1);

  const fitTo = (count: 1 | 2): void => {
    const node = area.current;
    if (node === null || node.clientWidth === 0) return;
    setZoom(clampZoom((node.clientWidth - 112) / (SHEET_WIDTH * count + GAP * (count - 1))));
  };

  // First view: one sheet large enough to read on a laptop, two side by side on a wide table.
  useEffect(() => {
    const node = area.current;
    if (node === null || columns !== null || node.clientWidth === 0) return;
    const count = node.clientWidth >= 1100 ? 2 : 1;
    setColumns(count);
    fitTo(count);
  });

  useEffect(() => {
    const node = area.current;
    if (node === null) return;
    const onWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((value) => clampZoom(value * (event.deltaY > 0 ? 0.92 : 1.08)));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      node.removeEventListener('wheel', onWheel);
    };
  }, []);

  const view = document !== null && project !== null ? brandView(document, project) : null;
  const pages = document === null ? [] : orderedPages(document);
  const occurrences = occurrencesOf(pages);
  const empty = phase === 'empty' || (phase === 'sending' && document === null);

  return (
    <div className="relative flex min-w-0 flex-1 flex-col bg-canvas">
      <div
        ref={area}
        className="drafting relative min-h-0 flex-1 overflow-auto"
        tabIndex={0}
        aria-label={t('canvas')}
      >
        {phase === 'failed' && document === null ? (
          <div className="grid min-h-full place-items-center p-6">
            <div
              role="alert"
              className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 text-center"
            >
              <h2 className="m-0 font-display text-2xl font-bold tracking-tight">
                {t('loadFailedTitle')}
              </h2>
              <p className="m-0 mt-2 mb-5 text-sm text-ink-2">{t('loadFailedLead')}</p>
              <button
                type="button"
                onClick={onReload}
                className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-on-accent"
              >
                {t('retry')}
              </button>
            </div>
          </div>
        ) : empty ? (
          <div className="grid min-h-full place-items-center p-6">
            <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_24px_-8px_oklch(0.2_0.01_60/0.2)]">
              <h2 className="m-0 font-display text-2xl font-bold tracking-tight">
                {t('dropTitle')}
              </h2>
              <p className="m-0 mt-1 mb-5 text-sm text-ink-2">{t('dropLead')}</p>
              <BrandInputsPanel value={inputs} onChange={setInputs} disabled={sending} />
              <div className="mt-4 flex flex-col items-start gap-2">
                <button
                  type="button"
                  disabled={sending || inputs.logos.length === 0}
                  onClick={() => {
                    onSend(inputs);
                  }}
                  className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-on-accent disabled:opacity-50"
                >
                  {tStudio('analyze')}
                </button>
                {inputs.logos.length === 0 ? (
                  <p className="m-0 text-sm text-ink-2">{tStudio('needLogo')}</p>
                ) : null}
              </div>
              {notices.length === 0 ? null : (
                <div role="alert" className="mt-4 flex flex-col gap-1 text-sm text-danger">
                  {partial ? <p className="m-0">{tStudio('partial')}</p> : null}
                  <ul className="m-0 list-none p-0">
                    {notices.map((notice) => (
                      <li key={notice.name}>
                        {notice.name} : {tDrop(`errors.${notice.code}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="w-max p-14" style={{ zoom }}>
            <div
              className={`grid gap-x-14 gap-y-12 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
              style={{ width: gridWidth }}
            >
              {view !== null && document !== null
                ? pages.map((page, index) => (
                    <SheetSlot
                      key={page.id}
                      page={page}
                      index={index}
                      total={pages.length}
                      occurrence={occurrences[index] ?? { index: 0, count: 1 }}
                      view={view}
                      year={year}
                      selected={selection?.kind === 'page' && selection.id === page.id}
                      onSelect={() => {
                        onSelect({ kind: 'page', id: page.id });
                      }}
                    />
                  ))
                : INITIAL_PAGES.map((type, index) => (
                    <div key={type}>
                      <SheetLabel
                        number={index + 1}
                        title={t(`pageTypes.${type}`)}
                        selected={false}
                        portrait={false}
                      />
                      <PendingSheet type={type} state={stepState(timeline, type)} />
                    </div>
                  ))}
            </div>
            {view !== null ? (
              <section aria-labelledby="mockups-title" className="mt-20">
                <h2
                  id="mockups-title"
                  className="m-0 mb-1 font-display text-3xl font-bold tracking-tight"
                >
                  {t('mockups')}
                </h2>
                <p className="m-0 mb-6 max-w-xl text-sm text-ink-2">{t('mockupsLead')}</p>
                <div
                  className={`grid gap-x-14 gap-y-10 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
                  style={{ width: gridWidth }}
                >
                  {SCENES.map((scene, index) => {
                    const selected = selection?.kind === 'mockup' && selection.id === scene;
                    const style: CSSProperties & Record<'--d', string> = {
                      '--d': `${String(0.7 + index * 0.08)}s`,
                    };
                    return (
                      <div
                        key={scene}
                        className={`sheet-in ${index === 0 && cols === 2 ? 'col-span-2' : ''}`}
                        style={style}
                      >
                        <SheetLabel
                          number={pages.length + index + 1}
                          title={t(`scenes.${scene}`)}
                          selected={selected}
                          portrait={false}
                          onSelect={() => {
                            onSelect({ kind: 'mockup', id: scene });
                          }}
                        />
                        <div
                          role="button"
                          tabIndex={-1}
                          onPointerDown={() => {
                            onSelect({ kind: 'mockup', id: scene });
                          }}
                          className={`overflow-hidden rounded-[16px] shadow-[0_1px_2px_oklch(0.2_0.01_60/0.06),0_18px_40px_-18px_oklch(0.2_0.01_60/0.32)] outline-2 outline-offset-[6px] ${selected ? 'outline-ink' : 'outline-transparent'}`}
                        >
                          <MockupStage
                            proof
                            failedLabel={t('mockupFailed')}
                            retryLabel={t('retry')}
                            scene={scene}
                            view={view}
                            label={t('mockupAlt', {
                              scene: t(`scenes.${scene}`),
                              brand: view.name,
                            })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
      {empty ? null : (
        <div className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-line bg-surface/85 p-1 shadow-[0_8px_24px_-8px_oklch(0.2_0.01_60/0.2)] backdrop-blur-md">
          <IconButton
            label={t('zoomOut')}
            onClick={() => {
              setZoom((value) => clampZoom(value - 0.1));
            }}
          >
            <Minus aria-hidden="true" className="size-4" />
          </IconButton>
          <span className="tabular w-12 text-center font-mono text-xs text-ink-2">
            {Math.round(zoom * 100)} %
          </span>
          <IconButton
            label={t('zoomIn')}
            onClick={() => {
              setZoom((value) => clampZoom(value + 0.1));
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
          </IconButton>
          <IconButton
            label={t('fit')}
            onClick={() => {
              fitTo(cols);
            }}
          >
            <Maximize2 aria-hidden="true" className="size-4" />
          </IconButton>
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
          <IconButton
            label={cols === 2 ? t('oneColumn') : t('twoColumns')}
            onClick={() => {
              const next = cols === 2 ? 1 : 2;
              setColumns(next);
              fitTo(next);
            }}
          >
            {cols === 2 ? (
              <RectangleHorizontal aria-hidden="true" className="size-4" />
            ) : (
              <Columns2 aria-hidden="true" className="size-4" />
            )}
          </IconButton>
        </div>
      )}
    </div>
  );
}
