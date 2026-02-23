'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

export default function AboutHero() {
    const { t, language } = useLanguage();
    return (
        <section className={`relative min-h-screen bg-white overflow-hidden flex items-center ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            
            {/* --- Custom Animations for Floating Hearts --- */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) scale(1) rotate(-5deg); }
                    50% { transform: translateY(-20px) scale(1.05) rotate(5deg); }
                }
                @keyframes float-fast {
                    0%, 100% { transform: translateY(0) scale(1) rotate(5deg); }
                    50% { transform: translateY(-30px) scale(0.95) rotate(-5deg); }
                }
            `}} />

            {/* --- SVG Definitions (hearts only) --- */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <defs>
                    <clipPath id="standard-heart" clipPathUnits="objectBoundingBox">
                        <path d="M 0.5 0.2 C 0.5 -0.05, 0 -0.05, 0 0.35 C 0 0.7, 0.5 0.95, 0.5 1 C 0.5 0.95, 1 0.7, 1 0.35 C 1 -0.05, 0.5 -0.05, 0.5 0.2 Z" />
                    </clipPath>
                </defs>
            </svg>

            {/* --- Background Glows --- */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
            <div className="absolute bottom-0 left-[20%] w-[600px] h-[600px] bg-pink-200/20 rounded-full blur-3xl translate-y-1/3 z-0 pointer-events-none"></div>

            {/* --- Animated Glassmorphism Heart 1 (Top Left) --- */}
            <div 
                className="absolute top-[10%] left-[5%] w-40 md:w-56 aspect-[1.15/1] bg-orange-500/30 backdrop-blur-md z-10 shadow-[0_8px_32px_0_rgba(251,146,60,0.2)] border border-orange-300/30"
                style={{ 
                    clipPath: 'url(#standard-heart)',
                    animation: 'float-slow 8s ease-in-out infinite'
                }}
            />

            {/* --- Animated Glassmorphism Heart 2 (Bottom Left) --- */}
            <div 
                className="absolute bottom-[15%] left-[20%] w-32 md:w-48 aspect-[1.15/1] bg-orange-600/25 backdrop-blur-lg z-10 border border-orange-400/20"
                style={{ 
                    clipPath: 'url(#standard-heart)',
                    animation: 'float-fast 6s ease-in-out infinite'
                }}
            />

            {/* --- Right Side: About hero image --- */}
            <div className="absolute right-0 top-0 h-full w-full lg:w-[65%] z-0 flex items-end justify-end pr-0 lg:pr-8 lg:pl-4 pb-8 lg:pb-12">
                <div className="relative w-full max-w-[860px] h-[95vh] max-h-[960px] min-h-[480px] mx-auto lg:mx-0 lg:mr-0 mb-[-10vh]">
                    <Image
                        src="/abouthero.png"
                        alt={t('aboutUs')}
                        fill
                        className="object-contain object-center rounded-lg"
                        sizes="(max-width: 1024px) 90vw, 860px"
                        priority
                    />
                </div>
            </div>

            {/* --- Left Side: Content Container --- */}
            <div className="relative z-30 max-w-[1400px] mx-auto w-full px-4 py-16 lg:pl-12">
                <div className="flex flex-col justify-center max-w-xl lg:max-w-2xl">
                    <h1 className="leading-tight mb-4 md:mb-6">
                        <span className={`font-dancing-script text-orange-500 text-[5.5rem] md:text-[8rem] lg:text-[10rem] font-bold drop-shadow-sm block -ml-2 ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
                            {t('aboutUs')}
                        </span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-md mb-10 font-light relative z-10">
                        {t('aboutHeroDesc')}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center px-10 py-4 bg-orange-500 text-white rounded-full font-semibold hover:bg-orange-600 transition-all duration-300 w-fit shadow-[0_8px_20px_-6px_rgba(249,115,22,0.6)] hover:shadow-[0_12px_25px_-6px_rgba(249,115,22,0.8)] hover:-translate-y-1"
                    >
                        {t('backToHome')}
                    </Link>
                </div>
            </div>
            
        </section>
    );
}