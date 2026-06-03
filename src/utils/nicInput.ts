/** NIC / passport: letters and digits only (no spaces, hyphens, or other symbols). */
export function sanitizeNicInput(value: string, maxLength = 12): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, maxLength);
}

const OLD_NIC_REGEX = /^\d{9}[VXvx]$/;
const NEW_NIC_REGEX = /^\d{12}$/;
const SL_PASSPORT_REGEX = /^[A-Za-z]\d{7}$/;

export const NIC_PASSPORT_HINT =
    'Enter a valid NIC (e.g. 901234567V or 200012345678) or Passport No (e.g. N1234567).';

export function isValidNicOrPassport(value: string): boolean {
    const t = value.trim();
    if (!t) return false;
    return OLD_NIC_REGEX.test(t) || NEW_NIC_REGEX.test(t) || SL_PASSPORT_REGEX.test(t);
}

export function nicOrPassportFormatError(value: string): string | undefined {
    const t = value.trim();
    if (!t) return undefined;
    if (isValidNicOrPassport(t)) return undefined;
    return NIC_PASSPORT_HINT;
}

export type NicParsedIdentity = { dob: string; gender: string };

/**
 * Parse a Sri Lankan NIC (old 9+V/X or new 12-digit) and extract date of birth + gender.
 * Returns null for passport numbers or incomplete/invalid NIC input.
 * Uses a leap-year reference (2000) because Sri Lankan NIC day-of-year treats February as 29 days.
 */
export function parseNicToDobAndGender(nicNumber: string): NicParsedIdentity | null {
    const normalized = nicNumber.trim().toUpperCase();
    const currentYear = new Date().getFullYear();
    let year = '';
    let dayText = '';

    if (/^\d{9}[VX]$/.test(normalized)) {
        year = `19${normalized.substring(0, 2)}`;
        dayText = normalized.substring(2, 5);
    } else if (/^\d{12}$/.test(normalized)) {
        const parsedYear = Number(normalized.substring(0, 4));
        if (parsedYear < 1900 || parsedYear > currentYear) return null;
        year = normalized.substring(0, 4);
        dayText = normalized.substring(4, 7);
    } else {
        return null;
    }

    let dayOfYear = parseInt(dayText, 10);
    if (Number.isNaN(dayOfYear)) return null;

    let gender: string;
    if (dayOfYear > 500) {
        gender = 'Female';
        dayOfYear -= 500;
    } else {
        gender = 'Male';
    }

    if (dayOfYear < 1 || dayOfYear > 366) return null;

    const refDate = new Date(Date.UTC(2000, 0, 1));
    refDate.setUTCDate(dayOfYear);
    const month = String(refDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(refDate.getUTCDate()).padStart(2, '0');
    return { dob: `${year}-${month}-${day}`, gender };
}
