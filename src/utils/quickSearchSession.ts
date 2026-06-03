import {
    browseGenderToBrideGroom,
    type SelfBrowseUser,
    defaultBrowseGenderForUser,
} from './selfAccountBrowseGender';
import type { ManagedSubAccount } from './managedSubAccounts';

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

/** Self, or managed parent with one-gender subs → Bride/Groom default; both-gender subs → Any. */
export function defaultQuickSearchForUser(
    user?: SelfBrowseUser,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): QuickSearchState {
    const opposite = defaultBrowseGenderForUser(user, subAccounts);
    return {
        ...DEFAULT_QUICK_SEARCH,
        gender: browseGenderToBrideGroom(opposite),
    };
}

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
export function quickSearchFromUrlParams(
    sp: { get: (key: string) => string | null },
    user?: SelfBrowseUser,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): QuickSearchState {
    const defaults = user ? defaultQuickSearchForUser(user, subAccounts) : DEFAULT_QUICK_SEARCH;
    return {
        gender: sp.get('gender') || defaults.gender,
        ageFrom: sp.get('ageFrom') || defaults.ageFrom,
        ageTo: sp.get('ageTo') || defaults.ageTo,
        religion: sp.get('religion') ?? '',
    };
}
