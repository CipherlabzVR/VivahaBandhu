'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import SearchSection from '../../components/SearchSection';

export default function ProfilesPage() {
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog', blogId?: number) => {
        setActiveModal(modal);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
    };

    return (
        <main>
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
            />
            <div className="pt-20">
                <SearchSection
                    onOpenProfileDetail={() => openModal('profile')}
                />
            </div>
            <Footer />
            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
            />
        </main>
    );
}

