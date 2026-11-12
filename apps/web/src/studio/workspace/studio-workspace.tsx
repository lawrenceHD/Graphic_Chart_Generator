'use client';

import type { Command } from '@app/document';
import { Layers, MessageSquare, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { MAIN_ID } from '../../components/skip-link-id';
import { useDirecting } from '../mockups/use-directing';
import { RENDERERS } from '../pages/pages';
import { sectionOfData } from '../pages/section';
import { SHEET_WORDS } from '../pages/sheet-words';
import { evidenceOf, occurrencesOf } from '../pages/variant';
import { brandView, orderedPages } from './brand-view';
import { CopilotPanel } from './copilot-panel';
import { ExportDialog } from './export-dialog';
import { Inspector } from './inspector';
import { PageCanvas, type Selection } from './page-canvas';
import { TopBar } from './top-bar';
import { useStudio, type StudioFailure } from './use-studio';

// The studio (PRODUCT.md "Operating Context"): copilot on the left, the live canvas in the centre, the
// inspector on the right; below 1024 px the three become tabs over one full-height panel.
type Tab = 'copilot' | 'pages' | 'inspector';

// Only read while a mockup is selected, which needs a loaded guideline (so a real view).
const FALLBACK_COLORS = {
  primary: '#000000',
  accent: '#000000',
  neutralLight: '#FFFFFF',
  neutralDark: '#000000',
} as const;

function failureKey(failure: StudioFailure): string {
  switch (failure.kind) {
    case 'network':
      return 'network';
    case 'storage':
      return 'storage';
    case 'invalid':
    case 'unexpected':
      return 'unexpected';
    case 'rejected-command':
      return 'command';
    case 'http':
      if (failure.status === 409) return 'conflict';
      if (failure.status === 429) return 'rateLimited';
      if (failure.status === 401 || failure.status === 403) return 'forbidden';
      if (failure.status === 404) return 'notFound';
      return 'refused';
    case 'rejected':
      return 'refused';
  }
}

export function StudioWorkspace({ projectId }: { readonly projectId: string }) {
  const t = useTranslations('workspace');
  const studio = useStudio({ projectId });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [exporting, setExporting] = useState(false);
  const [tab, setTab] = useState<Tab>('pages');
  const [year] = useState(() => new Date().getFullYear());
  const { directing, onDirected } = useDirecting();

  const document = studio.shown;
  const view = useMemo(
    () =>
      document !== null && studio.project !== null ? brandView(document, studio.project) : null,
    [document, studio.project],
  );
  const pages = useMemo(() => (document === null ? [] : orderedPages(document)), [document]);
  const occurrences = useMemo(() => occurrencesOf(pages), [pages]);

  // The first page is selected when the guideline arrives, so the inspector is never empty.
  useEffect(() => {
    if (selection === null && pages[0] !== undefined)
      setSelection({ kind: 'page', id: pages[0].id });
  }, [pages, selection]);

  const done = studio.timeline.steps.filter((step) => step.state === 'done').length;
  const runAll = async (commands: readonly Command[]): Promise<boolean> => {
    for (const command of commands) {
      if (!(await studio.run(command))) return false;
    }
    return true;
  };
  const runOne = (command: Command): void => {
    void studio.run(command);
  };

  const name = view?.name ?? studio.project?.title ?? t('untitled');
  const announce =
    studio.phase === 'ready'
      ? t('announce.ready')
      : studio.phase === 'analysing'
        ? t('announce.analysing')
        : '';

  const tabs: readonly { readonly id: Tab; readonly icon: typeof Layers }[] = [
    { id: 'copilot', icon: MessageSquare },
    { id: 'pages', icon: Layers },
    { id: 'inspector', icon: SlidersHorizontal },
  ];

  return (
    <>
      <div className="screen-only flex h-dvh flex-col overflow-hidden bg-canvas">
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
        <TopBar
          name={name}
          sector={view?.sector ?? null}
          logo={view?.logo.color ?? null}
          phase={studio.phase}
          done={done}
          canUndo={studio.canUndo && !studio.busy}
          canRedo={studio.canRedo && !studio.busy}
          onUndo={() => {
            void studio.undo();
          }}
          onRedo={() => {
            void studio.redo();
          }}
          onExport={() => {
            setExporting(true);
          }}
        />
        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="relative flex min-h-0 flex-1 focus:outline-none"
        >
          <aside
            className={`min-h-0 w-full shrink-0 flex-col border-line bg-surface lg:flex lg:w-[340px] lg:border-r ${tab === 'copilot' ? 'flex' : 'hidden'}`}
          >
            <CopilotPanel
              phase={studio.phase}
              timeline={studio.timeline}
              journal={studio.journal}
              document={document}
              brief={view?.brief ?? null}
              selectedPageId={selection?.kind === 'page' ? selection.id : null}
              busy={studio.busy}
              onRun={runAll}
              onRetry={() => {
                void studio.analyze();
              }}
            />
          </aside>
          <div className={`min-w-0 flex-1 lg:flex ${tab === 'pages' ? 'flex' : 'hidden'}`}>
            <PageCanvas
              phase={studio.phase}
              timeline={studio.timeline}
              document={document}
              project={studio.project}
              selection={selection}
              onSelect={setSelection}
              onSend={(inputs) => {
                void studio.send(inputs);
              }}
              onReload={() => {
                void studio.reload();
              }}
              notices={studio.notices}
              partial={studio.partial}
              sending={studio.phase === 'sending' || studio.phase === 'scanning'}
              directing={directing}
              onDirected={onDirected}
            />
          </div>
          <aside
            aria-label={t('inspector.label')}
            className={`min-h-0 w-full shrink-0 overflow-y-auto border-line bg-surface lg:block lg:w-[312px] lg:border-l ${tab === 'inspector' ? 'block' : 'hidden'}`}
          >
            <Inspector
              brand={name}
              colors={view?.colors ?? FALLBACK_COLORS}
              directing={directing}
              document={document}
              selection={selection}
              onPreview={studio.preview}
              onRun={runOne}
            />
          </aside>
          <AnimatePresence>
            {studio.failure === null ? null : (
              <motion.div
                role="alert"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-3 left-1/2 z-30 flex max-w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-[0_8px_24px_-8px_oklch(0.2_0.01_60/0.25)]"
              >
                <span className="mt-1 size-2 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                <span className="flex-1 text-ink">
                  {t(`failure.${failureKey(studio.failure)}`)}
                </span>
                {studio.canRetry ? (
                  <button
                    type="button"
                    onClick={() => {
                      // A failed load is retried as a load, never as a new analysis.
                      void (studio.phase === 'failed' ? studio.reload() : studio.analyze());
                    }}
                    className="shrink-0 font-medium text-ink underline"
                  >
                    {t('retry')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={studio.dismiss}
                  aria-label={t('dismiss')}
                  className="-my-1 grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-elevated hover:text-ink"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {studio.stream === 'reconnecting' ? (
            <p
              role="status"
              className="absolute right-3 bottom-3 m-0 rounded-full bg-elevated px-3 py-1.5 text-xs text-warning"
            >
              {t('streamLost')}
            </p>
          ) : null}
        </main>
        <nav
          aria-label={t('panels')}
          className="grid shrink-0 grid-cols-3 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
              }}
              className="flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-ink-3 aria-pressed:text-ink"
            >
              <Icon aria-hidden="true" className="size-5" />
              {t(`tabs.${id}`)}
            </button>
          ))}
        </nav>
        <ExportDialog
          open={exporting}
          view={view}
          onClose={() => {
            setExporting(false);
          }}
          onPrint={() => {
            // The sheets print with their own fonts: wait for them before opening the print window.
            void window.document.fonts.ready.then(() => {
              window.print();
            });
          }}
        />
      </div>
      {view === null ? null : (
        <div className="print-only" aria-hidden="true">
          {pages.map((page, index) => {
            const Renderer = RENDERERS[page.type];
            const portrait = page.overrides.format === 'portrait';
            return (
              <div key={page.id} className={portrait ? 'print-page print-portrait' : 'print-page'}>
                <Renderer
                  context={{
                    view,
                    words: SHEET_WORDS[view.language],
                    number: index + 1,
                    total: pages.length,
                    portrait,
                    title: page.title,
                    background: page.overrides.background,
                    year,
                    occurrence: occurrences[index] ?? { index: 0, count: 1 },
                    evidence: evidenceOf(page.data),
                    section: sectionOfData(page.data),
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
