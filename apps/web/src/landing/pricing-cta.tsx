import { useTranslations } from 'next-intl';
import { PillLink } from './pill-link';
import type { Plan } from './pricing-plans';

/** Only an available plan leads anywhere; the others say so and carry no link (they do not exist yet). */
export function PlanCta({ plan }: { readonly plan: Plan }) {
  const t = useTranslations('pricing');
  if (plan.available) {
    return (
      <PillLink
        href="/inscription"
        variant={plan.highlighted ? 'primary' : 'secondary'}
        className="mt-auto"
      >
        {t('cta')}
      </PillLink>
    );
  }
  return (
    <button
      type="button"
      disabled
      className="mt-auto inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-line px-6 text-sm font-medium text-ink-3"
    >
      {t('ctaSoon')}
    </button>
  );
}
