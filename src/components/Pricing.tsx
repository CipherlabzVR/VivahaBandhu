'use client';

import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

interface PricingProps {
    onOpenSubscription: () => void;
}

export default function Pricing({ onOpenSubscription }: PricingProps) {
    const { t } = useLanguage();
    return (
        <section className="relative py-24 px-4 overflow-hidden" id="pricing">
            {/* Solid orange background */}
            <div className="absolute inset-0 bg-primary" aria-hidden />

            {/* Animated floating orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary-light/50 animate-price-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary-dark/40 animate-price-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-white/20 animate-price-float" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/3 right-1/3 w-40 h-40 rounded-full bg-primary-light/30 animate-price-float" style={{ animationDelay: '2s' }} />
            </div>

            {/* Tree left */}
            <div className="pricing-tree pricing-tree-left hidden md:block" aria-hidden>
                <Image src="/tree.png" alt="" fill style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </div>

            {/* Tree right */}
            <div className="pricing-tree pricing-tree-right hidden md:block" aria-hidden>
                <Image src="/tree.png" alt="" fill style={{ objectFit: 'contain', objectPosition: 'bottom' }} />
            </div>

            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" aria-hidden />
            <div className="relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold text-white mb-4">{t('pricingPlans')}</h2>
                    <p className="text-white/90 text-lg md:text-xl">{t('pricingPlansDesc')}</p>
                </div>
                <div className="max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="rounded-3xl p-8 bg-white/70 backdrop-blur-xl border border-white/40 shadow-xl animate-glass-shine hover:bg-white/80 transition-all duration-300">
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">{t('free')}</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-text-dark">LKR 0</span>
                            <span className="text-text-light">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Create Profile</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Add Photos</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Search Profiles</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Send Interest</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> View 10 Profiles / Day</li>
                            <li className="flex items-center gap-2 text-text-light"><span className="text-text-light">✕</span> View Contact Info</li>
                            <li className="flex items-center gap-2 text-text-light"><span className="text-text-light">✕</span> Direct Chat</li>
                            <li className="flex items-center gap-2 text-text-light"><span className="text-text-light">✕</span> Unlimited Profile Views</li>
                        </ul>
                        <button className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors" onClick={onOpenSubscription}>{t('getStarted')}</button>
                    </div>

                    <div className="rounded-3xl p-8 bg-white/75 backdrop-blur-xl border-2 border-primary border-white/50 shadow-xl animate-glass-shine hover:bg-white/85 transition-all duration-300 relative">
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">{t('mostPopular')}</span>
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">Premium</h3>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-text-dark">LKR 2,000</span>
                            <span className="text-text-light">/mo</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Create Profile</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Add Photos</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Search Profiles</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Send Interest</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Unlimited Profile Views</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> View Contact Info</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Direct Chat</li>
                            <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> Priority Support</li>
                        </ul>
                        <button className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors" onClick={onOpenSubscription}>{t('upgradeNow')}</button>
                    </div>
                </div>
            </div>
        </section>
    );
}
