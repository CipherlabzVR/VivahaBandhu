import MatchmakerBadge from './MatchmakerBadge';
import ManagedProfileBadge from './ManagedProfileBadge';

type ProfileLike = Record<string, unknown>;

export function profileIsMatchmakerManaged(p: ProfileLike): boolean {
    return !!(p.isMatchmakerManaged || p.IsMatchmakerManaged);
}

export function profileIsFamilyManaged(p: ProfileLike): boolean {
    if (profileIsMatchmakerManaged(p)) return false;
    if (p.isFamilyManaged || p.IsFamilyManaged) return true;
    const type = String(p.managedByType ?? p.ManagedByType ?? p.accountType ?? p.AccountType ?? p.postedBy ?? p.PostedBy ?? '').trim().toLowerCase();
    const label = String(p.managedByLabel ?? p.ManagedByLabel ?? '').trim().toLowerCase();
    return type === 'parent' || type === 'parents' || type === 'relation' || label.includes('parent') || label.includes('relation');
}

export function profileIsSelf(p: ProfileLike): boolean {
    if (profileIsMatchmakerManaged(p) || profileIsFamilyManaged(p)) return false;
    return true;
}

export function profileHasManagedBadge(p: ProfileLike): boolean {
    return profileIsMatchmakerManaged(p) || profileIsFamilyManaged(p) || profileIsSelf(p);
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
                managedByLabel={String(profile.managedByLabel ?? profile.ManagedByLabel ?? '')}
                managedByType={String(profile.managedByType ?? profile.ManagedByType ?? profile.accountType ?? profile.AccountType ?? '')}
                variant={variant}
            />
        );
    }
    return (
        <ManagedProfileBadge
            managedByLabel={String(profile.managedByLabel ?? profile.ManagedByLabel ?? 'Self')}
            managedByType={String(profile.managedByType ?? profile.ManagedByType ?? profile.accountType ?? profile.AccountType ?? 'Self')}
            variant={variant}
        />
    );
}
