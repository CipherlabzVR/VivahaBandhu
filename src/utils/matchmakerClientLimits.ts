import { isMatchmakerPaidTier } from '../constants/subscription';
import {
    isMatchmakerAudience,
    packageMaxManagedAccounts,
    packagePrice,
    type PublicMatrimonialPackage,
} from './matrimonialPackages';

export type MatchmakerClientLimitState = 'can_create' | 'needs_plan' | 'upgrade_for_more' | 'absolute_max';

export function paidMatchmakerPackages(packages: PublicMatrimonialPackage[]): PublicMatrimonialPackage[] {
    return packages.filter((p) => isMatchmakerAudience(p) && packagePrice(p) > 0);
}

export function platformMaxMatchmakerClients(packages: PublicMatrimonialPackage[]): number {
    const slots = paidMatchmakerPackages(packages).map(packageMaxManagedAccounts).filter((n) => n > 0);
    if (slots.length === 0) return 10;
    return Math.max(...slots);
}

/** Paid packages that allow more client profiles than the current plan maximum. */
export function upgradeMatchmakerPackages(
    packages: PublicMatrimonialPackage[],
    currentMax: number,
): PublicMatrimonialPackage[] {
    return paidMatchmakerPackages(packages)
        .filter((p) => packageMaxManagedAccounts(p) > currentMax)
        .sort((a, b) => packageMaxManagedAccounts(a) - packageMaxManagedAccounts(b));
}

export function resolveMatchmakerClientLimitState(input: {
    clientsUsed: number;
    clientsMax: number;
    matchmakerTier?: string | null;
    matchmakerPackages: PublicMatrimonialPackage[];
}): MatchmakerClientLimitState {
    const { clientsUsed, clientsMax, matchmakerTier, matchmakerPackages } = input;
    const isPaid = isMatchmakerPaidTier(matchmakerTier);

    if (clientsMax > 0 && clientsUsed < clientsMax) {
        return 'can_create';
    }

    if (!isPaid || clientsMax <= 0) {
        return 'needs_plan';
    }

    if (clientsUsed >= clientsMax) {
        if (upgradeMatchmakerPackages(matchmakerPackages, clientsMax).length > 0) {
            return 'upgrade_for_more';
        }
        const platformMax = platformMaxMatchmakerClients(matchmakerPackages);
        if (clientsMax >= platformMax) {
            return 'absolute_max';
        }
        // At capacity on current tier but platform allows higher — show upgrade (e.g. while packages load).
        return 'upgrade_for_more';
    }

    return 'can_create';
}
