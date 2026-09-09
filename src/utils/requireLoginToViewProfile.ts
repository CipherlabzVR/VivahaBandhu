import { showToast } from './toast';

/** Returns true when the visitor may open a profile detail. Guests are sent to login. */
export function requireLoginToViewProfile(
    user: { id?: string | number | null } | null | undefined,
    message = 'Please login to view profiles.'
): boolean {
    if (user?.id != null && String(user.id).trim() !== '') {
        return true;
    }
    showToast(message, 'info');
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-login-modal'));
    }
    return false;
}
