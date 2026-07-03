export function buildProfileShareUrl(userId: number, origin?: string): string {
    const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/profiles?viewUser=${userId}`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fall through to legacy copy
        }
    }

    if (typeof document === 'undefined') return false;

    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch {
        return false;
    }
}

export type ShareProfileLinkResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Share or copy a public profile link that opens the profile popup on the site. */
export async function shareProfileLink(
    userId: number,
    profileName?: string
): Promise<ShareProfileLinkResult> {
    const url = buildProfileShareUrl(userId);
    const title = profileName ? `${profileName} — MyMatch.lk` : 'Profile — MyMatch.lk';
    const text = profileName
        ? `View ${profileName}'s profile on MyMatch.lk`
        : 'View this profile on MyMatch.lk';

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({ title, text, url });
            return 'shared';
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return 'cancelled';
            }
        }
    }

    const copied = await copyTextToClipboard(url);
    return copied ? 'copied' : 'failed';
}
