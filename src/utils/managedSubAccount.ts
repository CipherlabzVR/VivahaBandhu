/**
 * Users created under a parent (e.g. matchmaker / premium "sub-account") have ParentUserId set.
 * They should not browse or search the public directory.
 */
export function isManagedSubAccount(user: { parentUserId?: number | null } | null | undefined): boolean {
    const p = user?.parentUserId;
    return typeof p === 'number' && p > 0;
}
