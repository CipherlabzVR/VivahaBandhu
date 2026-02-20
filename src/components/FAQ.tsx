'use client';

import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function FAQ() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('account');
    const [activeItems, setActiveItems] = useState<Record<string, boolean>>({
        'acc1': true,
        'acc2': false,
        'sub1': true,
        'sub2': false,
        'priv1': true
    });

    const toggle = (id: string) => {
        setActiveItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const isOpen = (id: string) => !!activeItems[id];

    return (
        <section className="py-24 px-4 bg-cream" id="faq">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('faq')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('faqDesc')}</p>
            </div>

            <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-12 items-start">
                <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="https://images.unsplash.com/photo-1555421689-d68471e189f2?w=400" alt="FAQ" className="w-full rounded-2xl" />
                </div>

                <div>
                    <div className="flex gap-2 mb-8 border-b border-gray-200">
                        <button 
                            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                                activeTab === 'account' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-text-light hover:text-text-dark'
                            }`} 
                            onClick={() => setActiveTab('account')}
                        >
                            {t('account')}
                        </button>
                        <button 
                            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                                activeTab === 'subscription' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-text-light hover:text-text-dark'
                            }`} 
                            onClick={() => setActiveTab('subscription')}
                        >
                            {t('subscription')}
                        </button>
                        <button 
                            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
                                activeTab === 'privacy' 
                                    ? 'border-primary text-primary' 
                                    : 'border-transparent text-text-light hover:text-text-dark'
                            }`} 
                            onClick={() => setActiveTab('privacy')}
                        >
                            {t('privacy')}
                        </button>
                    </div>

                    <div className={`${activeTab === 'account' ? 'block' : 'hidden'}`} id="accountFaq">
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-6">{t('accountProfile')}</h3>
                        <div className="space-y-4">
                            <div className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${isOpen('acc1') ? 'shadow-lg' : 'shadow-sm'}`} onClick={() => toggle('acc1')}>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-text-dark">{t('howDoIRegister')}</h4>
                                    <span className="text-2xl text-primary">{isOpen('acc1') ? '−' : '+'}</span>
                                </div>
                                {isOpen('acc1') && (
                                    <p className="mt-4 text-text-light leading-relaxed">{t('howDoIRegisterDesc')}</p>
                                )}
                            </div>
                            <div className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${isOpen('acc2') ? 'shadow-lg' : 'shadow-sm'}`} onClick={() => toggle('acc2')}>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-text-dark">{t('isItFree')}</h4>
                                    <span className="text-2xl text-primary">{isOpen('acc2') ? '−' : '+'}</span>
                                </div>
                                {isOpen('acc2') && (
                                    <p className="mt-4 text-text-light leading-relaxed">{t('isItFreeDesc')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`${activeTab === 'subscription' ? 'block' : 'hidden'}`} id="subscriptionFaq">
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-6">{t('subscription')}</h3>
                        <div className="space-y-4">
                            <div className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${isOpen('sub1') ? 'shadow-lg' : 'shadow-sm'}`} onClick={() => toggle('sub1')}>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-text-dark">{t('premiumBenefits')}</h4>
                                    <span className="text-2xl text-primary">{isOpen('sub1') ? '−' : '+'}</span>
                                </div>
                                {isOpen('sub1') && (
                                    <p className="mt-4 text-text-light leading-relaxed">{t('premiumBenefitsDesc')}</p>
                                )}
                            </div>
                            <div className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${isOpen('sub2') ? 'shadow-lg' : 'shadow-sm'}`} onClick={() => toggle('sub2')}>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-text-dark">{t('canICancel')}</h4>
                                    <span className="text-2xl text-primary">{isOpen('sub2') ? '−' : '+'}</span>
                                </div>
                                {isOpen('sub2') && (
                                    <p className="mt-4 text-text-light leading-relaxed">{t('canICancelDesc')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={`${activeTab === 'privacy' ? 'block' : 'hidden'}`} id="privacyFaq">
                        <h3 className="text-2xl font-playfair font-bold text-text-dark mb-6">{t('privacy')}</h3>
                        <div className="space-y-4">
                            <div className={`bg-white rounded-xl p-6 cursor-pointer transition-all ${isOpen('priv1') ? 'shadow-lg' : 'shadow-sm'}`} onClick={() => toggle('priv1')}>
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-text-dark">{t('whoCanSeeContact')}</h4>
                                    <span className="text-2xl text-primary">{isOpen('priv1') ? '−' : '+'}</span>
                                </div>
                                {isOpen('priv1') && (
                                    <p className="mt-4 text-text-light leading-relaxed">{t('whoCanSeeContactDesc')}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
