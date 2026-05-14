'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import CustomDropdown from './CustomDropdown';
import { MATRIMONIAL_RELIGION_OPTIONS } from '../constants/matrimonialReligions';
import {
    formatHeroStatCount,
    useHeroLiveStats,
} from '../hooks/useHeroLiveStats';
import { validateMatrimonialSearchAge } from '../utils/matrimonialSearchAge';
import {
    DEFAULT_QUICK_SEARCH,
    readQuickSearchSession,
    writeQuickSearchSession,
} from '../utils/quickSearchSession';
import { showToast } from '../utils/toast';

const DEFAULT_HERO_STATS = {
    verifiedProfiles: 50_000,
    successStories: 15_000,
    trustedMatchmakers: 500,
} as const;

const HERO_BG_VIDEO =
    'https://res.cloudinary.com/dbyuqt5xh/video/upload/q_auto/f_auto/v1777450897/Animate_flakes_move_river_202604291348_rszmkk.mp4';
const HERO_COUPLE_IMG =
    'https://res.cloudinary.com/df52tya8p/image/upload/q_auto/f_auto/v1777957492/Picsart_26-05-05_10-30-47-506_gxogmo.webp';

interface HeroProps {
    onOpenRegister: () => void;
    onOpenLogin: () => void;
    onOpenSubscription: () => void;
}

function ShieldIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 15c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5zm4-5H8v-2h8v2zm0-4H8V8h8v3z" />
        </svg>
    );
}

