/** Set when user submits a bank slip; cleared after we detect subscription is active. */
export const PENDING_BANK_PREMIUM_STORAGE_KEY = 'mymatch_pending_bank_premium';

/** Shown via GlobalToast after card payment succeeds or admin approves a pending bank transfer. */
export const PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE =
    'You have successfully activated premium membership. Browse profiles to find your partner!';

/** Session flag so we only show the bank-approval toast once per pending transfer (survives Strict Mode double mount). */
export const BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY = 'mymatch_bank_premium_toast_shown';
