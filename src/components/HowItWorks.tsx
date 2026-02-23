'use client';

import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const HEART_PATH =
    'M 5 25 ' +
    'C 15 45, 45 50, 60 35 ' +
    'C 75 20, 80 5, 60 15 ' +
    'C 40 5, 45 20, 60 35 ' +
    'C 75 50, 105 45, 115 25';

const HIDDEN_LENGTH = 320;

export default function HowItWorks() {
    const { t } = useLanguage();
    const sectionRef = useRef<HTMLElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const [inView, setInView] = useState(false);
    const [pathLength, setPathLength] = useState<number | null>(null);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setInView(true);
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const path = pathRef.current;
        if (path) setPathLength(path.getTotalLength());
    }, []);

    const length = pathLength ?? HIDDEN_LENGTH;
    const drawReady = pathLength !== null && inView;

    return (
        <section
            ref={sectionRef}
            className="py-24 px-4 relative bg-cream overflow-hidden"
            id="how-it-works"
            style={{
                backgroundImage: 'url(/how.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-primary/70 z-0"></div>

            {/* Line-drawn hearts - same layout as footer (sides + bottom), white animated */}
            <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center overflow-hidden">
                {/* Heart 1 - left, large */}
                <div className="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                        <path d={HEART_PATH} stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ filter: 'blur(3px)' }} />
                        <path
                            ref={pathRef}
                            d={HEART_PATH}
                            stroke="#ffffff"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw-loop' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                ['--heart-length' as string]: `${length}`,
                                animationDuration: '3s',
                                animationDelay: '0ms',
                                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 0 8px rgba(255,255,255,0.25))',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
                {/* Heart 2 - right, large, mirrored */}
                <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] scale-x-[-1]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                        <path d={HEART_PATH} stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ filter: 'blur(3px)' }} />
                        <path
                            d={HEART_PATH}
                            stroke="#ffffff"
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw-loop' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                ['--heart-length' as string]: `${length}`,
                                animationDuration: '3s',
                                animationDelay: '0.4s',
                                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 0 8px rgba(255,255,255,0.25))',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
                {/* Heart 3 - center bottom, smaller */}
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[200px] md:w-[240px]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                        <path d={HEART_PATH} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ filter: 'blur(2px)' }} />
                        <path
                            d={HEART_PATH}
                            stroke="#ffffff"
                            strokeWidth="0.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw-loop' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                ['--heart-length' as string]: `${length}`,
                                animationDuration: '2.8s',
                                animationDelay: '0.8s',
                                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.2))',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
            </div>

            <div className="relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-playfair font-bold text-white mb-4">{t('howItWorks')}</h2>
                    <p className="text-white text-lg md:text-xl">{t('howItWorksDesc')}</p>
                </div>
                <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold font-playfair">1</div>
                    <h4 className="text-xl font-playfair font-semibold mb-3 text-text-dark">{t('createAccount')}</h4>
                    <p className="text-text-light">{t('createAccountDesc')}</p>
                </div>
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold font-playfair">2</div>
                    <h4 className="text-xl font-playfair font-semibold mb-3 text-text-dark">{t('createProfile')}</h4>
                    <p className="text-text-light">{t('createProfileDesc')}</p>
                </div>
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold font-playfair">3</div>
                    <h4 className="text-xl font-playfair font-semibold mb-3 text-text-dark">{t('browseMatch')}</h4>
                    <p className="text-text-light">{t('browseMatchDesc')}</p>
                </div>
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm hover:shadow-lg transition-shadow">
                    <div className="w-20 h-20 mx-auto mb-6 bg-primary text-white rounded-full flex items-center justify-center text-3xl font-bold font-playfair">4</div>
                    <h4 className="text-xl font-playfair font-semibold mb-3 text-text-dark">{t('connect')}</h4>
                    <p className="text-text-light">{t('connectDesc')}</p>
                </div>
                </div>
            </div>
        </section>
    );
}
