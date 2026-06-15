'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChatUnread } from '@/context/ChatUnreadContext';
import { matrimonialService } from '@/services/matrimonialService';
import Header from '@/components/Header';
import * as signalR from '@microsoft/signalr';
import { connectMatrimonialHub } from '@/utils/signalrHub';
import { formatDeviceDate, formatDeviceTime, parseApiDateForDisplay } from '@/utils/deviceDateTime';
import {
    inboxThreadKey,
    messageMatchesManagedThread,
    parseManagedProfileFromContent,
    readManagedProfileUserId,
    stripManagedMessagePrefix,
} from '@/utils/managedMessageContent';
import {
    canManageSubAccounts,
    normalizeSubAccount,
    subAccountDisplayName,
    type ManagedSubAccount,
} from '@/utils/managedSubAccounts';
import ClientProfileBadge from '@/components/ClientProfileBadge';
import ManagedSubAccountActionPicker from '@/components/ManagedSubAccountActionPicker';
import {
    managedProfileUserIdForApi,
    useManagedSubAccountActionPicker,
} from '@/hooks/useManagedSubAccountActionPicker';
import HoroscopeLightbox from '@/components/HoroscopeLightbox';
import {
    horoscopePagesFromProfile,
    horoscopeSharePreviewText,
    parseHoroscopeShareFromContent,
} from '@/utils/horoscopeMessageContent';

const isNegotiationStoppedError = (error: unknown) =>
    error instanceof Error &&
    error.message.toLowerCase().includes('stopped during negotiation');

function normalizeInboxContact(row: Record<string, unknown>) {
    const contactId = Number((row as any).contactId ?? (row as any).ContactId ?? 0);
    const managedProfileUserId = readManagedProfileUserId(
        (row as any).managedProfileUserId ?? (row as any).ManagedProfileUserId
    );
    const firstName = String((row as any).firstName ?? (row as any).FirstName ?? '');
    const lastName = String((row as any).lastName ?? (row as any).LastName ?? '');
    const profilePhoto = (row as any).profilePhoto ?? (row as any).ProfilePhoto ?? null;
    const peerFirstName = String(
        (row as any).peerFirstName ?? (row as any).PeerFirstName ?? firstName
    );
    const peerLastName = String(
        (row as any).peerLastName ?? (row as any).PeerLastName ?? lastName
    );
    const peerProfilePhoto =
        (row as any).peerProfilePhoto ?? (row as any).PeerProfilePhoto ?? profilePhoto ?? null;
    return {
        contactId,
        managedProfileUserId,
        managedProfileName: String(
            (row as any).managedProfileName ?? (row as any).ManagedProfileName ?? ''
        ).trim() || null,
        managedProfilePhoto:
            (row as any).managedProfilePhoto ?? (row as any).ManagedProfilePhoto ?? null,
        firstName,
        lastName,
        profilePhoto,
        peerFirstName,
        peerLastName,
        peerProfilePhoto,
        latestMessage: String((row as any).latestMessage ?? (row as any).LatestMessage ?? ''),
        sentAt: (row as any).sentAt ?? (row as any).SentAt,
        unreadCount: Number((row as any).unreadCount ?? (row as any).UnreadCount ?? 0),
        isMatrimonialChatEnabled: readMatrimonialChatEnabledFromRow(row),
    };
}

type InboxContact = ReturnType<typeof normalizeInboxContact>;

function peerNameFromContact(contact: {
    peerFirstName?: string;
    peerLastName?: string;
    firstName?: string;
    lastName?: string;
    managedProfileUserId?: number | null;
}): string {
    const preferPeer =
        contact.managedProfileUserId != null && contact.managedProfileUserId > 0;
    const a = String(
        (preferPeer ? contact.peerFirstName : contact.peerFirstName ?? contact.firstName) ?? ''
    ).trim();
    const b = String(
        (preferPeer ? contact.peerLastName : contact.peerLastName ?? contact.lastName) ?? ''
    ).trim();
    const name = [a, b].filter(Boolean).join(' ').trim();
    return name || 'This member';
}

/** Inbox row: show the other member's name/photo; subtitle indicates managed client when applicable. */
function resolveManagedInboxPresentation(
    contact: InboxContact,
    subAccounts: ManagedSubAccount[],
    isManagedParent: boolean
) {
    const peerName = peerNameFromContact(contact);
    const peerPhoto = contact.peerProfilePhoto ?? contact.profilePhoto;

    if (!isManagedParent || contact.managedProfileUserId == null) {
        return {
            listName: peerName,
            listPhoto: peerPhoto,
            listSubtitle: contact.managedProfileName ? `Re: ${contact.managedProfileName}` : null,
        };
    }

    const sub = subAccounts.find((s) => s.id === contact.managedProfileUserId);
    const subName =
        (sub ? subAccountDisplayName(sub) : null) ||
        contact.managedProfileName ||
        `${contact.firstName} ${contact.lastName}`.trim() ||
        'Profile';

    return {
        listName: peerName,
        listPhoto: peerPhoto,
        listSubtitle: subName ? `For ${subName}` : null,
    };
}

function contactsMatch(a: InboxContact | null | undefined, b: InboxContact | null | undefined) {
    if (!a || !b) return false;
    return (
        Number(a.contactId) === Number(b.contactId) &&
        readManagedProfileUserId(a.managedProfileUserId) === readManagedProfileUserId(b.managedProfileUserId)
    );
}

/** Hub / API payloads may use camelCase or PascalCase. */
function normalizeChatMessage(raw: Record<string, unknown> | undefined | null) {
    if (!raw || typeof raw !== 'object') return null;
    const id = Number((raw as any).id ?? (raw as any).Id ?? 0);
    const senderId = Number((raw as any).senderId ?? (raw as any).SenderId ?? 0);
    const receiverId = Number((raw as any).receiverId ?? (raw as any).ReceiverId ?? 0);
    const rawContent = String((raw as any).content ?? (raw as any).Content ?? '');
    const parsedManaged = parseManagedProfileFromContent(rawContent);
    const bodyAfterManaged = parsedManaged?.body ?? rawContent;
    const horoscopeShare = parseHoroscopeShareFromContent(bodyAfterManaged);
    const content = bodyAfterManaged;
    const sentAtRaw = (raw as any).sentAt ?? (raw as any).SentAt;
    const parsed = parseApiDateForDisplay(
        typeof sentAtRaw === 'string'
            ? sentAtRaw
            : sentAtRaw instanceof Date
              ? sentAtRaw
              : sentAtRaw
    );
    const sentAt = parsed ? parsed.toISOString() : new Date().toISOString();
    const isRead = !!((raw as any).isRead ?? (raw as any).IsRead);
    if (!Number.isFinite(senderId) || !Number.isFinite(receiverId)) return null;
    return {
        id,
        senderId,
        receiverId,
        content,
        sentAt,
        isRead,
        managedProfileUserId:
            parsedManaged?.managedProfileUserId ??
            readManagedProfileUserId((raw as any).managedProfileUserId ?? (raw as any).ManagedProfileUserId),
        horoscopeShare,
    };
}

