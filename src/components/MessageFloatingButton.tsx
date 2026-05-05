'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useChatUnread } from '../context/ChatUnreadContext';

export default function MessageFloatingButton() {
    const { user, loading } = useAuth();
    const { unreadChatCount } = useChatUnread();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || loading || !user) {
        return null;
    }

    const badgeLabel = unreadChatCount > 99 ? '99+' : String(unreadChatCount);

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            <Link
                href="/messages"
                className="flex items-center justify-center w-14 h-14 bg-primary text-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:bg-gold hover:text-white transition-all duration-300 relative group transform hover:scale-110"
                aria-label={
                    unreadChatCount > 0
                        ? `Messages, ${unreadChatCount} unread`
                        : 'Messages'
                }
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="w-7 h-7"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>

                {unreadChatCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[1.35rem] h-[1.35rem] px-1 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold leading-none text-white shadow-sm">
                        {badgeLabel}
                    </span>
                )}

                {/* Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-text-dark text-sm font-medium py-1.5 px-3 rounded shadow-lg whitespace-nowrap transition-opacity duration-300 pointer-events-none after:content-[''] after:absolute after:top-1/2 after:-translate-y-1/2 after:-right-1 border border-gray-100">
                    Messages
                </div>
            </Link>
        </div>
    );
}
