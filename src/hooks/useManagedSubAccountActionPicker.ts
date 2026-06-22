'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ManagedSubAccountActionKind } from '../components/ManagedSubAccountActionPicker';
import {
    canManageSubAccounts,
    filterActiveManagedSubAccounts,
    MANAGED_ACTIONS_BLOCKED_MESSAGE,
    type ManagedSubAccount,
} from '../utils/managedSubAccounts';

type PendingManagedAction = {
    action: ManagedSubAccountActionKind;
    onConfirm: (managedProfileUserId: number) => void | Promise<void>;
};

type ManagedActionPickerOptions = {
    onBlocked?: (message: string) => void;
};

export function useManagedSubAccountActionPicker(
    accountType: string | null | undefined,
    subAccounts: ManagedSubAccount[],
    options?: ManagedActionPickerOptions
) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [action, setAction] = useState<ManagedSubAccountActionKind>('interest');
    const pendingRef = useRef<PendingManagedAction | null>(null);

    const activeSubAccounts = useMemo(
        () => filterActiveManagedSubAccounts(subAccounts),
        [subAccounts]
    );

    const needsManagedPicker = canManageSubAccounts(accountType);

    const notifyBlocked = useCallback(() => {
        options?.onBlocked?.(MANAGED_ACTIONS_BLOCKED_MESSAGE);
    }, [options]);

    const runWithManagedAccount = useCallback(
        (
            nextAction: ManagedSubAccountActionKind,
            onConfirm: (managedProfileUserId: number) => void | Promise<void>
        ) => {
            if (!needsManagedPicker) {
                void onConfirm(0);
                return;
            }

            if (activeSubAccounts.length === 0) {
                notifyBlocked();
                return;
            }

            pendingRef.current = { action: nextAction, onConfirm };
            setAction(nextAction);
            setSelectedId(activeSubAccounts[0]?.id ?? null);
            setOpen(true);
        },
        [needsManagedPicker, activeSubAccounts, notifyBlocked]
    );

    const cancelPicker = useCallback(() => {
        setOpen(false);
        pendingRef.current = null;
    }, []);

    const confirmPicker = useCallback(async () => {
        if (selectedId == null || !pendingRef.current) return;
        const pending = pendingRef.current;
        setOpen(false);
        pendingRef.current = null;
        await pending.onConfirm(selectedId);
    }, [selectedId]);

    return {
        open,
        action,
        selectedId,
        setSelectedId,
        needsManagedPicker,
        activeSubAccounts,
        runWithManagedAccount,
        cancelPicker,
        confirmPicker,
    };
}

/** Pass null/0 from runWithManagedAccount when the actor is not a managed parent. */
export function managedProfileUserIdForApi(managedProfileUserId: number | null | undefined): number | undefined {
    const id = managedProfileUserId != null ? Number(managedProfileUserId) : null;
    if (id == null || !Number.isFinite(id) || id <= 0) return undefined;
    return id;
}
