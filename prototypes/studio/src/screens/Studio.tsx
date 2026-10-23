import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useReduce } from '../lib/motion-pref';
import { ThemeSwitch } from '../lib/theme-pref';
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Maximize2,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Share2,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BOARDS, Skeleton, Sheet, type BoardSpec } from '../boards/Boards';
import { BRANDS, svgUrl, type Brand } from '../lib/brand';
import { hexToOklch, inkOn, withHue } from '../lib/color';
import { fade, spring } from '../lib/motion';
import { useBrandPalette, type Palette, type PaletteKey } from '../lib/palette';
import {
  STEP_SHORT,
  STEP_TEXT,
  stepProgress,
  useAnalysisStream,
  type AnalysisState,
  type StreamEvent,
} from '../lib/stream';
import { navigate, useMediaQuery } from '../router';
import { Burst } from '../components/Burst';
import { ExportDialog } from '../components/ExportDialog';

const DISPLAY_FONTS = [
  'Bricolage Grotesque Variable',
  'Space Grotesk Variable',
  'Fraunces Variable',
  'DM Serif Display',
];
const STEPS = [1, 2, 3, 4] as const;

type BoardState = 'waiting' | 'building' | 'ready';
function boardState(board: BoardSpec, analysis: AnalysisState): BoardState {
  const step = analysis.steps[board.step];
  if (step === 'done') return 'ready';
  if (step === 'running') return board.key === 'palette' ? 'ready' : 'building';
  return 'waiting';
}

export function Studio({ slug }: { slug: string | undefined }) {
  const brand = useMemo(() => BRANDS.find((b) => b.slug === slug) ?? BRANDS[0]!, [slug]);
  const reduce = useReduce() ?? false;
  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const analysis = useAnalysisStream(`${brand.slug}:${String(runKey)}`, paused, false);
  const { palette, set, reset } = useBrandPalette(brand);
  const [display, setDisplay] = useState(brand.fonts.display);
  const [history, setHistory] = useState<{ palette: Palette; display: string }[]>([]);
  const [future, setFuture] = useState<{ palette: Palette; display: string }[]>([]);
  const [selected, setSelected] = useState<string>('cover');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDisplay(brand.fonts.display);
    setHistory([]);
    setFuture([]);
  }, [brand]);

  const shown: Brand = useMemo(
    () => ({ ...brand, fonts: { ...brand.fonts, display } }),
    [brand, display],
  );

  // Every edit is a command with an inverse, as in the product (undo / redo, ADR-018).
  const apply = (next: { palette?: Palette; display?: string }, label: string) => {
    setHistory((h) => [...h, { palette, display }]);
    setFuture([]);
    if (next.palette)
      for (const key of Object.keys(next.palette) as PaletteKey[]) set(key, next.palette[key]);
    if (next.display) setDisplay(next.display);
    setToast(label);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((f) => [{ palette, display }, ...f]);
    setHistory((h) => h.slice(0, -1));
    for (const key of Object.keys(previous.palette) as PaletteKey[])
      set(key, previous.palette[key]);
    setDisplay(previous.display);
    setToast('Annulé');
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setHistory((h) => [...h, { palette, display }]);
    setFuture((f) => f.slice(1));
    for (const key of Object.keys(next.palette) as PaletteKey[]) set(key, next.palette[key]);
    setDisplay(next.display);
    setToast('Rétabli');
  };
  useEffect(() => {
    if (toast === null) return;
    const timer = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(timer);
  }, [toast]);

  const suggestions = [
    {
      label: 'Échanger principale et accent',
      run: () =>
        apply(
          { palette: { ...palette, primary: palette.accent, accent: palette.primary } },
          'Principale et accent échangées',
        ),
    },
    {
      label: 'Accent complémentaire',
      run: () => {
        const h = hexToOklch(palette.primary).h ?? 0;
        apply(
          { palette: { ...palette, accent: withHue(palette.accent, h + 180) } },
          'Accent passé en complémentaire',
        );
      },
    },
    {
      label: 'Autre police de titre',
      run: () => {
        const next = DISPLAY_FONTS[(DISPLAY_FONTS.indexOf(display) + 1) % DISPLAY_FONTS.length]!;
        apply({ display: next }, `Titres en ${next.replace(' Variable', '')}`);
      },
    },
    {
      label: 'Revenir aux couleurs du logo',
      run: () => {
        setHistory((h) => [...h, { palette, display }]);
        reset();
        setToast('Couleurs du logo rétablies');
      },
    },
  ];

  const replay = () => {
    setRunKey((k) => k + 1);
    setPaused(false);
  };

  const running = STEPS.find((step) => analysis.steps[step] === 'running');
  const doneCount = STEPS.filter((step) => analysis.steps[step] === 'done').length;
  const announce = analysis.done
    ? 'Charte prête.'
    : running
      ? STEP_TEXT[running]
      : analysis.asset === 'clean'
        ? 'Logo vérifié.'
        : 'Vérification du fichier…';

  const shared = { brand: shown, palette, analysis, selected, setSelected, reduce };
  const desktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="theme-studio flex h-dvh flex-col overflow-hidden">
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <TopBar
        brand={brand}
        analysis={analysis}
        doneCount={doneCount}
        running={running}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        onExport={() => setExporting(true)}
      />
      <div className="relative flex min-h-0 flex-1">
        {desktop ? (
          <>
            <aside className="flex w-[340px] shrink-0 flex-col border-r border-line bg-surface">
              <Timeline
                analysis={analysis}
                paused={paused}
                onPause={() => setPaused((p) => !p)}
                onReplay={replay}
              />
              <EventLog analysis={analysis} brand={brand} />
              <Prompt suggestions={suggestions} disabled={!analysis.done} />
            </aside>
            <Canvas {...shared} />
            <Inspector
              palette={palette}
              display={display}
              brand={brand}
              disabled={!analysis.done}
              onChange={(next, label) => apply(next, label)}
            />
          </>
        ) : (
          <MobileStudio
            {...shared}
            suggestions={suggestions}
            paused={paused}
            onPause={() => setPaused((p) => !p)}
            onReplay={replay}
            display={display}
            onChange={(next, label) => apply(next, label)}
          />
        )}
      </div>
      <AnimatePresence>
        {toast !== null && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={fade}
            className="pointer-events-none fixed left-1/2 top-[72px] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-elevated px-4 py-2 text-sm shadow-lg"
          >
            <Check className="h-4 w-4 text-success" aria-hidden /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
      <Burst
        play={analysis.done}
        colors={[palette.primary, palette.accent, palette.light, '#ffffff']}
      />
      <ExportDialog open={exporting} onClose={() => setExporting(false)} brand={brand} />
    </div>
  );
}

