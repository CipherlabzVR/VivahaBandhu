/** Set when user submits a bank slip; cleared after we detect subscription is active. */
export const PENDING_BANK_PREMIUM_STORAGE_KEY = 'mymatch_pending_bank_premium';

/** Epoch ms when the premium bank slip was submitted (used to ignore stale rejection notices). */
export const PENDING_BANK_PREMIUM_AT_STORAGE_KEY = 'mymatch_pending_bank_premium_at';

/** Set when user submits a bank slip for a sub-account slot. */
export const PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY = 'mymatch_pending_bank_sub_account';

/** Epoch ms when the slot bank slip was submitted (used to ignore stale rejection notices). */
export const PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY = 'mymatch_pending_bank_sub_account_at';

/** Fired when pending bank-transfer localStorage flags change (same-tab updates). */
export const PENDING_BANK_TRANSFER_CHANGED_EVENT = 'mymatch-pending-bank-changed';

/** Profile banner after admin decision: `approved` | `rejected`. Cleared when user dismisses. */
export const BANK_TRANSFER_RESULT_STORAGE_KEY = 'mymatch_bank_transfer_result';

/**
 * Last bank-transfer lifecycle event applied on this device (approve / reject / undo).
 * Prevents a stale "rejection undone" notice from wiping a newer reject banner.
 */
export const BANK_TRANSFER_APPLIED_LIFECYCLE_KEY = 'mymatch_bank_applied_lifecycle';

export type BankTransferResultBanner = 'approved' | 'rejected';

export type AppliedBankTransferLifecycle = {
    action: 'restore_pending' | 'approved' | 'rejected';
    id: number;
    at: number;
};

export function getAppliedBankTransferLifecycle(): AppliedBankTransferLifecycle | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(BANK_TRANSFER_APPLIED_LIFECYCLE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as AppliedBankTransferLifecycle;
        if (!parsed || typeof parsed !== 'object') return null;
        if (
            parsed.action !== 'restore_pending'
            && parsed.action !== 'approved'
            && parsed.action !== 'rejected'
        ) {
            return null;
        }
        return {
            action: parsed.action,
            id: Number(parsed.id) || 0,
            at: Number(parsed.at) || 0,
        };
    } catch {
        return null;
    }
}

/** True when this notification is newer than the last lifecycle we already applied. */
export function shouldApplyBankTransferLifecycle(
    action: AppliedBankTransferLifecycle['action'],
    notification: Record<string, unknown> | null | undefined,
    createdAtMs: number,
): boolean {
    if (typeof window === 'undefined' || !notification) return false;
    const id = Number(notification.id ?? notification.Id ?? 0) || 0;
    const at = createdAtMs > 0 ? createdAtMs : 0;
    const prev = getAppliedBankTransferLifecycle();
    if (!prev) return true;
    if (id > 0 && prev.id > 0 && id === prev.id) return false;
    if (at > 0 && prev.at > 0) {
        if (at < prev.at) return false;
        if (at > prev.at) return true;
        if (id > 0 && prev.id > 0) return id > prev.id;
        return action !== prev.action;
    }
    if (id > 0 && prev.id > 0) return id > prev.id;
    // Missing ids/timestamps: allow only when action advances (e.g. restore → reject).
    if (prev.action === 'restore_pending' && (action === 'rejected' || action === 'approved')) {
        return true;
    }
    if ((prev.action === 'rejected' || prev.action === 'approved') && action === 'restore_pending') {
        // Undo without a newer id/timestamp — ignore (stale undo after reject).
        return false;
    }
    return false;
}

export function rememberAppliedBankTransferLifecycle(
    action: AppliedBankTransferLifecycle['action'],
    notification: Record<string, unknown> | null | undefined,
    createdAtMs: number,
): void {
    if (typeof window === 'undefined' || !notification) return;
    const id = Number(notification.id ?? notification.Id ?? 0) || 0;
    const at = createdAtMs > 0 ? createdAtMs : Date.now();
    localStorage.setItem(
        BANK_TRANSFER_APPLIED_LIFECYCLE_KEY,
        JSON.stringify({ action, id, at } satisfies AppliedBankTransferLifecycle),
    );
}

