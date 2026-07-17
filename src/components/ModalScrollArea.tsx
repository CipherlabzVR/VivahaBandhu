'use client';

import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type ComponentPropsWithoutRef,
    type ReactNode,
} from 'react';
import { ReactLenis, type LenisRef } from 'lenis/react';

const MODAL_LENIS_OPTIONS = {
    lerp: 0.055,
    duration: 1.25,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.1,
    syncTouch: true,
    autoRaf: true,
    overscroll: true,
} as const;

type ModalScrollAreaProps = ComponentPropsWithoutRef<'div'> & {
    children: ReactNode;
};

/**
 * Scrollable region for modal / popup content.
 * Uses nested Lenis when motion is allowed; always marks itself so root Lenis
 * does not steal wheel / touch events.
 */
const ModalScrollArea = forwardRef<HTMLDivElement, ModalScrollAreaProps>(function ModalScrollArea(
    { children, className = '', ...rest },
    ref
) {
    const [enabled, setEnabled] = useState(false);
    const nativeRef = useRef<HTMLDivElement>(null);
    const lenisRef = useRef<LenisRef>(null);

    useEffect(() => {
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setEnabled(!media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    useImperativeHandle(ref, () => {
        if (!enabled) {
            return nativeRef.current as HTMLDivElement;
        }
        return (lenisRef.current?.wrapper ?? nativeRef.current) as HTMLDivElement;
    }, [enabled]);

    const cls = ['modal-scroll-area', className].filter(Boolean).join(' ');

    if (!enabled) {
        return (
            <div ref={nativeRef} className={cls} data-lenis-prevent {...rest}>
                {children}
            </div>
        );
    }

    return (
        <ReactLenis ref={lenisRef} className={cls} data-lenis-prevent options={MODAL_LENIS_OPTIONS} {...rest}>
            {children}
        </ReactLenis>
    );
});

export default ModalScrollArea;
