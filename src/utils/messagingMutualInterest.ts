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
 * A managed thread's sub-profile can belong to either side of the conversation, and each side
 * changes which favorite row proves mutual interest:
 *  - viewer's own sub  -> the viewer favorited the peer login while acting as that sub
 *  - peer's sub        -> the viewer favorited the sub itself, and the inbox contact id is the
 *                         peer's parent login, so the sub is the target rather than the actor
 */
export type MutualInterestQuery = {
    /** Sub-profile attached to the thread; may be owned by the viewer or by the peer. */
    threadManagedProfileUserId?: number | null;
    /** Sub-profile the viewer is acting as, used when the thread's sub belongs to the peer. */
    actingManagedProfileUserId?: number | null;
    /** Every sub-profile user id the viewer owns; decides whose sub the thread belongs to. */
    viewerManagedProfileUserIds?: readonly number[];
};

type FavoriteLookupPair = { targetUserId: number; actorManagedProfileUserId: number | null };

function mutualInterestLookupPairs(
    contact: number,
    query: number | null | undefined | MutualInterestQuery,
): FavoriteLookupPair[] {
    if (query == null || typeof query === 'number' || typeof query === 'string') {
        // Legacy signature: the id is always a sub-profile the viewer is acting as.
        return [{ targetUserId: contact, actorManagedProfileUserId: readManagedProfileUserId(query) }];
    }

    const threadManagedId = readManagedProfileUserId(query.threadManagedProfileUserId);
    const actingManagedId = readManagedProfileUserId(query.actingManagedProfileUserId);
    if (threadManagedId == null) {
        return [{ targetUserId: contact, actorManagedProfileUserId: actingManagedId }];
    }

    const ownedIds = (query.viewerManagedProfileUserIds ?? [])
        .map((id) => readManagedProfileUserId(id))
        .filter((id): id is number => id != null);

    const viewerSidePair: FavoriteLookupPair = {
        targetUserId: contact,
        actorManagedProfileUserId: threadManagedId,
    };
    // Peer's sub: the viewer favorited the sub directly, acting as themselves or as their own sub.
    const peerSidePairs: FavoriteLookupPair[] = [
        { targetUserId: threadManagedId, actorManagedProfileUserId: actingManagedId },
        { targetUserId: contact, actorManagedProfileUserId: actingManagedId },
    ];

    if (ownedIds.length === 0) {
        // Ownership unknown — accept either shape rather than falsely blocking the thread.
        return [viewerSidePair, ...peerSidePairs];
    }
    return ownedIds.includes(threadManagedId) ? [viewerSidePair] : peerSidePairs;
}

/**
 * Whether the viewer has mutual interest with a contact for the given managed thread.
 * Handles managed sub-profiles where inbox contact id is the parent login but favorites
 * target the sub profile (or vice versa).
 */
export function resolveMutualInterestState(
    favoriteActivity: FavoriteActivityRow[],
    contactId: number,
    managedProfileUserId?: number | null | MutualInterestQuery,
): MutualInterestState {
    const contact = Number(contactId);
    if (!Number.isFinite(contact) || contact <= 0) return 'needs_connection';

    const candidates: FavoriteActivityRow[] = [];
    for (const pair of mutualInterestLookupPairs(contact, managedProfileUserId)) {
        if (!Number.isFinite(pair.targetUserId) || pair.targetUserId <= 0) continue;
        // Only this actor's own rows count — never sibling subs or unscoped legacy rows,
        // except for the main account which owns the unscoped rows.
        const row = findFavoriteRow(
            favoriteActivity,
            pair.targetUserId,
            pair.actorManagedProfileUserId,
        );
        if (row && !candidates.includes(row)) candidates.push(row);
    }

    if (candidates.some(rowIsMutual)) return 'mutual';
    if (candidates.length > 0) return 'waiting_for_accept';

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
