export type SubscriptionRemainingInfo = {
    hasExpiry: boolean;
    expired: boolean;
    endDate: Date;
    daysRemaining: number;
    hoursRemaining: number;
};

export function parseSubscriptionRemaining(iso: string | undefined): SubscriptionRemainingInfo | null {
    if (!iso) return null;
    const endDate = new Date(iso);
    if (Number.isNaN(endDate.getTime())) return null;

    const msLeft = endDate.getTime() - Date.now();
    const expired = msLeft <= 0;
    const absMs = Math.max(0, msLeft);
    const daysRemaining = Math.floor(absMs / (24 * 60 * 60 * 1000));
    const hoursRemaining = Math.floor((absMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    return {
        hasExpiry: true,
        expired,
        endDate,
        daysRemaining,
        hoursRemaining,
    };
}

export function formatSubscriptionEndDate(iso: string | undefined, locale?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

type RemainingLabels = {
    expired: string;
    oneDay: string;
    days: (n: number) => string;
    hours: (n: number) => string;
    today: string;
    endsOn: (date: string) => string;
};

export function formatSubscriptionTimeRemaining(
    iso: string | undefined,
    labels: RemainingLabels,
    locale?: string
): { primary: string; secondary: string } | null {
    const info = parseSubscriptionRemaining(iso);
    if (!info) return null;

    const endLabel = formatSubscriptionEndDate(iso, locale);

    if (info.expired) {
        return {
            primary: labels.expired,
            secondary: endLabel ? labels.endsOn(endLabel) : '',
        };
    }

    let primary: string;
    if (info.daysRemaining >= 1) {
        primary =
            info.daysRemaining === 1 ? labels.oneDay : labels.days(info.daysRemaining);
    } else if (info.hoursRemaining >= 1) {
        primary = labels.hours(info.hoursRemaining);
    } else {
        primary = labels.today;
    }

    return {
        primary,
        secondary: endLabel ? labels.endsOn(endLabel) : '',
    };
}
