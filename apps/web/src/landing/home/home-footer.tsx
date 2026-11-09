'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const LETTERS = 'Charta'.split('');
const LINK =
  'inline-flex min-h-11 items-center text-sm text-ink-2 no-underline hover:text-ink hover:underline';

/** Night footer: links, the demonstration notice, and the name drawn very large, rising letter by letter. */
export function HomeFooter() {
  const t = useTranslations('homePage.footer');
  const site = useTranslations('site');
  const reduce = useReducedMotion() ?? false;
  return (
    <footer className="theme-night relative mx-2 mb-2 overflow-hidden rounded-[44px] bg-canvas pt-16 text-ink sm:mx-4 sm:mb-4">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          <div className="flex max-w-xs flex-col gap-3">
            <p className="m-0 font-display text-3xl font-extrabold tracking-tight">Charta</p>
            <p className="m-0 text-sm text-ink-2">{t('tagline')}</p>
          </div>
          <nav aria-label={t('product')} className="flex flex-col">
            <span className="mb-2 text-sm font-semibold">{t('product')}</span>
            <Link href="/start" className={LINK}>
              {site('try')}
            </Link>
            <Link href="/tarifs" className={LINK}>
              {site('pricing')}
            </Link>
          </nav>
          <nav aria-label={t('account')} className="flex flex-col">
            <span className="mb-2 text-sm font-semibold">{t('account')}</span>
            <Link href="/connexion" className={LINK}>
              {site('login')}
            </Link>
            <Link href="/inscription" className={LINK}>
              {site('signup')}
            </Link>
            <Link href="/projets" className={LINK}>
              {site('projects')}
            </Link>
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-xs text-ink-2">
          <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
            <span aria-hidden="true" className="pulse-dot size-2 rounded-full bg-success" />
            {t('demo')}
          </span>
          <span className="flex-1">{site('rights')}</span>
        </div>
      </div>
      <div aria-hidden="true" className="relative mt-8 overflow-hidden select-none">
        <div className="flex justify-center font-display text-[26vw] leading-[0.78] font-extrabold tracking-[-0.06em] text-elevated">
          {LETTERS.map((letter, index) => (
            <motion.span
              key={`${letter}-${String(index)}`}
              className="inline-block"
              initial={reduce ? { opacity: 0 } : { y: '60%', opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              whileHover={reduce ? {} : { y: '-8%' }}
              transition={
                reduce
                  ? { duration: 0.1 }
                  : { duration: 1, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }
              }
            >
              {letter}
            </motion.span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sheen absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
        </div>
      </div>
    </footer>
  );
}
