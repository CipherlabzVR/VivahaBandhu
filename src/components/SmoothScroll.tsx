'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { setLenisInstance } from '../utils/lenisScroll';
import ModalLenisLock from './ModalLenisLock';
import 'lenis/dist/lenis.css';

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
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setEnabled(!media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
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
