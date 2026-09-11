'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { matrimonialService } from '../../../services/matrimonialService';
import {
    PREMIUM_SUBSCRIPTION_LKR,
    MATCHMAKER_CLIENT_SLOT_LKR,
    CHECKOUT_PLAN_PREMIUM_SELF,
    CHECKOUT_PLAN_MATCHMAKER_CLIENT,
    CHECKOUT_PLAN_SUB_ACCOUNT,
} from '../../../constants/subscription';
import {
    BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY,
    BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY,
    BANK_TRANSFER_SUB_ACCOUNT_SUBMITTED_MESSAGE,
    BANK_TRANSFER_SUBMITTED_MESSAGE,
    MATCHMAKER_CLIENT_SLOT_PURCHASED_MESSAGE,
    PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE,
    SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE,
    clearBankTransferResultBanner,
    clearBankTransferUiState,
    setPendingBankPremiumFlag,
    setPendingBankSubAccountFlag,
} from '../../../constants/premiumActivation';
import { useMatrimonialNotifications } from '../../../context/MatrimonialNotificationsContext';
import { showToast } from '../../../utils/toast';
import { readDirectPayReturnFromUrl, saveDirectPaySession, stashDirectPayFailureMessage, toUserFacingDirectPayMessage } from '../../../utils/directPayIpg';

type PaymentMethod = 'card' | 'bank';

function isMatchmakerClientCheckoutPlan(plan: string): boolean {
    const p = plan.trim().toLowerCase();
    return (
        p === CHECKOUT_PLAN_MATCHMAKER_CLIENT
        || p === 'matchmaker'
        || p === 'matchmaker_gold'
        || p === 'matchmaker_diamond'
    );
}

function planLabel(plan: string, isMatchmaker: boolean): string {
    if (isMatchmakerClientCheckoutPlan(plan)) return 'Matchmaker client account';
    switch (plan) {
        case CHECKOUT_PLAN_SUB_ACCOUNT:
            return 'Sub-account slot';
        case CHECKOUT_PLAN_PREMIUM_SELF:
        default:
            return isMatchmaker ? 'Matchmaker checkout' : 'Premium (Self)';
    }
}

