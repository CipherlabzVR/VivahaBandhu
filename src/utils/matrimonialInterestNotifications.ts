/**
 * Shared parsing helpers for Matrimonial interest notification payloads (REST + SignalR).
 */

import { readManagedProfileUserId } from './managedMessageContent';
import {
    type FavoriteActivityRow,
    resolveMutualInterestState,
} from './messagingMutualInterest';

export function referenceIdFromNotification(notification: Record<string, unknown> | undefined | null): number {
    if (!notification) return 0;
    const raw = notification.referenceId ?? notification.ReferenceId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function notificationReferenceType(
    notification: Record<string, unknown> | undefined | null
): string {
    if (!notification) return '';
    return String(notification.referenceType ?? notification.ReferenceType ?? '').trim();
}

export function notificationTitleLower(
    notification: Record<string, unknown> | undefined | null
): string {
    if (!notification) return '';
    return String(notification.title ?? notification.Title ?? '').toLowerCase();
}

export function notificationCreatedAtMs(
    notification: Record<string, unknown> | undefined | null
): number {
    if (!notification) return 0;
    const raw =
        notification.createdOn
        ?? notification.CreatedOn
        ?? notification.createdAt
        ?? notification.CreatedAt;
    if (raw == null || String(raw).trim() === '') return 0;
    const t = new Date(String(raw)).getTime();
    return Number.isFinite(t) ? t : 0;
}

export function notificationIdNumber(
    notification: Record<string, unknown> | undefined | null
): number {
    if (!notification) return 0;
    const n = Number(notification.id ?? notification.Id ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

export function isMatrimonialSubscriptionNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (notificationReferenceType(notification) === 'MatrimonialSubscription') return true;
    const title = notificationTitleLower(notification);
    if (!title) return false;
    if (title.includes('bank transfer')) return true;
    if (title.includes('sub-account slot')) return true;
    if (title.includes('matchmaker plan')) return true;
    if (title.includes('premium') && (
        title.includes('activated')
        || title.includes('ending soon')
        || title.includes('has ended')
        || title.includes('purchased')
    )) {
        return true;
    }
    return false;
}

/** Unread "Bank transfer received" — slip submitted, awaiting admin review. */
export function isPendingBankTransferReceivedNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!isMatrimonialSubscriptionNotification(notification)) return false;
    const title = notificationTitleLower(notification);
    if (!title.includes('bank transfer') || !title.includes('received')) return false;
    if (title.includes('not approved') || title.includes('undo') || title.includes('undone')) return false;
    return true;
}

/**
 * Admin rejected a bank transfer. Uses the backend title "Bank transfer not approved".
 * Must not match "Bank transfer rejection undone".
 */
export function isBankTransferRejectedNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!isMatrimonialSubscriptionNotification(notification)) return false;
    const title = notificationTitleLower(notification);
    if (title.includes('undo') || title.includes('undone')) return false;
    return title.includes('bank transfer') && title.includes('not approved');
}

/** Admin approved a bank transfer (live SignalR or unread list). */
export function isBankTransferApprovedNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!notification) return false;
    const title = notificationTitleLower(notification);
    if (title.includes('undo') || title.includes('undone')) return false;
    const desc = String(notification.description ?? notification.Description ?? '').toLowerCase();
    if (desc.includes('bank transfer was approved')) return true;
    return title.includes('premium activated') && desc.includes('bank transfer');
}

/** Admin undid a rejection — slip is pending review again. */
export function isBankTransferRejectionUndoneNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!isMatrimonialSubscriptionNotification(notification)) return false;
    const title = notificationTitleLower(notification);
    return title.includes('bank transfer') && title.includes('rejection') && title.includes('undone');
}

/** Admin undid an approval — slip is pending review again. */
export function isBankTransferApprovalUndoneNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!isMatrimonialSubscriptionNotification(notification)) return false;
    const title = notificationTitleLower(notification);
    return title.includes('bank transfer') && title.includes('approval') && title.includes('undone');
}

export function isBankTransferUndoNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    return (
        isBankTransferRejectionUndoneNotification(notification)
        || isBankTransferApprovalUndoneNotification(notification)
    );
}

export type BankTransferLifecycleAction = 'restore_pending' | 'approved' | 'rejected';

