'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { SplitWords } from '../../ui/fx';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const QUESTIONS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;

/** Six real objections, answered on the page: an accordion whose buttons announce what they open. */
export function Faq() {
  const t = useTranslations('homePage.faq');
  const [open, setOpen] = useState<string | null>('q1');
  const base = useId();
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto grid max-w-6xl scroll-mt-24 gap-10 px-4 py-24 md:grid-cols-[1fr_1.4fr]"
    >
      <h2
        id="faq-title"
        className="m-0 font-display text-[clamp(2.25rem,6vw,4.75rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance"
      >
        <SplitWords text={t('title')} />
      </h2>
      <ul className="m-0 list-none space-y-3 p-0">
        {QUESTIONS.map((key) => {
          const expanded = open === key;
          const panel = `${base}-${key}`;
          return (
            <motion.li
              key={key}
              layout
              transition={SOFT}
              className="rounded-[28px] border border-line bg-surface px-6"
            >
              <h3 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panel}
                  onClick={() => {
                    setOpen(expanded ? null : key);
                  }}
                  className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 py-5 text-left text-lg font-medium"
                >
                  {t(`${key}.q`)}
                  <motion.span
                    animate={{ rotate: expanded ? 45 : 0 }}
                    transition={SOFT}
                    className="grid size-10 shrink-0 place-items-center rounded-full border border-line"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.p
                    id={panel}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="m-0 max-w-xl pb-6 text-ink-2"
                  >
                    {t(`${key}.a`)}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
