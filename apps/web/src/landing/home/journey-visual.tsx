'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DemoSheet } from '../demo-sheet';
import { useBrand } from './brand-context';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
const FADE = { duration: 0.8, ease: [0.16, 1, 0.3, 1] } as const;
const STAGES = ['stage1', 'stage2', 'stage3', 'stage4'] as const;
const PAGES = ['typography', 'palette', 'cover'] as const;

/** What each of the three gestures looks like, drawn from the example on screen (decorative: the text carries the meaning). */
export function JourneyVisual({
  step,
  progress,
}: {
  readonly step: number;
  readonly progress?: MotionValue<number>;
}) {
  const t = useTranslations('homePage.journey');
  const { example } = useBrand();
  const fallback = useMotionValue(1);
  const rotate = useTransform(progress ?? fallback, [0, 1], [-3, 3]);
  return (
    <motion.div
      aria-hidden="true"
      style={{ rotate }}
      className="relative aspect-square w-full max-w-lg overflow-hidden rounded-[40px] bg-elevated p-7"
    >
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="drop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            className="grid h-full place-items-center rounded-[30px] border-2 border-dashed border-line-strong"
          >
            <motion.img
              src={example.logo}
              alt=""
              className="size-32 rounded-[30px] bg-preview p-5"
              initial={{ y: -170, rotate: -18 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 140, damping: 13 }}
            />
            <motion.span
              className="flex items-center gap-2 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Check className="size-4 text-success" />
              {t('verified')}
            </motion.span>
          </motion.div>
        )}
        {step === 1 && (
          <motion.ol
            key="stages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            className="m-0 flex h-full list-none flex-col justify-center gap-3 p-0"
          >
            {STAGES.map((stage, index) => (
              <motion.li
                key={stage}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...FADE, delay: index * 0.25 }}
                className="flex items-center gap-3 rounded-[22px] bg-surface p-4"
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...SOFT, delay: index * 0.25 + 0.3 }}
                  className="grid size-8 place-items-center rounded-full bg-success text-canvas"
                >
                  <Check className="size-4" />
                </motion.span>
                {t(stage)}
                {index === 1 && (
                  <span className="ml-auto flex gap-1">
                    {example.colors.map((color, k) => (
                      <motion.span
                        key={color.role}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ ...SOFT, delay: 0.7 + k * 0.08 }}
                        className="size-5 rounded-full border border-line"
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </span>
                )}
              </motion.li>
            ))}
          </motion.ol>
        )}
        {step === 2 && (
          <motion.div
            key="pages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full"
          >
            {PAGES.map((page, index) => (
              <motion.div
                key={page}
                className="absolute top-1/2 left-1/2 w-[62%] overflow-hidden rounded-[14px] ring-1 ring-line"
                initial={{ x: '-50%', y: '-40%', rotate: 0, opacity: 0 }}
                animate={{
                  x: `${String(-50 + (index - 1) * 24)}%`,
                  y: `${String(-50 + (index - 1) * 16)}%`,
                  rotate: (index - 1) * 7,
                  opacity: 1,
                }}
                transition={{ ...SOFT, delay: index * 0.12 }}
              >
                <DemoSheet type={page} exampleId={example.id} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