export default function Hero({ onOpenRegister, onOpenLogin, onOpenSubscription }: HeroProps) {
    const router = useRouter();
    const { language, t } = useLanguage();
    const { user } = useAuth();
    const { stats: heroStats } = useHeroLiveStats({
        verifiedProfiles: DEFAULT_HERO_STATS.verifiedProfiles,
        successStories: DEFAULT_HERO_STATS.successStories,
        trustedMatchmakers: DEFAULT_HERO_STATS.trustedMatchmakers,
    });

    const heroVideoRef = useRef<HTMLVideoElement | null>(null);
    const [heroQuery, setHeroQuery] = useState('');
    const [search, setSearch] = useState({ ...DEFAULT_QUICK_SEARCH });

    useEffect(() => {
        const saved = readQuickSearchSession();
        if (saved) setSearch(saved);
    }, []);

    useEffect(() => {
        let retryTimer: ReturnType<typeof setInterval> | null = null;
        let retryCount = 0;

        const ensurePlay = () => {
            const video = heroVideoRef.current;
            if (!video) return;
            video.muted = true;
            video.defaultMuted = true;
            video.play().catch(() => {});
        };

        ensurePlay();
        retryTimer = setInterval(() => {
            retryCount += 1;
            ensurePlay();
            if (retryCount >= 8 && retryTimer) {
                clearInterval(retryTimer);
            }
        }, 400);

        const onVisibilityChange = () => {
            if (!document.hidden) ensurePlay();
        };

        window.addEventListener('focus', ensurePlay);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            if (retryTimer) clearInterval(retryTimer);
            window.removeEventListener('focus', ensurePlay);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    const handleChange = (name: string, value: string) => {
        setSearch({ ...search, [name]: value });
    };

    const handleSearch = () => {
        const ageCheck = validateMatrimonialSearchAge(search.ageFrom, search.ageTo);
        if (!ageCheck.ok) {
            showToast(ageCheck.message, 'error');
            return;
        }
        writeQuickSearchSession(search);
        const query = new URLSearchParams(search).toString();
        router.push(`/search?${query}`);
    };

    const handleHeroInlineSearch = () => {
        const q = heroQuery.trim();
        if (q) {
            router.push(`/search?q=${encodeURIComponent(q)}`);
        } else {
            router.push('/search');
        }
    };

    const scrollToHowItWorks = () => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    };

    const statRowClass = 'flex gap-4 items-start';
    const statsPanelClass =
        'rounded-3xl border border-white/50 bg-white/30 p-6 shadow-xl backdrop-blur-xl ring-1 ring-inset ring-white/25 md:p-8';

    return (
        <section className="relative min-h-screen overflow-hidden pt-20 bg-cream">
            <video
                ref={heroVideoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="absolute inset-0 z-0 h-full w-full object-cover"
                onLoadedData={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.play().catch(() => {});
                }}
            >
                <source src={HERO_BG_VIDEO} type="video/mp4" />
            </video>

            {/* Full hero: cream/white lifts from bottom (entire section, not image-only) */}
            <div
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                    background:
                        'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.96) 8%, rgba(253,248,243,0.92) 16%, rgba(255,255,255,0.72) 28%, rgba(255,255,255,0.38) 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                }}
                aria-hidden
            />
            <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/32 via-black/18 to-black/8"
                aria-hidden
            />

            <div
                className={`relative z-10 mx-auto max-w-[1400px] px-4 pb-10 ${language === 'si' ? 'font-sinhala' : ''}`}
            >
                <div className="isolate grid min-h-[calc(100vh-120px)] items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-14 lg:py-14 lg:pb-8 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
                    <div className="relative z-30 rounded-3xl border border-primary/55 bg-black/82 p-6 shadow-2xl backdrop-blur-md md:backdrop-blur-lg md:p-8 lg:-translate-y-20 lg:p-10 xl:-translate-y-32">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1.5">
                            <ShieldIcon className="h-4 w-4 shrink-0 text-white" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-white">
                                {t('heroTrustBadge')}
                            </span>
                        </div>

                        <h1
                            className={`mb-6 leading-tight text-white ${
                                language === 'en'
                                    ? 'font-playfair text-4xl font-bold md:text-5xl lg:text-6xl'
                                    : 'font-sinhala text-2xl font-bold md:text-3xl lg:text-4xl'
                            }`}
                        >
                            {language === 'en' ? (
                                <>
                                    Find Your{' '}
                                    <span
                                        className="font-dancing-script relative text-5xl font-semibold text-primary md:text-6xl lg:text-7xl [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_14px_rgba(0,0,0,0.55)]"
                                    >
                                        {t('heroTitlePerfect')} <br /> {t('heroTitlePartner')}
                                    </span>{' '}
                                    with Confidence
                                </>
                            ) : (
                                <>
                                    විශ්වාසයෙන් ඔබේ{' '}
                                    <span
                                        className="relative font-sinhala text-3xl font-semibold text-primary md:text-4xl lg:text-5xl [text-shadow:0_1px_3px_rgba(0,0,0,0.95),0_2px_12px_rgba(0,0,0,0.55)]"
                                    >
                                        {t('heroTitlePerfect')} <br /> {t('heroTitlePartner')}
                                    </span>{' '}
                                    සොයන්න
                                </>
                            )}
                        </h1>

                        <p
                            className={`mb-6 max-w-xl text-lg leading-relaxed text-white/85 md:text-xl lg:max-w-none ${language === 'si' ? 'font-sinhala' : ''}`}
                        >
                            {t('heroDescription')}
                        </p>

                        <div className="mb-6 flex overflow-hidden rounded-2xl border border-white/25 bg-white shadow-sm">
                            <input
                                type="search"
                                value={heroQuery}
                                onChange={(e) => setHeroQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleHeroInlineSearch();
                                    }
                                }}
                                placeholder={t('heroNameSearchPlaceholder')}
                                className="min-w-0 flex-1 border-0 bg-white px-4 py-3.5 text-text-dark placeholder:text-text-light/80 focus:outline-none focus:ring-0"
                                autoComplete="off"
                            />
                            <button
                                type="button"
                                onClick={handleHeroInlineSearch}
                                className="shrink-0 bg-primary px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark md:px-7"
                            >
                                {t('heroInlineSearch')}
                            </button>
                        </div>

                        <div className="mb-2 flex flex-wrap gap-4">
                            {user ? (
                                user.isSubscribed ? (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark hover:shadow-md"
                                        onClick={() => router.push('/search')}
                                    >
                                        <svg
                                            className="h-5 w-5 shrink-0"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            strokeWidth={2}
                                            aria-hidden
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                        {t('heroBrowsePartners')}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark hover:shadow-md"
                                        onClick={onOpenSubscription}
                                    >
                                        <svg
                                            className="h-5 w-5 shrink-0"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                            aria-hidden
                                        >
                                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                        </svg>
                                        {t('heroUpgradeToPremium')}
                                    </button>
                                )
                            ) : (
                                <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-white transition-colors hover:bg-white hover:text-primary"
                                    onClick={onOpenRegister}
                                >
                                    <svg
                                        className="h-5 w-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                                        />
                                    </svg>
                                    {t('createFreeProfile')}
                                </button>
                            )}
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-full border-2 border-white/90 px-8 py-4 font-semibold text-white transition-colors hover:bg-white/15"
                                onClick={scrollToHowItWorks}
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path d="M8 5v14l11-7L8 5zm0 0V5H6v14h2V5z" />
                                </svg>
                                {t('heroHowItWorksVideo')}
                            </button>
                        </div>

                        {!user && (
                            <div className={`mt-4 text-sm text-white/75 ${language === 'si' ? 'font-sinhala' : ''}`}>
                                <button
                                    type="button"
                                    className="font-semibold text-primary underline-offset-2 hover:underline"
                                    onClick={onOpenLogin}
                                >
                                    {t('login')}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="relative z-0 flex min-h-[min(76vh,820px)] items-end justify-center lg:-ml-4 lg:min-h-0 lg:justify-end xl:-ml-8">
                        <div className="relative w-full max-w-3xl translate-x-6 translate-y-12 sm:translate-x-8 sm:translate-y-16 lg:max-w-[min(56rem,100%)] lg:translate-x-8 lg:translate-y-14 xl:max-w-[min(72rem,100%)] xl:translate-x-12 xl:translate-y-12">
                            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[40%] bg-black/25 blur-3xl lg:-inset-12" aria-hidden />
                            <img
                                src={HERO_COUPLE_IMG}
                                alt=""
                                className="relative z-0 h-auto w-full origin-bottom object-contain [filter:drop-shadow(0_28px_48px_rgba(0,0,0,0.45))_drop-shadow(0_10px_24px_rgba(0,0,0,0.28))] scale-[1.14] md:scale-[1.2] lg:scale-[1.28]"
                                width={800}
                                height={1200}
                                draggable={false}
                            />
                            <div className="absolute bottom-4 right-2 z-[1] max-w-[min(100%,280px)] rounded-2xl border border-white/30 bg-text-dark/75 px-4 py-3 shadow-2xl backdrop-blur-md sm:right-4">
                                <div className="flex items-start gap-3">
                                    <ShieldIcon className="mt-0.5 h-8 w-8 shrink-0 text-primary" />
                                    <div>
                                        <p className="text-sm font-semibold text-white">
                                            {t('heroVerifiedBadgeTitle')}
                                        </p>
                                        <p
                                            className={`mt-0.5 text-xs text-white/80 ${language === 'si' ? 'font-sinhala' : ''}`}
                                        >
                                            {t('heroVerifiedBadgeSubtitle')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-20 mx-auto mt-2 w-full max-w-none">
                    <div className={statsPanelClass}>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-5 xl:gap-6">
                    <div className={statRowClass}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <ShieldIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-bold text-primary md:text-3xl">
                                {formatHeroStatCount(heroStats.verifiedProfiles)}
                            </h3>
                            <p className={`text-sm font-medium text-text-dark ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('verifiedProfiles')}
                            </p>
                            <p className={`mt-0.5 text-xs text-text-light ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('heroStatVerifiedSub')}
                            </p>
                        </div>
                    </div>
                    <div className={statRowClass}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <svg className="h-6 w-6 text-primary" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-bold text-primary md:text-3xl">
                                {formatHeroStatCount(heroStats.successStories)}
                            </h3>
                            <p className={`text-sm font-medium text-text-dark ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('successStoriesCount')}
                            </p>
                            <p className={`mt-0.5 text-xs text-text-light ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('heroStatSuccessSub')}
                            </p>
                        </div>
                    </div>
                    <div className={statRowClass}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <svg
                                className="h-6 w-6 text-primary"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-bold text-primary md:text-3xl">
                                {formatHeroStatCount(heroStats.trustedMatchmakers)}
                            </h3>
                            <p className={`text-sm font-medium text-text-dark ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('trustedMatchmakers')}
                            </p>
                            <p className={`mt-0.5 text-xs text-text-light ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('heroStatMatchmakerSub')}
                            </p>
                        </div>
                    </div>
                    <div className={statRowClass}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <svg
                                className="h-6 w-6 text-primary"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-2xl font-bold text-primary md:text-3xl">{t('heroStatPrivacyTitle')}</h3>
                            <p className={`text-sm font-medium text-text-dark ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('heroStatPrivacyLabel')}
                            </p>
                            <p className={`mt-0.5 text-xs text-text-light ${language === 'si' ? 'font-sinhala' : ''}`}>
                                {t('heroStatPrivacySub')}
                            </p>
                        </div>
                    </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10 rounded-3xl border border-white/50 bg-white/30 p-6 shadow-xl backdrop-blur-xl ring-1 ring-inset ring-white/25">
                    <h3 className="mb-4 text-center font-playfair text-xl font-bold text-text-dark">{t('quickSearch')}</h3>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full md:flex-1 md:min-w-[150px] sm:w-[calc(50%-0.5rem)]">
                            <CustomDropdown
                                name="gender"
                                value={search.gender}
                                onChange={handleChange}
                                options={[
                                    { value: 'Bride', label: 'Bride' },
                                    { value: 'Groom', label: 'Groom' },
                                ]}
                                label={t('imLookingFor')}
                            />
                        </div>
                        <div className="w-full md:flex-1 md:min-w-[120px] sm:w-[calc(50%-0.5rem)]">
                            <CustomDropdown
                                name="ageFrom"
                                value={search.ageFrom}
                                onChange={handleChange}
                                options={[18, 20, 22, 24, 26, 28, 30, 35, 40, 45, 50].map((age) => ({
                                    value: age.toString(),
                                    label: age.toString(),
                                }))}
                                label={t('ageFrom')}
                            />
                        </div>
                        <div className="w-full md:flex-1 md:min-w-[120px] sm:w-[calc(50%-0.5rem)]">
                            <CustomDropdown
                                name="ageTo"
                                value={search.ageTo}
                                onChange={handleChange}
                                options={[20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60].map((age) => ({
                                    value: age.toString(),
                                    label: age.toString(),
                                }))}
                                label={t('ageTo')}
                            />
                        </div>
                        <div className="w-full md:flex-1 md:min-w-[150px] sm:w-[calc(50%-0.5rem)]">
                            <CustomDropdown
                                name="religion"
                                value={search.religion}
                                onChange={handleChange}
                                options={[
                                    { value: '', label: 'Select Religion' },
                                    ...MATRIMONIAL_RELIGION_OPTIONS.map((r) => ({ value: r, label: r })),
                                ]}
                                label={t('religion')}
                            />
                        </div>
                        <div className="w-full md:w-auto md:min-w-[150px]">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-dark hover:shadow-lg"
                                onClick={handleSearch}
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                {t('searchNow')}
                            </button>
                        </div>
                    </div>
                </div>

                <p
                    className={`mt-8 text-center text-sm text-text-light md:text-base ${language === 'si' ? 'font-sinhala' : ''}`}
                >
                    {t('heroTagline')}
                </p>
            </div>
        </section>
    );
}
