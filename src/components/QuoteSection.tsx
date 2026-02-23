'use client';

import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

export default function QuoteSection() {
    const { t, language } = useLanguage();
    return (
        <section className={`relative py-0 bg-orange-500 overflow-hidden ${language === 'si' ? 'font-sinhala-sm' : ''}`}>
            
            {/* --- Custom CSS for floating and glowing --- */}
            {/* We add this style block here so it's self-contained and doesn't require config changes */}
            <style jsx>{`
                @keyframes float-1 {
                    0%, 100% { transform: translate(0px, 0px) rotate(-15deg); }
                    50% { transform: translate(20px, -30px) rotate(-5deg); }
                }
                @keyframes float-2 {
                    0%, 100% { transform: translate(0px, 0px) rotate(10deg) scale(1); }
                    50% { transform: translate(-25px, 20px) rotate(20deg) scale(1.1); }
                }
                @keyframes float-3 {
                     0% { transform: translate(0px, 0px) rotate(25deg); }
                     33% { transform: translate(30px, 10px) rotate(30deg); }
                     66% { transform: translate(-10px, 30px) rotate(20deg); }
                     100% { transform: translate(0px, 0px) rotate(25deg); }
                }
                
                .heart-glow {
                    /* Creates the soft outer glow around the SVG shape */
                    filter: drop-shadow(0 0 12px rgba(255, 255, 255, 0.7));
                }

                /* Long durations for gentle movement */
                .animate-float-1 { animation: float-1 18s ease-in-out infinite alternate; }
                .animate-float-2 { animation: float-2 15s ease-in-out infinite alternate; }
                .animate-float-3 { animation: float-3 22s linear infinite; }
            `}</style>

            {/* --- Background White Hearts --- */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Top Left - Large */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                    // Replaced static rotation/pulse with custom float class and glow class
                    className="absolute -top-12 -left-12 w-48 h-48 text-white/30 heart-glow animate-float-1" 
                >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                
                {/* Bottom Right - Medium */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                    className="absolute -bottom-10 -right-10 w-32 h-32 text-white/30 heart-glow animate-float-2" 
                    style={{ animationDelay: '-5s' }} // Negative delay starts animation mid-way
                >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>

                 {/* Top Right center - Small */}
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                    className="absolute top-1/4 right-1/4 w-16 h-16 text-white/40 heart-glow animate-float-3" 
                    style={{ animationDelay: '-2s' }}
                >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                 
                 {/* Bottom Left center - Small */}
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                    className="absolute bottom-1/4 left-1/3 w-20 h-20 text-white/40 heart-glow animate-float-1" 
                    style={{ animationDelay: '-10s', animationDuration: '25s' }} // Varying speed
                >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
            </div>
            {/* --------------------------- */}

            {/* Content sits on z-10 */}
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-8 lg:gap-16 items-center">
                    
                    {/* Left: Image */}
                    <div className="flex justify-center lg:justify-start order-2 lg:order-1 p-0">
                        <div className="relative w-full max-w-[480px] aspect-[4/3] lg:aspect-[3/4]">
                            <Image
                                src="/q.jpg"
                                alt="Pure love"
                                fill
                                className="object-contain object-center"
                                sizes="(max-width: 1024px) 90vw, 480px"
                            />
                        </div>
                    </div>

                    {/* Right: Quote */}
                    <div className="order-1 lg:order-2 flex flex-col justify-center py-12 lg:py-24">
                        <blockquote className="text-white text-xl md:text-2xl lg:text-3xl xl:text-4xl leading-relaxed font-light italic pl-0">
                            {t('pureLoveQuote')}
                        </blockquote>
                    </div>
                    
                </div>
            </div>
        </section>
    );
}