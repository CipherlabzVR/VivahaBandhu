'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';

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
    login: (userData: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for user on initial load (client-side only)
        if (typeof window !== 'undefined') {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    setUser(JSON.parse(storedUser));
                } catch (error) {
                    console.error('Failed to parse user data from localStorage:', error);
                    localStorage.removeItem('user');
                }
            }
            setLoading(false);
        }
    }, []);

    const login = useCallback((userData: User) => {
        setUser(userData);
        if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(userData));
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        if (typeof window !== 'undefined') {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        }
    }, []);

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser(prev => {
            if (!prev) return prev;
            const updatedUser = { ...prev, ...userData };
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(updatedUser));
            }
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