export default function SubscriptionCheckoutPage() {
    const router = useRouter();
    const { user, updateUser } = useAuth();
    const { refreshInterestNotifications } = useMatrimonialNotifications();
    const [checkoutPlan, setCheckoutPlan] = useState<string>(CHECKOUT_PLAN_PREMIUM_SELF);
    const [amount, setAmount] = useState(String(PREMIUM_SUBSCRIPTION_LKR));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

    const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
    const [bankSlipPreview, setBankSlipPreview] = useState<string | null>(null);
    const [bankRemarks, setBankRemarks] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isMatchmakerAccount = user?.accountType === 'Matchmaker';
    const isSubAccountCheckout = checkoutPlan === CHECKOUT_PLAN_SUB_ACCOUNT;
    const isMatchmakerClientCheckout = isMatchmakerClientCheckoutPlan(checkoutPlan);
    const isSlotCheckout = isSubAccountCheckout || isMatchmakerClientCheckout;
    const unusedSlotCount = Math.max(
        0,
        Math.max(0, user?.familySubAccountSlotsPurchased ?? 0)
            - Math.max(0, user?.familySubAccountSlotsConsumed ?? 0),
    );
    const mustCreateProfileBeforeBuySlot = isSlotCheckout && unusedSlotCount > 0;
    const [isResubmitCheckout, setIsResubmitCheckout] = useState(false);

    const unusedSlotBlockMessage = isMatchmakerAccount
        ? `You have ${unusedSlotCount} unused client-account slot(s). Create a client profile before buying another.`
        : `You have ${unusedSlotCount} unused sub-account slot(s). Create a managed profile before buying another.`;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const queryAmount = url.searchParams.get('amount');
        const queryPlan =
            url.searchParams.get('plan') ||
            url.searchParams.get('Plan') ||
            CHECKOUT_PLAN_PREMIUM_SELF;
        const isResubmit = url.searchParams.get('resubmit') === '1';

        const normalizedPlan = queryPlan.trim().toLowerCase();
        setCheckoutPlan(normalizedPlan);
        if (isResubmit) {
            setPaymentMethod('bank');
            setIsResubmitCheckout(true);
        }

        if (queryAmount && queryAmount.trim() !== '') {
            setAmount(queryAmount);
            return;
        }

        if (isMatchmakerClientCheckoutPlan(normalizedPlan)) {
            matrimonialService.getMatchmakerPackages().then((pkgs) => {
                const primary = pkgs.find((p) => Number(p.price ?? p.Price ?? 0) > 0) ?? pkgs[0];
                const price = Number(primary?.price ?? primary?.Price ?? 0);
                if (price > 0) {
                    setAmount(String(price));
                    return;
                }
                const fromUser = user?.familySubAccountAdditionalAmountLkr;
                if (fromUser != null && fromUser > 0) {
                    setAmount(String(fromUser));
                    return;
                }
                setAmount(String(MATCHMAKER_CLIENT_SLOT_LKR));
            });
            return;
        }
        if (normalizedPlan === CHECKOUT_PLAN_SUB_ACCOUNT) {
            matrimonialService.getActiveSubAccountPackage().then((pkg) => {
                if (pkg?.price != null) {
                    setAmount(String(pkg.price));
                    return;
                }
                const fromUser = user?.familySubAccountAdditionalAmountLkr;
                if (fromUser != null && fromUser > 0) {
                    setAmount(String(fromUser));
                    return;
                }
                setAmount(String(PREMIUM_SUBSCRIPTION_LKR));
            });
            return;
        }
        matrimonialService.getActiveUserPremiumPackage().then((pkg) => {
            if (pkg?.price != null && pkg.price > 0) {
                setAmount(String(pkg.price));
                return;
            }
            setAmount(String(PREMIUM_SUBSCRIPTION_LKR));
        });
    }, [user?.familySubAccountAdditionalAmountLkr]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const gatewayReturn = readDirectPayReturnFromUrl(url.search);
        const orderId = gatewayReturn.orderId || url.searchParams.get('orderId') || url.searchParams.get('order_id');
        if (!gatewayReturn.isReturn || !orderId) return;

        if (gatewayReturn.isFailure) {
            const message = gatewayReturn.message || 'Payment failed. Please try again.';
            stashDirectPayFailureMessage(message);
            setError(`${message} Redirecting to the home page…`);
            showToast(message, 'error', 6000);
            window.setTimeout(() => router.replace('/'), 4000);
            return;
        }

        if (!user?.id) return;

        let cancelled = false;
        const finishReturn = async () => {
            setError('');
            setSuccess('');
            setIsSubmitting(true);
            try {
                const urlPlan =
                    url.searchParams.get('plan')
                    || url.searchParams.get('Plan')
                    || checkoutPlan;
                const subscriptionPlan =
                    urlPlan.trim().length > 0 ? urlPlan.trim().toLowerCase() : CHECKOUT_PLAN_PREMIUM_SELF;
                const normalizedPlan = isMatchmakerClientCheckoutPlan(subscriptionPlan)
                    ? CHECKOUT_PLAN_MATCHMAKER_CLIENT
                    : subscriptionPlan;
                const res = await confirmDirectPayWithRetry(Number(user.id), orderId, 'SUCCESS');
                if (cancelled) return;
                const statusCode = res?.statusCode ?? res?.StatusCode;
                if (statusCode === 200 || statusCode === 1) {
                    applyPaidCheckoutSuccess(normalizedPlan, res);
                } else {
                    const message = toUserFacingDirectPayMessage(res?.message || 'Failed to confirm card payment.');
                    stashDirectPayFailureMessage(message);
                    setError(message);
                    showToast(message, 'error', 6000);
                    window.setTimeout(() => router.replace('/'), 4000);
                }
            } catch (err) {
                if (!cancelled) {
                    const message = toUserFacingDirectPayMessage(err);
                    stashDirectPayFailureMessage(message);
                    setError(message);
                    showToast(message, 'error', 6000);
                    window.setTimeout(() => router.replace('/'), 4000);
                }
            } finally {
                if (!cancelled) setIsSubmitting(false);
            }
        };

        void finishReturn();
        return () => {
            cancelled = true;
        };
        // Return-from-gateway confirmation should run once per landing, not on every plan/user patch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size must be less than 5MB.');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only JPG, PNG, WebP, or PDF files are allowed.');
            return;
        }

        setError('');
        setBankSlipFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setBankSlipPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setBankSlipPreview(null);
        }
    };

    const removeFile = () => {
        setBankSlipFile(null);
        setBankSlipPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const applySuccessUserPatch = (subscriptionExpiresAt?: string) => {
        const expPatch = subscriptionExpiresAt ? { subscriptionExpiresAt } : {};
        updateUser({ isSubscribed: true, matchmakerTier: undefined, ...expPatch });
    };

    const applySubAccountSlotPatch = (r?: Record<string, unknown>, purchased?: number) => {
        const nextPurchased =
            purchased ??
            (r
                ? Number(r.familySubAccountSlotsPurchased ?? r.FamilySubAccountSlotsPurchased ?? (user?.familySubAccountSlotsPurchased ?? 0) + 1)
                : (user?.familySubAccountSlotsPurchased ?? 0) + 1);
        const nextConsumed = r
            ? Number(r.familySubAccountSlotsConsumed ?? r.FamilySubAccountSlotsConsumed ?? user?.familySubAccountSlotsConsumed ?? 0)
            : (user?.familySubAccountSlotsConsumed ?? 0);
        const subscribed = r?.isSubscribed ?? r?.IsSubscribed;
        const subLifetime = r?.subscriptionIsLifetime ?? r?.SubscriptionIsLifetime;
        const subUntil = r?.subscriptionUntilUtc ?? r?.SubscriptionUntilUtc;
        const canAdd = Math.max(0, nextPurchased - nextConsumed) > 0;
        const patch: Record<string, unknown> = {
            familySubAccountSlotsPurchased: nextPurchased,
            familySubAccountSlotsConsumed: nextConsumed,
            isSubscribed: subscribed === true || subscribed === 'true' || subscribed === undefined,
            matchmakerTier: isMatchmakerAccount ? 'PAYG' : undefined,
            matchmakerMaxClientProfiles: 0,
            matchmakerCanAddClients: isMatchmakerAccount ? canAdd : undefined,
            matchmakerClientSelectionPending: false,
        };
        if (subLifetime === true || subLifetime === 'true') {
            patch.subscriptionIsLifetime = true;
            patch.subscriptionExpiresAt = undefined;
        } else if (subUntil != null && String(subUntil).trim() !== '') {
            const d = new Date(String(subUntil));
            if (!Number.isNaN(d.getTime())) {
                patch.subscriptionExpiresAt = d.toISOString();
                patch.subscriptionIsLifetime = false;
            }
        }
        updateUser(patch);
    };

    const resolveCheckoutPlan = (): string | null => {
        if (!user?.id) {
            setError('Please log in first.');
            return null;
        }

        let subscriptionPlan =
            checkoutPlan.trim().length > 0 ? checkoutPlan.trim().toLowerCase() : CHECKOUT_PLAN_PREMIUM_SELF;

        if (isMatchmakerClientCheckoutPlan(subscriptionPlan)) {
            subscriptionPlan = CHECKOUT_PLAN_MATCHMAKER_CLIENT;
            if (user.accountType !== 'Matchmaker') {
                setError('Client-account checkout is only for Matchmaker accounts.');
                return null;
            }
            if (unusedSlotCount > 0) {
                setError(unusedSlotBlockMessage);
                return null;
            }
        } else if (subscriptionPlan === CHECKOUT_PLAN_SUB_ACCOUNT) {
            if (user.accountType !== 'Parents' && user.accountType !== 'Relation' && user.accountType !== 'Father' && user.accountType !== 'Mother') {
                setError('Sub-account checkout is only for Parents and Relation accounts.');
                return null;
            }
            if (unusedSlotCount > 0) {
                setError(unusedSlotBlockMessage);
                return null;
            }
        } else if (user.isSubscribed) {
            setError('You already have an active premium plan. Switch to the free plan first to change packages.');
            return null;
        }

        if (
            subscriptionPlan === CHECKOUT_PLAN_PREMIUM_SELF &&
            user.accountType === 'Matchmaker'
        ) {
            setError('Matchmakers pay per client account. Choose a client-account package from your profile.');
            return null;
        }

        return subscriptionPlan;
    };

    const applyPaidCheckoutSuccess = (
        subscriptionPlan: string,
        res: { statusCode?: number; StatusCode?: number; message?: string; result?: unknown; Result?: unknown },
    ) => {
        const isSlotPlan =
            subscriptionPlan === CHECKOUT_PLAN_SUB_ACCOUNT
            || subscriptionPlan === CHECKOUT_PLAN_MATCHMAKER_CLIENT;
        clearBankTransferUiState();
        if (isSlotPlan) {
            const r = (res?.result ?? res?.Result) as Record<string, unknown> | undefined;
            applySubAccountSlotPatch(r);
            setSuccess(
                subscriptionPlan === CHECKOUT_PLAN_MATCHMAKER_CLIENT
                    ? 'Payment successful. You can create a client profile from your profile page.'
                    : 'Payment successful. Premium is now active on your account. You can create a managed profile from your profile page.',
            );
            showToast(
                subscriptionPlan === CHECKOUT_PLAN_MATCHMAKER_CLIENT
                    ? MATCHMAKER_CLIENT_SLOT_PURCHASED_MESSAGE
                    : SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE,
                'success',
                5500,
            );
            void refreshInterestNotifications();
            window.setTimeout(() => router.replace('/profile'), 800);
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
        applySuccessUserPatch(untilIso);
        setSuccess('Payment successful. Premium membership is now active.');
        showToast(PREMIUM_MEMBERSHIP_ACTIVATED_MESSAGE, 'success', 5500);
        void refreshInterestNotifications();
        window.setTimeout(() => {
            router.replace('/');
        }, 800);
    };

    const confirmDirectPayWithRetry = async (
        userId: number,
        orderId: string,
        clientStatus?: string,
    ) => {
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
    };

    const handleCardPayment = async () => {
        const subscriptionPlan = resolveCheckoutPlan();
        if (!subscriptionPlan || !user?.id) {
            return;
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const checkoutPath = `/subscription/checkout?plan=${encodeURIComponent(subscriptionPlan)}&amount=${encodeURIComponent(amount)}`;
            const returnUrl = `${window.location.origin}/subscription/pay`;
            const initiated = await matrimonialService.initiateDirectPayCheckout(
                Number(user.id),
                subscriptionPlan,
                parseFloat(amount),
                returnUrl,
            );
            const payload = (initiated?.result ?? initiated?.Result) as Record<string, unknown> | undefined;
            const signature = String(payload?.signature ?? payload?.Signature ?? '');
            const dataString = String(payload?.dataString ?? payload?.DataString ?? '');
            const stageRaw = String(payload?.stage ?? payload?.Stage ?? 'DEV').toUpperCase();
            const orderId = String(payload?.orderId ?? payload?.OrderId ?? '');
            if (!signature || !dataString || !orderId) {
                throw new Error(initiated?.message || 'DirectPay did not return a checkout session.');
            }

            saveDirectPaySession({
                signature,
                dataString,
                stage: stageRaw === 'PROD' ? 'PROD' : 'DEV',
                orderId,
                plan: subscriptionPlan,
                amount,
                returnTo: checkoutPath,
            });
            router.push('/subscription/pay');
        } catch (err) {
            setError(toUserFacingDirectPayMessage(err));
            setIsSubmitting(false);
        }
    };

    const handleBankTransfer = async () => {
        if (!user?.id) {
            setError('Please log in first.');
            return;
        }

        if (!bankSlipFile) {
            setError('Please upload your bank transfer slip.');
            return;
        }

        if (mustCreateProfileBeforeBuySlot) {
            setError(unusedSlotBlockMessage);
            return;
        }

        if (user.isSubscribed && !isSlotCheckout) {
            setError('You already have an active premium plan. Switch to the free plan first to change packages.');
            return;
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        const parsedAmount = parseFloat(amount);

        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const base64 = ev.target?.result as string;
                    const res = await matrimonialService.submitBankTransfer(
                        Number(user.id),
                        parsedAmount,
                        base64,
                        bankRemarks,
                        isSubAccountCheckout
                            ? 'sub_account'
                            : isMatchmakerClientCheckout || isMatchmakerAccount
                                ? 'matchmaker'
                                : 'premium',
                    );
                    const statusCode = res?.statusCode ?? res?.StatusCode;
                    if (statusCode === 200 || statusCode === 1) {
                        if (typeof window !== 'undefined') {
                            clearBankTransferResultBanner();
                            if (isSlotCheckout) {
                                setPendingBankSubAccountFlag();
                            } else {
                                setPendingBankPremiumFlag();
                            }
                            sessionStorage.removeItem(BANK_PREMIUM_TOAST_SHOWN_SESSION_KEY);
                            sessionStorage.removeItem(BANK_TRANSFER_REJECTED_TOAST_SHOWN_SESSION_KEY);
                        }
                        setSuccess(
                            isMatchmakerClientCheckout
                                ? 'Slip received! Our team will review your payment and add your client-account slot shortly. Redirecting to profile…'
                                : isSubAccountCheckout
                                    ? 'Slip received! Our team will review your payment and add your sub-account slot shortly. Redirecting to profile…'
                                    : 'Slip received! Our admin team will review your payment and activate your subscription shortly. Redirecting to profile…',
                        );
                        showToast(
                            isSlotCheckout
                                ? BANK_TRANSFER_SUB_ACCOUNT_SUBMITTED_MESSAGE
                                : BANK_TRANSFER_SUBMITTED_MESSAGE,
                            'success',
                            4000,
                        );
                        void refreshInterestNotifications();
                        setBankSlipFile(null);
                        setBankSlipPreview(null);
                        setBankRemarks('');
                        window.setTimeout(() => {
                            router.replace('/profile');
                        }, 2000);
                    } else {
                        setError(res?.message || 'Failed to submit bank transfer.');
                        setIsSubmitting(false);
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to submit bank transfer.');
                    setIsSubmitting(false);
                }
            };
            reader.readAsDataURL(bankSlipFile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read file.');
            setIsSubmitting(false);
        }
    };

    const planTitle = planLabel(checkoutPlan, isMatchmakerAccount);

    return (
        <div className="min-h-screen bg-cream pt-28 px-4 pb-10">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h1 className="text-3xl font-playfair font-bold text-text-dark mb-2">Complete Your Payment</h1>
                {isResubmitCheckout ? (
                    <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm leading-relaxed">
                        Upload a new bank transfer slip for the plan below. Our team will review it and activate your subscription after approval.
                    </p>
                ) : null}
                {mustCreateProfileBeforeBuySlot ? (
                    <p className="text-amber-900 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-4 text-sm leading-relaxed">
                        {unusedSlotBlockMessage}{' '}
                        <button
                            type="button"
                            className="underline font-semibold"
                            onClick={() => router.push('/profile')}
                        >
                            Go to profile
                        </button>
                    </p>
                ) : null}
                <p className="text-text-light mb-6">
                    Plan: {planTitle} | Amount: LKR {amount}
                </p>

                {/* Payment Method Selection */}
                <div className="flex gap-3 mb-6">
                    <button
                        type="button"
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold text-sm ${
                            paymentMethod === 'card'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-cream-dark bg-white text-text-light hover:border-primary/40'
                        }`}
                        onClick={() => { setPaymentMethod('card'); setError(''); setSuccess(''); }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Credit / Debit Card
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold text-sm ${
                            paymentMethod === 'bank'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-cream-dark bg-white text-text-light hover:border-primary/40'
                        }`}
                        onClick={() => { setPaymentMethod('bank'); setError(''); setSuccess(''); }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Bank Transfer
                        </div>
                    </button>
                </div>

                {paymentMethod === 'card' && (
                    <div className="rounded-2xl border border-cream-dark bg-[#fffaf6] p-5 md:p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-text-dark">Card Payment</h2>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-[#1A1F71] text-white text-xs font-bold tracking-wide">VISA</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-cream-dark text-xs font-semibold text-text-dark">
                                    <span className="w-3 h-3 rounded-full bg-[#EB001B]"></span>
                                    <span className="w-3 h-3 rounded-full bg-[#F79E1B] -ml-1.5"></span>
                                    Mastercard
                                </span>
                            </div>
                        </div>

                        <p className="text-sm text-text-light leading-relaxed mb-4">
                            Pay securely with Visa, Mastercard, or Frimi via DirectPay. Your card details are entered on
                            DirectPay&apos;s payment page — MyMatch never sees them.
                        </p>
                        <div id="directpay_card_container" className="min-h-[1px]" />
                    </div>
                )}

                {paymentMethod === 'bank' && (
                    <div className="rounded-2xl border border-cream-dark bg-[#fffaf6] p-5 md:p-6">
                        <h2 className="text-lg font-semibold text-text-dark mb-4">Bank Transfer</h2>

                        <div className="bg-white rounded-xl border border-cream-dark p-4 mb-5">
                            <h3 className="text-sm font-semibold text-text-dark mb-3">Transfer to the following account:</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-light">Bank Name:</span>
                                    <span className="font-medium text-text-dark">Bank of Ceylon</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Account Name:</span>
                                    <span className="font-medium text-text-dark">Clovesis (Pvt) Ltd</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Account Number:</span>
                                    <span className="font-medium text-text-dark">0012345678</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Branch:</span>
                                    <span className="font-medium text-text-dark">Colombo</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Amount:</span>
                                    <span className="font-bold text-primary">LKR {amount}</span>
                                </div>
                                {isMatchmakerClientCheckout ? (
                                    <p className="text-xs text-amber-800 mt-3 leading-relaxed">
                                        Transfer exactly <strong>LKR {amount}</strong> for one client-account slot.
                                        After admin approval you can create that client profile. Buy again anytime for more accounts.
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-text-dark font-semibold mb-2 block">
                                    Upload Bank Transfer Slip <span className="text-red-500">*</span>
                                </label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                        bankSlipFile
                                            ? 'border-primary bg-primary/5'
                                            : 'border-cream-dark hover:border-primary/50 bg-white'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    {bankSlipFile ? (
                                        <div className="space-y-3">
                                            {bankSlipPreview && (
                                                <img
                                                    src={bankSlipPreview}
                                                    alt="Bank slip preview"
                                                    className="max-h-48 mx-auto rounded-lg object-contain"
                                                />
                                            )}
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-sm font-medium text-text-dark">{bankSlipFile.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                                className="text-xs text-red-500 hover:text-red-700 underline"
                                            >
                                                Remove & upload different file
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <svg className="w-10 h-10 mx-auto text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-text-light">
                                                Click to upload your bank transfer slip
                                            </p>
                                            <p className="text-xs text-text-light">
                                                JPG, PNG, WebP, or PDF (max 5MB)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-text-dark font-semibold mb-2 block">Remarks (Optional)</label>
                                <textarea
                                    value={bankRemarks}
                                    onChange={(e) => setBankRemarks(e.target.value)}
                                    placeholder="Any additional details about the transfer..."
                                    className="w-full border border-cream-dark rounded-xl px-3 py-3 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-amber-800">
                                <strong>Note:</strong> After uploading the slip, your subscription will be activated once our admin verifies the payment.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 rounded-lg bg-red-50 text-red-800 border border-red-200">
                        <p className="font-semibold mb-1">Payment unsuccessful</p>
                        <p>{error}</p>
                        <button
                            type="button"
                            className="mt-3 underline font-semibold"
                            onClick={() => router.replace('/')}
                        >
                            Go to home page
                        </button>
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                        {success}
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.9rem 1.4rem' }}
                        onClick={paymentMethod === 'card' ? handleCardPayment : handleBankTransfer}
                        disabled={isSubmitting || mustCreateProfileBeforeBuySlot}
                    >
                        {isSubmitting
                            ? 'Processing...'
                            : paymentMethod === 'card'
                                ? 'Pay Now'
                                : 'Submit Bank Transfer Slip'
                        }
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.9rem 1.4rem' }}
                        onClick={() => router.push('/search')}
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}
