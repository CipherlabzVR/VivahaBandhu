'use client';

export type ToastType = 'success' | 'error' | 'info';

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
