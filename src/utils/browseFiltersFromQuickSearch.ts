import { brideGroomToBrowseGender } from './selfAccountBrowseGender';
import type { QuickSearchState } from './quickSearchSession';

/** Same key as SearchSection browse filter persistence. */
export const BROWSE_FILTERS_STORAGE_KEY = 'cbass:browse-profile-filters';

export type BrowseFilterFieldsFromQuick = {
    gender: string;
    minAge: string;
    maxAge: string;
    religion: string;
    maritalStatus: string;
    sortBy: string;
};

/** Map hero quick-search (Bride/Groom, ageFrom/ageTo) → browse profile filters. */
export function browseFieldsFromQuickSearch(search: QuickSearchState): BrowseFilterFieldsFromQuick {
    return {
        gender: brideGroomToBrowseGender(search.gender),
        minAge: search.ageFrom,
        maxAge: search.ageTo,
        religion: search.religion || '',
        maritalStatus: '',
        sortBy: 'latest',
    };
}

export function browseOwnerKey(userId?: string | number | null): string {
    return userId != null && userId !== '' ? `user:${userId}` : 'anon';
}

/** Persist browse filters so /profiles picks them up for this account. */
export function persistBrowseFieldsFromQuickSearch(
    search: QuickSearchState,
    userId?: string | number | null
): BrowseFilterFieldsFromQuick {
    const fields = browseFieldsFromQuickSearch(search);
    if (typeof window === 'undefined') return fields;
    try {
        localStorage.setItem(
            BROWSE_FILTERS_STORAGE_KEY,
            JSON.stringify({ ownerKey: browseOwnerKey(userId), ...fields })
        );
    } catch {
        /* ignore quota / private mode */
    }
    return fields;
}

/** Build /profiles query from quick-search values (Bride/Groom + ages). */
export function profilesUrlFromQuickSearch(search: QuickSearchState): string {
    const params = new URLSearchParams();
    params.set('gender', search.gender || 'Bride');
    params.set('ageFrom', search.ageFrom || '');
    params.set('ageTo', search.ageTo || '');
    params.set('religion', search.religion || '');
    return `/profiles?${params.toString()}`;
}

type ParamReader = { get: (key: string) => string | null };

/**
 * Read browse filter overrides from /profiles URL (quick search redirect).
 * Accepts Bride|Groom|Male|Female and ageFrom/ageTo or minAge/maxAge.
 */
export function browseFieldsFromProfilesUrl(
    sp: ParamReader
): Partial<BrowseFilterFieldsFromQuick> | null {
    const genderRaw = sp.get('gender');
    const minAge = sp.get('minAge') ?? sp.get('ageFrom');
    const maxAge = sp.get('maxAge') ?? sp.get('ageTo');
    const religion = sp.get('religion');

    const hasFilterParam =
        genderRaw != null || minAge != null || maxAge != null || religion != null;
    if (!hasFilterParam) return null;

    const fields: Partial<BrowseFilterFieldsFromQuick> = {};
    if (genderRaw != null) {
        const trimmed = genderRaw.trim();
        if (trimmed === 'Male' || trimmed === 'Female') {
            fields.gender = trimmed;
        } else if (trimmed === 'Any' || trimmed === '') {
            fields.gender = '';
        } else {
            fields.gender = brideGroomToBrowseGender(trimmed);
        }
    }
    if (minAge != null) fields.minAge = minAge;
    if (maxAge != null) fields.maxAge = maxAge;
    if (religion != null) fields.religion = religion;
    return fields;
}

/** Drop quick-search / hero text-search params; keep unrelated ones (e.g. viewUser). */
export function stripBrowseFilterParamsFromUrl(sp: ParamReader): string {
    const next = new URLSearchParams();
    const viewUser = sp.get('viewUser');
    if (viewUser) next.set('viewUser', viewUser);
    const qs = next.toString();
    return qs ? `/profiles?${qs}` : '/profiles';
}

/** Build /profiles URL for hero name/profession search. */
export function profilesUrlFromTextSearch(query: string): string {
    const q = query.trim();
    if (!q) return '/profiles';
    return `/profiles?q=${encodeURIComponent(q)}`;
}

/** Free-text query from /profiles URL (hero search bar). */
export function textSearchFromProfilesUrl(sp: ParamReader): string | null {
    const q = sp.get('q');
    return q == null ? null : q;
}
