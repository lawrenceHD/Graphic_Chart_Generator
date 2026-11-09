'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Float, SplitWords } from '../../ui/fx';
import { useBrand } from './brand-context';
import { colorOf, inkOn } from './palette-tools';

const STICKERS = [
  { key: 'wcag', rotate: -12, x: '4%', y: '6%' },
  { key: 'svg', rotate: 8, x: '68%', y: '2%' },
  { key: 'undo', rotate: -6, x: '76%', y: '74%' },
  { key: 'tokens', rotate: 10, x: '2%', y: '76%' },
  { key: 'cmyk', rotate: -4, x: '40%', y: '88%' },
] as const;

/** The pain in two lines, with stickers dropping onto it in the colours of the example brands. */
export function Manifesto() {
  const t = useTranslations('homePage.manifesto');
  const reduce = useReducedMotion() ?? false;
  const { examples } = useBrand();
  return (
    <section className="relative mx-auto max-w-6xl px-4 py-28 sm:py-36">
      <h2 className="relative z-10 m-0 text-center font-display text-[clamp(2.25rem,7.5vw,6.5rem)] leading-[0.92] font-extrabold tracking-[-0.04em] text-balance">
        <SplitWords text={t('line1')} />
        <br />
        <SplitWords text={t('line2')} delay={0.15} />
      </h2>
      <p className="relative z-10 mx-auto mt-6 mb-0 max-w-xl text-center text-ink-2">{t('text')}</p>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {STICKERS.map((sticker, index) => {
          const source = examples[index % examples.length];
          if (source === undefined) return null;
          const background = colorOf(source, index % 2 > 0 ? 'accent' : 'primary');
          return (
            <motion.span
              key={sticker.key}
              className="absolute"
              style={{ left: sticker.x, top: sticker.y }}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -90, rotate: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, y: 0, rotate: sticker.rotate, scale: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { type: 'spring', stiffness: 170, damping: 14, delay: index * 0.12 }
              }
            >
              <Float delay={index} duration={6 + index}>
                <span
                  className="block rounded-full px-4 py-2 font-display text-sm font-bold whitespace-nowrap shadow-[0_16px_30px_-14px_rgb(0_0_0/0.45)] sm:px-5 sm:py-2.5 sm:text-xl"
                  style={{ backgroundColor: background, color: inkOn(source, background) }}
                >
                  {t(sticker.key)}
                </span>
              </Float>
            </motion.span>
          );
        })}
      </div>
    </section>
  );
}
