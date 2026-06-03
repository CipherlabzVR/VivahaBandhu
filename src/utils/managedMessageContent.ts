const MANAGED_MESSAGE_PREFIX =
    /^\[ManagedProfile:(\d+):([^\]]*)\]\s*/;

export function parseManagedProfileFromContent(content: string): {
    managedProfileUserId: number;
    managedProfileName: string;
    body: string;
} | null {
    const match = String(content ?? '').match(MANAGED_MESSAGE_PREFIX);
    if (!match) return null;
    const managedProfileUserId = Number(match[1]);
    if (!Number.isFinite(managedProfileUserId) || managedProfileUserId <= 0) return null;
    return {
        managedProfileUserId,
        managedProfileName: match[2]?.trim() || 'profile',
        body: String(content).replace(MANAGED_MESSAGE_PREFIX, '').trim(),
    };
}

export function stripManagedMessagePrefix(content: string): string {
    return String(content ?? '').replace(MANAGED_MESSAGE_PREFIX, '').trim();
}

export function readManagedProfileUserId(raw: unknown): number | null {
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
}

export function inboxThreadKey(contactId: number, managedProfileUserId?: number | null): string {
    const managed = readManagedProfileUserId(managedProfileUserId);
    return `${contactId}-${managed ?? 0}`;
}

export function messageMatchesManagedThread(
    content: string,
    activeManagedProfileUserId?: number | null
): boolean {
    const parsed = parseManagedProfileFromContent(content);
    const active = readManagedProfileUserId(activeManagedProfileUserId);
    if (active != null) return parsed?.managedProfileUserId === active;
    return parsed == null;
}
