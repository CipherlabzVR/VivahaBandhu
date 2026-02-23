'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

const COLUMN_DELAY_MS = 90;
const HIDDEN_LENGTH = 500;

/** Same line-drawn heart path as loading screen (single stroke with tails) */
const HEART_PATH =
  'M 5 25 ' +
  'C 15 45, 45 50, 60 35 ' +
  'C 75 20, 80 5, 60 15 ' +
  'C 40 5, 45 20, 60 35 ' +
  'C 75 50, 105 45, 115 25';

export default function Footer() {
    const { t } = useLanguage();
    const ref = useRef<HTMLElement>(null);
    const pathRef = useRef<SVGPathElement>(null);
    const [inView, setInView] = useState(false);
    const [pathLength, setPathLength] = useState<number | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setInView(true);
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const path = pathRef.current;
        if (path) setPathLength(path.getTotalLength());
    }, []);

    const colClass = (index: number) =>
        `transition-all duration-500 ease-out ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`;
    const colStyle = (index: number) =>
        inView ? { transitionDelay: `${index * COLUMN_DELAY_MS}ms` } : { transitionDelay: '0ms' };

    const length = pathLength ?? HIDDEN_LENGTH;
    const drawReady = pathLength !== null && inView;

    return (
        <footer ref={ref} className="relative bg-text-dark text-white py-16 px-4 overflow-hidden">
            {/* Background: line-drawn hearts with same drawing animation as loading screen */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
                {/* Heart 1 - left, large */}
                <div className="absolute left-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.38]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            ref={pathRef}
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                '--heart-length': length,
                                animationDuration: '2s',
                                animationDelay: '0ms',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
                {/* Heart 2 - right, large, draws after first */}
                <div className="absolute right-[-5%] top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.38] scale-x-[-1]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                '--heart-length': length,
                                animationDuration: '2s',
                                animationDelay: '0.4s',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
                {/* Heart 3 - center bottom, smaller */}
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[200px] md:w-[240px] opacity-[0.28]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            d={HEART_PATH}
                            stroke="#F97316"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                            className={drawReady ? 'animate-heart-draw' : ''}
                            style={{
                                strokeDasharray: length,
                                strokeDashoffset: length,
                                '--heart-length': length,
                                animationDuration: '1.8s',
                                animationDelay: '0.8s',
                            } as React.CSSProperties}
                        />
                    </svg>
                </div>
            </div>
            <div className="relative z-10 max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                <div className={colClass(0)} style={colStyle(0)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo3.png" alt="MyMatch.lk" className="h-10 md:h-12 w-auto mb-4 object-contain" />
                    <p className="text-gray-300 mb-6">{t('footerTagline')}</p>
                    <div className="flex gap-4 flex-wrap">
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white" aria-label="Facebook">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white" aria-label="Instagram">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white" aria-label="Twitter">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white" aria-label="YouTube">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors text-white hover:scale-110 transition-transform" aria-label="Made with love">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </a>
                    </div>
                </div>
                <div className={colClass(1)} style={colStyle(1)}>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('quickLinks')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#profiles" className="text-gray-300 hover:text-primary transition-colors">{t('browseProfiles')}</Link></li>
                        <li><Link href="#how-it-works" className="text-gray-300 hover:text-primary transition-colors">{t('howItWorks')}</Link></li>
                        <li><Link href="#matchmaker" className="text-gray-300 hover:text-primary transition-colors">{t('forMatchmakers')}</Link></li>
                        <li><Link href="#pricing" className="text-gray-300 hover:text-primary transition-colors">{t('pricingPlans')}</Link></li>
                    </ul>
                </div>
                <div className={colClass(2)} style={colStyle(2)}>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('support')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('helpCenter')}</Link></li>
                        <li><Link href="/contact" className="text-gray-300 hover:text-primary transition-colors">{t('contactUs')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('safetyTips')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('reportMisuse')}</Link></li>
                    </ul>
                </div>
                <div className={colClass(3)} style={colStyle(3)}>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('legal')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('privacyPolicy')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('termsOfService')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('cookiePolicy')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('refundPolicy')}</Link></li>
                    </ul>
                </div>
            </div>
            <div
                className={`relative z-10 max-w-[1400px] mx-auto border-t border-white/10 pt-8 text-center text-gray-400 transition-all duration-500 ease-out ${
                    inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={inView ? { transitionDelay: `${4 * COLUMN_DELAY_MS}ms` } : { transitionDelay: '0ms' }}
            >
                <p>{t('allRightsReserved')}</p>
                <p className="mt-2">{t('madeWithLove')}</p>
                <p className="mt-4 text-gray-500 text-sm">Design by Clovesis</p>
            </div>
        </footer>
    );
}
