'use client';

import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

const FEATURE_KEYS = [
    { keyTitle: 'specialtyAdvancedTech' as const, keyText: 'specialtyAdvancedTechText' as const, icon: '◇' },
    { keyTitle: 'specialtyHoroscope' as const, keyText: 'specialtyHoroscopeText' as const, icon: '☽' },
    { keyTitle: 'specialtySecure' as const, keyText: 'specialtySecureText' as const, icon: '✧' },
    { keyTitle: 'specialtyTrusted' as const, keyText: 'specialtyTrustedText' as const, icon: '★' },
] as const;

export default function OurSpecialty() {
    const { t, language } = useLanguage();
    return (
        <section className={`relative py-20 md:py-28 overflow-hidden bg-black ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            {/* Background image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/sky.jpg"
                    alt=""
                    fill
                    className="object-cover object-center"
                    sizes="100vw"
                    priority={false}
                />
                <div className="absolute inset-0 bg-black/60" aria-hidden />
            </div>
            {/* Starfield / constellation background */}
            <div className="absolute inset-0 z-[1] opacity-30" aria-hidden>
                <div className="absolute top-[10%] left-[5%] w-1 h-1 rounded-full bg-orange-200" />
                <div className="absolute top-[20%] right-[15%] w-1 h-1 rounded-full bg-white" />
                <div className="absolute top-[40%] left-[20%] w-1.5 h-1.5 rounded-full bg-orange-300/80" />
                <div className="absolute top-[60%] right-[8%] w-1 h-1 rounded-full bg-white/90" />
                <div className="absolute top-[75%] left-[12%] w-1 h-1 rounded-full bg-orange-200/70" />
                <div className="absolute top-[15%] left-[50%] w-1 h-1 rounded-full bg-white/80" />
                <div className="absolute top-[55%] left-[45%] w-1 h-1 rounded-full bg-orange-200/60" />
                <div className="absolute top-[35%] right-[30%] w-1 h-1 rounded-full bg-white" />
                <div className="absolute top-[80%] right-[25%] w-1 h-1 rounded-full bg-orange-300/70" />
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-4 lg:px-8">
                {/* Header */}
                <div className="text-center mb-14 md:mb-16">
                    <p className="text-orange-400 text-sm uppercase tracking-[0.2em] mb-2 font-medium">
                        {t('ourSpecialtySubtitle')}
                    </p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 font-playfair">
                        {t('ourSpecialty')}
                    </h2>
                    <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
                        {t('ourSpecialtyIntro')}
                    </p>
                </div>

                {/* Feature cards - horoscope column style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {FEATURE_KEYS.map((item) => (
                        <article
                            key={item.keyTitle}
                            className="relative bg-slate-800/60 backdrop-blur-sm border border-orange-500/20 rounded-xl p-6 md:p-8 shadow-xl hover:border-orange-400/30 transition-colors"
                        >
                            {/* Corner ornament */}
                            <span className="absolute top-4 right-4 text-orange-400/50 text-2xl" aria-hidden>
                                {item.icon}
                            </span>
                            <h3 className="text-xl md:text-2xl font-semibold text-orange-400 mb-3 pr-8 font-playfair">
                                {t(item.keyTitle)}
                            </h3>
                            <p className="text-slate-300 leading-relaxed">
                                {t(item.keyText)}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
