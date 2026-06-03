import {
    CHECKOUT_PLAN_MATCHMAKER_DIAMOND,
    CHECKOUT_PLAN_MATCHMAKER_GOLD,
    CHECKOUT_PLAN_PREMIUM_SELF,
} from '../constants/subscription';

export type PublicMatrimonialPackage = {
    id?: number;
    Id?: number;
    name?: string;
    Name?: string;
    description?: string | null;
    Description?: string | null;
    price?: number;
    Price?: number;
    pricePeriodLabel?: string;
    PricePeriodLabel?: string;
    isPopular?: boolean;
    IsPopular?: boolean;
    audience?: number | string;
    Audience?: number | string;
    matchmakerTier?: string | null;
    MatchmakerTier?: string | null;
    systemPackageKey?: string | null;
    SystemPackageKey?: string | null;
    features?: Array<{ key?: string; Key?: string; label?: string; Label?: string }>;
    Features?: Array<{ key?: string; Key?: string; label?: string; Label?: string }>;
    isLifetimeValidity?: boolean;
    IsLifetimeValidity?: boolean;
    validityMonths?: number | null;
    ValidityMonths?: number | null;
};

export function normalizePublicPackages(raw: unknown): PublicMatrimonialPackage[] {
    if (!Array.isArray(raw)) return [];
    return raw as PublicMatrimonialPackage[];
}

export function packageId(pkg: PublicMatrimonialPackage): number {
    return Number(pkg.id ?? pkg.Id ?? 0);
}

export function packageName(pkg: PublicMatrimonialPackage): string {
    return (pkg.name ?? pkg.Name ?? 'Package').trim();
}

export function packagePrice(pkg: PublicMatrimonialPackage): number {
    return Number(pkg.price ?? pkg.Price ?? 0);
}

export function packagePeriodLabel(pkg: PublicMatrimonialPackage): string {
    const p = pkg.pricePeriodLabel ?? pkg.PricePeriodLabel;
    return p != null ? String(p) : '';
}

export function isMatchmakerAudience(pkg: PublicMatrimonialPackage): boolean {
    const a = pkg.audience ?? pkg.Audience;
    if (typeof a === 'number') return a === 1;
    return String(a).toLowerCase() === 'matchmaker';
}

export function isFreePackage(pkg: PublicMatrimonialPackage): boolean {
    return packagePrice(pkg) <= 0;
}

export function packageValidityLabel(pkg: PublicMatrimonialPackage): string {
    if (pkg.isLifetimeValidity ?? pkg.IsLifetimeValidity) return 'Lifetime';
    const m = pkg.validityMonths ?? pkg.ValidityMonths;
    if (m != null && Number(m) > 0) {
        const n = Number(m);
        return n === 1 ? '1 month' : `${n} months`;
    }
    return '';
}

export function packageFeatureLabels(pkg: PublicMatrimonialPackage): string[] {
    const feats = pkg.features ?? pkg.Features ?? [];
    return feats
        .map((f) => (f.label ?? f.Label ?? f.key ?? f.Key ?? '').trim())
        .filter(Boolean);
}

/** Maps a backoffice package to checkout `plan` query values understood by the API. */
export function resolveCheckoutPlan(pkg: PublicMatrimonialPackage): string {
    if (isMatchmakerAudience(pkg)) {
        const tier = (pkg.matchmakerTier ?? pkg.MatchmakerTier ?? '').toUpperCase();
        const key = (pkg.systemPackageKey ?? pkg.SystemPackageKey ?? '').toLowerCase();
        if (tier === 'DIAMOND' || key.includes('diamond')) return CHECKOUT_PLAN_MATCHMAKER_DIAMOND;
        return CHECKOUT_PLAN_MATCHMAKER_GOLD;
    }
    return CHECKOUT_PLAN_PREMIUM_SELF;
}

export function publicPackagesAudienceParam(
    accountType: string | undefined | null
): 'user' | 'matchmaker' {
    return accountType === 'Matchmaker' ? 'matchmaker' : 'user';
}
