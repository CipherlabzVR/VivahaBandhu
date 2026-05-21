/** Monthly premium membership fee (LKR). Keep aligned with Matrimonial backoffice / API. */
export const PREMIUM_SUBSCRIPTION_LKR = 1990;

/** Matchmaker plans (LKR) — must match API `MatrimonialService` amounts. */
export const MATCHMAKER_GOLD_LKR = 7990;
/** Diamond price: align with product; backend default is 12,990 LKR. */
export const MATCHMAKER_DIAMOND_LKR = 12990;

export const CHECKOUT_PLAN_PREMIUM_SELF = 'premium';
export const CHECKOUT_PLAN_MATCHMAKER_GOLD = 'matchmaker_gold';
export const CHECKOUT_PLAN_MATCHMAKER_DIAMOND = 'matchmaker_diamond';

export function isMatchmakerPaidTier(tier: string | undefined | null): boolean {
    const u = (tier || '').toUpperCase();
    return u === 'GOLD' || u === 'DIAMOND';
}

/** Max profiles a Self parent may create under “Managed Accounts” (not matchmaker clients). */
export const SELF_MANAGED_SUB_ACCOUNT_MAX_FREE = 1;
export const SELF_MANAGED_SUB_ACCOUNT_MAX_PREMIUM = 4;
