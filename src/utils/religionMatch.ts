/**
 * Canonical religion keys aligned with Matrimonial NormalizeReligionValue (backend).
 * Christianity and Catholic are distinct (separate browse filters and partner matching).
 */
export function canonicalReligionKey(value: string | null | undefined): string {
    const normalized = (value ?? '').trim().toLowerCase();
    switch (normalized) {
        case 'buddhist':
            return 'buddhism';
        case 'hindu':
            return 'hinduism';
        case 'muslim':
            return 'islam';
        case 'christian':
            return 'christianity';
        case 'catholic':
        case 'roman catholic':
            return 'catholic';
        default:
            return normalized;
    }
}

export function religionFilterMatches(
    profileReligion: string | null | undefined,
    filterReligion: string | null | undefined
): boolean {
    if (!filterReligion || filterReligion === 'Any') return true;
    return canonicalReligionKey(profileReligion) === canonicalReligionKey(filterReligion);
}
