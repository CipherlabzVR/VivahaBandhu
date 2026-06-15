'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { matrimonialService } from '../services/matrimonialService';
import { useAuth } from '../context/AuthContext';
import {
    type PublicMatrimonialPackage,
    isFreePackage,
    isUserCurrentPackage,
    normalizePublicPackages,
    packageFeatureLabels,
    packageId,
    packageName,
    packagePeriodLabel,
    packagePrice,
    packageValidityLabel,
    publicPackagesAudienceParam,
    resolveCheckoutPlan,
    resolveUserCurrentPackage,
} from '../utils/matrimonialPackages';
import PackageFeatureList from './PackageFeatureList';
import { notifyFooterLayoutSettled } from '../utils/footerScrollRestore';

interface PricingProps {
    onOpenSubscription: () => void;
}

export default function Pricing({ onOpenSubscription }: PricingProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const { user } = useAuth();
    const [packages, setPackages] = useState<PublicMatrimonialPackage[]>([]);
    const [loading, setLoading] = useState(true);

    const audience = publicPackagesAudienceParam(user?.accountType);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await matrimonialService.getPublicPackages(audience);
                const list = normalizePublicPackages(res?.result ?? res?.Result);
                if (!cancelled) setPackages(list);
            } catch {
                if (!cancelled) setPackages([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [audience]);

    useEffect(() => {
        if (!loading) {
            notifyFooterLayoutSettled();
        }
    }, [loading]);

    useEffect(() => {
        notifyFooterLayoutSettled();
    }, []);

    const goCheckout = (pkg: PublicMatrimonialPackage) => {
        const plan = resolveCheckoutPlan(pkg);
        const amount = packagePrice(pkg);
        router.push(`/subscription/checkout?plan=${encodeURIComponent(plan)}&amount=${amount}`);
    };

    const currentPackage = resolveUserCurrentPackage(packages, user);
    const userHasPlan = !!user && !!currentPackage;

    return (
        <section className="relative py-24 px-4 overflow-hidden" id="pricing">
            <div className="absolute inset-0 bg-primary" aria-hidden />

            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-light/50 animate-price-pulse" />
                <div
                    className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary-dark/40 animate-price-pulse"
                    style={{ animationDelay: '1.5s' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white/20 animate-price-float"
                    style={{ animationDelay: '0.5s' }}
                />
                <div
                    className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-primary-light/30 animate-price-float"
                    style={{ animationDelay: '2s' }}
                />
            </div>

            <div className="pricing-tree pricing-tree-left hidden md:block" aria-hidden>
                <Image src="/tree.png" alt="" fill style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </div>

            <div className="pricing-tree pricing-tree-right hidden md:block" aria-hidden>
                <Image src="/tree.png" alt="" fill style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </div>

            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" aria-hidden />
            <div className="relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold text-white mb-4">{t('pricingPlans')}</h2>
                    <p className="text-white/90 text-lg md:text-xl">
                        {userHasPlan ? t('pricingPlansDescSubscribed') : t('pricingPlansDesc')}
                    </p>
                </div>

                {loading ? (
                    <p className="text-center text-white/90 text-sm py-8">Loading plans…</p>
                ) : packages.length === 0 ? (
                    <p className="text-center text-white/90 text-sm py-8 max-w-md mx-auto">
                        No plans are available right now. Please check back later or contact support.
                    </p>
                ) : (
                    <div className="flex flex-wrap justify-center items-stretch gap-8 max-w-[1400px] mx-auto">
                        {packages.map((pkg) => {
                            const id = packageId(pkg);
                            const name = packageName(pkg);
                            const desc = pkg.description ?? pkg.Description;
                            const price = packagePrice(pkg);
                            const period = packagePeriodLabel(pkg);
                            const popular = !!(pkg.isPopular ?? pkg.IsPopular);
                            const free = isFreePackage(pkg);
                            const isCurrent = isUserCurrentPackage(pkg, packages, user);
                            const featureLabels = packageFeatureLabels(pkg);
                            const validityLabel = packageValidityLabel(pkg);

                            return (
                                <div
                                    key={id || name}
                                    className={`w-full max-w-[360px] rounded-3xl p-8 backdrop-blur-xl shadow-xl animate-glass-shine transition-all duration-300 relative ${
                                        isCurrent
                                            ? 'bg-white/85 border-2 border-emerald-500 ring-2 ring-emerald-400/40'
                                            : popular
                                              ? 'bg-white/75 border-2 border-primary border-white/50 hover:bg-white/85'
                                              : 'bg-white/70 border border-white/40 hover:bg-white/80'
                                    }`}
                                >
                                    {isCurrent ? (
                                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-sm font-semibold whitespace-nowrap">
                                            {t('yourCurrentPackage')}
                                        </span>
                                    ) : popular ? (
                                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                                            {t('mostPopular')}
                                        </span>
                                    ) : null}
                                    <h3 className="text-2xl font-playfair font-bold text-text-dark mb-2">{name}</h3>
                                    {desc ? (
                                        <p className="text-text-light text-sm mb-4">{desc}</p>
                                    ) : null}
                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-text-dark">
                                            LKR {price.toLocaleString('en-LK')}
                                        </span>
                                        {period ? (
                                            <span className="text-text-light">{period}</span>
                                        ) : null}
                                        {validityLabel && !free ? (
                                            <p className="text-text-light text-sm mt-2">
                                                Valid for: <span className="font-medium text-text-dark">{validityLabel}</span>
                                            </p>
                                        ) : null}
                                    </div>
                                    <PackageFeatureList labels={featureLabels} className="space-y-3 mb-8" />
                                    {isCurrent ? (
                                        <button
                                            type="button"
                                            className="w-full px-6 py-3 border-2 border-emerald-600 text-emerald-700 rounded-full font-semibold bg-emerald-50 cursor-default"
                                            disabled
                                        >
                                            {t('currentPlan')}
                                        </button>
                                    ) : free ? (
                                        <button
                                            type="button"
                                            className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
                                            onClick={onOpenSubscription}
                                        >
                                            {t('getStarted')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
                                            onClick={() => goCheckout(pkg)}
                                        >
                                            {t('upgradeNow')}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
