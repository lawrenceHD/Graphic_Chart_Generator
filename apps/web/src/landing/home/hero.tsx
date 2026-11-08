'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Magnetic, SplitWords } from '../../ui/fx';
import { PillLink } from '../pill-link';
import { BrandPicker } from './brand-picker';
import { HeroBackdrop } from './hero-backdrop';
import { HeroStage } from './hero-stage';

export function Hero() {
  const t = useTranslations('homePage.hero');
  return (
    <section className="relative isolate pt-10 pb-10 sm:pt-14">
      <HeroBackdrop />
      <div className="mx-auto flex max-w-[1000px] flex-col items-center gap-5 px-5 text-center">
        <p className="m-0 inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 font-mono text-xs text-ink-2 backdrop-blur">
          <span aria-hidden="true" className="pulse-dot size-1.5 rounded-full bg-success" />
          {t('eyebrow')}
        </p>
        <h1 className="m-0 font-display text-5xl leading-[0.92] font-extrabold tracking-[-0.04em] text-balance">
          <SplitWords text={t('title')} now />
        </h1>
        <p className="m-0 max-w-[56ch] text-lg text-ink-2 text-pretty">{t('lead')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Magnetic>
            <PillLink href="/start" className="h-12 px-7 text-base">
              {t('start')}
              <ArrowRight aria-hidden="true" className="size-4" />
            </PillLink>
          </Magnetic>
          <PillLink href="#atelier" variant="secondary" className="h-12 px-7 text-base">
            {t('demo')}
          </PillLink>
        </div>
        <p className="m-0 text-sm text-ink-3">{t('note')}</p>
      </div>
      <HeroStage />
      <BrandPicker />
    </section>
  );
}
