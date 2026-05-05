'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { matrimonialService } from '@/services/matrimonialService';

function unreadFromInboxRow(row: Record<string, unknown>): number {
    const raw = row.unreadCount ?? row.UnreadCount ?? 0;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(Math.floor(n), 1_000_000);
}

export function sumInboxUnread(rows: unknown[]): number {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce<number>((acc, row) => {
        if (!row || typeof row !== 'object') return acc;
        return acc + unreadFromInboxRow(row as Record<string, unknown>);
    }, 0);
}

type ChatUnreadContextValue = {
    unreadChatCount: number;
    refreshChatUnreadFromApi: () => Promise<void>;
    syncUnreadFromInbox: (rows: unknown[]) => void;
};

const ChatUnreadContext = createContext<ChatUnreadContextValue | null>(null);

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const syncUnreadFromInbox = useCallback((rows: unknown[]) => {
        setUnreadChatCount(sumInboxUnread(rows));
    }, []);

    const refreshChatUnreadFromApi = useCallback(async () => {
        if (!user?.id) return;
        if (user.isVerified === false) {
            setUnreadChatCount(0);
            return;
        }
        try {
            const res = await matrimonialService.getInbox(Number(user.id));
            if (res.statusCode === 200 || res.statusCode === 1) {
                syncUnreadFromInbox(res.result || []);
            }
        } catch {
            /* ignore */
        }
    }, [user?.id, user?.isVerified, syncUnreadFromInbox]);

    useEffect(() => {
        if (loading) return;
        if (!user?.id || user.isVerified === false) {
            setUnreadChatCount(0);
            return;
        }
        void refreshChatUnreadFromApi();
        const interval = window.setInterval(() => {
            void refreshChatUnreadFromApi();
        }, 45_000);
        const onFocus = () => {
            void refreshChatUnreadFromApi();
        };
        const onVis = () => {
            if (document.visibilityState === 'visible') void refreshChatUnreadFromApi();
        };
        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [loading, user?.id, user?.isVerified, refreshChatUnreadFromApi]);

    const value = useMemo(
        () => ({
            unreadChatCount,
            refreshChatUnreadFromApi,
            syncUnreadFromInbox,
        }),
        [unreadChatCount, refreshChatUnreadFromApi, syncUnreadFromInbox]
    );

    return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>;
}

export function useChatUnread(): ChatUnreadContextValue {
    const ctx = useContext(ChatUnreadContext);
    if (!ctx) {
        throw new Error('useChatUnread must be used within ChatUnreadProvider');
    }
    return ctx;
}
