import type { CSSProperties } from 'react';

interface ClientProfileBadgeProps {
    /** compact = card/tab pill; full = profile detail line */
    variant?: 'compact' | 'full';
    style?: CSSProperties;
}

/**
 * Badge on a matchmaker's own dashboard for profiles they manage on behalf of clients.
 * Browse listings use MatchmakerBadge instead (viewer-facing).
 */
export default function ClientProfileBadge({ variant = 'compact', style }: ClientProfileBadgeProps) {
    const tooltip =
        'Client profile you manage. Messages and interest for this profile are delivered to your matchmaker account.';

    const baseStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: variant === 'full' ? '4px 10px' : '2px 8px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
        color: '#92400e',
        border: '1px solid #fcd34d',
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
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
            {variant === 'full' ? 'Client profile · matchmaker managed' : 'Client profile'}
        </span>
    );
}