/**
 * Latest bank-transfer lifecycle event by timestamp.
 * Ensures undo-after-reject restores pending, and a later approve is not blocked by a stale reject.
 */
export function resolveLatestBankTransferLifecycleAction(
    notifications: Array<Record<string, unknown> | null | undefined>
): { action: BankTransferLifecycleAction | null; notification: Record<string, unknown> | null } {
    const events: Array<{
        action: BankTransferLifecycleAction;
        at: number;
        notification: Record<string, unknown>;
    }> = [];

    for (const raw of notifications) {
        if (!raw) continue;
        const at = notificationCreatedAtMs(raw);
        if (isBankTransferUndoNotification(raw)) {
            events.push({ action: 'restore_pending', at, notification: raw });
        } else if (isBankTransferApprovedNotification(raw)) {
            events.push({ action: 'approved', at, notification: raw });
        } else if (isBankTransferRejectedNotification(raw)) {
            events.push({ action: 'rejected', at, notification: raw });
        }
    }

    if (events.length === 0) {
        return { action: null, notification: null };
    }

    events.sort((a, b) => {
        const aId = notificationIdNumber(a.notification);
        const bId = notificationIdNumber(b.notification);
        const aAt = a.at > 0 ? a.at : 0;
        const bAt = b.at > 0 ? b.at : 0;

        // Missing timestamp: prefer higher notification id (live/SignalR rows).
        if (aAt === 0 || bAt === 0) {
            if (aId !== bId) return bId - aId;
            if (aAt !== bAt) {
                // Treat missing timestamp as newest when ids are equal/missing.
                if (aAt === 0 && bAt !== 0) return -1;
                if (bAt === 0 && aAt !== 0) return 1;
            }
        } else if (bAt !== aAt) {
            return bAt - aAt;
        }

        if (bId !== aId) return bId - aId;

        // Last resort only: prefer decision over restore so a same-second reject
        // is not hidden by an older "rejection undone" with a tied clock.
        const rank = (action: BankTransferLifecycleAction) =>
            action === 'rejected' ? 3 : action === 'approved' ? 2 : 1;
        return rank(b.action) - rank(a.action);
    });

    return { action: events[0]!.action, notification: events[0]!.notification };
}

/**
 * Infer slot pending key (client / sub-account) from bank-transfer notification body.
 * Matchmaker bank slips are always client-slot packages on this product.
 */
export function isSlotBankTransferReceivedNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (!notification) return false;
    const desc = String(notification.description ?? notification.Description ?? '').toLowerCase();
    const title = notificationTitleLower(notification);
    const combined = `${title} ${desc}`;
    return (
        combined.includes('sub-account')
        || combined.includes('client-account')
        || combined.includes('client account')
        || combined.includes('client-account package')
        || combined.includes('client package')
        || combined.includes('client slot')
        || combined.includes('matchmaker')
        || title.includes('client')
    );
}

/**
 * When undoing reject/approve, purpose text may be missing on older notifications.
 * Prefer the undo/decision body, then the latest related reject/received notice.
 */
export function resolveBankTransferPendingIsSlot(
    notification: Record<string, unknown> | undefined | null,
    allNotifications: Array<Record<string, unknown> | null | undefined> = [],
): boolean {
    if (isSlotBankTransferReceivedNotification(notification)) return true;

    const related = allNotifications
        .filter((n): n is Record<string, unknown> => !!n)
        .filter(
            (n) =>
                isBankTransferRejectedNotification(n)
                || isPendingBankTransferReceivedNotification(n)
                || isBankTransferApprovalUndoneNotification(n)
                || isBankTransferRejectionUndoneNotification(n),
        )
        .sort((a, b) => notificationCreatedAtMs(b) - notificationCreatedAtMs(a));

    for (const n of related) {
        if (isSlotBankTransferReceivedNotification(n)) return true;
    }
    return false;
}

export function isMatrimonialInterestNotification(
    notification: Record<string, unknown> | undefined | null
): boolean {
    if (isMatrimonialSubscriptionNotification(notification)) return false;
    return notificationReferenceType(notification) === 'MatrimonialInterest';
}

