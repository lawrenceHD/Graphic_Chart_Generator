// Static pricing page: no payment exists yet (O-5 open). Prices are hypotheses of the project owner,
// shown as "to validate" on the page (priceToValidate). Euro amounts per month, null = free.
export interface Plan {
  readonly id: 'free' | 'pro' | 'agency';
  /** Monthly price in euros, or null for the free plan. */
  readonly price: number | null;
  readonly priceToValidate: boolean;
  /** Project quota, or null when unlimited. */
  readonly projects: number | null;
  readonly highlighted: boolean;
  readonly features: readonly string[];
}

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    price: null,
    priceToValidate: false,
    projects: 3,
    highlighted: false,
    features: ['pdf', 'files', 'copilot'],
  },
  {
    id: 'pro',
    price: 15,
    priceToValidate: true,
    projects: null,
    highlighted: true,
    features: ['unlimited', 'tokens', 'mockups', 'priority'],
  },
  {
    id: 'agency',
    price: 49,
    priceToValidate: true,
    projects: null,
    highlighted: false,
    features: ['seats', 'share', 'whiteLabel', 'support'],
  },
];
