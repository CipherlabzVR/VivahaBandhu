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

/** Preferred-search compatibility score from API (camelCase or PascalCase). */
export function readProfileMatchScore(profile: Record<string, unknown> | null | undefined): number | null {
    if (!profile) return null;
    const raw = (profile as { matchScore?: unknown; MatchScore?: unknown }).matchScore
        ?? (profile as { MatchScore?: unknown }).MatchScore;
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.round(Math.min(100, Math.max(0, n)));
}

export function normalizeBrowseProfileRow<T extends Record<string, unknown>>(row: T): T & { matchScore?: number } {
    const matchScore = readProfileMatchScore(row);
    return matchScore != null ? { ...row, matchScore } : row;
}

export function normalizeBrowseProfiles<T extends Record<string, unknown>>(items: unknown): (T & { matchScore?: number })[] {
    const arr = Array.isArray(items) ? (items as T[]) : [];
    return arr.map((row) => normalizeBrowseProfileRow(row));
}

export function matchScoreBadgeColors(score: number): { background: string; color: string } {
    if (score >= 75) return { background: '#15803d', color: '#ffffff' };
    if (score >= 50) return { background: '#b45309', color: '#ffffff' };
    return { background: '#475569', color: '#ffffff' };
}
