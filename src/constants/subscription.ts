/** Monthly premium membership fee (LKR). Keep aligned with Matrimonial backoffice / API. */
export const PREMIUM_SUBSCRIPTION_LKR = 1990;

/** Matchmaker plans (LKR) — must match API `MatrimonialService` amounts. */
export const MATCHMAKER_GOLD_LKR = 7990;
/** Diamond price: align with product; backend default is 12,990 LKR. */
export const MATCHMAKER_DIAMOND_LKR = 12990;

export const CHECKOUT_PLAN_PREMIUM_SELF = 'premium';
export const CHECKOUT_PLAN_MATCHMAKER_GOLD = 'matchmaker_gold';
export const CHECKOUT_PLAN_MATCHMAKER_DIAMOND = 'matchmaker_diamond';
export const CHECKOUT_PLAN_SUB_ACCOUNT = 'sub_account';

export function isMatchmakerPaidTier(tier: string | undefined | null): boolean {
    const u = (tier || '').toUpperCase();
    return u === 'GOLD' || u === 'DIAMOND';
}

/** Free family parent accounts cannot create managed sub-accounts without paying per slot. */
export const SELF_MANAGED_SUB_ACCOUNT_MAX_FREE = 0;
/** @deprecated Premium no longer bundles sub-account slots for Parents/Relation. */
export const PREMIUM_INCLUDED_SUB_ACCOUNT_SLOTS = 0;
