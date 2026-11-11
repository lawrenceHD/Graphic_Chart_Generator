'use client';

import { ImageUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Magnetic, SplitWords } from '../../ui/fx';
import { useOptionalBrand } from './brand-context';

const TILES = 20;

/** Closing call, with an arc of palette tiles turning slowly under it (decorative band, below the content). */
export function FinalCta() {
  const t = useTranslations('homePage.final');
  const account = t('account');
  // The tiles wear the colours of the example brand on screen: no mark is shown here.
  const colors = useOptionalBrand()?.example.colors ?? [];
  const ring = colors.length > 0 ? Array.from({ length: TILES }, (_, index) => index) : [];
  return (
    // The arc lives in its own band under the content (bottom padding): a ring of 960 px whose centre sits
    // 120 px below the section, tiles on a 46 % radius, so the highest one stays clear of the button.
    <section className="relative overflow-clip px-4 pt-32 pb-[420px] text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[600px] left-1/2 size-[960px] -translate-x-1/2 [mask-image:linear-gradient(to_bottom,black_30%,transparent_42%)]"
      >
        <div className="spin-slow relative size-full">
          {ring.map((index) => {
            const angle = (index / TILES) * Math.PI * 2;
            return (
              <div
                key={index}
                className="absolute size-16 rounded-[22px] border border-line shadow-sm"
                style={{
                  left: `${String(50 + Math.cos(angle) * 46)}%`,
                  top: `${String(50 + Math.sin(angle) * 46)}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: colors[index % colors.length]?.hex,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="relative">
        <h2 className="m-0 font-display text-[clamp(2.75rem,10vw,7.75rem)] leading-[0.88] font-extrabold tracking-[-0.04em] text-balance">
          <SplitWords text={t('title')} />
        </h2>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Magnetic>
            <Link
              href="/start"
              className="flex h-16 items-center gap-2 rounded-full bg-accent px-10 text-base font-semibold text-on-accent no-underline"
            >
              <ImageUp className="size-5" aria-hidden="true" />
              {t('button')}
            </Link>
          </Magnetic>
          <Link
            href="/inscription"
            className="inline-flex min-h-11 items-center text-sm text-ink-2"
          >
            {account}
          </Link>
        </div>
        <p className="mt-3 mb-0 text-sm text-ink-3">{t('note')}</p>
      </div>
    </section>
  );
}
