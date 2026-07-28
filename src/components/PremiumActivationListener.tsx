'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';
import { getStoredToken } from '../utils/authStorage';
import { showToast } from '../utils/toast';
import {
    BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY,
    BANK_TRANSFER_REJECTED_MESSAGE,
    BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY,
    PENDING_BANK_PREMIUM_STORAGE_KEY,
    PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE,
    applyBankTransferDecision,
    getPendingBankTransferSubmittedAt,
    hasPendingBankTransferFlag,
    setPendingBankPremiumFlag,
    setPendingBankSubAccountFlag,
} from '../constants/premiumActivation';
import { isMatchmakerPaidTier } from '../constants/subscription';
import {
    isBankTransferApprovedNotification,
    isBankTransferRejectedNotification,
    isPendingBankTransferReceivedNotification,
    isSlotBankTransferReceivedNotification,
    notificationCreatedAtMs,
} from '../utils/matrimonialInterestNotifications';

async function fetchMatrimonialSubscriptionSnapshot(
    userId: number,
    token: string
): Promise<{
    isSubscribed: boolean;
    matchmakerTier?: string;
    matchmakerMaxClientProfiles?: number;
    matchmakerClientProfileCount?: number;
    matchmakerCanAddClients?: boolean;
    matchmakerClientSelectionPending?: boolean;
    subscriptionExpiresAt?: string;
} | null> {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
    const res = await fetch(
        `${apiBase}/Matrimonial/GetProfile?userId=${userId}&requesterUserId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const r = body?.result;
    if (!r) return null;

    const subscribed = !!(r.isSubscribed ?? r.IsSubscribed);
    const tier =
        typeof (r.viewerMatchmakerTier ?? r.ViewerMatchmakerTier) === 'string'
            ? String(r.viewerMatchmakerTier ?? r.ViewerMatchmakerTier)
            : undefined;
    const maxC = r.matchmakerPlanMaxClients ?? r.MatchmakerPlanMaxClients;
    const usedC = r.matchmakerManagedClientCount ?? r.MatchmakerManagedClientCount;
    const selectionPending =
        (r.matchmakerClientSelectionPending ?? r.MatchmakerClientSelectionPending) === true;
    const maxNum = maxC != null && maxC !== '' ? Number(maxC) : undefined;
    const usedNum = usedC != null && usedC !== '' ? Number(usedC) : undefined;

    let canAdd: boolean | undefined;
    if (
        typeof maxNum === 'number' &&
        Number.isFinite(maxNum) &&
        maxNum > 0 &&
        typeof usedNum === 'number' &&
        Number.isFinite(usedNum)
    ) {
        canAdd = !selectionPending && isMatchmakerPaidTier(tier) && usedNum < maxNum;
    }

    const subUntil = r.subscriptionUntilUtc ?? r.SubscriptionUntilUtc;
    let subscriptionExpiresAt: string | undefined;
    if (subUntil != null && String(subUntil).trim() !== '') {
        const exp = new Date(String(subUntil));
        if (!Number.isNaN(exp.getTime())) {
            subscriptionExpiresAt = exp.toISOString();
        }
    }

    return {
        isSubscribed: subscribed,
        ...(tier?.trim() ? { matchmakerTier: tier } : {}),
        ...(typeof maxNum === 'number' && Number.isFinite(maxNum) ? { matchmakerMaxClientProfiles: maxNum } : {}),
        ...(typeof usedNum === 'number' && Number.isFinite(usedNum) ? { matchmakerClientProfileCount: usedNum } : {}),
        ...(typeof canAdd === 'boolean' ? { matchmakerCanAddClients: canAdd } : {}),
        ...(selectionPending ? { matchmakerClientSelectionPending: true } : {}),
        ...(subscriptionExpiresAt ? { subscriptionExpiresAt } : {}),
    };
}

function rehydratePendingFlagsFromNotifications(notifications: Record<string, unknown>[]): void {
    for (const n of notifications) {
        if (!isPendingBankTransferReceivedNotification(n)) continue;
        const at = notificationCreatedAtMs(n) || Date.now();
        if (isSlotBankTransferReceivedNotification(n)) {
            setPendingBankSubAccountFlag(at);
        } else {
            setPendingBankPremiumFlag(at);
        }
    }
}

function shouldClearPendingForRejections(rejected: Record<string, unknown>[]): boolean {
    if (rejected.length === 0) return false;
    if (!hasPendingBankTransferFlag()) {
        // Still show rejected banner from a live reject even if local pending flag was lost.
        return true;
    }
    const pendingAt = getPendingBankTransferSubmittedAt();
    if (pendingAt <= 0) return true;
    const newestReject = Math.max(...rejected.map((n) => notificationCreatedAtMs(n)));
    return newestReject > pendingAt;
}

/**
 * After a bank transfer slip is submitted, we set PENDING_BANK_PREMIUM_STORAGE_KEY.
 * Admin approve/reject is pushed over SignalR → interestNotifications; we apply the
 * profile banner + auth subscription state immediately (with a short poll fallback).
 */
export default function PremiumActivationListener() {
    const { user, updateUser } = useAuth();
    const { refreshInterestNotifications, interestNotifications } = useMatrimonialNotifications();
    const handledDecisionIdsRef = useRef<Set<string>>(new Set());

    const syncSubscriptionFromServer = useCallback(async () => {
        const token = getStoredToken();
        const uid = user?.id;
        if (!token || !uid) return null;
        const snap = await fetchMatrimonialSubscriptionSnapshot(Number(uid), token);
        if (!snap) return null;
        updateUser({
            isSubscribed: snap.isSubscribed,
            ...(snap.matchmakerTier ? { matchmakerTier: snap.matchmakerTier } : {}),
            ...(snap.matchmakerMaxClientProfiles !== undefined
                ? { matchmakerMaxClientProfiles: snap.matchmakerMaxClientProfiles }
                : {}),
            ...(snap.matchmakerClientProfileCount !== undefined
                ? { matchmakerClientProfileCount: snap.matchmakerClientProfileCount }
                : {}),
            ...(snap.matchmakerCanAddClients !== undefined
                ? { matchmakerCanAddClients: snap.matchmakerCanAddClients }
                : {}),
            ...(snap.subscriptionExpiresAt ? { subscriptionExpiresAt: snap.subscriptionExpiresAt } : {}),
        });
        return snap;
    }, [user?.id, updateUser]);

    const applyApprovedDecision = useCallback(
        async (fromPendingPremium: boolean) => {
            applyBankTransferDecision('approved');
            void refreshInterestNotifications();
            const snap = await syncSubscriptionFromServer();
            if (
                fromPendingPremium &&
                snap?.isSubscribed &&
                sessionStorage.getItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY) !== '1'
            ) {
                sessionStorage.setItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY, '1');
                showToast(PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE, 'success', 5500);
            }
        },
        [refreshInterestNotifications, syncSubscriptionFromServer]
    );

    const applyRejectedDecision = useCallback(() => {
        applyBankTransferDecision('rejected');
        void refreshInterestNotifications();
        if (sessionStorage.getItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY) !== '1') {
            sessionStorage.setItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY, '1');
            showToast(BANK_TRANSFER_REJECTED_MESSAGE, 'error', 6500);
        }
    }, [refreshInterestNotifications]);

    /** Real-time path: react as soon as SignalR appends approve/reject notifications. */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Free Matchmaker must not treat leftover Self "Premium activated" notices as a new approval.
        const accountType = String(user?.accountType ?? '').toLowerCase();
        const isFreeMatchmaker =
            accountType === 'matchmaker' &&
            user?.isSubscribed !== true &&
            String(user?.matchmakerTier ?? 'FREE').toUpperCase() === 'FREE';
        if (isFreeMatchmaker) return;

        const approved = interestNotifications.filter((n) =>
            isBankTransferApprovedNotification(n as Record<string, unknown>)
        );
        if (approved.length > 0) {
            const key = String(approved[0].id ?? approved[0].Id ?? 'approved');
            if (!handledDecisionIdsRef.current.has(`a:${key}`)) {
                handledDecisionIdsRef.current.add(`a:${key}`);
                const fromPendingPremium =
                    localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1' ||
                    user?.isSubscribed !== true;
                void applyApprovedDecision(fromPendingPremium);
            }
            return;
        }

        const rejected = interestNotifications.filter((n) =>
            isBankTransferRejectedNotification(n as Record<string, unknown>)
        ) as Record<string, unknown>[];
        if (rejected.length > 0 && shouldClearPendingForRejections(rejected)) {
            const key = String(rejected[0].id ?? rejected[0].Id ?? 'rejected');
            if (!handledDecisionIdsRef.current.has(`r:${key}`)) {
                handledDecisionIdsRef.current.add(`r:${key}`);
                applyRejectedDecision();
            }
            return;
        }

        const pendingReceived = interestNotifications.filter((n) =>
            isPendingBankTransferReceivedNotification(n as Record<string, unknown>)
        );
        if (pendingReceived.length > 0 && user?.isSubscribed !== true) {
            rehydratePendingFlagsFromNotifications(pendingReceived as Record<string, unknown>[]);
        }
    }, [
        interestNotifications,
        user?.accountType,
        user?.isSubscribed,
        user?.matchmakerTier,
        applyApprovedDecision,
        applyRejectedDecision,
    ]);

    const checkBankApproval = useCallback(async () => {
        if (typeof window === 'undefined') return;

        const token = getStoredToken();
        const uid = user?.id;
        if (!token || !uid) return;

        const wasPaidBeforePoll = user?.isSubscribed === true;

        try {
            // Prefer live list already in context; also poll API as fallback.
            await refreshInterestNotifications();

            if (!hasPendingBankTransferFlag()) return;

            const snap = await fetchMatrimonialSubscriptionSnapshot(Number(uid), token);
            if (!snap?.isSubscribed) return;

            const hadPremiumPending = localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1';
            applyBankTransferDecision('approved');
            updateUser({
                isSubscribed: snap.isSubscribed,
                ...(snap.matchmakerTier ? { matchmakerTier: snap.matchmakerTier } : {}),
                ...(snap.matchmakerMaxClientProfiles !== undefined
                    ? { matchmakerMaxClientProfiles: snap.matchmakerMaxClientProfiles }
                    : {}),
                ...(snap.matchmakerClientProfileCount !== undefined
                    ? { matchmakerClientProfileCount: snap.matchmakerClientProfileCount }
                    : {}),
                ...(snap.matchmakerCanAddClients !== undefined
                    ? { matchmakerCanAddClients: snap.matchmakerCanAddClients }
                    : {}),
                ...(snap.subscriptionExpiresAt ? { subscriptionExpiresAt: snap.subscriptionExpiresAt } : {}),
            });

            if (
                hadPremiumPending &&
                !wasPaidBeforePoll &&
                sessionStorage.getItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY) !== '1'
            ) {
                sessionStorage.setItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY, '1');
                showToast(PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE, 'success', 5500);
            }
        } catch {
            /* ignore transient network errors */
        }
    }, [user?.id, user?.isSubscribed, updateUser, refreshInterestNotifications]);

    useEffect(() => {
        void checkBankApproval();
    }, [checkBankApproval]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') void checkBankApproval();
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [checkBankApproval]);

    // Fast poll while a slip is pending so approve/reject still lands without relying only on SignalR.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const tick = () => {
            if (hasPendingBankTransferFlag()) void checkBankApproval();
        };
        const id = window.setInterval(tick, 5_000);
        return () => window.clearInterval(id);
    }, [checkBankApproval]);

    return null;
}
