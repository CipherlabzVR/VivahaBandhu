import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';

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
        pageSize: 20
    });
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);

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
            pageSize: 20
        });
    };

    const handleToggleFavorite = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) return alert('Please login to add favorites');
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
            }
        } catch (error) {
            console.error("Error toggling favorite", error);
        }
    };

    const handleToggleShortlist = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) return alert('Please login to shortlist profiles');
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
                        <button onClick={clearFilters} className="clear-filters-btn" style={{ background: 'none', border: 'none', color: '#9b2335', cursor: 'pointer' }}>Clear Filters</button>
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
                    <div className="results-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div className="results-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: preferredSearch ? 600 : 400, color: preferredSearch ? '#9b2335' : '#333' }}>Preferred Search</span>
                            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={preferredSearch}
                                    onChange={() => {
                                        if (!user?.id) {
                                            alert('Please log in and complete your profile to use Preferred Search.');
                                            return;
                                        }
                                        setPreferredSearch(!preferredSearch);
                                        setFilters(prev => ({ ...prev, pageNumber: 1 }));
                                    }}
                                    style={{ opacity: 0, width: 0, height: 0 }} 
                                />
                                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: preferredSearch ? '#9b2335' : '#ccc', borderRadius: '24px', transition: 'background-color 0.3s' }}>
                                    <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: preferredSearch ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: 'left 0.3s' }}></span>
                                </span>
                            </label>
                        </div>
                        <p className="results-count" style={{ margin: 0, color: '#666' }}>
                            {preferredSearch 
                                ? `Showing ${profiles.length} matched profiles (of ${totalCount} total)`
                                : `Showing ${profiles.length} profiles`}
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
                        {profiles.map((profile, index) => {
                            const placeholderImg = profile.gender === "Female"
                                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                                : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400";

                            return (
                                <div key={profile.id} onClick={() => {
                                    if (user?.isVerified === false) {
                                        window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                        return;
                                    }
                                    onOpenProfileDetail(profile);
                                }} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow relative" style={{ borderRadius: '20px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                                    <span style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#9b2335', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, zIndex: 10 }}>Verified</span>
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
                                            <span style={{ color: '#9b2335', fontWeight: 600 }}>
                                                {preferredSearch && profile.matchScore ? `${profile.matchScore}% Match` : 'New Match!'}
                                            </span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={(e) => handleToggleFavorite(e, profile.id)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: (interactions.Favorites || []).includes(profile.id) ? '#ff5a5f' : '#fce4e4', color: (interactions.Favorites || []).includes(profile.id) ? 'white' : 'inherit', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❤️</button>
                                                <button onClick={(e) => handleToggleShortlist(e, profile.id)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: (interactions.Shortlists || []).includes(profile.id) ? '#ffb400' : '#fdf8e4', color: (interactions.Shortlists || []).includes(profile.id) ? 'white' : 'inherit', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {profiles.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>No profiles found matching your criteria.</p>
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>Loading profiles...</p>
                        </div>
                    )}

                    {!loading && totalCount > filters.pageSize && (
                        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
                            <button 
                                onClick={() => setFilters(prev => ({ ...prev, pageNumber: prev.pageNumber - 1 }))}
                                disabled={filters.pageNumber === 1} 
                                className="page-btn prev" 
                                style={{ padding: '8px 16px', border: '1px solid #eee', borderRadius: '8px', background: 'white', color: filters.pageNumber === 1 ? '#ccc' : '#333', cursor: filters.pageNumber === 1 ? 'not-allowed' : 'pointer' }}>
                                &lt; Prev
                            </button>
                            <button className="page-btn active" style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#9b2335', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {filters.pageNumber}
                            </button>
                            <button 
                                onClick={() => setFilters(prev => ({ ...prev, pageNumber: prev.pageNumber + 1 }))}
                                disabled={filters.pageNumber * filters.pageSize >= totalCount}
                                className="page-btn next" 
                                style={{ padding: '8px 16px', border: '1px solid #eee', borderRadius: '8px', background: 'white', color: filters.pageNumber * filters.pageSize >= totalCount ? '#ccc' : '#333', cursor: filters.pageNumber * filters.pageSize >= totalCount ? 'not-allowed' : 'pointer' }}>
                                Next &gt;
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
