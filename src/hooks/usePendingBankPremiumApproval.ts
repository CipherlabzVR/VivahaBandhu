'use client';

import { useState, useEffect } from 'react';
import {
    PENDING_BANK_PREMIUM_STORAGE_KEY,
    PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY,
    PENDING_BANK_TRANSFER_CHANGED_EVENT,
    clearBankTransferUiState,
    hasPendingBankTransferFlag,
} from '../constants/premiumActivation';

/**
 * True when the user submitted a bank slip and we are waiting for admin approval.
 * Driven only by checkout localStorage flags — not by unrelated premium notifications —
 * so card activation / cancel never show "bank transfer under review".
 */
export function usePendingBankPremiumApproval(isSubscribed: boolean | undefined): boolean {
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const read = () => {
            const premiumPending = localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1';
            const slotPending = localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';

            // Already premium with a leftover premium-slip flag → not a bank-wait UI state.
            if (isSubscribed === true && premiumPending && !slotPending) {
                clearBankTransferUiState();
                setPending(false);
                return;
            }

            // Slot bank review can continue while the manager is already premium.
            if (slotPending) {
                setPending(true);
                return;
            }

            if (isSubscribed === true) {
                setPending(false);
                return;
            }
            setPending(hasPendingBankTransferFlag());
        };

        read();

        const onStorage = (e: StorageEvent) => {
            if (
                e.key === PENDING_BANK_PREMIUM_STORAGE_KEY ||
                e.key === PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY ||
                e.key === null
            )
                read();
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') read();
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener(PENDING_BANK_TRANSFER_CHANGED_EVENT, read);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(PENDING_BANK_TRANSFER_CHANGED_EVENT, read);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [isSubscribed]);

    return pending;
}
