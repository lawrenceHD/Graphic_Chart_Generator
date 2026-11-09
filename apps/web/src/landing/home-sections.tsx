import { getTranslations } from 'next-intl/server';
import { PillLink } from './pill-link';

export async function FinalCta() {
  const t = await getTranslations('homePage.final');
  const hero = await getTranslations('homePage.hero');
  return (
    <section className="bg-accent text-on-accent">
      <div className="mx-auto flex max-w-[1240px] flex-col items-start gap-6 px-6 py-24 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <h2 className="m-0 font-display text-5xl leading-[0.95] font-extrabold tracking-[-0.04em]">
            {t('title')}
          </h2>
          <p className="m-0 max-w-[48ch] text-base">{t('lead')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PillLink href="/start" variant="secondary" className="h-12 px-7 text-base">
            {hero('start')}
          </PillLink>
          <PillLink href="/inscription" variant="quiet" className="h-12 px-5 text-on-accent underline hover:text-on-accent">
            {t('account')}
          </PillLink>
        </div>
      </div>
    </section>
  );
}
