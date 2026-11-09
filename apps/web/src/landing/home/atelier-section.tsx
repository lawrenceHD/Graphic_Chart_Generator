'use client';

import { useTranslations } from 'next-intl';
import { Reveal } from '../../ui/fx';
import { Atelier } from '../atelier';
import { useBrand } from './brand-context';

/** The sheet explorer, bound to the brand chosen in the hero. */
export function AtelierSection() {
  const t = useTranslations('homePage.atelier');
  const { examples, example, select } = useBrand();
  return (
    <section id="atelier" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 pb-24">
      <Reveal className="mb-8 flex max-w-[60ch] flex-col gap-3">
        <h2 className="m-0 font-display text-4xl leading-[0.95] font-extrabold tracking-tight text-balance">
          {t('title')}
        </h2>
        <p className="m-0 text-base text-ink-2">{t('lead')}</p>
      </Reveal>
      <Atelier examples={examples} exampleId={example.id} onExampleChange={select} />
    </section>
  );
}
