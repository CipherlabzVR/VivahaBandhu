'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { matrimonialService } from '@/services/matrimonialService';
import Header from '@/components/Header';

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

    // Polling refs
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const inboxPollRef = useRef<NodeJS.Timeout | null>(null);
    const selectedContactRef = useRef<any | null>(null);

    // Delete message state
    const [contextMenu, setContextMenu] = useState<{ msgId: number; x: number; y: number } | null>(null);
    const [deletingMsgId, setDeletingMsgId] = useState<number | null>(null);

    // Keep selectedContactRef synced
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Close context menu on click anywhere
    useEffect(() => {
        const handler = () => setContextMenu(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, []);

    // Auth check + inbox fetch
    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        const fetchInbox = async () => {
            setIsLoading(true);
            try {
                const res = await matrimonialService.getInbox(Number(user.id));
                if (res.statusCode === 200 || res.statusCode === 1) {
                    setInbox(res.result || []);

                    if (urlUserId) {
                        const contactId = Number(urlUserId);
                        handleSelectContact(contactId);
                    }
                }
            } catch (err) {
                console.error("Failed to load inbox", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInbox();

        // Inbox polling every 8 sec
        inboxPollRef.current = setInterval(async () => {
            try {
                const res = await matrimonialService.getInbox(Number(user.id));
                if (res.statusCode === 200 || res.statusCode === 1) {
                    setInbox(res.result || []);
                }
            } catch { }
        }, 8000);

        return () => {
            if (inboxPollRef.current) clearInterval(inboxPollRef.current);
        };
    }, [user, router, urlUserId]);

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

        fetchMessages(contactId);
        startMessagePolling(contactId);
    };

    const fetchMessages = async (contactId: number) => {
        if (!user) return;
        try {
            const res = await matrimonialService.getConversation(Number(user.id), contactId);
            if (res.statusCode === 200 || res.statusCode === 1) {
                setMessages(res.result || []);
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    // Real-time message polling for the active chat
    const startMessagePolling = useCallback((contactId: number) => {
        // Clear existing poll
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            if (!user) return;
            try {
                const res = await matrimonialService.getConversation(Number(user.id), contactId);
                if (res.statusCode === 200 || res.statusCode === 1) {
                    setMessages(prev => {
                        const newMsgs = res.result || [];
                        // Only update if message count changed (avoid scroll jank)
                        if (newMsgs.length !== prev.length || JSON.stringify(newMsgs.map((m: any) => m.id)) !== JSON.stringify(prev.map(m => m.id))) {
                            return newMsgs;
                        }
                        return prev;
                    });
                }
            } catch { }
        }, 3000); // Poll every 3 seconds
    }, [user]);

    // Cleanup polling on unmount or contact change
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Typing indicator handler
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        // Set local typing state
        if (!isTyping) {
            setIsTyping(true);
            // Broadcast typing event via localStorage (cross-tab simulation)
            if (selectedContact && user) {
                localStorage.setItem(`typing_${user.id}_to_${selectedContact.contactId}`, Date.now().toString());
            }
        }

        // Reset typing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            if (selectedContact && user) {
                localStorage.removeItem(`typing_${user.id}_to_${selectedContact.contactId}`);
            }
        }, 2000);
    };

    // Check for remote typing indicator (poll localStorage)
    useEffect(() => {
        if (!selectedContact || !user) return;

        const checkRemoteTyping = setInterval(() => {
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
            } else {
                setRemoteTyping(false);
            }
        }, 1000);

        return () => {
            clearInterval(checkRemoteTyping);
            setRemoteTyping(false);
        };
    }, [selectedContact, user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !selectedContact) return;

        const content = newMessage.trim();
        setNewMessage('');
        setIsTyping(false);
        if (selectedContact && user) {
            localStorage.removeItem(`typing_${user.id}_to_${selectedContact.contactId}`);
        }

        try {
            const res = await matrimonialService.sendMessage(Number(user.id), selectedContact.contactId, content);
            if (res.statusCode === 200 || res.statusCode === 1) {
                // Optimistically add message
                setMessages(prev => [...prev, {
                    id: res.result?.id || Math.random(),
                    senderId: Number(user.id),
                    receiverId: selectedContact.contactId,
                    content: content,
                    sentAt: new Date().toISOString(),
                    isRead: false
                }]);

                // Refresh inbox
                matrimonialService.getInbox(Number(user.id)).then(inboxRes => {
                    if (inboxRes.statusCode === 200 || inboxRes.statusCode === 1) {
                        setInbox(inboxRes.result || []);
                    }
                }).catch(console.error);
            }
        } catch (err) {
            console.error("Failed to send message", err);
            setNewMessage(content);
        }
    };

    // Delete message handler
    const handleDeleteMessage = async (msgId: number) => {
        if (!user) return;
        setDeletingMsgId(msgId);
        try {
            const res = await matrimonialService.deleteMessage(msgId, Number(user.id));
            if (res.statusCode === 200 || res.statusCode === 1) {
                setMessages(prev => prev.filter(m => m.id !== msgId));
                // Refresh inbox to update latest message
                matrimonialService.getInbox(Number(user.id)).then(inboxRes => {
                    if (inboxRes.statusCode === 200 || inboxRes.statusCode === 1) {
                        setInbox(inboxRes.result || []);
                    }
                }).catch(console.error);
            }
        } catch (err) {
            console.error("Failed to delete message", err);
        } finally {
            setDeletingMsgId(null);
            setContextMenu(null);
        }
    };

    // Context menu for message actions
    const handleMessageRightClick = (e: React.MouseEvent, msg: any) => {
        if (Number(msg.senderId) !== Number(user?.id)) return; // Only own messages
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY });
    };

    const handleMessageLongPress = (msg: any) => {
        if (Number(msg.senderId) !== Number(user?.id)) return;
        // For mobile: show context menu near center
        setContextMenu({ msgId: msg.id, x: window.innerWidth / 2, y: window.innerHeight / 2 });
    };

    if (!user) return null;

    return (
        <main className="min-h-screen bg-cream flex flex-col font-source-sans">
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} />

            <section className="flex-1 pt-[100px] pb-12 px-4 md:px-8 max-w-[1400px] mx-auto w-full flex flex-col">
                <div className="flex-1 bg-white rounded-2xl md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gold/10 overflow-hidden flex flex-col md:flex-row min-h-[600px] md:h-[calc(100vh-150px)]">

                    {/* Inbox Sidebar List */}
                    <div className={`w-full md:w-[380px] flex-col border-r border-gray-100 bg-[#fdfaf7] ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-6 border-b border-gold/10 bg-white">
                            <h2 className="text-2xl font-playfair font-bold text-text-dark">Messages</h2>
                            <p className="text-sm text-text-light mt-1">Connect with your matches</p>
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
                                        onClick={() => {
                                            setSelectedContact(null);
                                            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                                        }}
                                        type="button"
                                        aria-label="Back to contacts"
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
                                        {remoteTyping && (
                                            <span className="text-xs text-primary font-medium animate-pulse mt-0.5">typing...</span>
                                        )}
                                    </div>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 bg-[url('/pattern-bg.png')] bg-opacity-5">
                                    {messages.map((msg, index) => {
                                        const isMe = Number(msg.senderId) === Number(user.id);
                                        return (
                                            <div
                                                key={msg.id || index}
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
                                    <form onSubmit={handleSendMessage} className="flex gap-3 bg-[#fdfaf7] border border-gold/20 p-2 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            placeholder="Write your message..."
                                            className="flex-1 bg-transparent px-4 outline-none text-text-dark placeholder:text-text-light/50"
                                            autoComplete="off"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
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

            {/* Right-click context menu for delete (fallback) */}
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
