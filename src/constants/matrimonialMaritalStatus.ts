/** Canonical stored/display value for members who have never been married. */
export const MATRIMONIAL_MARITAL_STATUS_UNMARRIED = 'Unmarried';

/** Legacy value kept for backwards-compatible search and API normalization. */
export const MATRIMONIAL_MARITAL_STATUS_LEGACY_NEVER_MARRIED = 'Never Married';

/**
 * Single list for detailed profile, browse filters, and partner preferences.
 * Keep display strings identical everywhere so search matches stored values.
 */
export const MATRIMONIAL_MARITAL_STATUS_OPTIONS: readonly string[] = [
    MATRIMONIAL_MARITAL_STATUS_UNMARRIED,
    'Divorced',
    'Widowed',
    'Separated',
];

export function normalizeMaritalStatus(raw?: string | null): string {
    const value = (raw ?? '').trim();
    if (!value) return '';
    if (value.toLowerCase() === MATRIMONIAL_MARITAL_STATUS_LEGACY_NEVER_MARRIED.toLowerCase()) {
        return MATRIMONIAL_MARITAL_STATUS_UNMARRIED;
    }
    return value;
}

export function formatMaritalStatusDisplay(raw?: string | null): string {
    const normalized = normalizeMaritalStatus(raw);
    return normalized || 'Not Specified';
}

export function maritalStatusFilterMatches(profileStatus: unknown, filterStatus: string): boolean {
    if (!filterStatus) return true;
    return normalizeMaritalStatus(String(profileStatus ?? '')) === normalizeMaritalStatus(filterStatus);
}
