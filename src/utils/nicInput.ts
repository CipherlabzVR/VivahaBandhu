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
