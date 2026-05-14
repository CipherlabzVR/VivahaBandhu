'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import CustomDropdown from '../../components/CustomDropdown';
import { matrimonialService } from '../../services/matrimonialService';
import { getDefaultAvatarDataUri } from '../../utils/defaultAvatar';
import { religionFilterMatches } from '../../utils/religionMatch';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { isManagedSubAccount } from '../../utils/managedSubAccount';
import { MATRIMONIAL_RELIGION_OPTIONS } from '../../constants/matrimonialReligions';
import { validateMatrimonialSearchAge } from '../../utils/matrimonialSearchAge';
import {
    type QuickSearchState,
    quickSearchFromUrlParams,
    writeQuickSearchSession,
} from '../../utils/quickSearchSession';
import { showToast } from '../../utils/toast';

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const { user, loading } = useAuth();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [results, setResults] = useState<any[]>([]);

    const [quickFilters, setQuickFilters] = useState<QuickSearchState>(() => quickSearchFromUrlParams(searchParams));
    const paramsKey = searchParams.toString();
    useEffect(() => {
        setQuickFilters(quickSearchFromUrlParams(searchParams));
    }, [paramsKey, searchParams]);

    const handleQuickFilterChange = useCallback((name: string, value: string) => {
        setQuickFilters((prev) => ({ ...prev, [name]: value }));
    }, []);

    const applyQuickSearch = useCallback(() => {
        const ageCheck = validateMatrimonialSearchAge(quickFilters.ageFrom, quickFilters.ageTo);
        if (!ageCheck.ok) {
            showToast(ageCheck.message, 'error');
            return;
        }
        const next = new URLSearchParams();
        next.set('gender', quickFilters.gender);
        next.set('ageFrom', quickFilters.ageFrom);
        next.set('ageTo', quickFilters.ageTo);
        next.set('religion', quickFilters.religion);
        const q = searchParams.get('q');
        if (q) next.set('q', q);
        const district = searchParams.get('district');
        if (district) next.set('district', district);
        writeQuickSearchSession(quickFilters);
        router.replace(`/search?${next.toString()}`);
    }, [quickFilters, router, searchParams]);

    useEffect(() => {
        if (loading) return;
        if (user && isManagedSubAccount(user)) {
            router.replace('/profile');
        }
    }, [loading, user, router]);

    useEffect(() => {
        const fetchAndFilterProfiles = async () => {
            try {
                // Fetch up to 100 recent profiles and filter them on the client side since we don't have a search endpoint yet
                const res = await matrimonialService.getRecentProfiles(100);
                if (res.statusCode === 200 && res.result) {
                    const allProfiles = res.result;

                    const gender = searchParams.get('gender');
                    const ageFrom = searchParams.get('ageFrom');
                    const ageTo = searchParams.get('ageTo');
                    const religion = searchParams.get('religion');
                    const district = searchParams.get('district');
                    const qRaw = searchParams.get('q');
                    const q = (qRaw ?? '').trim().toLowerCase();

                    const filtered = allProfiles.filter((profile: any) => {
                        if (user?.id != null) {
                            const pid = Number(profile.userId ?? profile.UserId ?? 0);
                            if (pid === Number(user.id)) return false;
                        }
                        if (q) {
                            const idStr =
                                profile.id != null
                                    ? String(profile.id)
                                    : profile.Id != null
                                        ? String(profile.Id)
                                        : '';
                            const blob = [
                                profile.firstName,
                                profile.lastName,
                                profile.occupation,
                                profile.cityOfResidence,
                                idStr,
                                profile.matrimonialProfileId != null ? String(profile.matrimonialProfileId) : '',
                                profile.displayId,
                                profile.profileCode,
                            ]
                                .filter(Boolean)
                                .join(' ')
                                .toLowerCase();
                            if (!blob.includes(q)) {
                                const parts = q.split(/\s+/).filter(Boolean);
                                if (!parts.length || !parts.every((w: string) => blob.includes(w))) return false;
                            }
                        }
                        if (gender && gender !== 'Any') {
                            const targetGender = gender === 'Bride' ? 'Female' : 'Male';
                            if (profile.gender !== targetGender) return false;
                        }
                        if (ageFrom && profile.age < parseInt(ageFrom)) return false;
                        if (ageTo && profile.age > parseInt(ageTo)) return false;
                        const profRel = profile.religion ?? profile.Religion;
                        if (religion && religion !== 'Any' && !religionFilterMatches(profRel, religion)) return false;
                        if (district && district !== 'Any' && profile.cityOfResidence !== district) return false;
                        return true;
                    });

                    setResults(filtered);
                }
            } catch (error) {
                console.error("Failed to load search results", error);
            }
        };
        fetchAndFilterProfiles();
    }, [searchParams, user?.id]);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify', blogId?: number, profile?: any) => {
        setActiveModal(modal);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
        if (modal === 'profile' && profile) setSelectedProfile(profile);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
        setSelectedProfile(null);
    };

    return (
        <>
            <Header 
                onOpenLogin={() => openModal('login')} 
                onOpenRegister={() => openModal('register')} 
                onOpenVerify={() => openModal('verify')}
            />

            <div style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px' }}>
                <h1>Search Results</h1>
                <p style={{ marginBottom: '1rem', color: '#666' }}>Found {results.length} profiles based on your criteria.</p>

                <div
                    className={`mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 ${language === 'si' ? 'font-sinhala' : ''}`}
                >
                    <h2 className="mb-3 text-center font-playfair text-lg font-semibold text-text-dark">{t('quickSearch')}</h2>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="w-full sm:w-[calc(50%-0.5rem)] md:flex-1 md:min-w-[150px]">
                            <CustomDropdown
                                name="gender"
                                value={quickFilters.gender}
                                onChange={handleQuickFilterChange}
                                options={[
                                    { value: 'Bride', label: 'Bride' },
                                    { value: 'Groom', label: 'Groom' },
                                ]}
                                label={t('imLookingFor')}
                            />
                        </div>
                        <div className="w-full sm:w-[calc(50%-0.5rem)] md:flex-1 md:min-w-[120px]">
                            <CustomDropdown
                                name="ageFrom"
                                value={quickFilters.ageFrom}
                                onChange={handleQuickFilterChange}
                                options={[18, 20, 22, 24, 26, 28, 30, 35, 40, 45, 50].map((age) => ({
                                    value: age.toString(),
                                    label: age.toString(),
                                }))}
                                label={t('ageFrom')}
                            />
                        </div>
                        <div className="w-full sm:w-[calc(50%-0.5rem)] md:flex-1 md:min-w-[120px]">
                            <CustomDropdown
                                name="ageTo"
                                value={quickFilters.ageTo}
                                onChange={handleQuickFilterChange}
                                options={[20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60].map((age) => ({
                                    value: age.toString(),
                                    label: age.toString(),
                                }))}
                                label={t('ageTo')}
                            />
                        </div>
                        <div className="w-full sm:w-[calc(50%-0.5rem)] md:flex-1 md:min-w-[150px]">
                            <CustomDropdown
                                name="religion"
                                value={quickFilters.religion}
                                onChange={handleQuickFilterChange}
                                options={[
                                    { value: '', label: 'Select Religion' },
                                    ...MATRIMONIAL_RELIGION_OPTIONS.map((r) => ({ value: r, label: r })),
                                ]}
                                label={t('religion')}
                            />
                        </div>
                        <div className="w-full md:w-auto md:min-w-[150px]">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary-dark hover:shadow-lg"
                                onClick={applyQuickSearch}
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                {t('searchNow')}
                            </button>
                        </div>
                    </div>
                </div>

                {results.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                        {results.map(profile => {
                            const placeholderImg = getDefaultAvatarDataUri({
                                firstName: profile.firstName,
                                lastName: profile.lastName,
                                gender: profile.gender,
                            });

                            return (
                                <div key={profile.id} onClick={() => openModal('profile', undefined, profile)} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.3s', cursor: 'pointer' }}>
                                    <div style={{ position: 'relative', height: '300px' }}>
                                        <img src={profile.profilePhoto || placeholderImg} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', color: 'white' }}>
                                            <h3 style={{ margin: 0 }}>{profile.firstName || 'User'} {profile.lastName || ''}, {profile.age || 0}</h3>
                                            <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>{profile.occupation || 'Not Specified'}</p>
                                        </div>
                                    </div>
                                    <div style={{ padding: '1.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                            <span>Religion:</span>
                                            <span style={{ fontWeight: 500, color: '#333' }}>{(profile.religion ?? profile.Religion) || 'Not Specified'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
                                            <span>District:</span>
                                            <span style={{ fontWeight: 500, color: '#333' }}>{profile.cityOfResidence || 'Unknown'}</span>
                                        </div>
                                        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); openModal('profile', undefined, profile); }}>View Profile</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '3rem', background: '#f9f9f9', borderRadius: '15px' }}>
                        <h3>No profiles found</h3>
                        <p>Try adjusting your search criteria to find who you are looking for.</p>
                    </div>
                )}
            </div>

            <Footer />

            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
                selectedProfile={selectedProfile}
            />
        </>
    );
}

function SearchFallback() {
    return (
        <>
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} onOpenVerify={() => { }} />
            <div style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px', textAlign: 'center', color: '#666' }}>
                <h1>Search Results</h1>
                <p>Loading...</p>
            </div>
            <Footer />
        </>
    );
}

export default function SearchPage() {
    return (
        <main>
            <Suspense fallback={<SearchFallback />}>
                <SearchContent />
            </Suspense>
        </main>
    );
}
