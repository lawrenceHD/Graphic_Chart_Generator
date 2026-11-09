'use client';

import { useTranslations } from 'next-intl';
import { MockupStage, type SceneId } from '../../studio/mockups/mockup-stage';
import { Reveal } from '../../ui/fx';
import { ACCENT } from './accent';
import { useBrand } from './brand-context';
import { LazyMount } from './lazy-mount';

// Six of the thirteen scenes, in the order that reads best as a wall: each is a photograph of an object on
// which the chosen brand's real logo is projected by the product's WebGL compositor.
const WALL: readonly SceneId[] = [
  'poster-hanging',
  'cards-floating',
  'mug-stripes',
  'a4-sheet',
  'paper-bag',
  'storefront-sign',
];

export function MockupWall() {
  const t = useTranslations('homePage.wall');
  const { example, view } = useBrand();
  return (
    <section
      id="mises-en-situation"
      aria-labelledby="wall-title"
      className="scroll-mt-24 bg-canvas py-24 text-ink theme-night"
    >
      <div className="mx-auto max-w-[1240px] px-6">
        <Reveal className="mb-12 grid gap-4 lg:grid-cols-12 lg:items-end">
          <h2
            id="wall-title"
            className="m-0 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance lg:col-span-7"
          >
            {t.rich('title', ACCENT)}
          </h2>
          <p className="m-0 max-w-[52ch] text-base text-ink-2 lg:col-span-5">{t('lead')}</p>
        </Reveal>
        <ul className="m-0 list-none columns-1 gap-4 p-0 sm:columns-2 lg:columns-3">
          {WALL.map((scene, index) => (
            <li key={scene} className="mb-4 break-inside-avoid">
              <Reveal delay={(index % 3) * 0.08}>
                <figure className="m-0 flex flex-col gap-2">
                  <LazyMount>
                    <MockupStage
                      scene={scene}
                      view={view}
                      label={t('alt', { scene: t(`scene.${scene}`), brand: example.name })}
                      failedLabel={t('failed')}
                      retryLabel={t('retry')}
                      className="overflow-hidden rounded-xl ring-1 ring-line"
                    />
                  </LazyMount>
                  <figcaption className="flex items-baseline justify-between gap-3 font-mono text-xs text-ink-3">
                    <span>{t(`scene.${scene}`)}</span>
                    <span>{example.name}</span>
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>
        <p className="mt-8 mb-0 max-w-[70ch] text-sm text-ink-3">{t('note')}</p>
      </div>
    </section>
  );
}
