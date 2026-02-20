'use client';

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

interface ProfilesProps {
    onOpenSubscription: () => void;
}

export default function Profiles({ onOpenSubscription }: ProfilesProps) {
    const { t } = useLanguage();
    return (
        <section className="py-24 px-4 bg-white" id="profiles">
            <div className="text-center max-w-2xl mx-auto mb-16">
                <h2 className="text-4xl md:text-5xl font-playfair font-bold text-text-dark mb-4">{t('featuredProfiles')}</h2>
                <p className="text-text-light text-lg md:text-xl">{t('featuredProfilesDesc')}</p>
            </div>
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Profile 1 - Visible */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">{t('verified')}</span>
                    <div className="relative">
                        <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" alt="Profile" className="w-full h-80 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                            <div className="text-xl font-semibold">Nethmi P.</div>
                            <div className="text-sm opacity-90">26 years • Colombo</div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🎓</span> BSc in Computer Science
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>💼</span> Software Engineer
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🙏</span> Buddhist, Sinhala
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <span className="text-primary font-semibold">92% {t('match')}</span>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 flex items-center justify-center transition-colors">❤️</button>
                                <button className="w-10 h-10 rounded-full bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center transition-colors">⭐</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile 2 - Blurred (Free account limitation) */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">{t('verified')}</span>
                    <div className="relative">
                        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" alt="Profile" className="w-full h-80 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                            <div className="text-xl font-semibold">Kasun R.</div>
                            <div className="text-sm opacity-90">29 years • Kandy</div>
                        </div>
                    </div>
                    <div className="p-6 relative">
                        <div className="space-y-3 mb-4 blur-sm">
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🎓</span> MBA
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>💼</span> Business Analyst
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🙏</span> Buddhist, Sinhala
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 blur-sm">
                            <span className="text-primary font-semibold">88% {t('match')}</span>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 flex items-center justify-center transition-colors">❤️</button>
                                <button className="w-10 h-10 rounded-full bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center transition-colors">⭐</button>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-b-3xl">
                            <span className="text-4xl mb-2">🔒</span>
                            <p className="text-center text-text-dark mb-4 font-medium">{t('subscribeToView')}</p>
                            <button className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors" onClick={onOpenSubscription}>{t('upgradeNow')}</button>
                        </div>
                    </div>
                </div>

                {/* Profile 3 */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">{t('verified')}</span>
                    <div className="relative">
                        <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400" alt="Profile" className="w-full h-80 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                            <div className="text-xl font-semibold">Dilani S.</div>
                            <div className="text-sm opacity-90">24 years • Gampaha</div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🎓</span> MBBS
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>💼</span> Medical Doctor
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🙏</span> Buddhist, Sinhala
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <span className="text-primary font-semibold">85% {t('match')}</span>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 flex items-center justify-center transition-colors">❤️</button>
                                <button className="w-10 h-10 rounded-full bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center transition-colors">⭐</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile 4 - Blurred */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                    <span className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold z-10">{t('verified')}</span>
                    <div className="relative">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400" alt="Profile" className="w-full h-80 object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                            <div className="text-xl font-semibold">Tharindu W.</div>
                            <div className="text-sm opacity-90">31 years • Colombo</div>
                        </div>
                    </div>
                    <div className="p-6 relative">
                        <div className="space-y-3 mb-4 blur-sm">
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🎓</span> Civil Engineer
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>💼</span> Project Manager
                            </div>
                            <div className="flex items-center gap-2 text-text-light">
                                <span>🙏</span> Buddhist, Sinhala
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 blur-sm">
                            <span className="text-primary font-semibold">78% {t('match')}</span>
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-full bg-pink-100 hover:bg-pink-200 flex items-center justify-center transition-colors">❤️</button>
                                <button className="w-10 h-10 rounded-full bg-yellow-100 hover:bg-yellow-200 flex items-center justify-center transition-colors">⭐</button>
                            </div>
                        </div>
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-b-3xl">
                            <span className="text-4xl mb-2">🔒</span>
                            <p className="text-center text-text-dark mb-4 font-medium">{t('subscribeToView')}</p>
                            <button className="px-6 py-2 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-colors" onClick={onOpenSubscription}>{t('upgradeNow')}</button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-center mt-12">
                <Link href="/profiles" className="inline-block px-8 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors">{t('viewAllProfiles')}</Link>
            </div>
        </section>
    );
}
