'use client';

import { motion } from 'motion/react';
import { ImageUp, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Magnetic, SplitWords } from '../../ui/fx';
import { useBrand } from './brand-context';
import { Fan } from './fan';
import { HeroChips } from './hero-chips';
import { HeroPill } from './hero-pill';
import { colorOf } from './palette-tools';

const REVEAL = { duration: 0.8, ease: [0.16, 1, 0.3, 1] } as const;
const BUTTON =
  'flex h-14 w-full items-center justify-center gap-2 rounded-full px-8 text-base no-underline sm:w-auto';

export function Hero() {
  const t = useTranslations('homePage.hero');
  const { examples, example } = useBrand();
  const second = examples[1] ?? example;
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-8 pb-6 sm:pt-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-24 mx-auto h-[420px] max-w-3xl"
      >
        {/* Radial gradients, not blur filters: a blurred layer is rasterised far more often. */}
        <div
          className="float absolute top-[-10%] left-[4%] size-96 rounded-full opacity-50"
          style={{
            background: `radial-gradient(closest-side, ${colorOf(example, 'accent')}, transparent)`,
            animationDuration: '14s',
          }}
        />
        <div
          className="float absolute top-0 right-[2%] size-[26rem] rounded-full opacity-35"
          style={{
            background: `radial-gradient(closest-side, ${colorOf(second, 'primary')}, transparent)`,
            animationDuration: '17s',
            animationDelay: '-4s',
          }}
        />
      </div>
      <HeroChips />
      <h1 className="relative m-0 text-center font-display text-[clamp(2.75rem,12vw,8rem)] leading-[0.88] font-extrabold tracking-[-0.04em]">
        <span className="sr-only">{t('title')}</span>
        <span aria-hidden="true">
          <SplitWords text={t('line1')} now />
          <br />
          <SplitWords text={t('before')} delay={0.12} now /> <HeroPill />{' '}
          <SplitWords text={t('after')} delay={0.24} now />
        </span>
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...REVEAL, delay: 0.45 }}
        className="relative mx-auto mt-6 max-w-xl text-center text-[17px] leading-relaxed text-ink-2"
      >
        {t('lead')}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...REVEAL, delay: 0.55 }}
        className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Magnetic className="w-full sm:w-auto">
          <Link href="/start" className={`${BUTTON} bg-accent font-semibold text-on-accent`}>
            <ImageUp className="size-5" aria-hidden="true" />
            {t('start')}
          </Link>
        </Magnetic>
        <Magnetic className="w-full sm:w-auto">
          <a
            href="#charte"
            className={`${BUTTON} border border-line-strong bg-surface font-medium text-ink`}
          >
            <Play className="size-4" aria-hidden="true" />
            {t('demo')}
          </a>
        </Magnetic>
      </motion.div>
      <p className="relative mt-4 mb-0 text-center text-sm text-ink-3">{t('note')}</p>
      <Fan />
    </section>
  );
}
