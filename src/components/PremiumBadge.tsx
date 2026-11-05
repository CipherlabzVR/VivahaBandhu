import type { CSSProperties } from 'react';

interface PremiumBadgeProps {
    /** Compact crown pill (used inside small profile cards) vs full text pill (used in the detail view). */
    variant?: 'compact' | 'full';
    /** Defaults to "Premium"; pass e.g. "Matchmaker Gold" for matchmaker tiers. */
    label?: string;
    style?: CSSProperties;
}

/**
 * Gold "Premium" pill shown on profiles whose owner has an active subscription.
 * Designed to pair with the gold frame applied to the surrounding card.
 */
export default function PremiumBadge({ variant = 'compact', label = 'Premium', style }: PremiumBadgeProps) {
    const tooltip = label === 'Premium' ? 'Premium member' : label;

    const baseStyle: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: variant === 'full' ? '4px 12px' : '3px 9px',
        borderRadius: '999px',
        background: 'linear-gradient(135deg, #C14B70 0%, #A8365A 100%)',
        color: '#ffffff',
        border: '1px solid #A8365A',
        fontSize: variant === 'full' ? '0.8rem' : '0.7rem',
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(193, 75, 112, 0.22)',
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
            <span>{label}</span>
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
        'linear-gradient(white, white), linear-gradient(135deg, #FBE5EB 0%, #E889A8 50%, #C14B70 100%)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    boxShadow: '0 6px 22px rgba(193, 75, 112, 0.20), 0 0 0 1px rgba(193, 75, 112, 0.12)',
};
