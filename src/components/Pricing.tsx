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
    normalizePublicPackages,
    packageFeatureLabels,
    packageId,
    packageName,
    packagePeriodLabel,
    packagePrice,
    packageValidityLabel,
    publicPackagesAudienceParam,
    resolveCheckoutPlan,
} from '../utils/matrimonialPackages';

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

    const goCheckout = (pkg: PublicMatrimonialPackage) => {
        const plan = resolveCheckoutPlan(pkg);
        const amount = packagePrice(pkg);
        router.push(`/subscription/checkout?plan=${encodeURIComponent(plan)}&amount=${amount}`);
    };

    const renderFeatureList = (labels: string[]) => (
        <ul className="space-y-3 mb-8">
            {labels.length > 0 ? (
                labels.map((label, i) => (
                    <li key={i} className="flex items-center gap-2 text-text-dark">
                        <span className="text-primary">✓</span>
                        {label}
                    </li>
                ))
            ) : (
                <li className="text-text-light text-sm">No features listed for this package.</li>
            )}
        </ul>
    );

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
                    <p className="text-white/90 text-lg md:text-xl">{t('pricingPlansDesc')}</p>
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
                            const featureLabels = packageFeatureLabels(pkg);
                            const validityLabel = packageValidityLabel(pkg);

                            return (
                                <div
                                    key={id || name}
                                    className={`w-full max-w-[360px] rounded-3xl p-8 backdrop-blur-xl shadow-xl animate-glass-shine transition-all duration-300 relative ${
                                        popular
                                            ? 'bg-white/75 border-2 border-primary border-white/50 hover:bg-white/85'
                                            : 'bg-white/70 border border-white/40 hover:bg-white/80'
                                    }`}
                                >
                                    {popular && (
                                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                                            {t('mostPopular')}
                                        </span>
                                    )}
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
                                    {renderFeatureList(featureLabels)}
                                    {free ? (
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
