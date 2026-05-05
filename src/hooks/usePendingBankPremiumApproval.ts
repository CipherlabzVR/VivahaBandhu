'use client';

import { useState, useEffect } from 'react';
import { PENDING_BANK_PREMIUM_STORAGE_KEY } from '../constants/premiumActivation';

/**
 * True when the user submitted a bank slip for premium and we are waiting for admin approval
 * (localStorage flag set at checkout). Clears when subscription becomes active or flag is removed.
 */
export function usePendingBankPremiumApproval(isSubscribed: boolean | undefined): boolean {
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const read = () => {
            if (isSubscribed === true) {
                setPending(false);
                return;
            }
            setPending(localStorage.getItem(PENDING_BANK_PREMIUM_STORAGE_KEY) === '1');
        };

        read();

        const onStorage = (e: StorageEvent) => {
            if (e.key === PENDING_BANK_PREMIUM_STORAGE_KEY || e.key === null) read();
        };
        const onVisible = () => {
            if (document.visibilityState === 'visible') read();
        };

        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        return () => {
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
        };
    }, [isSubscribed]);

    return pending && isSubscribed !== true;
}
