import * as signalR from '@microsoft/signalr';

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
export async function connectMatrimonialHub(apiBaseUrl: string): Promise<signalR.HubConnection> {
    const candidates = getMatrimonialSignalRHubCandidates(apiBaseUrl);
    let lastError: unknown;

    for (let i = 0; i < candidates.length; i++) {
        const hubUrl = candidates[i];
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(hubUrl)
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
