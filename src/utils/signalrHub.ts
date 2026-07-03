import * as signalR from '@microsoft/signalr';
import { ensureCorsOriginRegistered } from './corsBootstrap';

/**
 * Resolved Chat hub URLs — must stay in sync with API:
 * ApexflowERP.Api Program.cs → MapHub<ChatHub>("/hubs/chat") and "/api/hubs/chat"
 *
 * Optional override (full hub base URL, no trailing slash):
 * NEXT_PUBLIC_SIGNALR_HUB_URL=https://api.example.com/hubs/chat
 */
export function getMatrimonialSignalRHubCandidates(apiBaseUrl: string): string[] {
    const explicit =
        typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SIGNALR_HUB_URL?.trim() : undefined;
    if (explicit) {
        return [explicit.replace(/\/+$/, '')];
    }

    const trimmed = apiBaseUrl.replace(/\/+$/, '');
    const origin = trimmed.replace(/\/api\/?$/i, '');
    const rootHub = `${origin}/hubs/chat`;
    const underApiHub = `${trimmed}/hubs/chat`;
    if (rootHub === underApiHub) {
        return [rootHub];
    }
    // Prefer /api/hubs/chat first so it matches the same /api prefix as REST (Matrimonial/*).
    // Fallback: site root /hubs/chat (Kestrel when only that path was mapped historically).
    return [underApiHub, rootHub];
}

/** First candidate. */
export function getMatrimonialSignalRHubUrl(apiBaseUrl: string): string {
    const c = getMatrimonialSignalRHubCandidates(apiBaseUrl);
    return c[0] ?? '';
}

function stringifyErrorChain(error: unknown): string {
    const parts: string[] = [];
    let cur: unknown = error;
    let depth = 0;
    while (cur != null && depth < 8) {
        depth += 1;
        if (cur instanceof Error) {
            parts.push(cur.message, cur.name);
            cur = (cur as Error & { cause?: unknown }).cause;
        } else {
            parts.push(String(cur));
            break;
        }
    }
    return parts.join(' ');
}

/** True when negotiation failed because the hub URL/path is wrong (try another candidate). */
export function isSignalRNegotiation404(error: unknown): boolean {
    const blob = stringifyErrorChain(error).toLowerCase();
    return (
        blob.includes('404') &&
        (blob.includes('negotiat') ||
            blob.includes('signalr') ||
            blob.includes('status code') ||
            blob.includes('not a signal'))
    );
}

/**
 * Builds a SignalR connection and tries hub URL candidates until one negotiates successfully.
 */
export async function connectMatrimonialHub(
    apiBaseUrl: string,
    userId?: string
): Promise<signalR.HubConnection> {
    await ensureCorsOriginRegistered(apiBaseUrl);

    const candidates = getMatrimonialSignalRHubCandidates(apiBaseUrl);
    let lastError: unknown;

    for (let i = 0; i < candidates.length; i++) {
        const hubUrl = candidates[i];
        const hubUrlWithUser =
            userId != null && userId !== ''
                ? `${hubUrl}?userId=${encodeURIComponent(userId)}`
                : hubUrl;
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrlWithUser)
            .configureLogging(signalR.LogLevel.None)
            .withAutomaticReconnect()
            .build();

        try {
            await connection.start();
            return connection;
        } catch (e) {
            await connection.stop().catch(() => {});
            lastError = e;
            const tryNext = i < candidates.length - 1 && isSignalRNegotiation404(e);
            if (!tryNext) {
                throw e;
            }
        }
    }

    throw lastError;
}

/** De-dupe + stringify user ids, dropping empty/invalid entries. */
function normalizeUserIds(userId: string, extraUserIds?: Array<string | number>): string[] {
    const ids = [userId, ...(extraUserIds ?? [])]
        .map((id) => String(id).trim())
        .filter((id) => id !== '' && id !== '0');
    return [...new Set(ids)];
}

/**
 * Register the current user (and any managed sub-account ids) with ChatHub so presence
 * + message routing work. Managed sub-accounts never connect on their own, so the parent
 * keeps them "online" by joining their groups here.
 */
export async function joinMatrimonialUserGroup(
    connection: signalR.HubConnection,
    userId: string,
    extraUserIds?: Array<string | number>
): Promise<void> {
    const ids = normalizeUserIds(userId, extraUserIds);
    if (ids.length <= 1) {
        await connection.invoke('JoinUserGroup', ids[0] ?? userId);
        return;
    }
    try {
        await connection.invoke('JoinUserGroups', ids);
    } catch {
        // Fallback for older hub without the batch method.
        await Promise.all(ids.map((id) => connection.invoke('JoinUserGroup', id)));
    }
}

/**
 * Re-join the user group(s) after automatic reconnect. Without this, ChatHub clears
 * presence on disconnect and users stay "offline" until a full page reload.
 */
export function registerMatrimonialHubReconnect(
    connection: signalR.HubConnection,
    userId: string,
    onReconnected?: () => void,
    getExtraUserIds?: () => Array<string | number>
): void {
    connection.onreconnected(async () => {
        try {
            await joinMatrimonialUserGroup(connection, userId, getExtraUserIds?.());
            onReconnected?.();
        } catch (e) {
            console.warn('SignalR re-join failed after reconnect:', e);
        }
    });
}
