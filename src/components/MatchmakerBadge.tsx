import type { CSSProperties } from 'react';

interface MatchmakerBadgeProps {
    /** Matchmaker name to show in the tooltip (e.g. "Suresh Perera"). Optional. */
    matchmakerName?: string;
    /** Compact "MM" pill (used inside small profile cards) vs full text pill (used in the detail view). */
    variant?: 'compact' | 'full';
    style?: CSSProperties;
}

/**
 * Badge shown on profiles that were registered by a matchmaker on behalf of a client.
 * Tells viewers that messages and interest will reach the matchmaker, not the profile owner directly.
 */
export default function MatchmakerBadge({ matchmakerName, variant = 'compact', style }: MatchmakerBadgeProps) {
    const tooltip = matchmakerName
        ? `Managed by matchmaker: ${matchmakerName}. Messages and interest go to the matchmaker.`
        : 'Managed by a matchmaker. Messages and interest go to the matchmaker.';

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
                <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
            </svg>
            {variant === 'full' ? (
                <span>Matchmaker{matchmakerName ? ` · ${matchmakerName}` : ''}</span>
            ) : (
                <span>Matchmaker</span>
            )}
        </span>
    );
}
