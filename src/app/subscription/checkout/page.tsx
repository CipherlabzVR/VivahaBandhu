'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { matrimonialService } from '../../../services/matrimonialService';

export default function SubscriptionCheckoutPage() {
    const params = useSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const amount = params.get('amount') || '2000';

    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const formatCardNumber = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const formatExpiry = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };

    const handleMockPayment = async () => {
        if (!user?.id) {
            setError('Please log in first.');
            return;
        }

        if (!cardNumber.trim() && !cardHolder.trim() && !expiry.trim() && !cvv.trim()) {
            setError('Enter any card details to continue.');
            return;
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const mockReference = `${cardNumber}|${cardHolder}|${expiry}|${cvv}|MOCK`;
            const res = await matrimonialService.activateMockSubscription(Number(user.id), mockReference);
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                setSuccess('Mock payment successful. Premium features are now unlocked for your account.');
                setTimeout(() => {
                    router.push('/profile');
                }, 1200);
            } else {
                setError(res?.message || 'Failed to activate premium.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Mock payment failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream pt-28 px-4 pb-10">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h1 className="text-3xl font-playfair font-bold text-text-dark mb-2">Mock Payment Gateway</h1>
                <p className="text-text-light mb-6">Plan: Premium | Amount: LKR {amount}</p>

                <div className="rounded-2xl border border-cream-dark bg-[#fffaf6] p-5 md:p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold text-text-dark">Card Payment</h2>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-[#1A1F71] text-white text-xs font-bold tracking-wide">VISA</span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-cream-dark text-xs font-semibold text-text-dark">
                                <span className="w-3 h-3 rounded-full bg-[#EB001B]"></span>
                                <span className="w-3 h-3 rounded-full bg-[#F79E1B] -ml-1.5"></span>
                                Mastercard
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-text-dark font-semibold">Card Number</label>
                            <input
                                type="text"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                placeholder="4111 1111 1111 1111"
                                className="w-full border border-cream-dark rounded-xl px-3 py-3 mt-2"
                                inputMode="numeric"
                                maxLength={19}
                            />
                        </div>

                        <div>
                            <label className="text-sm text-text-dark font-semibold">Card Holder Name</label>
                            <input
                                type="text"
                                value={cardHolder}
                                onChange={(e) => setCardHolder(e.target.value)}
                                placeholder="Name on card"
                                className="w-full border border-cream-dark rounded-xl px-3 py-3 mt-2"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-text-dark font-semibold">Expiry (MM/YY)</label>
                                <input
                                    type="text"
                                    value={expiry}
                                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                    placeholder="12/30"
                                    className="w-full border border-cream-dark rounded-xl px-3 py-3 mt-2"
                                    inputMode="numeric"
                                    maxLength={5}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-text-dark font-semibold">CVV</label>
                                <input
                                    type="password"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="123"
                                    className="w-full border border-cream-dark rounded-xl px-3 py-3 mt-2"
                                    inputMode="numeric"
                                    maxLength={4}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                        {success}
                    </div>
                )}

                <div className="mt-6 flex gap-3">
                    <button
                        className="btn btn-primary"
                        style={{ padding: '0.9rem 1.4rem' }}
                        onClick={handleMockPayment}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processing...' : 'Submit Mock Payment'}
                    </button>
                    <button
                        className="btn btn-outline"
                        style={{ padding: '0.9rem 1.4rem' }}
                        onClick={() => router.push('/search')}
                    >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
}
