'use client';

import { useLanguage } from '../context/LanguageContext';

export default function HowItWorks() {
    const { t } = useLanguage();
    return (
        <section className="py-24 px-4 relative bg-cream overflow-hidden" id="how-it-works" style={{
            backgroundImage: 'url(/how.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
        }}>
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-primary/70 z-0"></div>
            
            {/* Animated White Hearts */}
            <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
                {/* Heart 1 - Small */}
                <div className="absolute top-16 left-8 w-8 h-8 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '0s', animationDuration: '12s' }}>
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 2 - Medium */}
                <div className="absolute top-1/4 right-16 w-12 h-12 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1.5s', animationDuration: '14s' }}>
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 3 - Large */}
                <div className="absolute bottom-40 left-1/4 w-16 h-16 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '0.8s', animationDuration: '15s' }}>
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 4 - Small */}
                <div className="absolute top-1/2 right-1/3 w-9 h-9 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '2.5s', animationDuration: '13s' }}>
                    <svg className="w-4.5 h-4.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 5 - Medium */}
                <div className="absolute bottom-24 right-12 w-11 h-11 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '3.2s', animationDuration: '16s' }}>
                    <svg className="w-5.5 h-5.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 6 - Small */}
                <div className="absolute top-3/4 left-1/3 w-7 h-7 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1.8s', animationDuration: '14.5s' }}>
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 7 - Large */}
                <div className="absolute top-10 right-1/4 w-14 h-14 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '4s', animationDuration: '17s' }}>
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 8 - Medium */}
                <div className="absolute bottom-16 left-1/2 w-10 h-10 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '2.2s', animationDuration: '13.5s' }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 9 - Small */}
                <div className="absolute top-2/3 right-8 w-6 h-6 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '3.8s', animationDuration: '15.5s' }}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                {/* Heart 10 - Medium */}
                <div className="absolute bottom-32 left-12 w-13 h-13 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1.2s', animationDuration: '16.5s' }}>
                    <svg className="w-6.5 h-6.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
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
