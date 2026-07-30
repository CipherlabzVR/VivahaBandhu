'use client';

import { useEffect, useRef, useState } from 'react';
import type { HubConnection } from '@microsoft/signalr';
import { matrimonialService } from '../services/matrimonialService';
import { connectMatrimonialHub } from '../utils/signalrHub';

const DEFAULT_API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

export interface HeroStatsState {
    verifiedProfiles: number;
    successStories: number;
    trustedMatchmakers: number;
}

function statsEqual(a: HeroStatsState, b: HeroStatsState) {
    return (
        a.verifiedProfiles === b.verifiedProfiles &&
        a.successStories === b.successStories &&
        a.trustedMatchmakers === b.trustedMatchmakers
    );
}

function parseStatsPayload(payload: unknown): HeroStatsState | null {
    if (!payload || typeof payload !== 'object') return null;
    const o = payload as Record<string, unknown>;
    const v = o.verifiedProfilesCount ?? o.VerifiedProfilesCount;
    const s = o.successStoriesCount ?? o.SuccessStoriesCount;
    const m = o.trustedMatchmakersCount ?? o.TrustedMatchmakersCount;
    if (v === undefined && s === undefined && m === undefined) return null;
    return {
        verifiedProfiles: Math.max(0, Number(v ?? 0)),
        successStories: Math.max(0, Number(s ?? 0)),
        trustedMatchmakers: Math.max(0, Number(m ?? 0)),
    };
}

/**
 * Load public hero counters from the API, subscribe to SignalR `ReceiveHeroStatsUpdate`,
 * and refetch periodically if the hub is unavailable.
 * Network work is deferred until after idle so it does not compete with LCP.
 */
export function useHeroLiveStats(initial: HeroStatsState): { stats: HeroStatsState } {
    const [stats, setStats] = useState<HeroStatsState>(initial);
    const lastRef = useRef<HeroStatsState | null>(null);

    useEffect(() => {
        let cancelled = false;
        let connection: HubConnection | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;

        const apply = (payload: unknown) => {
            const parsed = parseStatsPayload(payload);
            if (!parsed) return;
            if (cancelled) return;

            if (lastRef.current === null) {
                lastRef.current = parsed;
                setStats(parsed);
                return;
            }
            if (statsEqual(lastRef.current, parsed)) {
                return;
            }
            lastRef.current = parsed;
            setStats(parsed);
        };

        const startLiveStats = () => {
            if (cancelled) return;

            void (async () => {
                try {
                    const res = await matrimonialService.getPublicHeroStats();
                    const r =
                        (res as { result?: unknown; Result?: unknown }).result ??
                        (res as { Result?: unknown }).Result;
                    if (r) apply(r);
                } catch {
                    /* keep initial marketing defaults */
                }
            })();

            void (async () => {
                try {
                    connection = await connectMatrimonialHub(DEFAULT_API_BASE);
                    if (cancelled) {
                        await connection.stop().catch(() => {});
                        return;
                    }
                    connection.on('ReceiveHeroStatsUpdate', apply);
                } catch {
                    /* polling fallback only */
                }
            })();

            interval = setInterval(async () => {
                try {
                    const res = await matrimonialService.getPublicHeroStats();
                    const r =
                        (res as { result?: unknown; Result?: unknown }).result ??
                        (res as { Result?: unknown }).Result;
                    if (r) apply(r);
                } catch {
                    /* ignore */
                }
            }, 45000);
        };

        const w = window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        let idleId: number | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        if (typeof w.requestIdleCallback === 'function') {
            idleId = w.requestIdleCallback(startLiveStats, { timeout: 4000 });
        } else {
            timeoutId = window.setTimeout(startLiveStats, 2500);
        }

        return () => {
            cancelled = true;
            if (idleId != null) w.cancelIdleCallback?.(idleId);
            if (timeoutId != null) window.clearTimeout(timeoutId);
            if (interval) clearInterval(interval);
            if (connection) {
                connection.off('ReceiveHeroStatsUpdate');
                connection.stop().catch(() => {});
            }
        };
    }, []);

    return { stats };
}

export function formatHeroStatCount(n: number): string {
    return `${n.toLocaleString('en-US')}+`;
}
