'use client';

import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const HEART_PATH =
    'M 5 25 ' +
    'C 15 45, 45 50, 60 35 ' +
    'C 75 20, 80 5, 60 15 ' +
    'C 40 5, 45 20, 60 35 ' +
    'C 75 50, 105 45, 115 25';

const HIDDEN_LENGTH = 500;

interface FindYourSoulmateProps {
    onOpenRegister: () => void;
}

export default function FindYourSoulmate({ onOpenRegister }: FindYourSoulmateProps) {
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number | null>(null);
    const { t, language } = useLanguage();

    useEffect(() => {
        const path = pathRef.current;
        if (path) setPathLength(path.getTotalLength());
    }, []);

    const length = pathLength ?? HIDDEN_LENGTH;
    const drawStyle = (delayMs: number) => ({
        strokeDasharray: length,
        strokeDashoffset: length,
        '--heart-length': length,
        animationDuration: '3s',
        animationDelay: `${delayMs}ms`,
    } as React.CSSProperties);

    return (
        <section className={`relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-rose-50 via-white to-orange-50 ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            {/* Line-drawn hearts background (same design as footer, looping) */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.25]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            ref={pathRef}
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(0)}
                        />
                    </svg>
                </div>
                <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.25] scale-x-[-1]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(400)}
                        />
                    </svg>
                </div>
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[200px] md:w-[240px] opacity-[0.2]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(800)}
                        />
                    </svg>
                </div>
            </div>
            {/* Soft decorative elements */}
            <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
                <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-rose-200/20 blur-3xl" />
                <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-orange-200/25 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-rose-100/15 blur-3xl" />
            </div>
            {/* Heart accent */}
            <div className="absolute top-16 right-[15%] opacity-10" aria-hidden>
                <svg className="w-16 h-16 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            </div>
            <div className="absolute bottom-20 left-[10%] opacity-10" aria-hidden>
                <svg className="w-12 h-12 text-orange-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
            </div>

            <div className="relative z-10 max-w-[900px] mx-auto px-4 lg:px-8 text-center">
                <p className="text-orange-500 text-sm uppercase tracking-[0.2em] mb-3 font-semibold">
                    {t('startYourJourney')}
                </p>
                <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-800 mb-5 font-playfair leading-tight">
                    {t('findYourSoulmateNow')}
                </h2>
                <p className="text-slate-600 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                    {t('findYourSoulmateDesc')}
                </p>
                <button
                    type="button"
                    onClick={onOpenRegister}
                    className="inline-flex items-center justify-center gap-2 px-10 py-4 md:px-12 md:py-5 bg-orange-500 text-white rounded-full font-semibold text-lg shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    {t('registerFree')}
                </button>
            </div>
        </section>
    );
}
