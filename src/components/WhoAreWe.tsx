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

export default function WhoAreWe() {
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
        <section className={`relative py-20 md:py-28 bg-slate-50/80 overflow-x-hidden ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            {/* Line-drawn hearts background (same as Find Your Soulmate / footer, looping) */}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                    
                    {/* Left: Content */}
                    <div className="order-2 lg:order-1 lg:col-span-5">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-orange-500 mb-6">
                            {t('whoAreWe')}
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed mb-6">
                            {t('whoAreWePara1')}
                        </p>
                        <p className="text-slate-600 text-lg leading-relaxed mb-6">
                            {t('whoAreWePara2')}
                        </p>
                        <ul className="space-y-3 text-slate-600">
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                {t('whoAreWeBullet1')}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                {t('whoAreWeBullet2')}
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                                {t('whoAreWeBullet3')}
                            </li>
                        </ul>
                    </div>

                    {/* Right: Image & Floating Hearts */}
                    <div className="order-1 lg:order-2 relative flex justify-center lg:justify-end lg:col-span-7">
                        
                        {/* --- Background Animated Hearts --- */}
                        {/* Top Left Heart */}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="absolute -top-10 -left-6 md:-top-12 md:-left-12 w-20 h-20 md:w-28 md:h-28 text-rose-200 animate-bounce -z-10"
                            style={{ animationDuration: '4s' }}
                        >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>

                        {/* Bottom Right Heart */}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="absolute -bottom-8 -right-4 md:-bottom-14 md:-right-8 w-16 h-16 md:w-24 md:h-24 text-rose-300 animate-pulse -z-10"
                            style={{ animationDuration: '3s' }}
                        >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>

                        {/* Top Right Heart (Small) */}
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="currentColor" 
                            className="absolute -top-4 -right-2 md:top-10 md:-right-12 w-10 h-10 md:w-16 md:h-16 text-rose-200 animate-bounce -z-10"
                            style={{ animationDuration: '5s', animationDelay: '1s' }}
                        >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                        {/* --------------------------------- */}

                        {/* Main Image Container */}
                        <div className="relative w-full h-[400px] md:h-[600px] lg:h-[750px] z-10 overflow-hidden">
                            <Image
                                src="/who.png"
                                alt={t('whoAreWe')}
                                fill
                                className="object-cover object-center"
                                sizes="(max-width: 1024px) 100vw, 60vw"
                            />
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}