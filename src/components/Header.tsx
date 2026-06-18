import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useMatrimonialNotifications } from '../context/MatrimonialNotificationsContext';
import { useState, useEffect, useRef, useMemo } from 'react';
import { matrimonialService } from '../services/matrimonialService';
import { getStoredToken } from '../utils/authStorage';
import { isManagedSubAccount } from '../utils/managedSubAccount';
import {
    canManageSubAccounts,
    notificationMatchesManagedProfile,
    parseSubAccountsApiResult,
    shouldShowManagedProfileTabs,
    subAccountDisplayName,
    subAccountNotificationUnreadMap,
    type ManagedSubAccount,
} from '../utils/managedSubAccounts';
import ClientProfileBadge from './ClientProfileBadge';
import {
    isInterestBackNotification,
    managedProfileUserIdFromNotification,
    notificationDescriptionFallback,
    notificationTitleFallback,
    referenceIdFromNotification,
} from '../utils/matrimonialInterestNotifications';

interface HeaderProps {
    onOpenLogin: () => void;
    onOpenRegister: () => void;
    onOpenVerify?: () => void;
}

function senderLabelFromDescription(description: string | undefined): string {
    if (!description?.trim()) return 'Someone';
    const trimmed = description.trim();

    const interested = trimmed.match(/^(.+?)\s+is\s+interested\b/i);
    if (interested?.[1]) return interested[1].trim();

    const ibEm = trimmed.match(/^Interest back —\s*(.+?)\s+reciprocated\b/i);
    if (ibEm?.[1]) {
        const inner = ibEm[1].replace(/\s*\([^)]*\)\s*$/, '').trim();
        return inner || 'Someone';
    }

    const sentBack = trimmed.match(/^(.+?)\s+sent interest back\b/i);
    if (sentBack?.[1]) return sentBack[1].trim();

    return trimmed;
}

function initialsFromName(label: string): string {
    const parts = label.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const a = parts[0]?.[0];
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';
    return `${a || ''}${b || ''}`.toUpperCase() || '?';
}

