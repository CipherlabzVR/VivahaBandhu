'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    BANK_TRANSFER_RESULT_STORAGE_KEY,
    PENDING_BANK_TRANSFER_CHANGED_EVENT,
    applyBankTransferDecision,
    applyBankTransferDecisionForce,
    clearBankTransferResultBanner,
    getBankTransferResultBanner,
    hasPendingBankTransferFlag,
    rememberAppliedBankTransferLifecycle,
    restorePendingBankTransferAfterUndo,
    shouldApplyBankTransferLifecycle,
    type BankTransferResultBanner,
} from '../constants/premiumActivation';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';
import { useAuth } from '../context/AuthContext';
import {
    isBankTransferApprovedNotification,
    isBankTransferRejectedNotification,
    notificationCreatedAtMs,
    resolveBankTransferPendingIsSlot,
    resolveLatestBankTransferLifecycleAction,
} from '../utils/matrimonialInterestNotifications';

function isDecisionNotification(n: Record<string, unknown>): boolean {
    return isBankTransferApprovedNotification(n) || isBankTransferRejectedNotification(n);
}

/**
 * Dismissible profile banner after admin approves/rejects a bank transfer.
 * Stays visible until the user closes it (× or “Submit new slip”).
 * Handles undo-reject / undo-approve by restoring the pending slip UI.
 */
export function useBankTransferResultBanner(): {
    result: BankTransferResultBanner | null;
    dismiss: () => void;
} {
    const { user } = useAuth();
    const { interestNotifications, markInterestNotificationRead } = useMatrimonialNotifications();
    const [result, setResult] = useState<BankTransferResultBanner | null>(null);

    const read = useCallback(() => {
        if (typeof window === 'undefined') return;

        const lifecycle = resolveLatestBankTransferLifecycleAction(
            interestNotifications as Array<Record<string, unknown>>,
        );

        if (lifecycle.action && lifecycle.notification) {
            const at = notificationCreatedAtMs(lifecycle.notification);
            const canApply = shouldApplyBankTransferLifecycle(
                lifecycle.action,
                lifecycle.notification,
                at,
            );

            if (lifecycle.action === 'restore_pending' && canApply) {
                const accountType = String(user?.accountType ?? '').toLowerCase();
                const isSlot =
                    resolveBankTransferPendingIsSlot(
                        lifecycle.notification,
                        interestNotifications as Array<Record<string, unknown>>,
                    )
                    || accountType === 'matchmaker';
                restorePendingBankTransferAfterUndo({
                    isSlot,
                    submittedAtMs: at || Date.now(),
                });
                rememberAppliedBankTransferLifecycle(
                    'restore_pending',
                    lifecycle.notification,
                    at,
                );
                setResult(null);
                return;
            }

            if (lifecycle.action === 'approved' && canApply) {
                if (hasPendingBankTransferFlag()) {
                    applyBankTransferDecision('approved');
                } else {
                    // Stale undo may have cleared pending before approve landed.
                    applyBankTransferDecisionForce('approved');
                }
                rememberAppliedBankTransferLifecycle('approved', lifecycle.notification, at);
                setResult('approved');
                return;
            }

            if (lifecycle.action === 'rejected' && canApply) {
                if (hasPendingBankTransferFlag()) {
                    applyBankTransferDecision('rejected');
                } else {
                    // Pending may already be gone (stale undo restore) — still show reject.
                    applyBankTransferDecisionForce('rejected');
                }
                rememberAppliedBankTransferLifecycle('rejected', lifecycle.notification, at);
                setResult('rejected');
                return;
            }
        }

        // Still waiting on a slip — no result banner.
        if (hasPendingBankTransferFlag()) {
            setResult(null);
            return;
        }

        // After decision: show stored result only (set exclusively by applyBankTransferDecision*).
        const stored = getBankTransferResultBanner();
        setResult(stored);
    }, [interestNotifications, user?.accountType]);

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
