'use client';

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Profiles from '../components/Profiles';
import HowItWorks from '../components/HowItWorks';
import Matchmaker from '../components/Matchmaker';
import TopProfiles from '../components/TopProfiles';
import Blog from '../components/Blog';
import FAQ from '../components/FAQ';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';
import Modals from '../components/Modals';
import AnimateIn from '../components/AnimateIn';
import { matrimonialService } from '../services/matrimonialService';

export default function Home() {
  const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify', blogId?: number, profile?: any) => {
    setActiveModal(modal);
    if (modal === 'register') {
      setRegisterAsMatchmaker(false);
    }
    if (modal === 'blog' && blogId) {
      setSelectedBlogId(blogId);
    }
    if (modal === 'profile' && profile) {
      setSelectedProfile(profile);
    }
  };

  const openRegisterAsMatchmaker = () => {
    setRegisterAsMatchmaker(true);
    setActiveModal('register');
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedBlogId(null);
    setRegisterAsMatchmaker(false);
    setSelectedProfile(null);
  };

  useEffect(() => {
    const handleOpenVerify = () => openModal('verify');
    window.addEventListener('open-verify-modal', handleOpenVerify);
    return () => window.removeEventListener('open-verify-modal', handleOpenVerify);
  }, []);

  useEffect(() => {
    const webLink =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    if (!webLink) return;
    matrimonialService.saveCorsLink(webLink, true);
  }, []);

  return (
    <main>
      <Header
        onOpenLogin={() => openModal('login')}
        onOpenRegister={() => openModal('register')}
        onOpenVerify={() => openModal('verify')}
      />
      <AnimateIn delay={0}>
        <Hero
          onOpenLogin={() => openModal('login')}
          onOpenRegister={() => openModal('register')}
        />
      </AnimateIn>
      <AnimateIn delay={100}>
        <Features onOpenRegister={() => openModal('register')} />
      </AnimateIn>
      <AnimateIn delay={150}>
        <Profiles
          onOpenSubscription={() => openModal('subscription')}
          onOpenProfileDetail={(profile) => openModal('profile', undefined, profile)}
        />
      </AnimateIn>
      <AnimateIn delay={100}>
        <HowItWorks />
      </AnimateIn>
      <AnimateIn delay={150}>
        <Matchmaker
          onOpenRegister={openRegisterAsMatchmaker}
        />
      </AnimateIn>
      <AnimateIn delay={150}>
        <TopProfiles
          onOpenProfileDetail={(profile) => openModal('profile', undefined, profile)}
        />
      </AnimateIn>
      <AnimateIn delay={100}>
        <Blog onOpenBlogDetail={(blogId) => openModal('blog', blogId)} />
      </AnimateIn>
      <AnimateIn delay={150}>
        <FAQ />
      </AnimateIn>
      <AnimateIn delay={100}>
        <Pricing
          onOpenSubscription={() => openModal('subscription')}
        />
      </AnimateIn>
      <AnimateIn delay={50}>
        <Footer />
      </AnimateIn>
      <Modals
        activeModal={activeModal}
        onClose={closeModal}
        onSwitch={openModal}
        selectedBlogId={selectedBlogId}
        selectedProfile={selectedProfile}
        registerAsMatchmaker={registerAsMatchmaker}
      />
    </main>
  );
}
