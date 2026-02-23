'use client';

import { useState } from 'react';
import Header from '../../components/Header';
import AboutHero from '../../components/AboutHero';
import WhoAreWe from '../../components/WhoAreWe';
import QuoteSection from '../../components/QuoteSection';
import AboutStats from '../../components/AboutStats';
import OurSpecialty from '../../components/OurSpecialty';
import FindYourSoulmate from '../../components/FindYourSoulmate';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import AnimateIn from '../../components/AnimateIn';

export default function AboutPage() {
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog', blogId?: number) => {
        setActiveModal(modal);
        if (modal === 'register') setRegisterAsMatchmaker(false);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
        setRegisterAsMatchmaker(false);
    };

    return (
        <main>
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
            />
            <AnimateIn delay={0}>
                <AboutHero />
            </AnimateIn>
            <AnimateIn delay={80}>
                <WhoAreWe />
            </AnimateIn>
            <AnimateIn delay={80}>
                <QuoteSection />
            </AnimateIn>
            <AnimateIn delay={80}>
                <AboutStats />
            </AnimateIn>
            <AnimateIn delay={80}>
                <OurSpecialty />
            </AnimateIn>
            <AnimateIn delay={80}>
                <FindYourSoulmate onOpenRegister={() => openModal('register')} />
            </AnimateIn>
            <AnimateIn delay={50}>
                <Footer />
            </AnimateIn>
            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
                registerAsMatchmaker={registerAsMatchmaker}
            />
        </main>
    );
}
