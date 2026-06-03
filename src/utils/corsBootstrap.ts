/**
 * Register the current browser origin with ERP /api/AppSetting/SaveCorsLink so
 * subsequent REST + SignalR requests pass DatabaseCorsPolicyProvider checks.
 *
 * Mirrors APEXFLOW Front end pages/_app.js — always uses window.location.origin
 * (never NEXT_PUBLIC_SITE_URL, which may differ from the dev port).
 */

const SESSION_KEY = '__mymatchSaveCorsOrigin';

let inflight: Promise<void> | null = null;

export function getErpApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
}

/**
 * Idempotent per tab session. Safe to call before every SignalR negotiate.
 */
export function ensureCorsOriginRegistered(apiBaseUrl?: string): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }

    const origin = window.location.origin?.replace(/\/+$/, '');
    if (!origin) {
        return Promise.resolve();
    }

    try {
        if (sessionStorage.getItem(SESSION_KEY) === origin) {
            return Promise.resolve();
        }
    } catch {
        // sessionStorage blocked — still attempt registration each time
    }

    if (inflight) {
        return inflight;
    }

    const base = (apiBaseUrl || getErpApiBaseUrl()).replace(/\/+$/, '');

    inflight = fetch(`${base}/AppSetting/SaveCorsLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webLink: origin, isActive: true }),
    })
        .then(async (response) => {
            if (!response.ok) return;
            try {
                sessionStorage.setItem(SESSION_KEY, origin);
            } catch {
                // ignore
            }
        })
        .catch(() => {
            // Non-blocking — SignalR may retry after a later successful registration.
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}
