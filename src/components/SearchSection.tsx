'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';
import { showToast } from '../utils/toast';
import { HeartIcon, BookmarkIcon } from './icons/InteractionIcons';
import ProfileManagedBadge, { profileHasManagedBadge } from './ProfileManagedBadge';
import PremiumBadge, { PREMIUM_CARD_FRAME_STYLE } from './PremiumBadge';
import { getDefaultAvatarDataUri } from '../utils/defaultAvatar';
import { MATRIMONIAL_RELIGION_OPTIONS } from '../constants/matrimonialReligions';
import { religionFilterMatches } from '../utils/religionMatch';

import { MATRIMONIAL_MIN_SEARCH_AGE, validateMatrimonialSearchAge } from '../utils/matrimonialSearchAge';
import { excludeOwnedProfilesFromBrowse } from '../utils/browseProfileFilters';
import { useOwnedSubAccountsForBrowse } from '../hooks/useOwnedSubAccountsForBrowse';
import PreferredSearchProfilePicker from './PreferredSearchProfilePicker';
import ManagedSubAccountActionPicker from './ManagedSubAccountActionPicker';
import {
    managedProfileUserIdForApi,
    useManagedSubAccountActionPicker,
} from '../hooks/useManagedSubAccountActionPicker';
import {
    canManageSubAccounts,
    subAccountDisplayName,
    type ManagedSubAccount,
} from '../utils/managedSubAccounts';
import {
    defaultBrowseGenderForUser,
    effectiveBrowseGenderForUser,
    managedParentShowsBothGenders,
    profileMatchesBrowseGender,
} from '../utils/selfAccountBrowseGender';

interface SearchSectionProps {
    onOpenProfileDetail: (profile: any) => void;
}

const BROWSE_FILTERS_STORAGE_KEY = 'cbass:browse-profile-filters';
const PREFERRED_SEARCH_PROFILE_KEY = 'cbass:preferred-search-profile';

type BrowseFilterFields = {
    gender: string;
    minAge: string;
    maxAge: string;
    religion: string;
    maritalStatus: string;
    sortBy: string;
};

type ActiveBrowseFilters = BrowseFilterFields & { pageNumber: number; pageSize: number };

const defaultBrowseFields = (): BrowseFilterFields => ({
    gender: '',
    minAge: '',
    maxAge: '',
    religion: '',
    maritalStatus: '',
    sortBy: 'latest',
});

function defaultBrowseFieldsForUser(
    user: { gender?: string; accountType?: string; parentUserId?: number | null } | null | undefined,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): BrowseFilterFields {
    const fields = defaultBrowseFields();
    const g = defaultBrowseGenderForUser(user, subAccounts);
    if (g) fields.gender = g;
    return fields;
}

function browseOwnerKey(user: { id: string } | null | undefined): string {
    return user?.id != null && user.id !== '' ? `user:${user.id}` : 'anon';
}

function profileMatchesBrowseFilters(
    profile: any,
    f: BrowseFilterFields,
    user?: { gender?: string; accountType?: string; parentUserId?: number | null } | null,
    subAccounts: readonly Pick<ManagedSubAccount, 'gender'>[] = []
): boolean {
    const genderFilter = effectiveBrowseGenderForUser(user, f.gender, subAccounts);
    if (genderFilter && !profileMatchesBrowseGender(profile, genderFilter)) return false;
    const age = Number(profile.age ?? profile.Age ?? 0);
    if (f.minAge) {
        const min = parseInt(f.minAge, 10);
        if (!Number.isNaN(min) && age > 0 && age < min) return false;
    }
    if (f.maxAge) {
        const max = parseInt(f.maxAge, 10);
        if (!Number.isNaN(max) && age > 0 && age > max) return false;
    }
    if (f.religion && !religionFilterMatches(profile.religion ?? profile.Religion, f.religion)) return false;
    if (f.maritalStatus) {
        const ms = String(profile.maritalStatus ?? profile.MaritalStatus ?? '').trim();
        if (ms !== f.maritalStatus) return false;
    }
    return true;
}

function sameBrowseFields(a: BrowseFilterFields, b: BrowseFilterFields): boolean {
    return (
        a.gender === b.gender &&
        a.minAge === b.minAge &&
        a.maxAge === b.maxAge &&
        a.religion === b.religion &&
        a.maritalStatus === b.maritalStatus &&
        a.sortBy === b.sortBy
    );
}

function loadSavedBrowseFields(ownerKey: string): BrowseFilterFields | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(BROWSE_FILTERS_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as { ownerKey?: string } & Partial<BrowseFilterFields>;
        if (data.ownerKey !== ownerKey) return null;
        const d = defaultBrowseFields();
        if (typeof data.gender === 'string') d.gender = data.gender;
        if (typeof data.minAge === 'string') d.minAge = data.minAge;
        if (typeof data.maxAge === 'string') d.maxAge = data.maxAge;
        if (typeof data.religion === 'string') d.religion = data.religion;
        if (typeof data.maritalStatus === 'string') d.maritalStatus = data.maritalStatus;
        if (typeof data.sortBy === 'string') d.sortBy = data.sortBy;
        return d;
    } catch {
        return null;
    }
}

