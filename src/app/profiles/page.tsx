'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import SearchSection from '../../components/SearchSection';

export default function ProfilesPage() {
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | null>(null);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile') => {
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
            />
        </main>
    );
}