function TopBar(props: {
  brand: Brand;
  analysis: AnalysisState;
  doneCount: number;
  running: 1 | 2 | 3 | 4 | undefined;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}) {
  const { brand, analysis, doneCount, running } = props;
  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-canvas/90 px-2 sm:px-4">
      <IconButton label="Retour à l'accueil" onClick={() => navigate('/')}>
        <ArrowLeft className="h-5 w-5" />
      </IconButton>
      <img
        src={svgUrl(brand.logo)}
        alt=""
        className="h-7 w-7 rounded-[6px] bg-preview object-contain p-1"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">{brand.name}</p>
        <p className="truncate text-xs text-ink-3">{brand.sector}</p>
      </div>
      <ProgressPill analysis={analysis} doneCount={doneCount} running={running} />
      <div className="hidden items-center gap-1 sm:flex">
        <IconButton label="Annuler" onClick={props.onUndo} disabled={!props.canUndo}>
          <Undo2 className="h-5 w-5" />
        </IconButton>
        <IconButton label="Rétablir" onClick={props.onRedo} disabled={!props.canRedo}>
          <Redo2 className="h-5 w-5" />
        </IconButton>
        <IconButton label="Partager">
          <Share2 className="h-5 w-5" />
        </IconButton>
        <ThemeSwitch className="ml-1" />
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={props.onExport}
        disabled={!analysis.done}
        className="flex h-10 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-on-accent transition-opacity disabled:opacity-40 sm:px-4"
      >
        <Download className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Exporter</span>
        <span className="sr-only sm:hidden">Exporter</span>
      </motion.button>
    </header>
  );
}

