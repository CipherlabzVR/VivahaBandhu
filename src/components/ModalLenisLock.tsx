'use client';

import { useEffect } from 'react';
import { getLenisInstance } from '../utils/lenisScroll';

function isModalOpen() {
    return Boolean(document.querySelector('.modal-overlay.active, [data-modal-open="true"]'));
}

/**
 * While a popup is open: stop root Lenis (page scroll) and mark overlays so
 * nested modal Lenis / native overflow can receive wheel events.
 */
export default function ModalLenisLock() {
    useEffect(() => {
        const markOverlays = () => {
            document.querySelectorAll('.modal-overlay').forEach((el) => {
                el.setAttribute('data-lenis-prevent', '');
            });
            document.querySelectorAll('.modal-overlay .modal, .modal-overlay .modal-body').forEach((el) => {
                el.setAttribute('data-lenis-prevent', '');
            });
        };

        const sync = () => {
            markOverlays();
            const root = getLenisInstance();
            if (isModalOpen()) {
                root?.stop();
                document.documentElement.classList.add('modal-scroll-locked');
            } else {
                root?.start();
                document.documentElement.classList.remove('modal-scroll-locked');
            }
        };

        sync();
        const observer = new MutationObserver(sync);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-modal-open'],
        });

        return () => {
            observer.disconnect();
            getLenisInstance()?.start();
            document.documentElement.classList.remove('modal-scroll-locked');
        };
    }, []);

    return null;
}
