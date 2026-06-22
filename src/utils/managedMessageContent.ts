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

/** Display name for an inbox row — prefer managed sub/client when the thread is tagged with one. */
export function inboxContactDisplayName(contact: {
    managedProfileUserId?: number | null;
    managedProfileName?: string | null;
    firstName?: string;
    lastName?: string;
    peerFirstName?: string;
    peerLastName?: string;
}): string {
    if (readManagedProfileUserId(contact.managedProfileUserId) != null) {
        const managedLabel = String(contact.managedProfileName ?? '').trim();
        if (managedLabel) return managedLabel;
        const a = String(contact.firstName ?? '').trim();
        const b = String(contact.lastName ?? '').trim();
        const managedName = [a, b].filter(Boolean).join(' ').trim();
        if (managedName) return managedName;
    }

    const a = String(contact.peerFirstName ?? contact.firstName ?? '').trim();
    const b = String(contact.peerLastName ?? contact.lastName ?? '').trim();
    return [a, b].filter(Boolean).join(' ').trim() || 'This member';
}

/** Profile photo for an inbox row — prefer managed sub/client photo when applicable. */
export function inboxContactDisplayPhoto(contact: {
    managedProfileUserId?: number | null;
    managedProfilePhoto?: string | null;
    profilePhoto?: string | null;
    peerProfilePhoto?: string | null;
}): string | null {
    if (readManagedProfileUserId(contact.managedProfileUserId) != null) {
        return (
            contact.managedProfilePhoto ??
            contact.profilePhoto ??
            contact.peerProfilePhoto ??
            null
        );
    }
    return contact.peerProfilePhoto ?? contact.profilePhoto ?? null;
}

/** The other member's login identity in a thread (parent account when they manage a sub). */
export function inboxContactPeerName(contact: {
    peerFirstName?: string;
    peerLastName?: string;
    firstName?: string;
    lastName?: string;
}): string {
    const a = String(contact.peerFirstName ?? '').trim();
    const b = String(contact.peerLastName ?? '').trim();
    const peer = [a, b].filter(Boolean).join(' ').trim();
    if (peer) return peer;
    const fa = String(contact.firstName ?? '').trim();
    const fb = String(contact.lastName ?? '').trim();
    return [fa, fb].filter(Boolean).join(' ').trim() || 'This member';
}

/** Login account name behind a managed sub/client thread (parent / matchmaker). */
export function inboxContactManagerName(contact: {
    peerFirstName?: string;
    peerLastName?: string;
    firstName?: string;
    lastName?: string;
}): string {
    return inboxContactPeerName(contact);
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
