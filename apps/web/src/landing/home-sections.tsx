import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PillLink } from './pill-link';

const STEPS = ['drop', 'watch', 'adjust'] as const;
const PROMISES = ['logo', 'measured', 'undo', 'export'] as const;

/** Three gestures as ruled rows (one leads by size, not by decoration). */
export async function Method() {
  const t = await getTranslations('homePage.method');
  return (
    <section
      id="methode"
      aria-labelledby="method-title"
      className="scroll-mt-24 border-y border-line bg-surface"
    >
      <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-20 lg:grid-cols-12">
        <h2
          id="method-title"
          className="m-0 font-display text-4xl leading-[1] font-bold tracking-tight text-balance lg:col-span-4"
        >
          {t('title')}
        </h2>
        <ol className="m-0 flex list-none flex-col p-0 lg:col-span-8">
          {STEPS.map((step) => (
            <li
              key={step}
              className="grid gap-2 border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[1fr_2fr] sm:gap-8"
            >
              <h3 className="m-0 font-display text-2xl font-bold tracking-tight">
                {t(`${step}.title`)}
              </h3>
              <p className="m-0 max-w-[56ch] text-base text-ink-2">{t(`${step}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export async function Guarantees() {
  const t = await getTranslations('homePage.promise');
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-16">
      <ul className="m-0 grid list-none gap-x-10 gap-y-4 p-0 sm:grid-cols-2">
        {PROMISES.map((key) => (
          <li key={key} className="flex items-start gap-3 text-base">
            <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function FinalCta() {
  const t = await getTranslations('homePage.final');
  const hero = await getTranslations('homePage.hero');
  return (
    <section className="bg-accent text-on-accent">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-6 px-6 py-20 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-4xl leading-[1] font-extrabold tracking-tight">
            {t('title')}
          </h2>
          <p className="m-0 max-w-[48ch] text-base">{t('lead')}</p>
        </div>
        <PillLink href="/start" variant="secondary">
          {hero('start')}
        </PillLink>
      </div>
    </section>
  );
}
