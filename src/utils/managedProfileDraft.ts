const DRAFT_VERSION = 1;

export type ManagedBasicDraft = {
    firstName: string;
    lastName: string;
    nic: string;
    dob: string;
    gender: string;
    phone: string;
    whatsapp: string;
    profilePhotoBase64: string;
};

export type ManagedProfileDraft = {
    version: typeof DRAFT_VERSION;
    savedAt: string;
    step: number;
    managedBasic: ManagedBasicDraft;
    managedPhotoPreview: string;
    formData: Record<string, string>;
};

export function managedProfileDraftStorageKey(parentUserId: number): string {
    return `mymatch_managed_profile_draft_${parentUserId}`;
}

function managedProfileDraftSkipKey(parentUserId: number): string {
    return `mymatch_managed_profile_skip_draft_${parentUserId}`;
}

export function loadManagedProfileDraft(parentUserId: number): ManagedProfileDraft | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(managedProfileDraftStorageKey(parentUserId));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ManagedProfileDraft;
        if (parsed?.version !== DRAFT_VERSION) return null;
        if (!parsed.managedBasic || !parsed.formData) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function saveManagedProfileDraft(
    parentUserId: number,
    draft: Pick<ManagedProfileDraft, 'step' | 'managedBasic' | 'managedPhotoPreview' | 'formData'>,
): void {
    if (typeof window === 'undefined') return;
    if (isManagedProfileDraftPersistBlocked(parentUserId)) return;
    if (!managedProfileDraftHasContent({
        version: DRAFT_VERSION,
        savedAt: '',
        step: draft.step,
        managedBasic: draft.managedBasic,
        managedPhotoPreview: draft.managedPhotoPreview,
        formData: draft.formData,
    })) {
        return;
    }
    try {
        const payload: ManagedProfileDraft = {
            version: DRAFT_VERSION,
            savedAt: new Date().toISOString(),
            ...draft,
        };
        localStorage.setItem(managedProfileDraftStorageKey(parentUserId), JSON.stringify(payload));
    } catch (err) {
        console.warn('Failed to save managed profile draft', err);
    }
}

export function clearManagedProfileDraft(parentUserId: number): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(managedProfileDraftStorageKey(parentUserId));
}

/** Call after a managed profile is successfully created — blocks re-save and restore of the old draft. */
export function markManagedProfileDraftCompleted(parentUserId: number): void {
    if (typeof window === 'undefined') return;
    clearManagedProfileDraft(parentUserId);
    sessionStorage.setItem(managedProfileDraftSkipKey(parentUserId), '1');
}

export function isManagedProfileDraftPersistBlocked(parentUserId: number): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(managedProfileDraftSkipKey(parentUserId)) === '1';
}

/**
 * Returns true when a saved draft may be restored. After a successful create, consumes the skip
 * flag and clears any leftover draft so the next form opens empty.
 */
export function shouldRestoreManagedProfileDraft(parentUserId: number): boolean {
    if (typeof window === 'undefined') return true;
    if (sessionStorage.getItem(managedProfileDraftSkipKey(parentUserId)) !== '1') {
        return true;
    }
    sessionStorage.removeItem(managedProfileDraftSkipKey(parentUserId));
    clearManagedProfileDraft(parentUserId);
    return false;
}

export function managedProfileDraftHasContent(draft: ManagedProfileDraft): boolean {
    const basic = draft.managedBasic;
    if (
        basic.firstName.trim() ||
        basic.lastName.trim() ||
        basic.nic.trim() ||
        basic.phone.trim() ||
        basic.whatsapp.trim()
    ) {
        return true;
    }
    return Object.values(draft.formData).some((value) => typeof value === 'string' && value.trim().length > 0);
}

export function isManagedProfileCreateResponseSuccess(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const record = data as Record<string, unknown>;
    const code = record.statusCode ?? record.StatusCode;
    if (code === 200 || code === 1) return true;
    if (code === '200' || code === 'SUCCESS' || code === 'Success') return true;
    return false;
}
