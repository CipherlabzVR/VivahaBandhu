import { isFamilyParentAccountType } from './matrimonialAccountTypes';
import { readManagedProfileUserId } from './managedMessageContent';

export type ManagedSubAccount = {
    id: number;
    firstName: string;
    lastName: string;
    profilePhoto: string | null;
    gender?: string;
    isSubscribed?: boolean;
    subscriptionIsLifetime?: boolean;
    subscriptionExpiresAt?: string;
    /** 1 = ACTIVE, 2 = INACTIVE (suspended when manager is on free plan). */
    status?: number | string;
    horoscopeDocument?: string;
    horoscopeDocument2?: string;
    horoscopeDocument3?: string;
};

/** Full sub-account row for profile dashboard cards (camelCase-normalized). */
export type ManagedSubAccountDetail = ManagedSubAccount & {
    phoneNumber?: string;
    email?: string;
    age?: number;
    cityOfResidence?: string;
    religion?: string;
    maritalStatus?: string;
    profileComplete?: boolean;
    subscriptionUntilUtc?: string;
    horoscopeDocument?: string;
    horoscopeDocument2?: string;
    horoscopeDocument3?: string;
};

function readString(row: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
        const value = row[key];
        if (value != null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
}

function readOptionalString(row: Record<string, unknown>, ...keys: string[]): string | undefined {
    const value = readString(row, ...keys);
    return value || undefined;
}

function readNumber(row: Record<string, unknown>, ...keys: string[]): number | undefined {
    for (const key of keys) {
        const raw = row[key];
        if (raw == null || raw === '') continue;
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
    }
    return undefined;
}

function readBool(row: Record<string, unknown>, ...keys: string[]): boolean | undefined {
    for (const key of keys) {
        const raw = row[key];
        if (raw === true || raw === 'true') return true;
        if (raw === false || raw === 'false') return false;
    }
    return undefined;
}

export function parseSubAccountsApiResult(data: unknown): ManagedSubAccountDetail[] {
    if (!data || typeof data !== 'object') return [];
    const record = data as Record<string, unknown>;
    const code = record.statusCode ?? record.StatusCode;
    if (code !== 200 && code !== 1 && code !== '200' && code !== 'SUCCESS' && code !== 'Success') {
        return [];
    }
    const raw = record.result ?? record.Result;
    if (!Array.isArray(raw)) return [];
    return raw
        .map((row) => normalizeSubAccountDetailRow(row as Record<string, unknown>))
        .filter(Boolean) as ManagedSubAccountDetail[];
}

export function normalizeSubAccountDetailRow(row: Record<string, unknown>): ManagedSubAccountDetail | null {
    const base = normalizeSubAccount(row);
    if (!base) return null;
    const subscriptionUntilUtc = readOptionalString(
        row,
        'subscriptionUntilUtc',
        'SubscriptionUntilUtc',
    );
    return {
        ...base,
        phoneNumber: readOptionalString(row, 'phoneNumber', 'PhoneNumber'),
        email: readOptionalString(row, 'email', 'Email', 'userName', 'UserName'),
        age: readNumber(row, 'age', 'Age'),
        cityOfResidence: readOptionalString(row, 'cityOfResidence', 'CityOfResidence'),
        religion: readOptionalString(row, 'religion', 'Religion'),
        maritalStatus: readOptionalString(row, 'maritalStatus', 'MaritalStatus'),
        profileComplete: readBool(row, 'profileComplete', 'ProfileComplete'),
        subscriptionUntilUtc: subscriptionUntilUtc ?? base.subscriptionExpiresAt,
        horoscopeDocument: readOptionalString(
            row,
            'horoscopeDocument',
            'HoroscopeDocument',
        ),
        horoscopeDocument2: readOptionalString(
            row,
            'horoscopeDocument2',
            'HoroscopeDocument2',
        ),
        horoscopeDocument3: readOptionalString(
            row,
            'horoscopeDocument3',
            'HoroscopeDocument3',
        ),
    };
}

export function canManageSubAccounts(accountType?: string | null): boolean {
    return isFamilyParentAccountType(accountType) || accountType === 'Matchmaker';
}

export function normalizeSubAccount(row: Record<string, unknown>): ManagedSubAccount | null {
    const id = Number((row as any).id ?? (row as any).Id ?? 0);
    if (!Number.isFinite(id) || id <= 0) return null;
    const rawUntil =
        (row as any).subscriptionExpiresAt ??
        (row as any).SubscriptionExpiresAt ??
        (row as any).subscriptionUntilUtc ??
        (row as any).SubscriptionUntilUtc;
    let subscriptionExpiresAt: string | undefined;
    if (rawUntil != null && String(rawUntil).trim() !== '') {
        const d = new Date(String(rawUntil));
        if (!Number.isNaN(d.getTime())) subscriptionExpiresAt = d.toISOString();
    }
    const isSubscribedRaw = (row as any).isSubscribed ?? (row as any).IsSubscribed;
    const lifetimeRaw = (row as any).subscriptionIsLifetime ?? (row as any).SubscriptionIsLifetime;
    const statusRaw = (row as any).status ?? (row as any).Status;
    return {
        id,
        firstName: String((row as any).firstName ?? (row as any).FirstName ?? '').trim(),
        lastName: String((row as any).lastName ?? (row as any).LastName ?? '').trim(),
        profilePhoto: (row as any).profilePhoto ?? (row as any).ProfilePhoto ?? null,
        gender: String((row as any).gender ?? (row as any).Gender ?? '').trim() || undefined,
        isSubscribed: isSubscribedRaw === true || isSubscribedRaw === 'true',
        subscriptionIsLifetime: lifetimeRaw === true || lifetimeRaw === 'true',
        subscriptionExpiresAt,
        status: statusRaw != null && statusRaw !== '' ? statusRaw : undefined,
        horoscopeDocument: readOptionalString(row, 'horoscopeDocument', 'HoroscopeDocument'),
        horoscopeDocument2: readOptionalString(row, 'horoscopeDocument2', 'HoroscopeDocument2'),
        horoscopeDocument3: readOptionalString(row, 'horoscopeDocument3', 'HoroscopeDocument3'),
    };
}

export function isManagedSubAccountActive(sub: Pick<ManagedSubAccount, 'status'>): boolean {
    const status = sub.status;
    if (status == null || status === '') return true;
    if (typeof status === 'number') return status === 1;
    const normalized = String(status).trim().toUpperCase();
    return normalized !== 'INACTIVE' && normalized !== '2';
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
