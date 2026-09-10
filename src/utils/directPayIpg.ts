const DIRECTPAY_SCRIPT_SRC = 'https://cdn.directpay.lk/v3/directpayipg.min.js';

export type DirectPayStage = 'DEV' | 'PROD';

export type DirectPayCheckoutInput = {
    signature: string;
    dataString: string;
    stage: DirectPayStage;
    containerId?: string;
};

type DirectPayPlugin = {
    doInAppCheckout: () => Promise<unknown>;
    doInContainerCheckout?: () => Promise<unknown>;
};

type DirectPayNamespace = {
    Init: new (options: {
        signature: string;
        dataString: string;
        stage: string;
        container?: string;
    }) => DirectPayPlugin;
};

declare global {
    interface Window {
        DirectPayIpg?: DirectPayNamespace;
        DirectpayIpg?: DirectPayNamespace;
    }
}

function getDirectPayNamespace(): DirectPayNamespace | undefined {
    if (typeof window === 'undefined') return undefined;
    return window.DirectPayIpg || window.DirectpayIpg;
}

export function loadDirectPayScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('DirectPay can only run in the browser.'));
    }

    if (getDirectPayNamespace()) {
        return Promise.resolve();
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${DIRECTPAY_SCRIPT_SRC}"]`);
    if (existing) {
        return new Promise((resolve, reject) => {
            if (getDirectPayNamespace()) {
                resolve();
                return;
            }
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load DirectPay checkout.')), { once: true });
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = DIRECTPAY_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load DirectPay checkout.'));
        document.body.appendChild(script);
    });
}

export const DIRECTPAY_SESSION_KEY = 'mymatch.directpay.session';

export type DirectPaySession = {
    signature: string;
    dataString: string;
    stage: DirectPayStage;
    orderId: string;
    plan: string;
    amount: string;
    returnTo: string;
};

export function saveDirectPaySession(session: DirectPaySession) {
    sessionStorage.setItem(DIRECTPAY_SESSION_KEY, JSON.stringify(session));
}

export function readDirectPaySession(): DirectPaySession | null {
    try {
        const raw = sessionStorage.getItem(DIRECTPAY_SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DirectPaySession;
        if (!parsed?.signature || !parsed?.dataString || !parsed?.orderId) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function clearDirectPaySession() {
    sessionStorage.removeItem(DIRECTPAY_SESSION_KEY);
}

export async function openDirectPayCheckout(input: DirectPayCheckoutInput): Promise<unknown> {
    await loadDirectPayScript();
    const ns = getDirectPayNamespace();
    if (!ns?.Init) {
        throw new Error('DirectPay checkout did not load. Disable ad blockers and try again.');
    }

    const containerId = input.containerId || 'directpay_card_container';
    const plugin = new ns.Init({
        signature: input.signature,
        dataString: input.dataString,
        stage: input.stage,
        container: containerId,
    });

    if (typeof plugin.doInContainerCheckout !== 'function') {
        throw new Error('DirectPay in-page checkout is not available. Refresh and try again.');
    }

    const fromMessages = listenForDirectPayBrowserSuccess();
    // Only an explicit success status counts. Widget markup and transaction ids are
    // present for declined cards too, so guessing from them grants premium for free.
    try {
        const result = await Promise.race([
            plugin.doInContainerCheckout(),
            fromMessages.promise,
        ]);
        fromMessages.stop();
        if (isDirectPayClientSuccess(result)) {
            return result;
        }
        throw new Error(formatDirectPayError(result) || 'Card payment was cancelled or failed.');
    } catch (error) {
        fromMessages.stop();
        if (isDirectPayClientSuccess(error)) {
            return error;
        }
        throw new Error(formatDirectPayError(error));
    }
}

function listenForDirectPayBrowserSuccess(): { promise: Promise<unknown>; stop: () => void } {
    let stop = () => {};
    const promise = new Promise<unknown>((resolve) => {
        const onMessage = (event: MessageEvent) => {
            const payload = unwrapDirectPayMessage(event.data);
            if (isDirectPayClientSuccess(payload)) {
                resolve(payload);
            }
        };
        window.addEventListener('message', onMessage);
        stop = () => window.removeEventListener('message', onMessage);
    });
    return { promise, stop };
}

function unwrapDirectPayMessage(data: unknown): unknown {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    return data;
}

function formatDirectPayError(error: unknown): string {
    const raw = stringifyDirectPayError(error);
    const lower = raw.toLowerCase();
    if (lower.includes('get-payment-token') || lower.includes('token')) {
        return (
            'DirectPay could not start the card session (GET-PAYMENT-TOKEN). ' +
            'Use sandbox Merchant ID + secret with Stage DEV, or live credentials with Stage PROD. ' +
            (raw ? `Details: ${raw}` : '')
        ).trim();
    }
    return raw || 'DirectPay checkout failed.';
}

function stringifyDirectPayError(error: unknown): string {
    if (error == null) return '';
    if (typeof error === 'string') return error;
    if (error instanceof Error) {
        const extra = (error as Error & { data?: unknown }).data;
        return extra != null ? `${error.message} ${stringifyDirectPayError(extra)}`.trim() : error.message;
    }
    if (typeof error === 'object') {
        const record = error as Record<string, unknown>;
        const nested =
            record.message ??
            record.Message ??
            record.error ??
            record.Error ??
            record.description ??
            record.desc ??
            record.data ??
            record.Data;
        try {
            return nested != null && nested !== error
                ? `${stringifyDirectPayError(nested)} ${JSON.stringify(record)}`.trim()
                : JSON.stringify(record);
        } catch {
            return Object.prototype.toString.call(error);
        }
    }
    return String(error);
}

const SUCCESS_STATUSES = new Set([
    'SUCCESS',
    'SUCCEEDED',
    'SUCCESSFUL',
    'APPROVED',
    'OK',
    'COMPLETED',
    'COMPLETE',
    'PAID',
    '1',
    '00',
    '200',
]);

const FAILURE_STATUSES = new Set([
    'FAILED',
    'FAIL',
    'FAILURE',
    'CANCEL',
    'CANCELLED',
    'CANCELED',
    'DECLINED',
    'ERROR',
    'INVALID',
    'INVALID AMOUNT',
]);

export function readDirectPayClientStatus(result: unknown): string {
    if (result == null) return '';
    if (typeof result === 'string') return result;
    if (typeof result !== 'object') return String(result);
    const record = result as Record<string, unknown>;
    const nested = record.data ?? record.Data ?? record.result ?? record.Result;
    const raw =
        (nested && typeof nested === 'object'
            ? (nested as Record<string, unknown>).status
                ?? (nested as Record<string, unknown>).Status
                ?? (nested as Record<string, unknown>).transaction_status
                ?? (nested as Record<string, unknown>).transactionStatus
            : undefined)
        ?? record.status
        ?? record.Status
        ?? record.transaction_status
        ?? record.transactionStatus
        ?? record.description
        ?? record.Description;
    return raw == null ? '' : String(raw);
}

export function isDirectPayClientFailure(result: unknown): boolean {
    const text = `${readDirectPayClientStatus(result)} ${stringifyDirectPayError(result)}`.toUpperCase();
    if (FAILURE_STATUSES.has(readDirectPayClientStatus(result).trim().toUpperCase())) return true;
    return text.includes('PAYMENT FAILED') || text.includes('INVALID AMOUNT') || text.includes('DECLINED');
}

export function isDirectPayClientSuccess(result: unknown): boolean {
    if (result == null) return false;
    if (isDirectPayClientFailure(result)) return false;
    const status = readDirectPayClientStatus(result).trim().toUpperCase();
    if (SUCCESS_STATUSES.has(status)) return true;
    const text = stringifyDirectPayError(result).toUpperCase();
    if (text.includes('PAYMENT SUCCESSFUL') || text.includes('TRANSACTION SUCCESSFUL') || text.includes('APPROVED')) {
        return true;
    }
    if (typeof result === 'object') {
        const record = result as Record<string, unknown>;
        const data = (record.data ?? record.Data) as Record<string, unknown> | undefined;
        const txn = record.transactionId ?? record.transaction_id ?? record.TransactionId
            ?? data?.transactionId ?? data?.transaction_id ?? data?.TransactionId;
        if (txn != null && String(txn).trim() !== '' && !isDirectPayClientFailure(result)) {
            return SUCCESS_STATUSES.has(String(record.status ?? data?.status ?? '').toUpperCase())
                || String(record.status) === '200'
                || String(data?.status ?? '').toUpperCase() === 'SUCCESS';
        }
    }
    return false;
}

