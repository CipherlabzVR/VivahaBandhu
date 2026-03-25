/** NIC / passport: letters and digits only (no spaces, hyphens, or other symbols). */
export function sanitizeNicInput(value: string, maxLength = 12): string {
    return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, maxLength);
}
