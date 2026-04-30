'use client';

import type { CSSProperties } from 'react';

/** Heroicons-style outline: visible (password masked → click to show) */
export function EyeOpenIcon({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            aria-hidden
        >
            <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
        </svg>
    );
}

/** Slashed eye: password visible → click to hide */
export function EyeClosedIcon({ className, style }: { className?: string; style?: CSSProperties }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            style={style}
            aria-hidden
        >
            <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.274M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.182 4.182L9.88 9.88" />
        </svg>
    );
}

export const modalPasswordToggleStyle: CSSProperties = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-light, #64748b)',
    lineHeight: 0,
};

type PasswordVisibilityToggleProps = {
    /** True when the password characters are visible (input type text). */
    passwordVisible: boolean;
    onToggle: () => void;
    ariaLabelWhenHidden?: string;
    ariaLabelWhenVisible?: string;
    className?: string;
    style?: CSSProperties;
    tabIndex?: number;
};

export function PasswordVisibilityToggle({
    passwordVisible,
    onToggle,
    ariaLabelWhenHidden = 'Show password',
    ariaLabelWhenVisible = 'Hide password',
    className,
    style,
    tabIndex = 0,
}: PasswordVisibilityToggleProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            tabIndex={tabIndex}
            aria-label={passwordVisible ? ariaLabelWhenVisible : ariaLabelWhenHidden}
            className={className}
            style={style}
        >
            {passwordVisible ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
    );
}
