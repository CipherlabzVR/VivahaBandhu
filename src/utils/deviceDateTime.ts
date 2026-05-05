/**
 * Parse API date/time values for display in the browser's local timezone.
 *
 * ASP.NET Core often serializes UTC `DateTime` without a trailing "Z" when the value
 * has `DateTimeKind.Unspecified` after EF Core reads `datetime2`. ECMAScript then
 * treats that as *local* wall time and the clock appears wrong in other timezones.
 * Matrimonial chat, favorites, and related rows are stored with `DateTime.UtcNow`.
 *
 * - ISO strings with `Z` or a numeric offset are parsed normally.
 * - ISO-like datetimes without a zone are interpreted as UTC (append `Z`).
 * - Plain `YYYY-MM-DD` uses noon UTC to reduce off-by-one day issues when only a
 *   calendar date is intended (not used for time-of-day activity labels).
 */
export function parseApiDateForDisplay(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;

    const s = String(value).trim();
    if (!s) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(`${s}T12:00:00Z`);
        return Number.isFinite(d.getTime()) ? d : null;
    }

    // Has explicit zone
    if (/Z$/i.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)) {
        const d = new Date(s);
        return Number.isFinite(d.getTime()) ? d : null;
    }

    // "2024-01-15T10:30:00" or with fractional seconds — treat as UTC
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/i.test(s)) {
        const d = new Date(`${s}Z`);
        return Number.isFinite(d.getTime()) ? d : null;
    }

    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d : null;
}

export function apiInstantToMs(value: unknown): number {
    const d = parseApiDateForDisplay(value);
    return d ? d.getTime() : 0;
}

export function formatDeviceDateTime(
    value: unknown,
    options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }
): string {
    const d = parseApiDateForDisplay(value);
    if (!d) return '';
    return d.toLocaleString(undefined, options);
}

export function formatDeviceDate(value: unknown): string {
    const d = parseApiDateForDisplay(value);
    if (!d) return '';
    return d.toLocaleDateString(undefined);
}

export function formatDeviceTime(value: unknown): string {
    const d = parseApiDateForDisplay(value);
    if (!d) return '';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
