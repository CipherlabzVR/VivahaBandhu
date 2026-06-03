/** Account types offered on the public registration form. */
export const REGISTER_MATRIMONIAL_ACCOUNT_TYPES = [
    'Self',
    'Parents',
    'Relation',
    'Matchmaker',
] as const;

const LEGACY_PARENT_TYPES = ['Father', 'Mother'] as const;

function normalizedAccountType(accountType?: string | null): string {
    return (accountType || '').trim();
}

/** Parents account type (includes legacy Father / Mother registrations). */
export function isParentsAccountType(accountType?: string | null): boolean {
    const t = normalizedAccountType(accountType);
    return t === 'Parents' || (LEGACY_PARENT_TYPES as readonly string[]).includes(t);
}

export function isRelationAccountType(accountType?: string | null): boolean {
    return normalizedAccountType(accountType) === 'Relation';
}

/** Family accounts that can create managed sub-accounts (Parents, Relation, legacy Father/Mother). */
export function isFamilyParentAccountType(accountType?: string | null): boolean {
    return isParentsAccountType(accountType) || isRelationAccountType(accountType);
}

/** Accounts that only need basic signup details — no detailed matrimonial profile wizard. */
export function isBasicProfileOnlyAccountType(accountType?: string | null): boolean {
    const t = normalizedAccountType(accountType);
    return isParentsAccountType(t) || t === 'Matchmaker';
}

/** Display label for account type (maps legacy Father/Mother → Parents). */
export function displayMatrimonialAccountType(accountType?: string | null): string {
    if (isParentsAccountType(accountType) && normalizedAccountType(accountType) !== 'Parents') {
        return 'Parents';
    }
    return normalizedAccountType(accountType) || 'Self';
}
