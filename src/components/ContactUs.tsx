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

export default function ContactUs() {
    const { t, language } = useLanguage();
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number | null>(null);
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', message: '' });

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder: could send to API or mailto
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <section className={`relative min-h-screen bg-[#F8F7F4] py-24 md:py-32 px-4 overflow-x-hidden ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            {/* Floating heart keyframes */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes float-slow-contact {
                    0%, 100% { transform: translateY(0) scale(1) rotate(-5deg); }
                    50% { transform: translateY(-20px) scale(1.05) rotate(5deg); }
                }
                @keyframes float-fast-contact {
                    0%, 100% { transform: translateY(0) scale(1) rotate(5deg); }
                    50% { transform: translateY(-30px) scale(0.95) rotate(-5deg); }
                }
            `}} />
            {/* Heart clipPath for filled hearts */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <defs>
                    <clipPath id="contact-heart-clip" clipPathUnits="objectBoundingBox">
                        <path d="M 0.5 0.2 C 0.5 -0.05, 0 -0.05, 0 0.35 C 0 0.7, 0.5 0.95, 0.5 1 C 0.5 0.95, 1 0.7, 1 0.35 C 1 -0.05, 0.5 -0.05, 0.5 0.2 Z" />
                    </clipPath>
                </defs>
            </svg>
            {/* Floating filled heart SVGs (background) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[15%] left-[8%] w-24 md:w-36 aspect-[1.15/1] bg-orange-400/25"
                    style={{ clipPath: 'url(#contact-heart-clip)', animation: 'float-slow-contact 8s ease-in-out infinite' }}
                />
                <div
                    className="absolute top-[25%] right-[10%] w-20 md:w-28 aspect-[1.15/1] bg-orange-500/20"
                    style={{ clipPath: 'url(#contact-heart-clip)', animation: 'float-fast-contact 7s ease-in-out infinite 1s' }}
                />
                <div
                    className="absolute bottom-[20%] left-[15%] w-20 md:w-32 aspect-[1.15/1] bg-orange-400/20"
                    style={{ clipPath: 'url(#contact-heart-clip)', animation: 'float-slow-contact 6s ease-in-out infinite 0.5s' }}
                />
                <div
                    className="absolute bottom-[25%] right-[12%] w-28 md:w-40 aspect-[1.15/1] bg-orange-500/25"
                    style={{ clipPath: 'url(#contact-heart-clip)', animation: 'float-fast-contact 9s ease-in-out infinite 2s' }}
                />
            </div>
            {/* Line-drawn hearts background (same as footer / Success Stories, looping) */}
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

            <div className="relative z-10 max-w-6xl mx-auto border border-white/40 rounded-lg bg-white/5 backdrop-blur-xl overflow-hidden shadow-sm">
                <div className="pt-8 md:pt-12 pb-4 text-center">
                    <h1 className={`font-bold text-primary font-dancing-script drop-shadow-sm whitespace-nowrap ${language === 'si' ? 'text-4xl md:text-5xl lg:text-6xl' : 'text-[5.5rem] md:text-[8rem] lg:text-[10rem]'}`}>
                        {t('getInTouch')}
                    </h1>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 p-8 md:p-12 lg:p-16 pt-4">
                    {/* Left column - Intro & contact info */}
                    <div className="flex flex-col justify-center">
                        <p className="text-slate-800 text-base leading-relaxed mb-8 max-w-md">
                            {t('contactCareDetail')}
                        </p>
                        <a
                            href={`mailto:${t('contactEmail')}`}
                            className="inline-flex items-center gap-2 text-slate-800 hover:text-primary transition-colors mb-8"
                        >
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="underline">{t('contactEmail')}</span>
                        </a>
                        <div className="flex gap-4">
                            <a href="#" className="text-slate-700 hover:text-primary transition-colors" aria-label="Facebook">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            </a>
                            <a href="#" className="text-slate-700 hover:text-primary transition-colors" aria-label="Instagram">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                            <a href="#" className="text-slate-700 hover:text-primary transition-colors" aria-label="LinkedIn">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            </a>
                        </div>
                    </div>

                    {/* Right column - Contact form */}
                    <div className="bg-white rounded-lg p-6 md:p-8 shadow-sm border border-slate-200">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-slate-800 mb-1">
                                        {t('firstName')}
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-slate-800 mb-1">
                                        {t('lastName')}
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1">
                                    {t('emailRequired')}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-slate-800 mb-1">
                                    {t('messageLabel')}
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[120px]"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-medium rounded transition-colors"
                            >
                                {t('sendButton')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
