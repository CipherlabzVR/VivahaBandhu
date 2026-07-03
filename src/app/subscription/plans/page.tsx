'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../../components/Header';
import SubscriptionPlanPicker from '../../../components/SubscriptionPlanPicker';
import { useAuth } from '../../../context/AuthContext';
import { matrimonialService } from '../../../services/matrimonialService';
import { CHECKOUT_PLAN_SUB_ACCOUNT } from '../../../constants/subscription';
import {
    type BankTransferPaymentPurpose,
    resolveSubscriptionPlansAudience,
    subscriptionPlansPageIntro,
    subscriptionPlansPageTitle,
} from '../../../utils/bankTransferResubmit';
import {
    type PublicMatrimonialPackage,
    canUserCheckoutSubscriptionPackage,
    isFreePackage,
    isUserCurrentPackage,
    normalizePublicPackages,
    packageId,
    packageName,
    packagePrice,
    packageValidityLabel,
    resolveCheckoutPlan,
    resolveUserCurrentPackage,
    userHasActivePremiumPlan,
} from '../../../utils/matrimonialPackages';
import { paidMatchmakerPackages } from '../../../utils/matchmakerClientLimits';
import { showToast } from '../../../utils/toast';

function parsePurposeParam(raw: string | null): BankTransferPaymentPurpose | null {
    if (!raw?.trim()) return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'sub_account' || normalized === 'sub-account') return 'sub_account';
    if (normalized === 'matchmaker') return 'matchmaker';
    if (normalized === 'premium') return 'premium';
    return null;
}

function SubscriptionPlansContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    const resubmit = searchParams.get('resubmit') === '1';
    const purposeParam = parsePurposeParam(searchParams.get('purpose'));

    const audience = useMemo(
        () => resolveSubscriptionPlansAudience(user?.accountType, purposeParam),
        [user?.accountType, purposeParam],
    );

    const [packages, setPackages] = useState<PublicMatrimonialPackage[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user?.id) {
            router.replace('/');
            return;
        }
    }, [authLoading, user?.id, router]);

    useEffect(() => {
        if (!user?.id) return;

        let cancelled = false;
        setLoadingPackages(true);

        (async () => {
            try {
                let list: PublicMatrimonialPackage[] = [];
                if (audience === 'sub_account') {
                    list = await matrimonialService.getSubAccountPackages();
                } else if (audience === 'matchmaker') {
                    list = await matrimonialService.getMatchmakerPackages();
                } else {
                    const res = await matrimonialService.getPublicPackages('user');
                    list = normalizePublicPackages(res?.result ?? res?.Result);
                }

                if (resubmit) {
                    if (audience === 'matchmaker') {
                        list = paidMatchmakerPackages(list);
                    } else if (audience === 'user') {
                        list = list.filter((p) => !isFreePackage(p));
                    }
                }

                if (cancelled) return;
                setPackages(list);

                const defaultPick =
                    resolveUserCurrentPackage(list, user) ??
                    list.find((p) => !isFreePackage(p) && (p.isPopular ?? p.IsPopular)) ??
                    list.find((p) => !isFreePackage(p)) ??
                    list[0] ??
                    null;
                setSelectedPackageId(defaultPick ? packageId(defaultPick) : null);
            } catch {
                if (!cancelled) {
                    setPackages([]);
                    setSelectedPackageId(null);
                }
            } finally {
                if (!cancelled) setLoadingPackages(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user, audience, resubmit]);

    const selectedPackage = useMemo(
        () => packages.find((p) => packageId(p) === selectedPackageId) ?? packages[0] ?? null,
        [packages, selectedPackageId],
    );

    const selectedIsCurrentPlan = selectedPackage
        ? isUserCurrentPackage(selectedPackage, packages, user)
        : false;

    const selectedCanCheckout = selectedPackage
        ? audience === 'sub_account'
            ? packagePrice(selectedPackage) > 0
            : canUserCheckoutSubscriptionPackage(selectedPackage, packages, user)
        : false;

    const goToCheckout = () => {
        if (!selectedPackage || selectedIsCurrentPlan || !selectedCanCheckout) return;

        if (userHasActivePremiumPlan(user) && audience !== 'sub_account') {
            showToast('You already have premium. Switch to the free plan first to change packages.', 'info');
            return;
        }

        const amount = packagePrice(selectedPackage);
        const plan =
            audience === 'sub_account'
                ? CHECKOUT_PLAN_SUB_ACCOUNT
                : resolveCheckoutPlan(selectedPackage);
        const params = new URLSearchParams({
            plan,
            amount: String(amount),
        });
        if (resubmit) params.set('resubmit', '1');
        router.push(`/subscription/checkout?${params.toString()}`);
    };

    const pageTitle = subscriptionPlansPageTitle(audience, resubmit);
    const pageIntro = subscriptionPlansPageIntro(audience, resubmit);
    const isMatchmakerAudience = audience === 'matchmaker';

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-cream pt-28 px-4 pb-10 flex items-center justify-center">
                <p className="text-text-light">Loading…</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-cream pt-28 px-4 pb-10">
            <Header onOpenLogin={() => {}} onOpenRegister={() => {}} onOpenVerify={() => {}} />
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h1 className="text-3xl font-playfair font-bold text-text-dark mb-2">{pageTitle}</h1>
                <p className="text-text-light mb-6">{pageIntro}</p>

                {loadingPackages ? (
                    <p className="text-text-light text-center py-8">Loading plans…</p>
                ) : packages.length === 0 ? (
                    <p className="text-text-light text-center py-8">
                        No plans are available right now. Please contact support.
                    </p>
                ) : audience === 'sub_account' ? (
                    <div className="space-y-3">
                        {packages.map((pkg) => {
                            const id = packageId(pkg);
                            const selected = selectedPackageId === id;
                            const name = packageName(pkg);
                            const price = packagePrice(pkg);
                            const validity = packageValidityLabel(pkg);
                            const desc = String(pkg.description ?? pkg.Description ?? '').trim();
                            const popular = !!(pkg.isPopular ?? pkg.IsPopular);
                            return (
                                <button
                                    key={id || name}
                                    type="button"
                                    onClick={() => setSelectedPackageId(id)}
                                    className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${
                                        selected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-cream-dark bg-[#fffaf6] hover:border-primary/40'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-4 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-semibold text-text-dark text-lg">{name}</span>
                                                {popular ? (
                                                    <span className="text-xs font-semibold bg-primary text-white px-2 py-0.5 rounded-full">
                                                        Popular
                                                    </span>
                                                ) : null}
                                            </div>
                                            {desc ? (
                                                <p className="text-sm text-text-light mb-1">{desc}</p>
                                            ) : null}
                                            <p className="text-sm text-amber-800">
                                                {validity ? `Valid ${validity} per profile` : 'Premium per managed profile'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xl font-bold text-primary">
                                                LKR {price.toLocaleString('en-LK')}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <SubscriptionPlanPicker
                        packages={packages}
                        selectedPackageId={selectedPackageId}
                        onSelectPackage={setSelectedPackageId}
                        isMatchmaker={isMatchmakerAudience}
                        user={user}
                        currentPackageLabel="Your current package"
                    />
                )}

                <div className="mt-8 flex flex-wrap gap-3">
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '0.9rem 1.4rem' }}
                        disabled={!selectedPackage || selectedIsCurrentPlan || !selectedCanCheckout}
                        onClick={goToCheckout}
                    >
                        Continue to payment
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.9rem 1.4rem' }}
                        onClick={() => router.back()}
                    >
                        Back
                    </button>
                </div>
                <p className="text-center mt-4 text-xs text-text-light">
                    Secure payment • Card or bank transfer
                </p>
            </div>
        </main>
    );
}

export default function SubscriptionPlansPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-cream pt-28 px-4 pb-10 flex items-center justify-center">
                    <p className="text-text-light">Loading…</p>
                </div>
            }
        >
            <SubscriptionPlansContent />
        </Suspense>
    );
}
