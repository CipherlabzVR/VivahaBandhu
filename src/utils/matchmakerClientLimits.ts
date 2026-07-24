import {
    isMatchmakerAudience,
    packagePrice,
    type PublicMatrimonialPackage,
} from './matrimonialPackages';

/** Paid matchmaker client-account packages (pay-per-use; no Gold/Diamond tiers). */
export function paidMatchmakerPackages(packages: PublicMatrimonialPackage[]): PublicMatrimonialPackage[] {
    return packages.filter((p) => isMatchmakerAudience(p) && packagePrice(p) > 0);
}

/** @deprecated No hard platform max — pay-per-account is unlimited. */
export function platformMaxMatchmakerClients(_packages: PublicMatrimonialPackage[]): number {
    return 0;
}

/** @deprecated Upgrades between subscription tiers no longer exist. */
export function upgradeMatchmakerPackages(
    packages: PublicMatrimonialPackage[],
    _currentMax: number,
): PublicMatrimonialPackage[] {
    return paidMatchmakerPackages(packages);
}

export type MatchmakerClientLimitState = 'can_create' | 'needs_payment';

/** Matchmaker client creation uses purchased slots, same as family pay-per-use. */
export function resolveMatchmakerClientLimitState(input: {
    slotsPurchased: number;
    slotsConsumed: number;
}): MatchmakerClientLimitState {
    const remaining = Math.max(0, input.slotsPurchased - input.slotsConsumed);
    return remaining > 0 ? 'can_create' : 'needs_payment';
}
