import { matrimonialService } from '../services/matrimonialService';

function parseFavoriteTargetIds(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((x: unknown) =>
            typeof x === 'number' ? x : (x as { favoriteProfileId?: number; profileId?: number; id?: number })?.favoriteProfileId ?? (x as { profileId?: number })?.profileId ?? (x as { id?: number })?.id
        )
        .filter((x) => Number.isFinite(Number(x)))
        .map((x) => Number(x));
}

/**
 * Accept incoming interest: create reciprocal favorite (or notify if already favorited).
 * Used from header notifications and profile "Interested in you".
 */
export async function respondToIncomingInterest(
    userId: number,
    senderUserId: number,
    managedProfileUserId?: number
): Promise<{ ok: boolean; message: string }> {
    const managedIdForApi = managedProfileUserId ?? undefined;
    const interactionsRes = await matrimonialService.getUserInteractions(userId);
    const favorites = interactionsRes?.result?.Favorites ?? interactionsRes?.result?.favorites ?? [];
    const favoriteIds = parseFavoriteTargetIds(favorites);
    const alreadyFavoursSender = favoriteIds.includes(senderUserId);

    if (alreadyFavoursSender) {
        const res = await matrimonialService.notifyInterestBack(userId, senderUserId, managedIdForApi);
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
            return { ok: true, message: 'Interest back sent — they have been notified' };
        }
        return {
            ok: false,
            message: res?.message || res?.Message || 'Could not send interest back. Try again.',
        };
    }

    const res = await matrimonialService.toggleFavorite(userId, senderUserId, managedIdForApi);
    if (res?.statusCode === 200 || res?.StatusCode === 200) {
        return { ok: true, message: 'Mutual interest connected — you can message each other' };
    }
    return {
        ok: false,
        message: res?.message || res?.Message || 'Could not send interest back. Try again.',
    };
}
