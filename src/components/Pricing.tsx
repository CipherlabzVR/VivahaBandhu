'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { PREMIUM_SUBSCRIPTION_LKR } from '../constants/subscription';
import { matrimonialService } from '../services/matrimonialService';

interface PricingProps {
    onOpenSubscription: () => void;
}

type PublicPkg = {
    id?: number;
    Id?: number;
    name?: string;
    Name?: string;
    description?: string | null;
    Description?: string | null;
    price?: number;
    Price?: number;
    pricePeriodLabel?: string;
    PricePeriodLabel?: string;
    isPopular?: boolean;
    IsPopular?: boolean;
    features?: Array<{ key?: string; Key?: string; label?: string; Label?: string }>;
    Features?: Array<{ key?: string; Key?: string; label?: string; Label?: string }>;
};

function normalizePackages(raw: unknown): PublicPkg[] {
    if (!Array.isArray(raw)) return [];
    return raw as PublicPkg[];
}

export default function Pricing({ onOpenSubscription }: PricingProps) {
    const { t } = useLanguage();
    const router = useRouter();
    const [paidPackages, setPaidPackages] = useState<PublicPkg[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.getPublicPackages();
                const list = normalizePackages(res?.result ?? res?.Result);
                if (!cancelled) setPaidPackages(list);
            } catch {
                if (!cancelled) setPaidPackages([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const goCheckout = (amount: number) => {
        router.push(`/subscription/checkout?plan=premium&amount=${amount}`);
    };

    const renderFeatureList = (items: { label: string; muted?: boolean }[]) => (
        <ul className="space-y-3 mb-8">
            {items.map((it, i) => (
                <li
                    key={i}
                    className={`flex items-center gap-2 ${it.muted ? 'text-text-light' : 'text-text-dark'}`}
                >
                    <span className={it.muted ? 'text-text-light' : 'text-primary'}>{it.muted ? '✕' : '✓'}</span>
                    {it.label}
                </li>
            ))}
        </ul>
    );

    const freeFeatures = [
        { label: 'Create Profile' },
        { label: 'Add Photos' },
        { label: 'Search Profiles' },
        { label: 'Send Interest' },
        { label: 'View 10 Profiles / Day' },
        { label: 'View Contact Info', muted: true },
        { label: 'Direct Chat', muted: true },
        { label: 'Unlimited Profile Views', muted: true },
    ];

    const fallbackPremiumFeatures = [
        { label: 'Create Profile' },
        { label: 'Add Photos' },
        { label: 'Search Profiles' },
        { label: 'Send Interest' },
        { label: 'Unlimited Profile Views' },
        { label: 'View Contact Info' },
        { label: 'Direct Chat' },
        { label: 'Priority Support' },
    ];

    const gridClass =
        'max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8';

    return (
        <section className="relative py-24 px-4 overflow-hidden" id="pricing">
            <div className="absolute inset-0 bg-primary" aria-hidden />

            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-light/50 animate-price-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary-dark/40 animate-price-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white/20 animate-price-float" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-primary-light/30 animate-price-float" style={{ animationDelay: '2s' }} />
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

                <div className={gridClass}>
                    {/* Free — always */}
                    <div className="rounded-3xl p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl animate-glass-shine hover:bg-white/80 transition-all duration-300">
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">{t('free')}</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-text-dark">LKR 0</span>
                            <span className="text-text-light">/mo</span>
                        </div>
                        {renderFeatureList(freeFeatures)}
                        <button
                            className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
                            onClick={onOpenSubscription}
                        >
                            {t('getStarted')}
                        </button>
                    </div>

                    {/* Standard Premium — always shown alongside admin packages */}
                    <div
                        key="premium-standard"
                        className="rounded-3xl p-8 bg-white/75 backdrop-blur-xl border-2 border-primary border-white/50 shadow-xl animate-glass-shine hover:bg-white/85 transition-all duration-300 relative"
                    >
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                            {t('mostPopular')}
                        </span>
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">Premium</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-text-dark">
                                LKR {PREMIUM_SUBSCRIPTION_LKR.toLocaleString('en-LK')}
                            </span>
                            <span className="text-text-light">/mo</span>
                        </div>
                        {renderFeatureList(fallbackPremiumFeatures)}
                        <button
                            className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
                            onClick={() => goCheckout(PREMIUM_SUBSCRIPTION_LKR)}
                        >
                            {t('upgradeNow')}
                        </button>
                    </div>

                    {/* Extra paid tiers from admin (shown after Free + standard Premium) */}
                    {paidPackages.map((pkg) => {
                        const id = pkg.id ?? pkg.Id ?? 0;
                        const name = pkg.name ?? pkg.Name ?? 'Package';
                        const desc = pkg.description ?? pkg.Description;
                        const price = Number(pkg.price ?? pkg.Price ?? 0);
                        const period = pkg.pricePeriodLabel ?? pkg.PricePeriodLabel ?? '/mo';
                        const popular = pkg.isPopular ?? pkg.IsPopular ?? false;
                        const feats = pkg.features ?? pkg.Features ?? [];
                        const featureItems = feats.map((f) => ({
                            label: f.label ?? f.Label ?? f.key ?? f.Key ?? '',
                            muted: false,
                        }));

                        return (
                            <div
                                key={id}
                                className={`rounded-3xl p-8 bg-white/75 backdrop-blur-xl border-2 shadow-xl animate-glass-shine hover:bg-white/85 transition-all duration-300 relative ${
                                    popular ? 'border-primary border-white/50' : 'border-white/40'
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
                                    <span className="text-text-light">{period}</span>
                                </div>
                                {featureItems.length > 0 ? (
                                    <ul className="space-y-3 mb-8">
                                        {featureItems.map((it, i) => (
                                            <li key={i} className="flex items-center gap-2 text-text-dark">
                                                <span className="text-primary">✓</span>
                                                {it.label}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-text-light text-sm mb-8">No features selected for this package.</p>
                                )}
                                <button
                                    className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors"
                                    onClick={() => goCheckout(price)}
                                >
                                    {t('upgradeNow')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
