'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import AnimateIn from '../../components/AnimateIn';

export default function PrivacyPolicyPage() {
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
                                Privacy Policy
                            </h1>
                            <p className="mt-3 text-sm font-medium text-gray-600">Last updated: April 7, 2026</p>
                            <p className="mt-5 max-w-3xl text-gray-700">
                                This is a sample privacy policy for demonstration purposes. It explains how MyMatch.lk may
                                collect, use, and protect user information when using the platform.
                            </p>
                            <div className="mt-8 border-t border-gray-200 pt-8 text-gray-700">
                                <h2 className="text-2xl font-playfair font-semibold text-text-dark">1. Information We Collect</h2>
                                <p className="mt-3 leading-7">
                                    We may collect account details (name, email, phone), profile information, preferences, and
                                    communication data necessary to provide matchmaking services.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">2. How We Use Information</h2>
                                <p className="mt-3 leading-7">Your information may be used to:</p>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Create and manage your account</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Show relevant profile matches</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Provide support and service updates</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Improve platform safety and experience</span></li>
                                </ul>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">3. Data Sharing</h2>
                                <p className="mt-3 leading-7">
                                    We do not sell personal information. We may share limited data with trusted service
                                    providers or when required by law.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">4. Data Security</h2>
                                <p className="mt-3 leading-7">
                                    We use reasonable administrative and technical safeguards to protect your data. However, no
                                    online service can guarantee absolute security.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">5. Your Choices</h2>
                                <p className="mt-3 leading-7">
                                    You may review or update your profile information and can request account deletion by
                                    contacting support.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">6. Contact</h2>
                                <p className="mt-3 leading-7">
                                    For privacy-related questions, please email us at{' '}
                                    <a href="mailto:privacy@mymatch.lk" className="font-semibold text-primary hover:underline">
                                        privacy@mymatch.lk
                                    </a>
                                    .
                                </p>
                            </div>

                            <div className="mt-8 border-t border-gray-200 pt-6">
                                <p className="text-sm text-gray-600">Need help with your account data or privacy request?</p>
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
