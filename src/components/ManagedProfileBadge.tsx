import type { CSSProperties } from 'react';

interface ManagedProfileBadgeProps {
    managedByLabel?: string;
    managedByType?: string;
    /** Kept for callers; name is not shown on the badge. */
    managerName?: string;
    variant?: 'compact' | 'full';
    style?: CSSProperties;
}

function resolveFamilyRoleLabel(managedByType?: string, managedByLabel?: string): 'Parent' | 'Relation' | 'Self' {
    const type = (managedByType || '').trim().toLowerCase();
    const label = (managedByLabel || '').trim().toLowerCase();
    if (type === 'self' || label.includes('self')) {
        return 'Self';
    }
    if (type === 'relation' || label.includes('relation')) {
        return 'Relation';
    }
    if (type === 'parent' || type === 'parents' || label.includes('parent')) {
        return 'Parent';
    }
    return 'Self';
}

/**
 * Badge for profiles managed by self, parent, relation, or matchmaker.
 */
export default function ManagedProfileBadge({
    managedByLabel,
    managedByType,
    variant = 'compact',
    style,
}: ManagedProfileBadgeProps) {
    const role = resolveFamilyRoleLabel(managedByType, managedByLabel);
    const tooltip =
        role === 'Self'
            ? 'Self profile. Managed by the profile owner.'
            : role === 'Relation'
            ? 'Managed by a relation. Messages and interest go to the account manager.'
            : 'Managed by a parent. Messages and interest go to the account manager.';

    const badgeColors: Record<'Self' | 'Parent' | 'Relation', { bg: string; color: string; border: string }> = {
        Self: {
            bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
            color: '#0369a1',
            border: '1px solid #7dd3fc',
        },
        Parent: {
            bg: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            color: '#5b21b6',
            border: '1px solid #c4b5fd',
        },
        Relation: {
            bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            color: '#15803d',
            border: '1px solid #86efac',
        },
    };

    const currentColors = badgeColors[role];

    const baseStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: variant === 'full' ? '4px 10px' : '2px 8px',
        borderRadius: '999px',
        background: currentColors.bg,
        color: currentColors.color,
        border: currentColors.border,
        fontSize: variant === 'full' ? '0.8rem' : '0.7rem',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
    };

    return (
        <span style={baseStyle} title={tooltip} aria-label={tooltip}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={variant === 'full' ? 14 : 12}
                height={variant === 'full' ? 14 : 12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                {role !== 'Self' && (
                    <>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </>
                )}
            </svg>
            <span>{role}</span>
        </span>
    );
}
