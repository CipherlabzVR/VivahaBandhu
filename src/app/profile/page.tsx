'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Modals from '../../components/Modals';
import { matrimonialService } from '../../services/matrimonialService';
import { sanitizeNicInput } from '../../utils/nicInput';
import { sanitizeNameInput } from '../../utils/nameInput';
import { sanitizeSriLankanPhoneInput, sriLankanPhoneFormatErrorIfInvalid } from '../../utils/sriLankanPhone';
import { getStoredToken } from '../../utils/authStorage';
import { showToast } from '../../utils/toast';
import HoroscopeLightbox from '../../components/HoroscopeLightbox';

import ProfileCompletionForm from './ProfileCompletionForm';

function ProfilePageContent() {
    const { user, loading, updateUser, logout } = useAuth();
    const { language, setLanguage } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
    const [profileCompleted, setProfileCompleted] = useState(false);
    const [profileFetched, setProfileFetched] = useState(false);

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
                        profileUpdates.horoscopeDocument = horoscopeDocument;
                    }

                    const subscribed = r.isSubscribed ?? r.IsSubscribed ?? false;
                    profileUpdates.isSubscribed = subscribed;

                    // Notification preference (server-authoritative). Defaults to true
                    // when missing so existing users keep getting interest emails.
                    const emailOnInterest = r.emailOnInterest ?? r.EmailOnInterest;
                    if (emailOnInterest !== undefined && emailOnInterest !== null) {
                        profileUpdates.emailOnInterest = !!emailOnInterest;
                    }
                    
                    // Update user context with all available data
                    if (Object.keys(profileUpdates).length > 0) {
                        updateUser(profileUpdates);
                    }
                    
                    const profileGender = r.gender || r.Gender || '';
                    const profileReligion = r.religion || r.Religion || '';
                    const profileStatus = r.status ?? r.Status;

                    const isMatchmakerAccount = (profileUpdates.accountType || user?.accountType || '') === 'Matchmaker';

                    if (isMatchmakerAccount) {
                        // Matchmakers manage sub-accounts, they don't need their own detailed profile.
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
                }
            } else {
                // Profile not found - still apply user data updates
                if (Object.keys(profileUpdates).length > 0) {
                    updateUser(profileUpdates);
                }
                const isMatchmakerAccount = (profileUpdates.accountType || user?.accountType || '') === 'Matchmaker';
                if (isMatchmakerAccount) {
                    // Matchmakers don't need their own detailed matrimonial profile.
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
    const [horoscopePopupOpen, setHoroscopePopupOpen] = useState(false);

    const [subAccounts, setSubAccounts] = useState<any[]>([]);
    const [savedProfiles, setSavedProfiles] = useState<any[]>([]);
    const [loadingSavedProfiles, setLoadingSavedProfiles] = useState(false);
    const [isCreateSubAccountModalOpen, setIsCreateSubAccountModalOpen] = useState(false);
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

    useEffect(() => {
        if ((user?.accountType === 'Self' || user?.accountType === 'Matchmaker') && user.id) {
            fetchSubAccounts();
        }
    }, [user]);

    useEffect(() => {
        const fetchSavedProfiles = async () => {
            if (!user?.id) {
                setSavedProfiles([]);
                return;
            }

            setLoadingSavedProfiles(true);
            try {
                const interactionsRes = await matrimonialService.getUserInteractions(Number(user.id));
                const rawFavorites = interactionsRes?.result?.Favorites || interactionsRes?.result?.favorites || [];
                const rawShortlists = interactionsRes?.result?.Shortlists || interactionsRes?.result?.shortlists || [];
                const mergedSaved = [...(Array.isArray(rawFavorites) ? rawFavorites : []), ...(Array.isArray(rawShortlists) ? rawShortlists : [])];

                const favoriteIds = Array.isArray(mergedSaved)
                    ? mergedSaved
                        .map((x: any) => (typeof x === 'number' ? x : x?.favoriteProfileId ?? x?.shortlistedProfileId ?? x?.profileId ?? x?.id))
                        .filter((x: any) => Number.isFinite(Number(x)))
                        .map((x: any) => Number(x))
                    : [];

                if (favoriteIds.length === 0) {
                    setSavedProfiles([]);
                    return;
                }

                const uniqueIds = Array.from(new Set(favoriteIds));
                const details = await Promise.all(
                    uniqueIds.map(async (profileId) => {
                        try {
                            const profileRes = await matrimonialService.getProfile(profileId);
                            if (profileRes?.statusCode === 200 && profileRes?.result) {
                                const p = profileRes.result;
                                const userId = p.UserId || p.userId || profileId;
                                return {
                                    id: userId,
                                    userId,
                                    firstName: p.FirstName || p.firstName || 'User',
                                    lastName: p.LastName || p.lastName || '',
                                    age: p.Age || p.age || 0,
                                    cityOfResidence: p.CityOfResidence || p.cityOfResidence || 'Unknown',
                                    profilePhoto: p.ProfilePhoto || p.profilePhoto || p.ProfilePhotoFromProfile || p.profilePhotoFromProfile || '',
                                    phoneNumber: p.PhoneNumber || p.phoneNumber || '',
                                };
                            }
                        } catch {
                            // Ignore one-off profile fetch failures.
                        }
                        return null;
                    })
                );

                setSavedProfiles(details.filter(Boolean));
            } catch (error) {
                console.error("Failed to fetch saved profiles", error);
                setSavedProfiles([]);
            } finally {
                setLoadingSavedProfiles(false);
            }
        };

        fetchSavedProfiles();
    }, [user?.id]);

    const fetchSubAccounts = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api'}/Matrimonial/GetSubAccounts?parentUserId=${user?.id}`, {
                headers: {
                    'Authorization': `Bearer ${getStoredToken() || ''}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.result) {
                    setSubAccounts(data.result);
                }
            }
        } catch (error) {
            console.error("Failed to fetch sub-accounts", error);
        }
    };

    const handleCreateSubAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubAccountError(null);

        // Required-field validation (mirrors the public register modal so matchmakers
        // create profiles that look identical to user-registered ones).
        if (!subAccountForm.firstName.trim() || !subAccountForm.lastName.trim()) {
            setSubAccountError('First and last name are required.');
            return;
        }
        if (!subAccountForm.nic.trim()) {
            setSubAccountError('NIC or passport number is required.');
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
        if (subAccountForm.password.length < 6) {
            setSubAccountError('Password must be at least 6 characters.');
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api'}/Matrimonial/Register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName: subAccountForm.firstName,
                    lastName: subAccountForm.lastName,
                    nic: subAccountForm.nic,
                    gender: subAccountForm.gender,
                    phone: subAccountForm.phone,
                    whatsapp: effectiveWhatsApp,
                    email: subAccountForm.email,
                    password: subAccountForm.password,
                    accountType: 'Self',
                    profilePhotoBase64: subAccountPhotoBase64 || undefined,
                    dateOfBirth: subAccountForm.dob.length === 10 ? `${subAccountForm.dob}T00:00:00` : subAccountForm.dob,
                    parentUserId: Number(user?.id)
                })
            });

            const data = await response.json();
            if (response.ok && (data.statusCode === 200 || data.statusCode === 1)) {
                setIsCreateSubAccountModalOpen(false);
                resetSubAccountForm();
                showToast('Client profile created successfully.', 'success');
                fetchSubAccounts();
            } else {
                setSubAccountError(data.message || 'Failed to create sub-account');
            }
        } catch (error) {
            setSubAccountError('An error occurred while creating the sub-account');
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
    /**
     * UI-only preferences persisted in localStorage. The backend does not (yet) have
     * dedicated columns for these toggles, so we keep them client-side. They can be
     * promoted to user fields later without changing this component.
     */
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
                setPrefs(p => ({ ...p, ...parsed }));
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

    const updatePref = <K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) => {
        setPrefs(prev => {
            const next = { ...prev, [key]: value };
            if (typeof window !== 'undefined' && user?.id) {
                try { localStorage.setItem(`cbass.prefs.${user.id}`, JSON.stringify(next)); } catch { /* quota */ }
            }
            return next;
        });
    };

    const [isSavingEmailPref, setIsSavingEmailPref] = useState(false);
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

    const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
    const handleCancelSubscription = async () => {
        if (!user?.id) return;
        const confirmed = typeof window !== 'undefined' && window.confirm(
            'Cancel your premium subscription?\n\nYou will lose premium benefits immediately. You can re-subscribe at any time.'
        );
        if (!confirmed) return;
        try {
            setIsCancellingSubscription(true);
            const res = await matrimonialService.cancelSubscription(Number(user.id));
            if (res?.statusCode === 200 || res?.statusCode === 1) {
                updateUser?.({ ...user, isSubscribed: false } as any);
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

    const [deleteAccountConfirm, setDeleteAccountConfirm] = useState('');
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
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

    /**
     * Parse a Sri Lankan NIC (old or new format) and extract DOB + gender, mirroring
     * the logic used in the main register form so matchmakers see the same auto-fill UX.
     */
    const parseSubAccountNIC = (nicNumber: string): { dob: string; gender: string } | null => {
        const normalized = nicNumber.trim().toUpperCase();
        const currentYear = new Date().getFullYear();
        let year = '';
        let dayText = '';
        let gender = '';
        if (/^\d{9}[VX]$/.test(normalized)) {
            year = `19${normalized.substring(0, 2)}`;
            dayText = normalized.substring(2, 5);
        } else if (/^\d{12}$/.test(normalized)) {
            const parsedYear = Number(normalized.substring(0, 4));
            if (parsedYear < 1900 || parsedYear > currentYear) return null;
            year = normalized.substring(0, 4);
            dayText = normalized.substring(4, 7);
        } else {
            return null;
        }
        let dayOfYear = parseInt(dayText, 10);
        if (Number.isNaN(dayOfYear)) return null;
        if (dayOfYear > 500) {
            gender = 'Female';
            dayOfYear -= 500;
        } else {
            gender = 'Male';
        }
        if (dayOfYear < 1 || dayOfYear > 366) return null;
        const refDate = new Date(Date.UTC(2000, 0, 1));
        refDate.setUTCDate(dayOfYear);
        const month = String(refDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(refDate.getUTCDate()).padStart(2, '0');
        return { dob: `${year}-${month}-${day}`, gender };
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
                const parsed = parseSubAccountNIC(nextValue);
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
        if (name === 'nic') nextValue = sanitizeNicInput(value);
        else if (name === 'phone' || name === 'whatsapp') nextValue = sanitizeSriLankanPhoneInput(value);
        else if (name === 'firstName' || name === 'lastName') nextValue = sanitizeNameInput(value);
        setEditForm(prev => ({
            ...prev,
            [name]: nextValue
        }));
    };

    // In a real app, you would have a save function here that calls an API and updates the User Context

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: 'var(--primary)' }}>Loading...</div>;
    }

    if (!user) return null;

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
                    {!profileCompleted && user?.accountType !== 'Matchmaker' && (
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
                {isCompletionModalOpen && user?.accountType !== 'Matchmaker' && (
                    <div className="modal-overlay active" style={{ zIndex: 1000 }}>
                        <div className="modal" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                            <button className="modal-close" onClick={() => setIsCompletionModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>{profileCompleted ? 'Edit Detailed Profile' : 'Complete Your Profile'}</h2>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Please provide accurate information to find the best match.</p>
                            </div>
                            <div className="modal-body">
                                <ProfileCompletionForm
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
                                        const existing = profileJson?.result || {};

                                        const updatePayload = {
                                            ...existing,
                                            userId: Number(user.id),
                                            gender: editForm.gender || existing.gender || existing.Gender || '',
                                            dateOfBirth: editForm.dob ? `${editForm.dob}T00:00:00` : null,
                                        };

                                        const updateRes = await fetch(`${apiBase}/Matrimonial/UpdateProfile`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify(updatePayload)
                                        });

                                        if (!updateRes.ok) {
                                            const errText = await updateRes.text().catch(() => '');
                                            throw new Error(errText || 'Failed to update profile');
                                        }

                                        updateUser({
                                            firstName: editForm.firstName,
                                            lastName: editForm.lastName,
                                            nic: editForm.nic,
                                            dob: editForm.dob,
                                            gender: editForm.gender,
                                            phone: editForm.phone,
                                            whatsapp: editForm.whatsapp,
                                        });
                                        setProfileFetched(false);
                                        setIsEditModalOpen(false);
                                    } catch (error) {
                                        showToast(error instanceof Error ? error.message : 'Failed to save changes', 'error');
                                    }
                                }}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>First Name</label>
                                            <input type="text" name="firstName" value={editForm.firstName} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Last Name</label>
                                            <input type="text" name="lastName" value={editForm.lastName} onChange={handleEditChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>NIC / Passport</label>
                                        <input type="text" name="nic" value={editForm.nic} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Date of Birth</label>
                                            <input type="date" name="dob" value={editForm.dob} onChange={handleEditChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Gender</label>
                                            <select name="gender" value={editForm.gender} onChange={handleEditChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>WhatsApp Number</label>
                                        <input type="tel" name="whatsapp" value={editForm.whatsapp} onChange={handleEditChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input type="email" name="email" value={editForm.email} onChange={handleEditChange} disabled style={{ backgroundColor: '#f0f0f0' }} />
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
                                    {user.accountType || 'Free Member'}
                                </span>
                                {user.isSubscribed ? (
                                    <span className="badge" style={{ background: '#047857', color: '#fff', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                        ✓ Premium Subscribed
                                    </span>
                                ) : (
                                    <span className="badge" style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 500 }}>
                                        Free Plan
                                    </span>
                                )}
                                {user.accountType === 'Matchmaker' ? null : profileCompleted ? (
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

                    <div className="profile-details-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Full Name</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.firstName} {user.lastName}</div>
                        </div>
                        <div className="detail-group">
                            <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Account ID</label>
                            <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.id}</div>
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
                        {user.horoscopeDocument && (
                            <div className="detail-group">
                                <label style={{ display: 'block', color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Horoscope</label>
                                <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>
                                    <button
                                        onClick={() => setHoroscopePopupOpen(true)}
                                        style={{ background: 'none', border: 'none', padding: 0, color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 500 }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        View Horoscope
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="profile-actions" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => openModal('subscription')}>Upgrade Membership</button>
                        {user.accountType !== 'Matchmaker' && (
                            <button className="btn btn-outline" onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                setIsCompletionModalOpen(true);
                            }}>Edit Detailed Profile</button>
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
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#FDF8F3', borderRadius: '10px', cursor: 'pointer' }}>
                                    <span>
                                        <span style={{ display: 'block', fontWeight: 500 }}>Show my profile in browse results</span>
                                        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>Turn off to temporarily hide your profile from other members.</span>
                                    </span>
                                    <input type="checkbox" checked={prefs.showInBrowse} onChange={(e) => updatePref('showInBrowse', e.target.checked)} style={{ width: 18, height: 18 }} />
                                </label>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: '#FDF8F3', borderRadius: '10px' }}>
                                    <span>
                                        <span style={{ display: 'block', fontWeight: 500 }}>Who can see my profile photo</span>
                                        <span style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem' }}>Restrict your photo to premium members for added privacy.</span>
                                    </span>
                                    <select
                                        value={prefs.photoVisibility}
                                        onChange={(e) => updatePref('photoVisibility', e.target.value as 'everyone' | 'premium')}
                                        style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '0.9rem' }}
                                    >
                                        <option value="everyone">Everyone</option>
                                        <option value="premium">Premium members only</option>
                                    </select>
                                </div>
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
                                            : 'You will still see in-app notifications regardless of this setting.'}
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '1rem', background: user?.isSubscribed ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#FDF8F3', borderRadius: '10px', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: user?.isSubscribed ? '#7c2d12' : '#374151' }}>
                                        {user?.isSubscribed ? 'Premium plan — active' : 'Free plan'}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: 2 }}>
                                        {user?.isSubscribed
                                            ? 'You enjoy unlimited messaging and premium visibility.'
                                            : 'Upgrade to unlock unlimited messaging and the premium gold badge.'}
                                    </div>
                                </div>
                                {user?.isSubscribed ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelSubscription}
                                        disabled={isCancellingSubscription}
                                        style={{ padding: '0.55rem 1rem', borderRadius: '8px', border: '1px solid #d97706', background: 'white', color: '#b45309', fontWeight: 600, cursor: isCancellingSubscription ? 'not-allowed' : 'pointer', opacity: isCancellingSubscription ? 0.7 : 1 }}
                                    >
                                        {isCancellingSubscription ? 'Cancelling…' : 'Cancel subscription'}
                                    </button>
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

                {user?.accountType === 'Self' && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Managed Accounts</h3>
                            <button className="btn btn-primary" onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                setIsCreateSubAccountModalOpen(true);
                            }}>Create Sub-Account</button>
                        </div>
                        <p style={{ color: '#666', marginBottom: '1.5rem' }}>You can create and manage multiple profiles under your main account.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            {subAccounts.length > 0 ? (
                                subAccounts.map((subAccount: any) => (
                                    <div key={subAccount.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', overflow: 'hidden' }}>
                                            {subAccount.profilePhoto ? (
                                                <img src={subAccount.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span>{subAccount.firstName[0]}{subAccount.lastName[0]}</span>
                                            )}
                                        </div>
                                        <div>
                                            <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>{subAccount.firstName} {subAccount.lastName}</h5>
                                            <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>{subAccount.email} • {subAccount.phoneNumber}</p>
                                            <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: 500 }}>Log out and log in with this email to manage this profile.</p>
                                        </div>
                                    </div>
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

                {/* Create Sub-Account / Add Client Profile Modal */}
                {isCreateSubAccountModalOpen && (() => {
                    const isMatchmaker = user?.accountType === 'Matchmaker';
                    const nicParsed = !!parseSubAccountNIC(subAccountForm.nic);
                    return (
                        <div className="modal-overlay active" style={{ zIndex: 1000 }}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
                                <button className="modal-close" onClick={() => { setIsCreateSubAccountModalOpen(false); resetSubAccountForm(); }}>✕</button>
                                <div className="modal-header">
                                    <h2>{isMatchmaker ? 'Add Client Profile' : 'Create Sub-Account'}</h2>
                                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                                        {isMatchmaker
                                            ? "Enter your client's details. The profile will appear in browse with a matchmaker badge, and any messages or interest sent to it will come straight to you."
                                            : 'Fill in the details to create a new profile under your account.'}
                                    </p>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleCreateSubAccount}>
                                        {/* Profile photo */}
                                        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div style={{ width: '88px', height: '88px', borderRadius: '50%', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #e5e7eb' }}>
                                                {subAccountPhotoPreview ? (
                                                    <img src={subAccountPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="#9ca3af" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: '200px' }}>
                                                <label style={{ fontWeight: 500, marginBottom: '0.25rem', display: 'block' }}>Profile Photo (optional)</label>
                                                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.5rem' }}>JPG or PNG, square works best.</p>
                                                <input type="file" accept="image/*" id="subAccountPhoto" style={{ display: 'none' }} onChange={handleSubAccountPhotoChange} />
                                                <label htmlFor="subAccountPhoto" className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'inline-block' }}>
                                                    {subAccountPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                                                </label>
                                                {subAccountPhotoPreview && (
                                                    <button type="button" onClick={() => { setSubAccountPhotoBase64(''); setSubAccountPhotoPreview(''); }} style={{ marginLeft: '0.5rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label>First Name *</label>
                                                <input type="text" name="firstName" required value={subAccountForm.firstName} onChange={handleSubAccountChange} />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label>Last Name *</label>
                                                <input type="text" name="lastName" required value={subAccountForm.lastName} onChange={handleSubAccountChange} />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>National ID / Passport No *</label>
                                            <input type="text" name="nic" required maxLength={12} placeholder="e.g. 199012345678 or 901234567V" value={subAccountForm.nic} onChange={handleSubAccountChange} />
                                            {nicParsed && (
                                                <span style={{ color: '#059669', fontSize: '0.8rem' }}>Date of birth and gender auto-filled from NIC.</span>
                                            )}
                                        </div>

                                        <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label>Date of Birth *</label>
                                                <input type="date" name="dob" required value={subAccountForm.dob} onChange={handleSubAccountChange} disabled={nicParsed} />
                                            </div>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label>Gender *</label>
                                                <select name="gender" required value={subAccountForm.gender} onChange={handleSubAccountChange} disabled={nicParsed}>
                                                    <option value="">Select Gender</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Phone Number *</label>
                                            <input type="tel" name="phone" required placeholder="0771234567 or +94771234567" value={subAccountForm.phone} onChange={handleSubAccountChange} />
                                        </div>

                                        <div className="form-group">
                                            <label>WhatsApp Number *</label>
                                            <input
                                                type="tel"
                                                name="whatsapp"
                                                required
                                                placeholder="0771234567 or +94771234567"
                                                disabled={subAccountWhatsAppSame}
                                                value={subAccountWhatsAppSame ? subAccountForm.phone : subAccountForm.whatsapp}
                                                onChange={handleSubAccountChange}
                                            />
                                            <div className="checkbox-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    id="subAccountSameAsPhone"
                                                    checked={subAccountWhatsAppSame}
                                                    onChange={(e) => handleSubAccountWhatsAppSameToggle(e.target.checked)}
                                                />
                                                <label htmlFor="subAccountSameAsPhone" style={{ fontSize: '0.9rem' }}>Same as Phone Number</label>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Email Address *</label>
                                            <input type="email" name="email" required placeholder="client@email.com" value={subAccountForm.email} onChange={handleSubAccountChange} />
                                        </div>

                                        <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                                <label>Password *</label>
                                                <input
                                                    type={subAccountShowPassword ? 'text' : 'password'}
                                                    name="password"
                                                    required
                                                    minLength={6}
                                                    value={subAccountForm.password}
                                                    onChange={handleSubAccountChange}
                                                    style={{ paddingRight: '40px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setSubAccountShowPassword(v => !v)}
                                                    aria-label={subAccountShowPassword ? 'Hide password' : 'Show password'}
                                                    style={{ position: 'absolute', right: '8px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.8rem', padding: '4px 8px' }}
                                                >
                                                    {subAccountShowPassword ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                                <label>Confirm Password *</label>
                                                <input
                                                    type={subAccountShowConfirmPassword ? 'text' : 'password'}
                                                    name="confirmPassword"
                                                    required
                                                    minLength={6}
                                                    value={subAccountForm.confirmPassword}
                                                    onChange={handleSubAccountChange}
                                                    style={{ paddingRight: '40px' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setSubAccountShowConfirmPassword(v => !v)}
                                                    aria-label={subAccountShowConfirmPassword ? 'Hide password' : 'Show password'}
                                                    style={{ position: 'absolute', right: '8px', top: '34px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.8rem', padding: '4px 8px' }}
                                                >
                                                    {subAccountShowConfirmPassword ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="checkbox-group" style={{ marginTop: '0.5rem' }}>
                                            <input
                                                type="checkbox"
                                                id="subAccountTerms"
                                                checked={subAccountTermsAccepted}
                                                onChange={(e) => setSubAccountTermsAccepted(e.target.checked)}
                                            />
                                            <label htmlFor="subAccountTerms" style={{ fontSize: '0.9rem' }}>
                                                {isMatchmaker
                                                    ? 'I confirm my client has authorised me to create this profile on their behalf.'
                                                    : 'I confirm the details above are accurate.'}
                                            </label>
                                        </div>

                                        {subAccountError && (
                                            <div style={{ color: 'red', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.9rem', padding: '0.6rem 0.75rem', backgroundColor: '#ffe6e6', borderRadius: '6px' }}>
                                                {subAccountError}
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={isCreatingSubAccount}
                                            style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', opacity: isCreatingSubAccount ? 0.6 : 1, cursor: isCreatingSubAccount ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isCreatingSubAccount ? 'Creating...' : (isMatchmaker ? 'Create Client Profile →' : 'Create Account')}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {user?.accountType === 'Matchmaker' && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                                Your Client Profiles{subAccounts.length > 0 ? ` (${subAccounts.length})` : ''}
                            </h3>
                            <button className="btn btn-primary" onClick={() => {
                                if (user?.isVerified === false) {
                                    window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                    return;
                                }
                                setIsCreateSubAccountModalOpen(true);
                            }}>+ Add New Profile</button>
                        </div>
                        <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                            Profiles you have created on behalf of clients. You can remove a profile at any time and all of its data will be permanently deleted.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {subAccounts.length > 0 ? (
                                subAccounts.map((subAccount: any) => {
                                    const fullName = `${subAccount.firstName || ''} ${subAccount.lastName || ''}`.trim() || 'Unnamed Profile';
                                    const initials = `${(subAccount.firstName || '?')[0] || '?'}${(subAccount.lastName || '')[0] || ''}`.toUpperCase();
                                    const isDeleting = deletingSubAccountId === subAccount.id;
                                    return (
                                        <div key={subAccount.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px', flexWrap: 'wrap' }}>
                                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                                                {subAccount.profilePhoto ? (
                                                    <img src={subAccount.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span>{initials}</span>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h5 style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '1rem' }}>{fullName}</h5>
                                                <p style={{ color: '#6B6560', fontSize: '0.875rem', wordBreak: 'break-word' }}>
                                                    {subAccount.email || '—'}{subAccount.phoneNumber ? ` • ${subAccount.phoneNumber}` : ''}
                                                </p>
                                                {subAccount.age ? (
                                                    <p style={{ color: '#6B6560', fontSize: '0.8rem', marginTop: '0.15rem' }}>{subAccount.age} years</p>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteSubAccount(subAccount)}
                                                disabled={isDeleting}
                                                aria-label={`Delete ${fullName}`}
                                                title={`Delete ${fullName}`}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                                    padding: '0.5rem 0.85rem', borderRadius: '8px',
                                                    border: '1px solid #fecaca', background: isDeleting ? '#fee2e2' : 'white',
                                                    color: '#b91c1c', cursor: isDeleting ? 'not-allowed' : 'pointer',
                                                    fontSize: '0.85rem', fontWeight: 600,
                                                    opacity: isDeleting ? 0.7 : 1, transition: 'background-color 0.15s'
                                                }}
                                                onMouseEnter={(e) => { if (!isDeleting) (e.currentTarget as HTMLButtonElement).style.background = '#fff1f2'; }}
                                                onMouseLeave={(e) => { if (!isDeleting) (e.currentTarget as HTMLButtonElement).style.background = 'white'; }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                    <path d="M10 11v6" />
                                                    <path d="M14 11v6" />
                                                    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                                                </svg>
                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    );
                                })
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
                        <p style={{ color: '#666', marginTop: '1rem' }}>No recent activity to show.</p>
                    </div>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <h3>Saved Profiles{savedProfiles.length > 0 ? ` (${savedProfiles.length})` : ''}</h3>
                        {loadingSavedProfiles ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Loading saved profiles...</p>
                        ) : savedProfiles.length > 0 ? (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                    {savedProfiles.map((p) => (
                                        <div
                                            key={p.id}
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
                                                    <img src={p.profilePhoto} alt={`${p.firstName} ${p.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 700 }}>
                                                        {(p.firstName?.[0] || 'U')}{(p.lastName?.[0] || '')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: '#333' }}>{p.firstName} {p.lastName}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#666' }}>{p.age || '-'} years • {p.cityOfResidence || 'Unknown'}</div>
                                            </div>
                                            <span style={{ color: '#bbb', fontSize: '1.1rem', flexShrink: 0 }} aria-hidden>›</span>
                                        </div>
                                    ))}
                                </div>
                                <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => router.push('/profiles')}>
                                    Browse More Profiles
                                </button>
                            </>
                        ) : (
                            <>
                                <p style={{ color: '#666', marginTop: '1rem' }}>You haven't saved any profiles yet.</p>
                                <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={() => router.push('/profiles')}>
                                    Browse Profiles
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <HoroscopeLightbox
                open={horoscopePopupOpen && !!user?.horoscopeDocument}
                src={user?.horoscopeDocument || ''}
                onClose={() => setHoroscopePopupOpen(false)}
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
