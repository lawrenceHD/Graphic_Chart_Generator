'use client';

import type { PageType } from '@app/contracts';
import { motion, useReducedMotion } from 'motion/react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { SplitWords } from '../../ui/fx';
import { DemoSheet, demoTitle } from '../demo-sheet';
import { useBrand } from './brand-context';

const PAGES: readonly Exclude<PageType, 'mockup'>[] = [
  'cover',
  'palette',
  'typography',
  'logo',
  'do-dont',
];
type SwingStyle = CSSProperties & { readonly '--a': string };
const SAG = [14, 46, 58, 46, 14] as const;

function swingStyle(index: number): SwingStyle {
  return {
    '--a': `${String(index % 2 > 0 ? -2.5 : 2.5)}deg`,
    animationDelay: `${String(-index * 0.9)}s`,
    animationDuration: '5.5s',
  };
}

/** Pages of the shown guideline pinned on a string, swaying; each can be dragged and springs back. */
export function Hanging() {
  const t = useTranslations('homePage.hanging');
  const reduce = useReducedMotion() ?? false;
  const { example } = useBrand();
  return (
    <section aria-labelledby="hanging-title" className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="hanging-title"
          className="m-0 font-display text-[clamp(2.25rem,7vw,5.25rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance"
        >
          <SplitWords text={t('title')} />
        </h2>
        <p className="mt-4 mb-0 max-w-md text-ink-2">{t('lead')}</p>
      </div>
      <div className="relative mt-10 h-[min(110vw,520px)]">
        <svg
          aria-hidden="true"
          className="absolute inset-x-0 top-6 h-24 w-full"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
        >
          <path
            d="M-10 20 Q 500 110 1010 20"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ul className="no-scrollbar absolute inset-0 m-0 flex list-none justify-start gap-7 overflow-x-auto p-0 px-6 pt-10 xl:justify-center">
          {PAGES.map((page, index) => (
            <motion.li
              key={`${example.id}-${page}`}
              className="relative w-[min(78vw,340px)] shrink-0"
              style={{ marginTop: SAG[index] ?? 30 }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -140 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 90, damping: 12, delay: index * 0.14 }
              }
            >
              <div
                className="swing"
                style={swingStyle(index)}
              >
                <motion.div
                  drag
                  dragSnapToOrigin
                  dragElastic={0.5}
                  dragTransition={{ bounceStiffness: 180, bounceDamping: 14 }}
                  whileDrag={{ scale: 1.05, rotate: index % 2 > 0 ? 6 : -6 }}
                  className="cursor-grab active:cursor-grabbing"
                  role="img"
                  aria-label={t('alt', { page: demoTitle(page, example.id), brand: example.name })}
                >
                  <span className="absolute -top-3 left-1/2 z-10 h-8 w-5 -translate-x-1/2 rounded-md bg-line-strong shadow" />
                  <div className="rounded-[24px] bg-surface p-2.5 pb-10 shadow-[0_34px_60px_-30px_rgb(0_0_0/0.55)] ring-1 ring-line">
                    <div className="overflow-hidden rounded-[16px]">
                      <DemoSheet type={page} exampleId={example.id} />
                    </div>
                    <span className="absolute bottom-3 left-4 font-display text-base text-ink">
                      {demoTitle(page, example.id)}
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
