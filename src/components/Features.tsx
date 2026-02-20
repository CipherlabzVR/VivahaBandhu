'use client';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface FeaturesProps {
    onOpenRegister?: () => void;
}

export default function Features({ onOpenRegister }: FeaturesProps) {
    const { user } = useAuth();
    const { t } = useLanguage();

    const handleButtonClick = () => {
        if (user) {
            // If logged in, scroll to featured profiles section
            const profilesSection = document.getElementById('profiles');
            if (profilesSection) {
                profilesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else if (onOpenRegister) {
            // If not logged in, open register modal
            onOpenRegister();
        }
    };

    return (
        <section className="py-24 px-8 bg-white max-w-[1400px] mx-auto">
            {/* Top Section - CTA Button, Heading, and Description */}
            <div className="text-center mb-16">
                <div className="max-w-3xl mx-auto">
                    <button 
                        className="bg-primary text-white border-none px-10 py-4 rounded-full text-base font-semibold cursor-pointer mb-8 transition-all hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 font-source-sans" 
                        onClick={handleButtonClick}
                    >
                        {t('findTheOne')}
                    </button>
                    <h2 className="text-5xl md:text-6xl lg:text-7xl text-text-dark mb-6 font-normal leading-tight font-playfair">{t('findRealConnection')}</h2>
                    <p className="text-text-light text-lg md:text-xl leading-relaxed max-w-2xl mx-auto">
                        {t('featuresDescription')}
                    </p>
                </div>
            </div>

            {/* Lower Section - Features List (Left) and Image (Right) */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="flex flex-col gap-6">
                    <div className="bg-white rounded-2xl p-8 flex flex-col gap-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                            </svg>
                        </div>
                        <h4 className="text-xl text-text-dark m-0 font-semibold font-playfair">{t('familyValues')}</h4>
                        <p className="text-text-light text-base leading-relaxed m-0">{t('familyValuesDesc')}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-8 flex flex-col gap-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                        </div>
                        <h4 className="text-xl text-text-dark m-0 font-semibold font-playfair">{t('verifiedTrusted')}</h4>
                        <p className="text-text-light text-base leading-relaxed m-0">{t('verifiedTrustedDesc')}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-8 flex flex-col gap-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                                <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                            </svg>
                        </div>
                        <h4 className="text-xl text-text-dark m-0 font-semibold font-playfair">{t('personalMatchmaking')}</h4>
                        <p className="text-text-light text-base leading-relaxed m-0">{t('personalMatchmakingDesc')}</p>
                    </div>
                </div>
                <div className="w-full h-full min-h-[500px] rounded-3xl overflow-hidden">
                    <img 
                        src="/about.jpg" 
                        alt="Connection and happiness" 
                        className="w-full h-full object-cover rounded-3xl"
                    />
                </div>
            </div>
        </section>
    );
}