function ProgressPill({
  analysis,
  doneCount,
  running,
}: {
  analysis: AnalysisState;
  doneCount: number;
  running: 1 | 2 | 3 | 4 | undefined;
}) {
  const ratio = analysis.done
    ? 1
    : (doneCount + (running ? stepProgress(running, analysis.elapsed) : 0)) / 4;
  const r = 9;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="flex h-10 items-center gap-2 rounded-full border border-line bg-surface pl-1.5 pr-3 text-xs">
      <svg viewBox="0 0 24 24" className="h-7 w-7 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
        <motion.circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke={analysis.done ? 'var(--success)' : 'var(--accent)'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: 0.3 }}
        />
      </svg>
      <span className="tabular whitespace-nowrap">
        {analysis.done
          ? 'Charte prête'
          : running
            ? `${String(running)}/4 ${STEP_SHORT[running]}`
            : 'Vérification'}
      </span>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.94 }}
      className="grid h-10 w-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-elevated hover:text-ink disabled:opacity-35"
    >
      {children}
    </motion.button>
  );
}

function Timeline({
  analysis,
  paused,
  onPause,
  onReplay,
}: {
  analysis: AnalysisState;
  paused: boolean;
  onPause: () => void;
  onReplay: () => void;
}) {
  return (
    <section className="border-b border-line p-4" aria-label="Progression de l'analyse">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Analyse</h2>
        <div className="flex">
          <IconButton
            label={paused ? 'Reprendre' : 'Mettre en pause'}
            onClick={onPause}
            disabled={analysis.done}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Rejouer l'analyse" onClick={onReplay}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      <ol className="m-0 list-none space-y-1 p-0">
        {STEPS.map((step) => (
          <StepRow
            key={step}
            step={step}
            state={analysis.steps[step]}
            progress={stepProgress(step, analysis.elapsed)}
          />
        ))}
      </ol>
    </section>
  );
}

function StepRow({
  step,
  state,
  progress,
}: {
  step: 1 | 2 | 3 | 4;
  state: 'waiting' | 'running' | 'done';
  progress: number;
}) {
  return (
    <li
      className={`relative overflow-hidden rounded-[var(--radius-md)] px-3 py-2.5 ${state === 'running' ? 'bg-elevated' : ''}`}
    >
      {state === 'running' && (
        <motion.div
          className="absolute inset-y-0 left-0 w-full origin-left bg-accent/10"
          style={{ scaleX: progress }}
          aria-hidden
        />
      )}
      <div className="relative flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[10px] ${state === 'done' ? 'border-success bg-success text-canvas' : state === 'running' ? 'border-accent text-accent' : 'border-line-strong text-ink-3'}`}
        >
          {state === 'done' ? (
            <Check className="h-3 w-3" aria-hidden />
          ) : state === 'running' ? (
            <Loader2 className="h-3 w-3 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            step
          )}
        </span>
        <div className="min-w-0">
          <p className={`m-0 text-sm ${state === 'waiting' ? 'text-ink-3' : 'text-ink'}`}>
            {STEP_TEXT[step]}
          </p>
          <p className="m-0 text-xs text-ink-3">
            {state === 'done' ? 'Terminé' : state === 'running' ? 'En cours' : 'En attente'}
          </p>
        </div>
      </div>
    </li>
  );
}

const family = (font: string): string => font.replace(/ Variable$/, '');

/** What the stream just said, in the viewer's words, with the time since the upload. */
function describe(event: StreamEvent, brand: Brand): string {
  if (event.type === 'asset.status')
    return event.data.status === 'quarantined'
      ? 'Fichier reçu, contrôle de sécurité en cours'
      : 'Fichier sûr : aucun script ni lien externe';
  if (event.type === 'analysis.done') return 'Charte prête, toutes les pages sont modifiables';
  if (event.data.state === 'running') return `Début : ${STEP_SHORT[event.data.step].toLowerCase()}`;
  const contrasts = brand.contrast.filter((pair) => pair.level !== 'fail').length;
  const done: Record<1 | 2 | 3 | 4, string> = {
    1: brand.mono.separated ? 'Logo lu, formes séparées pour les variantes' : 'Logo lu',
    2: `${String(brand.extracted.length)} couleurs trouvées, ${String(contrasts)} paires de contraste valides`,
    3: `Typographie : ${family(brand.fonts.display)} et ${family(brand.fonts.text)}`,
    4: 'Pages assemblées',
  };
  return done[event.data.step];
}

