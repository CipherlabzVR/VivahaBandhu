/**
 * Auto-scrolls to and focuses the first invalid form input or validation error element.
 * Works seamlessly for full-page forms, modals, and multi-step forms.
 */
export function scrollToFirstFormError(
    containerSelector?: string,
    fieldErrorKeys?: string[],
    errorMsg?: string | null
) {
    setTimeout(() => {
        let firstEl: HTMLElement | null = null;
        const root = containerSelector ? (document.querySelector(containerSelector) || document) : document;

        // Smart keyword detection: If error message specifies a field (e.g., "A user with this email already exists"),
        // prioritize that specific field over generic field arrays.
        let targetKeys: string[] | undefined = undefined;
        if (errorMsg && typeof errorMsg === 'string') {
            const lowerMsg = errorMsg.toLowerCase();
            if (lowerMsg.includes('email')) {
                targetKeys = ['email'];
            } else if (lowerMsg.includes('whatsapp')) {
                targetKeys = ['whatsapp'];
            } else if (lowerMsg.includes('phone') || lowerMsg.includes('mobile') || lowerMsg.includes('contact')) {
                targetKeys = ['phone'];
            } else if (lowerMsg.includes('nic') || lowerMsg.includes('national id') || lowerMsg.includes('passport') || lowerMsg.includes('identity')) {
                targetKeys = ['nic'];
            } else if (lowerMsg.includes('password')) {
                targetKeys = ['password', 'confirmPassword'];
            } else if (lowerMsg.includes('first name') || lowerMsg.includes('firstname')) {
                targetKeys = ['firstName'];
            } else if (lowerMsg.includes('last name') || lowerMsg.includes('lastname')) {
                targetKeys = ['lastName'];
            } else if (lowerMsg.includes('dob') || lowerMsg.includes('date of birth') || lowerMsg.includes('birth')) {
                targetKeys = ['dob'];
            } else if (lowerMsg.includes('gender') || lowerMsg.includes('sex')) {
                targetKeys = ['gender'];
            } else if (lowerMsg.includes('term') || lowerMsg.includes('agree') || lowerMsg.includes('policy')) {
                targetKeys = ['terms'];
            }
        }

        const keysToSearch = targetKeys || fieldErrorKeys;

        // 1. Try finding element by target keys
        if (keysToSearch && keysToSearch.length > 0) {
            for (const key of keysToSearch) {
                const queryCandidates = [
                    `#${key}`,
                    `[name="${key}"]`,
                    `[data-field="${key}"]`,
                    `input[id*="${key}"]`,
                    `select[id*="${key}"]`,
                    `textarea[id*="${key}"]`,
                    `input[placeholder*="${key}" i]`,
                ];
                for (const query of queryCandidates) {
                    const candidate = root.querySelector<HTMLElement>(query);
                    if (candidate && isElementVisible(candidate)) {
                        firstEl = candidate;
                        break;
                    }
                }
                if (firstEl) break;
            }
        }

        // 2. Fallback: Search for any element with error borders or aria-invalid attribute
        if (!firstEl) {
            const errorCandidates = Array.from(
                root.querySelectorAll<HTMLElement>(
                    '[aria-invalid="true"], .is-invalid, .input-error, [style*="border-color: red"], [style*="border-color: #ef4444"], [style*="border-color: rgb(239, 68, 68)"], [style*="border-color: rgb(255, 0, 0)"]'
                )
            );
            for (const candidate of errorCandidates) {
                if (isElementVisible(candidate)) {
                    firstEl = candidate;
                    break;
                }
            }
        }

        // 3. Fallback: Search for error message text elements and target their sibling/parent input
        if (!firstEl) {
            const textErrors = Array.from(
                root.querySelectorAll<HTMLElement>(
                    '.error-message, .form-error, .text-red-500, .text-red-600, .text-rose-500, [style*="color: red"], [style*="color: #ef4444"]'
                )
            );
            for (const textEl of textErrors) {
                if (isElementVisible(textEl)) {
                    const siblingInput = textEl.parentElement?.querySelector<HTMLElement>('input, select, textarea');
                    firstEl = siblingInput || textEl;
                    break;
                }
            }
        }

        // 4. Fallback: Target global error banner if provided
        if (!firstEl && errorMsg) {
            const banner = root.querySelector<HTMLElement>('.register-error-banner, .error-message, .alert-error');
            if (banner && isElementVisible(banner)) {
                firstEl = banner;
            }
        }

        if (!firstEl) return;

        // Apply a gentle highlight animation to draw the user's eye to the field
        firstEl.classList.add('error-pulse-highlight');
        setTimeout(() => firstEl?.classList.remove('error-pulse-highlight'), 2500);

        // Focus the element
        try {
            if (typeof firstEl.focus === 'function') {
                firstEl.focus({ preventScroll: true });
            }
        } catch { /* ignore focus errors */ }

        // Find closest scrollable container (e.g. modal body, scroll area, or window)
        const scrollContainer =
            firstEl.closest<HTMLElement>('.modal-body, [data-lenis-prevent], .overflow-y-auto, [data-scrollable]') ||
            (containerSelector ? document.querySelector<HTMLElement>(containerSelector) : null);

        if (scrollContainer && 'scrollTo' in scrollContainer && scrollContainer !== document.body) {
            const elRect = firstEl.getBoundingClientRect();
            const parentRect = scrollContainer.getBoundingClientRect();
            const relativeTop = elRect.top - parentRect.top + scrollContainer.scrollTop;

            scrollContainer.scrollTo({
                top: Math.max(0, relativeTop - 80),
                behavior: 'smooth',
            });
        } else {
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }, 60);
}

function isElementVisible(el: HTMLElement): boolean {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}
