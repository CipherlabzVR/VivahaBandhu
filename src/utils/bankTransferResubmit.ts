import { isFamilyParentAccountType } from './matrimonialAccountTypes';

export type BankTransferPaymentPurpose = 'premium' | 'sub_account' | 'matchmaker';

export type SubscriptionPlansAudience = 'user' | 'matchmaker' | 'sub_account';

/** Infer rejected bank-transfer purpose from the notification body text. */
export function bankTransferRejectPurposeFromDescription(
    description?: string | null,
): BankTransferPaymentPurpose | null {
    if (!description?.trim()) return null;
    const d = description.toLowerCase();
    if (d.includes('sub-account')) return 'sub_account';
    if (d.includes('matchmaker')) return 'matchmaker';
    return 'premium';
}

/** Which public package audience to load for plan selection. */
export function resolveSubscriptionPlansAudience(
    accountType?: string | null,
    purpose?: BankTransferPaymentPurpose | null,
): SubscriptionPlansAudience {
    if (purpose === 'sub_account') return 'sub_account';
    if (purpose === 'matchmaker') return 'matchmaker';
    if (purpose === 'premium') return 'user';
    if (accountType === 'Matchmaker') return 'matchmaker';
    if (isFamilyParentAccountType(accountType)) return 'sub_account';
    return 'user';
}

export function subscriptionPlansPageTitle(audience: SubscriptionPlansAudience, resubmit: boolean): string {
    if (resubmit) {
        switch (audience) {
            case 'sub_account':
                return 'Choose a sub-account package';
            case 'matchmaker':
                return 'Choose a client-account package';
            default:
                return 'Choose a subscription plan';
        }
    }
    switch (audience) {
        case 'sub_account':
            return 'Sub-account packages';
        case 'matchmaker':
            return 'Client-account packages';
        default:
            return 'Choose subscription plan';
    }
}

export function subscriptionPlansPageIntro(audience: SubscriptionPlansAudience, resubmit: boolean): string {
    if (resubmit) {
        return 'Your bank transfer was not approved. Select the package below, then continue to payment to submit a new slip.';
    }
    switch (audience) {
        case 'sub_account':
            return 'Select a package. After payment you can create a managed profile with its own premium period.';
        case 'matchmaker':
            return 'Pay for one client account, then create that profile. Add as many accounts as you need — no fixed package limit.';
        default:
            return 'Compare Free and Premium — then continue to payment.';
    }
}
