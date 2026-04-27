import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useState, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';
import { matrimonialService } from '../services/matrimonialService';
import { getStoredToken } from '../utils/authStorage';
import { BookmarkIcon } from './icons/InteractionIcons';

const isNegotiationStoppedError = (error: unknown) =>
    error instanceof Error &&
    error.message.toLowerCase().includes('stopped during negotiation');

interface HeaderProps {
    onOpenLogin: () => void;
    onOpenRegister: () => void;
    onOpenVerify?: () => void;
}

export default function Header({ onOpenLogin, onOpenRegister, onOpenVerify }: HeaderProps) {
    const { user, logout, updateUser } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [interestNotifications, setInterestNotifications] = useState<any[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [selectedInterestProfile, setSelectedInterestProfile] = useState<any | null>(null);
    const [interestProfileOpen, setInterestProfileOpen] = useState(false);
    const [isSavingInterestProfile, setIsSavingInterestProfile] = useState(false);
    const [actionToast, setActionToast] = useState('');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thumali1.clovesis.com/api';

    const getUnreadCount = () => interestNotifications.filter(n => !n.isRead).length;

    const fetchInterestNotifications = async () => {
        if (!user?.id) return;

        setLoadingNotifications(true);
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetInterestNotifications?userId=${user.id}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) return;

            const data = await response.json();
            const all = data?.result || data?.Result || [];
            setInterestNotifications(Array.isArray(all) ? all : []);
        } catch {
            // Silent fail to keep header lightweight
        } finally {
            setLoadingNotifications(false);
        }
    };

    useEffect(() => {
        if (!user?.id || user.profilePhoto) return;
        const token = getStoredToken();
        if (!token) return;

        let cancelled = false;
        fetch(`${API_BASE_URL}/Matrimonial/GetProfile?userId=${user.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (cancelled) return;
                const updates: Record<string, any> = {};
                if (data?.result?.profilePhoto) {
                    updates.profilePhoto = data.result.profilePhoto;
                }
                if (data?.result?.status !== undefined) {
                    updates.isVerified = data.result.status === 1;
                }
                if (Object.keys(updates).length > 0) {
                    updateUser(updates);
                }
            })
            .catch(() => {});

        return () => { cancelled = true; };
    // updateUser is stable (useCallback) so it won't cause re-triggers
    }, [user?.id, user?.profilePhoto, updateUser]);

    useEffect(() => {
        if (!user?.id) {
            setInterestNotifications([]);
            return;
        }
        fetchInterestNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // Fallback refresh so notifications appear even if a live socket event is missed.
    useEffect(() => {
        if (!user?.id) return;
        const interval = setInterval(() => {
            fetchInterestNotifications();
        }, 8000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;
        let disposed = false;
        let retryTimeout: ReturnType<typeof setTimeout>;
        const HUB_URL = API_BASE_URL.replace('/api', '') + '/chathub';
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL)
            .configureLogging(signalR.LogLevel.None)
            .withAutomaticReconnect()
            .build();

        const startConnection = async (attempt = 0) => {
            if (disposed) return;
            try {
                await connection.start();
                if (disposed) {
                    await connection.stop();
                    return;
                }
                await connection.invoke('JoinUserGroup', String(user.id));
            } catch (error) {
                if (disposed) return;
                if (!isNegotiationStoppedError(error)) {
                    console.error('Header SignalR connection failed:', error);
                }
                const delay = Math.min(5000 * 2 ** attempt, 30_000);
                retryTimeout = setTimeout(() => startConnection(attempt + 1), delay);
                return;
            }

            connection.on('ReceiveInterestNotification', (payload) => {
                const now = new Date().toISOString();
                setInterestNotifications(prev => [
                    {
                        id: `live-${Date.now()}`,
                        title: payload?.title || 'New Interest',
                        description: payload?.description || 'Someone is interested in your profile.',
                        referenceId: payload?.referenceId || payload?.interestedUserId,
                        referenceType: 'MatrimonialInterest',
                        isRead: false,
                        createdOn: payload?.createdOn || now,
                    },
                    ...prev
                ]);
            });
        };

        startConnection();

        return () => {
            disposed = true;
            clearTimeout(retryTimeout);
            connection.off('ReceiveInterestNotification');
            connection.stop();
        };
    }, [user?.id, API_BASE_URL]);

    const openInterestProfile = async (notification: any) => {
        const notificationId = notification?.id;
        if (user?.id && notificationId && !String(notificationId).startsWith('live-')) {
            try {
                await fetch(`${API_BASE_URL}/Matrimonial/MarkInterestNotificationRead?notificationId=${notificationId}&userId=${user.id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch {
                // no-op
            }
        }

        setInterestNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));

        const senderUserId = Number(notification?.referenceId);
        if (!senderUserId) return;

        try {
            const profileRes = await matrimonialService.getProfile(senderUserId);
            if (profileRes?.statusCode === 200 && profileRes?.result) {
                const p = profileRes.result;
                setSelectedInterestProfile({
                    id: p.UserId || p.userId || senderUserId,
                    firstName: p.FirstName || p.firstName || 'User',
                    lastName: p.LastName || p.lastName || '',
                    age: p.Age || p.age || '-',
                    city: p.CityOfResidence || p.cityOfResidence || 'Unknown',
                    qualificationLevel: p.QualificationLevel || p.qualificationLevel || 'Not Specified',
                    occupation: p.Occupation || p.occupation || 'Not Specified',
                    religion: p.Religion || p.religion || 'Not Specified',
                    profilePhoto: p.ProfilePhoto || p.profilePhoto || p.ProfilePhotoFromProfile || p.profilePhotoFromProfile || '',
                });
                setInterestProfileOpen(true);
                setNotificationOpen(false);
            }
        } catch {
            // no-op
        }
    };

    const handleSaveInterestedProfile = async () => {
        if (!user?.id || !selectedInterestProfile?.id) return;
        setIsSavingInterestProfile(true);
        try {
            const interactionsRes = await matrimonialService.getUserInteractions(Number(user.id));
            const favorites = interactionsRes?.result?.Favorites || interactionsRes?.result?.favorites || [];
            const favoriteIds = (Array.isArray(favorites) ? favorites : [])
                .map((x: any) => (typeof x === 'number' ? x : x?.favoriteProfileId ?? x?.profileId ?? x?.id))
                .filter((x: any) => Number.isFinite(Number(x)))
                .map((x: any) => Number(x));

            if (!favoriteIds.includes(Number(selectedInterestProfile.id))) {
                await matrimonialService.toggleFavorite(Number(user.id), Number(selectedInterestProfile.id));
            }
            setActionToast('Saved profile successfully');
            setTimeout(() => setActionToast(''), 2000);
        } catch {
            // no-op
        } finally {
            setIsSavingInterestProfile(false);
            setInterestProfileOpen(false);
        }
    };

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
                    <Link href="/" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('home')}
                    </Link>
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
                            <button
                                onClick={() => {
                                    const next = !notificationOpen;
                                    setNotificationOpen(next);
                                    if (next) fetchInterestNotifications();
                                }}
                                className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center relative"
                                aria-label="Notifications"
                            >
                                <span style={{ fontSize: '1rem' }}>🔔</span>
                                {getUnreadCount() > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                                        {getUnreadCount() > 99 ? '99+' : getUnreadCount()}
                                    </span>
                                )}
                            </button>
                            {notificationOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white p-3 rounded-lg shadow-lg z-[1000] w-[320px] max-h-[420px] overflow-auto border border-gray-100">
                                    <div className="font-semibold text-sm mb-2">Notifications</div>
                                    {loadingNotifications ? (
                                        <div className="text-xs text-gray-500 py-3">Loading...</div>
                                    ) : interestNotifications.length === 0 ? (
                                        <div className="text-xs text-gray-500 py-3">No new interests yet.</div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {interestNotifications.map((n) => (
                                                <button
                                                    key={String(n.id)}
                                                    onClick={() => openInterestProfile(n)}
                                                    className={`text-left p-2 rounded-md border ${n.isRead ? 'bg-white border-gray-100' : 'bg-rose-50 border-rose-100'} hover:bg-gray-50 transition-colors`}
                                                >
                                                    <div className="text-sm font-medium text-gray-900">{n.title || 'New Interest'}</div>
                                                    <div className="text-xs text-gray-600 mt-0.5">{n.description || 'Someone is interested in your profile.'}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}

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
                                    <Link
                                        href="/profile"
                                        className="block py-2 text-text-dark no-underline hover:text-primary"
                                        onClick={() => setProfileMenuOpen(false)}
                                    >
                                        {t('myProfile')}
                                    </Link>
                                    <Link
                                        href="/profile?settings=open"
                                        className="block py-2 text-text-dark no-underline hover:text-primary"
                                        onClick={() => setProfileMenuOpen(false)}
                                    >
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
                        <Link href="/" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('home')}
                        </Link>
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
                                <Link href="/profile?settings=open" className="text-text-dark hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                                    {t('settings')}
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

            {interestProfileOpen && selectedInterestProfile && (
                <div
                    className="fixed inset-0 z-[1200] bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setInterestProfileOpen(false)}
                >
                    <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                                {selectedInterestProfile.profilePhoto ? (
                                    <img src={selectedInterestProfile.profilePhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-gray-600">
                                        {(selectedInterestProfile.firstName?.[0] || 'U')}{(selectedInterestProfile.lastName?.[0] || '')}
                                    </span>
                                )}
                            </div>
                            <div>
                                <div className="font-semibold text-text-dark">{selectedInterestProfile.firstName} {selectedInterestProfile.lastName}</div>
                                <div className="text-sm text-text-light">{selectedInterestProfile.age} years • {selectedInterestProfile.city}</div>
                            </div>
                        </div>

                        <div className="text-sm text-text-light space-y-1 mb-5">
                            <div>🎓 {selectedInterestProfile.qualificationLevel}</div>
                            <div>💼 {selectedInterestProfile.occupation}</div>
                            <div>🙏 {selectedInterestProfile.religion}</div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setInterestProfileOpen(false)}
                                className="flex-1 px-4 py-2 rounded-full border border-gray-300 text-text-dark hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleSaveInterestedProfile}
                                disabled={isSavingInterestProfile}
                                className="flex-1 px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-60 inline-flex items-center justify-center gap-2"
                            >
                                {isSavingInterestProfile ? 'Saving...' : (<><BookmarkIcon filled size={16} /> Save Profile</>)}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {actionToast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 3000, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {actionToast}
                </div>
            )}
        </header>
        </>
    );
}