function normalizeMessageContent(s: string) {
    return s.trim().replace(/\s+/g, ' ');
}

type PresenceInfo = { isOnline: boolean; lastSeen: string | null };

function toIsoLastSeen(raw: unknown): string | null {
    const d = parseApiDateForDisplay(raw);
    return d ? d.toISOString() : null;
}

/** Hub invoke + broadcast payloads (camelCase / PascalCase). */
function normalizeHubPresencePayload(p: Record<string, unknown> | null | undefined, fallbackUserId: string): PresenceInfo & { userId: string } {
    const userId = String((p as any)?.userId ?? (p as any)?.UserId ?? fallbackUserId);
    const isOnline = !!((p as any)?.isOnline ?? (p as any)?.IsOnline);
    const lastSeen = toIsoLastSeen((p as any)?.lastSeen ?? (p as any)?.LastSeen);
    return { userId, isOnline, lastSeen };
}

function getPresenceFor(map: Record<string, PresenceInfo>, contactId: number | undefined | null): PresenceInfo {
    if (contactId == null || !Number.isFinite(Number(contactId))) return { isOnline: false, lastSeen: null };
    return map[String(contactId)] ?? { isOnline: false, lastSeen: null };
}

/** Sidebar + header line (online vs relative last seen). Recomputed over time via presenceClockTick. */
function formatLastSeenLabel(lastSeen: string | null, isOnline: boolean, presenceClockTick: number): string {
    void presenceClockTick;
    if (isOnline) return 'Online';
    if (!lastSeen) return 'Offline';
    const d = parseApiDateForDisplay(lastSeen);
    if (!d) return 'Offline';
    const t = d.getTime();
    const diffMs = Date.now() - t;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Last seen just now';
    if (mins < 60) return `Last seen ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Last seen yesterday';
    if (days < 7) return `Last seen ${days}d ago`;
    return `Last seen ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** API may return camelCase or PascalCase; default true when unknown (e.g. legacy rows). */
function readMatrimonialChatEnabledFromRow(row: unknown): boolean {
    if (!row || typeof row !== 'object') return true;
    const o = row as Record<string, unknown>;
    const v = o.isMatrimonialChatEnabled ?? o.IsMatrimonialChatEnabled;
    if (v === false || v === 0) return false;
    if (typeof v === 'string' && v.toLowerCase() === 'false') return false;
    return true;
}

function peerDisplayName(contact: { firstName?: string; lastName?: string; peerFirstName?: string; peerLastName?: string } | null): string {
    if (!contact) return 'This member';
    return peerNameFromContact(contact);
}

function MessagesContent() {
    const { user } = useAuth();
    const { syncUnreadFromInbox } = useChatUnread();
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlUserId = searchParams.get('userId');
    const urlManagedProfileUserId = readManagedProfileUserId(searchParams.get('managedProfileUserId'));

    const [inbox, setInbox] = useState<InboxContact[]>([]);
    const [selectedContact, setSelectedContact] = useState<InboxContact | null>(null);
    const [subAccounts, setSubAccounts] = useState<ManagedSubAccount[]>([]);
    const [activeSubAccountId, setActiveSubAccountId] = useState<number | null>(null);
    const [subAccountsLoaded, setSubAccountsLoaded] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Typing indicator state
    const [isTyping, setIsTyping] = useState(false);
    const [remoteTyping, setRemoteTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const remoteTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // SignalR Connection
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
    const selectedContactRef = useRef<InboxContact | null>(null);

    // Delete message state
    const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
    const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [chatStatusToast, setChatStatusToast] = useState('');
    const [shareHoroscopePages, setShareHoroscopePages] = useState<string[]>([]);
    const [sharingHoroscope, setSharingHoroscope] = useState(false);
    const [horoscopeLightboxSrc, setHoroscopeLightboxSrc] = useState<string | null>(null);
    /** Per contact (App user id string) — from GetPresence batch + ReceivePresenceUpdate. */
    const [presenceMap, setPresenceMap] = useState<Record<string, PresenceInfo>>({});
    /** Bumps once per minute so "Last seen Xm ago" refreshes without leaving the page. */
    const [presenceClockTick, setPresenceClockTick] = useState(0);
    const urlContactPickerHandledRef = useRef(false);

    // Use Refs for callbacks
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    const managedActionPicker = useManagedSubAccountActionPicker(user?.accountType, subAccounts);
    const showSubAccountTabs = subAccounts.length >= 2;
    const activeSubAccount = useMemo(
        () => subAccounts.find((s) => s.id === activeSubAccountId) ?? null,
        [subAccounts, activeSubAccountId]
    );

    const isManagedParent = canManageSubAccounts(user?.accountType);

    const actingSubAccount = useMemo(() => {
        const managedId = readManagedProfileUserId(
            selectedContact?.managedProfileUserId ?? activeSubAccountId
        );
        if (managedId == null) return null;
        return subAccounts.find((s) => s.id === managedId) ?? null;
    }, [selectedContact?.managedProfileUserId, activeSubAccountId, subAccounts]);

    const horoscopeProfileUserId = useMemo(() => {
        if (!user?.id) return null;
        if (isManagedParent) {
            const fromContact = readManagedProfileUserId(selectedContact?.managedProfileUserId);
            if (fromContact != null) return fromContact;
            if (subAccounts.length === 1) return subAccounts[0]!.id;
            if (activeSubAccountId != null) return activeSubAccountId;
            return null;
        }
        return Number(user.id);
    }, [
        user?.id,
        isManagedParent,
        selectedContact?.managedProfileUserId,
        subAccounts,
        activeSubAccountId,
    ]);

    const managedProfileUserIdForShare = useMemo(() => {
        if (!isManagedParent) return null;
        return readManagedProfileUserId(
            selectedContact?.managedProfileUserId ??
                activeSubAccountId ??
                (subAccounts.length === 1 ? subAccounts[0]?.id : null)
        );
    }, [
        isManagedParent,
        selectedContact?.managedProfileUserId,
        activeSubAccountId,
        subAccounts,
    ]);

    useEffect(() => {
        if (!user?.id || horoscopeProfileUserId == null) {
            setShareHoroscopePages([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                if (!isManagedParent && horoscopeProfileUserId === Number(user.id)) {
                    const fromUser = horoscopePagesFromProfile(user);
                    if (fromUser.length > 0) {
                        if (!cancelled) setShareHoroscopePages(fromUser);
                        return;
                    }
                }
                const res = await matrimonialService.getProfile(
                    horoscopeProfileUserId,
                    Number(user.id)
                );
                if (cancelled) return;
                if (res.statusCode === 200 || res.statusCode === 1) {
                    setShareHoroscopePages(horoscopePagesFromProfile(res.result));
                } else {
                    setShareHoroscopePages([]);
                }
            } catch {
                if (!cancelled) setShareHoroscopePages([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user, horoscopeProfileUserId, isManagedParent]);

    const filteredInbox = useMemo(() => {
        if (!showSubAccountTabs || activeSubAccountId == null) return inbox;
        return inbox.filter(
            (c) => readManagedProfileUserId(c.managedProfileUserId) === activeSubAccountId
        );
    }, [inbox, showSubAccountTabs, activeSubAccountId]);

    const subAccountUnreadMap = useMemo(() => {
        const map: Record<number, number> = {};
        for (const contact of inbox) {
            const subId = readManagedProfileUserId(contact.managedProfileUserId);
            if (subId == null) continue;
            map[subId] = (map[subId] ?? 0) + (contact.unreadCount ?? 0);
        }
        return map;
    }, [inbox]);

    useEffect(() => {
        if (!user?.id || !canManageSubAccounts(user.accountType)) {
            setSubAccounts([]);
            setSubAccountsLoaded(true);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.getSubAccounts(Number(user.id));
                if (cancelled) return;
                if (res.statusCode === 200 || res.statusCode === 1) {
                    const rows = (Array.isArray(res.result) ? res.result : [])
                        .map((row: Record<string, unknown>) => normalizeSubAccount(row))
                        .filter(Boolean) as ManagedSubAccount[];
                    setSubAccounts(rows);
                } else {
                    setSubAccounts([]);
                }
            } catch {
                if (!cancelled) setSubAccounts([]);
            } finally {
                if (!cancelled) setSubAccountsLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.accountType]);

    useEffect(() => {
        if (!showSubAccountTabs || subAccounts.length === 0) return;
        if (urlManagedProfileUserId != null && subAccounts.some((s) => s.id === urlManagedProfileUserId)) {
            setActiveSubAccountId(urlManagedProfileUserId);
            return;
        }
        setActiveSubAccountId((prev) => {
            if (prev != null && subAccounts.some((s) => s.id === prev)) return prev;
            return subAccounts[0]?.id ?? null;
        });
    }, [showSubAccountTabs, subAccounts, urlManagedProfileUserId]);

    useEffect(() => {
        if (!showSubAccountTabs || !selectedContact) return;
        const contactSubId = readManagedProfileUserId(selectedContact.managedProfileUserId);
        if (contactSubId != null && contactSubId !== activeSubAccountId) {
            setSelectedContact(null);
            setMessages([]);
        }
    }, [showSubAccountTabs, activeSubAccountId, selectedContact?.contactId, selectedContact?.managedProfileUserId]);

    const handleSelectSubAccount = (subId: number) => {
        if (activeSubAccountId === subId) return;
        setActiveSubAccountId(subId);
        setSelectedContact(null);
        setMessages([]);
    };

    const openContactFromUrl = (rows: InboxContact[]) => {
        if (!urlUserId || selectedContactRef.current) return;
        const contactId = Number(urlUserId);
        if (!Number.isFinite(contactId) || contactId <= 0) return;

        const targetManagedId =
            urlManagedProfileUserId ??
            (showSubAccountTabs ? activeSubAccountId : null);

        const scopedRows =
            showSubAccountTabs && targetManagedId != null
                ? rows.filter(
                      (c) => readManagedProfileUserId(c.managedProfileUserId) === targetManagedId
                  )
                : rows;

        const exactMatch = scopedRows.find(
            (c) =>
                Number(c.contactId) === contactId &&
                readManagedProfileUserId(c.managedProfileUserId) === targetManagedId
        );
        if (exactMatch) {
            void handleSelectContact(exactMatch);
            return;
        }

        const sameContactRows = scopedRows.filter((c) => Number(c.contactId) === contactId);
        if (targetManagedId == null && sameContactRows.length === 1) {
            void handleSelectContact(sameContactRows[0]);
            return;
        }

        void handleSelectContact(contactId, targetManagedId);
    };

    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.getProfile(Number(user.id), Number(user.id));
                if (cancelled) return;
                if (res.statusCode === 200 || res.statusCode === 1) {
                    const r = res.result;
                    if (r) setChatEnabled(readMatrimonialChatEnabledFromRow(r));
                }
            } catch {
                if (!cancelled) setChatEnabled(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        const id = window.setInterval(() => setPresenceClockTick((x) => x + 1), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const handleToggleChatEnabled = async () => {
        if (!user?.id) return;
        const prev = chatEnabled;
        const next = !prev;
        setChatEnabled(next);
        try {
            const res = await matrimonialService.setMatrimonialChatEnabled(Number(user.id), next);
            const ok = res.statusCode === 200 || res.statusCode === 1;
            if (!ok) {
                setChatEnabled(prev);
                setChatStatusToast(String(res.message || res.Message || 'Could not update chat setting'));
                setTimeout(() => setChatStatusToast(''), 2200);
                return;
            }
            setChatStatusToast(next ? 'Chat is on' : 'Chat is off - others cannot message you');
            setTimeout(() => setChatStatusToast(''), 1800);
        } catch (err) {
            setChatEnabled(prev);
            const msg = err instanceof Error ? err.message : 'Could not update chat setting';
            setChatStatusToast(msg);
            setTimeout(() => setChatStatusToast(''), 2200);
        }
    };

    const peerChatOff =
        !!selectedContact &&
        Number(selectedContact.contactId) !== Number(user?.id) &&
        !readMatrimonialChatEnabledFromRow(selectedContact);
    const canSendInThread = chatEnabled && !peerChatOff;

    useEffect(() => {
        if (!selectedContact?.contactId) return;
        const row = filteredInbox.find((c) => contactsMatch(c, selectedContact));
        if (row) setSelectedContact(row);
    }, [filteredInbox, selectedContact?.contactId, selectedContact?.managedProfileUserId]);

    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
        if (user.isVerified === false) {
            router.push('/');
            return;
        }

        refreshInbox();

        let disposed = false;
        let retryTimeout: ReturnType<typeof setTimeout>;
        let activeConnection: signalR.HubConnection | null = null;

        const connectSignalR = async (attempt = 0) => {
            const API_BASE_URL =
                process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

            let connAttempt: signalR.HubConnection | null = null;
            try {
                connAttempt = await connectMatrimonialHub(API_BASE_URL);
                if (disposed) {
                    await connAttempt.stop();
                    return;
                }
                console.log("SignalR Connected!");

                // Join personal matching group
                await connAttempt.invoke("JoinUserGroup", String(user.id));
                activeConnection = connAttempt;
                setConnection(connAttempt);
            } catch (e) {
                await connAttempt?.stop().catch(() => {});
                if (disposed) return;
                if (!isNegotiationStoppedError(e)) {
                    console.error("SignalR Connection Failed: ", e);
                }
                const delay = Math.min(5000 * 2 ** attempt, 30000);
                retryTimeout = setTimeout(() => connectSignalR(attempt + 1), delay);
            }
        };

        connectSignalR();

        return () => {
            disposed = true;
            clearTimeout(retryTimeout);
            if (activeConnection) {
                activeConnection.stop();
            }
        };
    }, [user?.id, router]); // Run once per user

    // 2. Register SignalR Events once connection is ready
    useEffect(() => {
        if (!connection) return;

        // New Message Received
        connection.on("ReceiveNewMessage", (payload) => {
            const message = normalizeChatMessage(payload as Record<string, unknown>);
            const activeContactId = selectedContactRef.current?.contactId;
            const activeManagedProfileUserId = selectedContactRef.current?.managedProfileUserId ?? null;
            const myId = Number(user?.id);

            if (!message || !myId || !activeContactId) {
                refreshInbox();
                return;
            }

            const inActiveThread =
                ((message.senderId === activeContactId && message.receiverId === myId) ||
                    (message.receiverId === activeContactId && message.senderId === myId)) &&
                (message.managedProfileUserId != null
                    ? readManagedProfileUserId(message.managedProfileUserId) ===
                      readManagedProfileUserId(activeManagedProfileUserId)
                    : messageMatchesManagedThread(
                          String((payload as any)?.content ?? (payload as any)?.Content ?? message.content),
                          activeManagedProfileUserId
                      ));

            if (!inActiveThread) {
                refreshInbox();
                return;
            }

            setMessages((prev) => {
                if (prev.some((m) => Number(m.id) === message.id)) return prev;

                let next = prev;
                if (message.senderId === myId) {
                    const body = normalizeMessageContent(message.content);
                    next = prev.filter((m) => {
                        if (!(m as { __localPending?: boolean }).__localPending) return true;
                        if (Number(m.senderId) !== myId || Number(m.receiverId) !== message.receiverId) return true;
                        const pendingManaged = readManagedProfileUserId(
                            (m as { managedProfileUserId?: number | null }).managedProfileUserId
                        );
                        const incomingManaged = readManagedProfileUserId(message.managedProfileUserId);
                        if (pendingManaged !== incomingManaged) return true;
                        return normalizeMessageContent(String(m.content ?? '')) !== body;
                    });
                }

                if (next.some((m) => Number(m.id) === message.id)) return next;
                return [...next, message];
            });
            scrollToBottom();
            refreshInbox();
        });

        // Message Deleted
        connection.on("MessageDeleted", (deletedMessageId) => {
            setMessages(prev => prev.filter(m => m.id !== deletedMessageId));
            refreshInbox();
        });

        // Typing Indicator
        connection.on("ReceiveTypingIndicator", (senderIdStr) => {
            const activeContactId = selectedContactRef.current?.contactId;
            if (String(activeContactId) === senderIdStr) {
                setRemoteTyping(true);
                if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                remoteTypingTimeoutRef.current = setTimeout(() => {
                    setRemoteTyping(false);
                }, 3000);
            }
        });

        // Presence updates — keep a map for inbox + open chat (ChatHub broadcasts globally).
        connection.on('ReceivePresenceUpdate', (presence: unknown) => {
            if (!presence || typeof presence !== 'object') return;
            const n = normalizeHubPresencePayload(presence as Record<string, unknown>, '');
            if (!n.userId) return;
            setPresenceMap((prev) => ({
                ...prev,
                [n.userId]: { isOnline: n.isOnline, lastSeen: n.lastSeen },
            }));
        });

        // Unsubscribe all on cleanup to avoid duplicated events
        return () => {
            connection.off("ReceiveNewMessage");
            connection.off("MessageDeleted");
            connection.off("ReceiveTypingIndicator");
            connection.off("ReceivePresenceUpdate");
        };
    }, [connection, user]);

    const inboxPresenceKey = useMemo(() => {
        if (!inbox.length) return '';
        const ids = inbox
            .map((c: { contactId?: number }) => Number(c.contactId))
            .filter((id: number) => Number.isFinite(id) && id > 0);
        return [...new Set(ids)].sort((a, b) => a - b).join(',');
    }, [inbox]);

    // Batch presence for sidebar when hub + inbox are ready
    useEffect(() => {
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
        if (!inboxPresenceKey) return;

        let cancelled = false;
        const ids = inboxPresenceKey.split(',').map((s) => Number(s));

        (async () => {
            const updates: Record<string, PresenceInfo> = {};
            await Promise.all(
                ids.map(async (id) => {
                    if (!Number.isFinite(id) || id <= 0) return;
                    const sid = String(id);
                    try {
                        const raw = await connection.invoke('GetPresence', sid);
                        if (cancelled || raw == null || typeof raw !== 'object') return;
                        const n = normalizeHubPresencePayload(raw as Record<string, unknown>, sid);
                        updates[n.userId] = { isOnline: n.isOnline, lastSeen: n.lastSeen };
                    } catch {
                        /* ignore per-user failures */
                    }
                })
            );
            if (!cancelled && Object.keys(updates).length > 0) {
                setPresenceMap((prev) => ({ ...prev, ...updates }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [connection, inboxPresenceKey]);

    // Selected thread (e.g. deep link) may not be in inbox yet — refresh their row
    useEffect(() => {
        if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
        const cid = selectedContact?.contactId;
        if (cid == null || !Number.isFinite(Number(cid))) return;

        let cancelled = false;
        const sid = String(cid);

        (async () => {
            try {
                const raw = await connection.invoke('GetPresence', sid);
                if (cancelled || raw == null || typeof raw !== 'object') return;
                const n = normalizeHubPresencePayload(raw as Record<string, unknown>, sid);
                setPresenceMap((prev) => ({
                    ...prev,
                    [n.userId]: { isOnline: n.isOnline, lastSeen: n.lastSeen },
                }));
            } catch {
                /* ignore */
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [connection, selectedContact?.contactId]);

    const refreshInbox = async () => {
        if (!user) return;
        try {
            const res = await matrimonialService.getInbox(Number(user.id));
            if (res.statusCode === 200 || res.statusCode === 1) {
                const rows = (res.result || []).map((row: Record<string, unknown>) => normalizeInboxContact(row));
                setInbox(rows);
                syncUnreadFromInbox(rows);
            }
        } catch { } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!urlUserId || selectedContactRef.current) return;
        if (canManageSubAccounts(user?.accountType) && !subAccountsLoaded) return;

        if (
            isManagedParent &&
            subAccounts.length >= 1 &&
            urlManagedProfileUserId == null &&
            !urlContactPickerHandledRef.current
        ) {
            managedActionPicker.runWithManagedAccount('message', (managedProfileUserId) => {
                urlContactPickerHandledRef.current = true;
                const managedId = managedProfileUserIdForApi(managedProfileUserId);
                if (managedId != null) {
                    setActiveSubAccountId(managedId);
                }
                void handleSelectContact(Number(urlUserId), managedId ?? null);
                const managedQuery = managedId != null ? `&managedProfileUserId=${managedId}` : '';
                router.replace(`/messages?userId=${urlUserId}${managedQuery}`);
            });
            return;
        }

        if (showSubAccountTabs && activeSubAccountId == null) return;
        if (!subAccountsLoaded && canManageSubAccounts(user?.accountType)) return;
        openContactFromUrl(inbox);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when inbox + sub tab are ready
    }, [inbox, showSubAccountTabs, activeSubAccountId, subAccountsLoaded, urlUserId, urlManagedProfileUserId, isManagedParent, subAccounts.length, user?.accountType]);

    const handleSelectContact = async (
        contactOrId: InboxContact | number,
        managedProfileUserId?: number | null
    ) => {
        if (!user) return;

        let contact: InboxContact;
        if (typeof contactOrId === 'number') {
            const contactId = contactOrId;
            const managedId = readManagedProfileUserId(
                managedProfileUserId ?? (showSubAccountTabs ? activeSubAccountId : null)
            );
            const existingContact = inbox.find(
                (c) =>
                    Number(c.contactId) === contactId &&
                    readManagedProfileUserId(c.managedProfileUserId) === managedId
            );
            const activeSub = managedId != null ? subAccounts.find((s) => s.id === managedId) : null;
            if (existingContact) {
                contact = existingContact;
            } else {
                contact = {
                    contactId,
                    managedProfileUserId: managedId,
                    managedProfileName: activeSub ? subAccountDisplayName(activeSub) : null,
                    managedProfilePhoto: activeSub?.profilePhoto ?? null,
                    firstName: 'User',
                    lastName: '',
                    profilePhoto: null,
                    peerFirstName: 'User',
                    peerLastName: '',
                    peerProfilePhoto: null,
                    latestMessage: '',
                    sentAt: null,
                    unreadCount: 0,
                    isMatrimonialChatEnabled: true,
                };
                matrimonialService.getProfile(contactId, Number(user.id)).then((p) => {
                    if (p.statusCode === 200 && p.result) {
                        const r = p.result;
                        setSelectedContact((prev) => {
                            if (!prev || !contactsMatch(prev, contact)) return prev;
                            return {
                                ...prev,
                                firstName: r.firstName || 'User',
                                lastName: r.lastName || '',
                                profilePhoto: r.profilePhoto,
                                peerFirstName: r.firstName || 'User',
                                peerLastName: r.lastName || '',
                                peerProfilePhoto: r.profilePhoto,
                                isMatrimonialChatEnabled: readMatrimonialChatEnabledFromRow(r),
                            };
                        });
                    }
                }).catch(console.error);
            }
        } else {
            contact = contactOrId;
        }

        setSelectedContact(contact);

        try {
            const res = await matrimonialService.getConversation(
                Number(user.id),
                contact.contactId,
                contact.managedProfileUserId
            );
            if (res.statusCode === 200 || res.statusCode === 1) {
                const rawList = Array.isArray(res.result) ? res.result : [];
                const cleaned = rawList
                    .map((row: Record<string, unknown>) => normalizeChatMessage(row))
                    .filter(Boolean) as ReturnType<typeof normalizeChatMessage>[];
                setMessages(cleaned);
                scrollToBottom();
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    // 3. Fallback Typing System via LocalStorage (if SignalR disconnected)
    useEffect(() => {
        if (!selectedContact || !user) return;

        const checkRemoteTyping = setInterval(() => {
            // SignalR takes priority, only check localstorage fallback if not connected
            if (connection?.state === signalR.HubConnectionState.Connected) return;

            const typingTs = localStorage.getItem(`typing_${selectedContact.contactId}_to_${user.id}`);
            if (typingTs) {
                const diff = Date.now() - parseInt(typingTs);
                if (diff < 3000) {
                    setRemoteTyping(true);
                    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
                    remoteTypingTimeoutRef.current = setTimeout(() => setRemoteTyping(false), 3000);
                } else {
                    setRemoteTyping(false);
                }
            }
        }, 1000);

        return () => {
            clearInterval(checkRemoteTyping);
            setRemoteTyping(false);
        };
    }, [selectedContact, user, connection]);

    // 4. Fallback Polling (if SignalR disconnected)
    useEffect(() => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            if (!user || !selectedContactRef.current) return;
            // Only poll if SignalR is down/deploying
            if (connection && connection.state === signalR.HubConnectionState.Connected) return;

            try {
                const res = await matrimonialService.getConversation(
                    Number(user.id),
                    selectedContactRef.current.contactId,
                    selectedContactRef.current.managedProfileUserId
                );
                if (res.statusCode === 200 || res.statusCode === 1) {
                    const rawList = Array.isArray(res.result) ? res.result : [];
                    const cleaned = rawList
                        .map((row: Record<string, unknown>) => normalizeChatMessage(row))
                        .filter(Boolean) as ReturnType<typeof normalizeChatMessage>[];
                    setMessages(prev => {
                        if (cleaned.length !== prev.length || JSON.stringify(cleaned.map((m) => m?.id)) !== JSON.stringify(prev.map(m => m.id))) {
                            return cleaned;
                        }
                        return prev;
                    });
                }
            } catch { }
        }, 3000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [user, connection]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Typing Indicator Trigger
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canSendInThread) return;
        setNewMessage(e.target.value);

        if (!isTyping) {
            setIsTyping(true);

            // Primary: SignalR
            if (connection && connection.state === signalR.HubConnectionState.Connected && selectedContact && user) {
                connection.invoke("SendTypingIndicator", String(user.id), String(selectedContact.contactId))
                    .catch(console.error);
            }
            // Fallback: localStorage
            else if (selectedContact && user) {
                localStorage.setItem(`typing_${user.id}_to_${selectedContact.contactId}`, Date.now().toString());
            }
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            if (selectedContact && user) {
                localStorage.removeItem(`typing_${user.id}_to_${selectedContact.contactId}`);
            }
        }, 2000);
    };

    const handleShareHoroscope = async () => {
        if (!canSendInThread || !user || !selectedContact || shareHoroscopePages.length === 0) return;
        if (isManagedParent && managedProfileUserIdForShare == null) {
            setChatStatusToast('Select a profile before sharing horoscope.');
            setTimeout(() => setChatStatusToast(''), 2200);
            return;
        }

        setSharingHoroscope(true);
        try {
            const res = await matrimonialService.shareHoroscope(
                Number(user.id),
                selectedContact.contactId,
                managedProfileUserIdForShare
            );
            if (res.statusCode === 200 || res.statusCode === 1) {
                refreshInbox();
                const normalized = normalizeChatMessage(res.result as Record<string, unknown>);
                if (normalized) {
                    setMessages((prev) => [...prev, normalized]);
                    scrollToBottom();
                }
                setChatStatusToast('Horoscope shared');
                setTimeout(() => setChatStatusToast(''), 1800);
            } else {
                const msg = String(res.message || res.Message || 'Could not share horoscope');
                setChatStatusToast(msg);
                setTimeout(() => setChatStatusToast(''), 2200);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not share horoscope';
            setChatStatusToast(msg);
            setTimeout(() => setChatStatusToast(''), 2200);
        } finally {
            setSharingHoroscope(false);
        }
    };

    const sendMessageWithManagedProfile = async (content: string, managedProfileUserId: number | null | undefined) => {
        if (!user || !selectedContact) return;

        const tempId = Math.random();
        const managedId = readManagedProfileUserId(managedProfileUserId);

        try {
            const newMsgObj = {
                id: tempId,
                senderId: Number(user.id),
                receiverId: selectedContact.contactId,
                content: content,
                sentAt: new Date().toISOString(),
                isRead: false,
                managedProfileUserId: managedId,
                __localPending: true,
            };
            setMessages((prev) => [...prev, newMsgObj]);
            scrollToBottom();

            const res = await matrimonialService.sendMessage(
                Number(user.id),
                selectedContact.contactId,
                content,
                managedId
            );

            if (res.statusCode === 200 || res.statusCode === 1) {
                refreshInbox();
                const serverIdRaw = res.result?.id ?? res.result?.Id;
                if (serverIdRaw != null) {
                    const sid = Number(serverIdRaw);
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? { ...m, id: sid, __localPending: false } : m))
                    );
                }
            }
        } catch (err) {
            console.error('Failed to send message', err);
            setNewMessage(content);
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            if (err instanceof Error && err.message) {
                setChatStatusToast(err.message);
                setTimeout(() => setChatStatusToast(''), 2200);
            }
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSendInThread) return;
        if (!newMessage.trim() || !user || !selectedContact) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsTyping(false);

        const existingManagedId = readManagedProfileUserId(
            selectedContact.managedProfileUserId ?? activeSubAccountId
        );

        if (isManagedParent && subAccounts.length >= 1 && existingManagedId == null) {
            managedActionPicker.runWithManagedAccount('message', (managedProfileUserId) => {
                void sendMessageWithManagedProfile(content, managedProfileUserIdForApi(managedProfileUserId));
            });
            return;
        }

        void sendMessageWithManagedProfile(content, existingManagedId);
    };

    const handleDeleteMessage = async (msgId: number) => {
        if (!user) return;
        setDeletingMsgId(msgId);
        try {
            const res = await matrimonialService.deleteMessage(msgId, Number(user.id));
            if (res.statusCode === 200 || res.statusCode === 1) {
                // Optimistically remove from UI
                setMessages(prev => prev.filter(m => m.id !== msgId));
                refreshInbox();
            }
        } catch (err) {
            console.error("Failed to delete message", err);
        } finally {
            setDeletingMsgId(null);
            setContextMenu(null);
        }
    };

    const handleMessageRightClick = (e: React.MouseEvent, msg: any) => {
        if (Number(msg.senderId) !== Number(user?.id)) return;
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
    };

    if (!user) return null;

    const subAccountPanelLabel =
        user.accountType === 'Matchmaker' ? 'Clients' : 'Sub-accounts';
    const isMatchmakerAccount = user.accountType === 'Matchmaker';

    const renderSubAccountTab = (sub: ManagedSubAccount, compact = false) => {
        const isActive = activeSubAccountId === sub.id;
        const unread = subAccountUnreadMap[sub.id] ?? 0;
        const name = subAccountDisplayName(sub);
        return (
            <button
                key={sub.id}
                type="button"
                onClick={() => handleSelectSubAccount(sub.id)}
                title={name}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl transition-all duration-200 border ${
                    compact ? 'shrink-0 min-w-[76px] px-2 py-2' : 'w-full px-2 py-3'
                } ${
                    isActive
                        ? 'bg-gold/15 border-primary/40 shadow-sm ring-1 ring-primary/20'
                        : 'bg-transparent border-transparent hover:bg-gold/8 hover:border-gold/20'
                }`}
            >
                <div className="relative">
                    <div
                        className={`rounded-full overflow-hidden border-2 bg-cream ${
                            compact ? 'w-11 h-11' : 'w-12 h-12'
                        } ${isActive ? 'border-primary' : 'border-white shadow-sm ring-1 ring-black/5'}`}
                    >
                        <img
                            src={sub.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {unread > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[0.62rem] font-bold flex items-center justify-center shadow-sm">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                    {isMatchmakerAccount && unread <= 0 && (
                        <span
                            className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}
                            title="Client profile"
                            aria-hidden
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={9}
                                height={9}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#92400e"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
                            </svg>
                        </span>
                    )}
                </div>
                <span
                    className={`text-[0.68rem] leading-tight text-center line-clamp-2 max-w-full ${
                        isActive ? 'text-primary font-semibold' : 'text-text-light font-medium'
                    }`}
                >
                    {sub.firstName || name}
                </span>
            </button>
        );
    };

    return (
        <main className="min-h-screen bg-cream flex flex-col font-source-sans">
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} onOpenVerify={() => { }} />

            <section className="flex-1 min-h-0 pt-[100px] pb-12 px-4 md:px-8 max-w-[1400px] mx-auto w-full flex flex-col">
                <div className="flex-1 min-h-0 bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gold/10 overflow-hidden flex flex-col md:flex-row min-h-[min(600px,calc(100dvh-170px))] md:h-[calc(100vh-150px)] md:max-h-[calc(100vh-150px)]">

                    {/* Sub-account tabs — left rail when multiple managed profiles */}
                    {showSubAccountTabs && (
                        <div className="hidden md:flex w-[92px] shrink-0 flex-col min-h-0 border-r border-gold/10 bg-[#fffdfb]">
                            <div className="px-2 py-4 border-b border-gold/10 text-center">
                                <p className="text-[0.62rem] font-bold uppercase tracking-wide text-text-light m-0 leading-tight">
                                    {subAccountPanelLabel}
                                </p>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 py-3 flex flex-col gap-2">
                                {subAccounts.map((sub) => renderSubAccountTab(sub))}
                            </div>
                        </div>
                    )}

                    {/* Inbox Sidebar List */}
                    <div className={`w-full md:w-[380px] flex flex-col min-h-0 border-r border-gray-100 bg-[#fdfaf7] ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-6 border-b border-gold/10 bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="text-2xl font-playfair font-bold text-text-dark">Messages</h2>
                                    {showSubAccountTabs && activeSubAccount ? (
                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                            <p className="text-sm text-primary font-medium truncate">
                                                {subAccountDisplayName(activeSubAccount)}
                                            </p>
                                            {isMatchmakerAccount ? <ClientProfileBadge variant="compact" /> : null}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-light mt-1">Connect with your matches</p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleToggleChatEnabled}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${chatEnabled ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                                    title="Enable or disable chatting"
                                >
                                    Chat: {chatEnabled ? 'On' : 'Off'}
                                </button>
                            </div>
                        </div>

                        {showSubAccountTabs && (
                            <div className="md:hidden shrink-0 border-b border-gold/10 bg-white px-3 py-3">
                                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-text-light mb-2 px-1">
                                    {subAccountPanelLabel}
                                </p>
                                <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
                                    {subAccounts.map((sub) => renderSubAccountTab(sub, true))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                            {isLoading ? (
                                <div className="p-8 text-center text-text-light animate-pulse">Loading conversations...</div>
                            ) : filteredInbox.length === 0 ? (
                                <div className="p-8 text-center text-text-light">
                                    <div className="text-4xl mb-3 opacity-50">👥</div>
                                    {showSubAccountTabs && activeSubAccount
                                        ? `No messages for ${subAccountDisplayName(activeSubAccount)} yet.`
                                        : 'No conversations yet.'}
                                </div>
                            ) : (
                                filteredInbox.map(contact => {
                                    const presentation = resolveManagedInboxPresentation(
                                        contact,
                                        subAccounts,
                                        isManagedParent
                                    );
                                    return (
                                    <div
                                        key={inboxThreadKey(contact.contactId, contact.managedProfileUserId)}
                                        onClick={() => handleSelectContact(contact)}
                                        className={`flex p-4 cursor-pointer border-b border-gray-50 transition-all duration-300 hover:bg-gold/5 ${contactsMatch(selectedContact, contact) ? 'bg-gold/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="w-[50px] h-[50px] rounded-full bg-cream mr-4 overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-black/5">
                                            <img
                                                src={presentation.listPhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                                alt={presentation.listName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-1 gap-2">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-text-dark text-[1rem] truncate">
                                                        {presentation.listName}
                                                    </h4>
                                                    {presentation.listSubtitle && (
                                                        <p className="text-[0.72rem] text-primary font-medium truncate m-0 mt-0.5">
                                                            {presentation.listSubtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {!readMatrimonialChatEnabledFromRow(contact) && (
                                                        <span className="text-[0.65rem] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full">
                                                            Chat off
                                                        </span>
                                                    )}
                                                    <span className="text-[0.7rem] text-text-light whitespace-nowrap">
                                                        {formatDeviceDate(contact.sentAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            {(() => {
                                                const pr = getPresenceFor(presenceMap, contact.contactId);
                                                return (
                                                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                                                        <span
                                                            className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${pr.isOnline ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                                            title={pr.isOnline ? 'Online' : 'Offline'}
                                                            aria-hidden
                                                        />
                                                        <span
                                                            className={`text-[0.7rem] truncate ${pr.isOnline ? 'text-emerald-700 font-medium' : 'text-text-light'}`}
                                                        >
                                                            {formatLastSeenLabel(pr.lastSeen, pr.isOnline, presenceClockTick)}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex justify-between items-center">
                                                <p className={`text-[0.85rem] m-0 truncate ${contact.unreadCount > 0 ? 'text-text-dark font-semibold' : 'text-text-light'}`}>
                                                    {(() => {
                                                        const preview =
                                                            horoscopeSharePreviewText(
                                                                stripManagedMessagePrefix(contact.latestMessage)
                                                            ) ??
                                                            stripManagedMessagePrefix(contact.latestMessage);
                                                        return preview;
                                                    })()}
                                                </p>
                                                {contact.unreadCount > 0 && (
                                                    <div className="bg-primary text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-[0.7rem] font-bold px-1.5 ml-2 shrink-0 shadow-sm animate-pulse">
                                                        {contact.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className={`flex-1 min-h-0 flex flex-col bg-white relative overflow-hidden ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
                        {selectedContact ? (
                            <>
                                {/* Chat Header */}
                                <div className="shrink-0 p-4 md:p-6 border-b border-gray-100 bg-white flex items-center z-10 shadow-sm">
                                    <button
                                        className="md:hidden mr-4 w-8 h-8 rounded-full bg-cream flex items-center justify-center text-text-dark shadow-sm"
                                        onClick={() => setSelectedContact(null)}
                                        type="button"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                                        </svg>
                                    </button>
                                    <div className="w-[45px] h-[45px] rounded-full overflow-hidden mr-3 border-2 border-white shadow-sm ring-1 ring-black/5">
                                        <img
                                            src={selectedContact.peerProfilePhoto || selectedContact.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                            alt={peerNameFromContact(selectedContact)}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h3 className="font-playfair text-xl md:text-2xl font-semibold m-0 leading-tight">
                                            {peerNameFromContact(selectedContact)}
                                        </h3>
                                        {actingSubAccount && (
                                            <span className="text-xs text-primary font-medium mt-0.5 truncate flex items-center gap-1.5">
                                                <img
                                                    src={actingSubAccount.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                                    alt={subAccountDisplayName(actingSubAccount)}
                                                    className="w-4 h-4 rounded-full object-cover shrink-0 ring-1 ring-primary/20"
                                                />
                                                Replying as {subAccountDisplayName(actingSubAccount)}
                                            </span>
                                        )}
                                        {remoteTyping ? (
                                            <span className="text-xs text-primary font-medium animate-pulse mt-0.5">typing...</span>
                                        ) : (() => {
                                            const pr = getPresenceFor(presenceMap, selectedContact.contactId);
                                            return (
                                                <span className={`text-xs mt-0.5 ${pr.isOnline ? 'text-green-600 font-medium' : 'text-text-light'}`}>
                                                    {formatLastSeenLabel(pr.lastSeen, pr.isOnline, presenceClockTick)}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-6 flex flex-col gap-4 bg-[url('/pattern-bg.png')] bg-opacity-5">
                                    {messages.map((msg, index) => {
                                        const isMe = Number(msg.senderId) === Number(user.id);
                                        const rowKey =
                                            typeof msg.id === 'number' && Number.isInteger(msg.id) ? msg.id : `pending-${index}`;
                                        const horoscopeShare = msg.horoscopeShare ?? parseHoroscopeShareFromContent(
                                            stripManagedMessagePrefix(msg.content)
                                        );
                                        return (
                                            <div
                                                key={`msg-${rowKey}-${index}`}
                                                className={`flex flex-col max-w-[85%] md:max-w-[70%] group ${isMe ? 'self-end' : 'self-start'}`}
                                                onContextMenu={(e) => handleMessageRightClick(e, msg)}
                                            >
                                                {isMe && actingSubAccount && (
                                                    <div className="flex items-center gap-1.5 self-end mb-1 pr-1">
                                                        <img
                                                            src={actingSubAccount.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                                            alt={subAccountDisplayName(actingSubAccount)}
                                                            className="w-5 h-5 rounded-full object-cover ring-1 ring-primary/25"
                                                        />
                                                        <span className="text-[0.65rem] text-text-light font-medium">
                                                            {subAccountDisplayName(actingSubAccount)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="relative">
                                                    <div className={`px-4 py-3 shadow-sm transition-all ${deletingMsgId === msg.id ? 'opacity-50 scale-95' : ''} ${isMe
                                                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-white text-text-dark rounded-2xl rounded-tl-sm border border-gold/10'
                                                        }`}>
                                                        {horoscopeShare ? (
                                                            <div className="flex flex-col gap-2">
                                                                <p className="m-0 text-[0.95rem] font-semibold leading-relaxed">
                                                                    Horoscope shared
                                                                </p>
                                                                <p className={`m-0 text-[0.82rem] leading-relaxed ${isMe ? 'text-white/85' : 'text-text-light'}`}>
                                                                    {horoscopeShare.pages.length} page{horoscopeShare.pages.length === 1 ? '' : 's'} attached
                                                                </p>
                                                                <div className="flex flex-wrap gap-2 pt-1">
                                                                    {horoscopeShare.pages.map((pageSrc: string, pageIdx: number) => (
                                                                        <button
                                                                            key={`${rowKey}-h-${pageIdx}`}
                                                                            type="button"
                                                                            onClick={() => setHoroscopeLightboxSrc(pageSrc)}
                                                                            className={`text-[0.8rem] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                                                                                isMe
                                                                                    ? 'border-white/40 bg-white/15 hover:bg-white/25 text-white'
                                                                                    : 'border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary'
                                                                            }`}
                                                                        >
                                                                            View page {pageIdx + 1}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="m-0 text-[0.95rem] leading-relaxed">{stripManagedMessagePrefix(msg.content)}</p>
                                                        )}
                                                    </div>

                                                    {/* Delete button (own messages only) */}
                                                    {isMe && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteMessage(msg.id);
                                                            }}
                                                            className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm border border-red-100"
                                                            title="Delete message"
                                                            disabled={deletingMsgId === msg.id}
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'self-end' : 'self-start'}`}>
                                                    <span className="text-[0.65rem] text-text-light/70 font-medium">
                                                        {formatDeviceTime(msg.sentAt)}
                                                    </span>
                                                    {isMe && (
                                                        <span className="text-[0.6rem] text-text-light/50">
                                                            {msg.isRead ? '✓✓' : '✓'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Remote typing indicator */}
                                    {remoteTyping && (
                                        <div className="self-start flex items-center gap-2 max-w-[85%] md:max-w-[70%]">
                                            <div className="bg-white text-text-dark rounded-2xl rounded-tl-sm border border-gold/10 px-4 py-3 shadow-sm">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="flex gap-1">
                                                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <div className="shrink-0 p-4 md:p-6 bg-white border-t border-gray-100">
                                    {!chatEnabled && (
                                        <div className="mb-3 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                                            Chat is currently disabled. Turn it on to send messages.
                                        </div>
                                    )}
                                    {chatEnabled && peerChatOff && selectedContact && (
                                        <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 text-amber-950 text-sm border border-amber-100 leading-relaxed">
                                            <strong className="font-semibold">{peerDisplayName(selectedContact)}</strong> has turned off chat.
                                            You {"can't"} send messages until they turn chat back on.
                                        </div>
                                    )}
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void handleShareHoroscope()}
                                            disabled={
                                                !canSendInThread ||
                                                sharingHoroscope ||
                                                shareHoroscopePages.length === 0 ||
                                                (isManagedParent && managedProfileUserIdForShare == null)
                                            }
                                            title={
                                                shareHoroscopePages.length === 0
                                                    ? 'Upload a horoscope on your profile first'
                                                    : 'Share horoscope with this conversation'
                                            }
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <span aria-hidden>☸</span>
                                            {sharingHoroscope ? 'Sharing…' : 'Share horoscope'}
                                        </button>
                                        {shareHoroscopePages.length === 0 ? (
                                            <span className="text-xs text-text-light">
                                                Upload horoscope on your profile to enable sharing.
                                            </span>
                                        ) : null}
                                    </div>
                                    <form onSubmit={handleSendMessage} className="flex gap-3 bg-[#fdfaf7] border border-gold/20 p-2 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            placeholder="Write your message..."
                                            className="flex-1 bg-transparent px-4 outline-none text-text-dark placeholder:text-text-light/50"
                                            autoComplete="off"
                                            disabled={!canSendInThread}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || !canSendInThread}
                                            className="bg-primary hover:bg-gold text-white border-none rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 ml-1">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                            </svg>
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-text-light bg-[url('/pattern-bg.png')] bg-opacity-5">
                                <div className="text-center p-8 bg-white/60 backdrop-blur-md rounded-3xl border border-white shadow-xl max-w-sm">
                                    <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">💬</span>
                                    </div>
                                    <h3 className="font-playfair text-2xl font-bold text-text-dark mb-2">Your Messages</h3>
                                    <p className="text-sm">Select a conversation from the sidebar to view your messages and start chatting.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Right-click context menu for delete */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 min-w-[160px] animate-in fade-in zoom-in-95"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => handleDeleteMessage(contextMenu.msgId)}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                        disabled={deletingMsgId === contextMenu.msgId}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                        {deletingMsgId === contextMenu.msgId ? 'Deleting...' : 'Delete Message'}
                    </button>
                </div>
            )}

            {chatStatusToast && (
                <div style={{ position: 'fixed', top: 'calc(72px + env(safe-area-inset-top, 0px))', right: 'max(16px, env(safe-area-inset-right, 0px))', bottom: 'auto', zIndex: 2200, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {chatStatusToast}
                </div>
            )}

            <HoroscopeLightbox
                open={!!horoscopeLightboxSrc}
                src={horoscopeLightboxSrc || ''}
                alt="Shared horoscope"
                onClose={() => setHoroscopeLightboxSrc(null)}
            />

            <ManagedSubAccountActionPicker
                open={managedActionPicker.open}
                subAccounts={subAccounts}
                accountType={user?.accountType}
                action={managedActionPicker.action}
                selectedId={managedActionPicker.selectedId}
                onSelect={managedActionPicker.setSelectedId}
                onConfirm={() => void managedActionPicker.confirmPicker()}
                onCancel={() => {
                    urlContactPickerHandledRef.current = true;
                    managedActionPicker.cancelPicker();
                }}
            />
        </main>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div>Loading messages...</div>}>
            <MessagesContent />
        </Suspense>
    );
}
