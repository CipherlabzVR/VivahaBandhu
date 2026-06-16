const FOOTER_SCROLL_RESTORE_KEY = 'mymatch_footer_scroll_restore';

const FOOTER_SCROLL_GUARD_KEY = 'mymatch_footer_scroll_guard';



let guardCleanup: (() => void) | null = null;



function clearUrlHash(): void {

    if (typeof window === 'undefined') return;

    if (window.location.hash) {

        history.replaceState(history.state, '', window.location.pathname + window.location.search);

    }

}



function scrollToSiteFooter(): void {

    const footer = document.getElementById('site-footer');

    if (footer) {

        footer.scrollIntoView({ behavior: 'auto', block: 'start' });

    }

}



function endFooterScrollGuard(): void {

    guardCleanup?.();

    guardCleanup = null;

    if (typeof window !== 'undefined') {

        sessionStorage.removeItem(FOOTER_SCROLL_GUARD_KEY);

    }

}



function startFooterScrollGuard(): void {

    if (typeof window === 'undefined') return;



    endFooterScrollGuard();

    sessionStorage.setItem(FOOTER_SCROLL_GUARD_KEY, '1');



    clearUrlHash();

    const previousScrollRestoration =

        'scrollRestoration' in history ? history.scrollRestoration : undefined;

    if (previousScrollRestoration) {

        history.scrollRestoration = 'manual';

    }



    const reScroll = () => {

        if (sessionStorage.getItem(FOOTER_SCROLL_GUARD_KEY) !== '1') return;

        clearUrlHash();

        scrollToSiteFooter();

    };



    reScroll();



    const delays = [50, 150, 350, 700, 1200, 2000, 3500];

    const timers = delays.map((ms) => window.setTimeout(reScroll, ms));



    let resizeRaf = 0;

    const onResize = () => {

        if (sessionStorage.getItem(FOOTER_SCROLL_GUARD_KEY) !== '1') return;

        cancelAnimationFrame(resizeRaf);

        resizeRaf = requestAnimationFrame(reScroll);

    };



    const resizeObserver =

        typeof ResizeObserver !== 'undefined'

            ? new ResizeObserver(onResize)

            : null;

    resizeObserver?.observe(document.documentElement);



    const observePricing = () => {

        const pricing = document.getElementById('pricing');

        if (pricing) {

            try {

                resizeObserver?.observe(pricing);

            } catch {

                /* already observed */

            }

        }

    };



    observePricing();



    const mutationObserver =

        typeof MutationObserver !== 'undefined'

            ? new MutationObserver(() => observePricing())

            : null;

    mutationObserver?.observe(document.body, { childList: true, subtree: true });



    const endTimer = window.setTimeout(() => {

        endFooterScrollGuard();

        if (previousScrollRestoration) {

            history.scrollRestoration = previousScrollRestoration;

        }

    }, 4500);



    guardCleanup = () => {

        timers.forEach((id) => window.clearTimeout(id));

        window.clearTimeout(endTimer);

        cancelAnimationFrame(resizeRaf);

        resizeObserver?.disconnect();

        mutationObserver?.disconnect();

    };

}



/** Call before leaving a page via a footer navigation link. */

export function markFooterNavDeparture(): void {

    if (typeof window === 'undefined') return;

    endFooterScrollGuard();

    sessionStorage.setItem(FOOTER_SCROLL_RESTORE_KEY, window.location.pathname);

}



/**

 * After browser Back, scroll to the site footer when returning to the page

 * the user left from the footer.

 */

export function tryRestoreFooterScroll(): void {

    if (typeof window === 'undefined') return;



    const restorePath = sessionStorage.getItem(FOOTER_SCROLL_RESTORE_KEY);

    if (!restorePath || restorePath !== window.location.pathname) return;



    sessionStorage.removeItem(FOOTER_SCROLL_RESTORE_KEY);

    startFooterScrollGuard();

}



/** Re-apply footer scroll when async sections (e.g. pricing plans) finish loading. */

export function notifyFooterLayoutSettled(): void {

    if (typeof window === 'undefined') return;

    if (sessionStorage.getItem(FOOTER_SCROLL_GUARD_KEY) !== '1') return;



    clearUrlHash();

    requestAnimationFrame(() => {

        requestAnimationFrame(scrollToSiteFooter);

    });

}



/** Whether this footer href navigates away from the current page (not an in-page hash on home). */

export function footerLinkLeavesPage(href: string, currentPathname: string): boolean {

    if (!href || href === '#') return false;



    if (href.startsWith('/#')) {

        return currentPathname !== '/';

    }



    const targetPath = href.split('?')[0].split('#')[0];

    return targetPath !== currentPathname;

}


