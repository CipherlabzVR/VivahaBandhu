'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { matrimonialService } from '../../../services/matrimonialService';
import {
    CHECKOUT_PLAN_MATCHMAKER_CLIENT,
    CHECKOUT_PLAN_SUB_ACCOUNT,
} from '../../../constants/subscription';
import {
    MATCHMAKER_CLIENT_SLOT_PURCHASED_MESSAGE,
    PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE,
    SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE,
    clearBankTransferUiState,
} from '../../../constants/premiumActivation';
import { useMatrimonialNotifications } from '../../../context/MatrimonialNotificationsContext';
import { showToast } from '../../../utils/toast';
import {
    clearDirectPaySession,
    openDirectPayCheckout,
    readDirectPaySession,
} from '../../../utils/directPayIpg';

export default function DirectPayPaymentPage() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const { refreshInterestNotifications } = useMatrimonialNotifications();
    const startedRef = useRef(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Loading secure payment…');
    const [amount, setAmount] = useState('');
    const [returnTo, setReturnTo] = useState('/subscription/checkout');

    const closePayment = () => {
        clearDirectPaySession();
        router.replace(returnTo || '/subscription/checkout');
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const session = readDirectPaySession();
        if (!session) {
            router.replace('/subscription/checkout');
            return;
        }
        setAmount(session.amount);
        setReturnTo(session.returnTo || '/subscription/checkout');
        if (!user?.id || startedRef.current) return;
        startedRef.current = true;

        const finishSuccessfulPayment = async (widgetResult?: unknown) => {
            setError('');
            setStatus('Payment successful. Confirming…');
            const res = await confirmDirectPayWithRetry(
                Number(user.id),
                session.orderId,
                'SUCCESS',
            );
            const statusCode = res?.statusCode ?? res?.StatusCode;
            if (statusCode !== 200 && statusCode !== 1) {
                throw new Error(res?.message || 'Failed to activate subscription.');
            }
            applyPaidSuccess(session.plan, res);
        };

        const run = async () => {
            setStatus('Opening DirectPay…');
            try {
                const widgetResult = await openDirectPayCheckout({
                    signature: session.signature,
                    dataString: session.dataString,
                    stage: session.stage,
                    containerId: 'directpay_page_container',
                });
                await finishSuccessfulPayment(widgetResult);
            } catch (err) {
                // A failed or cancelled card must never fall through to activation.
                setError(err instanceof Error ? err.message : 'Payment failed.');
                setStatus('');
            }
        };

        void run();
    }, [user?.id, router]);

    const applyPaidSuccess = (
        subscriptionPlan: string,
        res: { result?: unknown; Result?: unknown },
    ) => {
        const isSlotPlan =
            subscriptionPlan === CHECKOUT_PLAN_SUB_ACCOUNT
            || subscriptionPlan === CHECKOUT_PLAN_MATCHMAKER_CLIENT;
        clearBankTransferUiState();
        clearDirectPaySession();

        if (isSlotPlan) {
            const r = (res?.result ?? res?.Result) as Record<string, unknown> | undefined;
            const nextPurchased = Number(
                r?.familySubAccountSlotsPurchased ?? r?.FamilySubAccountSlotsPurchased ?? (user?.familySubAccountSlotsPurchased ?? 0) + 1,
            );
            const nextConsumed = Number(
                r?.familySubAccountSlotsConsumed ?? r?.FamilySubAccountSlotsConsumed ?? user?.familySubAccountSlotsConsumed ?? 0,
            );
            updateUser({
                familySubAccountSlotsPurchased: nextPurchased,
                familySubAccountSlotsConsumed: nextConsumed,
                isSubscribed: true,
                matchmakerTier: user?.accountType === 'Matchmaker' ? 'PAYG' : undefined,
            });
            showToast(
                subscriptionPlan === CHECKOUT_PLAN_MATCHMAKER_CLIENT
                    ? MATCHMAKER_CLIENT_SLOT_PURCHASED_MESSAGE
                    : SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE,
                'success',
                5500,
            );
            void refreshInterestNotifications();
            setStatus('Payment successful. Redirecting to home…');
            window.setTimeout(() => router.replace('/'), 3000);
            return;
        }

        const rawUntil =
            (res as { result?: { subscribedUntil?: string; SubscribedUntil?: string } })?.result
                ?.subscribedUntil ??
            (res as { result?: { subscribedUntil?: string; SubscribedUntil?: string } })?.result
                ?.SubscribedUntil;
        let untilIso: string | undefined;
        if (rawUntil != null && String(rawUntil).trim() !== '') {
            const d = new Date(String(rawUntil));
            if (!Number.isNaN(d.getTime())) untilIso = d.toISOString();
        }
        updateUser({ isSubscribed: true, matchmakerTier: undefined, ...(untilIso ? { subscriptionExpiresAt: untilIso } : {}) });
        showToast(PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE, 'success', 5500);
        void refreshInterestNotifications();
        setStatus('Payment successful. Redirecting to home…');
        window.setTimeout(() => router.replace('/'), 3000);
    };

    return (
        <div className="min-h-screen bg-cream pt-24 px-4 pb-10">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                        <h1 className="text-2xl font-playfair font-bold text-text-dark">Card payment</h1>
                        {amount ? <p className="text-sm text-text-light mt-1">Amount: LKR {amount}</p> : null}
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.7rem 1.2rem' }}
                        onClick={closePayment}
                    >
                        Close
                    </button>
                </div>

                {status && !error ? (
                    <p className="text-sm text-text-light mb-3">{status}</p>
                ) : null}
                {error ? (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                        <p>{error}</p>
                        <button
                            type="button"
                            className="mt-3 underline font-semibold"
                            onClick={closePayment}
                        >
                            Back to checkout
                        </button>
                    </div>
                ) : null}

                <div className="rounded-2xl border border-cream-dark bg-white p-3 md:p-4 min-h-[70vh]">
                    <div id="directpay_page_container" className="w-full min-h-[70vh]" />
                </div>
            </div>
        </div>
    );
}

async function confirmDirectPayWithRetry(
    userId: number,
    orderId: string,
    clientStatus?: string,
) {
    let lastRes: any = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
        lastRes = await matrimonialService.confirmDirectPayPayment(userId, orderId, clientStatus);
        const statusCode = lastRes?.statusCode ?? lastRes?.StatusCode;
        const result = (lastRes?.result ?? lastRes?.Result) as Record<string, unknown> | undefined;
        const awaitingWebhook = result?.awaitingWebhook === true || result?.AwaitingWebhook === true;
        if ((statusCode === 200 || statusCode === 1) && !awaitingWebhook) {
            return lastRes;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
    }
    throw new Error(
        lastRes?.message
        || 'We could not confirm this payment with the bank yet. Nothing has been activated. '
        + 'If your card was charged, refresh this page in a minute or contact support.',
    );
}
