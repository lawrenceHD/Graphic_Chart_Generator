import { describe, expect, it } from 'vitest';
import { PLANS } from './pricing-plans';

describe('pricing plans (static hypotheses, no payment)', () => {
  it('offers Free, Pro and Agency in that order', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['free', 'pro', 'agency']);
  });

  it('caps the free plan at 3 projects (STATE.md, quota)', () => {
    expect(PLANS[0]?.projects).toBe(3);
  });

  it('never states a price as final: every paid price is flagged to be validated', () => {
    for (const plan of PLANS) {
      expect(plan.price === null || plan.priceToValidate, plan.id).toBe(true);
    }
    expect(PLANS.filter((plan) => plan.price !== null).length).toBe(2);
  });

  it('has exactly one highlighted plan', () => {
    expect(PLANS.filter((plan) => plan.highlighted)).toHaveLength(1);
  });
});