/** Shown via GlobalToast after card payment succeeds or admin approves a pending bank transfer. */
export const PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE =
    'You have successfully activated premium membership. Browse profiles to find your partner!';

export const MATCHMAKER_PLAN_ACTIVATED_MESSAGE =
    'Client account slot purchased. Create a client profile from your profile page — you can buy more anytime.';

export const MATCHMAKER_CLIENT_SLOT_PURCHASED_MESSAGE = MATCHMAKER_PLAN_ACTIVATED_MESSAGE;

/** Shown via GlobalToast right after the user uploads a bank transfer slip. */
export const BANK_TRANSFER_SUBMITTED_MESSAGE =
    'Bank transfer slip submitted successfully. Premium will activate after our team verifies your payment.';

export const BANK_TRANSFER_SUB_ACCOUNT_SUBMITTED_MESSAGE =
    'Bank transfer slip submitted. Your sub-account slot will be added after admin approval.';

export const SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE =
    'Sub-account slot purchased. Premium is now active on your account. Create a managed profile when you are ready.';

/** Session flag so we only show the bank-approval toast once per pending transfer (survives Strict Mode double mount). */
export const BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY = 'mymatch_bank_premium_toast_shown';

/** Session flag so we only show the bank-rejection toast once per pending transfer. */
export const BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY = 'mymatch_bank_transfer_rejected_toast_shown';

/** Shown when admin rejects a pending bank transfer slip. */
export const BANK_TRANSFER_REJECTED_MESSAGE =
    'Your bank transfer was not approved. Check your notifications for details, or submit a new slip from subscription settings.';

export const BANK_TRANSFER_APPROVED_BANNER_TITLE = 'Bank transfer approved';
export const BANK_TRANSFER_APPROVED_BANNER_BODY =
    'Your payment was verified. Premium membership is now active — you can browse profiles and use premium features.';

export const BANK_TRANSFER_REJECTED_BANNER_TITLE = 'Bank transfer not approved';
export const BANK_TRANSFER_REJECTED_BANNER_BODY =
    'Your bank transfer payment was not approved. Open Settings → Upgrade Premium, or use Submit new slip below to upload another payment slip.';

export function getBankTransferResultBanner(): BankTransferResultBanner | null {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    return v === 'approved' || v === 'rejected' ? v : null;
}

export function setBankTransferResultBanner(result: BankTransferResultBanner): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(BANK_TRANSFER_RESULT_STORAGE_KEY, result);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

export function clearBankTransferResultBanner(): void {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(BANK_TRANSFER_RESULT_STORAGE_KEY)) return;
    localStorage.removeItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

/**
 * Apply admin bank-transfer decision: clear pending slip flags and show the profile result banner.
 * Approved banners require an active pending slip flag so card/other activations never look like
 * bank-transfer approvals. Rejected banners also require pending (stale reject notices are ignored).
 */
export function applyBankTransferDecision(result: BankTransferResultBanner): void {
    if (typeof window === 'undefined') return;
    const hadPending = hasPendingBankTransferFlag();
    const prev = localStorage.getItem(BANK_TRANSFER_RESULT_STORAGE_KEY);

    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);

    // Never surface bank-transfer result UI unless the user actually submitted a slip.
    if (!hadPending) {
        if (prev) {
            localStorage.removeItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
            window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
        }
        return;
    }

    localStorage.setItem(BANK_TRANSFER_RESULT_STORAGE_KEY, result);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

/**
 * Apply reject/approve even when pending flags were already cleared by a stale undo restore,
 * as long as we still have (or just set) a result banner path from a real slip decision.
 */
