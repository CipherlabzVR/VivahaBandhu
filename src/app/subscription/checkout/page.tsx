'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { matrimonialService } from '../../../services/matrimonialService';
import { PREMIUM_SUBSCRIPTION_LKR } from '../../../constants/subscription';
import { sanitizeNameInput } from '../../../utils/nameInput';

type PaymentMethod = 'card' | 'bank';

export default function SubscriptionCheckoutPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [amount, setAmount] = useState(String(PREMIUM_SUBSCRIPTION_LKR));
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

    const [cardNumber, setCardNumber] = useState('');
    const [cardHolder, setCardHolder] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');

    const [bankSlipFile, setBankSlipFile] = useState<File | null>(null);
    const [bankSlipPreview, setBankSlipPreview] = useState<string | null>(null);
    const [bankRemarks, setBankRemarks] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const queryAmount = url.searchParams.get('amount');
        if (queryAmount) {
            setAmount(queryAmount);
        }
    }, []);

    const formatCardNumber = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const formatExpiry = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setError('File size must be less than 5MB.');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            setError('Only JPG, PNG, WebP, or PDF files are allowed.');
            return;
        }

        setError('');
        setBankSlipFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setBankSlipPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setBankSlipPreview(null);
        }
    };

    const removeFile = () => {
        setBankSlipFile(null);
        setBankSlipPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
                setSuccess('Payment successful. Premium features are now unlocked for your account.');
                setTimeout(() => {
                    router.push('/profile');
                }, 1200);
            } else {
                setError(res?.message || 'Failed to activate premium.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBankTransfer = async () => {
        if (!user?.id) {
            setError('Please log in first.');
            return;
        }

        if (!bankSlipFile) {
            setError('Please upload your bank transfer slip.');
            return;
        }

        setError('');
        setSuccess('');
        setIsSubmitting(true);

        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const base64 = ev.target?.result as string;
                    const res = await matrimonialService.submitBankTransfer(
                        Number(user.id),
                        parseFloat(amount),
                        base64,
                        bankRemarks
                    );
                    if (res?.statusCode === 200 || res?.statusCode === 1) {
                        setSuccess(
                            'Slip received! Our admin team will review your payment and approve your premium membership shortly. ' +
                            'You will be redirected to your profile in a moment.'
                        );
                        setBankSlipFile(null);
                        setBankSlipPreview(null);
                        setBankRemarks('');
                        // Keep the confirmation visible for 2 seconds so the user can read it,
                        // then take them back to their profile page.
                        window.setTimeout(() => {
                            router.push('/profile');
                        }, 2000);
                    } else {
                        setError(res?.message || 'Failed to submit bank transfer.');
                        setIsSubmitting(false);
                    }
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to submit bank transfer.');
                    setIsSubmitting(false);
                }
            };
            reader.readAsDataURL(bankSlipFile);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to read file.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream pt-28 px-4 pb-10">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8">
                <h1 className="text-3xl font-playfair font-bold text-text-dark mb-2">Complete Your Payment</h1>
                <p className="text-text-light mb-6">Plan: Premium | Amount: LKR {amount}</p>

                {/* Payment Method Selection */}
                <div className="flex gap-3 mb-6">
                    <button
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold text-sm ${
                            paymentMethod === 'card'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-cream-dark bg-white text-text-light hover:border-primary/40'
                        }`}
                        onClick={() => { setPaymentMethod('card'); setError(''); setSuccess(''); }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Credit / Debit Card
                        </div>
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200 font-semibold text-sm ${
                            paymentMethod === 'bank'
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-cream-dark bg-white text-text-light hover:border-primary/40'
                        }`}
                        onClick={() => { setPaymentMethod('bank'); setError(''); setSuccess(''); }}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Bank Transfer
                        </div>
                    </button>
                </div>

                {/* Card Payment Form */}
                {paymentMethod === 'card' && (
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
                                    onChange={(e) => setCardHolder(sanitizeNameInput(e.target.value))}
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
                )}

                {/* Bank Transfer Form */}
                {paymentMethod === 'bank' && (
                    <div className="rounded-2xl border border-cream-dark bg-[#fffaf6] p-5 md:p-6">
                        <h2 className="text-lg font-semibold text-text-dark mb-4">Bank Transfer</h2>

                        <div className="bg-white rounded-xl border border-cream-dark p-4 mb-5">
                            <h3 className="text-sm font-semibold text-text-dark mb-3">Transfer to the following account:</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-text-light">Bank Name:</span>
                                    <span className="font-medium text-text-dark">Bank of Ceylon</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Account Name:</span>
                                    <span className="font-medium text-text-dark">Clovesis (Pvt) Ltd</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Account Number:</span>
                                    <span className="font-medium text-text-dark">0012345678</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Branch:</span>
                                    <span className="font-medium text-text-dark">Colombo</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-text-light">Amount:</span>
                                    <span className="font-bold text-primary">LKR {amount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-text-dark font-semibold mb-2 block">
                                    Upload Bank Transfer Slip <span className="text-red-500">*</span>
                                </label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                        bankSlipFile
                                            ? 'border-primary bg-primary/5'
                                            : 'border-cream-dark hover:border-primary/50 bg-white'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />

                                    {bankSlipFile ? (
                                        <div className="space-y-3">
                                            {bankSlipPreview && (
                                                <img
                                                    src={bankSlipPreview}
                                                    alt="Bank slip preview"
                                                    className="max-h-48 mx-auto rounded-lg object-contain"
                                                />
                                            )}
                                            <div className="flex items-center justify-center gap-2">
                                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-sm font-medium text-text-dark">{bankSlipFile.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); removeFile(); }}
                                                className="text-xs text-red-500 hover:text-red-700 underline"
                                            >
                                                Remove & upload different file
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <svg className="w-10 h-10 mx-auto text-text-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-sm text-text-light">
                                                Click to upload your bank transfer slip
                                            </p>
                                            <p className="text-xs text-text-light">
                                                JPG, PNG, WebP, or PDF (max 5MB)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-text-dark font-semibold mb-2 block">Remarks (Optional)</label>
                                <textarea
                                    value={bankRemarks}
                                    onChange={(e) => setBankRemarks(e.target.value)}
                                    placeholder="Any additional details about the transfer..."
                                    className="w-full border border-cream-dark rounded-xl px-3 py-3 resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <p className="text-sm text-amber-800">
                                <strong>Note:</strong> After uploading the slip, your subscription will be activated within 24 hours once our admin verifies the payment.
                            </p>
                        </div>
                    </div>
                )}

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
                        onClick={paymentMethod === 'card' ? handleMockPayment : handleBankTransfer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? 'Processing...'
                            : paymentMethod === 'card'
                                ? 'Pay Now'
                                : 'Submit Bank Transfer Slip'
                        }
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
