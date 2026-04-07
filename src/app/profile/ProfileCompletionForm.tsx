'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Country, City } from 'country-state-city';
import { getStoredToken } from '../../utils/authStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';
const MIN_HEIGHT_CM = 120;
const MAX_HEIGHT_CM = 250;

type CountryOption = { name: string; isoCode: string };

/** Comma-separated country names; avoids global .form-group input { width:100% } breaking checkbox layout */
function CountryMultiSelect({
    idPrefix,
    label,
    value,
    onChange,
    countries,
    hint,
}: {
    idPrefix: string;
    label: ReactNode;
    value: string;
    onChange: (commaJoined: string) => void;
    countries: CountryOption[];
    hint?: string;
}) {
    const selected = useMemo(
        () => value.split(',').map((s) => s.trim()).filter(Boolean),
        [value]
    );
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const toggle = (countryName: string) => {
        const cur = value.split(',').map((s) => s.trim()).filter(Boolean);
        const next = cur.includes(countryName) ? cur.filter((c) => c !== countryName) : [...cur, countryName];
        onChange(next.join(', '));
    };

    const filtered = useMemo(() => {
        const t = search.toLowerCase().trim();
        return countries.filter((c) => !t || c.name.toLowerCase().includes(t));
    }, [countries, search]);

    return (
        <div className="country-multi-select" ref={wrapRef} style={{ position: 'relative' }}>
            <label>
                {label}
                {hint ? <span className="country-multi-hint"> {hint}</span> : null}
            </label>
            <div
                className="country-multi-trigger"
                onClick={() => setOpen((o) => !o)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setOpen((o) => !o);
                    }
                }}
            >
                {selected.length > 0 ? (
                    selected.map((c) => (
                        <span key={c} className="country-multi-chip">
                            {c}
                            <button
                                type="button"
                                className="country-multi-chip-remove"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggle(c);
                                }}
                                aria-label={`Remove ${c}`}
                            >
                                ×
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="country-multi-placeholder">Select countries</span>
                )}
            </div>
            {open && (
                <div className="country-multi-panel">
                    <div className="country-multi-search-wrap">
                        <input
                            type="text"
                            className="country-multi-search"
                            placeholder="Search countries..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className="country-multi-list">
                        {filtered.map((country) => {
                            const cid = `${idPrefix}-${country.isoCode}`;
                            const isOn = selected.includes(country.name);
                            return (
                                <label
                                    key={country.isoCode}
                                    htmlFor={cid}
                                    className={`country-multi-row ${isOn ? 'selected' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        id={cid}
                                        type="checkbox"
                                        className="country-multi-checkbox"
                                        checked={isOn}
                                        onChange={() => toggle(country.name)}
                                    />
                                    <span className="country-multi-text">{country.name}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
            <style jsx>{`
                .country-multi-select :global(.country-multi-checkbox) {
                    width: 1rem !important;
                    min-width: 1rem !important;
                    max-width: 1rem !important;
                    height: 1rem !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    flex-shrink: 0;
                    align-self: center;
                }
                .country-multi-select :global(label.country-multi-row) {
                    display: flex !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    gap: 0.6rem !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0.45rem 0.65rem !important;
                    cursor: pointer;
                    border-radius: 4px;
                    font-weight: 400;
                }
                .country-multi-select :global(label.country-multi-row):hover {
                    background: #f7f7fb;
                }
                .country-multi-select :global(label.country-multi-row.selected) {
                    background: #f0f4ff;
                }
                .country-multi-select :global(.country-multi-text) {
                    flex: 1;
                    min-width: 0;
                    line-height: 1.35;
                    text-align: left;
                }
                .country-multi-hint {
                    font-size: 0.8rem;
                    color: #888;
                    font-weight: 400;
                }
                .country-multi-trigger {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 0.5rem 0.75rem;
                    min-height: 42px;
                    cursor: pointer;
                    background: #fff;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.35rem;
                    align-items: center;
                }
                .country-multi-placeholder {
                    color: #999;
                    font-size: 0.95rem;
                }
                .country-multi-chip {
                    background: #eef2ff;
                    color: var(--primary);
                    padding: 0.2rem 0.45rem 0.2rem 0.6rem;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                .country-multi-chip-remove {
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 1rem;
                    line-height: 1;
                    padding: 0 0.15rem;
                    color: inherit;
                }
                .country-multi-panel {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    z-index: 100;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                    display: flex;
                    flex-direction: column;
                    max-height: 280px;
                    overflow: hidden;
                }
                .country-multi-search-wrap {
                    padding: 0.5rem;
                    flex-shrink: 0;
                    border-bottom: 1px solid #eee;
                    background: #fff;
                }
                .country-multi-search {
                    width: 100%;
                    padding: 0.45rem 0.6rem;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 0.9rem;
                }
                .country-multi-list {
                    overflow-y: auto;
                    overflow-x: hidden;
                    max-height: 220px;
                    padding: 0.25rem 0;
                }
            `}</style>
        </div>
    );
}

export default function ProfileCompletionForm({ onClose, onComplete }: { onClose?: () => void, onComplete?: () => void }) {
    const { user, updateUser } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
    const [previewBusters, setPreviewBusters] = useState<Record<string, number>>({});
    const [horoscopePopupOpen, setHoroscopePopupOpen] = useState(false);

    const [formData, setFormData] = useState({
        // Personal
        gender: '',
        dob: '',
        height: '',
        complexion: '',
        religion: '',
        maritalStatus: '',

        // Education & Work
        qualificationLevel: '',
        occupation: '',

        // Location
        countryOfOrigin: '',
        countryOfResidence: '',
        cityOfResidence: '',
        residencyStatus: '',

        // Habits
        hobbies: '',
        drinkingHabits: '',
        eatingHabits: '',
        smokingHabits: '',
        horoscope: '',
        horoscopeDocument: '',

        // Parents - Father
        fatherName: '',
        fatherCountryOfResidence: '',
        fatherOccupation: '',
        fatherEthnicity: '',
        fatherReligion: '',
        fatherCaste: '',
        fatherRemarks: '',

        // Parents - Mother
        motherName: '',
        motherCountryOfResidence: '',
        motherOccupation: '',
        motherEthnicity: '',
        motherReligion: '',
        motherCaste: '',
        motherRemarks: '',

        // Partner Preference
        partnerMinAge: '',
        partnerMaxAge: '',
        partnerEatingHabits: '',
        partnerDrinkingHabits: '',
        partnerSmokingHabits: '',
        partnerQualificationLevel: '',
        partnerReligion: '',
        partnerEthnicity: '',
        partnerCountryOfOrigin: '',
        partnerCountryOfResidence: '',
        partnerAdditionalRequirements: '',

        // Uploads
        upload1: '',
        upload2: '',
        upload3: '',
        profilePhoto: '',
        remarks: ''
    });

    // Only fetch once when the form mounts (not on every user state change).
    const [initialFetchDone, setInitialFetchDone] = useState(false);
    type UploadField = 'profilePhoto' | 'upload1' | 'upload2' | 'upload3';
    type AnyUploadField = UploadField | 'horoscopeDocument';

    const countryOptions = useMemo(
        () => Country.getAllCountries().map((c) => ({ name: c.name, isoCode: c.isoCode })),
        []
    );

    const countryIsoByName = useMemo(() => {
        const map = new Map<string, string>();
        countryOptions.forEach((c) => map.set(c.name, c.isoCode));
        // Backward compatibility for previously saved short names
        map.set('UK', 'GB');
        map.set('USA', 'US');
        return map;
    }, [countryOptions]);

    const getCitiesForCountry = (countryName: string) => {
        const isoCode = countryIsoByName.get(countryName);
        if (!isoCode) return [];
        const cities = City.getCitiesOfCountry(isoCode) || [];
        return Array.from(new Set(cities.map((c) => c.name))).sort((a, b) => a.localeCompare(b));
    };

    const selectedResidenceCountries = useMemo(
        () => formData.countryOfResidence.split(',').map(s => s.trim()).filter(Boolean),
        [formData.countryOfResidence]
    );

    const residenceCities = useMemo(
        () => {
            const allCities = selectedResidenceCountries.flatMap(c => getCitiesForCountry(c));
            return Array.from(new Set(allCities)).sort((a, b) => a.localeCompare(b));
        },
        [selectedResidenceCountries, countryIsoByName]
    );

    const sriLankanReligions = [
        'Buddhism',
        'Hinduism',
        'Islam',
        'Christianity',
        'Catholic',
        'Other',
    ];

    const sriLankanEthnicities = [
        'Sinhalese',
        'Sri Lankan Tamil',
        'Indian Tamil',
        'Sri Lankan Moor',
        'Burgher',
        'Malay',
        'Vedda',
        'Other',
    ];

    const sriLankanCastes = [
        'Govigama',
        'Karava',
        'Salagama',
        'Durava',
        'Bathgama',
        'Deva',
        'Radala',
        'Vellalar',
        'Karaiyar',
        'Nalavar',
        'Other',
    ];

    const safeDate = (val: string | undefined | null): string => {
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
        if (initialFetchDone) return;
        if (!user?.id) return;

        setFormData(prev => ({
            ...prev,
            dob: safeDate(user.dob) || prev.dob,
            gender: user.gender || prev.gender
        }));

        const fetchProfile = async () => {
            try {
                const token = getStoredToken();
                if (!token) return;

                const response = await fetch(`${API_BASE_URL}/Matrimonial/GetProfile?userId=${user.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.result) {
                        const p = data.result;
                        const v = (key: string) => p[key] || p[key.charAt(0).toUpperCase() + key.slice(1)] || '';
                        setFormData(prev => ({
                            ...prev,
                            gender: v('gender') || prev.gender,
                            dob: safeDate(p.dateOfBirth || p.DateOfBirth) || prev.dob,
                            height: p.height || p.Height || prev.height,
                            complexion: v('complexion') || prev.complexion,
                            religion: v('religion') || prev.religion,
                            maritalStatus: v('maritalStatus') || prev.maritalStatus,
                            qualificationLevel: v('qualificationLevel') || prev.qualificationLevel,
                            occupation: v('occupation') || prev.occupation,
                            countryOfOrigin: v('countryOfOrigin') || prev.countryOfOrigin,
                            countryOfResidence: v('countryOfResidence') || prev.countryOfResidence,
                            cityOfResidence: v('cityOfResidence') || prev.cityOfResidence,
                            residencyStatus: v('residencyStatus') || prev.residencyStatus,
                            hobbies: v('hobbies') || prev.hobbies,
                            drinkingHabits: v('drinkingHabits') || prev.drinkingHabits,
                            eatingHabits: v('eatingHabits') || prev.eatingHabits,
                            smokingHabits: v('smokingHabits') || prev.smokingHabits,
                            horoscope: v('horoscope') || prev.horoscope,
                            horoscopeDocument: v('horoscopeDocument') || prev.horoscopeDocument,
                            fatherName: v('fatherName') || prev.fatherName,
                            fatherCountryOfResidence: v('fatherCountryOfResidence') || prev.fatherCountryOfResidence,
                            fatherOccupation: v('fatherOccupation') || prev.fatherOccupation,
                            fatherEthnicity: v('fatherEthnicity') || prev.fatherEthnicity,
                            fatherReligion: v('fatherReligion') || prev.fatherReligion,
                            fatherCaste: v('fatherCaste') || prev.fatherCaste,
                            fatherRemarks: v('fatherRemarks') || prev.fatherRemarks,
                            motherName: v('motherName') || prev.motherName,
                            motherCountryOfResidence: v('motherCountryOfResidence') || prev.motherCountryOfResidence,
                            motherOccupation: v('motherOccupation') || prev.motherOccupation,
                            motherEthnicity: v('motherEthnicity') || prev.motherEthnicity,
                            motherReligion: v('motherReligion') || prev.motherReligion,
                            motherCaste: v('motherCaste') || prev.motherCaste,
                            motherRemarks: v('motherRemarks') || prev.motherRemarks,
                            partnerMinAge: String(Math.max(18, parseInt(p.partnerMinAge || p.PartnerMinAge || prev.partnerMinAge || '18', 10) || 18)),
                            partnerMaxAge: p.partnerMaxAge || p.PartnerMaxAge || prev.partnerMaxAge,
                            partnerEatingHabits: v('partnerEatingHabits') || prev.partnerEatingHabits,
                            partnerDrinkingHabits: v('partnerDrinkingHabits') || prev.partnerDrinkingHabits,
                            partnerSmokingHabits: v('partnerSmokingHabits') || prev.partnerSmokingHabits,
                            partnerQualificationLevel: v('partnerQualificationLevel') || prev.partnerQualificationLevel,
                            partnerReligion: v('partnerReligion') || prev.partnerReligion,
                            partnerEthnicity: v('partnerEthnicity') || prev.partnerEthnicity,
                            partnerCountryOfOrigin: v('partnerCountryOfOrigin') || prev.partnerCountryOfOrigin,
                            partnerCountryOfResidence: v('partnerCountryOfResidence') || prev.partnerCountryOfResidence,
                            partnerAdditionalRequirements: v('partnerAdditionalRequirements') || prev.partnerAdditionalRequirements,
                            upload1: v('upload1') || prev.upload1,
                            upload2: v('upload2') || prev.upload2,
                            upload3: v('upload3') || prev.upload3,
                            profilePhoto: p.profilePhotoFromProfile || p.ProfilePhotoFromProfile || v('profilePhoto') || prev.profilePhoto,
                            remarks: v('remarks') || prev.remarks,
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile", error);
            }
        };

        fetchProfile();
        setInitialFetchDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, initialFetchDone]);

    useEffect(() => {
        // Clear city when country changes and selected city is not in that country's city list.
        if (!formData.countryOfResidence || !formData.cityOfResidence) return;
        if (residenceCities.length === 0) return;
        if (!residenceCities.includes(formData.cityOfResidence)) {
            setFormData((prev) => ({ ...prev, cityOfResidence: '' }));
        }
    }, [formData.countryOfResidence, residenceCities, formData.cityOfResidence]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'height') {
            const numericOnly = value.replace(/[^\d]/g, '').slice(0, 3);
            setFormData(prev => ({ ...prev, [name]: numericOnly }));
            return;
        }
        if (name === 'partnerMinAge') {
            const numericOnly = value.replace(/[^\d]/g, '').slice(0, 2);
            if (numericOnly === '') {
                setFormData(prev => ({ ...prev, [name]: '' }));
                return;
            }
            const normalized = Math.max(18, parseInt(numericOnly, 10) || 18);
            setFormData(prev => ({ ...prev, [name]: String(normalized) }));
            return;
        }
        if (name === 'occupation' || name === 'fatherOccupation' || name === 'motherOccupation') {
            const lettersAndSpacesOnly = value.replace(/[^\p{L}\s]/gu, '');
            setFormData(prev => ({ ...prev, [name]: lettersAndSpacesOnly }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await uploadFile(file, fieldName);
        }
        // Allow selecting the same file again to re-upload/replace.
        e.target.value = '';
    };

    const handleRemoveUploadedImage = (fieldName: AnyUploadField) => {
        setFormData((prev) => ({ ...prev, [fieldName]: '' }));
        setPreviewBusters((prev) => {
            if (!(fieldName in prev)) return prev;
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
        if (fieldName === 'profilePhoto') {
            updateUser({ profilePhoto: '' });
        }
        if (fieldName === 'horoscopeDocument') {
            updateUser({ horoscopeDocument: '' });
        }
    };

    const renderPhotoUploadField = (
        fieldName: UploadField,
        label: string,
        alt: string,
        required?: boolean
    ) => {
        const value = formData[fieldName];
        const inputId = `${fieldName}Input`;
        const isUploading = !!uploading[fieldName];

        return (
            <div className="form-group">
                <label>{label}{required ? '*' : ''}</label>
                <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, fieldName)}
                    disabled={isUploading}
                    style={{ display: 'none' }}
                />
                <label
                    htmlFor={inputId}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        border: '2px dashed #e7d8c9',
                        borderRadius: '12px',
                        padding: '1rem',
                        minHeight: '200px',
                        background: value ? `linear-gradient(rgba(17, 24, 39, 0.45), rgba(17, 24, 39, 0.45)), url(${previewSrc(fieldName, value)}) center/cover no-repeat` : '#fff',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        opacity: isUploading ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                    }}
                >
                    {value && (
                        <button
                            type="button"
                            title="Remove image"
                            aria-label="Remove image"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveUploadedImage(fieldName);
                            }}
                            disabled={isUploading}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#ef4444',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                zIndex: 2,
                            }}
                        >
                            ✕
                        </button>
                    )}
                    <div
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.92)',
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1,
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                            <path
                                fill="currentColor"
                                d="M9 4l-1.2 1.6c-.2.3-.5.4-.8.4H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2c-.3 0-.6-.1-.8-.4L15 4H9zm3 4.5A4.5 4.5 0 1 1 7.5 13 4.5 4.5 0 0 1 12 8.5zm0 2A2.5 2.5 0 1 0 14.5 13 2.5 2.5 0 0 0 12 10.5z"
                            />
                        </svg>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: value ? '#fff' : '#374151', textAlign: 'center', zIndex: 1 }}>
                        {isUploading ? 'Uploading image...' : value ? 'Tap to change image' : 'Drop your image here, or browse'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: value ? 'rgba(255,255,255,0.86)' : '#9ca3af', textAlign: 'center', zIndex: 1 }}>
                        Supports JPG, PNG, WEBP
                    </div>
                </label>
            </div>
        );
    };

    const withCacheBuster = (url: string) => {
        const cb = `cb=${Date.now()}`;
        return url.includes('?') ? `${url}&${cb}` : `${url}?${cb}`;
    };

    const previewSrc = (fieldName: string, url: string) => {
        const buster = previewBusters[fieldName];
        if (!url || !buster) return url;
        return url.includes('?') ? `${url}&cb=${buster}` : `${url}?cb=${buster}`;
    };

    const uploadFile = async (file: File, fieldName: string) => {
        setUploading(prev => ({ ...prev, [fieldName]: true }));
        setSubmitError('');

        try {
            const token = getStoredToken();
            if (!token) {
                setSubmitError('Please login again to upload documents.');
                return;
            }
            const data = new FormData();
            const safeOriginalName = file.name.replace(/[^\w.\-()]+/g, '_');
            const uniqueFileName = `${user?.id || 'user'}_${fieldName}_${Date.now()}_${safeOriginalName}`;
            data.append('File', file, uniqueFileName);
            data.append('FileName', uniqueFileName);
            data.append('storePath', 'Matrimonial/Profiles');

            const response = await fetch(`${API_BASE_URL}/AWS/DocumentUploadCommon`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: data
            });

            if (response.ok) {
                const url = await response.text();
                // Clean up any surrounding quotes
                const cleanUrl = url.replace(/^"|"$/g, '');
                setFormData(prev => ({ ...prev, [fieldName]: cleanUrl }));
                setPreviewBusters(prev => ({ ...prev, [fieldName]: Date.now() }));

                // Immediately reflect key uploads in the user context (header avatar / profile pic).
                if (fieldName === 'profilePhoto') {
                    updateUser({ profilePhoto: withCacheBuster(cleanUrl) });
                }
                if (fieldName === 'horoscopeDocument') {
                    updateUser({ horoscopeDocument: cleanUrl });
                }
            } else {
                const errorText = await response.text().catch(() => '');
                const statusHint = response.status === 401 ? ' (Unauthorized - please login again)' : '';
                setSubmitError(
                    errorText
                        ? `Failed to upload file${statusHint}: ${errorText}`
                        : `Failed to upload file${statusHint}. Please try again.`
                );
            }
        } catch (error) {
            console.error('Upload error:', error);
            setSubmitError('An error occurred during upload.');
        } finally {
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const validateStep = (currentStep: number) => {
        // Implement validation per step
        if (currentStep === 1) {
            if (!formData.gender || !formData.height || !formData.religion || !formData.maritalStatus) {
                setSubmitError('Please fill in all mandatory fields (*)');
                return false;
            }
            const heightCm = Number(formData.height);
            if (!Number.isFinite(heightCm) || heightCm < MIN_HEIGHT_CM || heightCm > MAX_HEIGHT_CM) {
                setSubmitError(`Height must be between ${MIN_HEIGHT_CM} and ${MAX_HEIGHT_CM} cm.`);
                return false;
            }
        }
        if (currentStep === 2) {
            const userCountries = formData.countryOfResidence.split(',').map((s) => s.trim()).filter(Boolean);
            if (!formData.qualificationLevel || !formData.countryOfOrigin || userCountries.length === 0 || !formData.cityOfResidence || !formData.residencyStatus) {
                setSubmitError('Please fill in all mandatory fields (*)');
                return false;
            }
        }
        if (currentStep === 3) {
            if (!formData.horoscope) {
                setSubmitError('Please select Horoscope option (*)');
                return false;
            }
            if (formData.horoscope === 'Required' && !formData.horoscopeDocument) {
                setSubmitError('Please upload Horoscope Document to continue.');
                return false;
            }
        }
        if (currentStep === 4) {
            const fatherCountries = formData.fatherCountryOfResidence.split(',').map((s) => s.trim()).filter(Boolean);
            const motherCountries = formData.motherCountryOfResidence.split(',').map((s) => s.trim()).filter(Boolean);
            if (fatherCountries.length === 0 || !formData.fatherEthnicity || !formData.fatherReligion ||
                motherCountries.length === 0 || !formData.motherEthnicity || !formData.motherReligion) {
                setSubmitError('Please fill in all mandatory fields for parents (*)');
                return false;
            }
        }
        // Add more validation as needed
        setSubmitError('');
        return true;
    };

    const buildProfilePayload = () => ({
        userId: user?.id,
        ...formData,
        height: parseFloat(formData.height) || 0,
        partnerMinAge: Math.max(18, parseInt(formData.partnerMinAge) || 18),
        partnerMaxAge: parseInt(formData.partnerMaxAge) || 60,
        dateOfBirth: formData.dob ? `${formData.dob}T00:00:00` : null
    });

    const saveDraft = async () => {
        if (!user) {
            setSubmitError('User not authenticated');
            return false;
        }

        const token = getStoredToken();
        if (!token) {
            setSubmitError('Please login again to save your progress.');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/UpdateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(buildProfilePayload())
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(errorText || 'Failed to save progress');
            }

            const result = await response.json();
            if (result.statusCode === 1 || result.statusCode === 200) {
                setSubmitError('');
                return true;
            }

            setSubmitError(result.message || 'Failed to save progress');
            return false;
        } catch (error: any) {
            setSubmitError(error?.message || 'Failed to save progress');
            return false;
        }
    };

    const handleNext = async () => {
        if (!validateStep(step)) return;
        const saved = await saveDraft();
        if (!saved) return;

        setStep(prev => prev + 1);
        window.scrollTo(0, 0);
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
        window.scrollTo(0, 0);
    };

    const handleStepClick = async (targetStep: number) => {
        if (targetStep === step) return;

        // Going forward requires current-step validation and auto-save.
        if (targetStep > step) {
            if (!validateStep(step)) return;
            const saved = await saveDraft();
            if (!saved) return;
        }

        setStep(targetStep);
        window.scrollTo(0, 0);
    };

    const saveProfile = async () => {
        // Prevent accidental auto-saves (e.g., file inputs triggering form submit in some browsers)
        if (loading) return;

        // Check if uploads are pending
        if (Object.values(uploading).some(Boolean)) {
            setSubmitError('Please wait for images to finish uploading.');
            return;
        }

        if (!user) {
            setSubmitError("User not authenticated");
            return;
        }

        const token = getStoredToken();
        if (!token) {
            setSubmitError('Please login again to save your profile.');
            return;
        }

        setLoading(true);
        setSubmitError('');

        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/UpdateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(buildProfilePayload())
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(errorText || 'Failed to update profile');
            }

            const result = await response.json();
            if (result.statusCode === 1 || result.statusCode === 200) { // Success
                // Keep UI in sync without requiring a refresh.
                if (formData.profilePhoto) {
                    updateUser({ profilePhoto: withCacheBuster(formData.profilePhoto) });
                }
                if (formData.horoscopeDocument) {
                    updateUser({ horoscopeDocument: formData.horoscopeDocument });
                }
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => {
                    setSuccessMessage('');
                    if (onComplete) onComplete();
                    if (onClose) onClose();
                }, 2000);
            } else {
                setSubmitError(result.message || 'Failed to update profile');
            }
        } catch (error: any) {
            setSubmitError(error?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="profile-completion-form">
            <div className="steps-indicator" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => handleStepClick(i)}
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '50%',
                            border: 'none',
                            background: step >= i ? 'var(--primary)' : '#ddd',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            cursor: 'pointer'
                        }}
                        title={`Go to step ${i}`}
                    >
                        {i}
                    </button>
                ))}
            </div>

            <form onSubmit={(e) => e.preventDefault()}>
                {successMessage && <div style={{ color: '#2e7d32', marginBottom: '1rem', padding: '12px 16px', background: '#e8f5e9', borderRadius: '8px', fontWeight: 600, textAlign: 'center', fontSize: '1rem' }}>{successMessage}</div>}
                {submitError && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>{submitError}</div>}

                {step === 1 && (
                    <div className="step-content">
                        <h3>Personal Details</h3>
                        <div className="form-grid step6-grid">
                            <div className="form-group">
                                <label>Gender*</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required disabled>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            {/* DOB Removed */}
                            <div className="form-group">
                                <label>Height (cm)*</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    required
                                    min={MIN_HEIGHT_CM}
                                    max={MAX_HEIGHT_CM}
                                    step={1}
                                    placeholder="e.g. 175"
                                />
                            </div>
                            <div className="form-group">
                                <label>Complexion</label>
                                <select name="complexion" value={formData.complexion} onChange={handleChange}>
                                    <option value="">Select Complexion</option>
                                    <option value="Fair">Fair</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Dark">Dark</option>
                                    <option value="Very Fair">Very Fair</option>
                                    <option value="Wheatish">Wheatish</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="religion" value={formData.religion} onChange={handleChange} required>
                                    <option value="">Select Religion</option>
                                    {sriLankanReligions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Marital Status*</label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required>
                                    <option value="">Select Status</option>
                                    <option value="Never Married">Never Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content">
                        <h3>Education & Career</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Highest Qualification*</label>
                                <select name="qualificationLevel" value={formData.qualificationLevel} onChange={handleChange} required>
                                    <option value="">Select Qualification</option>
                                    <option value="GCE O/L">GCE O/L</option>
                                    <option value="GCE A/L">GCE A/L</option>
                                    <option value="Diploma">Diploma</option>
                                    <option value="Degree">Degree</option>
                                    <option value="Masters">Masters</option>
                                    <option value="PHD">PHD</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Current Job Title" />
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Location</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Country of Origin*</label>
                                <select name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} required>
                                    <option value="">Select Country</option>
                                    {countryOptions.map((country) => (
                                        <option key={country.isoCode} value={country.name}>{country.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="user-residence"
                                    label={<>Country of Residence*</>}
                                    hint="(select one or more)"
                                    value={formData.countryOfResidence}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, countryOfResidence: v }))}
                                    countries={countryOptions}
                                />
                            </div>
                            <div className="form-group">
                                <label>City of Residence*</label>
                                <input
                                    type="text"
                                    name="cityOfResidence"
                                    value={formData.cityOfResidence}
                                    onChange={handleChange}
                                    list="country-residence-cities"
                                    placeholder={selectedResidenceCountries.length > 0 ? 'Select or type city' : 'Select country first'}
                                    required
                                />
                                <datalist id="country-residence-cities">
                                    {residenceCities.map((city) => (
                                        <option key={city} value={city} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="form-group">
                                <label>Residency Status*</label>
                                <select name="residencyStatus" value={formData.residencyStatus} onChange={handleChange} required>
                                    <option value="">Select Status</option>
                                    <option value="Citizen">Citizen</option>
                                    <option value="Student">Student</option>
                                    <option value="Permanent Residency">Permanent Residency</option>
                                    <option value="Work Permit">Work Permit</option>
                                    <option value="Refugee">Refugee</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="step-content">
                        <h3>Additional Details</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>Hobbies</label>
                                <textarea name="hobbies" value={formData.hobbies} onChange={handleChange} rows={3}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Drinking Habits</label>
                                <select name="drinkingHabits" value={formData.drinkingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                    <option value="Frequently">Frequently</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="eatingHabits" value={formData.eatingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Vegetarian">Vegetarian</option>
                                    <option value="Non-Veg">Non-Veg</option>
                                    <option value="Vegan">Vegan</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="smokingHabits" value={formData.smokingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                    <option value="Frequently">Frequently</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Horoscope Matching*</label>
                                <select name="horoscope" value={formData.horoscope} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    <option value="Required">Required</option>
                                    <option value="Not Required">Not Required</option>
                                </select>
                            </div>
                            {formData.horoscope === 'Required' && (
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label>Upload Horoscope Document</label>
                                    <input
                                        id="horoscopeDocumentInput"
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={(e) => handleFileChange(e, 'horoscopeDocument')}
                                        disabled={uploading['horoscopeDocument']}
                                        style={{ display: 'none' }}
                                    />
                                    <label
                                        htmlFor="horoscopeDocumentInput"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.3rem',
                                            border: '2px dashed #e7d8c9',
                                            borderRadius: '12px',
                                            padding: '1rem',
                                            minHeight: '200px',
                                            background: formData.horoscopeDocument ? `linear-gradient(rgba(17, 24, 39, 0.45), rgba(17, 24, 39, 0.45)), url(${previewSrc('horoscopeDocument', formData.horoscopeDocument)}) center/cover no-repeat` : '#fff',
                                            cursor: uploading['horoscopeDocument'] ? 'not-allowed' : 'pointer',
                                            opacity: uploading['horoscopeDocument'] ? 0.7 : 1,
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                        }}
                                    >
                                        {formData.horoscopeDocument && (
                                            <button
                                                type="button"
                                                title="Remove document"
                                                aria-label="Remove document"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleRemoveUploadedImage('horoscopeDocument');
                                                }}
                                                disabled={uploading['horoscopeDocument']}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    border: 'none',
                                                    background: '#ef4444',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.9rem',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                                                    zIndex: 2,
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                        <div
                                            style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.92)',
                                                color: '#111827',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 1,
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
                                                <path
                                                    fill="currentColor"
                                                    d="M9 4l-1.2 1.6c-.2.3-.5.4-.8.4H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2c-.3 0-.6-.1-.8-.4L15 4H9zm3 4.5A4.5 4.5 0 1 1 7.5 13 4.5 4.5 0 0 1 12 8.5zm0 2A2.5 2.5 0 1 0 14.5 13 2.5 2.5 0 0 0 12 10.5z"
                                                />
                                            </svg>
                                        </div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: formData.horoscopeDocument ? '#fff' : '#374151', textAlign: 'center', zIndex: 1 }}>
                                            {uploading['horoscopeDocument'] ? 'Uploading document...' : formData.horoscopeDocument ? 'Tap to change document' : 'Drop your document here, or browse'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: formData.horoscopeDocument ? 'rgba(255,255,255,0.86)' : '#9ca3af', textAlign: 'center', zIndex: 1 }}>
                                            Supports JPG, PNG, PDF, DOC, DOCX
                                        </div>
                                    </label>
                                    {formData.horoscopeDocument && (
                                        <button
                                            type="button"
                                            onClick={() => setHoroscopePopupOpen(true)}
                                            style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.5rem', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                                        >
                                            View Full Image
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="step-content">
                        <h3>Parents Details</h3>

                        <h4 style={{ marginTop: '1rem', color: 'var(--primary)' }}>Father</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Father's Name</label>
                                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} placeholder="Full Name" />
                            </div>
                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="father-residence"
                                    label={<>Country of Residence*</>}
                                    hint="(select one or more)"
                                    value={formData.fatherCountryOfResidence}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, fatherCountryOfResidence: v }))}
                                    countries={countryOptions}
                                />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="fatherOccupation" value={formData.fatherOccupation} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Ethnicity*</label>
                                <select name="fatherEthnicity" value={formData.fatherEthnicity} onChange={handleChange} required>
                                    <option value="">Select Ethnicity</option>
                                    {sriLankanEthnicities.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="fatherReligion" value={formData.fatherReligion} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    {sriLankanReligions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caste</label>
                                <select name="fatherCaste" value={formData.fatherCaste} onChange={handleChange}>
                                    <option value="">Select Caste</option>
                                    {sriLankanCastes.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <input type="text" name="fatherRemarks" value={formData.fatherRemarks} onChange={handleChange} />
                            </div>
                        </div>

                        <h4 style={{ marginTop: '2rem', color: 'var(--primary)' }}>Mother</h4>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Mother's Name</label>
                                <input type="text" name="motherName" value={formData.motherName} onChange={handleChange} placeholder="Full Name" />
                            </div>
                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="mother-residence"
                                    label={<>Country of Residence*</>}
                                    hint="(select one or more)"
                                    value={formData.motherCountryOfResidence}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, motherCountryOfResidence: v }))}
                                    countries={countryOptions}
                                />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input type="text" name="motherOccupation" value={formData.motherOccupation} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Ethnicity*</label>
                                <select name="motherEthnicity" value={formData.motherEthnicity} onChange={handleChange} required>
                                    <option value="">Select Ethnicity</option>
                                    {sriLankanEthnicities.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="motherReligion" value={formData.motherReligion} onChange={handleChange} required>
                                    <option value="">Select</option>
                                    {sriLankanReligions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Caste</label>
                                <select name="motherCaste" value={formData.motherCaste} onChange={handleChange}>
                                    <option value="">Select Caste</option>
                                    {sriLankanCastes.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Remarks</label>
                                <input type="text" name="motherRemarks" value={formData.motherRemarks} onChange={handleChange} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="step-content">
                        <h3>Partner Preferences</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Age Range (Years)</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input type="number" name="partnerMinAge" value={formData.partnerMinAge} onChange={handleChange} placeholder="Min" min={18} style={{ width: '50%' }} />
                                    <input type="number" name="partnerMaxAge" value={formData.partnerMaxAge} onChange={handleChange} placeholder="Max" style={{ width: '50%' }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="partnerEatingHabits" value={formData.partnerEatingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Vegetarian">Vegetarian</option>
                                    <option value="Non-Veg">Non-Veg</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Drinking Habits</label>
                                <select name="partnerDrinkingHabits" value={formData.partnerDrinkingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="partnerSmokingHabits" value={formData.partnerSmokingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Never">Never</option>
                                    <option value="Occasionally">Occasionally</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Min Qualification</label>
                                <select name="partnerQualificationLevel" value={formData.partnerQualificationLevel} onChange={handleChange}>
                                    <option value="">Any</option>
                                    <option value="Degree">Degree</option>
                                    <option value="GCE A/L">GCE A/L</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Religion (Preferred)</label>
                                <select name="partnerReligion" value={formData.partnerReligion} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {sriLankanReligions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Ethnicity (Preferred)</label>
                                <select name="partnerEthnicity" value={formData.partnerEthnicity} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {sriLankanEthnicities.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Country of Origin</label>
                                <select name="partnerCountryOfOrigin" value={formData.partnerCountryOfOrigin} onChange={handleChange}>
                                    <option value="">Anyway</option>
                                    {countryOptions.map((country) => (
                                        <option key={country.isoCode} value={country.name}>{country.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Country of Residence</label>
                                <select name="partnerCountryOfResidence" value={formData.partnerCountryOfResidence} onChange={handleChange}>
                                    <option value="">Anywhere</option>
                                    {countryOptions.map((country) => (
                                        <option key={country.isoCode} value={country.name}>{country.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>Additional Requirements</label>
                                <textarea name="partnerAdditionalRequirements" value={formData.partnerAdditionalRequirements} onChange={handleChange} rows={3}></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="step-content">
                        <h3>Profile Verification & Uploads</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>General Remarks</label>
                                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}></textarea>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4>Profile Photos</h4>
                            </div>

                            {renderPhotoUploadField('profilePhoto', 'Main Profile Photo', 'Profile', true)}
                            {renderPhotoUploadField('upload1', 'Gallery Photo 1', 'Gallery 1')}
                            {renderPhotoUploadField('upload2', 'Gallery Photo 2', 'Gallery 2')}
                            {renderPhotoUploadField('upload3', 'Gallery Photo 3', 'Gallery 3')}
                        </div>
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                    {step > 1 ? (
                        <button type="button" className="btn btn-outline" onClick={handlePrev}>Previous</button>
                    ) : <div></div>}

                    {step < 6 ? (
                        <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>
                    ) : (
                        <button type="button" className="btn btn-primary" disabled={loading} onClick={saveProfile}>
                            {loading ? 'Saving...' : 'Save Profile'}
                        </button>
                    )}
                </div>
            </form>

            <style jsx>{`
                .profile-completion-form {
                    padding: 1rem;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.5rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                }
                .form-group label {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: #555;
                }
                .form-group input, .form-group select, .form-group textarea {
                    padding: 0.8rem;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 1rem;
                    transition: border-color 0.3s;
                }
                .step6-grid {
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                }
                .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                h3 {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 0.5rem;
                    margin-bottom: 1.5rem;
                    color: var(--primary);
                }
            `}</style>

            {horoscopePopupOpen && formData.horoscopeDocument && (
                <div
                    onClick={() => setHoroscopePopupOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                >
                    <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                        <button
                            type="button"
                            onClick={() => setHoroscopePopupOpen(false)}
                            style={{ position: 'absolute', top: '-12px', right: '-12px', width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', zIndex: 1 }}
                        >
                            ✕
                        </button>
                        <img
                            src={previewSrc('horoscopeDocument', formData.horoscopeDocument)}
                            alt="Horoscope"
                            style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain', background: 'white' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
