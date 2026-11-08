import { getTranslations } from 'next-intl/server';
import { Reveal } from '../../ui/fx';
import { ACCENT } from './accent';

/** The pain, in two sentences: the systematic part of a guideline is what Charta takes off the designer. */
export async function Problem() {
  const t = await getTranslations('homePage.problem');
  return (
    <section aria-labelledby="problem-title" className="mx-auto max-w-[1240px] px-6 py-24 sm:py-32">
      <Reveal className="grid gap-8 lg:grid-cols-12">
        <h2
          id="problem-title"
          className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.03em] text-balance lg:col-span-7"
        >
          {t.rich('title', ACCENT)}
        </h2>
        <p className="m-0 max-w-[52ch] self-end text-lg text-ink-2 lg:col-span-5">{t('text')}</p>
      </Reveal>
    </section>
  );
}
