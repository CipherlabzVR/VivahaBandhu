'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import CustomDropdown from './CustomDropdown';

interface HeroProps {
    onOpenRegister: () => void;
    onOpenLogin: () => void;
}

export default function Hero({ onOpenRegister, onOpenLogin }: HeroProps) {
    const router = useRouter();
    const { language, t } = useLanguage();
    const [search, setSearch] = useState({
        gender: 'Bride',
        ageFrom: '20',
        ageTo: '30',
        religion: 'Any',
        district: 'Any'
    });

    const handleChange = (name: string, value: string) => {
        setSearch({ ...search, [name]: value });
    };

    const handleSearch = () => {
        const query = new URLSearchParams(search).toString();
        router.push(`/search?${query}`);
    };

    return (
        <section className="relative min-h-screen bg-cream overflow-hidden pt-20">
            <video
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute top-0 right-0 w-1/2 h-full object-cover opacity-90 z-0"
                style={{
                    clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)'
                }}
                onLoadedData={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.play().catch(() => {
                        // Autoplay failed, but video is loaded
                    });
                }}
            >
                <source src="/hero.mp4" type="video/mp4" />
            </video>
            
            {/* Glassmorphism overlay for white background area with blur */}
            <div className="absolute top-0 left-0 w-1/2 h-full bg-white/50 backdrop-blur-2xl z-[1]"></div>
            
            {/* Animated Heart Decorations - Left Side (White Background Area) */}
            <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
                {/* Left side hearts */}
                <div className="absolute top-20 left-10 w-16 h-16 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '0s', animationDuration: '6s' }}>
                    <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <div className="absolute bottom-40 left-16 w-14 h-14 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '4s', animationDuration: '7s' }}>
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <div className="absolute top-1/3 left-32 w-14 h-14 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '5s', animationDuration: '8s' }}>
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                
                {/* Right side of white background area hearts */}
                <div className="absolute top-32 left-[45%] w-14 h-14 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '1.5s', animationDuration: '7s' }}>
                    <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <div className="absolute bottom-52 left-[48%] w-16 h-16 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '0.5s', animationDuration: '8.5s' }}>
                    <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <div className="absolute top-1/4 left-[46%] w-16 h-16 rounded-full flex items-center justify-center animate-float" style={{ animationDelay: '5.5s', animationDuration: '9.5s' }}>
                    <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
            </div>
            
            <div className={`relative z-10 max-w-[1400px] mx-auto px-4 py-20 flex flex-col min-h-[calc(100vh-80px)] ${language === 'si' ? 'font-sinhala' : ''}`} style={{ position: 'relative', zIndex: 10 }}>
                <div className="text-text-dark flex-1 flex flex-col justify-center">
                    <h1 className={`mb-6 leading-tight text-text-dark ${
                        language === 'en' 
                            ? 'font-playfair font-bold text-4xl md:text-5xl lg:text-6xl' 
                            : 'font-sinhala font-bold text-2xl md:text-3xl lg:text-4xl'
                    }`}>
                        {language === 'en' ? (
                            <>
                                Find Your <span className="font-dancing-script text-primary relative text-5xl md:text-6xl lg:text-7xl font-semibold">{t('heroTitlePerfect')} <br /> {t('heroTitlePartner')}</span> with Confidence
                            </>
                        ) : (
                            <>
                                විශ්වාසයෙන් ඔබේ <span className="font-sinhala text-primary relative text-3xl md:text-4xl lg:text-5xl font-semibold">{t('heroTitlePerfect')} <br /> {t('heroTitlePartner')}</span> සොයන්න
                            </>
                        )}
                    </h1>
                    <p className={`text-lg md:text-xl mb-8 max-w-lg leading-relaxed text-text-light ${language === 'si' ? 'font-sinhala' : ''}`}>
                        {t('heroDescription')}
                    </p>
                    <div className="flex gap-4 flex-wrap mb-12">
                        <button className="px-8 py-4 bg-primary text-white rounded-full font-semibold hover:bg-white hover:text-primary transition-colors flex items-center gap-2" onClick={onOpenRegister}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('createFreeProfile')}
                        </button>
                        <button className="px-8 py-4 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors flex items-center gap-2" onClick={onOpenLogin}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {t('searchProfiles')}
                        </button>
                    </div>
                    <div className="flex gap-8 md:gap-12 flex-wrap pt-8">
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 text-primary">50,000+</h3>
                            <p className="text-sm md:text-base text-text-light">{t('verifiedProfiles')}</p>
                        </div>
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 text-primary">15,000+</h3>
                            <p className="text-sm md:text-base text-text-light">{t('successStoriesCount')}</p>
                        </div>
                        <div>
                            <h3 className="text-3xl md:text-4xl font-bold mb-2 text-primary">500+</h3>
                            <p className="text-sm md:text-base text-text-light">{t('trustedMatchmakers')}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-white/20 w-full mt-8">
                    <h3 className="text-xl font-playfair font-bold mb-4 text-text-dark text-center">{t('quickSearch')}</h3>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[150px]">
                            <CustomDropdown
                                name="gender"
                                value={search.gender}
                                onChange={handleChange}
                                options={[
                                    { value: 'Bride', label: 'Bride' },
                                    { value: 'Groom', label: 'Groom' }
                                ]}
                                label={t('imLookingFor')}
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <CustomDropdown
                                name="ageFrom"
                                value={search.ageFrom}
                                onChange={handleChange}
                                options={[18, 20, 22, 24, 26, 28, 30, 35, 40, 45, 50].map(age => ({
                                    value: age.toString(),
                                    label: age.toString()
                                }))}
                                label={t('ageFrom')}
                            />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                            <CustomDropdown
                                name="ageTo"
                                value={search.ageTo}
                                onChange={handleChange}
                                options={[20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60].map(age => ({
                                    value: age.toString(),
                                    label: age.toString()
                                }))}
                                label={t('ageTo')}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <CustomDropdown
                                name="religion"
                                value={search.religion}
                                onChange={handleChange}
                                options={[
                                    { value: 'Any', label: 'Any' },
                                    { value: 'Buddhist', label: 'Buddhist' },
                                    { value: 'Hindu', label: 'Hindu' },
                                    { value: 'Christian', label: 'Christian' },
                                    { value: 'Catholic', label: 'Catholic' },
                                    { value: 'Muslim', label: 'Muslim' },
                                    { value: 'Other', label: 'Other' }
                                ]}
                                label={t('religion')}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <CustomDropdown
                                name="district"
                                value={search.district}
                                onChange={handleChange}
                                options={[
                                    { value: 'Any', label: 'Any' },
                                    { value: 'Colombo', label: 'Colombo' },
                                    { value: 'Gampaha', label: 'Gampaha' },
                                    { value: 'Kandy', label: 'Kandy' },
                                    { value: 'Kalutara', label: 'Kalutara' },
                                    { value: 'Galle', label: 'Galle' },
                                    { value: 'Matara', label: 'Matara' },
                                    { value: 'Kurunegala', label: 'Kurunegala' },
                                    { value: 'Negombo', label: 'Negombo' },
                                    { value: 'Jaffna', label: 'Jaffna' },
                                    { value: 'Anuradhapura', label: 'Anuradhapura' },
                                    { value: 'Moratuwa', label: 'Moratuwa' },
                                    { value: 'Batticaloa', label: 'Batticaloa' }
                                ]}
                                label={t('district')}
                            />
                        </div>
                        <div className="min-w-[150px]">
                            <button className="w-full px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg" onClick={handleSearch}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {t('searchNow')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
