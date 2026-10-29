'use client';

import type { BrandDocument, Command } from '@app/document';
import { ArrowUp, Check, Loader2, RotateCcw, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { contrastVerdict } from '../../brand/color';
import { PAIRINGS } from '../../brand/pairings';
import type { Timeline } from '../timeline';
import { insightsOf, suggestionsOf, type Insight, type Suggestion } from './insights';
import { readIntent, type Reply } from './intents';
import type { JournalEntry, Phase } from './use-studio';

// Left column of the studio (SETO inspiration, DESIGN.md): the analysis told as steps with what each one found,
// then a conversation where every finding cites its measurement and every proposal is a reversible command.
const STEP_KEYS = ['read', 'palette', 'write', 'assemble'] as const;
const EASE = [0.16, 1, 0.3, 1] as const;

type MessageBody =
  | { readonly from: 'you'; readonly text: string }
  | { readonly from: 'charta'; readonly reply: Reply }
  | { readonly from: 'charta'; readonly done: Suggestion['id'] }
  | { readonly from: 'charta'; readonly unknown: true }
  | { readonly from: 'charta'; readonly failed: true }
  | { readonly from: 'charta'; readonly pending: true };
type Message = MessageBody & { readonly id: number };

function Evidence({ children }: { readonly children: ReactNode }) {
  return (
    <span className="tabular inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-2 py-0.5 font-mono text-[11px] text-ink-2">
      {children}
    </span>
  );
}

function Swatch({ hex }: { readonly hex: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 rounded-[3px] border border-line"
      style={{ background: hex }}
    />
  );
}

function StepList({
  timeline,
  journal,
  onRetry,
}: {
  readonly timeline: Timeline;
  readonly journal: readonly JournalEntry[];
  readonly onRetry: () => void;
}) {
  const t = useTranslations('analysis');
  const tw = useTranslations('workspace.steps');
  const doneAt = (step: number): number | null => {
    const entry = journal.find(
      (item) =>
        (item.event.type === 'analysis.step' &&
          item.event.data.step === step &&
          item.event.data.state === 'done') ||
        (step === 4 && item.event.type === 'analysis.done'),
    );
    return entry === undefined ? null : entry.at;
  };
  return (
    <ol className="m-0 flex list-none flex-col gap-1 p-0" aria-label={t('title')}>
      {timeline.steps.map((step, index) => {
        const key = STEP_KEYS[index] ?? 'read';
        const at = doneAt(index + 1);
        return (
          <li
            key={key}
            className={`relative flex items-start gap-3 overflow-hidden rounded-lg px-3 py-2.5 ${step.state === 'running' ? 'bg-elevated' : ''}`}
          >
            {step.state === 'running' ? (
              <span aria-hidden="true" className="sweep absolute inset-0" />
            ) : null}
            <span
              className={`relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                step.state === 'done'
                  ? 'border-success bg-success text-canvas'
                  : step.state === 'failed'
                    ? 'border-danger bg-danger text-canvas'
                    : step.state === 'running'
                      ? 'border-ink text-ink'
                      : 'border-line-strong text-ink-3'
              }`}
            >
              {step.state === 'done' ? (
                <Check aria-hidden="true" className="size-3" strokeWidth={3} />
              ) : step.state === 'failed' ? (
                <X aria-hidden="true" className="size-3" strokeWidth={3} />
              ) : step.state === 'running' ? (
                <Loader2
                  aria-hidden="true"
                  className="size-3 animate-spin motion-reduce:animate-none"
                />
              ) : (
                <span className="font-mono text-[10px]">{index + 1}</span>
              )}
            </span>
            <div className="relative min-w-0 flex-1">
              <p
                className={`m-0 text-sm leading-snug ${step.state === 'pending' ? 'text-ink-3' : 'text-ink'}`}
              >
                {t(`steps.${key}`)}
              </p>
              <p className="m-0 flex items-center gap-2 text-xs text-ink-3">
                {t(`state.${step.state}`)}
                {at === null ? null : (
                  <span className="tabular font-mono">
                    {tw('at', { seconds: (at / 1000).toFixed(1) })}
                  </span>
                )}
              </p>
              {step.state === 'failed' ? (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs text-ink hover:bg-elevated"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  {t('retry')}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InsightCard({
  insight,
  onApply,
  disabled,
}: {
  readonly insight: Insight;
  readonly onApply: (commands: readonly Command[]) => void;
  readonly disabled: boolean;
}) {
  const t = useTranslations('workspace.insight');
  const tr = useTranslations('workspace.roles');
  const tl = useTranslations('workspace.levels');
  if (insight.kind === 'palette')
    return (
      <p className="m-0">
        {t('palette', { found: insight.found })}{' '}
        <Evidence>
          <Swatch hex={insight.primary} />
          {insight.primary}
        </Evidence>{' '}
        <Evidence>
          <Swatch hex={insight.accent} />
          {insight.accent}
        </Evidence>
      </p>
    );
  if (insight.kind === 'contrast-ok') {
    const verdict = contrastVerdict(insight.ratio);
    return (
      <p className="m-0">
        {t('contrast', { text: tr(insight.text), background: tr(insight.background) })}{' '}
        <Evidence>
          {verdict.tone === 'ok' ? (
            <Check aria-hidden="true" className="size-3 text-success" />
          ) : (
            <X aria-hidden="true" className="size-3 text-danger" />
          )}
          {insight.ratio.toFixed(2)}:1 · {tl(verdict.level)}
        </Evidence>
      </p>
    );
  }
  if (insight.kind === 'contrast-fix')
    return (
      <div className="flex flex-col gap-2">
        <p className="m-0">
          {t('fix', { role: tr(insight.role), against: tr(insight.against) })}{' '}
          <Evidence>
            <X aria-hidden="true" className="size-3 text-danger" />
            {insight.ratio.toFixed(2)}:1
          </Evidence>
        </p>
        <p className="m-0">
          {t('fixProposal')}{' '}
          <Evidence>
            <Swatch hex={insight.proposed} />
            {insight.proposed} · {insight.proposedRatio.toFixed(2)}:1
          </Evidence>
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onApply([insight.command]);
          }}
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-on-accent disabled:opacity-40"
        >
          <Check aria-hidden="true" className="size-3.5" />
          {t('apply')}
        </button>
      </div>
    );
  if (insight.kind === 'typography') {
    const pairing = PAIRINGS[insight.pairingId];
    return (
      <p className="m-0">
        {t('typography')}{' '}
        <Evidence>
          {pairing.display.name} + {pairing.text.name}
        </Evidence>
      </p>
    );
  }
  if (insight.kind === 'review') return <p className="m-0">{t('review')}</p>;
  if (insight.kind === 'texts-from-brief')
    return (
      <div className="flex flex-col gap-2">
        <p className="m-0">{t('fromBrief')}</p>
        {[insight.mission, insight.vision].map((text) =>
          text === null ? null : (
            <blockquote key={text} className="m-0 rounded-lg bg-canvas px-3 py-2 text-ink">
              {text}
            </blockquote>
          ),
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onApply(insight.commands);
          }}
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full bg-accent px-3.5 text-xs font-semibold text-on-accent disabled:opacity-40"
        >
          <Check aria-hidden="true" className="size-3.5" />
          {t('fromBriefApply')}
        </button>
      </div>
    );
  return <p className="m-0">{insight.hasBrief ? t('textsBrief') : t('textsNoBrief')}</p>;
}

function ReplyText({ reply }: { readonly reply: Reply }) {
  const t = useTranslations('workspace.reply');
  const tr = useTranslations('workspace.roles');
  const tf = useTranslations('workspace.format');
  switch (reply.id) {
    case 'color-set':
    case 'color-darker':
    case 'color-lighter':
    case 'color-warmer':
    case 'color-cooler':
      return (
        <>
          {t(reply.id, { role: tr(reply.role) })}{' '}
          <Evidence>
            <Swatch hex={reply.hex} />
            {reply.hex}
          </Evidence>
        </>
      );
    case 'swap':
      return <>{t('swap')}</>;
    case 'typeface':
      return (
        <>
          {t('typeface')} <Evidence>{reply.pairing}</Evidence>
        </>
      );
    case 'format':
      return <>{t('format', { format: tf(reply.format) })}</>;
    case 'title':
      return <>{t('title', { title: reply.title })}</>;
  }
}

function Bubble({
  from,
  children,
}: {
  readonly from: 'you' | 'charta';
  readonly children: ReactNode;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.45, ease: EASE }}
      className={from === 'you' ? 'flex justify-end' : 'flex gap-2.5'}
    >
      {from === 'charta' ? (
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
        >
          <Sparkles className="size-3.5" />
        </span>
      ) : null}
      <div
        className={
          from === 'you'
            ? 'max-w-[85%] rounded-2xl rounded-br-md bg-elevated px-3.5 py-2 text-sm text-ink'
            : 'min-w-0 flex-1 text-sm leading-relaxed text-ink-2'
        }
      >
        {children}
      </div>
    </motion.li>
  );
}

export function CopilotPanel({
  phase,
  timeline,
  journal,
  document,
  brief,
  selectedPageId,
  busy,
  onRun,
  onRetry,
}: {
  readonly phase: Phase;
  readonly timeline: Timeline;
  readonly journal: readonly JournalEntry[];
  readonly document: BrandDocument | null;
  readonly brief: string | null;
  readonly selectedPageId: string | null;
  readonly busy: boolean;
  readonly onRun: (commands: readonly Command[]) => Promise<boolean>;
  readonly onRetry: () => void;
}) {
  const t = useTranslations('workspace');
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const counter = useRef(0);
  const thread = useRef<HTMLDivElement>(null);
  const ready = phase === 'ready' && document !== null;

  // Findings are computed once per analysis (the document at "ready"), not after each edit.
  const [analysed, setAnalysed] = useState<BrandDocument | null>(null);
  useEffect(() => {
    if (ready && analysed === null) setAnalysed(document);
  }, [ready, analysed, document]);
  const insights = useMemo(
    () => (analysed === null ? [] : insightsOf(analysed, brief)),
    [analysed, brief],
  );
  const suggestions: readonly Suggestion[] = useMemo(
    () => (document === null ? [] : suggestionsOf(document)),
    [document],
  );

  useEffect(() => {
    // Scrolls the thread only: scrollIntoView would also scroll the page around the studio.
    const node = thread.current;
    node?.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages.length, insights.length, timeline]);

  const push = (message: MessageBody): number => {
    counter.current += 1;
    const id = counter.current;
    setMessages((list) => [...list, { ...message, id }]);
    return id;
  };
  // The answer takes the place of its own placeholder, so replies keep the order of the requests.
  const settle = (id: number, message: MessageBody): void => {
    setMessages((list) => list.map((entry) => (entry.id === id ? { ...message, id } : entry)));
  };

  const submit = async (): Promise<void> => {
    const request = text.trim();
    if (request === '' || document === null || busy) return;
    setText('');
    push({ from: 'you', text: request });
    const intent = readIntent(request, document, selectedPageId);
    if (intent.kind === 'unknown') {
      push({ from: 'charta', unknown: true });
      return;
    }
    const placeholder = push({ from: 'charta', pending: true });
    const applied = await onRun(intent.commands);
    settle(
      placeholder,
      applied ? { from: 'charta', reply: intent.reply } : { from: 'charta', failed: true },
    );
  };

  return (
    <section aria-label={t('copilot')} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="m-0 text-sm font-semibold">{t('copilot')}</h2>
        <span className="text-xs text-ink-3">{t('copilotNote')}</span>
      </div>
      <div
        ref={thread}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-3"
        tabIndex={0}
        aria-label={t('thread')}
      >
        <StepList timeline={timeline} journal={journal} onRetry={onRetry} />
        <ol className="m-0 mt-4 flex list-none flex-col gap-4 px-1 p-0" aria-live="polite">
          <AnimatePresence initial={false}>
            {insights.map((insight, index) => (
              <Bubble key={`insight-${String(index)}`} from="charta">
                <InsightCard
                  insight={insight}
                  disabled={busy}
                  onApply={(commands) => {
                    void onRun(commands);
                  }}
                />
              </Bubble>
            ))}
            {messages.map((message) => (
              <Bubble key={message.id} from={message.from}>
                {message.from === 'you' ? (
                  message.text
                ) : 'reply' in message ? (
                  <ReplyText reply={message.reply} />
                ) : 'done' in message ? (
                  t('applied', { change: t(`suggestions.${message.done}`) })
                ) : 'pending' in message ? (
                  <span className="inline-flex items-center gap-2 text-ink-3">
                    <Loader2
                      aria-hidden="true"
                      className="size-3.5 animate-spin motion-reduce:animate-none"
                    />
                    {t('working')}
                  </span>
                ) : 'unknown' in message ? (
                  t('unknown')
                ) : (
                  t('failedReply')
                )}
              </Bubble>
            ))}
          </AnimatePresence>
        </ol>
      </div>
      <div className="border-t border-line p-3">
        <div className="no-scrollbar -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1">
          {suggestions.map((suggestion) => (
            <motion.button
              key={suggestion.id}
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={!ready || busy}
              onClick={() => {
                push({ from: 'you', text: t(`suggestions.${suggestion.id}`) });
                const placeholder = push({ from: 'charta', pending: true });
                void onRun(suggestion.commands).then((applied) => {
                  settle(
                    placeholder,
                    applied
                      ? { from: 'charta', done: suggestion.id }
                      : { from: 'charta', failed: true },
                  );
                });
              }}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-canvas px-3 text-xs text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              <Sparkles aria-hidden="true" className="size-3" />
              {t(`suggestions.${suggestion.id}`)}
            </motion.button>
          ))}
        </div>
        <form
          className="flex items-end gap-2 rounded-xl border border-line-strong bg-canvas p-1.5 transition-colors focus-within:border-focus"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="copilot-prompt" className="sr-only">
            {t('promptLabel')}
          </label>
          <textarea
            id="copilot-prompt"
            rows={1}
            value={text}
            disabled={!ready}
            onChange={(event) => {
              setText(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={ready ? t('prompt') : t('promptWaiting')}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-3"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.92 }}
            disabled={!ready || busy || text.trim() === ''}
            aria-label={t('send')}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-opacity disabled:opacity-30"
          >
            <ArrowUp aria-hidden="true" className="size-4" />
          </motion.button>
        </form>
      </div>
    </section>
  );
}
