'use client';

import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
    const { t } = useLanguage();
    return (
        <footer className="bg-text-dark text-white py-16 px-4">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                <div>
                    <div className="text-2xl font-playfair font-bold mb-4">VivahaBandhu</div>
                    <p className="text-gray-300 mb-6">{t('footerTagline')}</p>
                    <div className="flex gap-4">
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">f</a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">i</a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">t</a>
                        <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">y</a>
                    </div>
                </div>
                <div>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('quickLinks')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#profiles" className="text-gray-300 hover:text-primary transition-colors">{t('browseProfiles')}</Link></li>
                        <li><Link href="#how-it-works" className="text-gray-300 hover:text-primary transition-colors">{t('howItWorks')}</Link></li>
                        <li><Link href="#matchmaker" className="text-gray-300 hover:text-primary transition-colors">{t('forMatchmakers')}</Link></li>
                        <li><Link href="#pricing" className="text-gray-300 hover:text-primary transition-colors">{t('pricingPlans')}</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('support')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('helpCenter')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('contactUs')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('safetyTips')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('reportMisuse')}</Link></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-lg font-playfair font-semibold mb-4">{t('legal')}</h4>
                    <ul className="space-y-2">
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('privacyPolicy')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('termsOfService')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('cookiePolicy')}</Link></li>
                        <li><Link href="#" className="text-gray-300 hover:text-primary transition-colors">{t('refundPolicy')}</Link></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-[1400px] mx-auto border-t border-white/10 pt-8 text-center text-gray-400">
                <p>{t('allRightsReserved')}</p>
                <p className="mt-2">{t('madeWithLove')}</p>
            </div>
        </footer>
    );
}
