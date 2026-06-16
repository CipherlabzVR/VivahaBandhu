'use client';

import { useEffect, useState, Suspense, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ManagedSubAccountActivityCard from '../../components/ManagedSubAccountActivityCard';
import SubAccountPackagePickerModal from '../../components/SubAccountPackagePickerModal';
import MatchmakerUpgradePackageModal from '../../components/MatchmakerUpgradePackageModal';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Modals from '../../components/Modals';
import { matrimonialService } from '../../services/matrimonialService';
import { sanitizeNicInput, nicOrPassportFormatError, NIC_PASSPORT_HINT, parseNicToDobAndGender } from '../../utils/nicInput';
import { sanitizeNameInput } from '../../utils/nameInput';
import { sanitizeSriLankanPhoneInput, sriLankanPhoneFormatErrorIfInvalid, canonicalSriLankanPhoneDigits } from '../../utils/sriLankanPhone';
import { getStoredToken } from '../../utils/authStorage';
import { showToast } from '../../utils/toast';
import {
    isMatchmakerPaidTier,
    PREMIUM_SUBSCRIPTION_LKR,
    CHECKOUT_PLAN_SUB_ACCOUNT,
    formatMatchmakerTierName,
    profilePlanBadgeLabel,
} from '../../constants/subscription';
import { PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY, SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE } from '../../constants/premiumActivation';
import { AUTH_FIELD_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../../constants/inputLimits';
import HoroscopeLightbox from '../../components/HoroscopeLightbox';
import { PasswordVisibilityToggle, modalPasswordToggleStyle } from '../../components/PasswordVisibilityToggle';
import { isManagedSubAccount } from '../../utils/managedSubAccount';
import { markManagedProfileDraftCompleted } from '../../utils/managedProfileDraft';
import {
    isBasicProfileOnlyAccountType,
    isFamilyParentAccountType,
    isRelationAccountType,
    displayMatrimonialAccountType,
} from '../../utils/matrimonialAccountTypes';
import ClientProfileBadge from '../../components/ClientProfileBadge';
import {
    isInterestBackNotification,
    managedProfileUserIdFromNotification,
    referenceIdFromNotification,
} from '../../utils/matrimonialInterestNotifications';
import {
    canManageSubAccounts,
    parseSubAccountsApiResult,
    shouldShowManagedProfileTabs,
    subAccountDisplayName,
    type ManagedSubAccount,
    type ManagedSubAccountDetail,
} from '../../utils/managedSubAccounts';
import { useMatrimonialNotifications } from '../../context/MatrimonialNotificationsContext';
import { apiInstantToMs, formatDeviceDateTime } from '../../utils/deviceDateTime';
import { formatSubscriptionTimeRemaining, parseSubscriptionRemaining } from '../../utils/subscriptionExpiry';
import { packagePrice, resolveCheckoutPlan, type PublicMatrimonialPackage } from '../../utils/matrimonialPackages';
import {
    paidMatchmakerPackages,
    platformMaxMatchmakerClients,
    resolveMatchmakerClientLimitState,
    upgradeMatchmakerPackages,
    type MatchmakerClientLimitState,
} from '../../utils/matchmakerClientLimits';

import ProfileCompletionForm from './ProfileCompletionForm';
import { usePendingBankPremiumApproval } from '../../hooks/usePendingBankPremiumApproval';

/** Matches .NET ApiResponse: property is PascalCase (`StatusCode`) unless server uses camelCase policy. */
function apiResponseBusinessCode(body: Record<string, unknown> | null | undefined): number | undefined {
    if (!body) return undefined;
    const raw = body.statusCode ?? body.StatusCode;
    return typeof raw === 'number' ? raw : undefined;
}

/** Treat missing body status as OK when HTTP succeeded (backward compatible). */
function apiResponseIndicatesSuccess(body: Record<string, unknown> | null | undefined, httpOk: boolean): boolean {
    if (!httpOk) return false;
    const code = apiResponseBusinessCode(body);
    if (code === undefined) return true;
    return code === 200 || code === 1;
}

function interactionProfileId(p: { userId?: number; id?: number; requestedId?: number }): number {
    return Number(p.userId ?? p.id ?? p.requestedId);
}

function ProfileListRemoveButton({
    ariaLabel,
    removing,
    onRemove,
}: {
    ariaLabel: string;
    removing: boolean;
    onRemove: (e: React.MouseEvent) => void;
}) {
    return (
        <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            aria-label={ariaLabel}
            style={{
                flexShrink: 0,
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#b45309',
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                cursor: removing ? 'wait' : 'pointer',
                opacity: removing ? 0.7 : 1,
            }}
        >
            {removing ? '…' : 'Remove'}
        </button>
    );
}

function ManagedSubAccountTabBar({
    tabs,
    activeId,
    onSelect,
    countBySub,
    accountType,
}: {
    tabs: ManagedSubAccount[];
    activeId: number | null;
    onSelect: (subId: number) => void;
    countBySub?: Record<number, number>;
    accountType?: string | null;
}) {
    if (tabs.length < 2) return null;

    return (
        <div
            style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                marginTop: '1rem',
                paddingBottom: '0.25rem',
            }}
        >
            {tabs.map((sub) => {
                const isActive = activeId === sub.id;
                const badgeCount = countBySub?.[sub.id] ?? 0;
                const name = subAccountDisplayName(sub);
                return (
                    <button
                        key={sub.id}
                        type="button"
                        onClick={() => onSelect(sub.id)}
                        title={name}
                        style={{
                            position: 'relative',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            minWidth: '76px',
                            padding: '0.5rem',
                            borderRadius: '12px',
                            border: isActive ? '1px solid rgba(255,162,13,0.45)' : '1px solid #eee',
                            background: isActive ? '#fff8ed' : '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <div
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: isActive ? '2px solid var(--primary, #ffa20d)' : '2px solid #fff',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                }}
                            >
                                {sub.profilePhoto ? (
                                    <img src={sub.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#999', fontWeight: 700, fontSize: '0.85rem' }}>
                                        {(sub.firstName?.[0] || '?')}{(sub.lastName?.[0] || '')}
                                    </div>
                                )}
                            </div>
                            {badgeCount > 0 && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        minWidth: '18px',
                                        height: '18px',
                                        padding: '0 4px',
                                        borderRadius: '999px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                            )}
                            {accountType === 'Matchmaker' && badgeCount <= 0 && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: '-2px',
                                        right: '-2px',
                                        width: '16px',
                                        height: '16px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                        border: '2px solid #fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                    title="Client profile"
                                    aria-hidden
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width={8}
                                        height={8}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#92400e"
                                        strokeWidth={2.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
                                    </svg>
                                </span>
                            )}
                        </div>
                        <span
                            style={{
                                fontSize: '0.68rem',
                                lineHeight: 1.2,
                                textAlign: 'center',
                                color: isActive ? 'var(--primary, #ffa20d)' : '#666',
                                fontWeight: isActive ? 600 : 500,
                                maxWidth: '72px',
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                            }}
                        >
                            {sub.firstName || name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function formatManagedSubSubscriptionLine(
    sub: {
        isSubscribed?: boolean;
        subscriptionIsLifetime?: boolean;
        subscriptionExpiresAt?: string;
        subscriptionUntilUtc?: string;
    },
    labels: {
        lifetime: string;
        active: string;
        inactive: string;
        expired: string;
        oneDay: string;
        days: (n: number) => string;
        hours: (n: number) => string;
        today: string;
        endsOn: (date: string) => string;
    },
    locale?: string,
): string {
    const iso = sub.subscriptionExpiresAt ?? sub.subscriptionUntilUtc;
    if (sub.subscriptionIsLifetime && sub.isSubscribed) {
        return labels.lifetime;
    }
    if (sub.isSubscribed && iso) {
        const remaining = formatSubscriptionTimeRemaining(iso, labels, locale);
        if (remaining) {
            return remaining.secondary
                ? `${remaining.primary} · ${remaining.secondary}`
                : remaining.primary;
        }
    }
    if (sub.isSubscribed) return labels.active;
    return labels.inactive;
}

function ProfilePageContent() {
    const { user, loading, updateUser, logout } = useAuth();
    const managedCreateConfig = useMemo(
        () => (user?.id ? { parentUserId: Number(user.id) } : undefined),
        [user?.id],
    );
    const bankPremiumAwaitingApproval = usePendingBankPremiumApproval(user?.isSubscribed);
    const { liveInterestRevision } = useMatrimonialNotifications();
    const { language, setLanguage, t } = useLanguage();

    const subscriptionRemainingInfo = user?.subscriptionExpiresAt
        ? parseSubscriptionRemaining(user.subscriptionExpiresAt)
        : null;

    const subscriptionRemainingDisplay =
        user?.isSubscribed && user.subscriptionIsLifetime
            ? { primary: t('subscriptionLifetime'), secondary: '' }
            : user?.isSubscribed && user.subscriptionExpiresAt
              ? formatSubscriptionTimeRemaining(
                    user.subscriptionExpiresAt,
                    {
                        expired: t('subscriptionTimeExpired'),
                        oneDay: t('subscriptionOneDayRemaining'),
                        days: (n) => t('subscriptionDaysRemaining').replace('{n}', String(n)),
                        hours: (n) => t('subscriptionHoursRemaining').replace('{n}', String(n)),
                        today: t('subscriptionExpiresToday'),
                        endsOn: (date) => t('subscriptionEndsOn').replace('{date}', date),
                    },
                    language === 'si' ? 'si-LK' : undefined
                )
              : null;

    const subscriptionPeriodLabel =
        user?.accountType === 'Matchmaker'
            ? t('subscriptionBillingPeriodMatchmaker')
            : t('subscriptionBillingPeriodSelf');
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [profileCompleted, setProfileCompleted] = useState(false);
    const [profileFetched, setProfileFetched] = useState(false);
    const pendingPrivacyPrefsRef = useRef<{
        showInBrowse?: boolean;
        photoVisibility?: 'everyone' | 'premium';
    } | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user?.id && !profileFetched) {
            checkProfileCompletion();
        }
    // Only react to user.id changes, not every user property change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, loading, profileFetched]);

    const checkProfileCompletion = async () => {
        try {
            setProfileFetched(true);
            const token = getStoredToken();
            if (!user?.id || !token) return;

            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
            const withCacheBuster = (url: string) => {
                const cb = `cb=${Date.now()}`;
                return url.includes('?') ? `${url}&${cb}` : `${url}?${cb}`;
            };

            const toDateOnly = (val: string | undefined | null): string => {
                if (!val) return '';
                const leadingDate = val.match(/^(\d{4}-\d{2}-\d{2})/);
                if (leadingDate) return leadingDate[1];
                try {
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return '';
                    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                } catch { return ''; }
            };

            // Fetch both profile data and user details in parallel
            const [profileResponse, userResponse] = await Promise.all([
                fetch(`${apiBase}/Matrimonial/GetProfile?userId=${user.id}&requesterUserId=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiBase}/User/GetUserDetailByEmail?email=${encodeURIComponent(user.email)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).catch(() => null)
            ]);

            const profileUpdates: any = {};

            // Process user details (AppUser data - has NIC, WhatsApp, Phone, DOB)
            if (userResponse && userResponse.ok) {
                const userData = await userResponse.json();
                const u = userData.result || userData;
                if (u) {
                    if (u.identityDocument) {
                        profileUpdates.nic = u.identityDocument;
                    }
                    if (u.phoneNumber) {
                        profileUpdates.phone = u.phoneNumber;
                    }
                    if (u.address && typeof u.address === 'string') {
                        // Address is a metadata blob written by the backend in the form
                        //   KEY:value;KEY2:value2;...
                        // Old code used `substring('WHATSAPP:'.length)` which leaked the
                        // ";VERIFIED_BY:WhatsApp" tail into the displayed number.
                        // Parse the segments and pull just the WHATSAPP digits.
                        const segments = u.address.split(';');
                        for (const seg of segments) {
                            const idx = seg.indexOf(':');
                            if (idx <= 0) continue;
                            const key = seg.substring(0, idx).trim().toUpperCase();
                            const val = seg.substring(idx + 1).trim();
                            if (key === 'WHATSAPP' && val) {
                                profileUpdates.whatsapp = val.replace(/\D+/g, '');
                                break;
                            }
                        }
                    }
                    if (u.dateofBirth || u.dateOfBirth) {
                        profileUpdates.dob = toDateOnly(u.dateofBirth || u.dateOfBirth);
                    }
                    if (u.profilePhoto && u.profilePhoto.length > 0) {
                        profileUpdates.profilePhoto = u.profilePhoto;
                    }
                    if (u.status !== undefined) {
                        profileUpdates.isVerified = u.status === 1;
                    }
                    if (u.userRoleName && u.userRoleName.length > 0) {
                        profileUpdates.accountType = u.userRoleName;
                    }
                    const rawParent = u.parentUserId ?? u.ParentUserId;
                    if (rawParent != null && rawParent !== '') {
                        const pid = typeof rawParent === 'number' ? rawParent : Number(rawParent);
                        if (Number.isFinite(pid) && pid > 0) {
                            profileUpdates.parentUserId = pid;
                        }
                    }
                }
            }

            // Process matrimonial profile data (has gender, religion, etc.)
            if (profileResponse.ok) {
                const data = await profileResponse.json();
                if (data.result) {
                    const r = data.result;

                    const rStatus = r.status ?? r.Status;
                    if (rStatus !== undefined && profileUpdates.isVerified === undefined) {
                        profileUpdates.isVerified = rStatus === 1;
                    }
                    
                    const profilePhoto = r.profilePhoto || r.ProfilePhoto;
                    if (!profileUpdates.profilePhoto && !user?.profilePhoto && profilePhoto && profilePhoto.length > 0) {
                        profileUpdates.profilePhoto = withCacheBuster(profilePhoto);
                    }
                    
                    const gender = r.gender || r.Gender;
                    if (gender && gender.length > 0) {
                        profileUpdates.gender = gender;
                    }
                    
                    const dob = r.dateOfBirth || r.DateOfBirth || r.dateofBirth;
                    if (dob && !profileUpdates.dob) {
                        profileUpdates.dob = toDateOnly(dob);
                    }

                    const whatsapp = r.whatsApp || r.WhatsApp || r.whatsapp;
                    if (whatsapp && whatsapp.length > 0 && !profileUpdates.whatsapp) {
                        // Strip any accidental metadata tail (e.g. ";VERIFIED_BY:WhatsApp")
                        // that may have leaked from older serialised values.
                        const head = String(whatsapp).split(';')[0] ?? '';
                        const digits = head.replace(/\D+/g, '');
                        profileUpdates.whatsapp = digits || String(whatsapp);
                    }

                    const nic = r.nic || r.Nic || r.identityDocument;
                    if (nic && nic.length > 0 && !profileUpdates.nic) {
                        profileUpdates.nic = nic;
                    }
                    
                    const phone = r.phoneNumber || r.PhoneNumber;
                    if (phone && phone.length > 0 && !profileUpdates.phone) {
                        profileUpdates.phone = phone;
                    }
                    
                    const accountType = r.accountType || r.AccountType;
                    if (accountType && accountType.length > 0 && !profileUpdates.accountType) {
                        profileUpdates.accountType = accountType;
                    }
                    
                    const horoscopeDocument = r.horoscopeDocument || r.HoroscopeDocument;
                    if (horoscopeDocument && horoscopeDocument.length > 0) {
                        profileUpdates.horoscopeDocument = withCacheBuster(horoscopeDocument);
                    }
                    const horoscopeDocument2 = r.horoscopeDocument2 || r.HoroscopeDocument2;
                    if (horoscopeDocument2 && horoscopeDocument2.length > 0) {
                        profileUpdates.horoscopeDocument2 = withCacheBuster(horoscopeDocument2);
                    }
                    const horoscopeDocument3 = r.horoscopeDocument3 || r.HoroscopeDocument3;
                    if (horoscopeDocument3 && horoscopeDocument3.length > 0) {
                        profileUpdates.horoscopeDocument3 = withCacheBuster(horoscopeDocument3);
                    }

                    const subscribed = r.isSubscribed ?? r.IsSubscribed ?? false;
                    profileUpdates.isSubscribed = subscribed;

                    const subUntil =
                        r.subscriptionUntilUtc ??
                        r.SubscriptionUntilUtc ??
                        r.selfPremiumSubscriptionUntilUtc ??
                        r.SelfPremiumSubscriptionUntilUtc ??
                        r.matchmakerSubscriptionUntilUtc ??
                        r.MatchmakerSubscriptionUntilUtc;
                    const subLifetime =
                        r.subscriptionIsLifetime ?? r.SubscriptionIsLifetime ?? false;
                    profileUpdates.subscriptionIsLifetime = !!subLifetime;
                    const subCancelled =
                        r.subscriptionCancelled ?? r.SubscriptionCancelled;
                    if (subCancelled !== undefined && subCancelled !== null) {
                        profileUpdates.subscriptionCancelled = !!subCancelled;
                    }
                    if (subLifetime) {
                        profileUpdates.subscriptionExpiresAt = undefined;
                    } else if (subUntil != null && String(subUntil).trim() !== '') {
                        const exp = new Date(String(subUntil));
                        if (!Number.isNaN(exp.getTime())) {
                            profileUpdates.subscriptionExpiresAt = exp.toISOString();
                        }
                    } else if (!subscribed) {
                        profileUpdates.subscriptionExpiresAt = undefined;
                        profileUpdates.subscriptionIsLifetime = false;
                    }

                    const vwTier = r.viewerMatchmakerTier ?? r.ViewerMatchmakerTier;
                    if (vwTier != null && String(vwTier).trim() !== '') {
                        profileUpdates.matchmakerTier = String(vwTier);
                    }
                    const mpc = r.matchmakerPlanMaxClients ?? r.MatchmakerPlanMaxClients;
                    const mcc = r.matchmakerManagedClientCount ?? r.MatchmakerManagedClientCount;
                    if (mpc !== undefined && mpc !== null && String(mpc).trim() !== '') {
                        profileUpdates.matchmakerMaxClientProfiles = Number(mpc);
                    }
                    if (mcc !== undefined && mcc !== null && String(mcc).trim() !== '') {
                        profileUpdates.matchmakerClientProfileCount = Number(mcc);
                    }
                    const acctMm = ((profileUpdates.accountType || user?.accountType || '') === 'Matchmaker');
                    if (acctMm) {
                        const tierStr = profileUpdates.matchmakerTier ?? user?.matchmakerTier;
                        const maxSlots = Number(profileUpdates.matchmakerMaxClientProfiles ?? user?.matchmakerMaxClientProfiles ?? NaN);
                        const usedSlots = Number(profileUpdates.matchmakerClientProfileCount ?? NaN);
                        if (Number.isFinite(maxSlots) && maxSlots > 0 && Number.isFinite(usedSlots)) {
                            profileUpdates.matchmakerCanAddClients =
                                isMatchmakerPaidTier(tierStr) && usedSlots < maxSlots;
                        }
                    }

                    // Notification preference (server-authoritative). Defaults to true
                    // when missing so existing users keep getting interest emails.
                    const emailOnInterest = r.emailOnInterest ?? r.EmailOnInterest;
                    if (emailOnInterest !== undefined && emailOnInterest !== null) {
                        profileUpdates.emailOnInterest = !!emailOnInterest;
                    }

                    const showContact =
                        r.showContactInformation ?? r.ShowContactInformation;
                    if (showContact !== undefined && showContact !== null) {
                        profileUpdates.showContactInformation = !!showContact;
                    }

                    const showInBrowse = r.showInBrowse ?? r.ShowInBrowse;
                    const photoVis = r.photoVisibility ?? r.PhotoVisibility;
                    if (
                        (showInBrowse !== undefined && showInBrowse !== null)
                        || (photoVis !== undefined && photoVis !== null && String(photoVis).trim() !== '')
                    ) {
                        pendingPrivacyPrefsRef.current = {
                            ...(showInBrowse !== undefined && showInBrowse !== null
                                ? { showInBrowse: !!showInBrowse }
                                : {}),
                            ...(photoVis !== undefined && photoVis !== null && String(photoVis).trim() !== ''
                                ? {
                                    photoVisibility: String(photoVis).toLowerCase() === 'premium'
                                        ? 'premium'
                                        : 'everyone',
                                }
                                : {}),
                        };
                    }

                    const famPurchased = r.familySubAccountSlotsPurchased ?? r.FamilySubAccountSlotsPurchased;
                    const famConsumed = r.familySubAccountSlotsConsumed ?? r.FamilySubAccountSlotsConsumed;
                    const famPrice = r.familySubAccountAdditionalAmountLkr ?? r.FamilySubAccountAdditionalAmountLkr;
                    const famValidity = r.familySubAccountPackageValidityMonths ?? r.FamilySubAccountPackageValidityMonths;
                    if (famPurchased != null && famPurchased !== '') {
                        profileUpdates.familySubAccountSlotsPurchased = Number(famPurchased);
                    }
                    if (famConsumed != null && famConsumed !== '') {
                        profileUpdates.familySubAccountSlotsConsumed = Number(famConsumed);
                    }
                    if (famPrice != null && famPrice !== '') {
                        profileUpdates.familySubAccountAdditionalAmountLkr = Number(famPrice);
                    }
                    if (famValidity != null && famValidity !== '') {
                        profileUpdates.familySubAccountPackageValidityMonths = Number(famValidity);
                    }
                    
                    // Update user context with all available data
                    if (Object.keys(profileUpdates).length > 0) {
                        updateUser(profileUpdates);
                    }
                    
                    const profileGender = r.gender || r.Gender || '';
                    const profileReligion = r.religion || r.Religion || '';
                    const profileStatus = r.status ?? r.Status;

                    const effectiveAccountType = profileUpdates.accountType || user?.accountType || '';
                    const isMatchmakerAccount = effectiveAccountType === 'Matchmaker';
                    const basicProfileOnly = isBasicProfileOnlyAccountType(effectiveAccountType);
                    const mergedParentUserId = profileUpdates.parentUserId ?? user?.parentUserId;
                    const managedChildProfile = isManagedSubAccount({ parentUserId: mergedParentUserId });

                    if (isMatchmakerAccount || basicProfileOnly) {
                        // Matchmakers and Parents manage sub-accounts; they don't need a detailed profile.
                        setProfileCompleted(true);
                    } else if (managedChildProfile) {
                        // Sub-account under a Self parent: basic signup only — no detailed wizard.
                        setProfileCompleted(true);
                    } else if (profileStatus === 0) {
                        setProfileCompleted(false);
                    } else if (profileGender.length > 0 && profileReligion.length > 0) {
                        setProfileCompleted(true);
                    } else {
                        setProfileCompleted(false);
                        setIsCompletionModalOpen(true);
                    }
                } else {
                    // Profile data exists but result is null - update with user data only
                    if (Object.keys(profileUpdates).length > 0) {
                        updateUser(profileUpdates);
                    }
                    if (isManagedSubAccount({ parentUserId: profileUpdates.parentUserId ?? user?.parentUserId })) {
                        setProfileCompleted(true);
                    }
                }
            } else {
                // Profile not found - still apply user data updates
                if (Object.keys(profileUpdates).length > 0) {
                    updateUser(profileUpdates);
                }
                const effectiveAccountType2 = profileUpdates.accountType || user?.accountType || '';
                const isMatchmakerAccount = effectiveAccountType2 === 'Matchmaker';
                const basicProfileOnly = isBasicProfileOnlyAccountType(effectiveAccountType2);
                const managedOnlyUser = isManagedSubAccount({
                    parentUserId: profileUpdates.parentUserId ?? user?.parentUserId,
                });
                if (isMatchmakerAccount || basicProfileOnly) {
                    setProfileCompleted(true);
                } else if (managedOnlyUser) {
                    setProfileCompleted(true);
                } else {
                    setProfileCompleted(false);
                    if (user?.isVerified !== false) {
                        setIsCompletionModalOpen(true);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to check profile", error);
        }
    };

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify', blogId?: number, profile?: any) => {
        setActiveModal(modal);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
        if (modal === 'profile' && profile) setSelectedProfile(profile);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
        setSelectedProfile(null);
    };

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    /** Canonical 94… digits for the phone saved when Edit Basic Details was opened; used to require OTP when the number changes. */
    const [editModalPhoneBaselineCanonical, setEditModalPhoneBaselineCanonical] = useState('');
    const [phoneChangeCode, setPhoneChangeCode] = useState('');
    const [phoneChangeBusy, setPhoneChangeBusy] = useState<'send' | 'confirm' | null>(null);
    /** After successful ConfirmPhoneChange, canonical digits that are allowed without re-verify until the field changes again. */
    const [phoneVerifiedCanonical, setPhoneVerifiedCanonical] = useState<string | null>(null);
    /** URL for HoroscopeLightbox — primary or secondary document. */
    const [horoscopeViewSrc, setHoroscopeViewSrc] = useState<string | null>(null);
    const profileCompletionModalScrollRef = useRef<HTMLDivElement>(null);
    const managedProfileModalScrollRef = useRef<HTMLDivElement>(null);
    const managedProfileEditModalScrollRef = useRef<HTMLDivElement>(null);
    const interestedInYouSectionRef = useRef<HTMLDivElement>(null);

    const [subAccounts, setSubAccounts] = useState<ManagedSubAccountDetail[]>([]);
    const [managedSubActivity, setManagedSubActivity] = useState<any[]>([]);
    const [savedProfiles, setSavedProfiles] = useState<any[]>([]);
    const [interestProfiles, setInterestProfiles] = useState<any[]>([]);
    /** Members who expressed interest in the current user (from interest notifications). */
    const [incomingInterestProfiles, setIncomingInterestProfiles] = useState<any[]>([]);
    const [activeInterestSubAccountId, setActiveInterestSubAccountId] = useState<number | null>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loadingSavedProfiles, setLoadingSavedProfiles] = useState(false);
    const [removingInteractionKey, setRemovingInteractionKey] = useState<string | null>(null);
    const [isCreateSubAccountModalOpen, setIsCreateSubAccountModalOpen] = useState(false);
    const [managedProfileFormSession, setManagedProfileFormSession] = useState(0);
    const [editingSubAccount, setEditingSubAccount] = useState<{ id: number; firstName?: string; lastName?: string } | null>(null);
    const [managedEditFormSession, setManagedEditFormSession] = useState(0);
    const [subAccountForm, setSubAccountForm] = useState({
        firstName: '',
        lastName: '',
        nic: '',
        dob: '',
        gender: '',
        phone: '',
        whatsapp: '',
        email: '',
        password: '',
        confirmPassword: '',
        accountType: 'Self'
    });
    const [subAccountError, setSubAccountError] = useState<string | null>(null);
    const [isCreatingSubAccount, setIsCreatingSubAccount] = useState(false);
    // Extended fields for the matchmaker "Add New Profile" experience (mirrors the public register form)
    const [subAccountWhatsAppSame, setSubAccountWhatsAppSame] = useState(true);
    const [subAccountShowPassword, setSubAccountShowPassword] = useState(false);
    const [subAccountShowConfirmPassword, setSubAccountShowConfirmPassword] = useState(false);
    const [subAccountPhotoBase64, setSubAccountPhotoBase64] = useState<string>('');
    const [subAccountPhotoPreview, setSubAccountPhotoPreview] = useState<string>('');
    const [subAccountTermsAccepted, setSubAccountTermsAccepted] = useState(false);
    const [liveSubAccountPackage, setLiveSubAccountPackage] = useState<{ price: number; validityMonths?: number } | null>(null);
    const [subAccountPackages, setSubAccountPackages] = useState<PublicMatrimonialPackage[]>([]);
    const [loadingSubAccountPackages, setLoadingSubAccountPackages] = useState(false);
    const [matchmakerPackages, setMatchmakerPackages] = useState<PublicMatrimonialPackage[]>([]);
    const [loadingMatchmakerPackages, setLoadingMatchmakerPackages] = useState(false);

    /** After Register API returns registrationSessionId, collect OTP — account is created only after VerifyCode. */
    const [subAccountVerifyStep, setSubAccountVerifyStep] = useState(false);
    const [subAccountRegistrationSessionId, setSubAccountRegistrationSessionId] = useState<string | null>(null);
    const [subAccountOtp, setSubAccountOtp] = useState('');
    const [subAccountVerifyBusy, setSubAccountVerifyBusy] = useState(false);
    const [subAccountSendCodeBusy, setSubAccountSendCodeBusy] = useState(false);
    const [subAccountVerificationHint, setSubAccountVerificationHint] = useState<string | null>(null);

    const fetchSubAccounts = useCallback(async () => {
        if (!user?.id) return;
        try {
            const data = await matrimonialService.getSubAccounts(Number(user.id));
            setSubAccounts(parseSubAccountsApiResult(data));
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('sub-accounts-changed'));
            }
        } catch (error) {
            console.error('Failed to fetch sub-accounts', error);
            setSubAccounts([]);
        }
    }, [user?.id]);

    useEffect(() => {
        if (isFamilyParentAccountType(user?.accountType) || user?.accountType === 'Matchmaker') {
            if (user?.id) {
                fetchSubAccounts();
                fetchManagedSubActivity();
            }
        }
    }, [user, fetchSubAccounts]);

    const managedSubAccountTabs = useMemo(
        () => subAccounts as ManagedSubAccount[],
        [subAccounts]
    );

    const showInterestProfileTabs = useMemo(
        () => canManageSubAccounts(user?.accountType) && shouldShowManagedProfileTabs(managedSubAccountTabs),
        [user?.accountType, managedSubAccountTabs]
    );

    const activeInterestSubAccount = useMemo(
        () => managedSubAccountTabs.find((s) => s.id === activeInterestSubAccountId) ?? null,
        [managedSubAccountTabs, activeInterestSubAccountId]
    );

    const interestUnreadBySubAccount = useMemo(() => {
        const map: Record<number, number> = {};
        for (const p of incomingInterestProfiles) {
            const subId = p.managedProfileUserId;
            if (subId == null || !Number.isFinite(Number(subId))) continue;
            const id = Number(subId);
            map[id] = (map[id] ?? 0) + 1;
        }
        return map;
    }, [incomingInterestProfiles]);

    const filteredIncomingInterestProfiles = useMemo(() => {
        if (!showInterestProfileTabs || activeInterestSubAccountId == null) {
            return incomingInterestProfiles;
        }
        return incomingInterestProfiles.filter(
            (p) => Number(p.managedProfileUserId) === activeInterestSubAccountId
        );
    }, [incomingInterestProfiles, showInterestProfileTabs, activeInterestSubAccountId]);

    const filteredSavedProfiles = useMemo(() => {
        if (!showInterestProfileTabs || activeInterestSubAccountId == null) {
            return savedProfiles;
        }
        return savedProfiles.filter(
            (p) => Number(p.managedProfileUserId) === activeInterestSubAccountId
        );
    }, [savedProfiles, showInterestProfileTabs, activeInterestSubAccountId]);

    const filteredInterestProfiles = useMemo(() => {
        if (!showInterestProfileTabs || activeInterestSubAccountId == null) {
            return interestProfiles;
        }
        return interestProfiles.filter(
            (p) => Number(p.managedProfileUserId) === activeInterestSubAccountId
        );
    }, [interestProfiles, showInterestProfileTabs, activeInterestSubAccountId]);

    const savedCountBySubAccount = useMemo(() => {
        const map: Record<number, number> = {};
        for (const p of savedProfiles) {
            const subId = Number(p.managedProfileUserId);
            if (!Number.isFinite(subId) || subId <= 0) continue;
            map[subId] = (map[subId] ?? 0) + 1;
        }
        return map;
    }, [savedProfiles]);

    const interestCountBySubAccount = useMemo(() => {
        const map: Record<number, number> = {};
        for (const p of interestProfiles) {
            const subId = Number(p.managedProfileUserId);
            if (!Number.isFinite(subId) || subId <= 0) continue;
            map[subId] = (map[subId] ?? 0) + 1;
        }
        return map;
    }, [interestProfiles]);

    const interactionCountBySubAccount = useMemo(() => {
        const map: Record<number, number> = { ...savedCountBySubAccount };
        for (const [subId, count] of Object.entries(interestCountBySubAccount)) {
            const id = Number(subId);
            map[id] = (map[id] ?? 0) + count;
        }
        return map;
    }, [savedCountBySubAccount, interestCountBySubAccount]);

    useEffect(() => {
        if (!showInterestProfileTabs || managedSubAccountTabs.length === 0) {
            setActiveInterestSubAccountId(null);
            return;
        }
        setActiveInterestSubAccountId((prev) => {
            if (prev != null && managedSubAccountTabs.some((s) => s.id === prev)) return prev;
            return managedSubAccountTabs[0]?.id ?? null;
        });
    }, [showInterestProfileTabs, managedSubAccountTabs]);

    const formatSubActivityTime = useCallback(
        (v: unknown) => formatDeviceDateTime(v, { dateStyle: 'short', timeStyle: 'short' }),
        []
    );

    const goToSubAccountMessages = useCallback(
        (subUserId: number) => {
            router.push(`/messages?managedProfileUserId=${subUserId}`);
        },
        [router]
    );

    const goToSubAccountInterest = useCallback(
        (subUserId: number) => {
            setActiveInterestSubAccountId(subUserId);
            window.setTimeout(() => {
                interestedInYouSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        },
        []
    );

    const managedSubActivityFor = useCallback(
        (subUserId: number) =>
            managedSubActivity.find(
                (row: { subUserId?: number; SubUserId?: number }) =>
                    (row.subUserId ?? row.SubUserId) === subUserId
            ),
        [managedSubActivity]
    );

    const openManagedSubProfile = useCallback(
        (subAccount: { id: number; firstName?: string; lastName?: string; profilePhoto?: string | null }) => {
            const managerName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
            const profilePayload: Record<string, unknown> = {
                userId: subAccount.id,
                firstName: subAccount.firstName,
                lastName: subAccount.lastName,
                profilePhoto: subAccount.profilePhoto,
            };
            if (user?.accountType === 'Matchmaker') {
                profilePayload.isMatchmakerManaged = true;
                profilePayload.matchmakerName = managerName;
            } else if (canManageSubAccounts(user?.accountType)) {
                profilePayload.isFamilyManaged = true;
                profilePayload.managedByLabel = isRelationAccountType(user?.accountType)
                    ? 'Managed by relation'
                    : 'Managed by parent';
                profilePayload.managerName = managerName;
            }
            openModal('profile', undefined, profilePayload);
        },
        [openModal, user?.accountType, user?.firstName, user?.lastName]
    );

    const openEditManagedSubProfile = useCallback(
        (subAccount: { id: number; firstName?: string; lastName?: string }) => {
            if (user?.isVerified === false) {
                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                return;
            }
            setEditingSubAccount(subAccount);
            setManagedEditFormSession((s) => s + 1);
        },
        [user?.isVerified],
    );

    const canManageContactVisibilityPref =
        user?.isSubscribed === true ||
        (user?.accountType === 'Matchmaker' && isMatchmakerPaidTier(user?.matchmakerTier));
    const familyManagedByLabel = isRelationAccountType(user?.accountType)
        ? 'Managed by relation'
        : 'Managed by parent';
    const managerDisplayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

    useEffect(() => {
        const raw = searchParams?.get('interestSub');
        const subId = raw ? Number(raw) : NaN;
        if (!Number.isFinite(subId) || subId <= 0) return;
        if (!managedSubAccountTabs.some((s) => s.id === subId)) return;
        setActiveInterestSubAccountId(subId);
        const t = window.setTimeout(() => {
            interestedInYouSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        return () => window.clearTimeout(t);
    }, [searchParams, managedSubAccountTabs]);

    useEffect(() => {
        const fetchSavedAndActivity = async () => {
            if (!user?.id) {
                setSavedProfiles([]);
                setInterestProfiles([]);
                setIncomingInterestProfiles([]);
                setRecentActivity([]);
                return;
            }

            setLoadingSavedProfiles(true);
            try {
                const [interactionsRes, notifRes] = await Promise.all([
                    matrimonialService.getUserInteractions(Number(user.id)),
                    matrimonialService.getInterestNotifications(Number(user.id)),
                ]);

                const rawFavorites = interactionsRes?.result?.Favorites || interactionsRes?.result?.favorites || [];
                const rawShortlists = interactionsRes?.result?.Shortlists || interactionsRes?.result?.shortlists || [];

                const parseIdList = (raw: unknown): number[] =>
                    Array.isArray(raw)
                        ? raw
                              .map((x: any) =>
                                  typeof x === 'number' ? x : x?.favoriteProfileId ?? x?.shortlistedProfileId ?? x?.profileId ?? x?.id
                              )
                              .filter((x: any) => Number.isFinite(Number(x)))
                              .map((x: any) => Number(x))
                        : [];

                const shortlistIdList = parseIdList(rawShortlists);
                const favoriteIdList = parseIdList(rawFavorites);
                const uniqueIds = Array.from(new Set([...shortlistIdList, ...favoriteIdList]));

                const formatListTime = (v: unknown): string =>
                    formatDeviceDateTime(v, { dateStyle: 'short', timeStyle: 'short' });
                const details =
                    uniqueIds.length === 0
                        ? []
                        : await Promise.all(
                              uniqueIds.map(async (profileId) => {
                                  try {
                                      const profileRes = await matrimonialService.getProfile(profileId);
                                      if (profileRes?.statusCode === 200 && profileRes?.result) {
                                          const p = profileRes.result;
                                          const resolvedUserId = p.UserId || p.userId || profileId;
                                          return {
                                              requestedId: profileId,
                                              id: resolvedUserId,
                                              userId: resolvedUserId,
                                              firstName: p.FirstName || p.firstName || 'User',
                                              lastName: p.LastName || p.lastName || '',
                                              age: p.Age || p.age || 0,
                                              cityOfResidence: p.CityOfResidence || p.cityOfResidence || 'Unknown',
                                              profilePhoto:
                                                  p.ProfilePhoto ||
                                                  p.profilePhoto ||
                                                  p.ProfilePhotoFromProfile ||
                                                  p.profilePhotoFromProfile ||
                                                  '',
                                              phoneNumber: p.PhoneNumber || p.phoneNumber || '',
                                          };
                                      }
                                  } catch {
                                      // Ignore one-off profile fetch failures.
                                  }
                                  return null;
                              })
                          );

                const filled = details.filter(Boolean) as any[];

                const byUserId = new Map<number, any>();
                const byRequestedId = new Map<number, any>();
                for (const pr of filled) {
                    if (pr?.userId != null) byUserId.set(Number(pr.userId), pr);
                    if (pr?.requestedId != null) byRequestedId.set(Number(pr.requestedId), pr);
                }

                const toMs = (v: unknown): number => apiInstantToMs(v);

                const favAct = interactionsRes?.result?.FavoriteActivity || interactionsRes?.result?.favoriteActivity || [];
                const shortAct = interactionsRes?.result?.ShortlistActivity || interactionsRes?.result?.shortlistActivity || [];

                const sortedShort = Array.isArray(shortAct)
                    ? [...shortAct].sort((a, b) => toMs(b.createdAt ?? b.CreatedAt) - toMs(a.createdAt ?? a.CreatedAt))
                    : [];
                const savedList: any[] = [];
                for (const row of sortedShort) {
                    const pid = Number(row.profileId ?? row.ProfileId);
                    if (!Number.isFinite(pid)) continue;
                    const pr = byRequestedId.get(pid) ?? byUserId.get(pid);
                    if (!pr) continue;
                    savedList.push({
                        ...pr,
                        managedProfileUserId:
                            row.managedProfileUserId ?? row.ManagedProfileUserId ?? null,
                        savedAtLabel: formatListTime(row.createdAt ?? row.CreatedAt),
                    });
                }
                setSavedProfiles(savedList);

                const sortedFav = Array.isArray(favAct)
                    ? [...favAct].sort((a, b) => toMs(b.createdAt ?? b.CreatedAt) - toMs(a.createdAt ?? a.CreatedAt))
                    : [];
                const interestList: any[] = [];
                for (const row of sortedFav) {
                    const uid = Number(row.profileUserId ?? row.ProfileUserId);
                    if (!Number.isFinite(uid)) continue;
                    const pr = byUserId.get(uid);
                    if (!pr) continue;
                    const isMutual = !!(row.isMutual ?? row.IsMutual);
                    interestList.push({
                        ...pr,
                        managedProfileUserId:
                            row.managedProfileUserId ?? row.ManagedProfileUserId ?? null,
                        isMutual,
                        interestedAtLabel: formatListTime(row.createdAt ?? row.CreatedAt),
                    });
                }
                setInterestProfiles(interestList);

                const rawNotifsEarly = notifRes?.result ?? notifRes?.Result ?? [];
                const notifListEarly = Array.isArray(rawNotifsEarly) ? rawNotifsEarly : [];
                const isNotificationUnread = (n: Record<string, unknown>) =>
                    !(n.isRead ?? n.IsRead);
                const pendingNotifs = notifListEarly.filter((n) =>
                    isNotificationUnread(n as Record<string, unknown>)
                );
                const incomingRowsMeta: {
                    refId: number;
                    managedProfileUserId: number | null;
                    atLabel: string;
                    isInterestBack: boolean;
                }[] = [];
                const incomingSeenKeys = new Set<string>();
                for (const n of pendingNotifs) {
                    const refId = referenceIdFromNotification(n as Record<string, unknown>);
                    const managedProfileUserId = managedProfileUserIdFromNotification(n as Record<string, unknown>);
                    const dedupeKey = `${managedProfileUserId ?? 'none'}-${refId}`;
                    if (!refId || incomingSeenKeys.has(dedupeKey)) continue;
                    incomingSeenKeys.add(dedupeKey);
                    const at = (n as any).createdOn ?? (n as any).CreatedOn;
                    incomingRowsMeta.push({
                        refId,
                        managedProfileUserId,
                        atLabel: formatListTime(at),
                        isInterestBack: isInterestBackNotification(n as Record<string, unknown>),
                    });
                }
                const missingIncomingIds = incomingRowsMeta.map((m) => m.refId).filter((id) => !byUserId.has(id));
                if (missingIncomingIds.length > 0) {
                    const extraIncoming = await Promise.all(
                        missingIncomingIds.map(async (profileId) => {
                            try {
                                const profileRes = await matrimonialService.getProfile(profileId);
                                if (profileRes?.statusCode === 200 && profileRes?.result) {
                                    const p = profileRes.result;
                                    const resolvedUserId = p.UserId || p.userId || profileId;
                                    return {
                                        requestedId: profileId,
                                        id: resolvedUserId,
                                        userId: resolvedUserId,
                                        firstName: p.FirstName || p.firstName || 'User',
                                        lastName: p.LastName || p.lastName || '',
                                        age: p.Age || p.age || 0,
                                        cityOfResidence: p.CityOfResidence || p.cityOfResidence || 'Unknown',
                                        profilePhoto:
                                            p.ProfilePhoto ||
                                            p.profilePhoto ||
                                            p.ProfilePhotoFromProfile ||
                                            p.profilePhotoFromProfile ||
                                            '',
                                    };
                                }
                            } catch {
                                // ignore single profile failure
                            }
                            return null;
                        })
                    );
                    for (const pr of extraIncoming.filter(Boolean) as any[]) {
                        if (pr?.userId != null) byUserId.set(Number(pr.userId), pr);
                        if (pr?.requestedId != null) {
                            const rid = Number(pr.requestedId);
                            byRequestedId.set(rid, pr);
                            byUserId.set(rid, pr);
                        }
                    }
                }
                const incomingInterestList: any[] = [];
                for (const row of incomingRowsMeta) {
                    const pr = byUserId.get(row.refId) ?? byRequestedId.get(row.refId);
                    if (!pr) continue;
                    incomingInterestList.push({
                        ...pr,
                        managedProfileUserId: row.managedProfileUserId,
                        interestedAtLabel: row.atLabel,
                        isInterestBack: row.isInterestBack,
                    });
                }
                setIncomingInterestProfiles(incomingInterestList);

                const formatActivityWhen = (v: unknown): string =>
                    formatDeviceDateTime(v, { dateStyle: 'medium', timeStyle: 'short' });

                const rows: any[] = [];

                if (Array.isArray(favAct)) {
                    for (const row of favAct) {
                        const uid = Number(row.profileUserId ?? row.ProfileUserId);
                        const at = row.createdAt ?? row.CreatedAt;
                        if (!Number.isFinite(uid)) continue;
                        const name = byUserId.get(uid);
                        const who = name ? `${name.firstName} ${name.lastName}`.trim() : `Member #${uid}`;
                        const isMutualInterest = !!(row.isMutual ?? row.IsMutual);
                        const managedSubId = Number(row.managedProfileUserId ?? row.ManagedProfileUserId);
                        const managedSub =
                            Number.isFinite(managedSubId) && managedSubId > 0
                                ? subAccounts.find((s: { id?: number }) => Number(s.id) === managedSubId)
                                : null;
                        const viaLabel = managedSub
                            ? ` · as ${subAccountDisplayName(managedSub as ManagedSubAccount)}`
                            : '';
                        rows.push({
                            key: `out-interest-${uid}-${String(at)}`,
                            atMs: toMs(at),
                            title: 'You expressed interest',
                            detail: isMutualInterest
                                ? `${who} · Mutual interest${viaLabel}`
                                : `${who}${viaLabel}`,
                            timeLabel: formatActivityWhen(at),
                            modalProfile: name || { userId: uid, id: uid, firstName: 'Member', lastName: '' },
                        });
                    }
                }

                if (Array.isArray(shortAct)) {
                    for (const row of shortAct) {
                        const pid = Number(row.profileId ?? row.ProfileId);
                        const at = row.createdAt ?? row.CreatedAt;
                        if (!Number.isFinite(pid)) continue;
                        const pr = byRequestedId.get(pid) ?? byUserId.get(pid);
                        const who = pr ? `${pr.firstName} ${pr.lastName}`.trim() : `Profile #${pid}`;
                        rows.push({
                            key: `shortlist-${pid}-${String(at)}`,
                            atMs: toMs(at),
                            title: 'You saved a profile (shortlist)',
                            detail: who,
                            timeLabel: formatActivityWhen(at),
                            modalProfile: pr || { userId: pid, id: pid, firstName: 'Member', lastName: '' },
                        });
                    }
                }

                const notifList = notifListEarly;
                for (const n of notifList) {
                    const at = n.createdOn ?? n.CreatedOn;
                    const refId = n.referenceId ?? n.ReferenceId;
                    const nid = n.id ?? n.Id;
                    rows.push({
                        key: `in-${nid}`,
                        atMs: toMs(at),
                        title: n.title || n.Title || 'Interest in your profile',
                        detail: n.description || n.Description || '',
                        timeLabel: formatActivityWhen(at),
                        modalProfile:
                            refId != null && Number(refId) > 0 ? { userId: Number(refId), id: Number(refId) } : undefined,
                    });
                }

                rows.sort((a, b) => b.atMs - a.atMs);
                setRecentActivity(rows.slice(0, 40));
            } catch (error) {
                console.error('Failed to fetch saved profiles', error);
                setSavedProfiles([]);
                setInterestProfiles([]);
                setIncomingInterestProfiles([]);
                setRecentActivity([]);
            } finally {
                setLoadingSavedProfiles(false);
            }
        };

        fetchSavedAndActivity();
    }, [user?.id, liveInterestRevision, subAccounts, managedSubAccountTabs]);

    const fetchManagedSubActivity = async () => {
        if (!user?.id) return;
        try {
            const data = await matrimonialService.getManagedSubAccountsActivity(Number(user.id));
            if (data?.result) {
                setManagedSubActivity(Array.isArray(data.result) ? data.result : []);
            }
        } catch (error) {
            console.error('Failed to fetch managed profile activity', error);
        }
    };

    useEffect(() => {
        if (!user?.id || !canManageSubAccounts(user.accountType)) return;
        void fetchManagedSubActivity();
    }, [user?.id, user?.accountType, liveInterestRevision]);

    const handleRemoveFromShortlist = async (e: React.MouseEvent, p: any) => {
        e.stopPropagation();
        if (!user?.id) return;
        const profileId = interactionProfileId(p);
        if (!Number.isFinite(profileId) || profileId <= 0) return;
        const key = `saved-${profileId}`;
        setRemovingInteractionKey(key);
        try {
            const managedId = p.managedProfileUserId ?? p.ManagedProfileUserId ?? undefined;
            const res = await matrimonialService.toggleShortlist(Number(user.id), profileId, managedId);
            if (res?.statusCode === 200) {
                setSavedProfiles((prev) => prev.filter((x) => interactionProfileId(x) !== profileId));
                showToast('Removed from shortlist.', 'success');
            } else {
                showToast(res?.message || 'Could not remove from shortlist.', 'error');
            }
        } catch (error) {
            console.error('Error removing from shortlist', error);
            showToast('Could not remove from shortlist.', 'error');
        } finally {
            setRemovingInteractionKey(null);
        }
    };

    const handleRemoveFromInterest = async (e: React.MouseEvent, p: any) => {
        e.stopPropagation();
        if (!user?.id) return;
        const profileId = interactionProfileId(p);
        if (!Number.isFinite(profileId) || profileId <= 0) return;
        const key = `interest-${profileId}`;
        setRemovingInteractionKey(key);
        try {
            const managedId = p.managedProfileUserId ?? p.ManagedProfileUserId ?? undefined;
            const res = await matrimonialService.toggleFavorite(Number(user.id), profileId, managedId);
            if (res?.statusCode === 200) {
                setInterestProfiles((prev) => prev.filter((x) => interactionProfileId(x) !== profileId));
                showToast('Interest removed.', 'success');
            } else {
                showToast(res?.message || 'Could not remove interest.', 'error');
            }
        } catch (error) {
            console.error('Error removing interest', error);
            showToast('Could not remove interest.', 'error');
        } finally {
            setRemovingInteractionKey(null);
        }
    };

    const handleSubAccountSendCode = async (method: string) => {
        if (!subAccountRegistrationSessionId) return;
        setSubAccountSendCodeBusy(true);
        setSubAccountVerificationHint(null);
        try {
            const res = await matrimonialService.sendVerificationCode({
                registrationSessionId: subAccountRegistrationSessionId,
                method,
            });
            if (res.statusCode === 200 || res.statusCode === 1) {
                setSubAccountVerificationHint(`Code sent via ${method}. Enter it below (expires in 10 minutes).`);
            } else {
                setSubAccountVerificationHint(res.message || 'Could not send code.');
            }
        } catch (err) {
            setSubAccountVerificationHint(err instanceof Error ? err.message : 'Could not send code.');
        } finally {
            setSubAccountSendCodeBusy(false);
        }
    };

    const handleSubAccountVerifyComplete = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subAccountRegistrationSessionId) return;
        const digits = subAccountOtp.replace(/\D/g, '').slice(0, 6);
        if (digits.length !== 6) {
            setSubAccountError('Enter the 6-digit verification code.');
            return;
        }
        setSubAccountVerifyBusy(true);
        setSubAccountError(null);
        try {
            const data = await matrimonialService.verifyCode({
                registrationSessionId: subAccountRegistrationSessionId,
                code: digits,
            });
            if (data.statusCode === 200 || data.statusCode === 1) {
                setIsCreateSubAccountModalOpen(false);
                resetSubAccountForm();
                showToast('Client profile created successfully.', 'success');
                fetchSubAccounts();
            } else {
                setSubAccountError(data.message || 'Verification failed.');
            }
        } catch (err) {
            setSubAccountError(err instanceof Error ? err.message : 'Verification failed.');
        } finally {
            setSubAccountVerifyBusy(false);
        }
    };

    const handleCreateSubAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubAccountError(null);

        if (user && isFamilyParentAccountType(user.accountType)) {
            const purchased = Math.max(0, user.familySubAccountSlotsPurchased ?? 0);
            const consumed = Math.max(0, user.familySubAccountSlotsConsumed ?? 0);
            if (consumed >= purchased) {
                const price = liveSubAccountPackage?.price ?? user.familySubAccountAdditionalAmountLkr ?? PREMIUM_SUBSCRIPTION_LKR;
                setSubAccountError(
                    purchased <= 0
                        ? `Pay LKR ${price.toLocaleString()} for a sub-account package before creating a managed profile.`
                        : `You have used all ${purchased} sub-account slot(s). Pay LKR ${price.toLocaleString()} for each additional slot.`,
                );
                return;
            }
        }

        // Required-field validation (mirrors the public register modal so matchmakers
        // create profiles that look identical to user-registered ones).
        if (!subAccountForm.firstName.trim() || !subAccountForm.lastName.trim()) {
            setSubAccountError('First and last name are required.');
            return;
        }
        if (subAccountForm.firstName.trim().length > AUTH_FIELD_MAX_LENGTH || subAccountForm.lastName.trim().length > AUTH_FIELD_MAX_LENGTH) {
            setSubAccountError(`First and last name cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters each.`);
            return;
        }
        if (!subAccountForm.nic.trim()) {
            setSubAccountError('NIC or passport number is required.');
            return;
        }
        const nicFormatErr = nicOrPassportFormatError(subAccountForm.nic);
        if (nicFormatErr) {
            setSubAccountError(nicFormatErr);
            return;
        }
        if (!subAccountForm.dob) {
            setSubAccountError('Date of birth is required.');
            return;
        }
        if (!subAccountForm.gender) {
            setSubAccountError('Gender is required.');
            return;
        }
        const phoneErr = sriLankanPhoneFormatErrorIfInvalid(subAccountForm.phone, 'Phone number');
        if (phoneErr) {
            setSubAccountError(phoneErr);
            return;
        }
        const effectiveWhatsApp = subAccountWhatsAppSame ? subAccountForm.phone : subAccountForm.whatsapp;
        const whatsappErr = sriLankanPhoneFormatErrorIfInvalid(effectiveWhatsApp, 'WhatsApp number');
        if (whatsappErr) {
            setSubAccountError(whatsappErr);
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(subAccountForm.email)) {
            setSubAccountError('Please enter a valid email address.');
            return;
        }
        if (subAccountForm.email.length > AUTH_FIELD_MAX_LENGTH) {
            setSubAccountError(`Email cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters.`);
            return;
        }
        if (subAccountForm.password.length < 6) {
            setSubAccountError('Password must be at least 6 characters.');
            return;
        }
        if (subAccountForm.password.length > PASSWORD_MAX_LENGTH || subAccountForm.confirmPassword.length > PASSWORD_MAX_LENGTH) {
            setSubAccountError(`Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`);
            return;
        }
        if (subAccountForm.password !== subAccountForm.confirmPassword) {
            setSubAccountError('Passwords do not match.');
            return;
        }
        if (!subAccountTermsAccepted) {
            setSubAccountError('Please confirm that the client has authorised you to create this profile.');
            return;
        }

        setIsCreatingSubAccount(true);

        try {
            const data = await matrimonialService.register({
                firstName: subAccountForm.firstName,
                lastName: subAccountForm.lastName,
                nic: subAccountForm.nic,
                gender: subAccountForm.gender,
                phone: subAccountForm.phone,
                whatsApp: effectiveWhatsApp,
                email: subAccountForm.email,
                password: subAccountForm.password,
                accountType: 'Self',
                profilePhotoBase64: subAccountPhotoBase64 || undefined,
                dateOfBirth: subAccountForm.dob.length === 10 ? `${subAccountForm.dob}T00:00:00` : subAccountForm.dob,
                parentUserId: Number(user?.id),
            });

            const resultAny = data.result as Record<string, unknown> | undefined;
            const sid =
                resultAny?.registrationSessionId ??
                resultAny?.RegistrationSessionId;
            if ((data.statusCode === 200 || data.statusCode === 1) && sid) {
                setSubAccountRegistrationSessionId(String(sid));
                setSubAccountVerifyStep(true);
                setSubAccountOtp('');
                setSubAccountVerificationHint(
                    'Choose how to receive the verification code for this profile. The account is created only after verification.',
                );
            } else {
                setSubAccountError(data.message || 'Failed to start registration');
            }
        } catch (error) {
            setSubAccountError(error instanceof Error ? error.message : 'An error occurred while creating the sub-account');
        } finally {
            setIsCreatingSubAccount(false);
        }
    };

    const [deletingSubAccountId, setDeletingSubAccountId] = useState<number | null>(null);

    // ─── Settings panel state ────────────────────────────────────────────────────
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    /**
     * Allow other places (e.g. the header user dropdown) to deep-link straight to the
     * settings panel via `/profile?settings=open`. We open the panel and then smoothly
     * scroll it into view once the layout has settled.
     */
    useEffect(() => {
        if (!user) return;
        if (searchParams?.get('settings') === 'open') {
            setIsSettingsOpen(true);
            // Defer the scroll until the panel has actually rendered.
            const t = window.setTimeout(() => {
                document.getElementById('user-settings-panel')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 60);
            return () => window.clearTimeout(t);
        }
    }, [searchParams, user]);
    /** Client settings panel state; privacy + notification prefs are server-authoritative. */
    const [prefs, setPrefs] = useState({
        emailNotifications: true,
        showInBrowse: true,
        photoVisibility: 'everyone' as 'everyone' | 'premium',
    });
    useEffect(() => {
        if (typeof window === 'undefined' || !user?.id) return;
        try {
            const raw = localStorage.getItem(`cbass.prefs.${user.id}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                const { emailNotifications: _ignored, ...rest } = parsed ?? {};
                setPrefs(p => ({ ...p, ...rest }));
            }
        } catch { /* ignore corrupted prefs */ }
    }, [user?.id]);

    /**
     * The "email me when someone shows interest" preference is server-authoritative — the
     * value comes back on the GetProfile call and is mirrored onto the user object. Keep
     * the toggle UI in sync whenever that arrives or changes.
     */
    useEffect(() => {
        if (user?.emailOnInterest === undefined) return;
        setPrefs(p => p.emailNotifications === user.emailOnInterest
            ? p
            : { ...p, emailNotifications: !!user.emailOnInterest });
    }, [user?.emailOnInterest]);

    useEffect(() => {
        if (!profileFetched || !pendingPrivacyPrefsRef.current) return;
        const loaded = pendingPrivacyPrefsRef.current;
        pendingPrivacyPrefsRef.current = null;
        setPrefs(p => ({ ...p, ...loaded }));
    }, [profileFetched]);

    const updatePref = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            if (typeof window !== 'undefined' && user?.id) {
                try {
                    const { emailNotifications: _ignored, ...persistable } = next;
                    localStorage.setItem(`cbass.prefs.${user.id}`, JSON.stringify(persistable));
                } catch { /* quota */ }
            }
            return next;
        });
    };

    const [isSavingEmailPref, setIsSavingEmailPref] = useState(false);
    const [isSavingPrivacyPref, setIsSavingPrivacyPref] = useState(false);
    const [isSavingContactVisibilityPref, setIsSavingContactVisibilityPref] = useState(false);
    const [bankSubAccountAwaitingApproval, setBankSubAccountAwaitingApproval] = useState(false);

    const refreshFamilySubAccountSlots = useCallback(async () => {
        if (!user?.id || !isFamilyParentAccountType(user.accountType)) return;
        const token = getStoredToken();
        if (!token) return;
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
        try {
            const res = await fetch(
                `${apiBase}/Matrimonial/GetProfile?userId=${user.id}&requesterUserId=${user.id}&cb=${Date.now()}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return;
            const data = await res.json();
            const r = data?.result ?? data?.Result;
            if (!r || typeof r !== 'object') return;

            const purchasedRaw = r.familySubAccountSlotsPurchased ?? r.FamilySubAccountSlotsPurchased;
            const consumedRaw = r.familySubAccountSlotsConsumed ?? r.FamilySubAccountSlotsConsumed;
            const priceRaw = r.familySubAccountAdditionalAmountLkr ?? r.FamilySubAccountAdditionalAmountLkr;
            const validityRaw = r.familySubAccountPackageValidityMonths ?? r.FamilySubAccountPackageValidityMonths;

            const updates: Record<string, unknown> = {};
            if (purchasedRaw != null && purchasedRaw !== '') updates.familySubAccountSlotsPurchased = Number(purchasedRaw);
            if (consumedRaw != null && consumedRaw !== '') updates.familySubAccountSlotsConsumed = Number(consumedRaw);
            if (priceRaw != null && priceRaw !== '') updates.familySubAccountAdditionalAmountLkr = Number(priceRaw);
            if (validityRaw != null && validityRaw !== '') updates.familySubAccountPackageValidityMonths = Number(validityRaw);

            const subscribed = r.isSubscribed ?? r.IsSubscribed;
            if (subscribed !== undefined && subscribed !== null) {
                updates.isSubscribed = subscribed === true || subscribed === 'true';
            }
            const subUntil =
                r.subscriptionUntilUtc ??
                r.SubscriptionUntilUtc ??
                r.selfPremiumSubscriptionUntilUtc ??
                r.SelfPremiumSubscriptionUntilUtc;
            const subLifetime = r.subscriptionIsLifetime ?? r.SubscriptionIsLifetime;
            if (subLifetime === true || subLifetime === 'true') {
                updates.subscriptionIsLifetime = true;
                updates.subscriptionExpiresAt = undefined;
            } else if (subUntil != null && String(subUntil).trim() !== '') {
                const exp = new Date(String(subUntil));
                if (!Number.isNaN(exp.getTime())) {
                    updates.subscriptionExpiresAt = exp.toISOString();
                    updates.subscriptionIsLifetime = false;
                }
            } else if (subscribed === false || subscribed === 'false') {
                updates.subscriptionIsLifetime = false;
                updates.subscriptionExpiresAt = undefined;
            }
            const subCancelled = r.subscriptionCancelled ?? r.SubscriptionCancelled;
            if (subCancelled !== undefined && subCancelled !== null) {
                updates.subscriptionCancelled = subCancelled === true || subCancelled === 'true';
            }

            if (Object.keys(updates).length > 0) {
                updateUser(updates);
            }

            const purchased = Number(updates.familySubAccountSlotsPurchased ?? user.familySubAccountSlotsPurchased ?? 0);
            const consumed = Number(updates.familySubAccountSlotsConsumed ?? user.familySubAccountSlotsConsumed ?? 0);
            const remaining = Math.max(0, purchased - consumed);
            const hadPending = typeof window !== 'undefined'
                && localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';

            if (remaining > 0 && hadPending) {
                localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
                setBankSubAccountAwaitingApproval(false);
                showToast(SUB_ACCOUNT_SLOT_PURCHASED_MESSAGE, 'success', 5500);
            } else if (typeof window !== 'undefined') {
                const stillPending = localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';
                setBankSubAccountAwaitingApproval(stillPending && remaining <= 0);
            }
        } catch {
            /* ignore refresh errors */
        }
    }, [user?.id, user?.accountType, user?.familySubAccountSlotsPurchased, user?.familySubAccountSlotsConsumed, updateUser]);
    /**
     * Persist the email-on-interest toggle to the server so notifications are actually
     * sent (or not). We optimistically update the UI and roll it back on error.
     */
    const handleEmailNotificationToggle = async (enabled: boolean) => {
        if (!user?.id) return;
        const previous = prefs.emailNotifications;
        updatePref('emailNotifications', enabled);
        try {
            setIsSavingEmailPref(true);
            const res = await matrimonialService.updateNotificationPreferences(Number(user.id), enabled);
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                updateUser?.({ emailOnInterest: enabled });
                showToast(
                    enabled
                        ? 'Interest email notifications are on again.'
                        : 'You have unsubscribed from interest emails.',
                    'success'
                );
            } else {
                updatePref('emailNotifications', previous);
                showToast(res?.message || 'Could not save preference. Please try again.', 'error');
            }
        } catch (err: any) {
            updatePref('emailNotifications', previous);
            showToast(err?.message || 'Could not save preference. Please try again.', 'error');
        } finally {
            setIsSavingEmailPref(false);
        }
    };

    const handlePrivacyPreferenceChange = async (updates: {
        showInBrowse?: boolean;
        photoVisibility?: 'everyone' | 'premium';
    }) => {
        if (!user?.id) return;
        const previousShowInBrowse = prefs.showInBrowse;
        const previousPhotoVisibility = prefs.photoVisibility;
        const nextShowInBrowse = updates.showInBrowse ?? prefs.showInBrowse;
        const nextPhotoVisibility = updates.photoVisibility ?? prefs.photoVisibility;
        setPrefs(prev => ({
            ...prev,
            showInBrowse: nextShowInBrowse,
            photoVisibility: nextPhotoVisibility,
        }));
        try {
            setIsSavingPrivacyPref(true);
            const res = await matrimonialService.setMatrimonialPrivacyPreferences(
                Number(user.id),
                nextShowInBrowse,
                nextPhotoVisibility,
            );
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                return;
            }
            setPrefs(prev => ({
                ...prev,
                showInBrowse: previousShowInBrowse,
                photoVisibility: previousPhotoVisibility,
            }));
            showToast(res?.message || 'Could not save preference. Please try again.', 'error');
        } catch (err: unknown) {
            setPrefs(prev => ({
                ...prev,
                showInBrowse: previousShowInBrowse,
                photoVisibility: previousPhotoVisibility,
            }));
            showToast(err instanceof Error ? err.message : 'Could not save preference. Please try again.', 'error');
        } finally {
            setIsSavingPrivacyPref(false);
        }
    };

    const handleShowContactInformationToggle = async (show: boolean) => {
        if (!user?.id) return;
        const previous = user.showContactInformation !== false;
        updateUser?.({ showContactInformation: show });
        try {
            setIsSavingContactVisibilityPref(true);
            const res = await matrimonialService.setMatrimonialShowContactInformation(Number(user.id), show);
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                updateUser?.({ showContactInformation: show });
            } else {
                updateUser?.({ showContactInformation: previous });
                showToast(res?.message || 'Could not save preference. Please try again.', 'error');
            }
        } catch (err: unknown) {
            updateUser?.({ showContactInformation: previous });
            showToast(err instanceof Error ? err.message : 'Could not save preference. Please try again.', 'error');
        } finally {
            setIsSavingContactVisibilityPref(false);
        }
    };

    const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
    const [showCancelSubscriptionModal, setShowCancelSubscriptionModal] = useState(false);
    const handleConfirmCancelSubscription = async () => {
        if (!user?.id) return;
        try {
            setIsCancellingSubscription(true);
            const res = await matrimonialService.cancelSubscription(Number(user.id));
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                const r = (res?.result ?? {}) as Record<string, any>;
                const stillSubscribed = (r.isSubscribed ?? r.IsSubscribed) === true;
                const cancelled =
                    (r.subscriptionCancelled ?? r.SubscriptionCancelled) === true;
                const subscribedUntil =
                    r.subscribedUntil ?? r.SubscribedUntil ?? r.subscriptionUntilUtc ?? r.SubscriptionUntilUtc;
                if (stillSubscribed) {
                    updateUser?.({
                        isSubscribed: true,
                        subscriptionCancelled: cancelled,
                        ...(subscribedUntil
                            ? {
                                  subscriptionExpiresAt: new Date(String(subscribedUntil)).toISOString(),
                                  subscriptionIsLifetime: false,
                              }
                            : {}),
                    });
                } else {
                    updateUser?.({
                        isSubscribed: false,
                        subscriptionCancelled: false,
                        subscriptionExpiresAt: undefined,
                        subscriptionIsLifetime: false,
                        showContactInformation: true,
                    });
                }
                setShowCancelSubscriptionModal(false);
                showToast(res?.message || 'Subscription cancelled.', 'success');
            } else {
                showToast(res?.message || 'Failed to cancel subscription.', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to cancel subscription.', 'error');
        } finally {
            setIsCancellingSubscription(false);
        }
    };

    const [isReactivatingSubscription, setIsReactivatingSubscription] = useState(false);
    const handleReactivateSubscription = async () => {
        if (!user?.id) return;
        try {
            setIsReactivatingSubscription(true);
            const res = await matrimonialService.reactivateSubscription(Number(user.id));
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                updateUser?.({
                    ...user,
                    isSubscribed: true,
                    subscriptionCancelled: false,
                } as any);
                showToast(res?.message || 'Subscription reactivated.', 'success');
            } else {
                showToast(res?.message || 'Failed to reactivate subscription.', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to reactivate subscription.', 'error');
        } finally {
            setIsReactivatingSubscription(false);
        }
    };

    const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [showSubAccountPackageModal, setShowSubAccountPackageModal] = useState(false);
    const [showMatchmakerUpgradeModal, setShowMatchmakerUpgradeModal] = useState(false);
    const handleDeleteOwnAccount = async () => {
        if (!user?.id) return;
        if (deleteAccountConfirm.trim().toUpperCase() !== 'DELETE') {
            showToast('Please type DELETE to confirm.', 'error');
            return;
        }
        try {
            setIsDeletingAccount(true);
            const res = await matrimonialService.deleteOwnAccount(Number(user.id));
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                showToast('Your account has been permanently deleted.', 'success');
                // Wipe any per-user prefs
                if (typeof window !== 'undefined') {
                    try { localStorage.removeItem(`cbass.prefs.${user.id}`); } catch { /* ignore */ }
                }
                setShowDeleteAccountModal(false);
                logout(); // clears auth + redirects to "/"
            } else {
                showToast(res?.message || 'Failed to delete account.', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to delete account.', 'error');
        } finally {
            setIsDeletingAccount(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────────

    const handleDeleteSubAccount = async (subAccount: { id: number; firstName?: string; lastName?: string }) => {
        if (!user?.id || !subAccount?.id) return;
        const fullName = `${subAccount.firstName || ''} ${subAccount.lastName || ''}`.trim() || 'this profile';
        const confirmed = typeof window !== 'undefined' && window.confirm(
            `Delete ${fullName}?\n\nThis will permanently remove the profile, photos, messages and saved interactions. This action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setDeletingSubAccountId(subAccount.id);
            const res = await matrimonialService.deleteSubAccount(Number(user.id), subAccount.id);
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                setSubAccounts(prev => prev.filter(sa => sa.id !== subAccount.id));
                setManagedSubActivity(prev => prev.filter((a: any) => (a.subUserId ?? a.SubUserId) !== subAccount.id));
                if (user.accountType === 'Matchmaker') {
                    const nextCount = Math.max(
                        0,
                        (typeof user.matchmakerClientProfileCount === 'number'
                            ? user.matchmakerClientProfileCount
                            : subAccounts.length) - 1,
                    );
                    updateUser?.({
                        matchmakerClientProfileCount: nextCount,
                        matchmakerCanAddClients: isMatchmakerPaidTier(user.matchmakerTier)
                            && nextCount < (user.matchmakerMaxClientProfiles ?? 0),
                    });
                }
                showToast(`${fullName} has been removed.`, 'success');
            } else {
                showToast(res?.message || 'Failed to delete profile.', 'error');
            }
        } catch (err: any) {
            showToast(err?.message || 'Failed to delete profile.', 'error');
        } finally {
            setDeletingSubAccountId(null);
        }
    };

    const handleSubAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let nextValue = value;
        if (name === 'nic') nextValue = sanitizeNicInput(value);
        else if (name === 'phone' || name === 'whatsapp') nextValue = sanitizeSriLankanPhoneInput(value);
        else if (name === 'firstName' || name === 'lastName') nextValue = sanitizeNameInput(value);

        setSubAccountForm(prev => {
            const updated = { ...prev, [name]: nextValue };
            if (name === 'nic') {
                const parsed = parseNicToDobAndGender(nextValue);
                if (parsed) {
                    updated.dob = parsed.dob;
                    updated.gender = parsed.gender;
                }
            }
            if (name === 'phone' && subAccountWhatsAppSame) {
                updated.whatsapp = nextValue;
            }
            return updated;
        });
    };

    const handleSubAccountWhatsAppSameToggle = (same: boolean) => {
        setSubAccountWhatsAppSame(same);
        setSubAccountForm(prev => ({
            ...prev,
            whatsapp: same ? prev.phone : ''
        }));
    };

    const handleSubAccountPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setSubAccountPhotoBase64(base64);
            setSubAccountPhotoPreview(base64);
        };
        reader.readAsDataURL(file);
    };

    const resetSubAccountForm = () => {
        setSubAccountForm({
            firstName: '',
            lastName: '',
            nic: '',
            dob: '',
            gender: '',
            phone: '',
            whatsapp: '',
            email: '',
            password: '',
            confirmPassword: '',
            accountType: 'Self'
        });
        setSubAccountWhatsAppSame(true);
        setSubAccountShowPassword(false);
        setSubAccountShowConfirmPassword(false);
        setSubAccountPhotoBase64('');
        setSubAccountPhotoPreview('');
        setSubAccountTermsAccepted(false);
        setSubAccountError(null);
        setSubAccountVerifyStep(false);
        setSubAccountRegistrationSessionId(null);
        setSubAccountOtp('');
        setSubAccountVerificationHint(null);
    };

    // Form state for editing (Basic Details)
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        nic: '',
        dob: '',
        gender: '',
        phone: '',
        whatsapp: '',
        email: '',
        accountType: ''
    });

    const formatDateForInput = (val: string | undefined): string => {
        if (!val) return '';
        const leadingDate = val.match(/^(\d{4}-\d{2}-\d{2})/);
        if (leadingDate) return leadingDate[1];
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        } catch { return ''; }
    };

    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                nic: user.nic || '',
                dob: formatDateForInput(user.dob),
                gender: user.gender || '',
                phone: user.phone || '',
                whatsapp: user.whatsapp || '',
                email: user.email || '',
                accountType: user.accountType || ''
            });
        }
    }, [user]);

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let nextValue = value;
        if (name === 'phone' || name === 'whatsapp') nextValue = sanitizeSriLankanPhoneInput(value);
        else if (name === 'firstName' || name === 'lastName') nextValue = sanitizeNameInput(value);
        setEditForm(prev => ({
            ...prev,
            [name]: nextValue
        }));
        if (name === 'phone') {
            setPhoneVerifiedCanonical((prev) => {
                if (prev == null) return null;
                return canonicalSriLankanPhoneDigits(nextValue) === prev ? prev : null;
            });
        }
    };

    /** Tracks whether Edit Basic Details is already open so we only reset OTP state when the modal opens, not when user.phone updates after verify. */
    const editModalWasOpenRef = useRef(false);

    useEffect(() => {
        if (isEditModalOpen) {
            if (!editModalWasOpenRef.current) {
                setEditModalPhoneBaselineCanonical(canonicalSriLankanPhoneDigits(user?.phone || ''));
                setPhoneChangeCode('');
                setPhoneVerifiedCanonical(null);
            }
            editModalWasOpenRef.current = true;
        } else {
            editModalWasOpenRef.current = false;
        }
    }, [isEditModalOpen, user?.phone]);

    useEffect(() => {
        if (!isCreateSubAccountModalOpen) return;
        requestAnimationFrame(() => {
            managedProfileModalScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    }, [isCreateSubAccountModalOpen, managedProfileFormSession]);

    useEffect(() => {
        if (!editingSubAccount) return;
        requestAnimationFrame(() => {
            managedProfileEditModalScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        });
    }, [editingSubAccount, managedEditFormSession]);

    useEffect(() => {
        if (!isCompletionModalOpen) return;
        const el = profileCompletionModalScrollRef.current;
        if (el) {
            el.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [isCompletionModalOpen]);

    useEffect(() => {
        if (typeof window === 'undefined' || !user?.id || !isFamilyParentAccountType(user.accountType)) return;

        const syncPendingFromSlots = () => {
            const purchased = Math.max(0, user.familySubAccountSlotsPurchased ?? 0);
            const consumed = Math.max(0, user.familySubAccountSlotsConsumed ?? 0);
            const remaining = Math.max(0, purchased - consumed);
            const pending = localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';
            if (pending && remaining > 0) {
                localStorage.removeItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY);
                setBankSubAccountAwaitingApproval(false);
                return;
            }
            setBankSubAccountAwaitingApproval(pending && remaining <= 0);
        };

        syncPendingFromSlots();
        refreshFamilySubAccountSlots();

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                refreshFamilySubAccountSlots();
            }
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);

        const pending = localStorage.getItem(PENDING_BANK_SUB_ACCOUNT_STORAGE_KEY) === '1';
        const interval = pending
            ? window.setInterval(() => refreshFamilySubAccountSlots(), 15000)
            : undefined;

        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
            if (interval) window.clearInterval(interval);
        };
    }, [
        user?.id,
        user?.accountType,
        user?.familySubAccountSlotsPurchased,
        user?.familySubAccountSlotsConsumed,
        refreshFamilySubAccountSlots,
    ]);

    useEffect(() => {
        if (!user?.id || !isFamilyParentAccountType(user.accountType)) {
            setLiveSubAccountPackage(null);
            setSubAccountPackages([]);
            return;
        }
        let cancelled = false;
        setLoadingSubAccountPackages(true);
        matrimonialService.getSubAccountPackages().then((pkgs) => {
            if (cancelled) return;
            setSubAccountPackages(pkgs);
            const primary = pkgs[0];
            if (primary) {
                const price = packagePrice(primary);
                const lifetime = !!(primary.isLifetimeValidity ?? primary.IsLifetimeValidity);
                const monthsRaw = primary.validityMonths ?? primary.ValidityMonths;
                const months = monthsRaw != null ? Number(monthsRaw) : undefined;
                setLiveSubAccountPackage({
                    price,
                    validityMonths:
                        !lifetime && months != null && Number.isFinite(months) && months > 0 ? months : undefined,
                });
                updateUser({
                    familySubAccountAdditionalAmountLkr: price,
                    familySubAccountPackageValidityMonths:
                        !lifetime && months != null && Number.isFinite(months) && months > 0 ? months : undefined,
                });
            } else {
                setLiveSubAccountPackage(null);
            }
        }).finally(() => {
            if (!cancelled) setLoadingSubAccountPackages(false);
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.accountType, updateUser]);

    useEffect(() => {
        if (!user?.id || user.accountType !== 'Matchmaker') {
            setMatchmakerPackages([]);
            return;
        }
        let cancelled = false;
        setLoadingMatchmakerPackages(true);
        matrimonialService.getMatchmakerPackages().then((pkgs) => {
            if (!cancelled) setMatchmakerPackages(pkgs);
        }).finally(() => {
            if (!cancelled) setLoadingMatchmakerPackages(false);
        });
        return () => {
            cancelled = true;
        };
    }, [user?.id, user?.accountType]);

    // In a real app, you would have a save function here that calls an API and updates the User Context

    const managedSubSubscriptionLabels = useMemo(
        () => ({
            lifetime: t('subscriptionLifetime'),
            active: 'Premium active',
            inactive: 'Premium not active',
            expired: t('subscriptionTimeExpired'),
            oneDay: t('subscriptionOneDayRemaining'),
            days: (n: number) => t('subscriptionDaysRemaining').replace('{n}', String(n)),
            hours: (n: number) => t('subscriptionHoursRemaining').replace('{n}', String(n)),
            today: t('subscriptionExpiresToday'),
            endsOn: (date: string) => t('subscriptionEndsOn').replace('{date}', date),
        }),
        [t],
    );

    const formatSubAccountSubscription = useCallback(
        (sub: Record<string, unknown>) =>
            formatManagedSubSubscriptionLine(
                {
                    isSubscribed: Boolean(sub.isSubscribed ?? sub.IsSubscribed),
                    subscriptionIsLifetime: Boolean(sub.subscriptionIsLifetime ?? sub.SubscriptionIsLifetime),
                    subscriptionExpiresAt: String(
                        sub.subscriptionExpiresAt ?? sub.SubscriptionExpiresAt ?? sub.subscriptionUntilUtc ?? sub.SubscriptionUntilUtc ?? '',
                    ) || undefined,
                },
                managedSubSubscriptionLabels,
                language === 'si' ? 'si-LK' : undefined,
            ),
        [managedSubSubscriptionLabels, language],
    );

    const subAccountPriceLabel = useMemo(() => {
        const prices = subAccountPackages.map(packagePrice).filter((p) => p > 0);
        if (prices.length === 0) {
            const fallback =
                liveSubAccountPackage?.price ??
                user?.familySubAccountAdditionalAmountLkr ??
                PREMIUM_SUBSCRIPTION_LKR;
            return `LKR ${fallback.toLocaleString()}`;
        }
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) return `LKR ${min.toLocaleString()}`;
        return `LKR ${min.toLocaleString()} – ${max.toLocaleString()}`;
    }, [subAccountPackages, liveSubAccountPackage?.price, user?.familySubAccountAdditionalAmountLkr]);

    const openSubAccountPackageModal = useCallback(() => {
        setShowSubAccountPackageModal(true);
    }, []);

    const handleSelectSubAccountPackage = useCallback((pkg: PublicMatrimonialPackage) => {
        setShowSubAccountPackageModal(false);
        const amount = packagePrice(pkg);
        const params = new URLSearchParams({
            plan: CHECKOUT_PLAN_SUB_ACCOUNT,
            amount: String(amount),
        });
        router.push(`/subscription/checkout?${params.toString()}`);
    }, [router]);

    const matchmakerClientsUsed = useMemo(() => {
        if (user?.accountType !== 'Matchmaker') return 0;
        return Math.max(
            0,
            typeof user.matchmakerClientProfileCount === 'number'
                ? user.matchmakerClientProfileCount
                : subAccounts.length,
        );
    }, [user?.accountType, user?.matchmakerClientProfileCount, subAccounts.length]);

    const matchmakerClientsMax = useMemo(() => {
        if (user?.accountType !== 'Matchmaker') return 0;
        return Math.max(0, user.matchmakerMaxClientProfiles ?? 0);
    }, [user?.accountType, user?.matchmakerMaxClientProfiles]);

    const matchmakerClientLimitState = useMemo((): MatchmakerClientLimitState => {
        if (user?.accountType !== 'Matchmaker') return 'can_create';
        return resolveMatchmakerClientLimitState({
            clientsUsed: matchmakerClientsUsed,
            clientsMax: matchmakerClientsMax,
            matchmakerTier: user.matchmakerTier,
            matchmakerPackages,
        });
    }, [user?.accountType, user?.matchmakerTier, matchmakerClientsUsed, matchmakerClientsMax, matchmakerPackages]);

    const matchmakerUpgradePackagesList = useMemo(() => {
        if (matchmakerClientLimitState === 'needs_plan') {
            return paidMatchmakerPackages(matchmakerPackages);
        }
        if (matchmakerClientLimitState === 'upgrade_for_more') {
            return upgradeMatchmakerPackages(matchmakerPackages, matchmakerClientsMax);
        }
        return [];
    }, [matchmakerClientLimitState, matchmakerPackages, matchmakerClientsMax]);

    const matchmakerPlatformMaxClients = useMemo(
        () => platformMaxMatchmakerClients(matchmakerPackages),
        [matchmakerPackages],
    );

    const openMatchmakerUpgradeModal = useCallback(() => {
        setShowMatchmakerUpgradeModal(true);
    }, []);

    const handleSelectMatchmakerUpgradePackage = useCallback((pkg: PublicMatrimonialPackage) => {
        setShowMatchmakerUpgradeModal(false);
        const amount = packagePrice(pkg);
        const params = new URLSearchParams({
            plan: resolveCheckoutPlan(pkg),
            amount: String(amount),
        });
        router.push(`/subscription/checkout?${params.toString()}`);
    }, [router]);

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading...</div>;
    }

    if (!user) return null;

    const isFamilyParentAccount = isFamilyParentAccountType(user.accountType);
    const isMatchmakerAccount = user.accountType === 'Matchmaker';
    const usesSubAccountSlots = isFamilyParentAccount;
    const subSlotValidityMonths =
        liveSubAccountPackage?.validityMonths ?? user.familySubAccountPackageValidityMonths;
    const subSlotsPurchased = Math.max(0, user.familySubAccountSlotsPurchased ?? 0);
    const subSlotsConsumed = Math.max(0, user.familySubAccountSlotsConsumed ?? 0);
    const subSlotsRemaining = Math.max(0, subSlotsPurchased - subSlotsConsumed);
    const canCreateManagedSubAccount = usesSubAccountSlots && subSlotsRemaining > 0;
    const needsSubAccountPayment = usesSubAccountSlots && subSlotsRemaining <= 0;

    return (
        <main>
            <Header 
                onOpenLogin={() => openModal('login')} 
                onOpenRegister={() => openModal('register')} 
                onOpenVerify={() => openModal('verify')}
            />

            <div className="profile-page-container" style={{ paddingTop: '100px', minHeight: '80vh', maxWidth: '1200px', margin: '0 auto', padding: '120px 20px 40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1>My Profile</h1>
                    {!profileCompleted && !isBasicProfileOnlyAccountType(user?.accountType) && !isManagedSubAccount(user) && (
                        <div style={{ background: '#fff3cd', color: '#856404', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #ffeeba' }}>
                            ⚠️ Your profile is incomplete. Please complete it to view matches.
                            <button onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                setIsCompletionModalOpen(true);
                            }} style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#856404', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Complete Now</button>
                        </div>
                    )}
                </div>

                {/* Detailed Profile Completion Modal — not shown for Matchmaker accounts */}
                {isCompletionModalOpen && !isBasicProfileOnlyAccountType(user?.accountType) && !isManagedSubAccount(user) && (
                    <div
                        className="modal-overlay active profile-completion-overlay"
                        style={{ zIndex: 1000, alignItems: 'stretch', justifyContent: 'stretch', padding: 0 }}
                    >
                        <div
                            ref={profileCompletionModalScrollRef}
                            className="modal profile-completion-modal-full"
                        >
                            <button className="modal-close" onClick={() => setIsCompletionModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>{profileCompleted ? 'Edit Detailed Profile' : 'Complete Your Profile'}</h2>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Please provide accurate information to find the best match.</p>
                            </div>
                            <div className="modal-body">
                                <ProfileCompletionForm
                                    scrollContainerRef={profileCompletionModalScrollRef}
                                    onClose={() => setIsCompletionModalOpen(false)}
                                    onComplete={() => {
                                        setProfileCompleted(true);
                                        setProfileFetched(false); // Allow re-fetch
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Basic Profile Modal */}
                {isEditModalOpen && (
                    <div className="modal-overlay active">
                        <div className="modal">
                            <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>Edit Basic Details</h2>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    try {
                                        const fn = editForm.firstName.trim();
                                        const ln = editForm.lastName.trim();
                                        const em = editForm.email.trim();
                                        if (fn.length > AUTH_FIELD_MAX_LENGTH || ln.length > AUTH_FIELD_MAX_LENGTH) {
                                            showToast(`First and last name cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters each.`, 'error');
                                            return;
                                        }
                                        if (em.length > AUTH_FIELD_MAX_LENGTH) {
                                            showToast(`Email cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters.`, 'error');
                                            return;
                                        }
                                        const phoneErr = sriLankanPhoneFormatErrorIfInvalid(editForm.phone, 'Phone number');
                                        const whatsappErr = sriLankanPhoneFormatErrorIfInvalid(editForm.whatsapp, 'WhatsApp number');
                                        if (phoneErr) {
                                            showToast(phoneErr, 'error');
                                            return;
                                        }
                                        if (whatsappErr) {
                                            showToast(whatsappErr, 'error');
                                            return;
                                        }

                                        const canonicalNow = canonicalSriLankanPhoneDigits(editForm.phone);
                                        const phoneNeedsVerify = canonicalNow !== editModalPhoneBaselineCanonical;
                                        if (phoneNeedsVerify && phoneVerifiedCanonical !== canonicalNow) {
                                            showToast(
                                                'Verify your new phone number with the WhatsApp code sent to that number before saving.',
                                                'error'
                                            );
                                            return;
                                        }

                                        const token = getStoredToken();
                                        if (!token || !user?.id) {
                                            throw new Error('Please login again to save changes');
                                        }

                                        // Fetch existing profile first, then patch only basic details so we don't wipe other fields.
                                        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
                                        const profileRes = await fetch(`${apiBase}/Matrimonial/GetProfile?userId=${user.id}`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        const profileJson = profileRes.ok ? await profileRes.json() : null;
                                        const existing = (profileJson?.result || {}) as Record<string, unknown>;
                                        const {
                                            CountryOfOrigin: _stripCo,
                                            CountryOfResidence: _stripCr,
                                            CityOfResidence: _stripCity,
                                            ResidencyStatus: _stripRs,
                                            ...existingRest
                                        } = existing;

                                        const updatePayload = {
                                            ...existingRest,
                                            userId: Number(user.id),
                                            gender:
                                                editForm.gender ||
                                                (existing.gender as string) ||
                                                (existing.Gender as string) ||
                                                '',
                                            dateOfBirth: editForm.dob ? `${editForm.dob}T00:00:00` : null,
                                            countryOfOrigin: String(
                                                existing.countryOfOrigin ?? existing.CountryOfOrigin ?? ''
                                            ).trim(),
                                            countryOfResidence: String(
                                                existing.countryOfResidence ?? existing.CountryOfResidence ?? ''
                                            ).trim(),
                                            cityOfResidence: String(
                                                existing.cityOfResidence ?? existing.CityOfResidence ?? ''
                                            ).trim(),
                                            residencyStatus: String(
                                                existing.residencyStatus ?? existing.ResidencyStatus ?? ''
                                            ).trim(),
                                        };

                                        const updateRes = await fetch(`${apiBase}/Matrimonial/UpdateProfile`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify(updatePayload)
                                        });

                                        const updateBody = (await updateRes.json().catch(() => ({}))) as Record<
                                            string,
                                            unknown
                                        > & { message?: string; Message?: string };
                                        const updMsgFail =
                                            (typeof updateBody.message === 'string' && updateBody.message.trim()) ||
                                            (typeof updateBody.Message === 'string' && updateBody.Message.trim()) ||
                                            '';
                                        if (!updateRes.ok) {
                                            throw new Error(updMsgFail || 'Failed to update profile');
                                        }
                                        const updBiz = apiResponseBusinessCode(updateBody);
                                        if (typeof updBiz === 'number' && updBiz !== 200 && updBiz !== 1) {
                                            throw new Error(updMsgFail || 'Failed to update profile.');
                                        }

                                        const myProfileRes = await fetch(`${apiBase}/User/UpdateMyProfile`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                                firstName: editForm.firstName,
                                                lastName: editForm.lastName,
                                                email: editForm.email,
                                                mobileNumber: editForm.phone,
                                                whatsApp: editForm.whatsapp,
                                            }),
                                        });
                                        const myProfileJson = (await myProfileRes.json().catch(() => ({}))) as Record<
                                            string,
                                            unknown
                                        > & { message?: string; Message?: string };
                                        if (!apiResponseIndicatesSuccess(myProfileJson, myProfileRes.ok)) {
                                            const msgCandidate =
                                                (typeof myProfileJson.message === 'string' && myProfileJson.message.trim()) ||
                                                (typeof myProfileJson.Message === 'string' && myProfileJson.Message.trim());
                                            throw new Error(
                                                msgCandidate || 'Failed to save your account details.',
                                            );
                                        }

                                        updateUser({
                                            firstName: editForm.firstName,
                                            lastName: editForm.lastName,
                                            dob: editForm.dob,
                                            gender: editForm.gender,
                                            phone: editForm.phone,
                                            whatsapp: editForm.whatsapp,
                                        });
                                        setProfileFetched(false);
                                        setIsEditModalOpen(false);
                                        showToast('Your details were saved.', 'success');
                                    } catch (error) {
                                        showToast(error instanceof Error ? error.message : 'Failed to save changes', 'error');
                                    }
                                }}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>First Name</label>
                                            <input type="text" name="firstName" value={editForm.firstName} maxLength={AUTH_FIELD_MAX_LENGTH} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Last Name</label>
                                            <input type="text" name="lastName" value={editForm.lastName} maxLength={AUTH_FIELD_MAX_LENGTH} onChange={handleEditChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>National ID / Passport</label>
                                        <input
                                            type="text"
                                            name="nic"
                                            value={editForm.nic}
                                            disabled
                                            title="Cannot be changed here"
                                            style={{ backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Date of Birth</label>
                                            <input
                                                type="date"
                                                name="dob"
                                                value={editForm.dob}
                                                disabled
                                                title="Cannot be changed here"
                                                style={{ backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Gender</label>
                                            <select
                                                name="gender"
                                                value={editForm.gender}
                                                disabled
                                                title="Cannot be changed here"
                                                style={{ backgroundColor: '#f1f5f9', color: '#475569', cursor: 'not-allowed' }}
                                            >
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} />
                                        {(() => {
                                            const cNow = canonicalSriLankanPhoneDigits(editForm.phone);
                                            const needsVerify = cNow !== editModalPhoneBaselineCanonical;
                                            if (!needsVerify || !editForm.phone.trim()) return null;
                                            const verified = phoneVerifiedCanonical === cNow;
                                            const phoneInvalid = !!sriLankanPhoneFormatErrorIfInvalid(editForm.phone, 'Phone number');
                                            return (
                                                <div style={{ marginTop: '0.6rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#334155' }}>
                                                        {verified
                                                            ? 'New number verified. You can save your changes.'
                                                            : 'A 6-digit code is sent to this number on WhatsApp. Confirm it before you save.'}
                                                    </p>
                                                    {!verified && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                disabled={phoneChangeBusy !== null || phoneInvalid}
                                                                onClick={async () => {
                                                                    setPhoneChangeBusy('send');
                                                                    try {
                                                                        await matrimonialService.requestPhoneChangeOtp(editForm.phone);
                                                                        showToast('Code sent to the new number on WhatsApp.', 'success');
                                                                    } catch (err) {
                                                                        showToast(err instanceof Error ? err.message : 'Could not send code', 'error');
                                                                    } finally {
                                                                        setPhoneChangeBusy(null);
                                                                    }
                                                                }}
                                                            >
                                                                {phoneChangeBusy === 'send' ? 'Sending…' : 'Send WhatsApp code'}
                                                            </button>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                autoComplete="one-time-code"
                                                                placeholder="6-digit code"
                                                                value={phoneChangeCode}
                                                                onChange={(e) => setPhoneChangeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                                style={{ width: '7.5rem', padding: '0.35rem 0.5rem' }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-primary"
                                                                disabled={phoneChangeBusy !== null || phoneChangeCode.length !== 6}
                                                                onClick={async () => {
                                                                    setPhoneChangeBusy('confirm');
                                                                    try {
                                                                        const res = await matrimonialService.confirmPhoneChange(phoneChangeCode);
                                                                        const raw = res.result?.phoneNumber ?? '';
                                                                        setPhoneVerifiedCanonical(canonicalSriLankanPhoneDigits(raw || editForm.phone));
                                                                        if (raw) {
                                                                            setEditForm((p) => ({ ...p, phone: raw }));
                                                                        }
                                                                        updateUser({ phone: raw || editForm.phone });
                                                                        showToast(res.message || 'Phone number verified.', 'success');
                                                                        setPhoneChangeCode('');
                                                                    } catch (err) {
                                                                        showToast(err instanceof Error ? err.message : 'Invalid code', 'error');
                                                                    } finally {
                                                                        setPhoneChangeBusy(null);
                                                                    }
                                                                }}
                                                            >
                                                                {phoneChangeBusy === 'confirm' ? 'Checking…' : 'Confirm'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="form-group">
                                        <label>WhatsApp Number</label>
                                        <input type="tel" name="whatsapp" value={editForm.whatsapp} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" name="email" value={editForm.email} maxLength={AUTH_FIELD_MAX_LENGTH} onChange={handleEditChange} disabled style={{ backgroundColor: '#f0f0f0' }} />
                                    </div>
                                    <div className="form-group">
                                        <label>Account Type</label>
                                        <input type="text" name="accountType" value={editForm.accountType} onChange={handleEditChange} disabled style={{ backgroundColor: '#f0f0f0' }} />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save Changes</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                    <div className="profile-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
                        <div className="profile-avatar" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', overflow: 'hidden' }}>
                            {user.profilePhoto ? (
                                <img src={user.profilePhoto} alt={`${user.firstName} ${user.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span>{user.firstName[0]}{user.lastName[0]}</span>
                            )}
                        </div>
                        <div>
                            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.8rem' }}>{user.firstName} {user.lastName}</h2>
                            <p style={{ color: '#666', marginBottom: '0.5rem' }}>{user.email}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="badge" style={{ background: '#eef2ff', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                    {displayMatrimonialAccountType(user.accountType) || 'Free Member'}
                                </span>
                                {user.isSubscribed ? (
                                    <span className="badge" style={{ background: '#047857', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        ✓ {profilePlanBadgeLabel({
                                            accountType: user.accountType,
                                            isSubscribed: user.isSubscribed,
                                            matchmakerTier: user.matchmakerTier,
                                            subscriptionCancelled: user.subscriptionCancelled,
                                        })}
                                    </span>
                                ) : bankPremiumAwaitingApproval ? (
                                    <span
                                        className="badge"
                                        style={{
                                            background: '#fffbeb',
                                            color: '#b45309',
                                            padding: '0.4rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            border: '1px solid #fcd34d',
                                        }}
                                    >
                                        {profilePlanBadgeLabel({
                                            accountType: user.accountType,
                                            isSubscribed: false,
                                            matchmakerTier: user.matchmakerTier,
                                            pendingApproval: true,
                                        })}
                                    </span>
                                ) : (
                                    <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        {profilePlanBadgeLabel({
                                            accountType: user.accountType,
                                            isSubscribed: false,
                                            matchmakerTier: user.matchmakerTier,
                                        })}
                                    </span>
                                )}
                                {user.isSubscribed && subscriptionRemainingDisplay ? (
                                    <span
                                        className="badge"
                                        style={{
                                            background: subscriptionRemainingInfo?.expired ? '#fef2f2' : '#fff7ed',
                                            color: subscriptionRemainingInfo?.expired ? '#b91c1c' : '#c2410c',
                                            padding: '0.4rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            fontWeight: 600,
                                            border: '1px solid #fed7aa',
                                        }}
                                        title={
                                            subscriptionRemainingDisplay.secondary
                                                ? `${subscriptionRemainingDisplay.primary} · ${subscriptionRemainingDisplay.secondary}`
                                                : subscriptionRemainingDisplay.primary
                                        }
                                    >
                                        {subscriptionRemainingDisplay.primary}
                                    </span>
                                ) : null}
                                {isBasicProfileOnlyAccountType(user.accountType) ? null : profileCompleted ? (
                                    <span className="badge" style={{ background: '#e6fffa', color: '#047857', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Profile Verified
                                    </span>
                                ) : (
                                    <span className="badge" style={{ background: '#fff3cd', color: '#856404', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Incomplete Profile
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {bankPremiumAwaitingApproval && (
                        <div
                            role="status"
                            style={{
                                marginBottom: '1.5rem',
                                padding: '1rem 1.25rem',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                border: '1px solid #fcd34d',
                                color: '#92400e',
                            }}
                        >
                            <strong style={{ display: 'block', marginBottom: '0.35rem' }}>Bank transfer under review</strong>
                            <span style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>
                                We received your payment slip. Our team will verify it and activate your premium access. This usually doesn&apos;t take long —
                                you can keep using the site on the free plan until then.
                            </span>
                        </div>
                    )}

                    <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.firstName} {user.lastName}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phone</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.phone || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>WhatsApp</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.whatsapp || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>NIC / Passport</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.nic || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Date of Birth</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.dob ? (() => {
                                const parts = user.dob!.split('-');
                                if (parts.length === 3) {
                                    const [y, m, d] = parts;
                                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
                                }
                                return user.dob;
                            })() : '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Gender</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.gender || '-'}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account Status</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem', color: 'green' }}>Active</div>
                        </div>
                        {(user.horoscopeDocument || user.horoscopeDocument2 || user.horoscopeDocument3) && (
                            <div className="detail-group">
                                <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Horoscope</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
                                    {user.horoscopeDocument ? (
                                        <button
                                            type="button"
                                            onClick={() => setHoroscopeViewSrc(user.horoscopeDocument!)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                color: 'var(--primary)',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                fontSize: '1.05rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            View Horoscope — page 1
                                        </button>
                                    ) : null}
                                    {user.horoscopeDocument2 ? (
                                        <button
                                            type="button"
                                            onClick={() => setHoroscopeViewSrc(user.horoscopeDocument2!)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                color: 'var(--primary)',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                fontSize: '1.05rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            View Horoscope — page 2
                                        </button>
                                    ) : null}
                                    {user.horoscopeDocument3 ? (
                                        <button
                                            type="button"
                                            onClick={() => setHoroscopeViewSrc(user.horoscopeDocument3!)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                color: 'var(--primary)',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                                fontSize: '1.05rem',
                                                fontWeight: 500,
                                            }}
                                        >
                                            View Horoscope — page 3
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="profile-actions" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {!isFamilyParentAccountType(user.accountType) && (
                            <button className="btn btn-primary" onClick={() => openModal('subscription')}>Upgrade Membership</button>
                        )}
                        {!isBasicProfileOnlyAccountType(user.accountType) && !isManagedSubAccount(user) && (
                            <button className="btn btn-outline" onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                setIsCompletionModalOpen(true);
                            }}>Edit Detailed Profile</button>
                        )}
                        {user.accountType !== 'Matchmaker' && user?.id && (
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() =>
                                    openModal('profile', undefined, {
                                        userId: Number(user.id),
                                        firstName: user.firstName,
                                        lastName: user.lastName,
                                        profilePhoto: user.profilePhoto,
                                        gender: user.gender,
                                        viewAsOthers: true,
                                    })
                                }
                            >
                                View as others see
                            </button>
                        )}
                        <button className="btn btn-outline" onClick={() => {
                            if (user?.isVerified === false) {
                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                return;
                            }
                            setIsEditModalOpen(true);
                        }}>Edit Basic Details</button>
                        <button
                            className="btn btn-outline"
                            onClick={() => {
                                setIsSettingsOpen(prev => {
                                    const next = !prev;
                                    if (next) {
                                        // Defer the scroll until the panel has actually rendered.
                                        window.setTimeout(() => {
                                            document.getElementById('user-settings-panel')
                                                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 60);
                                    }
                                    return next;
                                });
                            }}
                            aria-expanded={isSettingsOpen}
                            aria-controls="user-settings-panel"
                        >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                {isSettingsOpen ? 'Hide Settings' : 'Settings'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* ─── Settings Panel ─────────────────────────────────────────── */}
                {isSettingsOpen && (
                    <div
                        id="user-settings-panel"
                        className="profile-card"
                        style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}
                    >
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Settings</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Manage how you appear on the site, what you receive, and your account.</p>

                        {/* Account & Privacy */}
                        <section style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>Privacy</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <label
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.85rem 1rem',
                                        background: '#FDF8F3',
                                        borderRadius: '10px',
                                        cursor: isSavingPrivacyPref ? 'wait' : 'pointer',
                                        opacity: isSavingPrivacyPref ? 0.7 : 1,
                                    }}
                                >
                                    <span>
                                        <span style={{ display: 'block', fontWeight: 500 }}>Show my profile in browse results</span>
                                        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>
                                            {isSavingPrivacyPref
                                                ? 'Saving…'
                                                : 'Turn off to temporarily hide your profile from other members.'}
                                        </span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={prefs.showInBrowse}
                                        disabled={isSavingPrivacyPref}
                                        onChange={(e) => void handlePrivacyPreferenceChange({ showInBrowse: e.target.checked })}
                                        style={{ width: 18, height: 18 }}
                                    />
                                </label>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.85rem 1rem',
                                        background: '#FDF8F3',
                                        borderRadius: '10px',
                                        opacity: isSavingPrivacyPref ? 0.7 : 1,
                                    }}
                                >
                                    <span>
                                        <span style={{ display: 'block', fontWeight: 500 }}>Who can see my profile photo</span>
                                        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>
                                            {isSavingPrivacyPref
                                                ? 'Saving…'
                                                : 'Restrict your photo to premium members for added privacy.'}
                                        </span>
                                    </span>
                                    <select
                                        value={prefs.photoVisibility}
                                        disabled={isSavingPrivacyPref}
                                        onChange={(e) => void handlePrivacyPreferenceChange({
                                            photoVisibility: e.target.value as 'everyone' | 'premium',
                                        })}
                                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '0.9rem' }}
                                    >
                                        <option value="everyone">Everyone</option>
                                        <option value="premium">Premium members only</option>
                                    </select>
                                </div>
                                {canManageContactVisibilityPref && (
                                    <label
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.85rem 1rem',
                                            background: '#FDF8F3',
                                            borderRadius: '10px',
                                            cursor: isSavingContactVisibilityPref ? 'wait' : 'pointer',
                                            opacity: isSavingContactVisibilityPref ? 0.7 : 1,
                                        }}
                                    >
                                        <span>
                                            <span style={{ display: 'block', fontWeight: 500 }}>
                                                Show contact details to eligible viewers
                                            </span>
                                            <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>
                                                {isSavingContactVisibilityPref
                                                    ? 'Saving…'
                                                    : 'Phone, WhatsApp, and email stay masked when this is off — even for premium members who could normally view contacts.'}
                                            </span>
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={user.showContactInformation !== false}
                                            disabled={isSavingContactVisibilityPref}
                                            onChange={(e) => void handleShowContactInformationToggle(e.target.checked)}
                                            style={{ width: 18, height: 18 }}
                                            aria-label="Show contact details to eligible viewers"
                                        />
                                    </label>
                                )}
                            </div>
                        </section>

                        {/* Notifications */}
                        <section style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>Notifications</h4>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#FDF8F3', borderRadius: '10px', cursor: isSavingEmailPref ? 'wait' : 'pointer', opacity: isSavingEmailPref ? 0.7 : 1 }}>
                                <span>
                                    <span style={{ display: 'block', fontWeight: 500 }}>Email me when someone shows interest</span>
                                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>
                                        {isSavingEmailPref
                                            ? 'Saving…'
                                            : prefs.emailNotifications
                                              ? 'Turn off to unsubscribe from interest emails. In-app notifications are unaffected.'
                                              : 'You are unsubscribed from interest emails. Turn on to receive them again.'}
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={prefs.emailNotifications}
                                    disabled={isSavingEmailPref}
                                    onChange={(e) => handleEmailNotificationToggle(e.target.checked)}
                                    style={{ width: 18, height: 18 }}
                                />
                            </label>
                        </section>

                        {/* Preferences */}
                        <section style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>Preferences</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#FDF8F3', borderRadius: '10px' }}>
                                <span>
                                    <span style={{ display: 'block', fontWeight: 500 }}>Language</span>
                                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>Used across the site interface.</span>
                                </span>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as 'en' | 'si')}
                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '0.9rem' }}
                                >
                                    <option value="en">English</option>
                                    <option value="si">සිංහල</option>
                                </select>
                            </div>
                        </section>

                        {/* Subscription */}
                        <section style={{ marginBottom: '2rem' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>Subscription</h4>
                            {isFamilyParentAccount ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: user.isSubscribed ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#FDF8F3', borderRadius: '10px', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: user.isSubscribed ? '#7c2d12' : '#374151' }}>
                                            {user.isSubscribed ? 'Premium — active' : 'Free plan'}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                                            Pay for a sub-account slot to activate premium on your account. Create a managed profile when ready — premium also applies to each managed profile.
                                        </div>
                                        {user.isSubscribed && subscriptionRemainingDisplay ? (
                                            <div style={{ color: '#92400e', fontSize: '0.88rem', marginTop: 8, lineHeight: 1.45 }}>
                                                <strong style={{ fontSize: '0.95rem' }}>
                                                    {subscriptionRemainingDisplay.primary}
                                                </strong>
                                                {subscriptionRemainingDisplay.secondary ? (
                                                    <span style={{ display: 'block', marginTop: 4, color: '#b45309' }}>
                                                        {subscriptionRemainingDisplay.secondary}
                                                        {' · '}
                                                        {subscriptionPeriodLabel}
                                                    </span>
                                                ) : (
                                                    <span style={{ marginLeft: 6 }}>({subscriptionPeriodLabel})</span>
                                                )}
                                            </div>
                                        ) : null}
                                        <div style={{ color: '#92400e', fontSize: '0.88rem', marginTop: 8 }}>
                                            {subSlotsRemaining > 0
                                                ? `${subSlotsRemaining} slot(s) ready to create · ${subSlotsConsumed}/${subSlotsPurchased} used`
                                                : subSlotsPurchased > 0
                                                  ? `All ${subSlotsPurchased} slot(s) used — pay for another slot to add more profiles`
                                                  : 'No sub-account slots yet — pay below to add your first managed profile'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => {
                                            if (canCreateManagedSubAccount) {
                                                setIsCreateSubAccountModalOpen(true);
                                            } else {
                                                openSubAccountPackageModal();
                                            }
                                        }}
                                    >
                                        {canCreateManagedSubAccount ? 'Create sub-account' : 'Pay for sub-account slot'}
                                    </button>
                                </div>
                            ) : user.accountType === 'Matchmaker' ? (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: user.isSubscribed ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : bankPremiumAwaitingApproval ? '#fffbeb' : '#FDF8F3', borderRadius: '10px', flexWrap: 'wrap', border: bankPremiumAwaitingApproval && !user.isSubscribed ? '1px solid #fcd34d' : undefined }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: user.isSubscribed ? '#7c2d12' : bankPremiumAwaitingApproval ? '#b45309' : '#374151' }}>
                                            {user.isSubscribed
                                                ? user.subscriptionCancelled
                                                    ? `${formatMatchmakerTierName(user.matchmakerTier) || 'Matchmaker'} — cancelled`
                                                    : `${formatMatchmakerTierName(user.matchmakerTier) || 'Matchmaker'} — active`
                                                : bankPremiumAwaitingApproval
                                                    ? 'Matchmaker — payment pending approval'
                                                    : 'Matchmaker Free'}
                                        </div>
                                        <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                                            {user.isSubscribed
                                                ? user.subscriptionCancelled
                                                    ? 'Your subscription is cancelled, but your plan stays active until the end of your paid period. Reactivate any time before then.'
                                                    : user.matchmakerTier?.toUpperCase() === 'GOLD'
                                                    ? '50 full-detail profile views per day. Up to 5 client profiles.'
                                                    : user.matchmakerTier?.toUpperCase() === 'DIAMOND'
                                                        ? 'Unlimited full-detail views. Up to 10 client profiles.'
                                                        : 'Paid matchmaker subscription active.'
                                                : bankPremiumAwaitingApproval
                                                    ? 'Your bank transfer slip is being reviewed. We will activate Gold or Diamond as soon as the payment is verified.'
                                                    : 'Browse basic listings only — no contacts, messaging, or client profiles until you upgrade.'}
                                        </div>
                                        {user.isSubscribed && subscriptionRemainingDisplay ? (
                                            <div style={{ color: '#92400e', fontSize: '0.88rem', marginTop: 8, lineHeight: 1.45 }}>
                                                <strong style={{ fontSize: '0.95rem' }}>
                                                    {subscriptionRemainingDisplay.primary}
                                                </strong>
                                                {subscriptionRemainingDisplay.secondary ? (
                                                    <span style={{ display: 'block', marginTop: 4, color: '#b45309' }}>
                                                        {subscriptionRemainingDisplay.secondary}
                                                        {' · '}
                                                        {subscriptionPeriodLabel}
                                                    </span>
                                                ) : (
                                                    <span style={{ marginLeft: 6 }}>({subscriptionPeriodLabel})</span>
                                                )}
                                            </div>
                                        ) : user.isSubscribed ? (
                                            <div style={{ color: '#92400e', fontSize: '0.82rem', marginTop: 8 }}>
                                                Premium active ({subscriptionPeriodLabel})
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {user.isSubscribed && user.subscriptionCancelled ? (
                                            <button
                                                type="button"
                                                onClick={handleReactivateSubscription}
                                                disabled={isReactivatingSubscription}
                                                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #047857', background: '#047857', color: 'white', fontWeight: 600, cursor: isReactivatingSubscription ? 'not-allowed' : 'pointer', opacity: isReactivatingSubscription ? 0.7 : 1 }}
                                            >
                                                {isReactivatingSubscription ? 'Reactivating…' : 'Reactivate subscription'}
                                            </button>
                                        ) : user.isSubscribed ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowCancelSubscriptionModal(true)}
                                                disabled={isCancellingSubscription}
                                                style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #d97706', background: 'white', color: '#b45309', fontWeight: 600, cursor: isCancellingSubscription ? 'not-allowed' : 'pointer', opacity: isCancellingSubscription ? 0.7 : 1 }}
                                            >
                                                {isCancellingSubscription ? 'Cancelling…' : 'Cancel subscription'}
                                            </button>
                                        ) : bankPremiumAwaitingApproval ? (
                                            <span style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>Awaiting verification</span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() => openModal('subscription')}
                                            >
                                                Upgrade plan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: user?.isSubscribed ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : bankPremiumAwaitingApproval ? '#fffbeb' : '#FDF8F3', borderRadius: '10px', flexWrap: 'wrap', border: bankPremiumAwaitingApproval && !user?.isSubscribed ? '1px solid #fcd34d' : undefined }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: user?.isSubscribed ? '#7c2d12' : bankPremiumAwaitingApproval ? '#b45309' : '#374151' }}>
                                        {user?.isSubscribed ? (user.subscriptionCancelled ? 'Premium plan — cancelled' : 'Premium plan — active') : bankPremiumAwaitingApproval ? 'Premium — payment pending approval' : 'Free plan'}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                                        {user?.isSubscribed
                                            ? user.subscriptionCancelled
                                                ? 'Your subscription is cancelled, but premium features stay active until the end of your paid period. Reactivate any time before then.'
                                                : 'You enjoy unlimited messaging and premium visibility.'
                                            : bankPremiumAwaitingApproval
                                                ? 'Your bank transfer slip is being reviewed. Premium benefits turn on once our team approves the payment.'
                                                : 'Upgrade to unlock unlimited messaging and the premium gold badge.'}
                                    </div>
                                    {user?.isSubscribed && subscriptionRemainingDisplay ? (
                                        <div style={{ color: '#92400e', fontSize: '0.88rem', marginTop: 8, lineHeight: 1.45 }}>
                                            <strong style={{ fontSize: '0.95rem' }}>
                                                {subscriptionRemainingDisplay.primary}
                                            </strong>
                                            {subscriptionRemainingDisplay.secondary ? (
                                                <span style={{ display: 'block', marginTop: 4, color: '#b45309' }}>
                                                    {subscriptionRemainingDisplay.secondary}
                                                    {' · '}
                                                    {subscriptionPeriodLabel}
                                                </span>
                                            ) : (
                                                <span style={{ marginLeft: 6 }}>({subscriptionPeriodLabel})</span>
                                            )}
                                        </div>
                                    ) : user?.isSubscribed ? (
                                        <div style={{ color: '#92400e', fontSize: '0.82rem', marginTop: 8 }}>
                                            Premium active ({subscriptionPeriodLabel})
                                        </div>
                                    ) : null}
                                </div>
                                {user?.isSubscribed && user.subscriptionCancelled ? (
                                    <button
                                        type="button"
                                        onClick={handleReactivateSubscription}
                                        disabled={isReactivatingSubscription}
                                        style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #047857', background: '#047857', color: 'white', fontWeight: 600, cursor: isReactivatingSubscription ? 'not-allowed' : 'pointer', opacity: isReactivatingSubscription ? 0.7 : 1 }}
                                    >
                                        {isReactivatingSubscription ? 'Reactivating…' : 'Reactivate subscription'}
                                    </button>
                                ) : user?.isSubscribed ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowCancelSubscriptionModal(true)}
                                        disabled={isCancellingSubscription}
                                        style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #d97706', background: 'white', color: '#b45309', fontWeight: 600, cursor: isCancellingSubscription ? 'not-allowed' : 'pointer', opacity: isCancellingSubscription ? 0.7 : 1 }}
                                    >
                                        {isCancellingSubscription ? 'Cancelling…' : 'Cancel subscription'}
                                    </button>
                                ) : bankPremiumAwaitingApproval ? (
                                    <span style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#92400e' }}>Awaiting verification</span>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => openModal('subscription')}
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                            )}
                        </section>

                        {/* Danger zone */}
                        <section>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: '#b91c1c' }}>Danger zone</h4>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#7f1d1d' }}>Delete my account</div>
                                    <div style={{ color: '#9f1239', fontSize: '0.85rem', marginTop: 2 }}>
                                        Permanently removes your profile, messages, saved profiles, notifications and any client profiles you manage. This cannot be undone.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setDeleteAccountConfirm(''); setShowDeleteAccountModal(true); }}
                                    style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #b91c1c', background: '#b91c1c', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Delete account
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {/* Cancel subscription confirmation */}
                {showCancelSubscriptionModal && (
                    <div
                        className="modal-overlay active"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-subscription-title"
                        style={{ zIndex: 1100 }}
                    >
                        <div className="modal" style={{ maxWidth: '480px', width: '95%' }}>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => !isCancellingSubscription && setShowCancelSubscriptionModal(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                            <div className="modal-header">
                                <h2 id="cancel-subscription-title" style={{ color: '#92400e' }}>
                                    Cancel your subscription?
                                </h2>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '1rem', color: '#374151', lineHeight: 1.55 }}>
                                    {user?.subscriptionIsLifetime
                                        ? 'You will lose premium benefits immediately. You can subscribe again whenever you like.'
                                        : 'You will keep your premium benefits until the end of your current paid period, and you can reactivate any time before then. After the period ends, premium features turn off until you subscribe again.'}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setShowCancelSubscriptionModal(false)}
                                        disabled={isCancellingSubscription}
                                    >
                                        Keep subscription
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmCancelSubscription}
                                        disabled={isCancellingSubscription}
                                        style={{
                                            padding: '0.6rem 1.1rem',
                                            borderRadius: '8px',
                                            border: '1px solid #b45309',
                                            background: isCancellingSubscription ? '#fde68a' : 'white',
                                            color: '#92400e',
                                            fontWeight: 600,
                                            cursor: isCancellingSubscription ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isCancellingSubscription ? 'Cancelling…' : 'Yes, cancel subscription'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete-account confirmation modal */}
                {showDeleteAccountModal && (
                    <div
                        className="modal-overlay active"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-account-title"
                        style={{ zIndex: 1100 }}
                    >
                        <div className="modal" style={{ maxWidth: '480px', width: '95%' }}>
                            <button className="modal-close" onClick={() => !isDeletingAccount && setShowDeleteAccountModal(false)} aria-label="Close">✕</button>
                            <div className="modal-header">
                                <h2 id="delete-account-title" style={{ color: '#b91c1c' }}>Delete account?</h2>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '1rem', color: '#374151' }}>
                                    This will permanently delete <strong>your profile</strong>, your messages, saved/favourited profiles, notifications
                                    {user?.accountType === 'Matchmaker' ? ', and every client profile you manage.' : '.'}
                                </p>
                                <p style={{ marginBottom: '1rem', color: '#374151' }}>
                                    This action <strong>cannot be undone</strong>. To proceed, type <code style={{ background: '#f3f4f6', padding: '0.1rem 0.4rem', borderRadius: 4 }}>DELETE</code> below.
                                </p>
                                <input
                                    type="text"
                                    value={deleteAccountConfirm}
                                    onChange={(e) => setDeleteAccountConfirm(e.target.value)}
                                    placeholder="Type DELETE to confirm"
                                    autoFocus
                                    aria-label="Type DELETE to confirm account deletion"
                                    style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '1rem', marginBottom: '1.25rem' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setShowDeleteAccountModal(false)}
                                        disabled={isDeletingAccount}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteOwnAccount}
                                        disabled={isDeletingAccount || deleteAccountConfirm.trim().toUpperCase() !== 'DELETE'}
                                        style={{
                                            padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none',
                                            background: (isDeletingAccount || deleteAccountConfirm.trim().toUpperCase() !== 'DELETE') ? '#fca5a5' : '#b91c1c',
                                            color: 'white', fontWeight: 600,
                                            cursor: (isDeletingAccount || deleteAccountConfirm.trim().toUpperCase() !== 'DELETE') ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isDeletingAccount ? 'Deleting…' : 'Delete forever'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <MatchmakerUpgradePackageModal
                    open={showMatchmakerUpgradeModal}
                    onClose={() => setShowMatchmakerUpgradeModal(false)}
                    packages={matchmakerUpgradePackagesList}
                    loading={loadingMatchmakerPackages}
                    title={
                        matchmakerClientLimitState === 'needs_plan'
                            ? 'Choose a Matchmaker plan'
                            : 'Upgrade to add more client profiles'
                    }
                    introLine={
                        matchmakerClientLimitState === 'needs_plan'
                            ? 'Choose a plan below. After payment you can create client profiles under your matchmaker account.'
                            : `You have used all ${matchmakerClientsMax} client profile slot(s). Choose a higher plan to add more profiles (up to ${matchmakerPlatformMaxClients}).`
                    }
                    onSelectPackage={handleSelectMatchmakerUpgradePackage}
                />

                <SubAccountPackagePickerModal
                    open={showSubAccountPackageModal}
                    onClose={() => setShowSubAccountPackageModal(false)}
                    packages={subAccountPackages}
                    loading={loadingSubAccountPackages}
                    bankAwaitingApproval={bankSubAccountAwaitingApproval}
                    introLine={
                        needsSubAccountPayment
                            ? 'Choose a package to pay for your first sub-account slot, then create a managed profile.'
                            : `You have used all ${subSlotsPurchased} slot(s). Choose a package to add another managed profile.`
                    }
                    onSelectPackage={handleSelectSubAccountPackage}
                />

                {isFamilyParentAccount && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Managed Accounts</h3>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        if (user?.isVerified === false) {
                                            window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                            return;
                                        }
                                        if (!canCreateManagedSubAccount) {
                                            openSubAccountPackageModal();
                                            return;
                                        }
                                        setIsCreateSubAccountModalOpen(true);
                                    }}
                                >
                                    Create Sub-Account
                                </button>
                            </div>
                        </div>
                        <p style={{ color: '#666', marginBottom: '1rem' }}>
                            {usesSubAccountSlots
                                ? `Sub-account packages from ${subAccountPriceLabel}${subSlotValidityMonths ? ` (from ${subSlotValidityMonths} month${subSlotValidityMonths === 1 ? '' : 's'} per profile)` : ''}. Pay first to activate premium on your account — ${subSlotsConsumed}/${subSlotsPurchased} slot(s) used. Premium also applies to each managed profile when created; expiry is shown per account below.`
                                : null}
                        </p>
                        {usesSubAccountSlots && !canCreateManagedSubAccount && (
                            <p style={{ color: '#92400e', fontSize: '0.88rem', marginBottom: '1rem', background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                {bankSubAccountAwaitingApproval
                                    ? 'Your bank transfer for a sub-account slot is pending admin approval.'
                                    : needsSubAccountPayment
                                        ? `Choose a sub-account package (from ${subAccountPriceLabel}) to unlock creating a managed profile.`
                                        : `You have used all ${subSlotsPurchased} sub-account slot(s). Pay for another slot to add more.`}
                            </p>
                        )}
                        {subAccounts.length > 3 ? (
                            <p className="managed-sub-accounts-scroll-hint">
                                Showing 3 accounts at a time — scroll to see all {subAccounts.length}.
                            </p>
                        ) : null}
                        <div className="managed-sub-accounts-scroll" style={{ marginBottom: '1.5rem' }}>
                            {subAccounts.length > 0 ? (
                                subAccounts.map((subAccount: any) => (
                                    <ManagedSubAccountActivityCard
                                        key={subAccount.id}
                                        subAccount={subAccount}
                                        activity={managedSubActivityFor(subAccount.id)}
                                        formatSubActivityTime={formatSubActivityTime}
                                        onInterestClick={goToSubAccountInterest}
                                        onMessagesClick={goToSubAccountMessages}
                                        onViewProfile={openManagedSubProfile}
                                        onEdit={openEditManagedSubProfile}
                                        onDelete={handleDeleteSubAccount}
                                        deletingSubAccountId={deletingSubAccountId}
                                        badgeKind="family-managed"
                                        managedByLabel={familyManagedByLabel}
                                        managerName={managerDisplayName}
                                        detailLine={`${subAccount.age ? `${subAccount.age} yrs` : '—'} • ${subAccount.cityOfResidence || subAccount.gender || 'Profile'} • ${subAccount.phoneNumber || '—'}`}
                                        subscriptionLine={formatSubAccountSubscription(subAccount)}
                                        footerLine="Listed in browse · Managed by you · No separate login"
                                    />
                                ))
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px', border: '1px dashed var(--cream-dark)' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '1.5rem' }}>
                                        +
                                    </div>
                                    <div>
                                        <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem', color: '#666' }}>No sub-accounts yet</h5>
                                        <p style={{ color: '#999', fontSize: '0.875rem' }}>Click the button above to create one.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Create managed profile — full basic + detailed form, no separate login */}
                {isCreateSubAccountModalOpen && user?.id && (
                    <div className="modal-overlay active managed-profile-modal-overlay">
                        <div className="modal managed-profile-modal">
                            <button className="modal-close" onClick={() => setIsCreateSubAccountModalOpen(false)} aria-label="Close">✕</button>
                            <div className="modal-header">
                                <h2>{user.accountType === 'Matchmaker' ? 'Add Client Profile' : 'Create Managed Profile'}</h2>
                                <p>
                                    Enter basic and detailed profile information in one step. The profile appears in browse with a managed-by label; messages and interest are delivered to your account.
                                </p>
                            </div>
                            <div ref={managedProfileModalScrollRef} className="modal-body">
                                <ProfileCompletionForm
                                    key={`managed-create-${user.id}-${managedProfileFormSession}`}
                                    managedCreate={managedCreateConfig}
                                    scrollContainerRef={managedProfileModalScrollRef}
                                    onClose={() => setIsCreateSubAccountModalOpen(false)}
                                    onComplete={() => {
                                        if (user?.id) {
                                            markManagedProfileDraftCompleted(Number(user.id));
                                        }
                                        setManagedProfileFormSession((s) => s + 1);
                                        setIsCreateSubAccountModalOpen(false);
                                        fetchSubAccounts();
                                        fetchManagedSubActivity();
                                        refreshFamilySubAccountSlots();
                                        if (user.accountType === 'Matchmaker') {
                                            const nextCount = (typeof user.matchmakerClientProfileCount === 'number'
                                                ? user.matchmakerClientProfileCount
                                                : subAccounts.length) + 1;
                                            updateUser?.({
                                                matchmakerClientProfileCount: nextCount,
                                                matchmakerCanAddClients: isMatchmakerPaidTier(user.matchmakerTier)
                                                    && nextCount < (user.matchmakerMaxClientProfiles ?? 0),
                                            });
                                        }
                                        showToast('Managed profile created successfully.', 'success');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {editingSubAccount && user?.id && (
                    <div className="modal-overlay active managed-profile-modal-overlay">
                        <div className="modal managed-profile-modal">
                            <button
                                className="modal-close"
                                onClick={() => setEditingSubAccount(null)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                            <div className="modal-header">
                                <h2>
                                    {user.accountType === 'Matchmaker'
                                        ? 'Edit Client Profile'
                                        : 'Edit Managed Profile'}
                                </h2>
                                <p>
                                    Update basic and detailed information for{' '}
                                    {[editingSubAccount.firstName, editingSubAccount.lastName].filter(Boolean).join(' ').trim() || 'this profile'}.
                                </p>
                            </div>
                            <div ref={managedProfileEditModalScrollRef} className="modal-body">
                                <ProfileCompletionForm
                                    key={`managed-edit-${editingSubAccount.id}-${managedEditFormSession}`}
                                    managedEdit={{
                                        parentUserId: Number(user.id),
                                        subUserId: editingSubAccount.id,
                                    }}
                                    scrollContainerRef={managedProfileEditModalScrollRef}
                                    onClose={() => setEditingSubAccount(null)}
                                    onComplete={() => {
                                        setEditingSubAccount(null);
                                        fetchSubAccounts();
                                        fetchManagedSubActivity();
                                        showToast('Managed profile updated successfully.', 'success');
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {isMatchmakerAccount && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                Your Client Profiles
                            </h3>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={matchmakerClientLimitState === 'absolute_max'}
                                onClick={() => {
                                    if (matchmakerClientLimitState === 'can_create') {
                                        if (user?.isVerified === false) {
                                            window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                            return;
                                        }
                                        setIsCreateSubAccountModalOpen(true);
                                        return;
                                    }
                                    if (
                                        matchmakerClientLimitState === 'needs_plan'
                                        || matchmakerClientLimitState === 'upgrade_for_more'
                                    ) {
                                        openMatchmakerUpgradeModal();
                                        return;
                                    }
                                }}
                            >
                                {matchmakerClientLimitState === 'can_create'
                                    ? '+ Add New Profile'
                                    : matchmakerClientLimitState === 'absolute_max'
                                        ? "Can't add more accounts"
                                        : matchmakerClientLimitState === 'upgrade_for_more'
                                            ? 'Upgrade for more profiles'
                                            : 'Upgrade to add clients'}
                            </button>
                        </div>
                        <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.95rem' }}>
                            {matchmakerClientsMax > 0
                                ? `Client profiles you create appear in browse with a matchmaker badge. Complete basic and detailed details in one step — no separate client login — ${matchmakerClientsUsed}/${matchmakerClientsMax} client profile slot(s) used. Messages and interest for each profile are grouped below.`
                                : 'Client profiles you create appear in browse with a matchmaker badge. Complete basic and detailed details in one step — no separate client login. Upgrade to a Matchmaker plan to add client profiles.'}
                        </p>
                        {matchmakerClientLimitState === 'needs_plan' && (
                            <p style={{ color: '#92400e', fontSize: '0.88rem', marginBottom: '1rem', background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                Choose a Matchmaker plan to unlock client profile slots.
                            </p>
                        )}
                        {matchmakerClientLimitState === 'upgrade_for_more' && (
                            <p style={{ color: '#92400e', fontSize: '0.88rem', marginBottom: '1rem', background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                You have used all {matchmakerClientsMax} client profile slot(s). Upgrade your plan to add more (up to {matchmakerPlatformMaxClients} profiles).
                            </p>
                        )}
                        {matchmakerClientLimitState === 'absolute_max' && (
                            <p style={{ color: '#92400e', fontSize: '0.88rem', marginBottom: '1rem', background: '#fffbeb', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                You have reached the maximum of {matchmakerClientsMax} client profile{matchmakerClientsMax === 1 ? '' : 's'} for your plan. Remove a profile to add another — you cannot add more accounts at this tier.
                            </p>
                        )}
                        {subAccounts.length > 3 ? (
                            <p className="managed-sub-accounts-scroll-hint">
                                Showing 3 accounts at a time — scroll to see all {subAccounts.length}.
                            </p>
                        ) : null}
                        <div className="managed-sub-accounts-scroll">
                            {subAccounts.length > 0 ? (
                                subAccounts.map((subAccount: any) => (
                                    <ManagedSubAccountActivityCard
                                        key={subAccount.id}
                                        subAccount={subAccount}
                                        activity={managedSubActivityFor(subAccount.id)}
                                        formatSubActivityTime={formatSubActivityTime}
                                        onInterestClick={goToSubAccountInterest}
                                        onMessagesClick={goToSubAccountMessages}
                                        onViewProfile={openManagedSubProfile}
                                        onEdit={openEditManagedSubProfile}
                                        onDelete={handleDeleteSubAccount}
                                        deletingSubAccountId={deletingSubAccountId}
                                        badgeKind="matchmaker-client"
                                        detailLine={`${subAccount.email || '—'}${subAccount.phoneNumber ? ` • ${subAccount.phoneNumber}` : ''}${subAccount.age ? ` • ${subAccount.age} years` : ''}`}
                                        footerLine="Listed in browse with matchmaker badge · Messages and interest grouped by client"
                                    />
                                ))
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', background: '#FDF8F3', borderRadius: '12px', border: '1px dashed var(--cream-dark)' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '1.5rem' }}>+</div>
                                    <div>
                                        <h5 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem', color: '#666' }}>No client profiles yet</h5>
                                        <p style={{ color: '#999', fontSize: '0.875rem' }}>Click "Add New Profile" above to create one for your client.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3>Recent Activity</h3>
                        {loadingSavedProfiles ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Loading activity…</p>
                        ) : recentActivity.length === 0 ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>No recent activity yet. Saved profiles and expressions of interest will appear here with the date and time.</p>
                        ) : (
                            <ul style={{ listStyle: 'none', margin: '1rem 0 0 0', padding: 0, maxHeight: '420px', overflowY: 'auto' }}>
                                {recentActivity.map((item) => (
                                    <li
                                        key={item.key}
                                        style={{
                                            padding: '0.85rem 0',
                                            borderBottom: '1px solid #eee',
                                            cursor: item.modalProfile ? 'pointer' : 'default',
                                        }}
                                        role={item.modalProfile ? 'button' : undefined}
                                        tabIndex={item.modalProfile ? 0 : undefined}
                                        onClick={() => {
                                            if (!item.modalProfile || user?.isVerified === false) {
                                                if (user?.isVerified === false) {
                                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                }
                                                return;
                                            }
                                            openModal('profile', undefined, item.modalProfile);
                                        }}
                                        onKeyDown={(e) => {
                                            if (!item.modalProfile) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (user?.isVerified === false) {
                                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                    return;
                                                }
                                                openModal('profile', undefined, item.modalProfile);
                                            }
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: '#333', fontSize: '0.95rem' }}>{item.title}</div>
                                        {item.detail ? (
                                            <div style={{ fontSize: '0.88rem', color: '#555', marginTop: '0.25rem', lineHeight: 1.4 }}>{item.detail}</div>
                                        ) : null}
                                        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.35rem' }}>{item.timeLabel || '—'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div
                        ref={interestedInYouSectionRef}
                        className="dashboard-card"
                        style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}
                    >
                        <h3 style={{ marginBottom: '0.25rem' }}>Interested in you</h3>
                        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
                            New interest notifications you have not acted on yet. After you respond, they move to Recent Activity.
                        </p>
                        {showInterestProfileTabs && (
                            <ManagedSubAccountTabBar
                                tabs={managedSubAccountTabs}
                                activeId={activeInterestSubAccountId}
                                onSelect={setActiveInterestSubAccountId}
                                countBySub={interestUnreadBySubAccount}
                                accountType={user?.accountType}
                            />
                        )}
                        {showInterestProfileTabs && activeInterestSubAccount ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                    margin: '0.75rem 0 0',
                                }}
                            >
                                <p
                                    style={{
                                        color: 'var(--primary, #ffa20d)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        margin: 0,
                                    }}
                                >
                                    {subAccountDisplayName(activeInterestSubAccount)}
                                </p>
                                {user?.accountType === 'Matchmaker' ? (
                                    <ClientProfileBadge variant="compact" />
                                ) : null}
                            </div>
                        ) : null}
                        {loadingSavedProfiles ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Loading list…</p>
                        ) : filteredIncomingInterestProfiles.length === 0 ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>
                                {showInterestProfileTabs && activeInterestSubAccount
                                    ? `No one has expressed interest in ${subAccountDisplayName(activeInterestSubAccount)} yet.`
                                    : 'No one has expressed interest yet. Complete your profile and browse members to get noticed.'}
                            </p>
                        ) : (
                            <>
                                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.75rem 0' }}>
                                    {filteredIncomingInterestProfiles.length} {filteredIncomingInterestProfiles.length === 1 ? 'person' : 'people'}
                                </p>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        maxHeight: '360px',
                                        overflowY: 'auto',
                                        paddingRight: '0.25rem',
                                    }}
                                >
                                    {filteredIncomingInterestProfiles.map((p) => (
                                        <div
                                            key={`incoming-interest-${p.userId ?? p.id}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                if (user?.isVerified === false) {
                                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                    return;
                                                }
                                                openModal('profile', undefined, p);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    if (user?.isVerified === false) {
                                                        window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                        return;
                                                    }
                                                    openModal('profile', undefined, p);
                                                }
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#fdf8f3', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8efe2'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#fdf8f3'; }}
                                            title={`View ${p.firstName} ${p.lastName}'s profile`}
                                        >
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0 }}>
                                                {p.profilePhoto ? (
                                                    <img src={p.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 700 }}>
                                                        {(p.firstName?.[0] || 'U')}{(p.lastName?.[0] || '')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 600, color: '#333' }}>{p.firstName} {p.lastName}</span>
                                                    {p.isInterestBack ? (
                                                        <span
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                letterSpacing: '0.02em',
                                                                color: '#047857',
                                                                background: '#d1fae5',
                                                                padding: '0.12rem 0.5rem',
                                                                borderRadius: '999px',
                                                            }}
                                                        >
                                                            Interest back
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div style={{ fontSize: '0.82rem', color: '#666' }}>{p.age || '-'} years • {p.cityOfResidence || 'Unknown'}</div>
                                                {p.interestedAtLabel ? (
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                                        {p.isInterestBack ? 'Latest activity ' : 'Interested '}
                                                        {p.interestedAtLabel}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <span style={{ color: '#bbb', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden>›</span>
                                        </div>
                                    ))}
                                </div>
                                {!isManagedSubAccount(user) && (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                                        onClick={() => router.push('/profiles')}
                                    >
                                        Browse profiles
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginBottom: '0.25rem' }}>Saved &amp; interest</h3>
                        <p style={{ color: '#666', fontSize: '0.875rem', margin: 0 }}>
                            Shortlist for later and members you clicked interest on. <strong>Mutual</strong> means they showed interest back.
                        </p>
                        {showInterestProfileTabs && (
                            <ManagedSubAccountTabBar
                                tabs={managedSubAccountTabs}
                                activeId={activeInterestSubAccountId}
                                onSelect={setActiveInterestSubAccountId}
                                countBySub={interactionCountBySubAccount}
                                accountType={user?.accountType}
                            />
                        )}
                        {showInterestProfileTabs && activeInterestSubAccount ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                    margin: '0.75rem 0 0',
                                }}
                            >
                                <p
                                    style={{
                                        color: 'var(--primary, #ffa20d)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        margin: 0,
                                    }}
                                >
                                    {subAccountDisplayName(activeInterestSubAccount)}
                                </p>
                                {user?.accountType === 'Matchmaker' ? (
                                    <ClientProfileBadge variant="compact" />
                                ) : null}
                            </div>
                        ) : null}
                        {loadingSavedProfiles ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Loading…</p>
                        ) : (
                            <>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '1.5rem',
                                        marginTop: '1rem',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem 0', color: '#374151' }}>
                                            Saved{filteredSavedProfiles.length > 0 ? ` (${filteredSavedProfiles.length})` : ''}
                                        </h4>
                                        {filteredSavedProfiles.length === 0 ? (
                                            <>
                                                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>
                                                    {showInterestProfileTabs && activeInterestSubAccount
                                                        ? `No saved profiles for ${subAccountDisplayName(activeInterestSubAccount)} yet.`
                                                        : "You haven't saved any profiles yet."}
                                                </p>
                                                {!isManagedSubAccount(user) &&
                                                    !(filteredSavedProfiles.length === 0 && filteredInterestProfiles.length === 0) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}
                                                        onClick={() => router.push('/profiles')}
                                                    >
                                                        Browse Profiles
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.75rem',
                                                    maxHeight: '320px',
                                                    overflowY: 'auto',
                                                    paddingRight: '0.25rem',
                                                }}
                                            >
                                                {filteredSavedProfiles.map((p) => (
                                                    <div
                                                        key={`saved-${p.userId ?? p.id}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            if (user?.isVerified === false) {
                                                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                                return;
                                                            }
                                                            openModal('profile', undefined, p);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                if (user?.isVerified === false) {
                                                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                                    return;
                                                                }
                                                                openModal('profile', undefined, p);
                                                            }
                                                        }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#fdf8f3', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8efe2'; }}
                                                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#fdf8f3'; }}
                                                        title={`View ${p.firstName} ${p.lastName}'s profile`}
                                                    >
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0 }}>
                                                            {p.profilePhoto ? (
                                                                <img src={p.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 700 }}>
                                                                    {(p.firstName?.[0] || 'U')}{(p.lastName?.[0] || '')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontWeight: 600, color: '#333' }}>{p.firstName} {p.lastName}</div>
                                                            <div style={{ fontSize: '0.82rem', color: '#666' }}>{p.age || '-'} years • {p.cityOfResidence || 'Unknown'}</div>
                                                            {p.savedAtLabel ? (
                                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Saved {p.savedAtLabel}</div>
                                                            ) : null}
                                                        </div>
                                                        <ProfileListRemoveButton
                                                            ariaLabel={`Remove ${p.firstName} ${p.lastName} from shortlist`}
                                                            removing={removingInteractionKey === `saved-${interactionProfileId(p)}`}
                                                            onRemove={(e) => handleRemoveFromShortlist(e, p)}
                                                        />
                                                        <span style={{ color: '#bbb', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden>›</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.75rem 0', color: '#374151' }}>
                                            Interest{filteredInterestProfiles.length > 0 ? ` (${filteredInterestProfiles.length})` : ''}
                                        </h4>
                                        {filteredInterestProfiles.length === 0 ? (
                                            <>
                                                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>
                                                    {showInterestProfileTabs && activeInterestSubAccount
                                                        ? `No interest sent for ${subAccountDisplayName(activeInterestSubAccount)} yet.`
                                                        : "You haven't expressed interest in anyone yet."}
                                                </p>
                                                {!isManagedSubAccount(user) &&
                                                    !(filteredSavedProfiles.length === 0 && filteredInterestProfiles.length === 0) && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline"
                                                        style={{ marginTop: '0.75rem', width: '100%', justifyContent: 'center' }}
                                                        onClick={() => router.push('/profiles')}
                                                    >
                                                        Browse Profiles
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.75rem',
                                                    maxHeight: '320px',
                                                    overflowY: 'auto',
                                                    paddingRight: '0.25rem',
                                                }}
                                            >
                                                {filteredInterestProfiles.map((p) => {
                                                    const sentAsSubId = Number(p.managedProfileUserId ?? p.ManagedProfileUserId);
                                                    const sentAsSub =
                                                        Number.isFinite(sentAsSubId) && sentAsSubId > 0
                                                            ? managedSubAccountTabs.find((s) => s.id === sentAsSubId)
                                                            : null;
                                                    return (
                                                    <div
                                                        key={`interest-${sentAsSubId || 'self'}-${p.userId ?? p.id}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            if (user?.isVerified === false) {
                                                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                                return;
                                                            }
                                                            openModal('profile', undefined, p);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                if (user?.isVerified === false) {
                                                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                                                    return;
                                                                }
                                                                openModal('profile', undefined, p);
                                                            }
                                                        }}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#fdf8f3', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#f8efe2'; }}
                                                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#fdf8f3'; }}
                                                        title={`View ${p.firstName} ${p.lastName}'s profile`}
                                                    >
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0 }}>
                                                            {p.profilePhoto ? (
                                                                <img src={p.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 700 }}>
                                                                    {(p.firstName?.[0] || 'U')}{(p.lastName?.[0] || '')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                                                                <span style={{ fontWeight: 600, color: '#333' }}>{p.firstName} {p.lastName}</span>
                                                                {p.isMutual ? (
                                                                    <span
                                                                        style={{
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 700,
                                                                            letterSpacing: '0.02em',
                                                                            color: '#047857',
                                                                            background: '#d1fae5',
                                                                            padding: '0.12rem 0.5rem',
                                                                            borderRadius: '999px',
                                                                        }}
                                                                    >
                                                                        Mutual
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div style={{ fontSize: '0.82rem', color: '#666' }}>{p.age || '-'} years • {p.cityOfResidence || 'Unknown'}</div>
                                                            {sentAsSub ? (
                                                                <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.15rem' }}>
                                                                    Sent as {subAccountDisplayName(sentAsSub)}
                                                                </div>
                                                            ) : null}
                                                            {p.interestedAtLabel ? (
                                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>Interest sent {p.interestedAtLabel}</div>
                                                            ) : null}
                                                        </div>
                                                        <ProfileListRemoveButton
                                                            ariaLabel={`Remove interest in ${p.firstName} ${p.lastName}`}
                                                            removing={removingInteractionKey === `interest-${interactionProfileId(p)}`}
                                                            onRemove={(e) => handleRemoveFromInterest(e, p)}
                                                        />
                                                        <span style={{ color: '#bbb', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden>›</span>
                                                    </div>
                                                );})}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {!isManagedSubAccount(user) &&
                                    filteredSavedProfiles.length === 0 &&
                                    filteredInterestProfiles.length === 0 &&
                                    !loadingSavedProfiles && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                                            onClick={() => router.push('/profiles')}
                                        >
                                            Browse Profiles
                                        </button>
                                    )}
                                {!isManagedSubAccount(user) && (filteredSavedProfiles.length > 0 || filteredInterestProfiles.length > 0) && (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}
                                        onClick={() => router.push('/profiles')}
                                    >
                                        Browse more profiles
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <HoroscopeLightbox
                key={horoscopeViewSrc || 'closed'}
                open={!!horoscopeViewSrc}
                src={horoscopeViewSrc || ''}
                onClose={() => setHoroscopeViewSrc(null)}
            />

            <Footer />

            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
                selectedProfile={selectedProfile}
            />
        </main>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={null}>
            <ProfilePageContent />
        </Suspense>
    );
}
