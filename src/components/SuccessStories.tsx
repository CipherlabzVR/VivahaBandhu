'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

const HEART_PATH =
    'M 5 25 ' +
    'C 15 45, 45 50, 60 35 ' +
    'C 75 20, 80 5, 60 15 ' +
    'C 40 5, 45 20, 60 35 ' +
    'C 75 50, 105 45, 115 25';

const HIDDEN_LENGTH = 320;

const STORY_KEYS = [
    { couple: 'story1Couple' as const, quote: 'story1Quote' as const, image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop' },
    { couple: 'story2Couple' as const, quote: 'story2Quote' as const, image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=300&fit=crop' },
    { couple: 'story3Couple' as const, quote: 'story3Quote' as const, image: 'https://images.unsplash.com/photo-1529634801-b469c85b2bcc?w=400&h=300&fit=crop' },
] as const;

export default function SuccessStories() {
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
        ['--heart-length' as string]: `${length}`,
        animationDuration: '3s',
        animationDelay: `${delayMs}ms`,
        animationFillMode: 'both',
    } as React.CSSProperties);

    return (
        <section className={`relative py-20 md:py-28 bg-white overflow-x-hidden ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            {/* Line-drawn hearts background (same as footer / WhoAreWe, looping) */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-visible">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.35]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            ref={pathRef}
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(0)}
                        />
                    </svg>
                </div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.35] scale-x-[-1]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(400)}
                        />
                    </svg>
                </div>
                <div className="absolute left-1/2 bottom-4 -translate-x-1/2 w-[200px] md:w-[240px] opacity-[0.28]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className="animate-heart-draw-loop"
                            style={drawStyle(800)}
                        />
                    </svg>
                </div>
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-4 lg:px-12">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-orange-500 mb-12 md:mb-16 text-center font-playfair">
                    {t('successStories')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
                    {STORY_KEYS.map(({ couple, quote, image }) => (
                        <article
                            key={couple}
                            className="relative bg-slate-50 border border-orange-200/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-orange-300/60 transition-all duration-300 flex flex-col"
                        >
                            <div className="relative w-full aspect-[4/3] bg-slate-200">
                                <Image
                                    src={image}
                                    alt={t(couple)}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                />
                            </div>
                            <div className="relative p-6 md:p-8 flex flex-col flex-1">
                                <div className="absolute top-6 right-8 text-orange-400/40 text-4xl font-serif leading-none" aria-hidden>{'"'}</div>
                                <p className="text-slate-600 text-base md:text-lg leading-relaxed flex-1 pr-8 mb-6">
                                    {t(quote)}
                                </p>
                                <p className="text-orange-500 font-semibold text-lg font-playfair">
                                    — {t(couple)}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
