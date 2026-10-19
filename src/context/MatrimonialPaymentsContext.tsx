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

export function MatrimonialPaymentsProvider({ children }: { children: ReactNode }) {
    const [loaded, setLoaded] = useState(false);
    const [paymentsRequired, setPaymentsRequired] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/Matrimonial/GetMatrimonialPaymentsEnabled`, {
                    cache: 'no-store',
                });
                const data = await res.json();
                const result = data?.result ?? data?.Result ?? {};
                const enabled = result.paymentsEnabled ?? result.PaymentsEnabled;
                if (!cancelled && (enabled === false || enabled === 'false')) {
                    setPaymentsRequired(false);
                }
            } catch {
                /* Keep payments required if the setting cannot be loaded. */
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
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
