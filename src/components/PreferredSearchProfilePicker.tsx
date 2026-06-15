'use client';

import ManagedSubAccountActionPicker from './ManagedSubAccountActionPicker';
import type { ManagedSubAccount } from '../utils/managedSubAccounts';

type PreferredSearchProfilePickerProps = {
    open: boolean;
    subAccounts: ManagedSubAccount[];
    accountType?: string | null;
    selectedId: number | null;
    onSelect: (subAccountId: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function PreferredSearchProfilePicker(props: PreferredSearchProfilePickerProps) {
    return (
        <ManagedSubAccountActionPicker
            {...props}
            action="preferredSearch"
        />
    );
}
