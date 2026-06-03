import type { ManagedSubAccount } from './managedSubAccounts';

export function profileBrowseUserId(profile: Record<string, unknown>): number {
    return Number((profile as { userId?: number; UserId?: number }).userId ?? (profile as { UserId?: number }).UserId ?? 0);
}

/** User ids to hide from browse/featured lists: the viewer plus their managed sub-profiles. */
export function ownedBrowseUserIds(
    viewerUserId: number | undefined | null,
    subAccounts: readonly ManagedSubAccount[] | readonly number[]
): Set<number> {
    const owned = new Set<number>();
    if (viewerUserId != null && !Number.isNaN(Number(viewerUserId))) {
        owned.add(Number(viewerUserId));
    }
    for (const item of subAccounts) {
        const id = typeof item === 'number' ? item : item.id;
        if (Number.isFinite(id) && id > 0) owned.add(id);
    }
    return owned;
}

export function excludeOwnedProfilesFromBrowse<T extends Record<string, unknown>>(
    items: unknown,
    ownedIds: Set<number>
): T[] {
    const arr = Array.isArray(items) ? (items as T[]) : [];
    if (ownedIds.size === 0) return arr;
    return arr.filter((p) => !ownedIds.has(profileBrowseUserId(p)));
}

/** Featured carousels: exclude self and own sub-accounts, then cap length. */
export function excludeSelfFromFeaturedBrowse(
    viewerUserId: number | undefined,
    subAccounts: readonly ManagedSubAccount[] | readonly number[],
    items: unknown,
    limit = 4
): Record<string, unknown>[] {
    const owned = ownedBrowseUserIds(viewerUserId, subAccounts);
    return excludeOwnedProfilesFromBrowse(items, owned).slice(0, limit);
}
