import type { CSSProperties } from 'react';

interface ManagedProfileBadgeProps {
    managedByLabel?: string;
    managerName?: string;
    variant?: 'compact' | 'full';
    style?: CSSProperties;
}

/**
 * Badge for profiles managed by a parent, relation, or matchmaker on behalf of someone else.
 */
export default function ManagedProfileBadge({
    managedByLabel,
    managerName,
    variant = 'compact',
    style,
}: ManagedProfileBadgeProps) {
    const label = (managedByLabel || 'Managed by parent').trim();
    const tooltip = managerName
        ? `${label}. Messages and interest go to ${managerName}.`
        : `${label}. Messages and interest go to the account manager.`;

    const baseStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: variant === 'full' ? '4px 10px' : '2px 8px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
        color: '#5b21b6',
        border: '1px solid #c4b5fd',
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
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {variant === 'full' ? (
                <span>{label}{managerName ? ` · ${managerName}` : ''}</span>
            ) : (
                <span>{label}</span>
            )}
        </span>
    );
}
