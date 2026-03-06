'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';

interface ProfilesProps {
    onOpenSubscription: () => void;
    onOpenProfileDetail?: (profile: any) => void;
}

export default function Profiles({ onOpenSubscription, onOpenProfileDetail }: ProfilesProps) {
    const { t } = useLanguage();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [interactions, setInteractions] = useState<{ Favorites: number[], Shortlists: number[] }>({ Favorites: [], Shortlists: [] });
    const { user } = useAuth();
    const [actionToast, setActionToast] = useState('');

    const [isMatched, setIsMatched] = useState(false);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                if (user?.id) {
                    const res = await matrimonialService.getMatchedProfiles(Number(user.id), 4);
                    if (res.statusCode === 200 && res.result) {
                        const matched = res.result;
                        if (Array.isArray(matched) && matched.length > 0) {
                            setProfiles(matched);
                            setIsMatched(true);
                        } else {
                            const fallback = await matrimonialService.getRecentProfiles(4);
                            if (fallback.statusCode === 200 && fallback.result) setProfiles(fallback.result);
                            setIsMatched(false);
                        }
                    }
                } else {
                    const res = await matrimonialService.getRecentProfiles(4);
                    if (res.statusCode === 200 && res.result) setProfiles(res.result);
                    setIsMatched(false);
                }
            } catch (error) {
                console.error("Failed to load profiles", error);
                try {
                    const res = await matrimonialService.getRecentProfiles(4);
                    if (res.statusCode === 200 && res.result) setProfiles(res.result);
                } catch (e) { /* ignore */ }
            }
        };

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

        fetchProfiles();
        fetchInteractions();
    }, [user?.id]);

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
                    const isAdding = !currentFavorites.includes(profileId);
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
                setActionToast('Saved profiles updated successfully');
                setTimeout(() => setActionToast(''), 2000);
            }
        } catch (error) {
            console.error("Error toggling shortlist", error);
        }
    };

    return (
        <section className="py-24 px-4 bg-white" id="profiles">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('featuredProfiles')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('featuredProfilesDesc')}</p>
            </div>

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {profiles.map((profile, index) => {
                    const isBlurred = index % 2 !== 0; // Simulate blurred subscription view for test
                    const placeholderImg = profile.gender === "Female"
                        ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                        : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400";

                    return (
                        <div key={profile.id} onClick={() => { 
                            if (user?.isVerified === false) {
                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                return;
                            }
                            if (!isBlurred && onOpenProfileDetail) onOpenProfileDetail(profile); 
                        }} className={`bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow relative ${!isBlurred ? 'cursor-pointer' : ''}`}>
                            <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">{t('verified')}</span>
                            <div className="relative">
                                <img src={profile.profilePhoto || placeholderImg} alt="Profile" className="w-full h-80 object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                    <div className="text-xl font-semibold">{profile.firstName || 'User'}</div>
                                    <div className="text-sm opacity-90">{profile.age || 0} years • {profile.cityOfResidence || 'Unknown'}</div>
                                </div>
                            </div>

                            <div className={`p-6 relative ${isBlurred ? 'blur-none' : ''}`}>
                                <div className={`space-y-3 mb-4 ${isBlurred ? 'blur-sm' : ''}`}>
                                    <div className="flex items-center gap-2 text-text-light">
                                        <span>🎓</span> {profile.qualificationLevel || 'Not Specified'}
                                    </div>
                                    <div className="flex items-center gap-2 text-text-light">
                                        <span>💼</span> {profile.occupation || 'Not Specified'}
                                    </div>
                                    <div className="flex items-center gap-2 text-text-light">
                                        <span>🙏</span> {profile.religion || 'Not Specified'}
                                    </div>
                                </div>
                                <div className={`flex items-center justify-between pt-4 border-t border-gray-200 ${isBlurred ? 'blur-sm' : ''}`}>
                                    <span className="text-primary font-semibold">
                                        {isMatched && profile.matchScore ? `${profile.matchScore}% Match` : 'New Match!'}
                                    </span>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleToggleFavorite(e, profile.userId || profile.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${(interactions.Favorites || []).includes(profile.userId || profile.id) ? 'bg-pink-500 text-white' : 'bg-pink-100 hover:bg-pink-200'}`}>❤️</button>
                                        <button onClick={(e) => handleToggleShortlist(e, profile.userId || profile.id)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${(interactions.Shortlists || []).includes(profile.userId || profile.id) ? 'bg-yellow-500 text-white' : 'bg-yellow-100 hover:bg-yellow-200'}`}>⭐</button>
                                    </div>
                                </div>
                                {isBlurred && (
                                    <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-b-3xl">
                                        <span className="text-4xl mb-2">🔒</span>
                                        <p className="text-center text-text-dark mb-4 font-medium">{t('subscribeToView')}</p>
                                        <button className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors" onClick={(e) => { e.stopPropagation(); onOpenSubscription(); }}>{t('upgradeNow')}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {profiles.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-text-light">No recently registered profiles available.</p>
                </div>
            )}

            <div className="text-center mt-12">
                <Link href="/profiles" className="inline-block px-8 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors">{t('viewAllProfiles')}</Link>
            </div>

            {actionToast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {actionToast}
                </div>
            )}
        </section>
    );
}
