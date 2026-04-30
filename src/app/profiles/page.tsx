'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import SearchSection from '../../components/SearchSection';
import { useAuth } from '../../context/AuthContext';
import { isManagedSubAccount } from '../../utils/managedSubAccount';

function ProfilesPageInner() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<
        'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null
    >(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const viewUserHandled = useRef<string | null>(null);

    useEffect(() => {
        if (loading) return;
        if (user && isManagedSubAccount(user)) {
            router.replace('/profile');
        }
    }, [loading, user, router]);

    const openModal = (
        modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify',
        blogId?: number,
        profile?: any
    ) => {
        setActiveModal(modal);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
        if (modal === 'profile' && profile) setSelectedProfile(profile);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
        setSelectedProfile(null);
    };

    useEffect(() => {
        const raw = searchParams.get('viewUser');
        if (!raw) {
            viewUserHandled.current = null;
            return;
        }
        if (raw === viewUserHandled.current) return;

        const uid = Number(raw);
        if (!Number.isFinite(uid) || uid <= 0) return;
        if (loading) return;

        viewUserHandled.current = raw;
        openModal('profile', undefined, { userId: uid });
        router.replace('/profiles', { scroll: false });
    }, [loading, router, searchParams]);

    return (
        <main>
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
                onOpenVerify={() => openModal('verify')}
            />
            {!(user && isManagedSubAccount(user)) && (
                <div className="pt-20">
                    <SearchSection onOpenProfileDetail={(profile) => openModal('profile', undefined, profile)} />
                </div>
            )}
            <Footer />
            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
                selectedProfile={selectedProfile}
            />
        </main>
    );
}

export default function ProfilesPage() {
    return (
        <Suspense fallback={<div className="min-h-[40vh] pt-24 text-center text-sm text-gray-500">Loading…</div>}>
            <ProfilesPageInner />
        </Suspense>
    );
}
