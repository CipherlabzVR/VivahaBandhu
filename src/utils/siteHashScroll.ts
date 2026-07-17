import { smoothScrollTo } from './lenisScroll';

const PRICING_HASH = 'pricing';
const HASH_SCROLL_GUARD_KEY = 'mymatch_hash_scroll_guard';

/** Home-page sections reachable via footer / header hash links. */
export const SITE_SECTION_HASHES = [
    'how-it-works',
    'matchmaker',
    'blog',
    'faq',
    'pricing',
] as const;

const PENDING_SITE_HASH_KEY = 'mymatch_pending_site_hash';

/** Fixed header offset so section titles sit below the nav bar. */
export const SITE_HEADER_SCROLL_OFFSET = 96;

let hashGuardCleanup: (() => void) | null = null;

export function getSiteHashId(): string {
    if (typeof window === 'undefined') return '';
    return window.location.hash.replace(/^#/, '').trim();
}

/** Stash a home section id when navigating from another page (App Router drops hashes). */
export function setPendingSiteHash(sectionId: string): void {
    if (typeof window === 'undefined') return;
    const id = sectionId.trim();
    if (!id) return;
    sessionStorage.setItem(PENDING_SITE_HASH_KEY, id);
}

export function consumePendingSiteHash(): string {
    if (typeof window === 'undefined') return '';
    const id = sessionStorage.getItem(PENDING_SITE_HASH_KEY)?.trim() || '';
    if (id) sessionStorage.removeItem(PENDING_SITE_HASH_KEY);
    return id;
}

export function scrollToSiteSection(sectionId: string, behavior: ScrollBehavior = 'auto'): boolean {
    if (typeof window === 'undefined') return false;
    const el = document.getElementById(sectionId);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - SITE_HEADER_SCROLL_OFFSET;
    smoothScrollTo(Math.max(0, top), { immediate: behavior === 'auto' });
    return true;
}

/** Scroll to a known home hash section (retries briefly while the layout settles). */
export function prepareSiteHashNavigation(sectionId?: string, behavior: ScrollBehavior = 'smooth'): void {
    if (typeof window === 'undefined') return;
    const id = (sectionId || getSiteHashId()).trim();
    if (!id) return;
    if (!(SITE_SECTION_HASHES as readonly string[]).includes(id)) return;

    if (id === PRICING_HASH) {
        preparePricingHashNavigation();
        return;
    }

    const attempt = () => {
        scrollToSiteSection(id, behavior);
    };
    attempt();
    [50, 150, 350, 700].forEach((ms) => window.setTimeout(attempt, ms));
}

export function endHashScrollGuard(): void {
    hashGuardCleanup?.();
    hashGuardCleanup = null;
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(HASH_SCROLL_GUARD_KEY);
    }
}

/**
 * When navigating to /#pricing from another page, the browser scrolls before plan
 * cards load and the section is still short. Hold manual scroll restoration and
 * re-scroll until pricing layout settles.
 */
export function preparePricingHashNavigation(): void {
    if (typeof window === 'undefined') return;
    if (getSiteHashId() !== PRICING_HASH) return;

    endHashScrollGuard();
    sessionStorage.setItem(HASH_SCROLL_GUARD_KEY, PRICING_HASH);

    const previousScrollRestoration =
        'scrollRestoration' in history ? history.scrollRestoration : undefined;
    if (previousScrollRestoration) {
        history.scrollRestoration = 'manual';
    }

    // Avoid locking scroll on the pre-load section height.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const reScroll = () => {
        if (sessionStorage.getItem(HASH_SCROLL_GUARD_KEY) !== PRICING_HASH) return;
        scrollToSiteSection(PRICING_HASH);
    };

    reScroll();

    const delays = [50, 150, 350, 700, 1200, 2000, 3500];
    const timers = delays.map((ms) => window.setTimeout(reScroll, ms));

    let resizeRaf = 0;
    const onResize = () => {
        if (sessionStorage.getItem(HASH_SCROLL_GUARD_KEY) !== PRICING_HASH) return;
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(reScroll);
    };

    const resizeObserver =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    resizeObserver?.observe(document.documentElement);

    const observePricingNodes = () => {
        const pricing = document.getElementById(PRICING_HASH);
        const plans = document.getElementById('pricing-plans');
        if (pricing) {
            try {
                resizeObserver?.observe(pricing);
            } catch {
                /* already observed */
            }
        }
        if (plans) {
            try {
                resizeObserver?.observe(plans);
            } catch {
                /* already observed */
            }
        }
    };

    observePricingNodes();

    const mutationObserver =
        typeof MutationObserver !== 'undefined'
            ? new MutationObserver(() => observePricingNodes())
            : null;
    mutationObserver?.observe(document.body, { childList: true, subtree: true });

    const endTimer = window.setTimeout(() => {
        endHashScrollGuard();
        if (previousScrollRestoration) {
            history.scrollRestoration = previousScrollRestoration;
        }
    }, 4500);

    hashGuardCleanup = () => {
        timers.forEach((id) => window.clearTimeout(id));
        window.clearTimeout(endTimer);
        cancelAnimationFrame(resizeRaf);
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
    };
}

/** Re-scroll to pricing after async plan cards finish loading. */
export function notifyPricingLayoutSettled(): void {
    if (typeof window === 'undefined') return;
    if (getSiteHashId() !== PRICING_HASH) return;

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollToSiteSection(PRICING_HASH);
        });
    });
}