export function applyBankTransferDecisionForce(result: BankTransferResultBanner): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);
    localStorage.setItem(BANK_TRANSFER_RESULT_STORAGE_KEY, result);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

/** Clear pending slip flags and any bank-transfer result banner (card pay / cancel / non-bank paths). */
export function clearBankTransferUiState(): void {
    if (typeof window === 'undefined') return;
    const hadPending = hasPendingBankTransferFlag();
    const hadResult = !!localStorage.getItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);
    localStorage.removeItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    try {
        sessionStorage.removeItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY);
        sessionStorage.removeItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY);
    } catch {
        /* ignore */
    }
    if (hadPending || hadResult) {
        window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
    }
}

export function hasPendingBankTransferFlag(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1' ||
        localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1'
    );
}

/** Newest submit timestamp across premium / slot pending flags (0 if none). */
export function getPendingBankTransferSubmittedAt(): number {
    if (typeof window === 'undefined') return 0;
    const premiumAt = Number(localStorage.getItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY) || 0);
    const slotAt = Number(localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY) || 0);
    const best = Math.max(
        Number.isFinite(premiumAt) ? premiumAt : 0,
        Number.isFinite(slotAt) ? slotAt : 0,
    );
    return best > 0 ? best : 0;
}

export function setPendingBankPremiumFlag(submittedAtMs: number = Date.now()): void {
    if (typeof window === 'undefined') return;
    const already = localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1';
    const existingAt = Number(localStorage.getItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY) || 0);
    localStorage.setItem(PENDING_BANK_PREMIUM_STORAGE_KEY, '1');
    if (!Number.isFinite(existingAt) || existingAt <= 0 || submittedAtMs > existingAt) {
        localStorage.setItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY, String(submittedAtMs));
    }
    if (!already) {
        window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
    }
}

export function setPendingBankSubAccountFlag(submittedAtMs: number = Date.now()): void {
    if (typeof window === 'undefined') return;
    const already = localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';
    const existingAt = Number(localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY) || 0);
    localStorage.setItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY, '1');
    if (!Number.isFinite(existingAt) || existingAt <= 0 || submittedAtMs > existingAt) {
        localStorage.setItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY, String(submittedAtMs));
    }
    if (!already) {
        window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
    }
}

export function clearPendingBankPremiumFlag(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

export function clearPendingBankSubAccountFlag(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

export function clearPendingBankTransferFlags(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}

/**
 * Admin undid reject/approve — put the slip back into "pending review" on the website.
 * Clears the rejected/approved result banner so it cannot stick after undo.
 */
export function restorePendingBankTransferAfterUndo(options?: {
    isSlot?: boolean;
    submittedAtMs?: number;
}): void {
    if (typeof window === 'undefined') return;

    const submittedAtMs =
        typeof options?.submittedAtMs === 'number' && options.submittedAtMs > 0
            ? options.submittedAtMs
            : Date.now();

    const hadResult = !!localStorage.getItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    const wantSlot = !!options?.isSlot;
    const hasCorrectPending = wantSlot
        ? localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1'
        : localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1';

    // Already restored — avoid re-dispatch loops from notification listeners.
    if (!hadResult && hasCorrectPending) return;

    localStorage.removeItem(BANK_TRANSFER_RESULT_STORAGE_KEY);
    try {
        sessionStorage.removeItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY);
        sessionStorage.removeItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY);
    } catch {
        /* ignore */
    }

    if (wantSlot) {
        localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);
        localStorage.removeItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY);
        localStorage.setItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY, '1');
        localStorage.setItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY, String(submittedAtMs));
    } else {
        localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
        localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_AT_STORAGE_KEY);
        localStorage.setItem(PENDING_BANK_PREMIUM_STORAGE_KEY, '1');
        localStorage.setItem(PENDING_BANK_PREMIUM_AT_STORAGE_KEY, String(submittedAtMs));
    }

    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));
}
