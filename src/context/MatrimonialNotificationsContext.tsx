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
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { connectMatrimonialHub } from '../utils/signalrHub';
import {
    isInterestBackNotification,
    managedProfileUserIdFromNotification,
    notificationTitleFallback,
    referenceIdFromNotification,
} from '../utils/matrimonialInterestNotifications';

const isNegotiationStoppedError = (error: unknown) =>
    error instanceof Error && error.message.toLowerCase().includes('stopped during negotiation');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

export type MatrimonialInterestNotification = Record<string, unknown> & {
    id?: string | number;
    title?: string;
    description?: string;
    isRead?: boolean;
    referenceId?: number;
    referenceType?: string;
    managedProfileUserId?: number | null;
    createdOn?: string;
};

type MatrimonialNotificationsContextValue = {
    interestNotifications: MatrimonialInterestNotification[];
    loadingNotifications: boolean;
    refreshInterestNotifications: () => Promise<void>;
    /**
     * Incremented on each SignalR `ReceiveInterestNotification` / `InterestWithdrawn` so pages
     * (e.g. profile “Interested in you”) can resync from the API without opening the header menu.
     */
    liveInterestRevision: number;
    markInterestNotificationRead: (notification: MatrimonialInterestNotification) => Promise<void>;
};

const MatrimonialNotificationsContext = createContext<MatrimonialNotificationsContextValue | undefined>(
    undefined
);

function normalizeNotification(n: MatrimonialInterestNotification): MatrimonialInterestNotification {
    const asRecord = n as Record<string, unknown>;
    return {
        ...n,
        id: (n as any)?.id ?? (n as any)?.Id,
        title: (n as any)?.title ?? (n as any)?.Title ?? notificationTitleFallback(asRecord),
        description: (n as any)?.description ?? (n as any)?.Description ?? '',
        isRead: (n as any)?.isRead ?? (n as any)?.IsRead ?? false,
        referenceId: (n as any)?.referenceId ?? (n as any)?.ReferenceId,
        referenceType: (n as any)?.referenceType ?? (n as any)?.ReferenceType,
        managedProfileUserId: managedProfileUserIdFromNotification(asRecord),
        createdOn: (n as any)?.createdOn ?? (n as any)?.CreatedOn,
    };
}

