'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

/** Shown when CMS leaves image empty or uploads nothing — always loads from this site. */
const SUCCESS_STORY_PLACEHOLDER = '/success-story-placeholder.svg';

const DEFAULT_IMAGES = [
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1529634801-b469c85b2bcc?w=400&h=300&fit=crop',
];

function resolveStoryImageSrc(raw: unknown): string {
    if (raw == null) return SUCCESS_STORY_PLACEHOLDER;
    const s = String(raw).trim();
    if (
        s === '' ||
        s === 'null' ||
        s === 'undefined' ||
        s === 'NaN'
    ) {
        return SUCCESS_STORY_PLACEHOLDER;
    }
    return s;
}

function needsImageUnoptimized(src: string): boolean {
    return src.startsWith('http') && !src.includes('unsplash.com');
}

/** Quotes at least this long get collapsed + “Read more” so cards stay even. */
const SUCCESS_STORY_QUOTE_COLLAPSE_MIN_CHARS = 260;

function SuccessStoryQuote({
    text,
    t,
}: {
    text: string;
    t: (key: string) => string;
}) {
    const [expanded, setExpanded] = useState(false);
    const isLong = text.trim().length >= SUCCESS_STORY_QUOTE_COLLAPSE_MIN_CHARS;

    return (
        <div className="flex flex-col flex-1 min-w-0 pr-8 mb-6">
            <p
                className={`text-slate-600 text-base md:text-lg leading-relaxed break-words [overflow-wrap:anywhere] ${
                    isLong && !expanded ? 'line-clamp-5' : ''
                }`}
            >
                {text}
            </p>
            {isLong && (
                <button
                    type="button"
                    className="mt-3 self-start text-sm font-semibold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 rounded"
                    onClick={() => setExpanded((e) => !e)}
                    aria-expanded={expanded}
                >
                    {expanded ? t('readLess') : t('readMore')}
                </button>
            )}
        </div>
    );
}
const FALLBACK_KEYS = [
    { couple: 'story1Couple' as const, quote: 'story1Quote' as const },
    { couple: 'story2Couple' as const, quote: 'story2Quote' as const },
    { couple: 'story3Couple' as const, quote: 'story3Quote' as const },
] as const;

const HEART_PATH =
    'M 5 25 ' +
    'C 15 45, 45 50, 60 35 ' +
    'C 75 20, 80 5, 60 15 ' +
    'C 40 5, 45 20, 60 35 ' +
    'C 75 50, 105 45, 115 25';

const HIDDEN_LENGTH = 320;

/** Stories per page on the public success stories page (3×3 grid). */
const SUCCESS_STORIES_PAGE_SIZE = 9;

interface StoryItem {
    id: number;
    coupleName: string;
    coupleNameSi: string;
    quote: string;
    quoteSi: string;
    imageUrl?: string;
    /** Some API payloads use PascalCase */
    ImageUrl?: string;
}

