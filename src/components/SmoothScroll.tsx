'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { setLenisInstance } from '../utils/lenisScroll';
import ModalLenisLock from './ModalLenisLock';

const isModalScrollTarget = (node: HTMLElement) => {
    if (typeof node.closest !== 'function') return false;
    return Boolean(
        node.closest('[data-lenis-prevent]') ||
            node.closest('.modal-overlay') ||
            node.closest('.modal-scroll-area') ||
            node.closest('.modal')
    );
};

const LENIS_OPTIONS = {
    // Lower lerp = creamier inertia (was 0.1)
    lerp: 0.055,
    duration: 1.6,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.1,
    syncTouch: true,
    // Popups / nested overflow: do not hijack wheel — they use ModalScrollArea Lenis
    allowNestedScroll: true,
    prevent: (node: HTMLElement) => isModalScrollTarget(node),
} as const;

function LenisInstanceBridge() {
    const lenis = useLenis();

    useEffect(() => {
        setLenisInstance(lenis ?? null);
        return () => setLenisInstance(null);
    }, [lenis]);

    return null;
}

/**
 * Site-wide Lenis smooth scrolling. Children stay outside the Lenis tree so
 * route/state never remounts when scroll mode toggles.
 * Lenis starts after idle so it does not compete with LCP on mobile.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (media.matches) return;

        let cancelled = false;
        const start = () => {
            if (cancelled) return;
            // Load Lenis CSS only when smooth scroll is actually enabled.
            void import('lenis/dist/lenis.css');
            setEnabled(true);
        };

        const onMotionChange = () => {
            if (media.matches) {
                setEnabled(false);
            }
        };
        media.addEventListener('change', onMotionChange);

        const w = window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        let idleId: number | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        if (typeof w.requestIdleCallback === 'function') {
            idleId = w.requestIdleCallback(start, { timeout: 3500 });
        } else {
            timeoutId = window.setTimeout(start, 2000);
        }

        return () => {
            cancelled = true;
            media.removeEventListener('change', onMotionChange);
            if (idleId != null) w.cancelIdleCallback?.(idleId);
            if (timeoutId != null) window.clearTimeout(timeoutId);
        };
    }, []);

    return (
        <>
            {enabled ? (
                <ReactLenis root options={LENIS_OPTIONS}>
                    <LenisInstanceBridge />
                </ReactLenis>
            ) : null}
            <ModalLenisLock />
            {children}
        </>
    );
}
