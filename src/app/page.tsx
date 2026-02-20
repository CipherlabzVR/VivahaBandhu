'use client';

import { useState } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Profiles from '../components/Profiles';
import HowItWorks from '../components/HowItWorks';
import Matchmaker from '../components/Matchmaker';
import SearchSection from '../components/SearchSection';
import TopProfiles from '../components/TopProfiles';
import Blog from '../components/Blog';
import FAQ from '../components/FAQ';
import Pricing from '../components/Pricing';
import Footer from '../components/Footer';
import Modals from '../components/Modals';

export default function Home() {
  const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);

  const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog', blogId?: number) => {
    setActiveModal(modal);
    if (modal === 'register') {
      setRegisterAsMatchmaker(false);
    }
    if (modal === 'blog' && blogId) {
      setSelectedBlogId(blogId);
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
  };

  return (
    <main>
      <Header
        onOpenLogin={() => openModal('login')}
        onOpenRegister={() => openModal('register')}
      />
      <Hero
        onOpenLogin={() => openModal('login')}
        onOpenRegister={() => openModal('register')}
      />
      <Features onOpenRegister={() => openModal('register')} />
      <Profiles
        onOpenSubscription={() => openModal('subscription')}
      />
      <HowItWorks />
      <Matchmaker
        onOpenRegister={openRegisterAsMatchmaker}
      />
      <TopProfiles
        onOpenProfileDetail={() => openModal('profile')}
      />
      <Blog onOpenBlogDetail={(blogId) => openModal('blog', blogId)} />
      <FAQ />
      <Pricing
        onOpenSubscription={() => openModal('subscription')}
      />
      <Footer />
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
