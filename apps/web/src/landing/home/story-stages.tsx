'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { DemoSheet } from '../demo-sheet';
import { useBrand } from './brand-context';

export type StoryStep = 'drop' | 'watch' | 'adjust';
const EASE = [0.16, 1, 0.3, 1] as const;

/** Step one: the file lands in the drop frame, its provenance is stated. */
function DropStage() {
  const t = useTranslations('homePage.story');
  const { example } = useBrand();
  return (
    <div className="drafting grid h-full place-items-center rounded-lg bg-preview p-6">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative grid aspect-square w-3/5 max-w-[260px] place-items-center rounded-xl border-2 border-dashed border-line-strong bg-surface/70"
      >
        <img src={example.logo} alt="" className="size-3/5 object-contain" />
        <span className="absolute -bottom-3 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-2">
          {t('file', { name: example.name })}
        </span>
      </motion.div>
    </div>
  );
}

/** Step two: the measures arrive one by one, each with its value. */
function WatchStage() {
  const t = useTranslations('homePage.story');
  const { example } = useBrand();
  return (
    <div className="flex h-full flex-col justify-center gap-5 rounded-lg bg-preview p-6">
      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {example.colors.map((color, index) => (
          <motion.li
            key={color.role}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: index * 0.12 }}
            className="flex flex-col gap-1.5"
          >
            <span
              aria-hidden="true"
              className="block h-20 rounded-md border border-line"
              style={{ backgroundColor: color.hex }}
            />
            <span className="tabular font-mono text-xs text-ink">{color.hex}</span>
          </motion.li>
        ))}
      </ul>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {example.contrasts.map((pair, index) => (
          <motion.li
            key={`${pair.foreground}-${pair.background}`}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.5 + index * 0.12 }}
            className="flex items-center justify-between rounded-md bg-surface px-3 py-2 text-sm"
          >
            <span className="text-ink-2">
              {t(`role.${pair.foreground}`)} / {t(`role.${pair.background}`)}
            </span>
            <span className="tabular font-mono">
              {pair.ratio}:1 · {t(`level.${pair.level}`)}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** Step three: a sentence becomes a reversible command; the page it touched is shown. */
function AdjustStage() {
  const t = useTranslations('homePage.story');
  const { example } = useBrand();
  return (
    <div className="grid h-full gap-4 rounded-lg bg-preview p-5 sm:grid-cols-[1fr_1.2fr] sm:items-center">
      <div className="flex flex-col gap-3 text-sm">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="m-0 self-end rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-on-accent"
        >
          {t('say')}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
          className="m-0 rounded-2xl rounded-bl-sm bg-surface px-4 py-2.5 text-ink"
        >
          {t('done')}
          <span className="mt-2 flex items-center gap-2 font-mono text-xs text-ink-3">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            {t('undoable')}
          </span>
        </motion.p>
      </div>
      <motion.div
        initial={{ opacity: 0, rotate: -3, y: 20 }}
        animate={{ opacity: 1, rotate: -1.5, y: 0 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
        className="overflow-hidden rounded-md bg-surface shadow-xl ring-1 ring-line"
      >
        <DemoSheet type="contrast" exampleId={example.id} />
      </motion.div>
    </div>
  );
}

export function StoryStage({ step }: { readonly step: StoryStep }) {
  if (step === 'drop') return <DropStage />;
  if (step === 'watch') return <WatchStage />;
  return <AdjustStage />;
}
