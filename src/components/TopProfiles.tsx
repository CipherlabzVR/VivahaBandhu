'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';
import { showToast } from '../utils/toast';
import { HeartIcon, BookmarkIcon } from './icons/InteractionIcons';
import ProfileManagedBadge, { profileHasManagedBadge } from './ProfileManagedBadge';
import PremiumBadge, { PREMIUM_CARD_FRAME_STYLE } from './PremiumBadge';
import { getDefaultAvatarDataUri } from '../utils/defaultAvatar';
import { isManagedSubAccount } from '../utils/managedSubAccount';
import { excludeSelfFromFeaturedBrowse } from '../utils/browseProfileFilters';
import { useOwnedSubAccountsForBrowse } from '../hooks/useOwnedSubAccountsForBrowse';
import {
    filterProfilesForBrowse,
    viewerUserIdForBrowseGenderFilter,
} from '../utils/selfAccountBrowseGender';

interface TopProfilesProps {
    onOpenProfileDetail: (profile: any) => void;
}

export default function TopProfiles({ onOpenProfileDetail }: TopProfilesProps) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { viewerId, subAccounts } = useOwnedSubAccountsForBrowse();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [interactions, setInteractions] = useState<{ Favorites: number[]; Shortlists: number[] }>({
        Favorites: [],
        Shortlists: [],
    });
    const [actionToast, setActionToast] = useState('');

    useEffect(() => {
        const uidNum = viewerId ?? (user?.id != null ? Number(user.id) : undefined);
        const viewerForGender = viewerUserIdForBrowseGenderFilter(user);

        const commitFeatured = (items: unknown) => {
            const genderFiltered = filterProfilesForBrowse(items, user, null, subAccounts);
            setProfiles(excludeSelfFromFeaturedBrowse(uidNum, subAccounts, genderFiltered));
        };

        const fetchPremium = async () => {
            try {
                const res = await matrimonialService.getRecentPremiumProfiles(8, viewerForGender);
                if ((res.statusCode === 200 || res.statusCode === 1) && res.result && Array.isArray(res.result)) {
                    commitFeatured(res.result);
                    return;
                }
            } catch {
                /* Deployed API may not expose GetRecentPremiumProfiles yet */
            }
            try {
                const fallback = await matrimonialService.getRecentProfiles(48, viewerForGender);
                const ok = fallback.statusCode === 200 || fallback.statusCode === 1;
                if (ok && Array.isArray(fallback.result)) {
                    const onlyPremium = fallback.result.filter((p: any) => p?.isPremium || p?.IsPremium);
                    commitFeatured(onlyPremium);
                } else {
                    setProfiles([]);
                }
            } catch (error) {
                console.error('Failed to load premium profiles (fallback)', error);
                setProfiles([]);
            }
        };

        const fetchInteractions = async () => {
            if (!user?.id) return;
            try {
                const res = await matrimonialService.getUserInteractions(Number(user.id));
                if (res.statusCode === 200 && res.result) {
                    setInteractions({
                        Favorites: res.result.Favorites || res.result.favorites || [],
                        Shortlists: res.result.Shortlists || res.result.shortlists || [],
                    });
                }
            } catch (error) {
                console.error('Failed to load interactions', error);
            }
        };

        fetchPremium();
        fetchInteractions();
    }, [user?.id, user?.gender, user?.accountType, user?.parentUserId, viewerId, subAccounts]);

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
            }
        } catch (error) {
            console.error('Error toggling favorite', error);
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
            }
        } catch (error) {
            console.error('Error toggling shortlist', error);
        }
    };

    return (
        <section className="py-24 px-4 bg-white top-profiles-section" id="top-live-profiles">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('topLiveProfiles')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('topLiveProfilesDesc')}</p>
            </div>
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 top-profiles-list">
                {profiles.map((profile) => {
                    const isManaged = profileHasManagedBadge(profile);
                    const photoSrc =
                        profile.profilePhoto ||
                        getDefaultAvatarDataUri({
                            firstName: profile.firstName,
                            lastName: profile.lastName,
                            gender: profile.gender,
                        });
                    return (
                        <div
                            key={profile.id}
                            onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                onOpenProfileDetail(profile);
                            }}
                            className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow relative cursor-pointer"
                            style={PREMIUM_CARD_FRAME_STYLE}
                        >
                            <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                                {t('verified')}
                            </span>
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    left: '16px',
                                    zIndex: 10,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    alignItems: 'flex-start',
                                }}
                            >
                                <PremiumBadge variant="compact" />
                                {isManaged && <ProfileManagedBadge profile={profile} variant="compact" />}
                            </span>
                            <div className="relative">
                                <img src={photoSrc} alt="" className="w-full h-80 object-cover" />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                                    <div className="text-xl font-semibold">{profile.firstName || 'User'}</div>
                                    <div className="text-sm opacity-90">
                                        {profile.age || 0} years • {profile.cityOfResidence || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 relative">
                                <div className="space-y-3 mb-4">
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
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <span className="text-primary font-semibold">{t('topLiveProfilesPremiumLabel')}</span>
                                    <div className="flex gap-2">
                                        {(() => {
                                            const pid = profile.userId || profile.UserId || profile.id;
                                            const isFav = (interactions.Favorites || []).includes(pid);
                                            const isSaved = (interactions.Shortlists || []).includes(pid);
                                            return (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleToggleFavorite(e, pid)}
                                                        aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                                        title={isFav ? 'Remove from favourites' : 'Add to favourites'}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isFav ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-600 hover:bg-pink-200'}`}
                                                    >
                                                        <HeartIcon filled={isFav} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleToggleShortlist(e, pid)}
                                                        aria-label={isSaved ? 'Remove from saved' : 'Save profile'}
                                                        title={isSaved ? 'Remove from saved' : 'Save profile'}
                                                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSaved ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
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

            {profiles.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-text-light">{t('topLiveProfilesEmpty')}</p>
                </div>
            )}

            {(!user || !isManagedSubAccount(user)) && (
                <div className="text-center mt-12">
                    <Link
                        href="/profiles"
                        className="inline-block px-8 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors"
                    >
                        {t('viewAllProfiles')}
                    </Link>
                </div>
            )}

            {actionToast && (
                <div
                    style={{
                        position: 'fixed',
                        top: 'calc(72px + env(safe-area-inset-top, 0px))',
                        right: 'max(16px, env(safe-area-inset-right, 0px))',
                        bottom: 'auto',
                        zIndex: 2000,
                        background: '#1f7a3f',
                        color: '#fff',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                    }}
                >
                    {actionToast}
                </div>
            )}
        </section>
    );
}
