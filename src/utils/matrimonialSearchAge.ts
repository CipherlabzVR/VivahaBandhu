/** Minimum age for matrimonial search / browse (matches profile partner preferences & API). */
export const MATRIMONIAL_MIN_SEARCH_AGE = 18;

export function validateMatrimonialSearchAge(
    minAgeStr: string,
    maxAgeStr: string
): { ok: true } | { ok: false; message: string } {
    const minRaw = minAgeStr.trim();
    const maxRaw = maxAgeStr.trim();
    if (!minRaw && !maxRaw) return { ok: true };

    if (minRaw) {
        const min = parseInt(minRaw, 10);
        if (Number.isNaN(min)) {
            return { ok: false, message: 'Minimum age must be a valid whole number.' };
        }
        if (min < MATRIMONIAL_MIN_SEARCH_AGE) {
            return { ok: false, message: `Minimum age must be at least ${MATRIMONIAL_MIN_SEARCH_AGE}.` };
        }
    }
    if (maxRaw) {
        const max = parseInt(maxRaw, 10);
        if (Number.isNaN(max)) {
            return { ok: false, message: 'Maximum age must be a valid whole number.' };
        }
        if (max < MATRIMONIAL_MIN_SEARCH_AGE) {
            return { ok: false, message: `Maximum age must be at least ${MATRIMONIAL_MIN_SEARCH_AGE}.` };
        }
    }
    if (minRaw && maxRaw) {
        const min = parseInt(minRaw, 10);
        const max = parseInt(maxRaw, 10);
        if (!Number.isNaN(min) && !Number.isNaN(max) && max < min) {
            return { ok: false, message: 'Maximum age must be greater than or equal to minimum age.' };
        }
    }
    return { ok: true };
}
