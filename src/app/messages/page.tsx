'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { matrimonialService } from '@/services/matrimonialService';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

    // Initial auth check and inbox fetch
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

                    // If url params specify a userId to chat with, select them
                    if (urlUserId) {
                        const contactId = Number(urlUserId);
                        // Make sure we select them even if not in inbox yet 
                        // (we'll fetch their details if needed, but for now just setting id)
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
    }, [user, router, urlUserId]);

    const handleSelectContact = async (contactId: number) => {
        if (!user) return;

        // Find existing contact info in inbox
        const existingContact = inbox.find(c => c.contactId === contactId);

        if (existingContact) {
            setSelectedContact(existingContact);
        } else {
            // Need a basic object for a new conversation that isn't in inbox yet
            setSelectedContact({
                contactId: contactId,
                firstName: "User",
                lastName: "",
                profilePhoto: null
            });
            // Try fetching their profile to get accurate name/photo
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
    };

    const fetchMessages = async (contactId: number) => {
        if (!user) return;
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

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || !selectedContact) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const res = await matrimonialService.sendMessage(Number(user.id), selectedContact.contactId, content);
            if (res.statusCode === 200 || res.statusCode === 1) {
                // Optimistically add message
                setMessages(prev => [...prev, {
                    id: Math.random(),
                    senderId: Number(user.id),
                    receiverId: selectedContact.contactId,
                    content: content,
                    sentAt: new Date().toISOString(),
                    isRead: false
                }]);

                // Refresh inbox to show latest message in list
                matrimonialService.getInbox(Number(user.id)).then(inboxRes => {
                    if (inboxRes.statusCode === 200 || inboxRes.statusCode === 1) {
                        setInbox(inboxRes.result || []);
                    }
                }).catch(console.error);
            }
        } catch (err) {
            console.error("Failed to send message", err);
            setNewMessage(content); // restore on fail
        }
    };

    if (!user) return null; // Avoid flicker before redirect

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
                                        onClick={() => setSelectedContact(null)}
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
                                    <h3 className="font-playfair text-xl md:text-2xl font-semibold m-0">{selectedContact.firstName} {selectedContact.lastName}</h3>
                                </div>

                                {/* Messages Area */}
                                <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-4 bg-[url('/pattern-bg.png')] bg-opacity-5">
                                    {messages.map((msg, index) => {
                                        const isMe = Number(msg.senderId) === Number(user.id);
                                        return (
                                            <div key={msg.id || index} className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'self-end' : 'self-start'}`}>
                                                <div className={`px-4 py-3 shadow-sm ${isMe
                                                        ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl rounded-tr-sm'
                                                        : 'bg-white text-text-dark rounded-2xl rounded-tl-sm border border-gold/10'
                                                    }`}>
                                                    <p className="m-0 text-[0.95rem] leading-relaxed">{msg.content}</p>
                                                </div>
                                                <span className={`text-[0.65rem] text-text-light/70 mt-1 font-medium ${isMe ? 'self-end' : 'self-start'}`}>
                                                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                                    <form onSubmit={handleSendMessage} className="flex gap-3 bg-[#fdfaf7] border border-gold/20 p-2 rounded-full shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
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
