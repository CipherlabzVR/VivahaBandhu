import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';

interface HeaderProps {
    onOpenLogin: () => void;
    onOpenRegister: () => void;
    onOpenVerify?: () => void;
}

export default function Header({ onOpenLogin, onOpenRegister, onOpenVerify }: HeaderProps) {
    const { user, logout, updateUser } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
    useEffect(() => {
        if (!user?.id || user.profilePhoto) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;
        fetch(`${API_BASE_URL}/Matrimonial/GetProfile?userId=${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.result?.profilePhoto) updateUser({ profilePhoto: data.result.profilePhoto });
                // Also update isVerified if available from profile
                if (data?.result?.status !== undefined) {
                    updateUser({ isVerified: data.result.status === 1 });
                }
            })
            .catch(() => {});
    }, [user?.id, user?.profilePhoto, updateUser]);

    return (
        <>
            {user && user.isVerified === false && (
                <div className="bg-red-500 text-white text-center py-2 px-4 text-sm z-[1001] relative flex justify-center items-center gap-4">
                    <span>Your account is not verified. You can only explore the website.</span>
                    <button 
                        onClick={() => {
                            if (onOpenVerify) {
                                onOpenVerify();
                            } else {
                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                            }
                        }}
                        className="bg-white text-red-500 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 transition-colors"
                    >
                        Verify Now
                    </button>
                </div>
            )}
            <header className={`fixed w-full bg-white shadow-gold z-[1000] ${user && user.isVerified === false ? 'top-[36px]' : 'top-0'}`}>
            <div className="max-w-[1400px] mx-auto px-8 py-3 flex justify-between items-center">
                <Link href="/" className="flex items-center h-[50px]">
                    <Image 
                        src="/logo3.png" 
                        alt="MyMatch.lk Logo" 
                        width={200} 
                        height={100}
                        className="h-full w-auto object-contain"
                        priority
                    />
                </Link>
                <nav className="hidden md:flex gap-8 items-center">
                    <Link href="/profiles" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('browseProfiles')}
                    </Link>
                    <Link href="/about" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('aboutUs')}
                    </Link>
                    <Link href="/success-stories" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('successStories')}
                    </Link>
                    <Link href="/contact" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('contactUs')}
                    </Link>
                </nav>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex gap-2">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                language === 'en' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-light hover:text-text-dark'
                            }`}
                        >
                            EN
                        </button>
                        <button 
                            onClick={() => setLanguage('si')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                language === 'si' 
                                    ? 'bg-primary text-white' 
                                    : 'text-text-light hover:text-text-dark'
                            }`}
                        >
                            සිං
                        </button>
                    </div>

                    {user ? (
                        <div className="relative hidden md:block">
                            <div
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user.firstName[0]}{user.lastName[0]}</span>
                                    )}
                                </div>
                                <span className="font-medium hidden sm:inline">{user.firstName}</span>
                            </div>

                            {profileMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white p-4 rounded-lg shadow-lg z-[1000] w-[200px]">
                                    <div className="mb-2 pb-2 border-b border-gray-200">
                                        <strong>{user.firstName} {user.lastName}</strong>
                                        <div className="text-xs text-gray-600">{user.email}</div>
                                    </div>
                                    <Link href="/profile" className="block py-2 text-text-dark no-underline hover:text-primary">
                                        {t('myProfile')}
                                    </Link>
                                    <Link href="#" className="block py-2 text-text-dark no-underline hover:text-primary">
                                        {t('settings')}
                                    </Link>
                                    <div
                                        onClick={() => { logout(); setProfileMenuOpen(false); }}
                                        className="block py-2 text-red-600 cursor-pointer mt-2 border-t border-gray-200 hover:text-red-700"
                                    >
                                        {t('logout')}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="hidden md:flex gap-4">
                            <button 
                                className="px-6 py-2 border-2 border-primary text-primary rounded-full font-medium hover:bg-primary hover:text-white transition-colors" 
                                onClick={onOpenLogin}
                            >
                                {t('login')}
                            </button>
                            <button 
                                className="px-6 py-2 bg-primary text-white rounded-full font-medium hover:bg-primary-dark transition-colors" 
                                onClick={onOpenRegister}
                            >
                                {t('registerFree')}
                            </button>
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    <button 
                        className="md:hidden p-2 text-text-dark"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 shadow-lg absolute w-full left-0 top-full">
                    <nav className="flex flex-col gap-4 mb-6">
                        <Link href="/profiles" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('browseProfiles')}
                        </Link>
                        <Link href="/about" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('aboutUs')}
                        </Link>
                        <Link href="/success-stories" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('successStories')}
                        </Link>
                        <Link href="/contact" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('contactUs')}
                        </Link>
                    </nav>

                    <div className="flex gap-2 mb-6 border-t border-gray-100 pt-4">
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                language === 'en' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 text-text-dark'
                            }`}
                        >
                            English
                        </button>
                        <button 
                            onClick={() => setLanguage('si')}
                            className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                                language === 'si' 
                                    ? 'bg-primary text-white' 
                                    : 'bg-gray-100 text-text-dark'
                            }`}
                        >
                            සිංහල
                        </button>
                    </div>

                    {user ? (
                        <div className="border-t border-gray-100 pt-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
                                    {user.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user.firstName[0]}{user.lastName[0]}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Link href="/profile" className="text-text-dark hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                                    {t('myProfile')}
                                </Link>
                                <button 
                                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                                    className="text-left text-red-600 hover:text-red-700"
                                >
                                    {t('logout')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                            <button 
                                className="w-full py-2 border-2 border-primary text-primary rounded-full font-medium" 
                                onClick={() => { onOpenLogin(); setMobileMenuOpen(false); }}
                            >
                                {t('login')}
                            </button>
                            <button 
                                className="w-full py-2 bg-primary text-white rounded-full font-medium" 
                                onClick={() => { onOpenRegister(); setMobileMenuOpen(false); }}
                            >
                                {t('registerFree')}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </header>
        </>
    );
}
