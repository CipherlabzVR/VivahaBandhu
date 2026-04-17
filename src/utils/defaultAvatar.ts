/**
 * Generates a friendly default avatar as an inline SVG data URI for profiles
 * that don't have a real photo uploaded. Avoids using stock photos of strangers
 * as placeholders, which is misleading.
 *
 * The avatar shows the user's initials (or a generic person silhouette if no
 * name is available) on a soft gender-tinted background.
 */

interface AvatarOptions {
    firstName?: string | null;
    lastName?: string | null;
    gender?: string | null;
}

const FEMALE_BG = '#fce7f3';
const FEMALE_FG = '#9d174d';
const MALE_BG = '#dbeafe';
const MALE_FG = '#1e3a8a';
const NEUTRAL_BG = '#e5e7eb';
const NEUTRAL_FG = '#374151';

function pickPalette(gender?: string | null) {
    const g = (gender || '').toLowerCase();
    if (g === 'female' || g === 'f') return { bg: FEMALE_BG, fg: FEMALE_FG };
    if (g === 'male' || g === 'm') return { bg: MALE_BG, fg: MALE_FG };
    return { bg: NEUTRAL_BG, fg: NEUTRAL_FG };
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    const fi = f ? f[0] : '';
    const li = l ? l[0] : '';
    const initials = `${fi}${li}`.toUpperCase();
    return initials || '';
}

/**
 * Returns an inline SVG data URI sized 400x400 — works as the `src` of any `<img>`
 * (object-fit: cover) so it visually replaces a missing profile photo seamlessly.
 */
export function getDefaultAvatarDataUri(opts: AvatarOptions = {}): string {
    const { bg, fg } = pickPalette(opts.gender);
    const initials = getInitials(opts.firstName, opts.lastName);

    const inner = initials
        ? `<text x="50%" y="50%" dy="0.36em" text-anchor="middle"
                font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                font-size="160" font-weight="600" fill="${fg}">${escapeForSvg(initials)}</text>`
        : `<g fill="${fg}" transform="translate(100 100) scale(8.33)">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </g>`;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="400" height="400" fill="${bg}"/>
        ${inner}
    </svg>`;

    // encodeURIComponent keeps the URI valid in all browsers; do not use base64
    // (it bloats the string and adds zero benefit for inline SVG).
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function escapeForSvg(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
