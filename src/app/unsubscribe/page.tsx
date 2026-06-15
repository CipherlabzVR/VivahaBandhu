'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { matrimonialService } from '@/services/matrimonialService';
import { useAuth } from '@/context/AuthContext';

function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const { user, updateUser } = useAuth();
    const userId = Number(searchParams.get('userId'));
    const token = searchParams.get('token')?.trim() ?? '';

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!Number.isFinite(userId) || userId <= 0 || !token) {
            setStatus('error');
            setMessage('This unsubscribe link is invalid. Open Settings in your profile to manage email notifications.');
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.unsubscribeInterestEmails(userId, token);
                if (cancelled) return;
                if (res?.statusCode === 200 || res?.statusCode === 1) {
                    setStatus('success');
                    setMessage(
                        res?.message ||
                            res?.Message ||
                            'You have been unsubscribed from interest notification emails.'
                    );
                    if (user?.id != null && Number(user.id) === userId) {
                        updateUser?.({ emailOnInterest: false });
                    }
                } else {
                    setStatus('error');
                    setMessage(res?.message || res?.Message || 'Could not complete unsubscribe.');
                }
            } catch (err) {
                if (cancelled) return;
                setStatus('error');
                setMessage(
                    err instanceof Error
                        ? err.message
                        : 'Could not complete unsubscribe. Try again from Profile > Settings.'
                );
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [userId, token, user?.id, updateUser]);

    return (
        <main style={{ minHeight: '70vh', padding: '2rem 1rem' }}>
            <div
                style={{
                    maxWidth: '520px',
                    margin: '3rem auto',
                    padding: '2rem',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    textAlign: 'center',
                }}
            >
                {status === 'loading' ? (
                    <>
                        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Unsubscribing…</h1>
                        <p style={{ color: '#6b7280' }}>Please wait while we update your email preferences.</p>
                    </>
                ) : status === 'success' ? (
                    <>
                        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', color: '#047857' }}>
                            Unsubscribed
                        </h1>
                        <p style={{ color: '#374151', lineHeight: 1.55 }}>{message}</p>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '1rem' }}>
                            You will still receive in-app interest notifications when you sign in.
                        </p>
                    </>
                ) : (
                    <>
                        <h1 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', color: '#b45309' }}>
                            Unsubscribe failed
                        </h1>
                        <p style={{ color: '#374151', lineHeight: 1.55 }}>{message}</p>
                    </>
                )}

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link href="/profile?settings=open" className="btn btn-outline">
                        Profile settings
                    </Link>
                    <Link href="/" className="btn btn-primary">
                        Home
                    </Link>
                </div>
            </div>
        </main>
    );
}

export default function UnsubscribePage() {
    return (
        <>
            <Header onOpenLogin={() => {}} onOpenRegister={() => {}} onOpenVerify={() => {}} />
            <Suspense
                fallback={
                    <main style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p>Loading…</p>
                    </main>
                }
            >
                <UnsubscribeContent />
            </Suspense>
        </>
    );
}
