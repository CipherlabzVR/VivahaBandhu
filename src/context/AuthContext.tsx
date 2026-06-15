'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser, setStoredUser, updateStoredUser, clearStoredAuth } from '../utils/authStorage';

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    nic?: string;
    dob?: string;
    gender?: string;
    phone?: string;
    whatsapp?: string;
    accountType?: string;
    /** Set when this login is a managed sub-account (created under a parent user). */
    parentUserId?: number | null;
    profilePhoto?: string;
    isVerified?: boolean;
    isSubscribed?: boolean;
    /** Matchmaker: FREE | GOLD | DIAMOND (from sign-in / profile). */
    matchmakerTier?: string;
    matchmakerMaxClientProfiles?: number;
    matchmakerClientProfileCount?: number;
    matchmakerCanAddClients?: boolean;
    /** Gold: full-detail views remaining today (-1 = not applicable). */
    matchmakerDailyFullProfileViewsRemaining?: number;
    /** Whether Self user has classic premium (not used for Matchmaker billing). */
    isPremiumSelfSubscribed?: boolean;
    /** ISO UTC end date of current paid period (Self or Matchmaker), when the API provides it. */
    subscriptionExpiresAt?: string;
    /** Paid membership with no expiry (from package validity = Lifetime). */
    subscriptionIsLifetime?: boolean;
    /** True when the user cancelled but premium stays usable until subscriptionExpiresAt (can reactivate before then). */
    subscriptionCancelled?: boolean;
    /** Whether the user wants an email when someone shows interest. Server-authoritative. */
    emailOnInterest?: boolean;
    /**
     * Premium-only: when false, phone / WhatsApp / email are hidden from other viewers (server-enforced).
     * Undefined defaults to visible (true) in UI.
     */
    showContactInformation?: boolean;
    horoscopeDocument?: string;
    /** Additional horoscope page / image URL (stored on matrimonial profile). */
    horoscopeDocument2?: string;
    /** Additional horoscope page / image URL (third slot). */
    horoscopeDocument3?: string;
    /** True if accountType is Parents / Relation (includes legacy Father / Mother). */
    isFamilyParentAccount?: boolean;
    /** Sub-account slot entitlements for Self / family parents (2 from premium + paid top-ups). */
    familySubAccountSlotsPurchased?: number;
    /** Sub-account slots already used (incremented on creation, never decremented on delete). */
    familySubAccountSlotsConsumed?: number;
    /** Hard cap on total slots a family parent can hold. */
    familySubAccountSlotsMaxTotal?: number;
    /** LKR cost to buy one additional family sub-account slot. */
    familySubAccountAdditionalAmountLkr?: number;
    /** Validity in months for the active sub-account package. */
    familySubAccountPackageValidityMonths?: number;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User, remember?: boolean) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check storage for user on initial load (client-side only).
        // Session user takes precedence over local user.
        if (typeof window !== 'undefined') {
            const storedUser = getStoredUser<User>();
            if (storedUser) {
                setUser(storedUser);
            }
            setLoading(false);
        }
    }, []);

    const login = useCallback((userData: User, remember = true) => {
        setUser(userData);
        setStoredUser(userData, remember);
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        clearStoredAuth();
        router.push('/');
    }, [router]);

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...userData };
            updateStoredUser(updatedUser);
            return updatedUser;
        });
    }, []);

    const value = useMemo(() => ({ user, login, logout, updateUser, loading }), [user, login, logout, updateUser, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
