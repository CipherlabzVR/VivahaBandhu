'use client';



import { useEffect, useCallback } from 'react';

import { useAuth } from '../context/AuthContext';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';

import { getStoredToken } from '../utils/authStorage';

import { showToast } from '../utils/toast';

import {

    BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY,

    BANK_TRANSFER_REJECTED_MESSAGE,

    BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY,

    PENDING_BANK_PREMIUM_STORAGE_KEY,

    PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY,

    PENDING_BANK_TRANSFER_CHANGED_EVENT,

    PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE,

} from '../constants/premiumActivation';

import { isMatchmakerPaidTier } from '../constants/subscription';
import { isMatrimonialSubscriptionNotification } from '../utils/matrimonialInterestNotifications';



async function fetchMatrimonialSubscriptionSnapshot(

    userId: number,

    token: string

): Promise<{

    isSubscribed: boolean;

    matchmakerTier?: string;

    matchmakerMaxClientProfiles?: number;

    matchmakerClientProfileCount?: number;

    matchmakerCanAddClients?: boolean;

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

    const maxC =

        r.matchmakerPlanMaxClients ?? r.MatchmakerPlanMaxClients;

    const usedC =

        r.matchmakerManagedClientCount ?? r.MatchmakerManagedClientCount;

    const selectionPending =

        (r.matchmakerClientSelectionPending ?? r.MatchmakerClientSelectionPending) === true;

    const maxNum = maxC != null && maxC !== '' ? Number(maxC) : undefined;

    const usedNum = usedC != null && usedC !== '' ? Number(usedC) : undefined;



    let canAdd: boolean | undefined;

    if (typeof maxNum === 'number' && Number.isFinite(maxNum) && maxNum > 0 && typeof usedNum === 'number' && Number.isFinite(usedNum)) {

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

        ...(tier?.trim()

            ? { matchmakerTier: tier }

            : {}),

        ...(typeof maxNum === 'number' && Number.isFinite(maxNum) ? { matchmakerMaxClientProfiles: maxNum } : {}),

        ...(typeof usedNum === 'number' && Number.isFinite(usedNum) ? { matchmakerClientProfileCount: usedNum } : {}),

        ...(typeof canAdd === 'boolean' ? { matchmakerCanAddClients: canAdd } : {}),

        ...(selectionPending ? { matchmakerClientSelectionPending: true } : {}),

        ...(subscriptionExpiresAt ? { subscriptionExpiresAt } : {}),

    };

}



function hasPendingBankTransferFlag(): boolean {

    return (

        localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1' ||

        localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1'

    );

}



function clearPendingBankTransferFlags(): void {

    localStorage.removeItem(PENDING_BANK_PREMIUM_STORAGE_KEY);

    localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);

    window.dispatchEvent(new Event(PENDING_BANK_TRANSFER_CHANGED_EVENT));

}



function isBankTransferRejectedNotification(n: Record<string, unknown>): boolean {
    if (isMatrimonialSubscriptionNotification(n)) {
        const title = String(n.title ?? n.Title ?? '').toLowerCase();
        return title.includes('not approved') || title.includes('rejected');
    }
    return false;
}



async function fetchUnreadBankTransferNotifications(

    userId: number,

    token: string

): Promise<Record<string, unknown>[]> {

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

    const res = await fetch(

        `${apiBase}/Matrimonial/GetInterestNotifications?userId=${userId}&unreadOnly=true`,

        { headers: { Authorization: `Bearer ${token}` } }

    );

    if (!res.ok) return [];

    const body = await res.json();

    const all = body?.result ?? body?.Result ?? [];

    const list = Array.isArray(all) ? all : [];

    return list.filter((n) => isBankTransferRejectedNotification(n as Record<string, unknown>));

}



/**

 * After a bank transfer slip is submitted, we set PENDING_BANK_PREMIUM_STORAGE_KEY.

 * When an admin approves the transfer, subscription becomes active server-side —

 * poll on focus / interval until we see isSubscribed, then toast once and refresh auth user.

 */

export default function PremiumActivationListener() {

    const { user, updateUser } = useAuth();
    const { refreshInterestNotifications, interestNotifications } = useMatrimonialNotifications();



    const checkBankApproval = useCallback(async () => {

        if (typeof window === 'undefined') return;

        if (!hasPendingBankTransferFlag()) return;

        const token = getStoredToken();

        const uid = user?.id;

        if (!token || !uid) return;



        const wasPaidBeforePoll = user?.isSubscribed === true;



        try {

            const rejected = await fetchUnreadBankTransferNotifications(Number(uid), token);

            if (rejected.length > 0) {

                clearPendingBankTransferFlags();

                void refreshInterestNotifications();

                if (sessionStorage.getItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY) !== '1') {

                    sessionStorage.setItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY, '1');

                    showToast(BANK_TRANSFER_REJECTED_MESSAGE, 'error', 6500);

                }

                return;

            }



            const snap = await fetchMatrimonialSubscriptionSnapshot(Number(uid), token);

            if (!snap?.isSubscribed) return;



            clearPendingBankTransferFlags();



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



            void refreshInterestNotifications();

            if (

                !wasPaidBeforePoll &&

                sessionStorage.getItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY) !== '1'

            ) {

                sessionStorage.setItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY, '1');

                showToast(PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE, 'success', 5500);

            }

        } catch {

            /* ignore transient network errors */

        }

    }, [

        user?.id,

        user?.isSubscribed,

        user?.matchmakerTier,

        updateUser,

        refreshInterestNotifications,

    ]);



    useEffect(() => {

        void checkBankApproval();

    }, [checkBankApproval]);



    useEffect(() => {

        if (typeof window === 'undefined') return;

        if (!hasPendingBankTransferFlag()) return;

        const rejected = interestNotifications.filter((n) =>

            isBankTransferRejectedNotification(n as Record<string, unknown>)

        );

        if (rejected.length === 0) return;



        clearPendingBankTransferFlags();

        if (sessionStorage.getItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY) !== '1') {

            sessionStorage.setItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY, '1');

            showToast(BANK_TRANSFER_REJECTED_MESSAGE, 'error', 6500);

        }

    }, [interestNotifications]);



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



    useEffect(() => {

        if (typeof window === 'undefined') return;

        if (!hasPendingBankTransferFlag()) return;



        const id = window.setInterval(() => void checkBankApproval(), 45_000);

        return () => window.clearInterval(id);

    }, [checkBankApproval]);



    return null;

}