function persistBrowseFields(ownerKey: string, fields: BrowseFilterFields): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(BROWSE_FILTERS_STORAGE_KEY, JSON.stringify({ ownerKey, ...fields }));
    } catch {
        /* ignore quota / private mode */
    }
}

function clearSavedBrowseFilters(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(BROWSE_FILTERS_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

function loadPreferredSearchProfileId(ownerKey: string): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(PREFERRED_SEARCH_PROFILE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as { ownerKey?: string; profileId?: number };
        if (data.ownerKey !== ownerKey) return null;
        const id = Number(data.profileId);
        return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
        return null;
    }
}

function persistPreferredSearchProfileId(ownerKey: string, profileId: number | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (profileId == null) {
            localStorage.removeItem(PREFERRED_SEARCH_PROFILE_KEY);
            return;
        }
        localStorage.setItem(
            PREFERRED_SEARCH_PROFILE_KEY,
            JSON.stringify({ ownerKey, profileId })
        );
    } catch {
        /* ignore */
    }
}

export default function SearchSection({ onOpenProfileDetail }: SearchSectionProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [profiles, setProfiles] = useState<any[]>([]);
    const [interactions, setInteractions] = useState<{ Favorites: number[], Shortlists: number[] }>({ Favorites: [], Shortlists: [] });
    const { user, loading: authLoading } = useAuth();
    const { ownedIds, subAccounts } = useOwnedSubAccountsForBrowse();
    const isManagedParent = canManageSubAccounts(user?.accountType);
    const managedActionPicker = useManagedSubAccountActionPicker(user?.accountType, subAccounts);
    
    const [preferredSearch, setPreferredSearch] = useState(false);
    const [preferredSearchProfileId, setPreferredSearchProfileId] = useState<number | null>(null);
    const [showPreferredProfilePicker, setShowPreferredProfilePicker] = useState(false);
    const [pickerDraftProfileId, setPickerDraftProfileId] = useState<number | null>(null);

    const [draftFilters, setDraftFilters] = useState<BrowseFilterFields>(defaultBrowseFields);
    const [activeFilters, setActiveFilters] = useState<ActiveBrowseFilters>(() => ({
        ...defaultBrowseFields(),
        pageNumber: 1,
        pageSize: 99,
    }));
    /** Last filters persisted via Save (used for “unsaved changes” hint only). */
    const [persistedFilters, setPersistedFilters] = useState<BrowseFilterFields | null>(null);
    const ageApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [actionToast, setActionToast] = useState('');
    const [ageFilterError, setAgeFilterError] = useState<string | null>(null);

    // Free-text search
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
    const searchBoxRef = useRef<HTMLDivElement | null>(null);

    // Debounce input -> active search term; keep pagination aligned with current result set
    useEffect(() => {
        const handle = window.setTimeout(() => {
            setSearchTerm(searchInput.trim());
            setActiveFilters(prev => (prev.pageNumber === 1 ? prev : { ...prev, pageNumber: 1 }));
        }, 250);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

    // After auth is ready, restore saved browse filters for this account (or anonymous)
    useEffect(() => {
        if (authLoading) return;
        const ownerKey = browseOwnerKey(user);
        const saved = loadSavedBrowseFields(ownerKey);
        if (saved) {
            const ageOk = validateMatrimonialSearchAge(saved.minAge, saved.maxAge);
            let fields = ageOk.ok ? saved : { ...saved, minAge: '', maxAge: '' };
            if (!fields.gender && defaultBrowseGenderForUser(user, subAccounts)) {
                fields = { ...fields, gender: defaultBrowseGenderForUser(user, subAccounts) };
            }
            if (!ageOk.ok) {
                persistBrowseFields(ownerKey, fields);
            }
            setDraftFilters(fields);
            setActiveFilters(prev => ({ ...fields, pageNumber: 1, pageSize: prev.pageSize }));
            setPersistedFilters(fields);
        } else {
            const defaults = defaultBrowseFieldsForUser(user, subAccounts);
            setDraftFilters(defaults);
            setActiveFilters((prev) => ({ ...defaults, pageNumber: 1, pageSize: prev.pageSize }));
            setPersistedFilters(null);
        }
    }, [user?.id, user?.gender, user?.accountType, user?.parentUserId, subAccounts, authLoading]);

    const preferredSearchSubAccount = useMemo(
        () => subAccounts.find((s) => s.id === preferredSearchProfileId) ?? null,
        [subAccounts, preferredSearchProfileId]
    );

    useEffect(() => {
        if (authLoading || !user?.id || !isManagedParent) return;
        const ownerKey = browseOwnerKey(user);
        const savedId = loadPreferredSearchProfileId(ownerKey);
        if (savedId != null && subAccounts.some((s) => s.id === savedId)) {
            setPreferredSearchProfileId(savedId);
        }
    }, [authLoading, user?.id, isManagedParent, subAccounts]);

    useEffect(() => {
        if (!preferredSearch || !isManagedParent || subAccounts.length === 0) return;
        if (
            preferredSearchProfileId != null &&
            subAccounts.some((s) => s.id === preferredSearchProfileId)
        ) {
            return;
        }
        if (subAccounts.length === 1) {
            setPreferredSearchProfileId(subAccounts[0]!.id);
            persistPreferredSearchProfileId(browseOwnerKey(user), subAccounts[0]!.id);
        }
    }, [preferredSearch, isManagedParent, subAccounts, preferredSearchProfileId, user]);

    useEffect(() => {
        return () => {
            if (ageApplyTimerRef.current) clearTimeout(ageApplyTimerRef.current);
        };
    }, []);

    // Close suggestion dropdown when clicking outside
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!searchBoxRef.current) return;
            if (!searchBoxRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const matchesSearch = (profile: any, q: string) => {
        if (!q) return true;
        const needle = q.toLowerCase();
        const haystack = [
            profile.firstName,
            profile.lastName,
            profile.cityOfResidence,
            profile.country,
            profile.occupation,
            profile.qualificationLevel,
            profile.religion,
            profile.ethnicity,
            profile.maritalStatus,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(needle);
    };

    const activeCriteria = useMemo(
        (): BrowseFilterFields => ({
            gender: activeFilters.gender,
            minAge: activeFilters.minAge,
            maxAge: activeFilters.maxAge,
            religion: activeFilters.religion,
            maritalStatus: activeFilters.maritalStatus,
            sortBy: activeFilters.sortBy,
        }),
        [activeFilters]
    );

    const profilesMatchingActiveCriteria = useMemo(() => {
        if (preferredSearch) return profiles;
        return profiles.filter((p) => profileMatchesBrowseFilters(p, activeCriteria, user, subAccounts));
    }, [profiles, activeCriteria, preferredSearch, user, subAccounts]);

    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profilesMatchingActiveCriteria;
        return profilesMatchingActiveCriteria.filter((p) => matchesSearch(p, searchTerm));
    }, [profilesMatchingActiveCriteria, searchTerm]);

    const suggestions = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        if (!q || q.length < 1) return [] as { label: string; subLabel: string; profile: any }[];
        const seen = new Set<string>();
        const results: { label: string; subLabel: string; profile: any }[] = [];
        for (const p of profilesMatchingActiveCriteria) {
            if (!matchesSearch(p, q)) continue;
            const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed';
            const key = `${p.userId || p.id}-${name}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const subParts = [p.age ? `${p.age} yrs` : null, p.cityOfResidence, p.occupation, p.religion].filter(Boolean);
            results.push({ label: name, subLabel: subParts.join(' · '), profile: p });
            if (results.length >= 8) break;
        }
        return results;
    }, [profilesMatchingActiveCriteria, searchInput]);

    const applySuggestion = (s: { label: string; profile: any }) => {
        setSearchInput(s.label);
        setSearchTerm(s.label);
        setShowSuggestions(false);
        setHighlightedSuggestion(-1);
        if (user?.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        onOpenProfileDetail(s.profile);
    };

    /** Apply free-text filter immediately (Enter) instead of waiting for debounce. */
    const commitFreeTextSearch = useCallback(() => {
        const q = searchInput.trim();
        setSearchTerm(q);
        setShowSuggestions(false);
        setHighlightedSuggestion(-1);
        setActiveFilters((prev) => (prev.pageNumber === 1 ? prev : { ...prev, pageNumber: 1 }));
    }, [searchInput]);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (showSuggestions && suggestions.length > 0 && highlightedSuggestion >= 0) {
                e.preventDefault();
                applySuggestion(suggestions[highlightedSuggestion]);
            } else {
                e.preventDefault();
                commitFreeTextSearch();
            }
            return;
        }
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Escape') setShowSuggestions(false);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedSuggestion((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedSuggestion((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedSuggestion(-1);
        }
    };

    const handlePreferredSearchToggle = useCallback(() => {
        if (!user?.id) {
            showToast('Please log in and complete your profile to use Preferred Search.', 'error');
            return;
        }
        if (preferredSearch) {
            setPreferredSearch(false);
            setActiveFilters((prev) => ({ ...prev, pageNumber: 1 }));
            return;
        }
        if (isManagedParent) {
            if (subAccounts.length === 0) {
                showToast('Add at least one profile before using Preferred Search.', 'error');
                return;
            }
            if (subAccounts.length === 1) {
                const subId = subAccounts[0]!.id;
                setPreferredSearchProfileId(subId);
                persistPreferredSearchProfileId(browseOwnerKey(user), subId);
                setPreferredSearch(true);
                setActiveFilters((prev) => ({ ...prev, pageNumber: 1 }));
                return;
            }
            const savedValid =
                preferredSearchProfileId != null &&
                subAccounts.some((s) => s.id === preferredSearchProfileId);
            if (savedValid) {
                setPreferredSearch(true);
                setActiveFilters((prev) => ({ ...prev, pageNumber: 1 }));
                return;
            }
            setPickerDraftProfileId(
                preferredSearchProfileId ?? subAccounts[0]?.id ?? null
            );
            setShowPreferredProfilePicker(true);
            return;
        }
        setPreferredSearch(true);
        setActiveFilters((prev) => ({ ...prev, pageNumber: 1 }));
    }, [
        user?.id,
        preferredSearch,
        isManagedParent,
        subAccounts,
        preferredSearchProfileId,
    ]);

    const handleConfirmPreferredProfile = useCallback(() => {
        if (pickerDraftProfileId == null) return;
        setPreferredSearchProfileId(pickerDraftProfileId);
        persistPreferredSearchProfileId(browseOwnerKey(user), pickerDraftProfileId);
        setShowPreferredProfilePicker(false);
        setPreferredSearch(true);
        setActiveFilters((prev) => ({ ...prev, pageNumber: 1 }));
    }, [pickerDraftProfileId, user]);

    const handleCancelPreferredProfilePicker = useCallback(() => {
        setShowPreferredProfilePicker(false);
    }, []);

    const handleChangePreferredProfile = useCallback(() => {
        setPickerDraftProfileId(
            preferredSearchProfileId ?? subAccounts[0]?.id ?? null
        );
        setShowPreferredProfilePicker(true);
    }, [preferredSearchProfileId, subAccounts]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const usePreferred = !!(preferredSearch && user?.id);
            if (usePreferred && isManagedParent && !preferredSearchProfileId) {
                setProfiles([]);
                setTotalCount(0);
                return;
            }
            const apiGender = effectiveBrowseGenderForUser(user, activeFilters.gender, subAccounts) || null;

            // Preferred search uses partner preferences only — do not send manual browse filters to the API.
            const searchParams: Record<string, unknown> = usePreferred
                ? {
                    gender: null,
                    minAge: null,
                    maxAge: null,
                    religion: null,
                    maritalStatus: null,
                    sortBy: 'best_match',
                    pageNumber: activeFilters.pageNumber,
                    pageSize: activeFilters.pageSize,
                    preferredSearch: true,
                    userId: Number(user!.id),
                    ...(isManagedParent && preferredSearchProfileId
                        ? { managedProfileUserId: preferredSearchProfileId }
                        : {}),
                }
                : {
                    gender: apiGender,
                    minAge: activeFilters.minAge ? parseInt(activeFilters.minAge, 10) : null,
                    maxAge: activeFilters.maxAge ? parseInt(activeFilters.maxAge, 10) : null,
                    religion: activeFilters.religion || null,
                    maritalStatus: activeFilters.maritalStatus || null,
                    sortBy: activeFilters.sortBy,
                    pageNumber: activeFilters.pageNumber,
                    pageSize: activeFilters.pageSize,
                    ...(user?.id ? { userId: Number(user.id) } : {}),
                };

            const res = await matrimonialService.searchProfiles(searchParams);
            const ok = (res.statusCode === 200 || res.statusCode === 1) && res.result;
            if (ok) {
                const raw = res.result.profiles || res.result.Profiles || [];
                const filtered = excludeOwnedProfilesFromBrowse(raw, ownedIds);
                setProfiles(filtered);
                setTotalCount(
                    ownedIds.size > 0 && filtered.length !== raw.length
                        ? Math.max(0, (res.result.totalCount || res.result.TotalCount || 0) - (raw.length - filtered.length))
                        : res.result.totalCount || res.result.TotalCount || 0
                );
            } else {
                setProfiles([]);
                setTotalCount(0);
                const msg = typeof res.message === 'string' && res.message.trim() ? res.message : null;
                if (msg) showToast(msg, 'error');
            }
        } catch (error) {
            console.error("Failed to load profiles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when applied criteria, mode, or account changes
    }, [activeFilters, preferredSearch, preferredSearchProfileId, user?.id, ownedIds, subAccounts, isManagedParent]);

    useEffect(() => {
        const fetchInteractions = async () => {
            if (user?.id) {
                try {
                    const res = await matrimonialService.getUserInteractions(Number(user.id));
                    if (res.statusCode === 200 && res.result) {
                        setInteractions({
                            Favorites: res.result.Favorites || res.result.favorites || [],
                            Shortlists: res.result.Shortlists || res.result.shortlists || []
                        });
                    }
                } catch (error) {
                    console.error("Failed to load interactions", error);
                }
            }
        };

        fetchInteractions();
    }, [user?.id]);

    /** Apply chosen filters to results immediately (API refetch uses activeFilters). */
    const applyBrowseFiltersLive = useCallback((fields: BrowseFilterFields) => {
        setDraftFilters(fields);
        const ageCheck = validateMatrimonialSearchAge(fields.minAge, fields.maxAge);
        if (!ageCheck.ok) {
            setAgeFilterError(ageCheck.message);
            return;
        }
        setAgeFilterError(null);
        setActiveFilters((prev) => ({ ...fields, pageNumber: 1, pageSize: prev.pageSize }));
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        const next = { ...draftFilters, [name]: value };
        if (name === 'minAge' || name === 'maxAge') {
            setDraftFilters(next);
            if (ageApplyTimerRef.current) clearTimeout(ageApplyTimerRef.current);
            ageApplyTimerRef.current = setTimeout(() => applyBrowseFiltersLive(next), 400);
            return;
        }
        applyBrowseFiltersLive(next);
    };

    const handleGenderToggle = (gender: string) => {
        const nextGender =
            draftFilters.gender === gender
                ? managedParentShowsBothGenders(subAccounts)
                    ? ''
                    : defaultBrowseGenderForUser(user, subAccounts)
                : gender;
        applyBrowseFiltersLive({ ...draftFilters, gender: nextGender });
    };

    const handleSaveBrowseFilters = () => {
        const ageCheck = validateMatrimonialSearchAge(activeCriteria.minAge, activeCriteria.maxAge);
        if (!ageCheck.ok) {
            setAgeFilterError(ageCheck.message);
            showToast(ageCheck.message, 'error');
            return;
        }
        setAgeFilterError(null);
        const ownerKey = browseOwnerKey(user);
        persistBrowseFields(ownerKey, activeCriteria);
        setPersistedFilters({ ...activeCriteria });
        showToast('Filters saved for your next visit.', 'success');
    };

    const clearFilters = () => {
        clearSavedBrowseFilters();
        setAgeFilterError(null);
        if (ageApplyTimerRef.current) clearTimeout(ageApplyTimerRef.current);
        const cleared = defaultBrowseFieldsForUser(user, subAccounts);
        setDraftFilters(cleared);
        setActiveFilters({ ...cleared, pageNumber: 1, pageSize: 99 });
        setPersistedFilters(null);
    };

    const filtersDirty = useMemo(() => {
        const baseline = persistedFilters ?? defaultBrowseFieldsForUser(user, subAccounts);
        return !sameBrowseFields(activeCriteria, baseline);
    }, [activeCriteria, persistedFilters, user, subAccounts]);

    const handleToggleFavorite = (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) {
            showToast('Please login to add favorites', 'error');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        managedActionPicker.runWithManagedAccount('interest', async (managedProfileUserId) => {
            try {
                const res = await matrimonialService.toggleFavorite(
                    Number(user.id),
                    profileId,
                    managedProfileUserIdForApi(managedProfileUserId)
                );
                if (res.statusCode === 200) {
                    setInteractions((prev) => {
                        const currentFavorites = prev.Favorites || [];
                        return {
                            ...prev,
                            Favorites: currentFavorites.includes(profileId)
                                ? currentFavorites.filter((id) => id !== profileId)
                                : [...currentFavorites, profileId],
                        };
                    });
                    setActionToast('Interest updated successfully');
                    setTimeout(() => setActionToast(''), 2000);
                } else {
                    showToast(res?.message || res?.Message || 'Could not update interest.', 'error');
                }
            } catch (error) {
                console.error('Error toggling favorite', error);
                showToast('Could not update interest.', 'error');
            }
        });
    };

    const handleToggleShortlist = (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) {
            showToast('Please login to shortlist profiles', 'error');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        managedActionPicker.runWithManagedAccount('save', async (managedProfileUserId) => {
            try {
                const res = await matrimonialService.toggleShortlist(
                    Number(user.id),
                    profileId,
                    managedProfileUserIdForApi(managedProfileUserId)
                );
                if (res.statusCode === 200) {
                    setInteractions((prev) => {
                        const currentShortlists = prev.Shortlists || [];
                        return {
                            ...prev,
                            Shortlists: currentShortlists.includes(profileId)
                                ? currentShortlists.filter((id) => id !== profileId)
                                : [...currentShortlists, profileId],
                        };
                    });
                    setActionToast('Saved profiles updated successfully');
                    setTimeout(() => setActionToast(''), 2000);
                } else {
                    showToast(res?.message || res?.Message || 'Could not update saved profiles.', 'error');
                }
            } catch (error) {
                console.error('Error toggling shortlist', error);
                showToast('Could not update saved profiles.', 'error');
            }
        });
    };

    const toggleFilter = (group: string) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const isOpen = (group: string) => collapsedGroups[group] !== true;

    const toggle = (group: string) => {
        setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const getOpenClass = (group: string) => !collapsedGroups[group] ? 'open' : '';

    return (
        <section className="search-section" id="search" style={{ padding: '40px 20px', backgroundColor: '#f9f9f9' }}>
            <div
                className="search-container"
                style={preferredSearch ? { gridTemplateColumns: '1fr' } : undefined}
            >
                {/* Filters Sidebar — hidden while Preferred Search uses partner-preference matching */}
                {!preferredSearch && (
                <aside className="filters-sidebar" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div className="filters-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Filters</h3>
                        <button onClick={clearFilters} className="clear-filters-btn" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Clear Filters</button>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Sort By</label>
                        <select name="sortBy" value={draftFilters.sortBy} onChange={handleFilterChange} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option value="latest">Latest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="age_asc">Age: Low to High</option>
                            <option value="age_desc">Age: High to Low</option>
                        </select>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>I&apos;m looking for</label>
                        <div className="gender-toggle" style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px' }}>
                            <button 
                                onClick={() => handleGenderToggle('Female')}
                                className={`gender-btn ${draftFilters.gender === 'Female' ? 'active' : ''}`} 
                                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: draftFilters.gender === 'Female' ? 'white' : 'transparent', boxShadow: draftFilters.gender === 'Female' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', color: draftFilters.gender === 'Female' ? '#333' : '#666' }}>
                                Bride
                            </button>
                            <button 
                                onClick={() => handleGenderToggle('Male')}
                                className={`gender-btn ${draftFilters.gender === 'Male' ? 'active' : ''}`} 
                                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: draftFilters.gender === 'Male' ? 'white' : 'transparent', boxShadow: draftFilters.gender === 'Male' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', color: draftFilters.gender === 'Male' ? '#333' : '#666' }}>
                                Groom
                            </button>
                        </div>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Age Range</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input type="number" name="minAge" min={MATRIMONIAL_MIN_SEARCH_AGE} inputMode="numeric" value={draftFilters.minAge} onChange={handleFilterChange} placeholder="Min" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #eee' }} />
                            <span>-</span>
                            <input type="number" name="maxAge" min={MATRIMONIAL_MIN_SEARCH_AGE} inputMode="numeric" value={draftFilters.maxAge} onChange={handleFilterChange} placeholder="Max" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #eee' }} />
                        </div>
                        {ageFilterError ? (
                            <p role="alert" style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#b45309' }}>
                                {ageFilterError}
                            </p>
                        ) : null}
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Religion</label>
                        <select name="religion" value={draftFilters.religion} onChange={handleFilterChange} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option value="">Select Religion</option>
                            {MATRIMONIAL_RELIGION_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Marital Status</label>
                        <select name="maritalStatus" value={draftFilters.maritalStatus} onChange={handleFilterChange} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option value="">Any</option>
                            <option value="Never Married">Never Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                        </select>
                    </div>

                    <div className="save-search-box" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fdf8f3', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                            Results update as you change filters. Click <strong>Save</strong> to remember this search for next time.
                        </p>
                        {filtersDirty && (
                            <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#b45309' }}>
                                Current filters are not saved yet — click Save to keep them for your next visit.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveBrowseFilters}
                            className="btn btn-primary"
                            style={{ backgroundColor: '#d4af37', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600 }}
                        >
                            Save
                        </button>
                    </div>
                </aside>
                )}

                {/* Search Results */}
                <div className="search-results">
                    {/* Free-text search bar with live suggestions */}
                    <div ref={searchBoxRef} style={{ position: 'relative', marginBottom: '15px' }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', backgroundColor: 'white', borderRadius: '10px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex' }} aria-hidden="true">
                                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="7" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
                                value={searchInput}
                                onChange={(e) => { setSearchInput(e.target.value); setShowSuggestions(true); setHighlightedSuggestion(-1); }}
                                onFocus={() => { if (searchInput.trim()) setShowSuggestions(true); }}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Search by name, city, occupation, religion..."
                                aria-label="Search profiles"
                                aria-autocomplete="list"
                                aria-expanded={showSuggestions && suggestions.length > 0}
                                aria-controls="profile-search-suggestions"
                                style={{ width: '100%', padding: '12px 44px 12px 42px', border: 'none', borderRadius: '10px', outline: 'none', fontSize: '0.95rem', background: 'transparent' }}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchInput(''); setSearchTerm(''); setShowSuggestions(false); setHighlightedSuggestion(-1); }}
                                    aria-label="Clear search"
                                    title="Clear search"
                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', background: '#f3f4f6', color: '#6b7280', cursor: 'pointer' }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {showSuggestions && suggestions.length > 0 && (
                            <ul
                                id="profile-search-suggestions"
                                role="listbox"
                                style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, listStyle: 'none', margin: 0, padding: '6px 0', background: 'white', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', maxHeight: '320px', overflowY: 'auto' }}
                            >
                                {suggestions.map((s, idx) => {
                                    const isActive = idx === highlightedSuggestion;
                                    return (
                                        <li
                                            key={`${s.profile.userId || s.profile.id}-${idx}`}
                                            role="option"
                                            aria-selected={isActive}
                                            onMouseEnter={() => setHighlightedSuggestion(idx)}
                                            onMouseDown={(e) => { e.preventDefault(); applySuggestion(s); }}
                                            style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '2px', backgroundColor: isActive ? '#fdf3ec' : 'transparent' }}
                                        >
                                            <span style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.95rem' }}>{s.label}</span>
                                            {s.subLabel && (
                                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.subLabel}</span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {showSuggestions && searchInput.trim() && suggestions.length === 0 && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, padding: '12px 14px', background: 'white', border: '1px solid #eee', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', color: '#6b7280', fontSize: '0.9rem' }}>
                                {preferredSearch
                                    ? 'No matching profiles in current results. Try a different keyword or turn off Preferred Search.'
                                    : 'No matching profiles with your current filters. Try adjusting filters or clear the search box.'}
                            </div>
                        )}
                    </div>

                    <div className="results-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div className="results-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: preferredSearch ? 600 : 400, color: preferredSearch ? 'var(--primary)' : '#333' }}>Preferred Search</span>
                            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={preferredSearch}
                                    onChange={handlePreferredSearchToggle}
                                    style={{ opacity: 0, width: 0, height: 0 }} 
                                />
                                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: preferredSearch ? 'var(--primary)' : '#ccc', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                                    <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: preferredSearch ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s' }}></span>
                                </span>
                            </label>
                        </div>
                        <p className="results-count" style={{ margin: 0, color: '#666' }}>
                            {searchTerm
                                ? (filteredProfiles.length > 0
                                    ? `Showing ${filteredProfiles.length} match${filteredProfiles.length === 1 ? '' : 'es'} for “${searchTerm}”`
                                    : `No matches for “${searchTerm}”`)
                                : (totalCount > 0
                                    ? `${filteredProfiles.length} shown on this page · ${(activeFilters.pageNumber - 1) * activeFilters.pageSize + 1}–${Math.min(activeFilters.pageNumber * activeFilters.pageSize, totalCount)} of ${totalCount} from search`
                                    : 'Showing 0 profiles')}
                        </p>
                    </div>
                    
                    {preferredSearch && (
                        <div style={{ marginBottom: '15px', padding: '12px 16px', backgroundColor: '#fdf8f3', borderRadius: '10px', border: '1px solid #f0e0c0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px' }}>
                            <span style={{ fontSize: '1.2rem' }}>💡</span>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666', flex: '1 1 220px' }}>
                                {isManagedParent && preferredSearchSubAccount ? (
                                    <>
                                        Showing matches for{' '}
                                        <strong>{subAccountDisplayName(preferredSearchSubAccount)}</strong>
                                        &apos;s partner preferences.
                                        {subAccounts.length > 1 ? (
                                            <> Complete that profile&apos;s partner preferences for better results.</>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        Showing profiles that match your partner preferences. Complete your{' '}
                                        <strong>Detailed Profile</strong> partner preferences for better results.
                                    </>
                                )}
                            </p>
                            {isManagedParent && subAccounts.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleChangePreferredProfile}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #e8cfa8',
                                        background: 'white',
                                        color: 'var(--primary, #c8922a)',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    Change profile
                                </button>
                            ) : null}
                        </div>
                    )}

                    <div className="results-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {filteredProfiles.map((profile, index) => {
                            const placeholderImg = getDefaultAvatarDataUri({
                                firstName: profile.firstName,
                                lastName: profile.lastName,
                                gender: profile.gender,
                            });

                            const isPremium = !!(profile.isPremium || profile.IsPremium);
                            const isManaged = profileHasManagedBadge(profile);
                            const cardStyle: React.CSSProperties = {
                                borderRadius: '20px',
                                overflow: 'hidden',
                                backgroundColor: 'white',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                                cursor: 'pointer',
                                ...(isPremium ? PREMIUM_CARD_FRAME_STYLE : {})
                            };
                            return (
                                <div key={profile.id} onClick={() => {
                                    if (user?.isVerified === false) {
                                        window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                        return;
                                    }
                                    onOpenProfileDetail(profile);
                                }} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow relative" style={cardStyle}>
                                    <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, zIndex: 10 }}>Verified</span>
                                    {(isManaged || isPremium) && (
                                        <span style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                            {isPremium && <PremiumBadge variant="compact" />}
                                            {isManaged && (
                                                <ProfileManagedBadge profile={profile} variant="compact" />
                                            )}
                                        </span>
                                    )}
                                    <div style={{ position: 'relative', height: '300px' }}>
                                        <img src={profile.profilePhoto || placeholderImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px 15px', color: 'white' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{profile.firstName || 'User'} {profile.lastName || ''}</div>
                                            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{profile.age || 0} years • {profile.cityOfResidence || 'Unknown'}</div>
                                        </div>
                                    </div>

                                    <div style={{ padding: '20px' }}>
                                        <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.95rem' }}>
                                                <span>🎓</span> {profile.qualificationLevel || 'Not Specified'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.95rem' }}>
                                                <span>💼</span> {profile.occupation || 'Not Specified'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '0.95rem' }}>
                                                <span>🙏</span> {profile.religion || 'Not Specified'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                                {preferredSearch && profile.matchScore ? `${profile.matchScore}% Match` : 'New Match!'}
                                            </span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {(() => {
                                                    const pid = profile.userId || profile.id;
                                                    const isFav = (interactions.Favorites || []).includes(pid);
                                                    const isSaved = (interactions.Shortlists || []).includes(pid);
                                                    return (
                                                        <>
                                                            <button
                                                                onClick={(e) => handleToggleFavorite(e, pid)}
                                                                aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                                                title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                                                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isFav ? '#ff5a5f' : '#fce4e4', color: isFav ? 'white' : '#ff5a5f', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s, color 0.15s' }}
                                                            >
                                                                <HeartIcon filled={isFav} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleToggleShortlist(e, pid)}
                                                                aria-label={isSaved ? 'Remove from saved' : 'Save profile'}
                                                                title={isSaved ? 'Remove from saved' : 'Save profile'}
                                                                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: isSaved ? '#f59e0b' : '#fef3c7', color: isSaved ? 'white' : '#b45309', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s, color 0.15s' }}
                                                            >
                                                                <BookmarkIcon filled={isSaved} />
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filteredProfiles.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>{searchTerm ? `No profiles match “${searchTerm}” in the current results.` : 'No profiles found matching your criteria.'}</p>
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>Loading profiles...</p>
                        </div>
                    )}

                    {!loading && !searchTerm && totalCount > activeFilters.pageSize && (() => {
                        const totalPages = Math.ceil(totalCount / activeFilters.pageSize);
                        const currentPage = activeFilters.pageNumber;

                        const getPageNumbers = () => {
                            const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
                            if (totalPages <= 7) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                                pages.push(1);
                                if (currentPage > 3) pages.push('ellipsis-start');
                                const start = Math.max(2, currentPage - 1);
                                const end = Math.min(totalPages - 1, currentPage + 1);
                                for (let i = start; i <= end; i++) pages.push(i);
                                if (currentPage < totalPages - 2) pages.push('ellipsis-end');
                                pages.push(totalPages);
                            }
                            return pages;
                        };

                        const pageStyle = (isActive: boolean, isDisabled?: boolean): React.CSSProperties => ({
                            minWidth: '40px', height: '40px', borderRadius: '8px',
                            border: isActive ? 'none' : '1px solid #eee',
                            background: isActive ? 'var(--primary)' : 'white',
                            color: isDisabled ? '#ccc' : isActive ? 'white' : '#333',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: isActive ? 600 : 400, fontSize: '0.9rem',
                            padding: '0 8px',
                        });

                        return (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '40px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setActiveFilters((prev) => ({ ...prev, pageNumber: prev.pageNumber - 1 }))}
                                    disabled={currentPage === 1}
                                    style={pageStyle(false, currentPage === 1)}
                                >
                                    &lt; Prev
                                </button>
                                {getPageNumbers().map((page) =>
                                    typeof page === 'string' ? (
                                        <span key={page} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>...</span>
                                    ) : (
                                        <button
                                            key={page}
                                            onClick={() => setActiveFilters((prev) => ({ ...prev, pageNumber: page }))}
                                            style={pageStyle(page === currentPage)}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => setActiveFilters((prev) => ({ ...prev, pageNumber: prev.pageNumber + 1 }))}
                                    disabled={currentPage >= totalPages}
                                    style={pageStyle(false, currentPage >= totalPages)}
                                >
                                    Next &gt;
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {actionToast && (
                <div style={{ position: 'fixed', top: 'calc(72px + env(safe-area-inset-top, 0px))', right: 'max(16px, env(safe-area-inset-right, 0px))', bottom: 'auto', zIndex: 2000, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {actionToast}
                </div>
            )}

            <PreferredSearchProfilePicker
                open={showPreferredProfilePicker}
                subAccounts={subAccounts}
                accountType={user?.accountType}
                selectedId={pickerDraftProfileId}
                onSelect={setPickerDraftProfileId}
                onConfirm={handleConfirmPreferredProfile}
                onCancel={handleCancelPreferredProfilePicker}
            />

            <ManagedSubAccountActionPicker
                open={managedActionPicker.open}
                subAccounts={subAccounts}
                accountType={user?.accountType}
                action={managedActionPicker.action}
                selectedId={managedActionPicker.selectedId}
                onSelect={managedActionPicker.setSelectedId}
                onConfirm={() => void managedActionPicker.confirmPicker()}
                onCancel={managedActionPicker.cancelPicker}
            />
        </section>
    );
}
