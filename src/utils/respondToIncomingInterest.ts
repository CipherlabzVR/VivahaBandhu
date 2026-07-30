import { matrimonialService } from '../services/matrimonialService';
import {
    hasFavoritedTargetForManagedActor,
    notifyMatrimonialInteractionsChanged,
    type FavoriteActivityRow,
} from './messagingMutualInterest';

/**
 * Accept incoming interest: create reciprocal favorite (or notify if already favorited).
 * Used from header notifications and profile "Interested in you".
 *
 * Favorite state is scoped per managed sub-account — another sub's mutual with the
 * sender must not skip creating this sub's own reciprocal favorite.
 */
export async function respondToIncomingInterest(
    userId: number,
    senderUserId: number,
    managedProfileUserId?: number
): Promise<{ ok: boolean; message: string }> {
    const managedIdForApi = managedProfileUserId ?? undefined;
    const interactionsRes = await matrimonialService.getUserInteractions(userId);
    const favActRaw =
        interactionsRes?.result?.FavoriteActivity ??
        interactionsRes?.result?.favoriteActivity ??
        [];
    const favoriteActivity: FavoriteActivityRow[] = Array.isArray(favActRaw) ? favActRaw : [];
    const alreadyFavoursSender = hasFavoritedTargetForManagedActor(
        favoriteActivity,
        senderUserId,
        managedIdForApi ?? null,
    );

    if (alreadyFavoursSender) {
        const res = await matrimonialService.notifyInterestBack(userId, senderUserId, managedIdForApi);
        if (res?.statusCode === 200 || res?.StatusCode === 200) {
            notifyMatrimonialInteractionsChanged();
            return { ok: true, message: 'Interest back sent — they have been notified' };
        }
        return {
            ok: false,
            message: res?.message || res?.Message || 'Could not send interest back. Try again.',
        };
    }

    const res = await matrimonialService.toggleFavorite(userId, senderUserId, managedIdForApi);
    if (res?.statusCode === 200 || res?.StatusCode === 200) {
        notifyMatrimonialInteractionsChanged();
        return { ok: true, message: 'Mutual interest connected — you can message each other' };
    }
    return {
        ok: false,
        message: res?.message || res?.Message || 'Could not send interest back. Try again.',
    };
}
