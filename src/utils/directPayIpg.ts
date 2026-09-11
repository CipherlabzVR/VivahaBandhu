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
export const DIRECTPAY_FAILURE_TOAST_KEY = 'mymatch.directpay.failureToast';

export function stashDirectPayFailureMessage(message: string) {
    if (typeof window === 'undefined' || !message.trim()) return;
    sessionStorage.setItem(DIRECTPAY_FAILURE_TOAST_KEY, message.trim());
}

export function consumeDirectPayFailureMessage(): string {
    if (typeof window === 'undefined') return '';
    const message = (sessionStorage.getItem(DIRECTPAY_FAILURE_TOAST_KEY) || '').trim();
    sessionStorage.removeItem(DIRECTPAY_FAILURE_TOAST_KEY);
    return message;
}

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
        throw new Error(toUserFacingDirectPayMessage(result) || 'Card payment was cancelled or failed.');
    } catch (error) {
        fromMessages.stop();
        if (isDirectPayClientSuccess(error)) {
            return error;
        }
        throw new Error(toUserFacingDirectPayMessage(error));
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

export function toUserFacingDirectPayMessage(error: unknown): string {
    const fields = collectDirectPayTextFields(error);
    const haystack = fields.join(' ').toLowerCase();

    if (haystack.includes('get-payment-token')) {
        return 'The card payment session could not be started. Please try again in a moment.';
    }
    if (
        haystack.includes('not sufficient')
        || haystack.includes('insufficient')
        || haystack.includes('not enough fund')
        || haystack.includes('insufficient fund')
    ) {
        return 'Your card does not have sufficient funds. Please try another card or payment method.';
    }
    if (
        haystack.includes('declined')
        || haystack.includes('do not honour')
        || haystack.includes('do not honor')
        || haystack.includes('not authorized')
        || haystack.includes('refused')
    ) {
        return 'Your card payment was declined. Please try another card or contact your bank.';
    }
    if (haystack.includes('cancel')) {
        return 'Payment was cancelled. No amount was charged.';
    }
    if (
        haystack.includes('duplicate')
        || haystack.includes('session exists')
        || haystack.includes('payment session exist')
    ) {
        return 'This payment could not be completed. Please start a new checkout from the home page.';
    }
    if (haystack.includes('expired') && haystack.includes('card')) {
        return 'This card has expired. Please use a different card.';
    }
    if (haystack.includes('invalid card') || haystack.includes('incorrect card') || haystack.includes('invalid account')) {
        return 'The card details were not accepted. Please check the number and try again.';
    }
    if (haystack.includes('invalid amount')) {
        return 'This payment amount is not valid. Please start checkout again.';
    }
    if (haystack.includes('timeout') || haystack.includes('timed out')) {
        return 'The payment timed out. Please try again.';
    }
    if (haystack.includes('3ds') || haystack.includes('authentication') || haystack.includes('otp')) {
        return 'Card authentication was not completed. Please try again and finish the bank verification step.';
    }

    const clean = fields.find((text) => isReadablePaymentMessage(text));
    if (clean) return clean;
    return 'Payment failed. Please try again or use another payment method.';
}

export type DirectPayReturnOutcome = {
    isReturn: boolean;
    isFailure: boolean;
    isSuccess: boolean;
    orderId: string;
    message: string;
};

export function readDirectPayReturnFromUrl(search: string): DirectPayReturnOutcome {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    const orderId = (
        params.get('orderId')
        || params.get('orderid')
        || params.get('order_id')
        || ''
    ).trim();
    const desc = (
        params.get('desc')
        || params.get('description')
        || params.get('message')
        || params.get('error')
        || ''
    ).trim();
    const status = (
        params.get('status')
        || params.get('transaction_status')
        || params.get('transactionStatus')
        || ''
    ).trim();
    const isReturn = params.get('directpay') === '1' || Boolean(orderId && (desc || status));
    const probe = { status, description: desc, desc, message: desc };
    const isFailure = isReturn && (
        isDirectPayClientFailure(probe)
        || isFailureDescription(desc)
        || isFailureDescription(status)
    );
    const isSuccess = isReturn && !isFailure && (
        isDirectPayClientSuccess(probe)
        || SUCCESS_STATUSES.has(status.toUpperCase())
    );

    return {
        isReturn,
        isFailure,
        isSuccess,
        orderId,
        message: isFailure ? toUserFacingDirectPayMessage(desc || status || probe) : '',
    };
}

function isReadablePaymentMessage(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < 3 || trimmed.length > 180) return false;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
    if (/[{}\[\]"]/.test(trimmed) && /"(title|message|code|status|data)"/.test(trimmed)) return false;
    return /[a-zA-Z]/.test(trimmed);
}

function isFailureDescription(text: string): boolean {
    const value = text.trim().toLowerCase();
    if (!value) return false;
    return (
        value.includes('insufficient')
        || value.includes('not sufficient')
        || value.includes('declined')
        || value.includes('failed')
        || value.includes('failure')
        || value.includes('cancel')
        || value.includes('duplicate')
        || value.includes('session exists')
        || value.includes('do not honour')
        || value.includes('do not honor')
        || value.includes('expired')
        || value.includes('invalid')
        || value.includes('timeout')
        || value.includes('refused')
        || value.includes('not authorized')
        || value.includes('error')
    );
}

function collectDirectPayTextFields(error: unknown, depth = 0): string[] {
    if (error == null || depth > 5) return [];
    if (typeof error === 'string') {
        const trimmed = error.trim();
        if (!trimmed) return [];
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (trimmed.includes('"') || trimmed.includes("'"))) {
            try {
                return collectDirectPayTextFields(JSON.parse(trimmed), depth + 1);
            } catch {
                return [trimmed];
            }
        }
        return [trimmed];
    }
    if (error instanceof Error) {
        const extra = (error as Error & { data?: unknown }).data;
        return [
            ...collectDirectPayTextFields(error.message, depth + 1),
            ...collectDirectPayTextFields(extra, depth + 1),
        ];
    }
    if (typeof error === 'object') {
        const record = error as Record<string, unknown>;
        const keys = [
            'title', 'Title',
            'description', 'Description', 'desc',
            'message', 'Message',
            'error', 'Error',
            'code', 'Code',
            'status', 'Status',
            'data', 'Data',
            'result', 'Result',
        ];
        return keys.flatMap((key) => collectDirectPayTextFields(record[key], depth + 1));
    }
    return [String(error)];
}

function stringifyDirectPayError(error: unknown): string {
    return collectDirectPayTextFields(error).join(' ').trim();
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
    'INSUFFICIENT',
    'INSUFFICIENT FUNDS',
    'NOT SUFFICIENT FUNDS',
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
    const status = readDirectPayClientStatus(result).trim().toUpperCase();
    if (FAILURE_STATUSES.has(status)) return true;
    const text = `${status} ${stringifyDirectPayError(result)}`.toLowerCase();
    return isFailureDescription(text);
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

