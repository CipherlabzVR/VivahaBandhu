'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import { matrimonialService } from '../../services/matrimonialService';

function SearchContent() {
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [results, setResults] = useState<any[]>([]);

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

                    const filtered = allProfiles.filter((profile: any) => {
                        if (gender && gender !== 'Any') {
                            const targetGender = gender === 'Bride' ? 'Female' : 'Male';
                            if (profile.gender !== targetGender) return false;
                        }
                        if (ageFrom && profile.age < parseInt(ageFrom)) return false;
                        if (ageTo && profile.age > parseInt(ageTo)) return false;
                        if (religion && religion !== 'Any' && profile.religion !== religion) return false;
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
    }, [searchParams]);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog', blogId?: number, profile?: any) => {
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
            />

            <div style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px' }}>
                <h1>Search Results</h1>
                <p style={{ marginBottom: '2rem', color: '#666' }}>Found {results.length} profiles based on your criteria.</p>

                {results.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                        {results.map(profile => {
                            const placeholderImg = profile.gender === "Female"
                                ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
                                : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400";

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
                                            <span style={{ fontWeight: 500, color: '#333' }}>{profile.religion || 'Not Specified'}</span>
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
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} />
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
