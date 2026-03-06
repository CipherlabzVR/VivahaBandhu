'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { matrimonialService } from '@/services/matrimonialService';
import Header from '@/components/Header';
import * as signalR from '@microsoft/signalr';

function MessagesContent() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlUserId = searchParams.get('userId');

    const [inbox, setInbox] = useState<any[]>([]);
    const [selectedContact, setSelectedContact] = useState<any | null>(null);
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
    const selectedContactRef = useRef<any | null>(null);

    // Delete message state
    const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
    const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);
    const [chatEnabled, setChatEnabled] = useState(true);
    const [chatStatusToast, setChatStatusToast] = useState('');
    const [contactPresence, setContactPresence] = useState<{ isOnline: boolean; lastSeen: string | null }>({ isOnline: false, lastSeen: null });

    // Use Refs for callbacks
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    useEffect(() => {
        if (!user?.id || typeof window === 'undefined') return;
        const stored = localStorage.getItem(`chat_enabled_${user.id}`);
        if (stored !== null) {
            setChatEnabled(stored === 'true');
        }
    }, [user?.id]);

    const handleToggleChatEnabled = () => {
        if (!user?.id || typeof window === 'undefined') return;
        const next = !chatEnabled;
        setChatEnabled(next);
        localStorage.setItem(`chat_enabled_${user.id}`, String(next));
        setChatStatusToast(next ? 'Chat enabled successfully' : 'Chat disabled successfully');
        setTimeout(() => setChatStatusToast(''), 1800);
    };

    // 1. Initial Load & Setup SignalR connection
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

        const connectSignalR = async () => {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
            // The hub mapped to /chathub inside API folder path or root (e.g. https://.../chathub)
            const HUB_URL = API_BASE_URL.replace('/api', '') + '/chathub';

            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(HUB_URL)
                .withAutomaticReconnect()
                .build();

            try {
                await newConnection.start();
                console.log("SignalR Connected!");

                // Join personal matching group
                await newConnection.invoke("JoinUserGroup", String(user.id));
                setConnection(newConnection);
            } catch (e) {
                console.error("SignalR Connection Failed: ", e);
            }
        };

        connectSignalR();

        return () => {
            if (connection) {
                connection.stop();
            }
        };
    }, [user, router]); // Run once

    // 2. Register SignalR Events once connection is ready
    useEffect(() => {
        if (!connection) return;

        // New Message Received
        connection.on("ReceiveNewMessage", (message) => {
            const activeContactId = selectedContactRef.current?.contactId;
            // If message belongs to active chat, append it 
            if (message.senderId === activeContactId || message.receiverId === activeContactId || message.senderId === Number(user?.id)) {
                setMessages(prev => {
                    if (!prev.find(m => m.id === message.id)) {
                        return [...prev, message];
                    }
                    return prev;
                });
                scrollToBottom();
            }
            // Regardless of active chat, update inbox
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

        // Presence updates
        connection.on("ReceivePresenceUpdate", (presence) => {
            const activeContactId = selectedContactRef.current?.contactId;
            if (String(activeContactId) === String(presence?.userId)) {
                setContactPresence({
                    isOnline: !!presence?.isOnline,
                    lastSeen: presence?.lastSeen || null
                });
            }
        });

        // Unsubscribe all on cleanup to avoid duplicated events
        return () => {
            connection.off("ReceiveNewMessage");
            connection.off("MessageDeleted");
            connection.off("ReceiveTypingIndicator");
            connection.off("ReceivePresenceUpdate");
        };
    }, [connection, user]);

    useEffect(() => {
        const fetchPresence = async () => {
            if (!connection || !selectedContact) {
                setContactPresence({ isOnline: false, lastSeen: null });
                return;
            }
            try {
                const presence = await connection.invoke("GetPresence", String(selectedContact.contactId));
                setContactPresence({
                    isOnline: !!presence?.isOnline,
                    lastSeen: presence?.lastSeen || null
                });
            } catch {
                setContactPresence({ isOnline: false, lastSeen: null });
            }
        };

        fetchPresence();
    }, [connection, selectedContact?.contactId]);

    const formatLastSeen = (lastSeen: string | null) => {
        if (!lastSeen) return 'Offline';
        const d = new Date(lastSeen);
        if (isNaN(d.getTime())) return 'Offline';
        return `Last seen ${d.toLocaleString()}`;
    };

    const refreshInbox = async () => {
        if (!user) return;
        try {
            const res = await matrimonialService.getInbox(Number(user.id));
            if (res.statusCode === 200 || res.statusCode === 1) {
                setInbox(res.result || []);
                if (urlUserId && !selectedContactRef.current) {
                    handleSelectContact(Number(urlUserId));
                }
            }
        } catch { } finally {
            setIsLoading(false);
        }
    };

    const handleSelectContact = async (contactId: number) => {
        if (!user) return;

        const existingContact = inbox.find(c => c.contactId === contactId);
        if (existingContact) {
            setSelectedContact(existingContact);
        } else {
            setSelectedContact({
                contactId: contactId,
                firstName: "User",
                lastName: "",
                profilePhoto: null
            });
            matrimonialService.getProfile(contactId).then(p => {
                if (p.statusCode === 200 && p.result) {
                    setSelectedContact({
                        contactId: contactId,
                        firstName: p.result.firstName || "User",
                        lastName: p.result.lastName || "",
                        profilePhoto: p.result.profilePhoto
                    });
                }
            }).catch(console.error);
        }

        try {
            const res = await matrimonialService.getConversation(Number(user.id), contactId);
            if (res.statusCode === 200 || res.statusCode === 1) {
                setMessages(res.result || []);
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
                const res = await matrimonialService.getConversation(Number(user.id), selectedContactRef.current.contactId);
                if (res.statusCode === 200 || res.statusCode === 1) {
                    setMessages(prev => {
                        const newMsgs = res.result || [];
                        if (newMsgs.length !== prev.length || JSON.stringify(newMsgs.map((m: any) => m.id)) !== JSON.stringify(prev.map(m => m.id))) {
                            return newMsgs;
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
        if (!chatEnabled) return;
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

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatEnabled) return;
        if (!newMessage.trim() || !user || !selectedContact) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsTyping(false);

        try {
            // Optimistically update UI so it feels instant
            const tempId = Math.random();
            const newMsgObj = {
                id: tempId,
                senderId: Number(user.id),
                receiverId: selectedContact.contactId,
                content: content,
                sentAt: new Date().toISOString(),
                isRead: false
            };
            setMessages(prev => [...prev, newMsgObj]);
            scrollToBottom();

            const res = await matrimonialService.sendMessage(Number(user.id), selectedContact.contactId, content);

            // Replace temporary ID if needed or let SignalR handle the sync
            if (res.statusCode === 200 || res.statusCode === 1) {
                refreshInbox();
                if (res.result?.id) {
                    setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: res.result.id } : m));
                }
            }
        } catch (err) {
            console.error("Failed to send message", err);
            setNewMessage(content);
        }
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

    return (
        <main className="min-h-screen bg-cream flex flex-col font-source-sans">
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} onOpenVerify={() => { }} />

            <section className="flex-1 pt-[100px] pb-12 px-4 md:px-8 max-w-[1400px] mx-auto w-full flex flex-col">
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gold/10 overflow-hidden flex flex-col md:flex-row min-h-[600px] md:h-[calc(100vh-150px)]">

                    {/* Inbox Sidebar List */}
                    <div className={`w-full md:w-[380px] flex-col border-r border-gray-100 bg-[#fdfaf7] ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-6 border-b border-gold/10 bg-white">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-2xl font-playfair font-bold text-text-dark">Messages</h2>
                                    <p className="text-sm text-text-light mt-1">Connect with your matches</p>
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

                        <div className="flex-1 overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-text-light animate-pulse">Loading conversations...</div>
                            ) : inbox.length === 0 ? (
                                <div className="p-8 text-center text-text-light">
                                    <div className="text-4xl mb-3 opacity-50">👥</div>
                                    No conversations yet.
                                </div>
                            ) : (
                                inbox.map(contact => (
                                    <div
                                        key={contact.contactId}
                                        onClick={() => handleSelectContact(contact.contactId)}
                                        className={`flex p-4 cursor-pointer border-b border-gray-50 transition-all duration-300 hover:bg-gold/5 ${selectedContact?.contactId === contact.contactId ? 'bg-gold/10 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                                    >
                                        <div className="w-[50px] h-[50px] rounded-full bg-cream mr-4 overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-black/5">
                                            <img
                                                src={contact.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                                alt={contact.firstName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <h4 className="font-semibold text-text-dark text-[1rem] truncate">
                                                    {contact.firstName} {contact.lastName}
                                                </h4>
                                                <span className="text-[0.7rem] text-text-light whitespace-nowrap ml-2">
                                                    {new Date(contact.sentAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-[0.85rem] m-0 truncate ${contact.unreadCount > 0 ? 'text-text-dark font-semibold' : 'text-text-light'}`}>
                                                    {contact.latestMessage}
                                                </p>
                                                {contact.unreadCount > 0 && (
                                                    <div className="bg-primary text-white rounded-full min-w-[20px] h-[20px] flex items-center justify-center text-[0.7rem] font-bold px-1.5 ml-2 shrink-0 shadow-sm animate-pulse">
                                                        {contact.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Window */}
                    <div className={`flex-1 flex-col bg-white relative ${!selectedContact ? 'hidden md:flex' : 'flex'}`}>
                        {selectedContact ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 md:p-6 border-b border-gray-100 bg-white flex items-center sticky top-0 z-10 shadow-sm">
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
                                            src={selectedContact.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                            alt={selectedContact.firstName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="font-playfair text-xl md:text-2xl font-semibold m-0 leading-tight">{selectedContact.firstName} {selectedContact.lastName}</h3>
                                        {remoteTyping ? (
                                            <span className="text-xs text-primary font-medium animate-pulse mt-0.5">typing...</span>
                                        ) : (
                                            <span className={`text-xs mt-0.5 ${contactPresence.isOnline ? 'text-green-600 font-medium' : 'text-text-light'}`}>
                                                {contactPresence.isOnline ? 'Online' : formatLastSeen(contactPresence.lastSeen)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 bg-[url('/pattern-bg.png')] bg-opacity-5">
                                    {messages.map((msg, index) => {
                                        const isMe = Number(msg.senderId) === Number(user.id);
                                        return (
                                            <div
                                                key={`msg-${msg.id}-${index}`}
                                                className={`flex flex-col max-w-[85%] md:max-w-[70%] group ${isMe ? 'self-end' : 'self-start'}`}
                                                onContextMenu={(e) => handleMessageRightClick(e, msg)}
                                            >
                                                <div className="relative">
                                                    <div className={`px-4 py-3 shadow-sm transition-all ${deletingMsgId === msg.id ? 'opacity-50 scale-95' : ''} ${isMe
                                                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-white text-text-dark rounded-2xl rounded-tl-sm border border-gold/10'
                                                        }`}>
                                                        <p className="m-0 text-[0.95rem] leading-relaxed">{msg.content}</p>
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
                                                        {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                                    {!chatEnabled && (
                                        <div className="mb-3 px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm border border-red-100">
                                            Chat is currently disabled. Turn it on to send messages.
                                        </div>
                                    )}
                                    <form onSubmit={handleSendMessage} className="flex gap-3 bg-[#fdfaf7] border border-gold/20 p-2 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            placeholder="Write your message..."
                                            className="flex-1 bg-transparent px-4 outline-none text-text-dark placeholder:text-text-light/50"
                                            autoComplete="off"
                                            disabled={!chatEnabled}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim() || !chatEnabled}
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
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2200, background: '#1f7a3f', color: '#fff', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', fontSize: '0.9rem', fontWeight: 600 }}>
                    {chatStatusToast}
                </div>
            )}
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
