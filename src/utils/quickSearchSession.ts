/** Persist hero quick-search values so they survive navigation (e.g. back from /search). */
export const QUICK_SEARCH_SESSION_KEY = 'cbass:hero-quick-search';

export type QuickSearchState = {
    gender: string;
    ageFrom: string;
    ageTo: string;
    religion: string;
};

export const DEFAULT_QUICK_SEARCH: QuickSearchState = {
    gender: 'Bride',
    ageFrom: '20',
    ageTo: '30',
    religion: '',
};

export function readQuickSearchSession(): QuickSearchState | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(QUICK_SEARCH_SESSION_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw) as Partial<QuickSearchState>;
        if (
            o &&
            typeof o.gender === 'string' &&
            typeof o.ageFrom === 'string' &&
            typeof o.ageTo === 'string' &&
            typeof o.religion === 'string'
        ) {
            return {
                gender: o.gender,
                ageFrom: o.ageFrom,
                ageTo: o.ageTo,
                religion: o.religion,
            };
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function writeQuickSearchSession(state: QuickSearchState): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(QUICK_SEARCH_SESSION_KEY, JSON.stringify(state));
    } catch {
        /* ignore */
    }
}

/** Map URL params to quick-search fields (defaults when params omitted, e.g. text-only search). */
export function quickSearchFromUrlParams(sp: { get: (key: string) => string | null }): QuickSearchState {
    return {
        gender: sp.get('gender') || DEFAULT_QUICK_SEARCH.gender,
        ageFrom: sp.get('ageFrom') || DEFAULT_QUICK_SEARCH.ageFrom,
        ageTo: sp.get('ageTo') || DEFAULT_QUICK_SEARCH.ageTo,
        religion: sp.get('religion') ?? '',
    };
}
