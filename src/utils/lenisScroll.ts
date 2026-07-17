import type Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function setLenisInstance(instance: Lenis | null): void {
    lenisInstance = instance;
}

export function getLenisInstance(): Lenis | null {
    return lenisInstance;
}

/** Programmatic scroll that uses Lenis when available, otherwise native window scroll. */
export function smoothScrollTo(
    top: number,
    options?: { immediate?: boolean; duration?: number }
): void {
    if (typeof window === 'undefined') return;
    const y = Math.max(0, top);
    const lenis = lenisInstance;
    if (lenis) {
        lenis.scrollTo(y, {
            immediate: options?.immediate ?? false,
            duration: options?.duration,
        });
        return;
    }
    window.scrollTo({
        top: y,
        left: 0,
        behavior: options?.immediate ? 'auto' : 'smooth',
    });
}
