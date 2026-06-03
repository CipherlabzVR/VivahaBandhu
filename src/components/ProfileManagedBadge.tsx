import MatchmakerBadge from './MatchmakerBadge';
import ManagedProfileBadge from './ManagedProfileBadge';

type ProfileLike = Record<string, unknown>;

export function profileIsMatchmakerManaged(p: ProfileLike): boolean {
    return !!(p.isMatchmakerManaged || p.IsMatchmakerManaged);
}

export function profileIsFamilyManaged(p: ProfileLike): boolean {
    return !!(p.isFamilyManaged || p.IsFamilyManaged);
}

export function profileHasManagedBadge(p: ProfileLike): boolean {
    return profileIsMatchmakerManaged(p) || profileIsFamilyManaged(p);
}

export default function ProfileManagedBadge({
    profile,
    variant = 'compact',
}: {
    profile: ProfileLike;
    variant?: 'compact' | 'full';
}) {
    if (profileIsMatchmakerManaged(profile)) {
        return (
            <MatchmakerBadge
                matchmakerName={String(profile.matchmakerName ?? profile.MatchmakerName ?? '')}
                variant={variant}
            />
        );
    }
    if (profileIsFamilyManaged(profile)) {
        return (
            <ManagedProfileBadge
                managedByLabel={String(profile.managedByLabel ?? profile.ManagedByLabel ?? 'Managed by parent')}
                managerName={String(profile.managerName ?? profile.ManagerName ?? '')}
                variant={variant}
            />
        );
    }
    return null;
}
