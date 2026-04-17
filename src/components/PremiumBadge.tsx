import type { CSSProperties } from 'react';

interface PremiumBadgeProps {
    /** Compact crown pill (used inside small profile cards) vs full text pill (used in the detail view). */
    variant?: 'compact' | 'full';
    style?: CSSProperties;
}

/**
 * Gold "Premium" pill shown on profiles whose owner has an active subscription.
 * Designed to pair with the gold frame applied to the surrounding card.
 */
export default function PremiumBadge({ variant = 'compact', style }: PremiumBadgeProps) {
    const tooltip = 'Premium member';

    const baseStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: variant === 'full' ? '4px 12px' : '3px 9px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)',
        color: '#3f2a06',
        border: '1px solid #d97706',
        fontSize: variant === 'full' ? '0.8rem' : '0.7rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
        textShadow: '0 1px 0 rgba(255,255,255,0.35)',
        ...style,
    };

    return (
        <span style={baseStyle} title={tooltip} aria-label={tooltip}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={variant === 'full' ? 14 : 12}
                height={variant === 'full' ? 14 : 12}
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
            >
                {/* Crown icon */}
                <path d="M3 7l4 4 5-7 5 7 4-4-2 12H5L3 7zm2 14h14v2H5v-2z" />
            </svg>
            <span>Premium</span>
        </span>
    );
}

/**
 * Inline style snippet to apply a glowing gold frame to a profile card whose owner is premium.
 * Spread into a card's `style` prop alongside any other styles.
 */
export const PREMIUM_CARD_FRAME_STYLE: CSSProperties = {
    border: '2px solid transparent',
    backgroundImage:
        'linear-gradient(white, white), linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #b45309 100%)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    boxShadow: '0 6px 22px rgba(217, 119, 6, 0.30), 0 0 0 1px rgba(217, 119, 6, 0.15)',
};
