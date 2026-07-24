'use client';

import { useLanguage } from '../context/LanguageContext';
import {
    formatHeroStatCount,
    useHeroLiveStats,
} from '../hooks/useHeroLiveStats';

const DEFAULT_STATS = {
    verifiedProfiles: 50_000,
    successStories: 15_000,
    trustedMatchmakers: 500,
} as const;

export default function AboutStats() {
    const { t, language } = useLanguage();
    const { stats } = useHeroLiveStats({
        verifiedProfiles: DEFAULT_STATS.verifiedProfiles,
        successStories: DEFAULT_STATS.successStories,
        trustedMatchmakers: DEFAULT_STATS.trustedMatchmakers,
    });

    const items = [
        { value: formatHeroStatCount(stats.verifiedProfiles), key: 'verifiedProfiles' as const },
        { value: formatHeroStatCount(stats.successStories), key: 'successStoriesCount' as const },
        { value: formatHeroStatCount(stats.trustedMatchmakers), key: 'trustedMatchmakers' as const },
    ];

    return (
        <section className="relative py-16 md:py-24 bg-white overflow-hidden">
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Emilys+Candy&display=swap" rel="stylesheet" />

            <div
                className="max-w-[1200px] mx-auto px-4 lg:px-8"
                style={{ fontFamily: "'Emilys Candy', cursive" }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                    {items.map((stat, index) => (
                        <div
                            key={stat.key}
                            className={`text-center ${index > 0 ? 'sm:border-l sm:border-slate-200' : ''}`}
                        >
                            <p className="text-3xl md:text-4xl lg:text-5xl text-orange-500 mb-2">
                                {stat.value}
                            </p>
                            <p className={`text-slate-600 text-base md:text-lg ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
                                {t(stat.key)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
