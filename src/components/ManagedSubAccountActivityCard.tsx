'use client';

import type { CSSProperties, ReactNode } from 'react';
import { apiInstantToMs } from '../utils/deviceDateTime';
import ClientProfileBadge from './ClientProfileBadge';
import ManagedProfileBadge from './ManagedProfileBadge';

type ManagedSubAccountBadgeKind = 'matchmaker-client' | 'family-managed' | 'none';

type ManagedSubAccountRow = {
    id: number;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string | null;
    age?: number;
    cityOfResidence?: string;
    gender?: string;
    phoneNumber?: string;
    email?: string;
};

type ManagedSubActivityRow = {
    subUserId?: number;
    SubUserId?: number;
    unreadInterestCount?: number;
    unreadMessageCount?: number;
    incomingInterests?: unknown[];
    IncomingInterests?: unknown[];
};

type ManagedSubAccountActivityCardProps = {
    subAccount: ManagedSubAccountRow;
    activity?: ManagedSubActivityRow | null;
    formatSubActivityTime: (value: unknown) => string;
    onInterestClick: (subUserId: number) => void;
    onMessagesClick: (subUserId: number) => void;
    onViewProfile: (subAccount: ManagedSubAccountRow) => void;
    onDelete?: (subAccount: ManagedSubAccountRow) => void;
    deletingSubAccountId?: number | null;
    /** Visual badge for managed sub-account type. */
    badgeKind?: ManagedSubAccountBadgeKind;
    managerName?: string;
    managedByLabel?: string;
    /** Shown under the name line (e.g. family vs matchmaker metadata). */
    detailLine?: string;
    footerLine?: string;
};

function badgeButtonStyle(bg: string, color: string): CSSProperties {
    return {
        background: bg,
        color,
        padding: '0.25rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        border: 'none',
        cursor: 'pointer',
    };
}

export default function ManagedSubAccountActivityCard({
    subAccount,
    activity,
    formatSubActivityTime,
    onInterestClick,
    onMessagesClick,
    onViewProfile,
    onDelete,
    deletingSubAccountId = null,
    badgeKind = 'none',
    managerName = '',
    managedByLabel = 'Managed by parent',
    detailLine,
    footerLine,
}: ManagedSubAccountActivityCardProps) {
    const unreadInterest = activity?.unreadInterestCount ?? 0;
    const unreadMessages = activity?.unreadMessageCount ?? 0;
    const interests = activity?.incomingInterests ?? activity?.IncomingInterests ?? [];
    const recentInterestActivity = [...(Array.isArray(interests) ? interests : [])]
        .sort(
            (a: Record<string, unknown>, b: Record<string, unknown>) =>
                apiInstantToMs(b.createdOn ?? b.CreatedOn) - apiInstantToMs(a.createdOn ?? a.CreatedOn)
        )
        .slice(0, 4);

    const fullName =
        `${subAccount.firstName || ''} ${subAccount.lastName || ''}`.trim() || 'Profile';
    const isDeleting = deletingSubAccountId === subAccount.id;

    let displayBadge: ReactNode = null;
    if (badgeKind === 'matchmaker-client') {
        displayBadge = <ClientProfileBadge variant="compact" />;
    } else if (badgeKind === 'family-managed') {
        displayBadge = (
            <ManagedProfileBadge
                variant="compact"
                managedByLabel={managedByLabel}
                managerName={managerName}
            />
        );
    }

    return (
        <div
            style={{
                padding: '1rem',
                background: '#FDF8F3',
                borderRadius: '12px',
                border: '1px solid #f1e8dc',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                    }}
                >
                    {subAccount.profilePhoto ? (
                        <img
                            src={subAccount.profilePhoto}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <span>
                            {subAccount.firstName?.[0] || '?'}
                            {subAccount.lastName?.[0] || ''}
                        </span>
                    )}
                    {badgeKind === 'matchmaker-client' && (
                        <span
                            style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                border: '2px solid #fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                            }}
                            title="Client profile"
                            aria-hidden
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={11}
                                height={11}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#92400e"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
                            </svg>
                        </span>
                    )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                        <h5 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>{fullName}</h5>
                        {displayBadge}
                    </div>
                    {detailLine ? (
                        <p style={{ color: '#6B6560', fontSize: '0.875rem', wordBreak: 'break-word' }}>{detailLine}</p>
                    ) : null}
                    {footerLine ? (
                        <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: '0.25rem' }}>{footerLine}</p>
                    ) : null}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(unreadInterest > 0 || recentInterestActivity.length > 0) && (
                        <button
                            type="button"
                            onClick={() => onInterestClick(subAccount.id)}
                            style={badgeButtonStyle('#fef3c7', '#92400e')}
                            title="View incoming interest"
                        >
                            {unreadInterest > 0 ? `${unreadInterest} interest` : 'Interest'}
                        </button>
                    )}
                    {unreadMessages > 0 && (
                        <button
                            type="button"
                            onClick={() => onMessagesClick(subAccount.id)}
                            style={badgeButtonStyle('#dbeafe', '#1d4ed8')}
                            title="Open messages"
                        >
                            {unreadMessages} message{unreadMessages === 1 ? '' : 's'}
                        </button>
                    )}
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                        onClick={() => onViewProfile(subAccount)}
                    >
                        View profile
                    </button>
                    {onDelete ? (
                        <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                                fontSize: '0.85rem',
                                padding: '0.4rem 0.75rem',
                                color: '#b91c1c',
                                borderColor: '#fecaca',
                            }}
                            onClick={() => onDelete(subAccount)}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                    ) : null}
                </div>
            </div>
            {recentInterestActivity.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                    <h6 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#374151' }}>Recent activity</h6>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {recentInterestActivity.map((item: Record<string, unknown>) => {
                            const fromName = String(item.fromName ?? item.FromName ?? 'Someone');
                            const isUnread = !(item.isRead ?? item.IsRead);
                            const at = item.createdOn ?? item.CreatedOn;
                            return (
                                <div
                                    key={String(item.id ?? item.Id)}
                                    style={{
                                        fontSize: '0.82rem',
                                        color: '#475569',
                                        background: '#fff',
                                        padding: '0.45rem 0.6rem',
                                        borderRadius: '8px',
                                    }}
                                >
                                    <strong>{fromName}</strong> showed interest
                                    {isUnread ? ' · new' : ''}
                                    {at ? (
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                            {formatSubActivityTime(at)}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
