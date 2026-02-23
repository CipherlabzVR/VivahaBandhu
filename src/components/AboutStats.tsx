'use client';

import { useLanguage } from '../context/LanguageContext';

const STATS = [
    { value: '50,000+', key: 'verifiedProfiles' as const },
    { value: '15,000+', key: 'successStoriesCount' as const },
    { value: '500+', key: 'trustedMatchmakers' as const },
];

export default function AboutStats() {
    const { t, language } = useLanguage();

    return (
        <section className="relative py-16 md:py-24 bg-white overflow-hidden">
            {/* Load the Google Font for Emilys Candy */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Emilys+Candy&display=swap" rel="stylesheet" />

            {/* Apply the font family to this specific container */}
            <div 
                className="max-w-[1200px] mx-auto px-4 lg:px-8"
                style={{ fontFamily: "'Emilys Candy', cursive" }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
                    {STATS.map((stat, index) => (
                        <div
                            key={stat.key}
                            className={`text-center ${index > 0 ? 'sm:border-l sm:border-slate-200' : ''}`}
                        >
                            <p className="text-3xl md:text-4xl lg:text-5xl text-orange-500 mb-2">
                                {stat.value}
                            </p>
                            {/* Retained your Sinhala logic so it can still override if the language changes */}
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