export default function SuccessStories() {
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number | null>(null);
    const [stories, setStories] = useState<StoryItem[]>([]);
    const [useFallback, setUseFallback] = useState(false);
    const [page, setPage] = useState(0);
    const { t, language } = useLanguage();

    const totalItems = useFallback ? FALLBACK_KEYS.length : stories.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / SUCCESS_STORIES_PAGE_SIZE));

    useEffect(() => {
        setPage((p) => Math.min(p, Math.max(0, totalPages - 1)));
    }, [totalPages]);

    const pageOffset = page * SUCCESS_STORIES_PAGE_SIZE;

    const fallbackSlice = useMemo(
        () =>
            useFallback
                ? FALLBACK_KEYS.slice(pageOffset, pageOffset + SUCCESS_STORIES_PAGE_SIZE)
                : [],
        [useFallback, pageOffset]
    );

    const storiesSlice = useMemo(
        () =>
            !useFallback
                ? stories.slice(pageOffset, pageOffset + SUCCESS_STORIES_PAGE_SIZE)
                : [],
        [useFallback, stories, pageOffset]
    );

    useEffect(() => {
        const fetchStories = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/Matrimonial/GetSuccessStoriesForWebsite`);
                const data = await res.json();
                if (data?.result && Array.isArray(data.result) && data.result.length > 0) {
                    setStories(data.result);
                    setUseFallback(false);
                } else {
                    setUseFallback(true);
                }
            } catch {
                setUseFallback(true);
            }
        };
        fetchStories();
    }, []);

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
        <section
            className={`relative py-20 md:py-28 bg-white overflow-x-hidden ${language === 'si' ? 'font-sinhala-sm' : ''}`}
        >
            {/* Line-drawn hearts background (same as footer / WhoAreWe, looping) */}
            <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-visible">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[280px] md:w-[360px] opacity-[0.35]">
                    <svg viewBox="0 0 120 60" fill="none" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
                        <path
                            ref={pathRef}
                            d={HEART_PATH}
                            stroke="#ffa20d"
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
                            stroke="#ffa20d"
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
                            stroke="#ffa20d"
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
                    {useFallback
                        ? fallbackSlice.map(({ couple, quote }, i) => {
                            const imgIdx = pageOffset + i;
                            return (
                            <article
                                key={`${couple}-${page}-${i}`}
                                className="relative bg-slate-50 border border-orange-200/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-orange-300/60 transition-all duration-300 flex flex-col"
                            >
                                <div className="relative w-full aspect-[4/3] bg-slate-200">
                                    <Image
                                        src={DEFAULT_IMAGES[imgIdx % DEFAULT_IMAGES.length] || DEFAULT_IMAGES[0]}
                                        alt={t(couple)}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                    />
                                </div>
                                <div className="relative p-6 md:p-8 flex flex-col flex-1">
                                    <div className="absolute top-6 right-8 text-orange-400/40 text-4xl font-serif leading-none" aria-hidden>{'"'}</div>
                                    <SuccessStoryQuote text={t(quote)} t={t} />
                                    <p className="text-orange-500 font-semibold text-lg font-playfair">
                                        — {t(couple)}
                                    </p>
                                </div>
                            </article>
                            );
                        })
                        : storiesSlice.map((story) => {
                            const name = language === 'si' && story.coupleNameSi ? story.coupleNameSi : story.coupleName;
                            const quoteText = language === 'si' && story.quoteSi ? story.quoteSi : story.quote;
                            const imgSrc = resolveStoryImageSrc(story.imageUrl ?? story.ImageUrl);
                            return (
                                <article
                                    key={story.id}
                                    className="relative bg-slate-50 border border-orange-200/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:border-orange-300/60 transition-all duration-300 flex flex-col"
                                >
                                    <div className="relative w-full aspect-[4/3] bg-slate-200">
                                        <Image
                                            src={imgSrc}
                                            alt={name}
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 768px) 100vw, 33vw"
                                            unoptimized={needsImageUnoptimized(imgSrc)}
                                        />
                                    </div>
                                    <div className="relative p-6 md:p-8 flex flex-col flex-1">
                                        <div className="absolute top-6 right-8 text-orange-400/40 text-4xl font-serif leading-none" aria-hidden>{'"'}</div>
                                        <SuccessStoryQuote text={quoteText} t={t} />
                                        <p className="text-orange-500 font-semibold text-lg font-playfair">
                                            — {name}
                                        </p>
                                    </div>
                                </article>
                            );
                        })}
                </div>

                {totalPages > 1 && (
                    <nav
                        className="mt-12 flex flex-wrap items-center justify-center gap-4"
                        aria-label={`${t('successStories')} pagination`}
                    >
                        <button
                            type="button"
                            className="rounded-full border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm transition-colors hover:bg-orange-50 disabled:pointer-events-none disabled:opacity-40"
                            disabled={page <= 0}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                        >
                            {t('successStoriesPaginationPrev')}
                        </button>
                        <span className="min-w-[5rem] text-center text-sm font-medium text-slate-600 tabular-nums">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            type="button"
                            className="rounded-full border border-orange-200 bg-white px-5 py-2.5 text-sm font-semibold text-orange-600 shadow-sm transition-colors hover:bg-orange-50 disabled:pointer-events-none disabled:opacity-40"
                            disabled={page >= totalPages - 1}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        >
                            {t('successStoriesPaginationNext')}
                        </button>
                    </nav>
                )}
            </div>
        </section>
    );
}
