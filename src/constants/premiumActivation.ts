/** Set when user submits a bank slip; cleared after we detect subscription is active. */
export const PENDING_BANK_PREMIUM_STORAGE_KEY = 'mymatch_pending_bank_premium';

/** Set when user submits a bank slip for a sub-account slot. */
export const PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY = 'mymatch_pending_bank_sub_account';

/** Shown via GlobalToast after card payment succeeds or admin approves a pending bank transfer. */
export const PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE =
    'You have successfully activated premium membership. Browse profiles to find your partner!';

export const MATCHMAKER_PLAN_ACTIVATED_MESSAGE =
    'Your matchmaker plan is now active. Add client profiles and use premium matchmaker features.';

/** Shown via GlobalToast right after the user uploads a bank transfer slip. */
export const BANK_TRANSFER_SUBMITTED_MESSAGE =
    'Bank transfer slip submitted successfully. Premium will activate after our team verifies your payment.';

export const BANK_TRANSFER_SUB_ACCOUNT_SUBMITTED_MESSAGE =
    'Bank transfer slip submitted. Your sub-account slot will be added after admin approval.';

export const SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE =
    'Sub-account slot purchased. Create a managed profile from your profile page — premium activates on that profile with its own expiry date.';

/** Session flag so we only show the bank-approval toast once per pending transfer (survives Strict Mode double mount). */
export const BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY = 'mymatch_bank_premium_toast_shown';