function EventLog({ analysis, brand }: { analysis: AnalysisState; brand: Brand }) {
  const end = useRef<HTMLLIElement>(null);
  const [raw, setRaw] = useState(false);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [analysis.events.length, raw]);
  // The "running" events only restate the step list above: the journal keeps what each step found.
  const shown = analysis.events.filter(
    (event) => event.type !== 'analysis.step' || event.data.state === 'done',
  );
  return (
    <section tabIndex={0} className="min-h-0 flex-1 overflow-y-auto p-4" aria-label="Journal">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="m-0 text-sm font-semibold">Journal</h2>
        <button
          type="button"
          aria-pressed={raw}
          onClick={() => setRaw((value) => !value)}
          className="h-8 rounded-full px-3 text-xs text-ink-3 hover:bg-elevated hover:text-ink"
        >
          {raw ? 'Vue lisible' : 'Événements bruts'}
        </button>
      </div>
      <ol
        className={`m-0 list-none p-0 ${raw ? 'space-y-1 font-mono text-[11px] leading-relaxed' : 'space-y-2 text-sm'}`}
      >
        <AnimatePresence initial={false}>
          {(raw ? analysis.events : shown).map((event) => (
            <motion.li
              key={`${raw ? 'raw' : 'say'}-${String(event.id)}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={fade}
              className={raw ? 'flex gap-2 text-ink-2' : 'flex items-baseline gap-3'}
            >
              {raw ? (
                <>
                  <span className="tabular text-ink-3">#{event.id}</span>
                  <span className="text-ink">{event.type}</span>
                  <span className="truncate">{JSON.stringify(event.data)}</span>
                </>
              ) : (
                <>
                  <span className="tabular w-11 shrink-0 text-right text-xs text-ink-3">
                    {(event.at / 1000).toLocaleString('fr-FR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    s
                  </span>
                  <span className="text-ink-2">{describe(event, brand)}</span>
                </>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        <li ref={end} />
      </ol>
    </section>
  );
}

function Prompt({
  suggestions,
  disabled,
  compact = false,
}: {
  suggestions: { label: string; run: () => void }[];
  disabled: boolean;
  compact?: boolean;
}) {
  const [text, setText] = useState('');
  return (
    <div className={compact ? '' : 'border-t border-line p-4'}>
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {suggestions.map((suggestion) => (
          <motion.button
            key={suggestion.label}
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={disabled}
            onClick={suggestion.run}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line-strong/60 bg-elevated px-3 text-xs text-ink-2 transition-colors hover:text-ink disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
            {suggestion.label}
          </motion.button>
        ))}
      </div>
      <form
        className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-line-strong bg-canvas p-2 focus-within:border-focus"
        onSubmit={(event) => {
          event.preventDefault();
          setText('');
        }}
      >
        <label className="sr-only" htmlFor={compact ? 'prompt-mobile' : 'prompt'}>
          Demander une modification
        </label>
        <textarea
          id={compact ? 'prompt-mobile' : 'prompt'}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={
            disabled ? 'Disponible quand la charte est prête…' : 'Demander une modification…'
          }
          disabled={disabled}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-3"
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.94 }}
          disabled={disabled || text.trim() === ''}
          aria-label="Envoyer"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent disabled:opacity-35"
        >
          <ArrowUp className="h-4 w-4" />
        </motion.button>
      </form>
    </div>
  );
}

interface SharedProps {
  brand: Brand;
  palette: Palette;
  analysis: AnalysisState;
  selected: string;
  setSelected: (key: string) => void;
  reduce: boolean;
}

function BoardSlot({
  board,
  brand,
  palette,
  analysis,
  reduce,
  index,
}: {
  board: BoardSpec;
  brand: Brand;
  palette: Palette;
  analysis: AnalysisState;
  reduce: boolean;
  index: number;
}) {
  const state = boardState(board, analysis);
  const progress = board.key === 'palette' ? stepProgress(2, analysis.elapsed) : 1;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {state === 'ready' ? (
        <motion.div
          key="ready"
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.96, y: 18, rotate: index % 2 ? 1.2 : -1.2 }
          }
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={reduce ? { duration: 0.1 } : spring}
        >
          <board.Component brand={brand} palette={palette} progress={progress} />
        </motion.div>
      ) : (
        <motion.div key="wait" exit={{ opacity: 0 }} transition={fade}>
          <Sheet
            brand={brand}
            title={board.title}
            page={index + 1}
            palette={{ ...palette, dark: '#9a9a9a' }}
          >
            {state === 'building' ? (
              <Skeleton />
            ) : (
              <p className="text-[2.6cqw] opacity-60">En attente de l'étape {board.step}…</p>
            )}
          </Sheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Desktop: a free canvas (pan by dragging the background, zoom with buttons or Ctrl + wheel). */
function Canvas({ brand, palette, analysis, selected, setSelected, reduce }: SharedProps) {
  const [zoom, setZoom] = useState(0.62);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = area.current;
    if (!node) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((z) => Math.min(1.6, Math.max(0.3, z * (event.deltaY > 0 ? 0.92 : 1.08))));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <main
      ref={area}
      className="relative min-w-0 flex-1 overflow-hidden"
      aria-label="Toile de la charte"
    >
      <div
        className="absolute inset-0 [background-image:radial-gradient(var(--border-subtle)_1px,transparent_1px)] [background-size:22px_22px]"
        aria-hidden
      />
      <motion.div
        drag
        dragMomentum={!reduce}
        className="absolute left-0 top-0 cursor-grab active:cursor-grabbing"
        style={{ padding: 64 }}
      >
        <motion.div
          animate={{ scale: zoom }}
          transition={spring}
          style={{ transformOrigin: '0 0' }}
          className="flex gap-12"
        >
          {BOARDS.map((board, index) => (
            <div key={board.key} className="relative w-[460px] shrink-0">
              <button
                type="button"
                onClick={() => setSelected(board.key)}
                className={`mb-3 flex h-11 items-center gap-2 rounded-full px-3 text-[15px] ${selected === board.key ? 'text-ink' : 'text-ink-3'}`}
              >
                <span className="font-mono text-xs tabular">
                  {String(index + 1).padStart(2, '0')}
                </span>{' '}
                {board.title}
              </button>
              <div
                onPointerDown={() => setSelected(board.key)}
                className={`rounded-[24px] outline-offset-[8px] transition-[outline-color] ${selected === board.key ? 'outline outline-2 outline-accent' : 'outline outline-2 outline-transparent'}`}
              >
                <BoardSlot
                  board={board}
                  brand={brand}
                  palette={palette}
                  analysis={analysis}
                  reduce={reduce}
                  index={index}
                />
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
      <div className="glass absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface/80 p-1 backdrop-blur-md">
        <IconButton label="Dézoomer" onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}>
          <Minus className="h-4 w-4" />
        </IconButton>
        <span className="w-12 text-center font-mono text-xs tabular">
          {Math.round(zoom * 100)} %
        </span>
        <IconButton label="Zoomer" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}>
          <Plus className="h-4 w-4" />
        </IconButton>
        <IconButton label="Vue d'ensemble" onClick={() => setZoom(0.42)}>
          <Maximize2 className="h-4 w-4" />
        </IconButton>
      </div>
    </main>
  );
}

const KEYS: { key: PaletteKey; label: string }[] = [
  { key: 'primary', label: 'Principale' },
  { key: 'accent', label: 'Accent' },
  { key: 'light', label: 'Neutre clair' },
  { key: 'dark', label: 'Neutre sombre' },
];

function PaletteEditor({
  palette,
  brand,
  disabled,
  onChange,
}: {
  palette: Palette;
  brand: Brand;
  disabled: boolean;
  onChange: (next: { palette: Palette }, label: string) => void;
}) {
  const [open, setOpen] = useState<PaletteKey | null>('primary');
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      {KEYS.map(({ key, label }) => {
        const hex = palette[key];
        const hue = Math.round(hexToOklch(hex).h ?? 0);
        const expanded = open === key;
        return (
          <li key={key} className="rounded-[var(--radius-md)] border border-line bg-canvas">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : key)}
              className="flex w-full items-center gap-3 p-2 text-left"
            >
              <motion.span
                className="h-9 w-9 rounded-[8px] border border-ink/10"
                animate={{ backgroundColor: hex }}
                style={{ background: hex }}
              />
              <span className="flex-1">
                <span className="block text-sm">{label}</span>
                <span className="block font-mono text-xs text-ink-3">{hex}</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fade}
                  className="space-y-3 px-3 pb-3"
                >
                  <label className="block text-xs text-ink-3">
                    Teinte · {hue}°
                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={hue}
                      disabled={disabled || hexToOklch(hex).C < 0.02}
                      onChange={(event) =>
                        onChange(
                          {
                            palette: {
                              ...palette,
                              [key]: withHue(hex, Number(event.target.value)),
                            },
                          },
                          `${label} : teinte ${event.target.value}°`,
                        )
                      }
                      className="mt-1 h-6 w-full accent-[var(--accent)]"
                      style={{ background: 'transparent' }}
                    />
                  </label>
                  <div>
                    <p className="mb-1.5 text-xs text-ink-3">Couleurs trouvées dans le logo</p>
                    <div className="flex flex-wrap gap-2">
                      {brand.extracted.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          disabled={disabled}
                          aria-label={`Utiliser ${color.hex} (${String(Math.round(color.share * 100))} % du logo)`}
                          onClick={() =>
                            onChange(
                              { palette: { ...palette, [key]: color.hex } },
                              `${label} : ${color.hex}`,
                            )
                          }
                          className="grid h-9 w-9 place-items-center rounded-[8px] border border-ink/15"
                          style={{ background: color.hex }}
                        >
                          {color.hex === hex && (
                            <Check
                              className="h-4 w-4"
                              style={{ color: inkOn(color.hex) }}
                              aria-hidden
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function FontPicker({
  display,
  disabled,
  onChange,
}: {
  display: string;
  disabled: boolean;
  onChange: (next: { display: string }, label: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Police des titres">
      {DISPLAY_FONTS.map((font) => (
        <button
          key={font}
          type="button"
          role="radio"
          aria-checked={font === display}
          disabled={disabled}
          onClick={() => onChange({ display: font }, `Titres en ${font.replace(' Variable', '')}`)}
          className={`rounded-[var(--radius-md)] border p-2 text-left transition-colors ${font === display ? 'border-accent bg-accent/10' : 'border-line bg-canvas'}`}
        >
          <span className="block text-2xl leading-none" style={{ fontFamily: font }}>
            Aa
          </span>
          <span className="mt-1 block truncate text-[11px] text-ink-3">
            {font.replace(' Variable', '')}
          </span>
        </button>
      ))}
    </div>
  );
}

function Inspector({
  palette,
  display,
  brand,
  disabled,
  onChange,
}: {
  palette: Palette;
  display: string;
  brand: Brand;
  disabled: boolean;
  onChange: (next: { palette?: Palette; display?: string }, label: string) => void;
}) {
  return (
    <aside
      className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-line bg-surface p-4 xl:block"
      aria-label="Inspecteur"
    >
      <h2 className="mb-3 text-sm font-semibold">Palette</h2>
      <PaletteEditor palette={palette} brand={brand} disabled={disabled} onChange={onChange} />
      <h2 className="mb-3 mt-6 text-sm font-semibold">Typographie</h2>
      <FontPicker display={display} disabled={disabled} onChange={onChange} />
      <p className="mt-6 text-xs leading-relaxed text-ink-3">
        Chaque modification est une commande annulable. Les contrastes sont recalculés par le moteur
        de couleur à chaque changement.
      </p>
    </aside>
  );
}

/** Mobile: swipeable pages, a progress pill, and a bottom sheet with three detents. */
function MobileStudio(
  props: SharedProps & {
    suggestions: { label: string; run: () => void }[];
    paused: boolean;
    onPause: () => void;
    onReplay: () => void;
    display: string;
    onChange: (next: { palette?: Palette; display?: string }, label: string) => void;
  },
) {
  const { brand, palette, analysis, reduce } = props;
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState<0 | 1 | 2>(0);
  const [tab, setTab] = useState<'chat' | 'palette' | 'type'>('chat');

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const onScroll = () => setActive(Math.round(node.scrollLeft / node.clientWidth));
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, []);
  const go = (index: number) =>
    track.current?.scrollTo({
      left: index * (track.current.clientWidth ?? 0),
      behavior: reduce ? 'auto' : 'smooth',
    });

  // Follow the build: jump to the page that is being filled, until the user takes over.
  const followed = useRef(true);
  const building = BOARDS.findIndex((board) => boardState(board, analysis) !== 'ready');
  useEffect(() => {
    if (!followed.current || analysis.done) return;
    const target = building === -1 ? BOARDS.length - 1 : Math.max(0, building - 1);
    if (target !== active) go(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building]);

  const heights = ['132px', '52dvh', '86dvh'];
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -60 || info.velocity.y < -400)
      setSheet((s) => (s < 2 ? ((s + 1) as 1 | 2) : s));
    else if (info.offset.y > 60 || info.velocity.y > 400)
      setSheet((s) => (s > 0 ? ((s - 1) as 0 | 1) : s));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <nav
        className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2"
        aria-label="Pages de la charte"
      >
        {BOARDS.map((board, index) => {
          const state = boardState(board, analysis);
          return (
            <button
              key={board.key}
              type="button"
              aria-current={active === index ? 'page' : undefined}
              onClick={() => {
                followed.current = false;
                go(index);
              }}
              className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs ${active === index ? 'text-ink' : 'text-ink-3'}`}
            >
              {active === index && (
                <motion.span
                  layoutId="page-pill"
                  className="absolute inset-0 rounded-full bg-elevated"
                  transition={spring}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {state === 'ready' ? (
                  <Check className="h-3 w-3 text-success" aria-hidden />
                ) : state === 'building' ? (
                  <Loader2
                    className="h-3 w-3 animate-spin text-accent motion-reduce:animate-none"
                    aria-hidden
                  />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-3" aria-hidden />
                )}
                {board.title}
              </span>
            </button>
          );
        })}
      </nav>
      <div
        ref={track}
        tabIndex={0}
        aria-label="Pages de la charte, balayer pour changer"
        onTouchStart={() => (followed.current = false)}
        className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto"
        style={{ paddingBottom: 140 }}
      >
        {BOARDS.map((board, index) => (
          <section
            key={board.key}
            className="flex w-full shrink-0 snap-center justify-center px-4 pt-2"
            aria-label={board.title}
          >
            <div className="w-full max-w-[460px]">
              <BoardSlot
                board={board}
                brand={brand}
                palette={palette}
                analysis={analysis}
                reduce={reduce}
                index={index}
              />
            </div>
          </section>
        ))}
      </div>
      <motion.section
        aria-label="Copilote et réglages"
        className="glass fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-[32px] border-t border-line bg-surface/95 backdrop-blur-xl"
        animate={{ height: heights[sheet] }}
        transition={reduce ? { duration: 0 } : spring}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
          className="flex cursor-grab touch-none justify-center pb-1 pt-2"
        >
          <button
            type="button"
            aria-label={sheet === 0 ? 'Agrandir le panneau' : 'Réduire le panneau'}
            onClick={() => setSheet((s) => (s === 0 ? 1 : 0))}
            className="grid h-6 w-16 place-items-center"
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </button>
        </motion.div>
        <div className="flex items-center gap-2 px-4 pb-2">
          <div role="tablist" className="flex flex-1 gap-1 rounded-full bg-canvas p-1">
            {(
              [
                ['chat', 'Copilote'],
                ['palette', 'Palette'],
                ['type', 'Typo'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => {
                  setTab(key);
                  if (sheet === 0 && key !== 'chat') setSheet(1);
                }}
                className={`relative h-9 flex-1 rounded-full text-xs ${tab === key ? 'text-ink' : 'text-ink-3'}`}
              >
                {tab === key && (
                  <motion.span
                    layoutId="sheet-tab"
                    className="absolute inset-0 rounded-full bg-elevated"
                    transition={spring}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <IconButton
            label={props.paused ? 'Reprendre' : 'Mettre en pause'}
            onClick={props.onPause}
            disabled={analysis.done}
          >
            {props.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Rejouer l'analyse" onClick={props.onReplay}>
            <RotateCcw className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {tab === 'chat' && (
            <>
              {sheet > 0 && (
                <ol className="m-0 mb-3 list-none space-y-1 p-0">
                  {STEPS.map((step) => (
                    <StepRow
                      key={step}
                      step={step}
                      state={analysis.steps[step]}
                      progress={stepProgress(step, analysis.elapsed)}
                    />
                  ))}
                </ol>
              )}
              <Prompt suggestions={props.suggestions} disabled={!analysis.done} compact />
            </>
          )}
          {tab === 'palette' && (
            <PaletteEditor
              palette={palette}
              brand={brand}
              disabled={!analysis.done}
              onChange={props.onChange}
            />
          )}
          {tab === 'type' && (
            <FontPicker
              display={props.display}
              disabled={!analysis.done}
              onChange={props.onChange}
            />
          )}
        </div>
      </motion.section>
    </div>
  );
}
