import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';
import { showToast } from '../utils/toast';
import { HeartIcon, BookmarkIcon } from './icons/InteractionIcons';
import MatchmakerBadge from './MatchmakerBadge';
import PremiumBadge, { PREMIUM_CARD_FRAME_STYLE } from './PremiumBadge';
import { getDefaultAvatarDataUri } from '../utils/defaultAvatar';

interface SearchSectionProps {
    onOpenProfileDetail: (profile: any) => void;
}

export default function SearchSection({ onOpenProfileDetail }: SearchSectionProps) {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const [profiles, setProfiles] = useState<any[]>([]);
    const [interactions, setInteractions] = useState<{ Favorites: number[], Shortlists: number[] }>({ Favorites: [], Shortlists: [] });
    const { user } = useAuth();
    
    const [preferredSearch, setPreferredSearch] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        gender: '',
        minAge: '',
        maxAge: '',
        religion: '',
        maritalStatus: '',
        sortBy: 'latest',
        pageNumber: 1,
        pageSize: 99
    });
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [actionToast, setActionToast] = useState('');

    // Free-text search
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedSuggestion, setHighlightedSuggestion] = useState(-1);
    const searchBoxRef = useRef<HTMLDivElement | null>(null);

    // Debounce input -> active search term
    useEffect(() => {
        const handle = window.setTimeout(() => {
            setSearchTerm(searchInput.trim());
            setFilters(prev => (prev.pageNumber === 1 ? prev : { ...prev, pageNumber: 1 }));
        }, 250);
        return () => window.clearTimeout(handle);
    }, [searchInput]);

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

    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profiles;
        return profiles.filter(p => matchesSearch(p, searchTerm));
    }, [profiles, searchTerm]);

    const suggestions = useMemo(() => {
        const q = searchInput.trim().toLowerCase();
        if (!q || q.length < 1) return [] as { label: string; subLabel: string; profile: any }[];
        const seen = new Set<string>();
        const results: { label: string; subLabel: string; profile: any }[] = [];
        for (const p of profiles) {
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
    }, [profiles, searchInput]);

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

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || suggestions.length === 0) {
            if (e.key === 'Escape') setShowSuggestions(false);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedSuggestion(prev => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedSuggestion(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'Enter') {
            if (highlightedSuggestion >= 0) {
                e.preventDefault();
                applySuggestion(suggestions[highlightedSuggestion]);
            } else {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setHighlightedSuggestion(-1);
        }
    };

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const searchParams: any = {
                ...filters,
                minAge: filters.minAge ? parseInt(filters.minAge) : null,
                maxAge: filters.maxAge ? parseInt(filters.maxAge) : null,
            };

            if (preferredSearch && user?.id) {
                searchParams.preferredSearch = true;
                searchParams.userId = Number(user.id);
                searchParams.sortBy = 'best_match';
            } else if (user?.id) {
                searchParams.userId = Number(user.id);
            }
            
            const res = await matrimonialService.searchProfiles(searchParams);
            if (res.statusCode === 200 && res.result) {
                setProfiles(res.result.profiles || res.result.Profiles || []);
                setTotalCount(res.result.totalCount || res.result.TotalCount || 0);
            }
        } catch (error) {
            console.error("Failed to load profiles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, [filters, preferredSearch]);

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

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, pageNumber: 1 })); // Reset to page 1 on filter change
    };

    const handleGenderToggle = (gender: string) => {
        setFilters(prev => ({ ...prev, gender: prev.gender === gender ? '' : gender, pageNumber: 1 }));
    };

    const clearFilters = () => {
        setFilters({
            gender: '',
            minAge: '',
            maxAge: '',
            religion: '',
            maritalStatus: '',
            sortBy: 'latest',
            pageNumber: 1,
            pageSize: 99
        });
    };

    const handleToggleFavorite = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) {
            showToast('Please login to add favorites', 'error');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        try {
            const res = await matrimonialService.toggleFavorite(Number(user.id), profileId);
            if (res.statusCode === 200) {
                setInteractions(prev => {
                    const currentFavorites = prev.Favorites || [];
                    return {
                        ...prev,
                        Favorites: currentFavorites.includes(profileId)
                            ? currentFavorites.filter(id => id !== profileId)
                            : [...currentFavorites, profileId]
                    };
                });
                setActionToast('Interest updated successfully');
                setTimeout(() => setActionToast(''), 2000);
            }
        } catch (error) {
            console.error("Error toggling favorite", error);
        }
    };

    const handleToggleShortlist = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) {
            showToast('Please login to shortlist profiles', 'error');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        try {
            const res = await matrimonialService.toggleShortlist(Number(user.id), profileId);
            if (res.statusCode === 200) {
                setInteractions(prev => {
                    const currentShortlists = prev.Shortlists || [];
                    return {
                        ...prev,
                        Shortlists: currentShortlists.includes(profileId)
                            ? currentShortlists.filter(id => id !== profileId)
                            : [...currentShortlists, profileId]
                    };
                });
                setActionToast('Saved profiles updated successfully');
                setTimeout(() => setActionToast(''), 2000);
            }
        } catch (error) {
            console.error("Error toggling shortlist", error);
        }
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
            <div className="search-container">
                {/* Filters Sidebar */}
                <aside className="filters-sidebar" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div className="filters-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Filters</h3>
                        <button onClick={clearFilters} className="clear-filters-btn" style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer' }}>Clear Filters</button>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Sort By</label>
                        <select name="sortBy" value={preferredSearch ? 'best_match' : filters.sortBy} onChange={handleFilterChange} disabled={preferredSearch} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee', opacity: preferredSearch ? 0.6 : 1 }}>
                            {preferredSearch && <option value="best_match">Best Match</option>}
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
                                className={`gender-btn ${filters.gender === 'Female' ? 'active' : ''}`} 
                                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: filters.gender === 'Female' ? 'white' : 'transparent', boxShadow: filters.gender === 'Female' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', color: filters.gender === 'Female' ? '#333' : '#666' }}>
                                Bride
                            </button>
                            <button 
                                onClick={() => handleGenderToggle('Male')}
                                className={`gender-btn ${filters.gender === 'Male' ? 'active' : ''}`} 
                                style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: filters.gender === 'Male' ? 'white' : 'transparent', boxShadow: filters.gender === 'Male' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', color: filters.gender === 'Male' ? '#333' : '#666' }}>
                                Groom
                            </button>
                        </div>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Age Range</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input type="number" name="minAge" value={filters.minAge} onChange={handleFilterChange} placeholder="Min" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #eee' }} />
                            <span>-</span>
                            <input type="number" name="maxAge" value={filters.maxAge} onChange={handleFilterChange} placeholder="Max" style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #eee' }} />
                        </div>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Religion</label>
                        <select name="religion" value={filters.religion} onChange={handleFilterChange} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option value="">Any</option>
                            <option value="Buddhism">Buddhism</option>
                            <option value="Hinduism">Hinduism</option>
                            <option value="Islam">Islam</option>
                            <option value="Christianity">Christianity</option>
                            <option value="Catholic">Catholic</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Marital Status</label>
                        <select name="maritalStatus" value={filters.maritalStatus} onChange={handleFilterChange} className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option value="">Any</option>
                            <option value="Never Married">Never Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                            <option value="Separated">Separated</option>
                        </select>
                    </div>

                    <div className="save-search-box" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fdf8f3', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>Save this search as your preferred search criteria?</p>
                        <button className="btn btn-primary" style={{ backgroundColor: '#d4af37', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                    </div>
                </aside>

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
                                type="search"
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
                                No matching profiles in current results. Try adjusting your filters.
                            </div>
                        )}
                    </div>

                    <div className="results-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div className="results-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: preferredSearch ? 600 : 400, color: preferredSearch ? '#F97316' : '#333' }}>Preferred Search</span>
                            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={preferredSearch}
                                    onChange={() => {
                                        if (!user?.id) {
                                            showToast('Please log in and complete your profile to use Preferred Search.', 'error');
                                            return;
                                        }
                                        setPreferredSearch(!preferredSearch);
                                        setFilters(prev => ({ ...prev, pageNumber: 1 }));
                                    }}
                                    style={{ opacity: 0, width: 0, height: 0 }} 
                                />
                                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: preferredSearch ? '#F97316' : '#ccc', borderRadius: '24px', transition: 'background-color 0.3s' }}>
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
                                    ? `Showing ${(filters.pageNumber - 1) * filters.pageSize + 1}–${Math.min(filters.pageNumber * filters.pageSize, totalCount)} of ${totalCount} profiles`
                                    : 'Showing 0 profiles')}
                        </p>
                    </div>
                    
                    {preferredSearch && (
                        <div style={{ marginBottom: '15px', padding: '12px 16px', backgroundColor: '#fdf8f3', borderRadius: '10px', border: '1px solid #f0e0c0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>💡</span>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                                Showing profiles that match your partner preferences. Complete your <strong>Detailed Profile</strong> partner preferences for better results.
                            </p>
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
                            const isManaged = !!(profile.isMatchmakerManaged || profile.IsMatchmakerManaged);
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
                                    <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#F97316', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, zIndex: 10 }}>Verified</span>
                                    {(isManaged || isPremium) && (
                                        <span style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                                            {isPremium && <PremiumBadge variant="compact" />}
                                            {isManaged && (
                                                <MatchmakerBadge matchmakerName={profile.matchmakerName || profile.MatchmakerName} variant="compact" />
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
                                            <span style={{ color: '#F97316', fontWeight: 600 }}>
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

                    {!loading && !searchTerm && totalCount > filters.pageSize && (() => {
                        const totalPages = Math.ceil(totalCount / filters.pageSize);
                        const currentPage = filters.pageNumber;

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
                            background: isActive ? '#F97316' : 'white',
                            color: isDisabled ? '#ccc' : isActive ? 'white' : '#333',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: isActive ? 600 : 400, fontSize: '0.9rem',
                            padding: '0 8px',
                        });

                        return (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '40px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, pageNumber: prev.pageNumber - 1 }))}
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
                                            onClick={() => setFilters(prev => ({ ...prev, pageNumber: page }))}
                                            style={pageStyle(page === currentPage)}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, pageNumber: prev.pageNumber + 1 }))}
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
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {actionToast}
                </div>
            )}
        </section>
    );
}
