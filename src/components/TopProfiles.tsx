'use client';

import { useLanguage } from '../context/LanguageContext';

interface TopProfilesProps {
    onOpenProfileDetail: (profile: any) => void;
}

export default function TopProfiles({ onOpenProfileDetail }: TopProfilesProps) {
    const { t } = useLanguage();
    return (
        <section className="top-profiles-section">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('topLiveProfiles')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('topLiveProfilesDesc')}</p>
            </div>
            <div className="top-profiles-list">
                {/* Real profiles will be displayed here */}
            </div>
        </section>
    );
}
