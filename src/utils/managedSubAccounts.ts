import { isFamilyParentAccountType } from './matrimonialAccountTypes';
import { readManagedProfileUserId } from './managedMessageContent';

export type ManagedSubAccount = {
    id: number;
    firstName: string;
    lastName: string;
    profilePhoto: string | null;
    gender?: string;
};

export function canManageSubAccounts(accountType?: string | null): boolean {
    return isFamilyParentAccountType(accountType) || accountType === 'Matchmaker';
}

export function normalizeSubAccount(row: Record<string, unknown>): ManagedSubAccount | null {
    const id = Number((row as any).id ?? (row as any).Id ?? 0);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
        id,
        firstName: String((row as any).firstName ?? (row as any).FirstName ?? '').trim(),
        lastName: String((row as any).lastName ?? (row as any).LastName ?? '').trim(),
        profilePhoto: (row as any).profilePhoto ?? (row as any).ProfilePhoto ?? null,
        gender: String((row as any).gender ?? (row as any).Gender ?? '').trim() || undefined,
    };
}

export function subAccountDisplayName(sub: ManagedSubAccount): string {
    const name = [sub.firstName, sub.lastName].filter(Boolean).join(' ').trim();
    return name || 'Profile';
}

/** Show profile tabs when the parent manages two or more sub-profiles (matches Messages). */
export function shouldShowManagedProfileTabs(subAccounts: ManagedSubAccount[]): boolean {
    return subAccounts.length >= 2;
}

export function managedProfileUserIdFromRecord(raw: Record<string, unknown> | undefined | null): number | null {
    if (!raw) return null;
    return readManagedProfileUserId(
        raw.managedProfileUserId ??
            raw.ManagedProfileUserId ??
            raw.reservationId ??
            raw.ReservationId
    );
}

export function notificationMatchesManagedProfile(
    notification: Record<string, unknown>,
    activeSubAccountId: number | null
): boolean {
    if (activeSubAccountId == null) return true;
    return managedProfileUserIdFromRecord(notification) === activeSubAccountId;
}

export function subAccountNotificationUnreadMap(
    notifications: Record<string, unknown>[]
): Record<number, number> {
    const map: Record<number, number> = {};
    for (const n of notifications) {
        const subId = managedProfileUserIdFromRecord(n);
        if (subId == null) continue;
        map[subId] = (map[subId] ?? 0) + 1;
    }
    return map;
}
