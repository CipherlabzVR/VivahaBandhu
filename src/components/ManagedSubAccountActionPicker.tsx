'use client';

import type { ManagedSubAccount } from '../utils/managedSubAccounts';
import { subAccountDisplayName } from '../utils/managedSubAccounts';

export type ManagedSubAccountActionKind = 'interest' | 'message' | 'save' | 'preferredSearch';

type ManagedSubAccountActionPickerProps = {
    open: boolean;
    subAccounts: ManagedSubAccount[];
    accountType?: string | null;
    action: ManagedSubAccountActionKind;
    selectedId: number | null;
    onSelect: (subAccountId: number) => void;
    onConfirm: () => void;
    onCancel: () => void;
};

function genderLabel(gender?: string): string {
    const g = (gender || '').trim().toLowerCase();
    if (g === 'male' || g === 'm') return 'Groom';
    if (g === 'female' || g === 'f') return 'Bride';
    return '';
}

function copyForAction(action: ManagedSubAccountActionKind, accountType?: string | null) {
    const isMatchmaker = accountType === 'Matchmaker';
    switch (action) {
        case 'interest':
            return {
                heading: isMatchmaker ? 'Which client profile is sending interest?' : 'Which profile is sending interest?',
                hint: isMatchmaker
                    ? 'Interest will be sent on behalf of the selected client profile.'
                    : 'Interest will be sent on behalf of the selected managed profile.',
                confirmLabel: 'Send interest',
            };
        case 'message':
            return {
                heading: isMatchmaker ? 'Which client profile is messaging?' : 'Which profile is messaging?',
                hint: isMatchmaker
                    ? 'Messages are sent on behalf of the selected client profile.'
                    : 'Messages are sent on behalf of the selected managed profile.',
                confirmLabel: 'Continue to message',
            };
        case 'save':
            return {
                heading: isMatchmaker ? 'Which client profile is saving this?' : 'Which profile is saving this?',
                hint: isMatchmaker
                    ? 'Saved profiles are grouped under the selected client profile.'
                    : 'Saved profiles are grouped under the selected managed profile.',
                confirmLabel: 'Save profile',
            };
        case 'preferredSearch':
        default:
            return {
                heading: isMatchmaker ? 'Which client profile is searching?' : 'Which profile is searching?',
                hint: isMatchmaker
                    ? 'Preferred Search uses that client’s partner preferences to find matches.'
                    : 'Preferred Search uses that profile’s partner preferences to find matches.',
                confirmLabel: 'Use Preferred Search',
            };
    }
}

export default function ManagedSubAccountActionPicker({
    open,
    subAccounts,
    accountType,
    action,
    selectedId,
    onSelect,
    onConfirm,
    onCancel,
}: ManagedSubAccountActionPickerProps) {
    if (!open) return null;

    const { heading, hint, confirmLabel } = copyForAction(action, accountType);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="managed-sub-account-picker-title"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10050,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                backgroundColor: 'rgba(0,0,0,0.45)',
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    background: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
                    overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ padding: '22px 24px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <h3
                        id="managed-sub-account-picker-title"
                        style={{ margin: 0, fontSize: '1.15rem', color: '#1f2937' }}
                    >
                        {heading}
                    </h3>
                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>
                        {hint}
                    </p>
                </div>

                <div style={{ padding: '12px 16px', maxHeight: 'min(360px, 50vh)', overflowY: 'auto' }}>
                    {subAccounts.map((sub) => {
                        const isSelected = selectedId === sub.id;
                        const name = subAccountDisplayName(sub);
                        const gender = genderLabel(sub.gender);
                        return (
                            <button
                                key={sub.id}
                                type="button"
                                onClick={() => onSelect(sub.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '12px 14px',
                                    marginBottom: '8px',
                                    border: isSelected ? '2px solid var(--primary, #c8922a)' : '1px solid #eee',
                                    borderRadius: '12px',
                                    background: isSelected ? '#fdf8f3' : 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                }}
                            >
                                <div
                                    style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        border: '2px solid #f3e8dc',
                                    }}
                                >
                                    <img
                                        src={
                                            sub.profilePhoto ||
                                            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100'
                                        }
                                        alt={name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.98rem' }}>
                                        {name}
                                    </div>
                                    {gender ? (
                                        <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>
                                            {gender}
                                        </div>
                                    ) : null}
                                </div>
                                <span
                                    aria-hidden
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: isSelected ? '6px solid var(--primary, #c8922a)' : '2px solid #ccc',
                                        flexShrink: 0,
                                    }}
                                />
                            </button>
                        );
                    })}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '10px',
                        padding: '14px 20px 20px',
                        borderTop: '1px solid #f0f0f0',
                    }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                            background: 'white',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={selectedId == null}
                        onClick={onConfirm}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: selectedId != null ? 'var(--primary, #c8922a)' : '#ccc',
                            color: 'white',
                            cursor: selectedId != null ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
