'use client';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

type StorageScope = 'local' | 'session';

function canUseStorage(): boolean {
    return typeof window !== 'undefined';
}

function byScope(scope: StorageScope): Storage {
    return scope === 'session' ? sessionStorage : localStorage;
}

function getActiveScope(): StorageScope {
    if (!canUseStorage()) return 'local';
    const hasSessionAuth = !!sessionStorage.getItem(TOKEN_KEY) || !!sessionStorage.getItem(USER_KEY);
    return hasSessionAuth ? 'session' : 'local';
}

export function getStoredToken(): string | null {
    if (!canUseStorage()) return null;
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, remember = true): void {
    if (!canUseStorage()) return;
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    byScope(remember ? 'local' : 'session').setItem(TOKEN_KEY, token);
}

export function getStoredUser<T = unknown>(): T | null {
    if (!canUseStorage()) return null;
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function setStoredUser(user: unknown, remember = true): void {
    if (!canUseStorage()) return;
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    byScope(remember ? 'local' : 'session').setItem(USER_KEY, JSON.stringify(user));
}

export function updateStoredUser(user: unknown): void {
    if (!canUseStorage()) return;
    byScope(getActiveScope()).setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
    if (!canUseStorage()) return;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}
