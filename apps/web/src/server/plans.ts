// ADR-030: the free tier is a constant of the code until billing exists (open decision O-5).
export const PLANS = {
  free: { maxProjects: 3 },
} as const;

/** Every account is on the free plan until a subscriptions table exists. */
export const ACCOUNT_PLAN = PLANS.free;
