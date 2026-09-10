'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import { isManagedSubAccount } from '../utils/managedSubAccount';

function IconHome({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20z" />
            <path d="M9 21.5V14h6v7.5" fill={active ? 'var(--white)' : 'none'} />
        </svg>
    );
}

function IconBrowse({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
        </svg>
    );
}

function IconMessages({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a8.4 8.4 0 0 1-1.2 4.3A8.5 8.5 0 0 1 4.6 18L3 21l3.2-1.1A8.5 8.5 0 1 1 21 12z" />
        </svg>
    );
}

function IconAccount({ active }: { active: boolean }) {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5 19.2c.8-3.1 3.5-5.2 7-5.2s6.2 2.1 7 5.2" />
        </svg>
    );
}

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    const { unreadChatCount } = useChatUnread();

    const hideBrowse = Boolean(user && isManagedSubAccount(user));
    const badgeLabel = unreadChatCount > 99 ? '99+' : String(unreadChatCount);

    const openLogin = () => {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
    };

    const tabs = [
        {
            key: 'home',
            href: '/',
            label: t('home'),
            active: pathname === '/',
            icon: IconHome,
            onClick: undefined as (() => void) | undefined,
        },
        ...(!hideBrowse
            ? [{
                key: 'browse',
                href: '/profiles',
                label: t('browse'),
                active: pathname.startsWith('/profiles') || pathname.startsWith('/search'),
                icon: IconBrowse,
                onClick: undefined,
            }]
            : []),
        {
            key: 'messages',
            href: user ? '/messages' : '/messages',
            label: t('messages'),
            active: pathname.startsWith('/messages'),
            icon: IconMessages,
            onClick: !user && !loading ? openLogin : undefined,
        },
        {
            key: 'account',
            href: user ? '/profile' : '/profile',
            label: user ? t('accountTab') : t('login'),
            active: pathname.startsWith('/profile') || pathname.startsWith('/dashboard') || pathname.startsWith('/subscription'),
            icon: IconAccount,
            onClick: !user && !loading ? openLogin : undefined,
        },
    ];

    return (
        <nav className="mobile-bottom-nav" aria-label="Primary">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const className = `mobile-bottom-nav__item${tab.active ? ' is-active' : ''}`;

                if (tab.onClick) {
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            className={className}
                            onClick={tab.onClick}
                        >
                            <span className="mobile-bottom-nav__icon">
                                <Icon active={tab.active} />
                            </span>
                            <span className="mobile-bottom-nav__label">{tab.label}</span>
                        </button>
                    );
                }

                return (
                    <Link key={tab.key} href={tab.href} className={className}>
                        <span className="mobile-bottom-nav__icon">
                            <Icon active={tab.active} />
                            {tab.key === 'messages' && unreadChatCount > 0 ? (
                                <span className="mobile-bottom-nav__badge">{badgeLabel}</span>
                            ) : null}
                        </span>
                        <span className="mobile-bottom-nav__label">{tab.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
