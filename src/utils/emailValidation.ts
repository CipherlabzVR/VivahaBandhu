/**
 * Normalizes pasted/typed emails: trim, lowercase, strip mailto:/brackets/spaces.
 */
export function normalizeEmailInput(raw: string): string {
    let value = (raw ?? '').trim();
    if (!value) return '';

    if (/^mailto:/i.test(value)) {
        value = value.slice(7);
    }
    // Strip wrapping angle brackets from pasted "Name <email@domain.com>" / "<email@domain.com>"
    const angleMatch = value.match(/<([^>]+)>/);
    if (angleMatch?.[1]) {
        value = angleMatch[1];
    }
    value = value.replace(/\s+/g, '');
    return value.toLowerCase();
}

/**
 * Practical email check: local part + domain with at least one dot (e.g. gmail.com).
 * Rejects spaces, multiple @, missing TLD, and consecutive dots.
 */
export function isValidEmailAddress(raw: string): boolean {
    const email = normalizeEmailInput(raw);
    if (!email || email.length > 254) return false;
    if ((email.match(/@/g) || []).length !== 1) return false;
    if (email.includes('..')) return false;

    const [local, domain] = email.split('@');
    if (!local || !domain) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (domain.startsWith('.') || domain.endsWith('.') || domain.startsWith('-') || domain.endsWith('-')) {
        return false;
    }
    if (!domain.includes('.')) return false;

    // Domain labels must be alphanumeric/hyphen; TLD at least 2 letters.
    const domainOk = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain);
    if (!domainOk) return false;

    const localOk = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/i.test(local)
        || /^[a-z0-9]$/i.test(local);
    return localOk;
}

/** Returns a short English validation message, or null when valid. */
export function getEmailValidationError(raw: string): string | null {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return 'Email is required.';

    const email = normalizeEmailInput(trimmed);
    if (!email.includes('@')) {
        return 'Email must include @ (example: you@gmail.com).';
    }
    if ((email.match(/@/g) || []).length !== 1) {
        return 'Use exactly one @ in your email address.';
    }
    const [, domain = ''] = email.split('@');
    if (!domain) {
        return 'Enter the part after @ (for example gmail.com).';
    }
    if (!domain.includes('.')) {
        return 'The domain after @ must include a dot (example: gmail.com).';
    }
    if (!isValidEmailAddress(email)) {
        return 'Enter a valid email with a proper domain (example: name@gmail.com).';
    }
    return null;
}
