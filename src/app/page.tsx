'use client';

import { useState } from 'react';
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
          onOpenProfileDetail={() => openModal('profile')}
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
        registerAsMatchmaker={registerAsMatchmaker}
      />
    </main>
  );
}
