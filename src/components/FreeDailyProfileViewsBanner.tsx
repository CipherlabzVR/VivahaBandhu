'use client';

import { useEffect, type CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { matrimonialService } from '../services/matrimonialService';
import {
    isSubjectToDailyProfileViewLimit,
    resolveDailyProfileViewLimit,
    resolveRemainingDailyProfileViews,
} from '../utils/dailyProfileViewLimit';

type Props = {
    /** Optional: open subscription modal from the banner CTA. */
    onUpgrade?: () => void;
    className?: string;
    style?: CSSProperties;
};

export default function FreeDailyProfileViewsBanner({ onUpgrade, className, style }: Props) {
    const { user, updateUser } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        if (!user?.id || !isSubjectToDailyProfileViewLimit(user)) return;
        const userId = Number(user.id);
        if (!Number.isFinite(userId) || userId <= 0) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await matrimonialService.getDailyProfileViewStatus(userId);
                const statusOk = Number(res?.statusCode ?? res?.StatusCode) === 200;
                const result = res?.result ?? res?.Result;
                if (!cancelled && statusOk && result) {
                    updateUser({
                        isSubjectToDailyProfileViewLimit:
                            result.isSubjectToDailyProfileViewLimit ??
                            result.IsSubjectToDailyProfileViewLimit ??
                            true,
                        dailyProfileViewLimit:
                            Number(result.dailyProfileViewLimit ?? result.DailyProfileViewLimit) || 10,
                        remainingDailyProfileViews: Number(
                            result.remainingDailyProfileViews ?? result.RemainingDailyProfileViews ?? 0
                        ),
                    });
                }
            } catch {
                // Keep sign-in / cached values if refresh fails.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.isSubscribed, user?.accountType, user?.familySubAccountSlotsPurchased, updateUser]);

    if (!user || !isSubjectToDailyProfileViewLimit(user)) return null;

    const limit = resolveDailyProfileViewLimit(user);
    const remaining = resolveRemainingDailyProfileViews(user);
    const used = Math.max(0, limit - remaining);
    const exhausted = remaining <= 0;

    return (
        <div
            className={className}
            style={{
                marginBottom: '1.25rem',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: exhausted ? '1px solid #fca5a5' : '1px solid #fcd34d',
                background: exhausted
                    ? 'linear-gradient(135deg, #fef2f2, #fff1f2)'
                    : 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem 1rem',
                ...style,
            }}
            role="status"
            aria-live="polite"
        >
            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                <div
                    style={{
                        fontWeight: 700,
                        color: exhausted ? '#991b1b' : '#92400e',
                        fontSize: '0.95rem',
                        marginBottom: '0.2rem',
                    }}
                >
                    {exhausted
                        ? t('dailyProfileViewsExhaustedTitle')
                        : t('dailyProfileViewsLimitTitle')}
                </div>
                <p style={{ margin: 0, color: exhausted ? '#b91c1c' : '#78350f', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {exhausted
                        ? t('dailyProfileViewsExhaustedDesc').replace('{limit}', String(limit))
                        : t('dailyProfileViewsLimitDesc')
                              .replace('{remaining}', String(remaining))
                              .replace('{limit}', String(limit))
                              .replace('{used}', String(used))}
                </p>
            </div>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    flexWrap: 'wrap',
                }}
            >
                <span
                    style={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: exhausted ? '#991b1b' : '#92400e',
                        background: exhausted ? '#fecaca' : '#fde68a',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {remaining}/{limit} {t('dailyProfileViewsLeftLabel')}
                </span>
                {onUpgrade ? (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={onUpgrade}
                        style={{
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.85rem',
                            borderRadius: '999px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {t('dailyProfileViewsUpgrade')}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
