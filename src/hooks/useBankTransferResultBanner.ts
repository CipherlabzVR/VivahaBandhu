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
 * Updates immediately from SignalR-driven notification list + localStorage.
 */
export function useBankTransferResultBanner(): {
    result: BankTransferResultBanner | null;
    dismiss: () => void;
} {
    const { interestNotifications, markInterestNotificationRead } = useMatrimonialNotifications();
    const [result, setResult] = useState<BankTransferResultBanner | null>(null);

    const read = useCallback(() => {
        if (typeof window === 'undefined') return;

        // Live / unread decision notifications win over a stale pending flag.
        const approved = interestNotifications.some((n) =>
            isBankTransferApprovedNotification(n as Record<string, unknown>)
        );
        if (approved) {
            if (getBankTransferResultBanner() !== 'approved' || hasPendingBankTransferFlag()) {
                applyBankTransferDecision('approved');
            }
            setResult('approved');
            return;
        }

        const rejected = interestNotifications.some((n) =>
            isBankTransferRejectedNotification(n as Record<string, unknown>)
        );
        if (rejected) {
            if (getBankTransferResultBanner() !== 'rejected' || hasPendingBankTransferFlag()) {
                applyBankTransferDecision('rejected');
            }
            setResult('rejected');
            return;
        }

        const stored = getBankTransferResultBanner();
        if (stored) {
            setResult(stored);
            return;
        }

        if (hasPendingBankTransferFlag()) {
            setResult(null);
            return;
        }

        setResult(null);
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
