import { isManagedSubAccount } from './managedSubAccount';
import { canManageSubAccounts, type ManagedSubAccount } from './managedSubAccounts';

export type BrowseGenderFilter = 'Male' | 'Female' | '';

export type SelfBrowseUser = {
    gender?: string | null;
    accountType?: string | null;
    parentUserId?: number | null;
    id?: string | number | null;
} | null | undefined;

/** Self member browsing profiles (not parent/matchmaker/managed sub-profile). */
export function isSelfBrowseMember(user: SelfBrowseUser): boolean {
    if (!user || isManagedSubAccount(user)) return false;
    const accountType = (user.accountType || 'Self').trim();
    return accountType === 'Self' || accountType === '';
}

export function isManagedParentBrowseMember(user: SelfBrowseUser): boolean {
    if (!user || isManagedSubAccount(user)) return false;
    return canManageSubAccounts(user.accountType);
}

export function normalizeMemberGender(raw?: string | null): BrowseGenderFilter {
    const g = (raw || '').trim().toLowerCase();
    if (g === 'male' || g === 'm') return 'Male';
    if (g === 'female' || g === 'f') return 'Female';
    return '';
}

export function oppositeBrowseGender(gender: BrowseGenderFilter): BrowseGenderFilter {
    if (gender === 'Male') return 'Female';
    if (gender === 'Female') return 'Male';
    return '';
}

export function subAccountBrowseGenders(
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[]
): BrowseGenderFilter[] {
    const seen = new Set<BrowseGenderFilter>();
    for (const sub of subAccounts) {
        const g = normalizeMemberGender(sub.gender);
        if (g) seen.add(g);
    }
    return [...seen];
}

/** Parent manages subs of both genders — browse/show matches for both. */
export function managedParentShowsBothGenders(
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[]
): boolean {
    return subAccountBrowseGenders(subAccounts).length >= 2;
}

/**
 * One sub (one gender) → opposite gender only.
 * Multiple subs all same gender → opposite gender only.
 * Multiple subs with both genders → no default filter (show both).
 */
export function defaultBrowseGenderForManagedParent(
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[]
): BrowseGenderFilter {
    if (subAccounts.length === 0) return '';
    const unique = subAccountBrowseGenders(subAccounts);
    if (unique.length === 0) return '';
    if (unique.length >= 2) return '';
    return oppositeBrowseGender(unique[0]!);
}

/** Default browse target: male → Female (Bride), female → Male (Groom). */
export function defaultBrowseGenderForSelfUser(user: SelfBrowseUser): BrowseGenderFilter {
    if (!isSelfBrowseMember(user)) return '';
    return oppositeBrowseGender(normalizeMemberGender(user?.gender));
}

export function defaultBrowseGenderForUser(
    user: SelfBrowseUser,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): BrowseGenderFilter {
    if (isSelfBrowseMember(user)) {
        return defaultBrowseGenderForSelfUser(user);
    }
    if (isManagedParentBrowseMember(user)) {
        return defaultBrowseGenderForManagedParent(subAccounts);
    }
    return '';
}

export function brideGroomToBrowseGender(value: string): BrowseGenderFilter {
    const v = value.trim();
    if (v === 'Bride') return 'Female';
    if (v === 'Groom') return 'Male';
    return '';
}

export function browseGenderToBrideGroom(gender: BrowseGenderFilter): 'Bride' | 'Groom' | 'Any' {
    if (gender === 'Female') return 'Bride';
    if (gender === 'Male') return 'Groom';
    return 'Any';
}

export function profileBrowseGender(profile: Record<string, unknown>): BrowseGenderFilter {
    return normalizeMemberGender(String(profile.gender ?? profile.Gender ?? ''));
}

export function profileMatchesBrowseGender(
    profile: Record<string, unknown>,
    filterGender: BrowseGenderFilter
): boolean {
    if (!filterGender) return true;
    return profileBrowseGender(profile) === filterGender;
}

/** Explicit Bride/Groom filter wins; otherwise account/sub-account rules apply. */
export function effectiveBrowseGenderForUser(
    user: SelfBrowseUser,
    explicitGender?: string | null,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): BrowseGenderFilter {
    const explicit = normalizeMemberGender(explicitGender ?? '');
    if (explicit) return explicit;
    return defaultBrowseGenderForUser(user, subAccounts);
}

export function filterProfilesForBrowse<T extends Record<string, unknown>>(
    profiles: unknown,
    user: SelfBrowseUser,
    explicitGender?: string | null,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): T[] {
    const arr = Array.isArray(profiles) ? (profiles as T[]) : [];
    const filter = effectiveBrowseGenderForUser(user, explicitGender, subAccounts);
    if (!filter) return arr;
    return arr.filter((p) => profileMatchesBrowseGender(p, filter));
}

/** @deprecated Use filterProfilesForBrowse */
export function filterProfilesForSelfBrowse<T extends Record<string, unknown>>(
    profiles: unknown,
    user: SelfBrowseUser,
    explicitGender?: string | null
): T[] {
    return filterProfilesForBrowse(profiles, user, explicitGender);
}

/** Viewer id sent to API for server-side gender defaults (self or managed parent). */
export function viewerUserIdForBrowseGenderFilter(user: SelfBrowseUser): number | undefined {
    if (user?.id == null) return undefined;
    const id = Number(user.id);
    if (!Number.isFinite(id) || id <= 0) return undefined;
    if (isSelfBrowseMember(user) || isManagedParentBrowseMember(user)) return id;
    return undefined;
}

/** @deprecated Use viewerUserIdForBrowseGenderFilter */
export function viewerUserIdForSelfBrowseGender(user: SelfBrowseUser): number | undefined {
    return viewerUserIdForBrowseGenderFilter(user);
}
