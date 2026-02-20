'use client';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface MatchmakerProps {
    onOpenRegister: () => void;
}

export default function Matchmaker({ onOpenRegister }: MatchmakerProps) {
    const { user } = useAuth();
    const { t } = useLanguage();
    const isMatchmaker = user && user.accountType === 'Matchmaker';
    return (
        <section className="py-24 px-4 bg-cream" id="matchmaker">
            <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
                {/* Image on the left */}
                <div className="order-2 lg:order-1">
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                        <img 
                            src="/match.jpg" 
                            alt="Professional Matchmaker" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                
                {/* Content on the right */}
                <div className="order-1 lg:order-2">
                    <div className="mb-6">
                        <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
                            {t('forProfessionals')}
                        </span>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-bold text-text-dark mb-6 leading-tight">
                            {t('areYouMatchmaker')}
                        </h2>
                        <p className="text-text-light text-lg md:text-xl mb-8 leading-relaxed">
                            {t('matchmakerDesc')}
                        </p>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-dark mb-1">{t('unlimitedProfiles')}</h4>
                                <p className="text-text-light text-sm">{t('unlimitedProfilesDesc')}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-dark mb-1">{t('clientDashboard')}</h4>
                                <p className="text-text-light text-sm">{t('clientDashboardDesc')}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-dark mb-1">{t('verifiedBadge')}</h4>
                                <p className="text-text-light text-sm">{t('verifiedBadgeDesc')}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-dark mb-1">{t('prioritySupport')}</h4>
                                <p className="text-text-light text-sm">{t('prioritySupportDesc')}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-text-dark mb-1">{t('bulkCommunication')}</h4>
                                <p className="text-text-light text-sm">{t('bulkCommunicationDesc')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <button className="px-8 py-4 bg-primary text-white rounded-full font-semibold hover:bg-primary-dark transition-all hover:shadow-lg hover:shadow-primary/30 flex items-center gap-2 w-full md:w-auto justify-center" onClick={onOpenRegister}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {t('registerAsMatchmaker')}
                    </button>
                </div>
                {isMatchmaker && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl">
                        <h4 className="text-2xl font-playfair font-bold text-text-dark mb-6">{t('yourClientProfiles')}</h4>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" className="w-16 h-16 rounded-full object-cover" alt="Client" />
                                <div>
                                    <h5 className="font-semibold text-text-dark">Amaya Fernando</h5>
                                    <p className="text-text-light text-sm">26 years • Bride • Colombo</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" className="w-16 h-16 rounded-full object-cover" alt="Client" />
                                <div>
                                    <h5 className="font-semibold text-text-dark">Ravindu Silva</h5>
                                    <p className="text-text-light text-sm">29 years • Groom • Kandy</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-cream rounded-xl">
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" className="w-16 h-16 rounded-full object-cover" alt="Client" />
                                <div>
                                    <h5 className="font-semibold text-text-dark">Ishara Perera</h5>
                                    <p className="text-text-light text-sm">24 years • Bride • Galle</p>
                                </div>
                            </div>
                        </div>
                        <button className="w-full px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2">
                            <span>+</span> {t('addNewProfile')}
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
