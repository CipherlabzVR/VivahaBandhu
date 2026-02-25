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

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const res = await matrimonialService.getRecentProfiles(20);
                if (res.statusCode === 200 && res.result) {
                    setProfiles(res.result);
                }
            } catch (error) {
                console.error("Failed to load profiles", error);
            }
        };

        const fetchInteractions = async () => {
            if (user?.id) {
                try {
                    const res = await matrimonialService.getUserInteractions(Number(user.id));
                    if (res.statusCode === 200 && res.result) {
                        setInteractions(res.result);
                    }
                } catch (error) {
                    console.error("Failed to load interactions", error);
                }
            }
        };

        fetchProfiles();
        fetchInteractions();
    }, [user?.id]);

    const handleToggleFavorite = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) return alert('Please login to add favorites');
        try {
            const res = await matrimonialService.toggleFavorite(Number(user.id), profileId);
            if (res.statusCode === 200) {
                setInteractions(prev => ({
                    ...prev,
                    Favorites: prev.Favorites.includes(profileId)
                        ? prev.Favorites.filter(id => id !== profileId)
                        : [...prev.Favorites, profileId]
                }));
            }
        } catch (error) {
            console.error("Error toggling favorite", error);
        }
    };

    const handleToggleShortlist = async (e: React.MouseEvent, profileId: number) => {
        e.stopPropagation();
        if (!user) return alert('Please login to shortlist profiles');
        try {
            const res = await matrimonialService.toggleShortlist(Number(user.id), profileId);
            if (res.statusCode === 200) {
                setInteractions(prev => ({
                    ...prev,
                    Shortlists: prev.Shortlists.includes(profileId)
                        ? prev.Shortlists.filter(id => id !== profileId)
                        : [...prev.Shortlists, profileId]
                }));
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
            <div className="search-container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '30px' }}>
                {/* Filters Sidebar */}
                <aside className="filters-sidebar" style={{ width: '300px', flexShrink: 0, backgroundColor: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div className="filters-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Filters</h3>
                        <button className="clear-filters-btn" style={{ background: 'none', border: 'none', color: '#9b2335', cursor: 'pointer' }}>Clear Filters</button>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>Sort By</label>
                        <select className="filter-select" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #eee' }}>
                            <option>Latest First</option>
                            <option>Oldest First</option>
                            <option>Age: Low to High</option>
                            <option>Age: High to Low</option>
                        </select>
                    </div>

                    <div className="filter-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#666' }}>I&apos;m looking for</label>
                        <div className="gender-toggle" style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '4px' }}>
                            <button className="gender-btn active" style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>Bride</button>
                            <button className="gender-btn" style={{ flex: 1, padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#666' }}>Groom</button>
                        </div>
                    </div>

                    {/* Additional filters can be styled here, keeping simplified for now */}

                    <div className="save-search-box" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fdf8f3', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>Save this search as your preferred search criteria?</p>
                        <button className="btn btn-primary" style={{ backgroundColor: '#d4af37', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                    </div>
                </aside>

                {/* Search Results */}
                <div className="search-results" style={{ flex: 1 }}>
                    <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div className="results-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>Preferred Search</span>
                            <label className="toggle-switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px' }}>
                                <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
                                <span className="toggle-slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ccc', borderRadius: '24px' }}></span>
                            </label>
                        </div>
                        <p className="results-count" style={{ margin: 0, color: '#666' }}>Showing {profiles.length} profiles</p>
                    </div>

                    <div className="results-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                        {profiles.map((profile, index) => {
                            const placeholderImg = profile.gender === "Female"
                                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                                : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400";

                            return (
                                <div key={profile.id} onClick={() => onOpenProfileDetail(profile)} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow relative" style={{ borderRadius: '20px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
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
                                            <span style={{ color: '#9b2335', fontWeight: 600 }}>New Match!</span>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button onClick={(e) => handleToggleFavorite(e, profile.id)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: interactions.Favorites.includes(profile.id) ? '#ff5a5f' : '#fce4e4', color: interactions.Favorites.includes(profile.id) ? 'white' : 'inherit', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>❤️</button>
                                                <button onClick={(e) => handleToggleShortlist(e, profile.id)} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: interactions.Shortlists.includes(profile.id) ? '#ffb400' : '#fdf8e4', color: interactions.Shortlists.includes(profile.id) ? 'white' : 'inherit', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⭐</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {profiles.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                            <p>No recently registered profiles available.</p>
                        </div>
                    )}

                    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
                        <button className="page-btn prev" disabled style={{ padding: '8px 16px', border: '1px solid #eee', borderRadius: '8px', background: 'white', color: '#ccc' }}>&lt; Prev</button>
                        <button className="page-btn active" style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#9b2335', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</button>
                        <button className="page-btn next" style={{ padding: '8px 16px', border: '1px solid #eee', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Next &gt;</button>
                    </div>
                </div>
            </div>
        </section>
    );
}
