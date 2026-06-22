'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { connectMatrimonialHub } from '../utils/signalrHub';
import {
    interestNotificationDismissKey,
    interestNotificationId,
    interestNotificationsMatch,
    isInterestBackNotification,
    isMatrimonialSubscriptionNotification,
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
    unreadNotificationCount: number;
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
    const dismissedNotificationKeysRef = useRef<Set<string>>(new Set());

    const bumpLiveRevision = useCallback(() => {
        setLiveInterestRevision((r) => r + 1);
    }, []);

    const withoutDismissedNotifications = useCallback(
        (list: MatrimonialInterestNotification[]) => {
            const dismissed = dismissedNotificationKeysRef.current;
            if (dismissed.size === 0) return list;
            return list.filter(
                (n) => !dismissed.has(interestNotificationDismissKey(n as Record<string, unknown>))
            );
        },
        []
    );

    const removeNotificationFromList = useCallback(
        (notification: MatrimonialInterestNotification) => {
            const dismissKey = interestNotificationDismissKey(notification as Record<string, unknown>);
            dismissedNotificationKeysRef.current.add(dismissKey);
            setInterestNotifications((prev) =>
                prev.filter((n) => !interestNotificationsMatch(n as Record<string, unknown>, notification as Record<string, unknown>))
            );
            bumpLiveRevision();
        },
        [bumpLiveRevision]
    );

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
            setInterestNotifications(
                withoutDismissedNotifications(
                    list.map((n: MatrimonialInterestNotification) => normalizeNotification(n))
                )
            );
        } catch {
            // keep header lightweight
        } finally {
            setLoadingNotifications(false);
        }
    }, [user?.id, withoutDismissedNotifications]);

    useEffect(() => {
        if (!user?.id) {
            dismissedNotificationKeysRef.current.clear();
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
                    connection.off('ReceiveSubscriptionNotification');
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

            const appendSubscriptionNotification = (payload: Record<string, unknown>) => {
                const now = new Date().toISOString();
                const liveTitle = payload?.title ?? payload?.Title;
                const liveDesc = payload?.description ?? payload?.Description;
                const notificationId =
                    payload?.id ??
                    payload?.Id ??
                    `live-sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                setInterestNotifications((prev) =>
                    withoutDismissedNotifications([
                        {
                            id: notificationId,
                            title: (liveTitle as string) || 'Subscription update',
                            description:
                                (liveDesc as string) || 'Your subscription or payment status was updated.',
                            referenceType: 'MatrimonialSubscription',
                            isRead: false,
                            createdOn: (payload.createdOn as string) || (payload.CreatedOn as string) || now,
                        },
                        ...prev,
                    ])
                );
            };

            connection.on('ReceiveSubscriptionNotification', appendSubscriptionNotification);

            connection.on('ReceiveInterestNotification', (payload: Record<string, unknown>) => {
                if (isMatrimonialSubscriptionNotification(payload)) {
                    appendSubscriptionNotification(payload);
                    return;
                }
                const now = new Date().toISOString();
                const liveTitle = payload?.title ?? payload?.Title;
                const liveDesc = payload?.description ?? payload?.Description;
                const refTypeRaw = payload?.referenceType ?? payload?.ReferenceType;
                const refType = String(refTypeRaw ?? '').trim();
                const isSubscription =
                    isMatrimonialSubscriptionNotification(payload)
                    || refType === 'MatrimonialSubscription';
                const inferred = { title: liveTitle, description: liveDesc } as Record<string, unknown>;
                const notificationId =
                    payload?.id ??
                    payload?.Id ??
                    `live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                setInterestNotifications((prev) =>
                    withoutDismissedNotifications([
                        {
                            id: notificationId,
                            title:
                                (liveTitle as string) ||
                                (isSubscription ? 'Subscription update' : notificationTitleFallback(inferred)),
                            description:
                                (liveDesc as string) ||
                                (isSubscription
                                    ? 'Your subscription or payment status was updated.'
                                    : isInterestBackNotification(inferred)
                                      ? 'A member reciprocated — interest back.'
                                      : 'Someone is interested in your profile.'),
                            referenceId: isSubscription
                                ? undefined
                                : ((payload.referenceId ??
                                    payload.ReferenceId ??
                                    payload.interestedUserId ??
                                    payload.InterestedUserId) as number | undefined),
                            managedProfileUserId: isSubscription
                                ? null
                                : managedProfileUserIdFromNotification(payload),
                            referenceType: isSubscription ? 'MatrimonialSubscription' : (refType || 'MatrimonialInterest'),
                            isRead: false,
                            createdOn: (payload.createdOn as string) || (payload.CreatedOn as string) || now,
                        },
                        ...prev,
                    ])
                );
                if (!isSubscription) {
                    bumpLiveRevision();
                }
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
                connection.off('ReceiveSubscriptionNotification');
                connection.off('InterestWithdrawn');
                void connection.stop();
            }
        };
    }, [user?.id, bumpLiveRevision, withoutDismissedNotifications]);

    const markInterestNotificationRead = useCallback(
        async (notification: MatrimonialInterestNotification) => {
            removeNotificationFromList(notification);

            const notificationId = interestNotificationId(notification as Record<string, unknown>);
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
        },
        [user?.id, removeNotificationFromList]
    );

    const unreadNotificationCount = interestNotifications.length;

    const value = useMemo(
        () => ({
            interestNotifications,
            unreadNotificationCount,
            loadingNotifications,
            refreshInterestNotifications,
            liveInterestRevision,
            markInterestNotificationRead,
        }),
        [
            interestNotifications,
            unreadNotificationCount,
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
