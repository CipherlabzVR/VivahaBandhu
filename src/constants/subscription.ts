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

/** Display name for matchmaker plan tiers (aligned with pricing / checkout labels). */
export function formatMatchmakerTierName(tier: string | undefined | null): string | null {
    const u = (tier || '').toUpperCase();
    if (u === 'GOLD') return 'Matchmaker Gold';
    if (u === 'DIAMOND') return 'Matchmaker Diamond';
    if (u === 'FREE') return 'Matchmaker Free';
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
};

/** Labels for the plan badge on the user's own profile page. */
export function profilePlanBadgeLabel(input: ProfilePlanBadgeInput): string {
    const isMatchmaker = input.accountType === 'Matchmaker';
    if (input.pendingApproval) {
        return isMatchmaker ? 'Matchmaker — payment pending approval' : 'Premium — payment pending approval';
    }
    if (!input.isSubscribed) {
        return isMatchmaker ? 'Matchmaker Free' : 'Free Plan';
    }
    if (isMatchmaker) {
        const tierName = formatMatchmakerTierName(input.matchmakerTier) || 'Matchmaker';
        return input.subscriptionCancelled ? `${tierName} — cancelled` : tierName;
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
    if (
        accountType === 'Matchmaker'
        && isSelf
        && viewerUser?.isSubscribed
        && isMatchmakerPaidTier(viewerUser.matchmakerTier)
    ) {
        return formatMatchmakerTierName(viewerUser.matchmakerTier) || 'Matchmaker';
    }
    return 'Premium';
}

/** Free family parent accounts cannot create managed sub-accounts without paying per slot. */
export const SELF_MANAGED_SUB_ACCOUNT_MAX_FREE = 0;
/** @deprecated Premium no longer bundles sub-account slots for Parents/Relation. */
export const PREMIUM_INCLUDED_SUB_ACCOUNT_SLOTS = 0;
