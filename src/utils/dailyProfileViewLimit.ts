import { isFamilyParentAccountType } from './matrimonialAccountTypes';
import { isManagedSubAccount } from './managedSubAccount';

export const DEFAULT_FREE_DAILY_PROFILE_VIEW_LIMIT = 10;

type DailyViewUser = {
    id?: string;
    accountType?: string;
    parentUserId?: number | null;
    isSubscribed?: boolean;
    isSubjectToDailyProfileViewLimit?: boolean;
    dailyProfileViewLimit?: number;
    remainingDailyProfileViews?: number;
    familySubAccountSlotsPurchased?: number;
    matchmakerTier?: string;
};

/** Free Self / Parents / Relation / Matchmaker-without-slots. */
export function isSubjectToDailyProfileViewLimit(user: DailyViewUser | null | undefined): boolean {
    if (!user) return false;
    if (isManagedSubAccount(user)) return false;
    if (typeof user.isSubjectToDailyProfileViewLimit === 'boolean') {
        return user.isSubjectToDailyProfileViewLimit;
    }

    const accountType = (user.accountType || '').trim();
    if (accountType === 'Matchmaker') {
        const purchased = Number(user.familySubAccountSlotsPurchased ?? 0);
        const tier = String(user.matchmakerTier || 'FREE').toUpperCase();
        const paidTier = tier === 'PAYG' || tier === 'GOLD' || tier === 'DIAMOND';
        return !user.isSubscribed && !paidTier && purchased <= 0;
    }

    if (accountType === 'Self' || isFamilyParentAccountType(accountType)) {
        return user.isSubscribed !== true;
    }

    return false;
}

export function resolveDailyProfileViewLimit(user: DailyViewUser | null | undefined): number {
    const n = Number(user?.dailyProfileViewLimit);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_FREE_DAILY_PROFILE_VIEW_LIMIT;
}

export function resolveRemainingDailyProfileViews(user: DailyViewUser | null | undefined): number {
    const limit = resolveDailyProfileViewLimit(user);
    if (!isSubjectToDailyProfileViewLimit(user)) return limit;
    const n = Number(user?.remainingDailyProfileViews);
    if (!Number.isFinite(n)) return limit;
    return Math.max(0, Math.min(limit, Math.floor(n)));
}
