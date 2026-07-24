/** Monthly premium membership fee (LKR). Keep aligned with Matrimonial backoffice / API. */
export const PREMIUM_SUBSCRIPTION_LKR = 1990;

/** Fallback price for one matchmaker client-account slot (LKR). Prefer live package price from API. */
export const MATCHMAKER_CLIENT_SLOT_LKR = 1990;

export const CHECKOUT_PLAN_PREMIUM_SELF = 'premium';
/** Pay-per-client account slot for Matchmakers (same scenario as family sub_account). */
export const CHECKOUT_PLAN_MATCHMAKER_CLIENT = 'matchmaker_client';
/** @deprecated Use CHECKOUT_PLAN_MATCHMAKER_CLIENT */
export const CHECKOUT_PLAN_MATCHMAKER_GOLD = CHECKOUT_PLAN_MATCHMAKER_CLIENT;
/** @deprecated Use CHECKOUT_PLAN_MATCHMAKER_CLIENT */
export const CHECKOUT_PLAN_MATCHMAKER_DIAMOND = CHECKOUT_PLAN_MATCHMAKER_CLIENT;
export const CHECKOUT_PLAN_SUB_ACCOUNT = 'sub_account';

/** True when matchmaker has pay-per-use access (legacy GOLD/DIAMOND or new PAYG). */
export function isMatchmakerPaidTier(tier: string | undefined | null): boolean {
    const u = (tier || '').toUpperCase();
    return u === 'GOLD' || u === 'DIAMOND' || u === 'PAYG';
}

/** Fallback display name for the pay-per-client matchmaker package. */
export const MATCHMAKER_CLIENT_PACKAGE_LABEL = 'Matchmaker client account';

/** Display name for matchmaker billing mode. */
export function formatMatchmakerTierName(
    tier: string | undefined | null,
    packageName?: string | null,
): string | null {
    const u = (tier || '').toUpperCase();
    const paidLabel = (packageName && String(packageName).trim()) || MATCHMAKER_CLIENT_PACKAGE_LABEL;
    if (u === 'PAYG' || u === 'GOLD' || u === 'DIAMOND') return paidLabel;
    if (u === 'FREE') return 'Free Plan';
    if (!tier || !String(tier).trim()) return null;
    const trimmed = String(tier).trim();
    return trimmed.toLowerCase().startsWith('matchmaker')
        ? trimmed
        : `Matchmaker ${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()}`;
}

type ProfilePlanBadgeInput = {
    accountType?: string;
    isSubscribed?: boolean;
    matchmakerTier?: string;
    subscriptionCancelled?: boolean;
    pendingApproval?: boolean;
    /** Live Matchmaker package name from API (e.g. "Matchmaker client account"). */
    matchmakerPackageName?: string | null;
};

/** Labels for the plan badge on the user's own profile page. */
export function profilePlanBadgeLabel(input: ProfilePlanBadgeInput): string {
    const isMatchmaker = input.accountType === 'Matchmaker';
    if (input.pendingApproval) {
        return isMatchmaker ? 'Matchmaker — payment pending approval' : 'Premium — payment pending approval';
    }
    if (isMatchmaker) {
        const paid =
            input.isSubscribed === true || isMatchmakerPaidTier(input.matchmakerTier);
        if (!paid) {
            return 'Free Plan';
        }
        const packageLabel =
            (input.matchmakerPackageName && String(input.matchmakerPackageName).trim())
            || formatMatchmakerTierName(input.matchmakerTier, input.matchmakerPackageName)
            || MATCHMAKER_CLIENT_PACKAGE_LABEL;
        return input.subscriptionCancelled ? `${packageLabel} — cancelled` : packageLabel;
    }
    if (!input.isSubscribed) {
        return 'Free Plan';
    }
    return input.subscriptionCancelled ? 'Premium — cancelled' : 'Premium';
}

/** Crown pill label when showing a premium profile (own matchmaker profile uses tier name). */
export function premiumBadgeLabelForProfile(
    profile: {
        accountType?: string;
        AccountType?: string;
        userId?: number | string;
    },
    viewerUser?: {
        id?: string | number;
        accountType?: string;
        matchmakerTier?: string;
        isSubscribed?: boolean;
    } | null,
): string {
    const accountType = profile.accountType ?? profile.AccountType;
    const isSelf = viewerUser?.id != null
        && profile.userId != null
        && String(viewerUser.id) === String(profile.userId);
    if (accountType === 'Matchmaker' && isSelf) {
        return 'Matchmaker';
    }
    return 'Premium';
}

/** Free family parent accounts cannot create managed sub-accounts without paying per slot. */
export const SELF_MANAGED_SUB_ACCOUNT_MAX_FREE = 0;
/** @deprecated Premium no longer bundles sub-account slots for Parents/Relation. */
export const PREMIUM_INCLUDED_SUB_ACCOUNT_SLOTS = 0;
