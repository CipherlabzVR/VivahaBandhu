'use client';

import { useEffect, useMemo, useState } from 'react';

interface HoroscopeLightboxProps {
    open: boolean;
    src: string;
    alt?: string;
    onClose: () => void;
}

/**
 * Fullscreen lightbox for horoscope images / PDFs.
 *
 * UX guarantees:
 *  - Same predictable viewport for any image size (image fits inside, never overflows)
 *  - Always-visible close button (top-right, never off-screen)
 *  - Click outside, ✕ button, or Escape closes it
 *  - Body scroll is locked while open (popup never leaks behind page content)
 *  - Renders nothing when closed, so it cannot persist across navigation
 *  - Falls back gracefully for non-image documents (PDF / DOC) with an "Open" button
 */
export default function HoroscopeLightbox({ open, src, alt = 'Horoscope', onClose }: HoroscopeLightboxProps) {
    const [imgError, setImgError] = useState(false);

    const isImage = useMemo(() => {
        if (!src) return false;
        const lower = src.split('?')[0].toLowerCase();
        return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower);
    }, [src]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    useEffect(() => {
        if (open) setImgError(false);
    }, [open, src]);

    if (!open || !src) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Horoscope viewer"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 4000,
                background: 'rgba(0,0,0,0.82)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: 'min(720px, 92vw)',
                    height: 'min(85vh, 900px)',
                    background: '#fff',
                    borderRadius: '14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.9rem',
                        borderBottom: '1px solid #eee',
                        background: '#fafafa',
                        flexShrink: 0,
                    }}
                >
                    <span style={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>{alt}</span>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: '#fff',
                            border: '1px solid #ddd',
                            color: '#333',
                            fontSize: '1.05rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f4f4f6',
                        padding: '0.75rem',
                        overflow: 'auto',
                    }}
                >
                    {isImage && !imgError ? (
                        <img
                            src={src}
                            alt={alt}
                            onError={() => setImgError(true)}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                background: '#fff',
                                display: 'block',
                            }}
                        />
                    ) : (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.75rem',
                                color: '#555',
                                textAlign: 'center',
                                padding: '1rem',
                            }}
                        >
                            <span style={{ fontSize: '0.95rem' }}>
                                Preview is not available for this file type.
                            </span>
                            <a
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Open in new tab
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
