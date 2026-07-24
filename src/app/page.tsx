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
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { matrimonialService } from '../services/matrimonialService';
import { canConvertToMatchmakerAccountType } from '../utils/matrimonialAccountTypes';
import { showToast } from '../utils/toast';
import { consumePendingSiteHash, endHashScrollGuard, getSiteHashId, prepareSiteHashNavigation } from '../utils/siteHashScroll';
import { cancelFooterScrollRestore } from '../utils/footerScrollRestore';

export default function Home() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
  const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);
  const [showConvertToMatchmakerConfirm, setShowConvertToMatchmakerConfirm] = useState(false);
  const [isConvertingToMatchmaker, setIsConvertingToMatchmaker] = useState(false);
  const [convertToMatchmakerError, setConvertToMatchmakerError] = useState<string | null>(null);

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
    const parentId = user?.parentUserId != null ? Number(user.parentUserId) : 0;
    const isManagedProfile = Number.isFinite(parentId) && parentId > 0;
    if (user && !isManagedProfile && canConvertToMatchmakerAccountType(user.accountType)) {
      setConvertToMatchmakerError(null);
      setShowConvertToMatchmakerConfirm(true);
      return;
    }
    setRegisterAsMatchmaker(true);
    setActiveModal('register');
  };

  const closeConvertToMatchmakerConfirm = () => {
    if (isConvertingToMatchmaker) return;
    setShowConvertToMatchmakerConfirm(false);
    setConvertToMatchmakerError(null);
  };

  const confirmConvertToMatchmaker = async () => {
    if (!user?.id || isConvertingToMatchmaker) return;
    const userId = Number(user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      setConvertToMatchmakerError(t('convertToMatchmakerFailed'));
      return;
    }

    setIsConvertingToMatchmaker(true);
    setConvertToMatchmakerError(null);
    try {
      const response = await matrimonialService.convertToMatchmaker(userId);
      const result = response?.result ?? response?.Result ?? {};
      const nextTier = String(result.matchmakerTier ?? result.MatchmakerTier ?? 'FREE');
      const nextPurchased = Number(
        result.familySubAccountSlotsPurchased ?? result.FamilySubAccountSlotsPurchased ?? 0
      );
      const mmPaid =
        nextPurchased > 0
        || nextTier.toUpperCase() === 'PAYG'
        || nextTier.toUpperCase() === 'GOLD'
        || nextTier.toUpperCase() === 'DIAMOND';
      updateUser({
        accountType: 'Matchmaker',
        isFamilyParentAccount: false,
        isSubscribed: mmPaid,
        isPremiumSelfSubscribed: false,
        matchmakerTier: nextTier,
        matchmakerMaxClientProfiles: result.matchmakerMaxClientProfiles ?? result.MatchmakerMaxClientProfiles ?? 0,
        matchmakerClientProfileCount: result.matchmakerClientProfileCount ?? result.MatchmakerClientProfileCount ?? 0,
        matchmakerCanAddClients: result.matchmakerCanAddClients ?? result.MatchmakerCanAddClients ?? false,
        matchmakerClientSelectionPending: result.matchmakerClientSelectionPending ?? result.MatchmakerClientSelectionPending ?? false,
        familySubAccountSlotsPurchased: result.familySubAccountSlotsPurchased ?? result.FamilySubAccountSlotsPurchased,
        familySubAccountSlotsConsumed: result.familySubAccountSlotsConsumed ?? result.FamilySubAccountSlotsConsumed,
        familySubAccountSlotsMaxTotal: result.familySubAccountSlotsMaxTotal ?? result.FamilySubAccountSlotsMaxTotal,
        familySubAccountAdditionalAmountLkr: result.familySubAccountAdditionalAmountLkr ?? result.FamilySubAccountAdditionalAmountLkr,
        horoscopeDocument: '',
        horoscopeDocument2: '',
        horoscopeDocument3: '',
      });
      setShowConvertToMatchmakerConfirm(false);
      showToast(t('convertToMatchmakerSuccess'), 'success', 4000);
    } catch (err: any) {
      setConvertToMatchmakerError(err?.message || t('convertToMatchmakerFailed'));
    } finally {
      setIsConvertingToMatchmaker(false);
    }
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
    const syncHashScroll = () => {
      const pending = consumePendingSiteHash();
      const id = pending || getSiteHashId();
      if (!id) return;
      cancelFooterScrollRestore();
      if (pending && window.location.hash !== `#${id}`) {
        history.replaceState(history.state, '', `/#${id}`);
      }
      prepareSiteHashNavigation(id, id === 'pricing' ? 'auto' : 'smooth');
    };

    syncHashScroll();
    window.addEventListener('hashchange', syncHashScroll);
    return () => {
      window.removeEventListener('hashchange', syncHashScroll);
      endHashScrollGuard();
    };
  }, []);

  return (
    <main>
      <Header
        onOpenLogin={() => openModal('login')}
        onOpenRegister={() => openModal('register')}
        onOpenVerify={() => openModal('verify')}
      />
      <Hero
        onOpenLogin={() => openModal('login')}
        onOpenRegister={() => openModal('register')}
        onOpenSubscription={() => openModal('subscription')}
      />
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
      {user?.accountType !== 'Matchmaker' ? (
        <AnimateIn delay={150}>
          <Matchmaker onOpenRegister={openRegisterAsMatchmaker} />
        </AnimateIn>
      ) : null}
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

      {showConvertToMatchmakerConfirm ? (
        <div
          className="modal-overlay active"
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          aria-labelledby="convert-matchmaker-confirm-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConvertToMatchmakerConfirm();
          }}
        >
          <div className="modal" style={{ maxWidth: '480px', width: '95%' }}>
            <button
              type="button"
              className="modal-close"
              onClick={closeConvertToMatchmakerConfirm}
              aria-label="Close"
              disabled={isConvertingToMatchmaker}
            >
              ✕
            </button>
            <div className="modal-header">
              <h2 id="convert-matchmaker-confirm-title" style={{ color: '#1f2937' }}>
                {t('convertToMatchmakerTitle')}
              </h2>
            </div>
            <div className="modal-body">
              <p
                style={{
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  color: '#92400e',
                  background: '#fffbeb',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #fcd34d',
                  lineHeight: 1.55,
                }}
              >
                {t('convertToMatchmakerConfirm')}
              </p>
              {convertToMatchmakerError ? (
                <p style={{ marginBottom: '1rem', color: '#b91c1c', fontSize: '0.88rem' }}>
                  {convertToMatchmakerError}
                </p>
              ) : null}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeConvertToMatchmakerConfirm}
                  disabled={isConvertingToMatchmaker}
                >
                  {t('convertToMatchmakerCancelBtn')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void confirmConvertToMatchmaker()}
                  disabled={isConvertingToMatchmaker}
                  style={{
                    opacity: isConvertingToMatchmaker ? 0.75 : 1,
                    cursor: isConvertingToMatchmaker ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isConvertingToMatchmaker ? t('convertToMatchmakerWorking') : t('convertToMatchmakerConfirmBtn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
