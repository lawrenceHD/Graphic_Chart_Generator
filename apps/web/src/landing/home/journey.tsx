'use client';

import { motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { SplitWords } from '../../ui/fx';
import { JourneyVisual } from './journey-visual';

const STEPS = ['drop', 'watch', 'adjust'] as const;
const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;

/**
 * The three gestures on a night band. From `md` the visual is pinned and follows the scroll; below it, every
 * step carries its own visual (nothing depends on a pinned stage).
 */
export function Journey() {
  const t = useTranslations('homePage.method');
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start center', 'end center'] });
  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(value * STEPS.length))));
  });
  const bar = useSpring(scrollYProgress, { stiffness: 80, damping: 22 });
  return (
    <section
      id="fonctionnement"
      aria-labelledby="journey-title"
      className="theme-night relative mx-2 scroll-mt-24 overflow-clip rounded-[44px] bg-canvas py-20 text-ink sm:mx-4 sm:py-28"
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-0 left-0 h-1.5 w-full origin-left bg-success"
        style={{ scaleX: bar }}
      />
      <div ref={ref} className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
        <h2 id="journey-title" className="sr-only">
          {t('title')}
        </h2>
        <ol className="m-0 list-none space-y-[30vh] p-0 md:space-y-[40vh] md:py-[20vh]">
          {STEPS.map((key, index) => (
            <motion.li
              key={key}
              animate={{ opacity: index === step ? 1 : 0.65, x: index === step ? 14 : 0 }}
              transition={SOFT}
              aria-current={index === step ? 'step' : undefined}
            >
              <span className="font-mono text-sm">0{index + 1}</span>
              <h3 className="m-0 mt-2 font-display text-[clamp(2.75rem,7vw,5.25rem)] leading-none font-extrabold tracking-tight">
                <SplitWords text={t(`${key}.title`)} />
              </h3>
              <p className="mt-4 mb-0 max-w-sm text-lg leading-relaxed text-ink-2">
                {t(`${key}.text`)}
              </p>
              <div className="mt-8 md:hidden">
                <JourneyVisual step={index} />
              </div>
            </motion.li>
          ))}
        </ol>
        <div className="sticky top-24 hidden h-[72vh] items-center md:flex">
          <JourneyVisual step={step} progress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}
