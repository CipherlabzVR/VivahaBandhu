'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    BANK_TRANSFER_RESULT_STORAGE_KEY,
    PENDING_BANK_TRANSFER_CHANGED_EVENT,
    applyBankTransferDecision,
    clearBankTransferResultBanner,
    getBankTransferResultBanner,
    hasPendingBankTransferFlag,
    type BankTransferResultBanner,
} from '../constants/premiumActivation';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';
import {
    isBankTransferApprovedNotification,
    isBankTransferRejectedNotification,
} from '../utils/matrimonialInterestNotifications';

function isDecisionNotification(n: Record<string, unknown>): boolean {
    return isBankTransferApprovedNotification(n) || isBankTransferRejectedNotification(n);
}

/**
 * Dismissible profile banner after admin approves/rejects a bank transfer.
 * Stays visible until the user closes it (× or “Submit new slip”).
 * Only shown when the user had a pending bank slip (localStorage) — never for card
 * activation, cancel, or unrelated premium notifications.
 */
export function useBankTransferResultBanner(): {
    result: BankTransferResultBanner | null;
    dismiss: () => void;
} {
    const { interestNotifications, markInterestNotificationRead } = useMatrimonialNotifications();
    const [result, setResult] = useState<BankTransferResultBanner | null>(null);

    const read = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Apply live bank decisions only while a slip is actually pending.
        if (hasPendingBankTransferFlag()) {
            const approved = interestNotifications.some((n) =>
                isBankTransferApprovedNotification(n as Record<string, unknown>)
            );
            if (approved) {
                applyBankTransferDecision('approved');
                setResult('approved');
                return;
            }

            const rejected = interestNotifications.some((n) =>
                isBankTransferRejectedNotification(n as Record<string, unknown>)
            );
            if (rejected) {
                applyBankTransferDecision('rejected');
                setResult('rejected');
                return;
            }

            // Still waiting — no result banner yet.
            setResult(null);
            return;
        }

        // After decision: show stored result only (set exclusively by applyBankTransferDecision).
        const stored = getBankTransferResultBanner();
        setResult(stored);
    }, [interestNotifications]);

    useEffect(() => {
        read();

        const onChanged = () => read();
        const onStorage = (e: StorageEvent) => {
            if (
                e.key === BANK_TRANSFER_RESULT_STORAGE_KEY ||
                e.key === null
            ) {
                read();
            }
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') read();
        };

        window.addEventListener('storage', onStorage);
        window.addEventListener(PENDING_BANK_TRANSFER_CHANGED_EVENT, onChanged);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(PENDING_BANK_TRANSFER_CHANGED_EVENT, onChanged);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [read]);

    const dismiss = useCallback(() => {
        clearBankTransferResultBanner();
        setResult(null);
        for (const n of interestNotifications) {
            if (isDecisionNotification(n as Record<string, unknown>)) {
                void markInterestNotificationRead(n);
            }
        }
    }, [interestNotifications, markInterestNotificationRead]);

    return { result, dismiss };
}
