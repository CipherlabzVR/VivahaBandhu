'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

type MatrimonialPaymentsContextValue = {
    /** True while the public setting has not loaded. Treat payments as required until then. */
    loaded: boolean;
    /** When true, premium features need payment. When false, all features are free. */
    paymentsRequired: boolean;
};

const MatrimonialPaymentsContext = createContext<MatrimonialPaymentsContextValue>({
    loaded: false,
    paymentsRequired: true,
});

const CACHE_KEY = 'matrimonialPaymentsRequired';

function readCachedPaymentsRequired(): boolean | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
    return null;
}

export function MatrimonialPaymentsProvider({ children }: { children: ReactNode }) {
    const [loaded, setLoaded] = useState(false);
    const [paymentsRequired, setPaymentsRequired] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const apply = (enabled: unknown) => {
            if (cancelled) return;
            if (enabled === undefined || enabled === null || enabled === '') {
                setLoaded(true);
                return;
            }
            const required = !(enabled === false || enabled === 'false');
            setPaymentsRequired(required);
            sessionStorage.setItem(CACHE_KEY, required ? '1' : '0');
            setLoaded(true);
        };

        const cached = readCachedPaymentsRequired();
        if (cached === false) setPaymentsRequired(false);

        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/Matrimonial/GetMatrimonialPaymentsEnabled`, {
                    cache: 'no-store',
                });
                const data = await res.json();
                const result = data?.result ?? data?.Result ?? {};
                apply(result.paymentsEnabled ?? result.PaymentsEnabled);
            } catch {
                if (!cancelled) setLoaded(true);
            }
        };

        void load();
        const onFocus = () => { void load(); };
        window.addEventListener('focus', onFocus);
        const timer = window.setInterval(() => { void load(); }, 20000);
        return () => {
            cancelled = true;
            window.removeEventListener('focus', onFocus);
            window.clearInterval(timer);
        };
    }, []);

    return (
        <MatrimonialPaymentsContext.Provider value={{ loaded, paymentsRequired }}>
            {children}
        </MatrimonialPaymentsContext.Provider>
    );
}

export function useMatrimonialPayments() {
    return useContext(MatrimonialPaymentsContext);
}
