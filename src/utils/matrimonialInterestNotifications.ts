/**
 * Shared parsing helpers for Matrimonial interest notification payloads (REST + SignalR).
 */

import { readManagedProfileUserId } from './managedMessageContent';

export function referenceIdFromNotification(notification: Record<string, unknown> | undefined | null): number {
    if (!notification) return 0;
    const raw = notification.referenceId ?? notification.ReferenceId;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
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
