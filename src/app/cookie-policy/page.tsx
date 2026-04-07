'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import Modals from '../../components/Modals';
import AnimateIn from '../../components/AnimateIn';

export default function CookiePolicyPage() {
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
                                Cookie Policy
                            </h1>
                            <p className="mt-3 text-sm font-medium text-gray-600">Last updated: April 7, 2026</p>
                            <p className="mt-5 max-w-3xl text-gray-700">
                                This sample cookie policy describes how MyMatch.lk uses cookies and similar technologies to
                                improve website performance, personalization, and security.
                            </p>
                            <div className="mt-8 border-t border-gray-200 pt-8 text-gray-700">
                                <h2 className="text-2xl font-playfair font-semibold text-text-dark">1. What Are Cookies?</h2>
                                <p className="mt-3 leading-7">
                                    Cookies are small text files stored on your device when you visit a website. They help
                                    websites remember your preferences and improve your browsing experience.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">2. How We Use Cookies</h2>
                                <p className="mt-3 leading-7">We may use cookies to:</p>
                                <ul className="mt-3 space-y-2">
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Keep you signed in to your account</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Remember language and user preferences</span></li>
                                    <li className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" /><span>Measure traffic and feature usage</span></li>
                                </ul>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">3. Types of Cookies</h2>
                                <p className="mt-3 leading-7">
                                    Cookies may be essential, functional, or analytics-related. Essential cookies are required
                                    for core website functionality.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">4. Managing Cookies</h2>
                                <p className="mt-3 leading-7">
                                    You can control cookies through browser settings. Disabling some cookies may affect website
                                    performance and feature availability.
                                </p>

                                <h2 className="mt-8 text-2xl font-playfair font-semibold text-text-dark">5. Contact</h2>
                                <p className="mt-3 leading-7">
                                    If you have questions about our cookie usage, contact us at{' '}
                                    <a href="mailto:privacy@mymatch.lk" className="font-semibold text-primary hover:underline">
                                        privacy@mymatch.lk
                                    </a>
                                    .
                                </p>
                            </div>

                            <div className="mt-8 border-t border-gray-200 pt-6">
                                <p className="text-sm text-gray-600">Need help with your cookie preferences?</p>
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
