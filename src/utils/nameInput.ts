/**
 * Helpers for the various "name" fields in the app (first name, last name,
 * father's name, mother's name, contact-form names, etc.).
 *
 * Rule: a name may contain Unicode letters, spaces, hyphens and apostrophes.
 * It MUST NOT contain digits, punctuation or symbols. We enforce this in two
 * ways so it works whether the user types or pastes:
 *
 *  - sanitizeNameInput()        - strip illegal characters on every keystroke
 *                                  so the field literally cannot hold a digit.
 *  - nameLettersOnlyError()     - validation message for the same rule, used
 *                                  on submit / blur as a final safety net.
 */

export const NAME_LETTERS_ONLY = /^[\p{L}\s'-]+$/u;

/**
 * Strip every character that isn't a letter, space, hyphen or apostrophe.
 * Also collapses sequences so we never produce more than one consecutive
 * space - that lets users type "John   Smith" without it sticking around.
 */
export function sanitizeNameInput(value: string): string {
    if (!value) return '';
    // \p{L} = any Unicode letter (covers Sinhala, Tamil, Latin, etc.)
    const cleaned = value.replace(/[^\p{L}\s'-]+/gu, '');
    return cleaned.replace(/\s{2,}/g, ' ');
}

export function nameLettersOnlyError(
    value: string,
    fieldLabel: string
): string | undefined {
    const t = value.trim();
    if (!t) return undefined;
    if (!NAME_LETTERS_ONLY.test(t)) {
        return `${fieldLabel} may only contain letters (no numbers or symbols).`;
    }
    return undefined;
}
