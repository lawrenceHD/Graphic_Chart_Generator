'use client';

import { useTranslations } from 'next-intl';
import { SCENES } from '../../studio/mockups/mockup-stage';
import { orderedPages } from '../../studio/workspace/brand-view';
import { Counter, Reveal } from '../../ui/fx';
import { demoFor } from '../demo';
import { useBrand } from './brand-context';

const EXPORT_FORMATS = 5;

/** Four figures that are read, not claimed: the pages of the shown guideline, its contrast pairs, the scene catalogue. */
export function Metrics() {
  const t = useTranslations('homePage.metrics');
  const { example } = useBrand();
  const pages = orderedPages(demoFor(example.id).document).filter(
    (page) => page.type !== 'mockup',
  ).length;
  const colours = example.colors.length;
  const items = [
    { key: 'pages', to: pages },
    { key: 'contrasts', to: colours * (colours - 1) },
    { key: 'scenes', to: SCENES.length },
    { key: 'exports', to: EXPORT_FORMATS },
  ] as const;
  return (
    <section aria-label={t('label')} className="mx-auto mt-28 max-w-6xl px-4 sm:mt-44">
      <ul className="m-0 grid list-none grid-cols-2 gap-px overflow-hidden rounded-[36px] border border-line bg-line p-0 md:grid-cols-4">
        {items.map((item, index) => (
          <li key={item.key} className="bg-surface">
            <Reveal delay={index * 0.08} className="p-7 sm:p-8">
              <Counter
                to={item.to}
                className="block font-display text-[clamp(3rem,8vw,5.25rem)] leading-none font-extrabold tracking-tight"
              />
              <p className="m-0 mt-3 text-sm text-ink-2">{t(item.key)}</p>
            </Reveal>
          </li>
        ))}
      </ul>
      <p className="mt-3 mb-0 text-center text-xs text-ink-3">{t('note')}</p>
    </section>
  );
}
