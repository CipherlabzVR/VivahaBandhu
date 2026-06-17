/** Matrimonial profile card / modal user id (never confuse profile row pk with user id when UserId is present). */
export function matrimonialProfileUserId(
    p: Record<string, unknown> | null | undefined
): number | null {
    if (!p || typeof p !== 'object') return null;
    const userRaw = (p as { userId?: unknown; UserId?: unknown }).userId ?? (p as { UserId?: unknown }).UserId;
    if (userRaw != null && userRaw !== '') {
        const n = Number(userRaw);
        if (Number.isFinite(n) && n > 0) return n;
    }
    const profilePk = (p as { profileId?: unknown; ProfileId?: unknown }).profileId
        ?? (p as { ProfileId?: unknown }).ProfileId;
    const idRaw = (p as { id?: unknown; Id?: unknown }).id ?? (p as { Id?: unknown }).Id;
    if (idRaw == null || idRaw === '') return null;
    const idN = Number(idRaw);
    if (!Number.isFinite(idN) || idN <= 0) return null;
    if (
        profilePk != null
        && profilePk !== ''
        && Number(profilePk) === idN
        && userRaw == null
    ) {
        return null;
    }
    return idN;
}

export function isOwnMatrimonialProfile(
    viewer: { id?: string | number } | null | undefined,
    profile: Record<string, unknown> | null | undefined
): boolean {
    if (!viewer?.id) return false;
    const profileUserId = matrimonialProfileUserId(profile);
    return profileUserId != null && String(viewer.id) === String(profileUserId);
}

/** Block express interest / message / shortlist on own profile or profiles you manage. */
export function shouldBlockProfileVisitorActions(
    viewer: { id?: string | number } | null | undefined,
    profile: Record<string, unknown> | null | undefined,
    ownedProfileIds: ReadonlySet<number> | readonly number[]
): boolean {
    if (!profile) return false;
    if (profile.disableVisitorActions === true || profile.DisableVisitorActions === true) return true;
    const profileUserId = matrimonialProfileUserId(profile);
    if (profileUserId == null) return false;
    const owned =
        ownedProfileIds instanceof Set ? ownedProfileIds : new Set(ownedProfileIds);
    if (owned.has(profileUserId)) return true;
    return isOwnMatrimonialProfile(viewer, profile);
}

export function prepareProfileModalPayload(
    viewer: { id?: string | number } | null | undefined,
    profile: Record<string, unknown>,
    ownedProfileIds: ReadonlySet<number> | readonly number[]
): Record<string, unknown> {
    const userId = matrimonialProfileUserId(profile) ?? profile.userId ?? profile.UserId;
    const normalized = {
        ...profile,
        ...(userId != null ? { userId, id: userId } : {}),
    };
    if (!shouldBlockProfileVisitorActions(viewer, normalized, ownedProfileIds)) {
        return normalized;
    }
    return {
        ...normalized,
        disableVisitorActions: true,
    };
}

/** Toast hint when visitor actions are blocked (own profile or managed sub-account preview). */
export function profileVisitorActionsBlockedHint(
    viewer: { id?: string | number } | null | undefined,
    profile: Record<string, unknown> | null | undefined,
    ownedProfileIds: ReadonlySet<number> | readonly number[]
): string | null {
    if (!shouldBlockProfileVisitorActions(viewer, profile, ownedProfileIds)) return null;
    if (isOwnMatrimonialProfile(viewer, profile)) {
        if (profile?.viewAsOthers) {
            return 'Public preview of your profile — messaging and interest are not available here.';
        }
        return 'This is your profile — messaging and interest are not available here.';
    }
    return 'Managed profile preview — messaging and interest are not available here.';
}
