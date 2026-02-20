'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import { mockProfiles, Profile } from '../../data/mockProfiles';
import Image from 'next/image';

function SearchContent() {
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
    const [results, setResults] = useState<Profile[]>([]);

    useEffect(() => {
        const gender = searchParams.get('gender');
        const ageFrom = searchParams.get('ageFrom');
        const ageTo = searchParams.get('ageTo');
        const religion = searchParams.get('religion');
        const district = searchParams.get('district');

        const filtered = mockProfiles.filter(profile => {
            // Filter by Gender (Look for Bride -> Female, Groom -> Male)
            if (gender && gender !== 'Any') {
                const targetGender = gender === 'Bride' ? 'Female' : 'Male';
                if (profile.gender !== targetGender) return false;
            }

            // Filter by Age
            if (ageFrom && profile.age < parseInt(ageFrom)) return false;
            if (ageTo && profile.age > parseInt(ageTo)) return false;

            // Filter by Religion
            if (religion && religion !== 'Any' && profile.religion !== religion) return false;

            // Filter by District
            if (district && district !== 'Any' && profile.district !== district) return false;

            return true;
        });

        setResults(filtered);
    }, [searchParams]);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog') => {
        setActiveModal(modal);
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    return (
        <main>
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
            />

            <div style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px' }}>
                <h1>Search Results</h1>
                <p style={{ marginBottom: '2rem', color: '#666' }}>Found {results.length} profiles based on your criteria.</p>

                {results.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
                        {results.map(profile => (
                            <div key={profile.id} style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.3s' }}>
                                <div style={{ position: 'relative', height: '300px' }}>
                                    <img src={profile.image} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', color: 'white' }}>
                                        <h3 style={{ margin: 0 }}>{profile.name}, {profile.age}</h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9 }}>{profile.profession}</p>
                                    </div>
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                        <span>Religion:</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>{profile.religion}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
                                        <span>District:</span>
                                        <span style={{ fontWeight: 500, color: '#333' }}>{profile.district}</span>
                                    </div>
                                    <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => openModal('login')}>View Profile</button>
                                </div>
                            </div>
                        ))}
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
            />
        </main>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<main style={{ paddingTop: '100px', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading search...</main>}>
            <SearchContent />
        </Suspense>
    );
}
