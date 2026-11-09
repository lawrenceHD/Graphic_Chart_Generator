'use client';

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { StoryStage, type StoryStep } from './story-stages';

const STEPS: readonly StoryStep[] = ['drop', 'watch', 'adjust'];

/**
 * The three gestures as a scroll story: on wide screens the stage is pinned and follows the scroll, below
 * `lg` every step carries its own stage (nothing is pinned, nothing is hidden behind a gesture).
 */
export function Story() {
  const t = useTranslations('homePage.method');
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  useMotionValueEvent(scrollYProgress, 'change', (progress) => {
    setActive(Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length)));
  });
  const current = STEPS[active] ?? 'drop';
  return (
    <section
      id="methode"
      ref={ref}
      aria-labelledby="method-title"
      className="relative scroll-mt-24 border-y border-line bg-surface lg:h-[260vh]"
    >
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 lg:sticky lg:top-0 lg:h-dvh lg:grid-cols-12 lg:items-center lg:py-0">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <h2
            id="method-title"
            className="m-0 font-display text-4xl leading-[1] font-extrabold tracking-tight text-balance"
          >
            {t('title')}
          </h2>
          <ol className="m-0 flex list-none flex-col gap-4 p-0">
            {STEPS.map((step, index) => (
              <li
                key={step}
                aria-current={index === active ? 'step' : undefined}
                className={`flex flex-col gap-3 border-l-2 pl-5 transition-[border-color,opacity] duration-500 lg:gap-0 ${index === active ? 'border-ink opacity-100' : 'border-line lg:opacity-45'}`}
              >
                <span className="font-mono text-xs text-ink-3">0{index + 1}</span>
                <h3 className="m-0 font-display text-2xl font-bold tracking-tight">
                  {t(`${step}.title`)}
                </h3>
                <p className="m-0 max-w-[48ch] text-base text-ink-2">{t(`${step}.text`)}</p>
                <div className="h-[340px] lg:hidden">
                  <StoryStage step={step} />
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="hidden h-[560px] overflow-hidden rounded-xl border border-line bg-canvas p-3 shadow-xl lg:col-span-7 lg:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              className="h-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              <StoryStage step={current} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
