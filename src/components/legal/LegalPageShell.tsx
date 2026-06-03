'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../Header';
import Footer from '../Footer';
import Modals from '../Modals';
import AnimateIn from '../AnimateIn';
import { useLanguage } from '../../context/LanguageContext';

type LegalPageShellProps = {
    title: string;
    effectiveDateLabel: string;
    children: React.ReactNode;
    /** Cross-link to the companion legal document */
    siblingHref?: '/terms-of-service' | '/privacy-policy' | '/cookie-policy' | '/refund-policy';
    siblingTitleKey?: 'privacyPolicy' | 'termsOfService' | 'cookiePolicy' | 'refundPolicy';
};

export default function LegalPageShell({
    title,
    effectiveDateLabel,
    children,
    siblingHref,
    siblingTitleKey,
}: LegalPageShellProps) {
    const { t } = useLanguage();
    const [activeModal, setActiveModal] = useState<
        'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null
    >(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);

    const openModal = (
        modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify',
        blogId?: number
    ) => {
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
        <main className="min-h-screen bg-cream">
            <Header
                onOpenLogin={() => openModal('login')}
                onOpenRegister={() => openModal('register')}
                onOpenVerify={() => openModal('verify')}
            />

            {/* Hero band — aligns with About / brand (cream, orange, Playfair) */}
            <section className="relative overflow-hidden border-b border-orange-100/80 bg-gradient-to-b from-white via-cream to-cream-dark/30">
                <div
                    className="pointer-events-none absolute -top-24 right-[-10%] h-72 w-72 rounded-full bg-primary/15 blur-3xl"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute bottom-0 left-[10%] h-56 w-56 rounded-full bg-rose-200/30 blur-3xl"
                    aria-hidden
                />
                <div className="relative z-10 mx-auto max-w-[1400px] px-4 py-12 md:py-14 lg:px-12">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm font-medium text-primary transition-colors hover:text-primary-dark hover:underline"
                    >
                        ← {t('backToHome')}
                    </Link>
                    <h1 className="mt-6 font-playfair text-3xl font-bold tracking-tight text-text-dark md:text-4xl lg:text-[2.65rem]">
                        <span className="text-primary">{title}</span>
                    </h1>
                    <p className="mt-3 max-w-2xl text-base text-text-light">{effectiveDateLabel}</p>
                    {siblingHref && siblingTitleKey ? (
                        <p className="mt-6 text-sm text-text-light">
                            {t('legalCrossLinkLead')}{' '}
                            <Link
                                href={siblingHref}
                                className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark"
                            >
                                {t(siblingTitleKey)}
                            </Link>
                            .
                        </p>
                    ) : null}
                </div>
            </section>

            <AnimateIn delay={0}>
                <article className="mx-auto max-w-3xl px-4 py-12 text-text-light lg:px-12 md:py-16">
                    {children}
                </article>
            </AnimateIn>

            <AnimateIn delay={40}>
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
