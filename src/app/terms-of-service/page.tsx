'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import AnimateIn from '../../components/AnimateIn';

export default function TermsOfServicePage() {
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [registerAsMatchmaker, setRegisterAsMatchmaker] = useState(false);

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify', blogId?: number) => {
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
                onOpenVerify={() => openModal('verify')}
            />

            <AnimateIn delay={0}>
                <section className="min-h-[60vh] bg-gradient-to-b from-cream-light to-white px-4 pb-10 pt-28 sm:px-6 sm:pt-32 lg:px-8">
                    <div className="mx-auto w-full max-w-5xl">
                        <div className="rounded-3xl border border-primary/15 bg-white p-6 shadow-sm sm:p-8 md:p-10">
                            <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                                Legal
                            </p>
                            <h1 className="mt-4 text-3xl font-playfair font-bold text-text-dark sm:text-4xl md:text-5xl">
                                Terms of Service
                            </h1>
                            <p className="mt-3 text-sm font-medium text-gray-600">Last updated: April 7, 2026</p>
                            <p className="mt-5 max-w-3xl text-gray-700">
                                These sample terms explain the rules for using MyMatch.lk, including user responsibilities,
                                acceptable platform behavior, and service limitations.
                            </p>
                            <div className="mt-8 border-t border-gray-200 pt-8 text-gray-700">
                                <h2 className="text-2xl font-playfair font-semibold text-text-dark">1. Acceptance of Terms</h2>
                                <p className="mt-3 leading-7">
                                    By accessing or using MyMatch.lk, you agree to follow these Terms of Service and all
                                    applicable laws and regulations.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">2. Account Responsibilities</h2>
                                <p className="mt-3 leading-7">
                                    You are responsible for providing accurate information, protecting your login details, and
                                    ensuring your account activity complies with platform rules.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">3. Acceptable Use</h2>
                                <p className="mt-3 leading-7">You agree not to misuse the platform, including:</p>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Posting false or misleading profile details</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Harassing, abusing, or threatening other users</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Attempting unauthorized access to any account or system</span></li>
                                </ul>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">4. Subscription and Payments</h2>
                                <p className="mt-3 leading-7">
                                    Paid features are available through subscription plans. Pricing, billing cycle, and renewal
                                    details are shown before payment confirmation.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">5. Limitation of Liability</h2>
                                <p className="mt-3 leading-7">
                                    MyMatch.lk provides services on an as-is basis. We are not responsible for outcomes of user
                                    interactions outside the platform or circumstances beyond our control.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">6. Contact</h2>
                                <p className="mt-3 leading-7">
                                    If you have questions about these terms, contact us at{' '}
                                    <a href="mailto:support@mymatch.lk" className="font-semibold text-primary hover:underline">
                                        support@mymatch.lk
                                    </a>
                                    .
                                </p>
                            </div>

                            <div className="mt-8 border-t border-gray-200 pt-6">
                                <p className="text-sm text-gray-600">Need help understanding these terms?</p>
                                <Link href="/contact" className="mt-3 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
                                    Contact Support
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
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
