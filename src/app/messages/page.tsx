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
        <main className="messages-page" style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-light)',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Header onOpenLogin={() => { }} onOpenRegister={() => { }} />

            <div className="messages-container" style={{
                flex: 1,
                display: 'flex',
                maxWidth: '1200px',
                margin: '100px auto 2rem',
                width: '100%',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                overflow: 'hidden',
                height: 'calc(100vh - 150px)'
            }}>
                {/* Inbox Sidebar */}
                <div className="inbox-sidebar" style={{
                    width: '350px',
                    borderRight: '1px solid #eee',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
                        <h2 style={{ margin: 0, color: 'var(--text-dark)' }}>Messages</h2>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>Loading...</div>
                        ) : inbox.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-light)' }}>No conversations yet.</div>
                        ) : (
                            inbox.map(contact => (
                                <div
                                    key={contact.contactId}
                                    onClick={() => handleSelectContact(contact.contactId)}
                                    style={{
                                        display: 'flex',
                                        padding: '1rem 1.5rem',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f9f9f9',
                                        backgroundColor: selectedContact?.contactId === contact.contactId ? '#fdf8f3' : 'transparent',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        backgroundColor: '#eee',
                                        marginRight: '1rem',
                                        overflow: 'hidden',
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={contact.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                            alt={contact.firstName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <h4 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {contact.firstName} {contact.lastName}
                                            </h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                                                {new Date(contact.sentAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.85rem',
                                            color: contact.unreadCount > 0 ? 'var(--text-dark)' : 'var(--text-light)',
                                            fontWeight: contact.unreadCount > 0 ? 600 : 400,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {contact.latestMessage}
                                        </p>
                                    </div>
                                    {contact.unreadCount > 0 && (
                                        <div style={{
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: '20px',
                                            height: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold',
                                            marginLeft: '0.5rem',
                                            alignSelf: 'center'
                                        }}>
                                            {contact.unreadCount}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Window */}
                <div className="chat-window" style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#fafafa'
                }}>
                    {selectedContact ? (
                        <>
                            {/* Chat Header */}
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid #eee',
                                backgroundColor: 'white',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    marginRight: '1rem'
                                }}>
                                    <img
                                        src={selectedContact.profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'}
                                        alt={selectedContact.firstName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <h3 style={{ margin: 0 }}>{selectedContact.firstName} {selectedContact.lastName}</h3>
                            </div>

                            {/* Messages Area */}
                            <div style={{
                                flex: 1,
                                padding: '1.5rem',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                {messages.map((msg, index) => {
                                    const isMe = Number(msg.senderId) === Number(user.id);
                                    return (
                                        <div key={msg.id || index} style={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '70%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            <div style={{
                                                backgroundColor: isMe ? 'var(--primary)' : 'white',
                                                color: isMe ? 'white' : 'var(--text-dark)',
                                                padding: '0.75rem 1rem',
                                                borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                                border: isMe ? 'none' : '1px solid #eee'
                                            }}>
                                                {msg.content}
                                            </div>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: 'var(--text-light)',
                                                marginTop: '4px',
                                                alignSelf: isMe ? 'flex-end' : 'flex-start'
                                            }}>
                                                {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input */}
                            <div style={{
                                padding: '1rem 1.5rem',
                                backgroundColor: 'white',
                                borderTop: '1px solid #eee'
                            }}>
                                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        style={{
                                            flex: 1,
                                            padding: '0.8rem 1rem',
                                            borderRadius: '24px',
                                            border: '1px solid #ddd',
                                            outline: 'none'
                                        }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        style={{
                                            backgroundColor: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '45px',
                                            height: '45px',
                                            cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: newMessage.trim() ? 1 : 0.5,
                                            transition: 'opacity 0.2s'
                                        }}
                                    >
                                        ➤
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>💬</span>
                                <h3>Select a conversation</h3>
                                <p>Choose a contact from the inbox to start chatting.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Footer />
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
