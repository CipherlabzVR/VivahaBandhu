'use client';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastPayload {
    message: string;
    type?: ToastType;
    durationMs?: number;
}

export const APP_TOAST_EVENT = 'app-toast';

export function showToast(message: string, type: ToastType = 'info', durationMs = 2800): void {
    if (typeof window === 'undefined' || !message) return;
    window.dispatchEvent(
        new CustomEvent<ToastPayload>(APP_TOAST_EVENT, {
            detail: { message, type, durationMs },
        }),
    );
}

/** Popup after toggling interest: green for send, orange for remove. */
export function showInterestToggleToast(wasAlreadyInterested: boolean): void {
    if (wasAlreadyInterested) {
        showToast('Interest removed successfully', 'warning');
    } else {
        showToast('Interest sent successfully', 'success');
    }
}

/** Prefer API `isFavorite` when present; otherwise fall back to prior UI state. */
export function showInterestToggleToastFromResponse(
    result: unknown,
    wasAlreadyInterestedFallback: boolean,
): void {
    const r = result as { isFavorite?: boolean; IsFavorite?: boolean } | null | undefined;
    const isFavorite = r?.isFavorite ?? r?.IsFavorite;
    if (typeof isFavorite === 'boolean') {
        showInterestToggleToast(!isFavorite);
        return;
    }
    showInterestToggleToast(wasAlreadyInterestedFallback);
}