export default function Header({ onOpenLogin, onOpenRegister, onOpenVerify }: HeaderProps) {
    const router = useRouter();
    const { user, logout, updateUser } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const {
        interestNotifications,
        unreadNotificationCount,
        loadingNotifications,
        refreshInterestNotifications,
        markInterestNotificationRead,
    } = useMatrimonialNotifications();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [interestBackLoadingKey, setInterestBackLoadingKey] = useState<string | null>(null);
    const [actionToast, setActionToast] = useState('');
    const [subAccounts, setSubAccounts] = useState<ManagedSubAccount[]>([]);
    const [activeNotificationSubAccountId, setActiveNotificationSubAccountId] = useState<number | null>(null);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const notificationMenuRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

    useEffect(() => {
        if (!notificationOpen && !profileMenuOpen) return;

        const closeOnOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (notificationMenuRef.current?.contains(target)) return;
            if (profileMenuRef.current?.contains(target)) return;
            setNotificationOpen(false);
            setProfileMenuOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutside);
        document.addEventListener('touchstart', closeOnOutside, { passive: true });
        return () => {
            document.removeEventListener('mousedown', closeOnOutside);
            document.removeEventListener('touchstart', closeOnOutside);
        };
    }, [notificationOpen, profileMenuOpen]);

    const showNotificationProfileTabs = useMemo(
        () => canManageSubAccounts(user?.accountType) && shouldShowManagedProfileTabs(subAccounts),
        [user?.accountType, subAccounts]
    );

    const notificationUnreadBySubAccount = useMemo(
        () => subAccountNotificationUnreadMap(interestNotifications as Record<string, unknown>[]),
        [interestNotifications]
    );

    const filteredInterestNotifications = useMemo(() => {
        if (!showNotificationProfileTabs || activeNotificationSubAccountId == null) {
            return interestNotifications;
        }
        return interestNotifications.filter((n) =>
            notificationMatchesManagedProfile(n as Record<string, unknown>, activeNotificationSubAccountId)
        );
    }, [interestNotifications, showNotificationProfileTabs, activeNotificationSubAccountId]);

    const activeNotificationSubAccount = useMemo(
        () => subAccounts.find((s) => s.id === activeNotificationSubAccountId) ?? null,
        [subAccounts, activeNotificationSubAccountId]
    );

    useEffect(() => {
        if (!user?.id || !canManageSubAccounts(user.accountType)) {
            setSubAccounts([]);
            setActiveNotificationSubAccountId(null);
            return;
        }

        let cancelled = false;
        const loadSubAccounts = async () => {
            try {
                const res = await matrimonialService.getSubAccounts(Number(user.id));
                if (cancelled) return;
                setSubAccounts(parseSubAccountsApiResult(res));
            } catch {
                if (!cancelled) setSubAccounts([]);
            }
        };

        void loadSubAccounts();

        const onSubAccountsChanged = () => {
            void loadSubAccounts();
        };
        window.addEventListener('sub-accounts-changed', onSubAccountsChanged);

        return () => {
            cancelled = true;
            window.removeEventListener('sub-accounts-changed', onSubAccountsChanged);
        };
    }, [user?.id, user?.accountType]);

    useEffect(() => {
        if (!showNotificationProfileTabs || subAccounts.length === 0) {
            setActiveNotificationSubAccountId(null);
            return;
        }
        setActiveNotificationSubAccountId((prev) => {
            if (prev != null && subAccounts.some((s) => s.id === prev)) return prev;
            return subAccounts[0]?.id ?? null;
        });
    }, [showNotificationProfileTabs, subAccounts]);

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

    const handleViewInterestProfile = async (notification: any) => {
        if (user?.isVerified === false) {
            if (onOpenVerify) onOpenVerify();
            else window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        const senderUserId = referenceIdFromNotification(notification);
        if (!senderUserId) return;
        await markInterestNotificationRead(notification);
        setNotificationOpen(false);
        router.push(`/profiles?viewUser=${senderUserId}`);
    };

    const handleMessageFromInterestNotification = async (notification: any) => {
        if (user?.isVerified === false) {
            if (onOpenVerify) onOpenVerify();
            else window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        const otherUserId = referenceIdFromNotification(notification);
        if (!otherUserId) return;
        await markInterestNotificationRead(notification);
        setNotificationOpen(false);
        const managedId = managedProfileUserIdFromNotification(notification);
        const managedQuery =
            managedId != null ? `&managedProfileUserId=${managedId}` : '';
        router.push(`/messages?userId=${otherUserId}${managedQuery}`);
    };

    const handleInterestBack = async (notification: any) => {
        if (user?.isVerified === false) {
            if (onOpenVerify) onOpenVerify();
            else window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }
        const senderUserId = referenceIdFromNotification(notification);
        if (!user?.id || !senderUserId) return;

        const key = String(notification?.id ?? '');
        setInterestBackLoadingKey(key);
        try {
            await markInterestNotificationRead(notification);
            const interactionsRes = await matrimonialService.getUserInteractions(Number(user.id));
            const favorites = interactionsRes?.result?.Favorites || interactionsRes?.result?.favorites || [];
            const favoriteIds = (Array.isArray(favorites) ? favorites : [])
                .map((x: any) =>
                    typeof x === 'number' ? x : x?.favoriteProfileId ?? x?.profileId ?? x?.id
                )
                .filter((x: any) => Number.isFinite(Number(x)))
                .map((x: any) => Number(x));

            const alreadyFavoursSender = favoriteIds.includes(senderUserId);

            if (alreadyFavoursSender) {
                const res = await matrimonialService.notifyInterestBack(Number(user.id), senderUserId);
                if (res?.statusCode === 200 || res?.StatusCode === 200) {
                    setActionToast('Interest back sent — they have been notified');
                } else {
                    const msg =
                        res?.message || res?.Message || 'Could not send interest back. Try again.';
                    setActionToast(msg);
                }
            } else {
                const res = await matrimonialService.toggleFavorite(Number(user.id), senderUserId);
                if (res?.statusCode === 200 || res?.StatusCode === 200) {
                    setActionToast('Interest sent back');
                } else {
                    const msg =
                        res?.message || res?.Message || 'Could not send interest back. Try again.';
                    setActionToast(msg);
                }
            }

            refreshInterestNotifications();
            setTimeout(() => setActionToast(''), 2500);
            setNotificationOpen(false);
        } catch {
            setActionToast('Could not send interest. Try again.');
            setTimeout(() => setActionToast(''), 2500);
        } finally {
            setInterestBackLoadingKey(null);
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
            <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-2 flex justify-between items-center">
                <Link href="/" className="flex items-center h-11 md:h-14">
                    <Image 
                        src="/logo4.png" 
                        alt="MyMatch.lk Logo" 
                        width={240} 
                        height={120}
                        className="h-full w-auto object-contain"
                        priority
                    />
                </Link>
                <nav className="hidden md:flex gap-8 items-center">
                    <Link href="/" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('home')}
                    </Link>
                    {(!user || !isManagedSubAccount(user)) && (
                    <Link href="/profiles" className="text-text-dark font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-gold hover:after:w-full after:transition-all">
                        {t('browseProfiles')}
                    </Link>
                    )}
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
                        <div ref={notificationMenuRef} className="relative hidden md:block">
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !notificationOpen;
                                    setNotificationOpen(next);
                                    if (next) {
                                        setProfileMenuOpen(false);
                                        refreshInterestNotifications();
                                    }
                                }}
                                className="w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center relative"
                                aria-label="Notifications"
                            >
                                <span style={{ fontSize: '1rem' }}>🔔</span>
                                {unreadNotificationCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                                    </span>
                                )}
                            </button>
                            {notificationOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-white p-3 rounded-xl shadow-xl z-[1000] w-[360px] max-h-[min(420px,70vh)] overflow-auto border border-gray-200 ring-1 ring-black/5">
                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                                        <span className="text-lg" aria-hidden>✨</span>
                                        <div className="font-semibold text-sm text-gray-900">
                                            Notifications
                                            {showNotificationProfileTabs && activeNotificationSubAccount ? (
                                                <span className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                    <span className="block text-[11px] font-medium text-primary truncate max-w-[220px]">
                                                        {subAccountDisplayName(activeNotificationSubAccount)}
                                                    </span>
                                                    {user?.accountType === 'Matchmaker' ? (
                                                        <ClientProfileBadge variant="compact" />
                                                    ) : null}
                                                </span>
                                            ) : null}
                                        </div>
                                        {filteredInterestNotifications.length > 0 && (
                                            <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-white bg-primary px-2 py-0.5 rounded-full">
                                                {filteredInterestNotifications.length} new
                                            </span>
                                        )}
                                    </div>
                                    {showNotificationProfileTabs && (
                                        <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-3 mb-1 -mx-0.5 px-0.5">
                                            {subAccounts.map((sub) => {
                                                const isActive = activeNotificationSubAccountId === sub.id;
                                                const unread = notificationUnreadBySubAccount[sub.id] ?? 0;
                                                const name = subAccountDisplayName(sub);
                                                return (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={() => setActiveNotificationSubAccountId(sub.id)}
                                                        title={name}
                                                        className={`relative shrink-0 flex flex-col items-center gap-1 rounded-xl border px-2 py-2 min-w-[72px] transition-all ${
                                                            isActive
                                                                ? 'bg-gold/15 border-primary/40 ring-1 ring-primary/20'
                                                                : 'bg-white border-gray-200 hover:border-gold/30'
                                                        }`}
                                                    >
                                                        <div className="relative">
                                                            <div
                                                                className={`w-10 h-10 rounded-full overflow-hidden border-2 bg-cream ${
                                                                    isActive ? 'border-primary' : 'border-white'
                                                                }`}
                                                            >
                                                                <img
                                                                    src={
                                                                        sub.profilePhoto ||
                                                                        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'
                                                                    }
                                                                    alt={name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            {unread > 0 && (
                                                                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                                                    {unread > 99 ? '99+' : unread}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span
                                                            className={`text-[0.62rem] leading-tight text-center line-clamp-2 max-w-[68px] ${
                                                                isActive ? 'text-primary font-semibold' : 'text-gray-600'
                                                            }`}
                                                        >
                                                            {sub.firstName || name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {loadingNotifications ? (
                                        <div className="text-xs text-gray-500 py-6 text-center">Loading...</div>
                                    ) : filteredInterestNotifications.length === 0 ? (
                                        <div className="text-xs text-gray-500 py-6 text-center">
                                            {showNotificationProfileTabs && activeNotificationSubAccount
                                                ? `No new notifications for ${subAccountDisplayName(activeNotificationSubAccount)}.`
                                                : 'No new notifications.'}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {filteredInterestNotifications.map((n) => {
                                                const senderName = senderLabelFromDescription(n.description);
                                                const initials = initialsFromName(senderName);
                                                const rowKey = String(n.id);
                                                const isSubscriptionNotification =
                                                    ((n as any)?.referenceType ?? (n as any)?.ReferenceType) ===
                                                    'MatrimonialSubscription';

                                                if (isSubscriptionNotification) {
                                                    const title = String(n.title || 'Subscription');
                                                    const titleLower = title.toLowerCase();
                                                    const isActivated =
                                                        titleLower.includes('activated') ||
                                                        titleLower.includes('purchased');
                                                    const isPendingBank = titleLower.includes('bank transfer received');
                                                    const isExpiryNotice =
                                                        titleLower.includes('ending soon') ||
                                                        titleLower.includes('has ended');

                                                    return (
                                                        <div
                                                            key={rowKey}
                                                            className="relative overflow-hidden rounded-xl border border-amber-300 bg-amber-50/60 shadow-[0_8px_30px_-12px_rgba(255,162,13,0.35)] ring-1 ring-amber-200 transition-shadow"
                                                        >
                                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-xl" aria-hidden />
                                                            <div className="flex gap-3 pl-4 pr-3 py-3">
                                                                <div
                                                                    className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-amber-200 via-amber-100 to-orange-50 flex items-center justify-center text-xl ring-2 ring-white shadow-sm"
                                                                    aria-hidden
                                                                >
                                                                    👑
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                                        {title}
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                                        {n.description}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2 mt-3">
                                                                        {isActivated ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    await markInterestNotificationRead(n);
                                                                                    setNotificationOpen(false);
                                                                                    router.push('/search');
                                                                                }}
                                                                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors"
                                                                            >
                                                                                Browse profiles
                                                                            </button>
                                                                        ) : isPendingBank ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    await markInterestNotificationRead(n);
                                                                                    setNotificationOpen(false);
                                                                                    router.push('/profile?settings=open');
                                                                                }}
                                                                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors"
                                                                            >
                                                                                View status
                                                                            </button>
                                                                        ) : isExpiryNotice ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={async () => {
                                                                                    await markInterestNotificationRead(n);
                                                                                    setNotificationOpen(false);
                                                                                    router.push('/profile?settings=open');
                                                                                }}
                                                                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors"
                                                                            >
                                                                                Manage subscription
                                                                            </button>
                                                                        ) : null}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => markInterestNotificationRead(n)}
                                                                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-amber-400 text-amber-900/90 bg-white hover:bg-amber-50/80 transition-colors"
                                                                        >
                                                                            Dismiss
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={rowKey}
                                                        className="relative overflow-hidden rounded-xl border border-primary/35 bg-white shadow-[0_8px_30px_-12px_rgba(255,162,13,0.35)] ring-1 ring-primary/15 transition-shadow"
                                                    >
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl"
                                                            aria-hidden
                                                        />
                                                        <div className="flex gap-3 pl-4 pr-3 py-3">
                                                            <div
                                                                className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-primary/25 via-amber-100/90 to-orange-50 flex items-center justify-center text-[13px] font-bold text-amber-900/90 ring-2 ring-white shadow-sm"
                                                                aria-hidden
                                                            >
                                                                {initials}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start gap-2">
                                                                    <span
                                                                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_rgba(255,162,13,0.25)]"
                                                                        title="New"
                                                                    />
                                                                    <div>
                                                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                                            {n.title || notificationTitleFallback(n)}
                                                                        </div>
                                                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                                            {n.description ||
                                                                                notificationDescriptionFallback(n)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-wrap gap-2 mt-3">
                                                                    {isInterestBackNotification(n) ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleMessageFromInterestNotification(n)}
                                                                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark shadow-sm transition-colors"
                                                                        >
                                                                            Message
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleInterestBack(n)}
                                                                            disabled={interestBackLoadingKey === rowKey}
                                                                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60 shadow-sm transition-colors"
                                                                        >
                                                                            {interestBackLoadingKey === rowKey
                                                                                ? 'Sending…'
                                                                                : 'Interest back'}
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleViewInterestProfile(n)}
                                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-primary text-amber-900/90 bg-white hover:bg-amber-50/80 transition-colors"
                                                                    >
                                                                        View profile
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : null}

                    {user ? (
                        <div ref={profileMenuRef} className="relative hidden md:block">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    setProfileMenuOpen((prev) => {
                                        const next = !prev;
                                        if (next) setNotificationOpen(false);
                                        return next;
                                    });
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setProfileMenuOpen((prev) => {
                                            const next = !prev;
                                            if (next) setNotificationOpen(false);
                                            return next;
                                        });
                                    }
                                }}
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
                        {(!user || !isManagedSubAccount(user)) && (
                        <Link href="/profiles" className="text-text-dark font-medium hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                            {t('browseProfiles')}
                        </Link>
                        )}
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

            {actionToast && (
                <div style={{ position: 'fixed', top: 'calc(72px + env(safe-area-inset-top, 0px))', right: 'max(16px, env(safe-area-inset-right, 0px))', bottom: 'auto', zIndex: 3000, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {actionToast}
                </div>
            )}
        </header>
        </>
    );
}
