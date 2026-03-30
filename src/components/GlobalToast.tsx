'use client';

import { useEffect, useRef, useState } from 'react';
import { APP_TOAST_EVENT, type ToastPayload, type ToastType } from '../utils/toast';

type ToastItem = {
    id: number;
    message: string;
    type: ToastType;
};

export default function GlobalToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const nextIdRef = useRef(1);

    useEffect(() => {
        const handleToast = (event: Event) => {
            const customEvent = event as CustomEvent<ToastPayload>;
            const message = customEvent.detail?.message?.trim();
            if (!message) return;

            const type = customEvent.detail?.type || 'info';
            const durationMs = customEvent.detail?.durationMs ?? 2800;
            const id = nextIdRef.current++;

            setToasts((prev) => [...prev, { id, message, type }]);

            window.setTimeout(() => {
                setToasts((prev) => prev.filter((toast) => toast.id !== id));
            }, Math.max(1200, durationMs));
        };

        window.addEventListener(APP_TOAST_EVENT, handleToast as EventListener);
        return () => window.removeEventListener(APP_TOAST_EVENT, handleToast as EventListener);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="global-toast-container" aria-live="polite" aria-atomic="false">
            {toasts.map((toast) => (
                <div key={toast.id} className={`global-toast global-toast-${toast.type}`} role="status">
                    <span>{toast.message}</span>
                    <button
                        type="button"
                        className="global-toast-close"
                        onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
                        aria-label="Dismiss notification"
                    >
                        x
                    </button>
                </div>
            ))}
        </div>
    );
}
