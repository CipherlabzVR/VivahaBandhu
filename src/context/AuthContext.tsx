'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
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
    profilePhoto?: string;
    isVerified?: boolean;
    isSubscribed?: boolean;
    horoscopeDocument?: string;
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
    }, []);

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