/** True when API / live payload indicates reciprocal interest (“interest back”), not a first-time “interested”. */
export function isInterestBackNotification(notification: Record<string, unknown> | undefined | null): boolean {
    if (!notification) return false;
    const title = String(notification.title ?? notification.Title ?? '').toLowerCase();
    const desc = String(notification.description ?? notification.Description ?? '').toLowerCase();
    if (title.includes('interest back')) return true;
    if (desc.includes('interest back')) return true;
    if (/\bsent\s+interest\s+back\b/i.test(desc)) return true;
    if (/\breciprocated\b/i.test(desc)) return true;
    return false;
}

export function notificationTitleFallback(notification: Record<string, unknown> | undefined | null): string {
    return isInterestBackNotification(notification) ? 'Interest back' : 'New interest';
}

export function notificationDescriptionFallback(notification: Record<string, unknown> | undefined | null): string {
    return isInterestBackNotification(notification)
        ? 'A member reciprocated — interest back.'
        : 'Someone is interested in your profile.';
}

/** Sub-profile id when interest is for a managed client / family profile (stored as ReservationId in API). */
export function managedProfileUserIdFromNotification(
    notification: Record<string, unknown> | undefined | null
): number | null {
    if (!notification) return null;
    return readManagedProfileUserId(
        notification.managedProfileUserId ??
            notification.ManagedProfileUserId ??
            notification.reservationId ??
            notification.ReservationId
    );
}

export function interestNotificationId(
    notification: Record<string, unknown> | undefined | null
): string | number | null | undefined {
    if (!notification) return undefined;
    return (notification.id ?? notification.Id) as string | number | null | undefined;
}

/** Stable key for deduping / tracking dismissed notifications (handles id type mismatches). */
export function interestNotificationDismissKey(
    notification: Record<string, unknown> | undefined | null
): string {
    if (!notification) return '';
    const id = interestNotificationId(notification);
    if (id != null && String(id).trim() !== '') return `id:${String(id)}`;
    const ref = referenceIdFromNotification(notification);
    const sub = managedProfileUserIdFromNotification(notification);
    const created = String(notification.createdOn ?? notification.CreatedOn ?? '');
    const title = String(notification.title ?? notification.Title ?? '');
    return `ref:${sub ?? 'none'}:${ref}:${created}:${title}`;
}

export function interestNotificationsMatch(
    a: Record<string, unknown> | undefined | null,
    b: Record<string, unknown> | undefined | null
): boolean {
    if (!a || !b) return false;
    const idA = interestNotificationId(a);
    const idB = interestNotificationId(b);
    if (idA != null && idB != null && String(idA) === String(idB)) return true;
    return interestNotificationDismissKey(a) === interestNotificationDismissKey(b);
}

/** Sender + managed thread context for an interest notification row. */
export function notificationMutualInterestContext(
    notification: Record<string, unknown> | undefined | null,
    activeSubAccountId?: number | null,
): { senderUserId: number; managedProfileUserId: number | null } {
    const senderUserId = referenceIdFromNotification(notification);
    const fromNotification = managedProfileUserIdFromNotification(notification);
    const managedProfileUserId =
        fromNotification ??
        (activeSubAccountId != null && activeSubAccountId > 0 ? activeSubAccountId : null);
    return { senderUserId, managedProfileUserId };
}

export function notificationHasMutualInterest(
    notification: Record<string, unknown> | undefined | null,
    favoriteActivity: FavoriteActivityRow[],
    activeSubAccountId?: number | null,
): boolean {
    const { senderUserId, managedProfileUserId } = notificationMutualInterestContext(
        notification,
        activeSubAccountId,
    );
    if (!senderUserId) return false;
    return (
        resolveMutualInterestState(favoriteActivity, senderUserId, managedProfileUserId) ===
        'mutual'
    );
}

/** Show Message (open inbox) when interest is mutual or this is an interest-back notice. */
export function shouldShowMessageFromInterestNotification(
    notification: Record<string, unknown> | undefined | null,
    favoriteActivity: FavoriteActivityRow[],
    activeSubAccountId?: number | null,
): boolean {
    return (
        isInterestBackNotification(notification) ||
        notificationHasMutualInterest(notification, favoriteActivity, activeSubAccountId)
    );
}
