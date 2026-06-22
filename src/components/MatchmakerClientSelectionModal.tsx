'use client';

import { useEffect, useMemo, useState } from 'react';
import { isManagedSubAccountActive, subAccountDisplayName, type ManagedSubAccount } from '../utils/managedSubAccounts';

type Props = {
    open: boolean;
    maxSelectable: number;
    subAccounts: ManagedSubAccount[];
    initialSelectedIds?: number[];
    requireSelection?: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: number[]) => Promise<void>;
};

export function MatchmakerClientSelectionModal({
    open,
    maxSelectable,
    subAccounts,
    initialSelectedIds,
    requireSelection = true,
    onClose,
    onConfirm,
}: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (initialSelectedIds && initialSelectedIds.length > 0) {
            setSelectedIds(initialSelectedIds.slice(0, maxSelectable));
            return;
        }
        const active = subAccounts
            .filter((s) => isManagedSubAccountActive(s))
            .map((s) => Number(s.id))
            .filter((id) => id > 0)
            .slice(0, maxSelectable);
        setSelectedIds(active);
    }, [open, initialSelectedIds, maxSelectable, subAccounts]);

    const sortedAccounts = useMemo(
        () => [...subAccounts].sort((a, b) => Number(a.id) - Number(b.id)),
        [subAccounts],
    );

    if (!open) return null;

    const toggle = (id: number) => {
        setError('');
        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            if (prev.length >= maxSelectable) {
                setError(`You can activate at most ${maxSelectable} profile(s) on your current plan.`);
                return prev;
            }
            return [...prev, id];
        });
    };

    const handleConfirm = async () => {
        if (selectedIds.length === 0) {
            setError('Select at least one client profile to activate.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await onConfirm(selectedIds);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save your selection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay active modal-overlay--stacked" role="dialog" aria-modal="true">
            <div className="modal" style={{ maxWidth: '560px' }}>
                <button
                    type="button"
                    className="modal-close"
                    onClick={() => !isSubmitting && !requireSelection && onClose()}
                    aria-label="Close"
                    disabled={isSubmitting || requireSelection}
                >
                    ✕
                </button>
                <div className="modal-header">
                    <h2>Choose active client profiles</h2>
                    <p>
                        Your plan allows {maxSelectable} active client profile{maxSelectable === 1 ? '' : 's'}, but you
                        have {subAccounts.length} on file. Select which profiles should stay active — the rest will
                        be paused until you change your selection or upgrade your plan.
                    </p>
                </div>
                <div className="modal-body">
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        Selected: {selectedIds.length} / {maxSelectable}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '360px', overflowY: 'auto' }}>
                        {sortedAccounts.map((sub) => {
                            const id = Number(sub.id);
                            const checked = selectedIds.includes(id);
                            const wasActive = isManagedSubAccountActive(sub);
                            return (
                                <label
                                    key={id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 0.85rem',
                                        borderRadius: '10px',
                                        border: checked ? '2px solid var(--primary, #b45309)' : '1px solid #e5e7eb',
                                        background: checked ? '#fffbeb' : '#fff',
                                        cursor: isSubmitting ? 'wait' : 'pointer',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={isSubmitting}
                                        onChange={() => toggle(id)}
                                    />
                                    <span style={{ flex: 1 }}>
                                        <strong>{subAccountDisplayName(sub)}</strong>
                                        {!wasActive ? (
                                            <span style={{ marginLeft: '0.5rem', color: '#92400e', fontSize: '0.82rem' }}>
                                                (paused)
                                            </span>
                                        ) : null}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {error ? (
                        <p style={{ color: '#b91c1c', fontSize: '0.88rem', marginTop: '1rem' }}>{error}</p>
                    ) : null}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                        {!requireSelection ? (
                            <button
                                type="button"
                                className="btn btn-outline"
                                disabled={isSubmitting}
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={isSubmitting || selectedIds.length === 0}
                            onClick={handleConfirm}
                        >
                            {isSubmitting ? 'Saving…' : 'Activate selected profiles'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
