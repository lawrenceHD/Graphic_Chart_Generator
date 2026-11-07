// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import fr from '../../messages/fr.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { PLANS } from './pricing-plans';
import { PlanCta } from './pricing-cta';

afterEach(cleanup);
const t = productFr.pricing;

describe('PlanCta', () => {
  const show = (id: 'free' | 'pro' | 'agency') => {
    const plan = PLANS.find((entry) => entry.id === id);
    if (plan === undefined) throw new Error('no plan');
    render(
      <NextIntlClientProvider locale="fr" messages={{ ...fr, ...productFr }}>
        <PlanCta plan={plan} />
      </NextIntlClientProvider>,
    );
  };

  it('leads the free plan to the sign-up', () => {
    show('free');
    expect(screen.getByRole('link', { name: t.cta }).getAttribute('href')).toBe('/inscription');
  });

  it.each(['pro', 'agency'] as const)(
    'leaves %s as a disabled "soon" control, with no link',
    (id) => {
      show(id);
      expect(screen.queryByRole('link')).toBeNull();
      const button = screen.getByRole('button', { name: t.ctaSoon });
      expect(button).toHaveProperty('disabled', true);
    },
  );
});
