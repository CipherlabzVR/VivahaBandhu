import { readManagedProfileUserId } from './managedMessageContent';

export type FavoriteActivityRow = {
    profileUserId?: number;
    ProfileUserId?: number;
    managedProfileUserId?: number | null;
    ManagedProfileUserId?: number | null;
    isMutual?: boolean;
    IsMutual?: boolean;
};

export type MutualInterestState = 'mutual' | 'waiting_for_accept' | 'needs_connection';

export const MATRIMONIAL_INTERACTIONS_CHANGED_EVENT = 'matrimonial-interactions-changed';

export function notifyMatrimonialInteractionsChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MATRIMONIAL_INTERACTIONS_CHANGED_EVENT));
}

function favoriteTargetUserId(row: FavoriteActivityRow): number {
    return Number(row.profileUserId ?? row.ProfileUserId ?? 0);
}

function favoriteManagedProfileUserId(row: FavoriteActivityRow): number | null {
    return readManagedProfileUserId(row.managedProfileUserId ?? row.ManagedProfileUserId);
}

function rowIsMutual(row: FavoriteActivityRow): boolean {
    return row.isMutual === true || row.IsMutual === true;
}

function findFavoriteRow(
    favoriteActivity: FavoriteActivityRow[],
    profileUserId: number,
    managedProfileUserId: number | null,
): FavoriteActivityRow | undefined {
    return favoriteActivity.find((f) => {
        if (favoriteTargetUserId(f) !== profileUserId) return false;
        return favoriteManagedProfileUserId(f) === managedProfileUserId;
    });
}

/**
 * Whether this managed actor (or main account when managed is null) already favorited the target.
 * Sibling sub-accounts are independent — Sub A's interest does not count for Sub B.
 */
export function hasFavoritedTargetForManagedActor(
    favoriteActivity: FavoriteActivityRow[],
    targetUserId: number,
    managedProfileUserId?: number | null,
): boolean {
    const target = Number(targetUserId);
    if (!Number.isFinite(target) || target <= 0) return false;
    const managedId = readManagedProfileUserId(managedProfileUserId);
    return favoriteActivity.some((row) => {
        if (favoriteTargetUserId(row) !== target) return false;
        return favoriteManagedProfileUserId(row) === managedId;
    });
}

/** Optimistic local update after toggleFavorite for a specific managed actor. */
export function applyFavoriteToggleToActivity(
    favoriteActivity: FavoriteActivityRow[],
    targetUserId: number,
    managedProfileUserId: number | null | undefined,
    wasAlreadyInterested: boolean,
): FavoriteActivityRow[] {
    const target = Number(targetUserId);
    const managedId = readManagedProfileUserId(managedProfileUserId);
    if (wasAlreadyInterested) {
        return favoriteActivity.filter((row) => {
            if (favoriteTargetUserId(row) !== target) return true;
            return favoriteManagedProfileUserId(row) !== managedId;
        });
    }
    return [
        ...favoriteActivity,
        {
            profileUserId: target,
            managedProfileUserId: managedId,
            isMutual: false,
        },
    ];
}

/**
 * Whether the viewer has mutual interest with a contact for the given managed thread.
 * Handles managed sub-profiles where inbox contact id is the parent login but favorites
 * target the sub profile (or vice versa).
 */
export function resolveMutualInterestState(
    favoriteActivity: FavoriteActivityRow[],
    contactId: number,
    managedProfileUserId?: number | null,
): MutualInterestState {
    const contact = Number(contactId);
    if (!Number.isFinite(contact) || contact <= 0) return 'needs_connection';

    const managedId = readManagedProfileUserId(managedProfileUserId);

    const candidates: FavoriteActivityRow[] = [];

    const exact = findFavoriteRow(favoriteActivity, contact, managedId);
    if (exact) candidates.push(exact);

    if (managedId != null) {
        // Only count this managed sub's own rows — never sibling subs or unscoped legacy rows.
        const parentActingRow = findFavoriteRow(favoriteActivity, contact, managedId);
        if (parentActingRow && parentActingRow !== exact) candidates.push(parentActingRow);
    } else {
        // Main / Self account: also accept unscoped rows, and legacy mutuals for this contact.
        for (const row of favoriteActivity) {
            if (!rowIsMutual(row)) continue;
            const targetId = favoriteTargetUserId(row);
            const rowManagedId = favoriteManagedProfileUserId(row);
            if (targetId === contact && rowManagedId == null) {
                candidates.push(row);
            }
        }
    }

    if (candidates.some(rowIsMutual)) return 'mutual';

    const waiting = candidates.find((row) => row && !rowIsMutual(row));
    if (waiting) return 'waiting_for_accept';

    return 'needs_connection';
}

/**
 * Managed profile ids (from the viewer's client/sub list) that already have mutual interest
 * with the peer — used to skip the "which profile is messaging?" picker.
 */
export function resolveManagedProfileIdsWithMutualInterest(
    favoriteActivity: FavoriteActivityRow[],
    peerUserId: number,
    managedProfileUserIds: readonly number[],
): number[] {
    const peer = Number(peerUserId);
    if (!Number.isFinite(peer) || peer <= 0) return [];

    const ids = managedProfileUserIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);

    return ids.filter(
        (managedId) => resolveMutualInterestState(favoriteActivity, peer, managedId) === 'mutual'
    );
}

export function mutualInterestBlockMessage(
    peerName: string,
    state: MutualInterestState,
): { title: string; body: string } {
    switch (state) {
        case 'waiting_for_accept':
            return {
                title: 'Waiting for them to accept your interest',
                body: `You've shown interest in ${peerName}. Messaging unlocks once they accept your interest.`,
            };
        case 'needs_connection':
        default:
            return {
                title: 'Mutual interest required to message',
                body: `Send interest from ${peerName}'s profile and wait for them to accept — or accept their interest if they've already shown interest in you. Once you both connect, you can chat here.`,
            };
    }
}