export function MatrimonialNotificationsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [interestNotifications, setInterestNotifications] = useState<MatrimonialInterestNotification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [liveInterestRevision, setLiveInterestRevision] = useState(0);

    const bumpLiveRevision = useCallback(() => {
        setLiveInterestRevision((r) => r + 1);
    }, []);

    const refreshInterestNotifications = useCallback(async () => {
        if (!user?.id) return;

        setLoadingNotifications(true);
        try {
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/GetInterestNotifications?userId=${user.id}&unreadOnly=true`,
                { method: 'GET', headers: { 'Content-Type': 'application/json' } }
            );
            if (!response.ok) return;

            const data = await response.json();
            const all = data?.result || data?.Result || [];
            const list = Array.isArray(all) ? all : [];
            setInterestNotifications(list.map((n: MatrimonialInterestNotification) => normalizeNotification(n)));
        } catch {
            // keep header lightweight
        } finally {
            setLoadingNotifications(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) {
            setInterestNotifications([]);
            setLiveInterestRevision(0);
            return;
        }
        void refreshInterestNotifications();
    }, [user?.id, refreshInterestNotifications]);

    // Fallback polling if a live event is missed (mobile background, reconnect gap, etc.)
    useEffect(() => {
        if (!user?.id) return;
        const interval = setInterval(() => {
            void refreshInterestNotifications();
        }, 8000);
        return () => clearInterval(interval);
    }, [user?.id, refreshInterestNotifications]);

    useEffect(() => {
        if (!user?.id) return;

        let disposed = false;
        let retryTimeout: ReturnType<typeof setTimeout>;
        let connection: signalR.HubConnection | null = null;

        const startConnection = async (attempt = 0) => {
            if (disposed) return;
            try {
                connection = await connectMatrimonialHub(API_BASE_URL);
                if (disposed) {
                    await connection.stop();
                    return;
                }
                await connection.invoke('JoinUserGroup', String(user.id));
            } catch (error) {
                if (connection) {
                    connection.off('ReceiveInterestNotification');
                    connection.off('InterestWithdrawn');
                    await connection.stop().catch(() => {});
                    connection = null;
                }
                if (disposed) return;
                if (!isNegotiationStoppedError(error)) {
                    console.error('MatrimonialNotifications SignalR connection failed:', error);
                }
                const delay = Math.min(5000 * 2 ** attempt, 30_000);
                retryTimeout = setTimeout(() => startConnection(attempt + 1), delay);
                return;
            }

            if (!connection) return;

            connection.on('ReceiveInterestNotification', (payload: Record<string, unknown>) => {
                const now = new Date().toISOString();
                const liveTitle = payload?.title ?? payload?.Title;
                const liveDesc = payload?.description ?? payload?.Description;
                const inferred = { title: liveTitle, description: liveDesc } as Record<string, unknown>;
                setInterestNotifications((prev) => [
                    {
                        id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                        title: (liveTitle as string) || notificationTitleFallback(inferred),
                        description:
                            (liveDesc as string) ||
                            (isInterestBackNotification(inferred)
                                ? 'A member reciprocated — interest back.'
                                : 'Someone is interested in your profile.'),
                        referenceId:
                            (payload.referenceId ??
                                payload.ReferenceId ??
                                payload.interestedUserId ??
                                payload.InterestedUserId) as number | undefined,
                        managedProfileUserId: managedProfileUserIdFromNotification(payload),
                        referenceType: 'MatrimonialInterest',
                        isRead: false,
                        createdOn: (payload.createdOn as string) || now,
                    },
                    ...prev,
                ]);
                bumpLiveRevision();
            });

            connection.on('InterestWithdrawn', (payload: Record<string, unknown>) => {
                const refRaw =
                    payload?.referenceId ??
                    payload?.ReferenceId ??
                    payload?.interestedUserId ??
                    payload?.InterestedUserId;
                const refNum = Number(refRaw);
                if (!Number.isFinite(refNum) || refNum <= 0) return;
                setInterestNotifications((prev) =>
                    prev.filter((n) => referenceIdFromNotification(n as Record<string, unknown>) !== refNum)
                );
                bumpLiveRevision();
            });
        };

        void startConnection();

        return () => {
            disposed = true;
            clearTimeout(retryTimeout);
            if (connection) {
                connection.off('ReceiveInterestNotification');
                connection.off('InterestWithdrawn');
                void connection.stop();
            }
        };
    }, [user?.id, bumpLiveRevision]);

    const markInterestNotificationRead = useCallback(
        async (notification: MatrimonialInterestNotification) => {
            const notificationId = notification?.id;
            if (user?.id && notificationId != null && !String(notificationId).startsWith('live-')) {
                try {
                    await fetch(
                        `${API_BASE_URL}/Matrimonial/MarkInterestNotificationRead?notificationId=${notificationId}&userId=${user.id}`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' } }
                    );
                } catch {
                    // no-op
                }
            }
            setInterestNotifications((prev) => prev.filter((n) => n.id !== notificationId));
            bumpLiveRevision();
        },
        [user?.id, bumpLiveRevision]
    );

    const value = useMemo(
        () => ({
            interestNotifications,
            loadingNotifications,
            refreshInterestNotifications,
            liveInterestRevision,
            markInterestNotificationRead,
        }),
        [
            interestNotifications,
            loadingNotifications,
            refreshInterestNotifications,
            liveInterestRevision,
            markInterestNotificationRead,
        ]
    );

    return (
        <MatrimonialNotificationsContext.Provider value={value}>{children}</MatrimonialNotificationsContext.Provider>
    );
}

export function useMatrimonialNotifications(): MatrimonialNotificationsContextValue {
    const ctx = useContext(MatrimonialNotificationsContext);
    if (!ctx) {
        throw new Error('useMatrimonialNotifications must be used within MatrimonialNotificationsProvider');
    }
    return ctx;
}
