/** Hint shown when the number does not match accepted formats. */
export const SL_PHONE_HINT =
    'Use 10 digits starting with 0 (e.g. 0771234567), or +94 and 9 digits (e.g. +94771234567). You may also use 11 digits starting with 94 without +.';

export const SL_PHONE_PLACEHOLDER = '0771234567 or +94771234567';

/**
 * Sri Lankan phone input: strips spaces; enforces max length per format.
 * - Starting with 0: at most 10 digits (national format).
 * - Starting with +94: + plus at most 11 digits (94 + 9-digit subscriber).
 * - Starting with 94 (no +): at most 11 digits.
 * - Other digit-only input: capped at 11 to avoid runaway pastes.
 */
export function sanitizeSriLankanPhoneInput(value: string): string {
    const noSpace = value.replace(/\s/g, '');
    if (!noSpace) return '';

    if (noSpace.startsWith('+')) {
        const rest = noSpace.slice(1).replace(/\D/g, '');
        return '+' + rest.slice(0, 11);
    }

    const digits = noSpace.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        return digits.slice(0, 10);
    }
    if (digits.startsWith('94')) {
        return digits.slice(0, 11);
    }
    return digits.slice(0, 11);
}

/** Valid: 0 + 9 digits, or +94 + 9 digits, or 94 + 9 digits (no +). */
export function isValidSriLankanPhone(value: string): boolean {
    const t = value.replace(/\s/g, '');
    return /^0\d{9}$/.test(t) || /^\+94\d{9}$/.test(t) || /^94\d{9}$/.test(t);
}

export function sriLankanPhoneInvalidMessage(fieldLabel: string): string {
    return `${fieldLabel}: ${SL_PHONE_HINT}`;
}

export function sriLankanPhoneFormatErrorIfInvalid(value: string, fieldLabel: string): string | undefined {
    const t = value.replace(/\s/g, '');
    if (!t) return undefined;
    if (isValidSriLankanPhone(t)) return undefined;
    return sriLankanPhoneInvalidMessage(fieldLabel);
}

/** Digits only, with leading 0 normalized to 94 (for comparing 077… vs +9477… vs 9477…). */
export function canonicalSriLankanPhoneDigits(value: string): string {
    const t = value.replace(/\s/g, '');
    if (!t) return '';
    if (t.startsWith('+')) {
        return t.slice(1).replace(/\D/g, '');
    }
    const d = t.replace(/\D/g, '');
    if (d.startsWith('0')) {
        return '94' + d.slice(1);
    }
    return d;
}

export function phonesAreSameSriLankanNumber(a: string, b: string): boolean {
    const ca = canonicalSriLankanPhoneDigits(a);
    const cb = canonicalSriLankanPhoneDigits(b);
    if (!ca || !cb) return false;
    return ca === cb;
}

/** Registration: WhatsApp required via checkbox (same as phone) or a separate valid number; duplicate numbers require the checkbox. */
export const WHATSAPP_SAME_AS_PHONE_MSG =
    'If WhatsApp is the same as your phone number, check "Same as Phone Number".';

export const WHATSAPP_REQUIRED_MSG =
    'WhatsApp number is required. If it matches your phone, check "Same as Phone Number".';
