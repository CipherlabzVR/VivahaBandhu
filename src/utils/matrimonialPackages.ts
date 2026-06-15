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
    maxManagedAccounts?: number | null;
    MaxManagedAccounts?: number | null;
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

export function packageMaxManagedAccounts(pkg: PublicMatrimonialPackage): number {
    const raw = pkg.maxManagedAccounts ?? pkg.MaxManagedAccounts;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
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

export function packageHasFeatureKey(pkg: PublicMatrimonialPackage, key: string): boolean {
    const feats = pkg.features ?? pkg.Features ?? [];
    return feats.some(
        (f) => String(f.key ?? f.Key ?? '').trim().toLowerCase() === key.trim().toLowerCase()
    );
}

/** Union of all features across packages (preserves first-seen order) for Free vs Premium comparison tables. */
export function buildFeatureComparisonRows(
    packages: PublicMatrimonialPackage[]
): { key: string; label: string; includedIn: boolean[] }[] {
    const keyOrder: string[] = [];
    const keyLabels = new Map<string, string>();

    for (const pkg of packages) {
        const feats = pkg.features ?? pkg.Features ?? [];
        for (const f of feats) {
            const k = String(f.key ?? f.Key ?? '').trim();
            const label = String(f.label ?? f.Label ?? k).trim();
            if (!k) continue;
            if (!keyOrder.includes(k)) keyOrder.push(k);
            if (!keyLabels.has(k)) keyLabels.set(k, label);
        }
    }

    return keyOrder.map((key) => ({
        key,
        label: keyLabels.get(key) ?? key,
        includedIn: packages.map((pkg) => packageHasFeatureKey(pkg, key)),
    }));
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

export type UserPlanContext = {
    isSubscribed?: boolean;
    accountType?: string;
    matchmakerTier?: string;
} | null | undefined;

function packageMatchmakerTier(pkg: PublicMatrimonialPackage): string {
    return (pkg.matchmakerTier ?? pkg.MatchmakerTier ?? '').toUpperCase();
}

function packageSystemKey(pkg: PublicMatrimonialPackage): string {
    return (pkg.systemPackageKey ?? pkg.SystemPackageKey ?? '').toLowerCase();
}

/** Resolves which public package row matches the signed-in user's active plan. */
export function resolveUserCurrentPackage(
    packages: PublicMatrimonialPackage[],
    user: UserPlanContext
): PublicMatrimonialPackage | null {
    if (!user || packages.length === 0) return null;

    const isMatchmaker = user.accountType === 'Matchmaker';
    const mmTier = (user.matchmakerTier || 'FREE').toUpperCase();
    const subscribed = user.isSubscribed === true;

    if (isMatchmaker) {
        if (!subscribed || mmTier === 'FREE') {
            return (
                packages.find((p) => packageSystemKey(p) === 'mm-free') ??
                packages.find((p) => isMatchmakerAudience(p) && isFreePackage(p)) ??
                null
            );
        }
        if (mmTier === 'GOLD') {
            return (
                packages.find((p) => isMatchmakerAudience(p) && packageMatchmakerTier(p) === 'GOLD') ??
                packages.find((p) => packageSystemKey(p).includes('gold')) ??
                null
            );
        }
        if (mmTier === 'DIAMOND') {
            return (
                packages.find((p) => isMatchmakerAudience(p) && packageMatchmakerTier(p) === 'DIAMOND') ??
                packages.find((p) => packageSystemKey(p).includes('diamond')) ??
                null
            );
        }
        return null;
    }

    const selfPackages = packages.filter((p) => !isMatchmakerAudience(p));
    if (!subscribed) {
        return selfPackages.find((p) => isFreePackage(p)) ?? null;
    }

    return (
        selfPackages.find((p) => packageSystemKey(p).includes('premium')) ??
        selfPackages.find((p) => !isFreePackage(p)) ??
        null
    );
}

export function isUserCurrentPackage(
    pkg: PublicMatrimonialPackage,
    packages: PublicMatrimonialPackage[],
    user: UserPlanContext
): boolean {
    const current = resolveUserCurrentPackage(packages, user);
    if (!current) return false;
    return packageId(pkg) === packageId(current);
}
