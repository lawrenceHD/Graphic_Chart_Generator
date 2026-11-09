'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { MockupStage, type SceneId } from '../../studio/mockups/mockup-stage';
import { SplitWords, Tilt } from '../../ui/fx';
import { BrandChips } from './brand-chips';
import { useBrand } from './brand-context';
import { LazyMount } from './lazy-mount';

const SOFT = { type: 'spring', stiffness: 120, damping: 20, mass: 1 } as const;
// Six of the thirteen scenes, in the order that reads best as a wall. Each is a photograph of an object on
// which the chosen brand's real logo is projected by the product's WebGL compositor.
const SCENES: readonly SceneId[] = [
  'poster-hanging',
  'cards-floating',
  'mug-stripes',
  'a4-sheet',
  'paper-bag',
  'storefront-sign',
];

/** The brand on real objects. Changing the brand re-projects every scene; each tile fades in as it arrives. */
export function Showcase() {
  const t = useTranslations('homePage.wall');
  const reduce = useReducedMotion() ?? false;
  const { example, view } = useBrand();
  return (
    <section
      id="mockups"
      aria-labelledby="showcase-title"
      className="mx-2 scroll-mt-24 rounded-[44px] bg-elevated py-24 sm:mx-4"
    >
      <div className="mx-auto max-w-6xl px-4">
        <h2
          id="showcase-title"
          className="m-0 font-display text-[clamp(2.25rem,7vw,5.25rem)] leading-[0.92] font-extrabold tracking-[-0.03em] text-balance"
        >
          <SplitWords text={t('lead1')} />{' '}
          <span className="inline-block -rotate-2 rounded-[0.4em] bg-accent px-[0.22em] text-on-accent">
            {t('pill')}
          </span>
          .
        </h2>
        <p className="mt-4 mb-0 max-w-lg text-ink-2">{t('lead')}</p>
        <div className="mt-6">
          <BrandChips group="mockups" />
        </div>
        <ul className="m-0 mt-10 list-none columns-1 gap-5 p-0 sm:columns-2 lg:columns-3">
          {SCENES.map((scene, index) => (
            <li key={scene} className="mb-5 break-inside-avoid">
              <motion.figure
                key={example.id}
                className="m-0 flex flex-col gap-2"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={reduce ? { duration: 0.1 } : { ...SOFT, delay: index * 0.07 }}
              >
                <Tilt
                  max={4}
                  className="overflow-hidden rounded-[36px] shadow-[0_40px_80px_-44px_rgb(0_0_0/0.6)]"
                >
                  <LazyMount>
                    <MockupStage
                      scene={scene}
                      view={view}
                      label={t('alt', { scene: t(`scene.${scene}`), brand: example.name })}
                      failedLabel={t('failed')}
                      retryLabel={t('retry')}
                    />
                  </LazyMount>
                </Tilt>
                <figcaption className="flex items-center justify-between gap-3 px-2 text-sm font-medium">
                  <span>{t(`scene.${scene}`)}</span>
                  <span className="font-mono text-xs text-ink-3">{example.name}</span>
                </figcaption>
              </motion.figure>
            </li>
          ))}
        </ul>
        <p className="mt-8 mb-0 max-w-[70ch] text-sm text-ink-3">{t('note')}</p>
      </div>
    </section>
  );
}
