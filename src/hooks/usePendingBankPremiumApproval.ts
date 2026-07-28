'use client';

import { useState, useEffect } from 'react';
import {
    PENDING_BANK_PREMIUM_STORAGE_KEY,
    PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY,
    PENDING_BANK_TRANSFER_CHANGED_EVENT,
    hasPendingBankTransferFlag,
    setPendingBankPremiumFlag,
    setPendingBankSubAccountFlag,
} from '../constants/premiumActivation';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';
import {
    isPendingBankTransferReceivedNotification,
    isSlotBankTransferReceivedNotification,
    notificationCreatedAtMs,
} from '../utils/matrimonialInterestNotifications';

function rehydratePendingFlagsFromNotifications(notifications: Record<string, unknown>[]): boolean {
    for (const n of notifications) {
        if (!isPendingBankTransferReceivedNotification(n)) continue;
        const at = notificationCreatedAtMs(n) || Date.now();
        if (isSlotBankTransferReceivedNotification(n)) {
            if (localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) !== '1') {
                setPendingBankSubAccountFlag(at);
            }
        } else if (localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) !== '1') {
            setPendingBankPremiumFlag(at);
        }
    }
    return hasPendingBankTransferFlag();
}

/**
 * True when the user submitted a bank slip for premium and we are waiting for admin approval.
 * Uses localStorage (set at checkout) and rehydrates from unread "Bank transfer received" notifications
 * so pending still shows after refresh / if the storage flag was cleared incorrectly.
 */
export function usePendingBankPremiumApproval(isSubscribed: boolean | undefined): boolean {
    const { interestNotifications } = useMatrimonialNotifications();
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const read = () => {
            if (isSubscribed === true) {
                setPending(false);
                return;
            }

            const received = interestNotifications.filter((n) =>
                isPendingBankTransferReceivedNotification(n as Record<string, unknown>)
            ) as Record<string, unknown>[];

            const fromStorage = rehydratePendingFlagsFromNotifications(received);
            const fromNotifications = received.length > 0;
            setPending(fromStorage || fromNotifications);
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
    }, [isSubscribed, interestNotifications]);

    return pending && isSubscribed !== true;
}
