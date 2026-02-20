import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState } from 'react';

interface HeaderProps {
    onOpenLogin: () => void;
    onOpenRegister: () => void;
}

export default function Header({ onOpenLogin, onOpenRegister }: HeaderProps) {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 w-full bg-white shadow-gold z-[1000]">
            <div className="max-w-[1400px] mx-auto px-8 py-3 flex justify-between items-center">
                <Link href="/" className="flex items-center h-[50px]">
                    <Image 
                        src="/logo2.png" 
                        alt="VivahaBandhu Logo" 
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
                    <Link href="#about-us" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('aboutUs')}
                    </Link>
                    <Link href="#success-stories" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('successStories')}
                    </Link>
                    <Link href="#contact-us" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('contactUs')}
                    </Link>
                </nav>
                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
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
                        <div className="relative">
                            <div
                                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                    {user.firstName[0]}{user.lastName[0]}
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
                        <>
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
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
