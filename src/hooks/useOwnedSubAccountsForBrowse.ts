'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { matrimonialService } from '../services/matrimonialService';
import {
    canManageSubAccounts,
    normalizeSubAccount,
    type ManagedSubAccount,
} from '../utils/managedSubAccounts';
import { ownedBrowseUserIds } from '../utils/browseProfileFilters';

/** Loads managed sub-account ids so browse/featured lists can hide the viewer's own profiles. */
export function useOwnedSubAccountsForBrowse() {
    const { user } = useAuth();
    const viewerId = user?.id != null ? Number(user.id) : undefined;
    const [subAccounts, setSubAccounts] = useState<ManagedSubAccount[]>([]);

    useEffect(() => {
        if (viewerId == null || Number.isNaN(viewerId) || !canManageSubAccounts(user?.accountType)) {
            setSubAccounts([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.getSubAccounts(viewerId);
                if (cancelled) return;
                if (res.statusCode === 200 || res.statusCode === 1) {
                    const rows = (Array.isArray(res.result) ? res.result : [])
                        .map((row: Record<string, unknown>) => normalizeSubAccount(row))
                        .filter(Boolean) as ManagedSubAccount[];
                    setSubAccounts(rows);
                } else {
                    setSubAccounts([]);
                }
            } catch {
                if (!cancelled) setSubAccounts([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [viewerId, user?.accountType]);

    const ownedIds = useMemo(
        () => ownedBrowseUserIds(viewerId, subAccounts),
        [viewerId, subAccounts]
    );

    return { viewerId, subAccounts, ownedIds };
}
