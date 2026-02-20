'use client';

import { useLanguage } from '../context/LanguageContext';

interface PricingProps {
    onOpenSubscription: () => void;
}

export default function Pricing({ onOpenSubscription }: PricingProps) {
    const { t } = useLanguage();
    return (
        <section className="py-24 px-4 bg-cream" id="pricing">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('pricingPlans')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('pricingPlansDesc')}</p>
            </div>
            <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">{t('free')}</h3>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-text-dark">LKR 0</span>
                        <span className="text-text-light">/mo</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('createProfile')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('addPhotos')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('searchProfiles')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('sendInterest')}</li>
                        <li className="flex items-center gap-2 text-text-light"><span>✕</span> {t('viewContactInfo')}</li>
                        <li className="flex items-center gap-2 text-text-light"><span>✕</span> {t('directChat')}</li>
                    </ul>
                    <button className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors" onClick={onOpenSubscription}>{t('getStarted')}</button>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow relative border-2 border-primary">
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">{t('mostPopular')}</span>
                    <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">{t('gold')}</h3>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-text-dark">LKR 1,200</span>
                        <span className="text-text-light">/mo</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('createProfile')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('addPhotos')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('searchProfiles')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('sendInterest')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('viewContactInfo')} (15)</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('directChat')}</li>
                    </ul>
                    <button className="w-full px-6 py-3 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors" onClick={onOpenSubscription}>{t('upgradeNow')}</button>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <h3 className="text-2xl font-playfair font-bold text-text-dark mb-4">{t('diamond')}</h3>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-text-dark">LKR 2,500</span>
                        <span className="text-text-light">/mo</span>
                    </div>
                    <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('allGoldFeatures')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('viewContactUnlimited')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('prioritySupport')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('profileBoost')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('featuredListing')}</li>
                        <li className="flex items-center gap-2 text-text-dark"><span className="text-primary">✓</span> {t('personalAssistant')}</li>
                    </ul>
                    <button className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors" onClick={onOpenSubscription}>{t('goPremium')}</button>
                </div>
            </div>
        </section>
    );
}
