'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import Modals from '../../components/Modals';
import { matrimonialService } from '../../services/matrimonialService';
import { sanitizeNicInput } from '../../utils/nicInput';
import { sanitizeSriLankanPhoneInput, sriLankanPhoneFormatErrorIfInvalid } from '../../utils/sriLankanPhone';
import { getStoredToken } from '../../utils/authStorage';
import { showToast } from '../../utils/toast';

import ProfileCompletionForm from './ProfileCompletionForm';

export default function ProfilePage() {
    const { user, loading, updateUser } = useAuth();
    const router = useRouter();
    const [activeModal, setActiveModal] = useState<'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null>(null);
    const [selectedBlogId, setSelectedBlogId] = useState<number | null>(null);
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
                    if (u.address && typeof u.address === 'string' && u.address.startsWith('WHATSAPP:')) {
                        profileUpdates.whatsapp = u.address.substring('WHATSAPP:'.length);
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
                        profileUpdates.whatsapp = whatsapp;
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
                    
                    // Update user context with all available data
                    if (Object.keys(profileUpdates).length > 0) {
                        updateUser(profileUpdates);
                    }
                    
                    const profileGender = r.gender || r.Gender || '';
                    const profileReligion = r.religion || r.Religion || '';
                    const profileStatus = r.status ?? r.Status;

                    if (profileStatus === 0) {
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
                setProfileCompleted(false);
                if (user?.isVerified !== false) {
                    setIsCompletionModalOpen(true);
                }
            }
        } catch (error) {
            console.error("Failed to check profile", error);
        }
    };

    const openModal = (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify', blogId?: number) => {
        setActiveModal(modal);
        if (modal === 'blog' && blogId) setSelectedBlogId(blogId);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedBlogId(null);
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
        accountType: 'Self'
    });
    const [subAccountError, setSubAccountError] = useState<string | null>(null);
    const [isCreatingSubAccount, setIsCreatingSubAccount] = useState(false);

    useEffect(() => {
        if (user?.accountType === 'Self' && user.id) {
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
                                return {
                                    id: p.UserId || p.userId || profileId,
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
        const phoneErr = sriLankanPhoneFormatErrorIfInvalid(subAccountForm.phone, 'Phone number');
        if (phoneErr) {
            setSubAccountError(phoneErr);
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
                    ...subAccountForm,
                    dateOfBirth: subAccountForm.dob.length === 10 ? `${subAccountForm.dob}T00:00:00` : subAccountForm.dob,
                    parentUserId: Number(user?.id)
                })
            });

            const data = await response.json();
            if (response.ok && (data.statusCode === 200 || data.statusCode === 1)) {
                setIsCreateSubAccountModalOpen(false);
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
                    accountType: 'Self'
                });
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

    const handleSubAccountChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let nextValue = value;
        if (name === 'nic') nextValue = sanitizeNicInput(value);
        else if (name === 'phone') nextValue = sanitizeSriLankanPhoneInput(value);
        setSubAccountForm(prev => ({
            ...prev,
            [name]: nextValue
        }));
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
                    {!profileCompleted && (
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

                {/* Detailed Profile Completion Modal */}
                {isCompletionModalOpen && (
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
                    <div className="modal-overlay active" onClick={() => setIsEditModalOpen(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
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
                                {profileCompleted ? (
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
                        <button className="btn btn-outline" onClick={() => {
                            if (user?.isVerified === false) {
                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                return;
                            }
                            setIsCompletionModalOpen(true);
                        }}>Edit Detailed Profile</button>
                        <button className="btn btn-outline" onClick={() => {
                            if (user?.isVerified === false) {
                                window.dispatchEvent(new CustomEvent('open-verify-modal'));
                                return;
                            }
                            setIsEditModalOpen(true);
                        }}>Edit Basic Details</button>
                    </div>
                </div>

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

                {/* Create Sub-Account Modal */}
                {isCreateSubAccountModalOpen && (
                    <div className="modal-overlay active" onClick={() => setIsCreateSubAccountModalOpen(false)} style={{ zIndex: 1000 }}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                            <button className="modal-close" onClick={() => setIsCreateSubAccountModalOpen(false)}>✕</button>
                            <div className="modal-header">
                                <h2>Create Sub-Account</h2>
                                <p style={{ color: '#666', fontSize: '0.9rem' }}>Fill in the details to create a new profile under your account.</p>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleCreateSubAccount}>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>First Name *</label>
                                            <input type="text" name="firstName" required value={subAccountForm.firstName} onChange={handleSubAccountChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Last Name *</label>
                                            <input type="text" name="lastName" required value={subAccountForm.lastName} onChange={handleSubAccountChange} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>NIC / Passport *</label>
                                        <input type="text" name="nic" required value={subAccountForm.nic} onChange={handleSubAccountChange} />
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Date of Birth *</label>
                                            <input type="date" name="dob" required value={subAccountForm.dob} onChange={handleSubAccountChange} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Gender *</label>
                                            <select name="gender" required value={subAccountForm.gender} onChange={handleSubAccountChange}>
                                                <option value="">Select Gender</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number *</label>
                                        <input type="tel" name="phone" required value={subAccountForm.phone} onChange={handleSubAccountChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address *</label>
                                        <input type="email" name="email" required value={subAccountForm.email} onChange={handleSubAccountChange} />
                                    </div>
                                    <div className="form-group">
                                        <label>Password *</label>
                                        <input type="password" name="password" required minLength={6} value={subAccountForm.password} onChange={handleSubAccountChange} />
                                    </div>
                                    
                                    {subAccountError && (
                                        <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', padding: '0.5rem', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
                                            {subAccountError}
                                        </div>
                                    )}

                                    <button type="submit" className="btn btn-primary" disabled={isCreatingSubAccount} style={{ width: '100%', justifyContent: 'center' }}>
                                        {isCreatingSubAccount ? 'Creating...' : 'Create Account'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {user?.accountType === 'Matchmaker' && (
                    <div className="profile-card" style={{ background: 'white', padding: '2rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', marginTop: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Your Client Profiles</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Amaya Fernando</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>26 years • Bride • Colombo</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Ravindu Silva</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>29 years • Groom • Kandy</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#FDF8F3', borderRadius: '12px' }}>
                                <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} alt="Client" />
                                <div>
                                    <h5 style={{ fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem' }}>Ishara Perera</h5>
                                    <p style={{ color: '#6B6560', fontSize: '0.875rem' }}>24 years • Bride • Galle</p>
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>+</span> Add New Profile
                        </button>
                    </div>
                )}

                <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3>Recent Activity</h3>
                        <p style={{ color: '#666', marginTop: '1rem' }}>No recent activity to show.</p>
                    </div>
                    <div className="dashboard-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                        <h3>Saved Profiles</h3>
                        {loadingSavedProfiles ? (
                            <p style={{ color: '#666', marginTop: '1rem' }}>Loading saved profiles...</p>
                        ) : savedProfiles.length > 0 ? (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                                    {savedProfiles.slice(0, 4).map((p) => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', background: '#fdf8f3', borderRadius: '10px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#eee', overflow: 'hidden', flexShrink: 0 }}>
                                                {p.profilePhoto ? (
                                                    <img src={p.profilePhoto} alt={`${p.firstName} ${p.lastName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontWeight: 700 }}>
                                                        {(p.firstName?.[0] || 'U')}{(p.lastName?.[0] || '')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, color: '#333' }}>{p.firstName} {p.lastName}</div>
                                                <div style={{ fontSize: '0.82rem', color: '#666' }}>{p.age || '-'} years • {p.cityOfResidence || 'Unknown'}</div>
                                            </div>
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

            {horoscopePopupOpen && user?.horoscopeDocument && (
                <div
                    onClick={() => setHoroscopePopupOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <button
                            onClick={() => setHoroscopePopupOpen(false)}
                            style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 1 }}
                        >
                            ✕
                        </button>
                        <img
                            src={user.horoscopeDocument}
                            alt="Horoscope"
                            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', background: 'white' }}
                        />
                    </div>
                </div>
            )}

            <Footer />

            <Modals
                activeModal={activeModal}
                onClose={closeModal}
                onSwitch={openModal}
                selectedBlogId={selectedBlogId}
            />
        </main>
    );
}
