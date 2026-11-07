import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { MAIN_ID } from '../components/skip-link-id';
import { PillLink } from './pill-link';
import { PLANS, type Plan } from './pricing-plans';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

async function PlanColumn({ plan }: { readonly plan: Plan }) {
  const t = await getTranslations('pricing');
  const paid = plan.price !== null;
  return (
    <li
      className={`flex flex-col gap-6 rounded-xl border p-6 ${plan.highlighted ? 'border-line-strong bg-surface' : 'border-line bg-canvas'}`}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 font-display text-2xl font-bold tracking-tight">
            {t(`plans.${plan.id}.name`)}
          </h2>
          {paid ? (
            <span className="rounded-full border border-line-strong px-3 py-0.5 text-xs text-ink-2">
              {t('soon')}
            </span>
          ) : null}
        </div>
        <p className="m-0 text-sm text-ink-2">{t(`plans.${plan.id}.audience`)}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="m-0 flex flex-wrap items-baseline gap-x-2 font-display text-3xl font-extrabold tracking-tight tabular">
          {plan.price === null ? t('free') : t('perMonth', { price: plan.price })}
          {plan.price === null ? null : (
            <span className="font-sans text-sm font-normal text-ink-2">{t('perMonthUnit')}</span>
          )}
        </p>
        <p className="m-0 text-sm text-ink-3">
          {plan.priceToValidate ? t('toValidate') : t('freeCaption')}
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        <li className="flex items-start gap-3 text-sm font-semibold">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
          {plan.projects === null
            ? t('projects.unlimited')
            : t('projects.limited', { count: plan.projects })}
        </li>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-ink-2">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            {t(`feature.${feature}`)}
          </li>
        ))}
      </ul>

      <PillLink
        href="/inscription"
        variant={plan.highlighted ? 'primary' : 'secondary'}
        className="mt-auto"
      >
        {t('cta')}
      </PillLink>
    </li>
  );
}

export async function PricingPage() {
  const t = await getTranslations('pricing');
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <SiteHeader />
      <main id={MAIN_ID} tabIndex={-1} className="focus:outline-none">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-12 px-6 py-16 lg:py-24">
          <div className="flex max-w-[44ch] flex-col gap-4">
            <h1 className="m-0 font-display text-4xl leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
              {t('title')}
            </h1>
            <p className="m-0 text-lg text-ink-2">{t('lead')}</p>
            <p className="m-0 text-sm text-ink-3">{t('hypothesis')}</p>
          </div>
          <ul className="m-0 grid list-none items-stretch gap-4 p-0 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanColumn key={plan.id} plan={plan} />
            ))}
          </ul>
          <section aria-labelledby="faq-title" className="flex max-w-[64ch] flex-col gap-6">
            <h2 id="faq-title" className="m-0 font-display text-2xl font-bold tracking-tight">
              {t('faqTitle')}
            </h2>
            <dl className="m-0 flex flex-col gap-5">
              {(['1', '2'] as const).map((n) => (
                <div key={n} className="flex flex-col gap-1">
                  <dt className="font-semibold">{t(`q${n}`)}</dt>
                  <dd className="m-0 text-ink-2">{t(`a${n}`)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
