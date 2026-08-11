'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ManagedSubAccount } from '../utils/managedSubAccounts';
import { subAccountDisplayName } from '../utils/managedSubAccounts';
import ModalScrollArea from './ModalScrollArea';
import ProfileAvatar from './ProfileAvatar';

export type PrivacySettingsDraft = {
    kind: 'privacy';
    showInBrowse: boolean;
    photoVisibility: 'everyone' | 'premium';
};

export type EmailInterestSettingsDraft = {
    kind: 'emailInterest';
    enabled: boolean;
};

export type ManagedSettingsDraft = PrivacySettingsDraft | EmailInterestSettingsDraft;

type ManagedSubAccountSettingsPickerProps = {
    open: boolean;
    subAccounts: ManagedSubAccount[];
    accountType?: string | null;
    draft: ManagedSettingsDraft | null;
    isSubmitting?: boolean;
    onConfirm: (selectedIds: number[]) => void | Promise<void>;
    onCancel: () => void;
};

function genderLabel(gender?: string): string {
    const g = (gender || '').trim().toLowerCase();
    if (g === 'male' || g === 'm') return 'Groom';
    if (g === 'female' || g === 'f') return 'Bride';
    return '';
}

function copyForDraft(draft: ManagedSettingsDraft, isMatchmaker: boolean) {
    const profileWord = isMatchmaker ? 'client' : 'managed';
    if (draft.kind === 'emailInterest') {
        return {
            heading: isMatchmaker
                ? 'Which client profiles should this apply to?'
                : 'Which profiles should this apply to?',
            summary: draft.enabled
                ? 'email you when someone shows interest'
                : 'stop interest emails',
            hint: `Apply “${draft.enabled ? 'email on interest' : 'unsubscribe from interest emails'}” to one or more ${profileWord} profiles. Emails are always sent to your main account. You can select multiple.`,
            confirmLabel: 'Apply settings',
            profileWord,
        };
    }

    const browse = draft.showInBrowse ? 'visible in browse' : 'hidden from browse';
    const photo =
        draft.photoVisibility === 'premium'
            ? 'photo for premium members only'
            : 'photo visible to everyone';
    return {
        heading: isMatchmaker
            ? 'Which client profiles should this apply to?'
            : 'Which profiles should this apply to?',
        summary: `${browse}; ${photo}`,
        hint: `Apply privacy settings (${browse}; ${photo}) to one or more ${profileWord} profiles. You can select multiple.`,
        confirmLabel: 'Apply settings',
        profileWord,
    };
}

export default function ManagedSubAccountSettingsPicker({
    open,
    subAccounts,
    accountType,
    draft,
    isSubmitting = false,
    onConfirm,
    onCancel,
}: ManagedSubAccountSettingsPickerProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [error, setError] = useState('');

    const isMatchmaker = accountType === 'Matchmaker';

    const sortedAccounts = useMemo(
        () => [...subAccounts].sort((a, b) => Number(a.id) - Number(b.id)),
        [subAccounts],
    );

    useEffect(() => {
        if (!open) return;
        setError('');
        setSelectedIds(sortedAccounts.map((s) => Number(s.id)).filter((id) => id > 0));
    }, [open, sortedAccounts]);

    if (!open || !draft) return null;

    const { heading, hint, confirmLabel, profileWord } = copyForDraft(draft, isMatchmaker);

    const toggle = (id: number) => {
        if (isSubmitting) return;
        setError('');
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const handleConfirm = () => {
        if (selectedIds.length === 0) {
            setError(`Select at least one ${profileWord} profile.`);
            return;
        }
        void onConfirm(selectedIds);
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="managed-settings-picker-title"
            data-modal-open="true"
            data-lenis-prevent
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
            onClick={() => !isSubmitting && onCancel()}
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
                        id="managed-settings-picker-title"
                        style={{ margin: 0, fontSize: '1.15rem', color: '#1f2937' }}
                    >
                        {heading}
                    </h3>
                    <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5 }}>
                        {hint}
                    </p>
                </div>

                <ModalScrollArea style={{ padding: '12px 16px', maxHeight: 'min(360px, 50vh)' }}>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            gap: '8px',
                        }}
                    >
                        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                            Selected: {selectedIds.length} / {sortedAccounts.length}
                        </span>
                        <button
                            type="button"
                            disabled={isSubmitting || sortedAccounts.length === 0}
                            onClick={() => {
                                setError('');
                                if (selectedIds.length === sortedAccounts.length) {
                                    setSelectedIds([]);
                                } else {
                                    setSelectedIds(
                                        sortedAccounts.map((s) => Number(s.id)).filter((id) => id > 0),
                                    );
                                }
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--primary, #c8922a)',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            {selectedIds.length === sortedAccounts.length ? 'Clear all' : 'Select all'}
                        </button>
                    </div>

                    {sortedAccounts.map((sub) => {
                        const id = Number(sub.id);
                        const isSelected = selectedIds.includes(id);
                        const name = subAccountDisplayName(sub);
                        const gender = genderLabel(sub.gender);
                        return (
                            <button
                                key={id}
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => toggle(id)}
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
                                    cursor: isSubmitting ? 'wait' : 'pointer',
                                    textAlign: 'left',
                                    opacity: isSubmitting ? 0.75 : 1,
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
                                    <ProfileAvatar
                                        photo={sub.profilePhoto}
                                        firstName={sub.firstName}
                                        lastName={sub.lastName}
                                        name={name}
                                        gender={sub.gender}
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
                                        borderRadius: '4px',
                                        border: isSelected ? 'none' : '2px solid #ccc',
                                        background: isSelected ? 'var(--primary, #c8922a)' : 'white',
                                        color: 'white',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    {isSelected ? '✓' : ''}
                                </span>
                            </button>
                        );
                    })}
                </ModalScrollArea>

                {error ? (
                    <p style={{ margin: '0 20px 8px', color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>
                ) : null}

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
                        disabled={isSubmitting}
                        onClick={onCancel}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid #ddd',
                            background: 'white',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting || selectedIds.length === 0}
                        onClick={handleConfirm}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background:
                                !isSubmitting && selectedIds.length > 0
                                    ? 'var(--primary, #c8922a)'
                                    : '#ccc',
                            color: 'white',
                            cursor:
                                !isSubmitting && selectedIds.length > 0 ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                        }}
                    >
                        {isSubmitting ? 'Saving…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
