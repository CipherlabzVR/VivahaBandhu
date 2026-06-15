'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode, type CSSProperties, type RefObject } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Country, City } from 'country-state-city';
import { getStoredToken } from '../../utils/authStorage';
import { sanitizeNameInput } from '../../utils/nameInput';
import HoroscopeLightbox from '../../components/HoroscopeLightbox';
import { MATRIMONIAL_RELIGION_OPTIONS } from '../../constants/matrimonialReligions';
import { usePendingBankPremiumApproval } from '../../hooks/usePendingBankPremiumApproval';
import { isRelationAccountType } from '../../utils/matrimonialAccountTypes';
import { matrimonialService } from '../../services/matrimonialService';
import { sanitizeNicInput, nicOrPassportFormatError, parseNicToDobAndGender } from '../../utils/nicInput';
import { sanitizeSriLankanPhoneInput, sriLankanPhoneFormatErrorIfInvalid } from '../../utils/sriLankanPhone';
import { AUTH_FIELD_MAX_LENGTH } from '../../constants/inputLimits';
import {
    isManagedProfileCreateResponseSuccess,
    isManagedProfileDraftPersistBlocked,
    loadManagedProfileDraft,
    markManagedProfileDraftCompleted,
    managedProfileDraftHasContent,
    saveManagedProfileDraft,
    shouldRestoreManagedProfileDraft,
} from '../../utils/managedProfileDraft';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

type CountryOption = { name: string; isoCode: string };

const fieldErrorTextStyle: CSSProperties = {
    color: '#b91c1c',
    fontSize: '0.8rem',
    display: 'block',
    marginTop: '0.25rem',
};

function FieldErrorMessage({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <span style={fieldErrorTextStyle} role="alert">
            {message}
        </span>
    );
}

/** Comma-separated values from a fixed list of string options (e.g. ethnicity, religion). */
function OptionMultiSelect({
    idPrefix,
    label,
    value,
    onChange,
    options,
    placeholder = 'Any',
    searchable = false,
}: {
    idPrefix: string;
    label: ReactNode;
    value: string;
    onChange: (commaJoined: string) => void;
    options: string[];
    placeholder?: string;
    searchable?: boolean;
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

    const toggle = (opt: string) => {
        const cur = value.split(',').map((s) => s.trim()).filter(Boolean);
        const next = cur.includes(opt) ? cur.filter((c) => c !== opt) : [...cur, opt];
        onChange(next.join(', '));
    };

    const filtered = useMemo(() => {
        const t = search.toLowerCase().trim();
        return options.filter((o) => !t || o.toLowerCase().includes(t));
    }, [options, search]);

    return (
        <div className="country-multi-select" ref={wrapRef} style={{ position: 'relative' }}>
            <label>{label}</label>
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
                                Ã—
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="country-multi-placeholder">{placeholder}</span>
                )}
            </div>
            {open && (
                <div className="country-multi-panel">
                    {searchable && (
                        <div className="country-multi-search-wrap">
                            <input
                                type="text"
                                className="country-multi-search"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    <div className="country-multi-list">
                        {filtered.map((opt) => {
                            const cid = `${idPrefix}-${opt.replace(/\s+/g, '-')}`;
                            const isOn = selected.includes(opt);
                            return (
                                <label
                                    key={opt}
                                    htmlFor={cid}
                                    className={`country-multi-row ${isOn ? 'selected' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        id={cid}
                                        type="checkbox"
                                        className="country-multi-checkbox"
                                        checked={isOn}
                                        onChange={() => toggle(opt)}
                                    />
                                    <span className="country-multi-text">{opt}</span>
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

/**
 * Autocomplete input for free-text city selection backed by a (potentially huge)
 * suggestion list. We deliberately avoid the native <datalist> here because some
 * browsers (notably Chrome) silently truncate or stop showing suggestions once
 * the option count grows into the thousands - which is exactly what happens
 * when a user picks a large country like India or the US in the residence list.
 *
 * Behaviour:
 *  - Free typing is always allowed (the dataset is incomplete for many regions).
 *  - Typing filters the suggestion list as a case-insensitive substring match.
 *  - Visible matches are capped to keep the dropdown responsive.
 *  - Click a suggestion to fill the field; outside-click / Escape closes.
 */
type CityGroup = { country: string; cities: string[] };

function CityAutocomplete({
    name,
    value,
    onChange,
    cityGroups,
    placeholder,
    required,
    disabled,
}: {
    name: string;
    value: string;
    onChange: (next: string) => void;
    cityGroups: CityGroup[];
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);
    const MAX_VISIBLE = 100;

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    /**
     * Per-group filtered matches. Cities are kept in their own country bucket
     * so the dropdown shows them separated rather than alphabetically mixed.
     * The MAX_VISIBLE budget is shared across all groups - each group may also
     * surface a "+N more" hint when its own bucket exceeds its share.
     */
    const filteredGroups = useMemo(() => {
        const q = value.trim().toLowerCase();
        let remaining = MAX_VISIBLE;
        return cityGroups.map((group) => {
            const startsWith: string[] = [];
            const contains: string[] = [];
            for (const c of group.cities) {
                const lc = c.toLowerCase();
                if (q && lc === q) continue;
                if (!q) {
                    startsWith.push(c);
                } else if (lc.startsWith(q)) {
                    startsWith.push(c);
                } else if (lc.includes(q)) {
                    contains.push(c);
                }
            }
            const allMatched = [...startsWith, ...contains];
            const take = Math.min(allMatched.length, Math.max(0, remaining));
            const visible = allMatched.slice(0, take);
            remaining -= visible.length;
            return {
                country: group.country,
                visible,
                hiddenCount: allMatched.length - visible.length,
                totalMatched: allMatched.length,
            };
        });
    }, [value, cityGroups]);

    const totalVisible = filteredGroups.reduce((sum, g) => sum + g.visible.length, 0);
    const hasAnything = filteredGroups.some((g) => g.totalMatched > 0);

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <input
                type="text"
                name={name}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    if (!open) setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false);
                }}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                autoComplete="off"
            />
            {open && !disabled && hasAnything && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 2px)',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 6,
                        maxHeight: 260,
                        overflowY: 'auto',
                        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                    }}
                >
                    {filteredGroups.map((group) => {
                        if (group.visible.length === 0) return null;
                        const showCountryHeader = cityGroups.length > 1;
                        return (
                            <div key={group.country}>
                                {showCountryHeader && (
                                    <div
                                        style={{
                                            padding: '0.4rem 0.7rem',
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            color: '#8a6d3b',
                                            background: '#fdf6ec',
                                            borderTop: '1px solid #f1e6d2',
                                            borderBottom: '1px solid #f1e6d2',
                                            position: 'sticky',
                                            top: 0,
                                        }}
                                    >
                                        {group.country}
                                    </div>
                                )}
                                {group.visible.map((city) => (
                                    <div
                                        key={`${group.country}::${city}`}
                                        role="option"
                                        aria-selected={city === value}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            onChange(city);
                                            setOpen(false);
                                        }}
                                        style={{
                                            padding: '0.45rem 0.7rem',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            background: city === value ? '#f5efe6' : 'transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.background = '#fdf6ec';
                                        }}
                                        onMouseLeave={(e) => {
                                            (e.currentTarget as HTMLDivElement).style.background =
                                                city === value ? '#f5efe6' : 'transparent';
                                        }}
                                    >
                                        {city}
                                    </div>
                                ))}
                                {group.hiddenCount > 0 && (
                                    <div
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            fontSize: '0.72rem',
                                            color: '#888',
                                            background: '#fafafa',
                                        }}
                                    >
                                        +{group.hiddenCount} more in {group.country} - keep typing to narrow down
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {totalVisible === 0 && (
                        <div
                            style={{
                                padding: '0.5rem 0.7rem',
                                fontSize: '0.85rem',
                                color: '#888',
                            }}
                        >
                            No matches - your typed value will be kept as-is.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

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
                                Ã—
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

export default function ProfileCompletionForm({
    onClose,
    onComplete,
    scrollContainerRef,
    managedCreate,
    managedEdit,
}: {
    onClose?: () => void;
    onComplete?: () => void;
    /** Scroll host for the full-screen detailed profile modal (step changes scroll this to top). */
    scrollContainerRef?: RefObject<HTMLElement | null>;
    /** When set, creates a managed sub-profile for the parent in one step (no separate login). */
    managedCreate?: {
        parentUserId: number;
    };
    /** When set, edits an existing managed sub-profile owned by the parent. */
    managedEdit?: {
        parentUserId: number;
        subUserId: number;
    };
}) {
    const { user, updateUser } = useAuth();
    const bankPremiumAwaitingApproval = usePendingBankPremiumApproval(user?.isSubscribed);
    const router = useRouter();
    const isManagedFlow = !!(managedCreate || managedEdit);
    const managedParentUserId = managedCreate?.parentUserId ?? managedEdit?.parentUserId;
    /**
     * Relation accounts only need to fill the Partner Preferences section in the
     * detailed profile editor. Parents and Self complete the full wizard.
     */
    const isPartnerPrefsOnly = !isManagedFlow && isRelationAccountType(user?.accountType);
    const [step, setStep] = useState(isPartnerPrefsOnly ? 5 : 1);
    useEffect(() => {
        if (isPartnerPrefsOnly && step !== 5) setStep(5);
    }, [isPartnerPrefsOnly, step]);
    const [managedBasic, setManagedBasic] = useState({
        firstName: '',
        lastName: '',
        nic: '',
        dob: '',
        gender: '',
        phone: '',
        whatsapp: '',
        profilePhotoBase64: '',
    });
    const [managedPhotoPreview, setManagedPhotoPreview] = useState('');
    const [managedDraftHydrated, setManagedDraftHydrated] = useState(!managedCreate);
    const [managedDraftNotice, setManagedDraftNotice] = useState<string | null>(null);
    const managedDraftHydratedRef = useRef(!managedCreate);
    const managedSkipDraftPersistRef = useRef(false);
    const managedDraftSnapshotRef = useRef({
        step: 1,
        managedBasic: {
            firstName: '',
            lastName: '',
            nic: '',
            dob: '',
            gender: '',
            phone: '',
            whatsapp: '',
            profilePhotoBase64: '',
        },
        managedPhotoPreview: '',
        formData: {} as Record<string, string>,
    });
    const managedHasNicInput = managedBasic.nic.trim().length > 0;
    const managedNicLocksDobGender = !!parseNicToDobAndGender(managedBasic.nic);
    const managedDobGenderDisabled = !managedHasNicInput || managedNicLocksDobGender;
    const managedDobGenderTitle = !managedHasNicInput
        ? 'Enter NIC or passport number first'
        : managedNicLocksDobGender
            ? 'Locked — values are taken from the NIC. Clear or change ID to edit manually.'
            : 'Enter manually for passport; a valid NIC auto-fills and locks these fields.';

    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [successMessage, setSuccessMessage] = useState('');

    const clearFieldError = (name: string) => {
        setFieldErrors((prev) => {
            if (!prev[name]) return prev;
            const next = { ...prev };
            delete next[name];
            return next;
        });
    };

    const applyFieldErrors = (errors: Record<string, string>) => {
        setFieldErrors(errors);
        setSubmitError('');
    };

    const fieldInputStyle = (name: string): CSSProperties | undefined =>
        fieldErrors[name] ? { borderColor: '#b91c1c' } : undefined;
    const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
    const [previewBusters, setPreviewBusters] = useState<Record<string, number>>({});
    type HoroscopeViewerSlot = null | 'horoscopeDocument' | 'horoscopeDocument2' | 'horoscopeDocument3';
    const [horoscopeViewerSlot, setHoroscopeViewerSlot] = useState<HoroscopeViewerSlot>(null);
    const horoscopeFileInputRef = useRef<HTMLInputElement>(null);
    const horoscopeDocument2FileInputRef = useRef<HTMLInputElement>(null);
    const horoscopeDocument3FileInputRef = useRef<HTMLInputElement>(null);
    const profilePhotoFileInputRef = useRef<HTMLInputElement>(null);
    const upload1FileInputRef = useRef<HTMLInputElement>(null);
    const upload2FileInputRef = useRef<HTMLInputElement>(null);
    const upload3FileInputRef = useRef<HTMLInputElement>(null);
    const wizardStepsAnchorRef = useRef<HTMLDivElement>(null);
    const activeStepContentRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        setHoroscopeViewerSlot(null);
    }, [step]);

    useEffect(() => {
        const scrollToStepSection = () => {
            const scrollHost = scrollContainerRef?.current;

            if (isManagedFlow && step > 1) {
                const scrollTarget = activeStepContentRef.current ?? wizardStepsAnchorRef.current;
                if (scrollTarget && scrollHost) {
                    const hostRect = scrollHost.getBoundingClientRect();
                    const targetRect = scrollTarget.getBoundingClientRect();
                    scrollHost.scrollTo({
                        top: scrollHost.scrollTop + (targetRect.top - hostRect.top),
                        left: 0,
                        behavior: 'auto',
                    });
                }
                return;
            }

            if (isManagedFlow && step === 1) {
                scrollHost?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                return;
            }

            if (!isManagedFlow) {
                if (scrollHost) {
                    scrollHost.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                } else if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
                }
            }
        };

        requestAnimationFrame(scrollToStepSection);
    }, [step, isManagedFlow, scrollContainerRef]);

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
        horoscopeDocument2: '',
        horoscopeDocument3: '',

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

    const handleManagedNicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        clearFieldError('managedNic');
        const value = sanitizeNicInput(e.target.value);
        if (!value.trim()) {
            setManagedBasic(p => ({ ...p, nic: value, dob: '', gender: '' }));
            setFormData(prev => ({ ...prev, dob: '', gender: '' }));
            return;
        }
        const parsed = parseNicToDobAndGender(value);
        setManagedBasic(p => {
            const next = { ...p, nic: value };
            if (parsed) {
                return { ...next, dob: parsed.dob, gender: parsed.gender };
            }
            return next;
        });
        if (parsed) {
            setFormData(prev => ({ ...prev, dob: parsed.dob, gender: parsed.gender }));
        }
    };

    useEffect(() => {
        if (!managedCreate?.parentUserId) return;

        if (!shouldRestoreManagedProfileDraft(managedCreate.parentUserId)) {
            setManagedDraftHydrated(true);
            managedDraftHydratedRef.current = true;
            return;
        }

        const draft = loadManagedProfileDraft(managedCreate.parentUserId);
        if (draft && managedProfileDraftHasContent(draft)) {
            setManagedBasic({
                firstName: draft.managedBasic.firstName ?? '',
                lastName: draft.managedBasic.lastName ?? '',
                nic: draft.managedBasic.nic ?? '',
                dob: draft.managedBasic.dob ?? '',
                gender: draft.managedBasic.gender ?? '',
                phone: draft.managedBasic.phone ?? '',
                whatsapp: draft.managedBasic.whatsapp ?? '',
                profilePhotoBase64: draft.managedBasic.profilePhotoBase64 ?? '',
            });
            setManagedPhotoPreview(draft.managedPhotoPreview ?? '');
            setFormData((prev) => ({ ...prev, ...draft.formData }));
            if (draft.step >= 1 && draft.step <= 6) {
                setStep(draft.step);
            }
            setManagedDraftNotice('Your saved draft was restored. Changes are saved locally as you fill the form.');
        }

        setManagedDraftHydrated(true);
        managedDraftHydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managedCreate?.parentUserId]);

    useEffect(() => {
        if (!managedCreate?.parentUserId) return;
        managedDraftSnapshotRef.current = { step, managedBasic, managedPhotoPreview, formData };
    }, [managedCreate?.parentUserId, step, managedBasic, managedPhotoPreview, formData]);

    useEffect(() => {
        if (!managedCreate?.parentUserId || !managedDraftHydrated) return;

        const timer = window.setTimeout(() => {
            if (managedSkipDraftPersistRef.current) return;
            if (isManagedProfileDraftPersistBlocked(managedCreate.parentUserId)) return;
            saveManagedProfileDraft(managedCreate.parentUserId, {
                step,
                managedBasic,
                managedPhotoPreview,
                formData,
            });
        }, 500);

        return () => window.clearTimeout(timer);
    }, [managedCreate?.parentUserId, managedDraftHydrated, step, managedBasic, managedPhotoPreview, formData]);

    useEffect(() => {
        if (!managedCreate?.parentUserId) return;
        return () => {
            if (!managedDraftHydratedRef.current || managedSkipDraftPersistRef.current) return;
            if (isManagedProfileDraftPersistBlocked(managedCreate.parentUserId)) return;
            saveManagedProfileDraft(managedCreate.parentUserId, managedDraftSnapshotRef.current);
        };
    }, [managedCreate?.parentUserId]);

    useEffect(() => {
        if (!managedDraftNotice) return;
        const timer = window.setTimeout(() => setManagedDraftNotice(null), 8000);
        return () => window.clearTimeout(timer);
    }, [managedDraftNotice]);

    // Only fetch once when the form mounts (not on every user state change).
    const [initialFetchDone, setInitialFetchDone] = useState(false);

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

    /**
     * Cities grouped by their source country. Used by <CityAutocomplete /> so
     * that when the user selects 2+ residence countries, cities are not
     * interleaved alphabetically (e.g. an Indian city showing up between two
     * Sri Lankan ones) - instead each country gets its own labelled section.
     */
    const residenceCityGroups = useMemo(
        () =>
            selectedResidenceCountries.map((country) => ({
                country,
                cities: getCitiesForCountry(country),
            })),
        [selectedResidenceCountries, countryIsoByName]
    );

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

    /**
     * Canonical option lists for habit / qualification dropdowns.
     * Both the user-side and partner-side selects render from these so the available
     * choices never drift out of sync (previously partner dropdowns were missing
     * options like "Vegan", "Frequently", "Diploma", "Masters", "PHD", "Other").
     */
    const qualificationOptions = [
        'GCE O/L',
        'GCE A/L',
        'Diploma',
        'Degree',
        'Masters',
        'PHD',
        'Other',
    ];
    const eatingHabitOptions = ['Vegetarian', 'Non-Veg', 'Vegan'];
    const drinkingHabitOptions = ['Never', 'Occasionally', 'Frequently'];
    const smokingHabitOptions = ['Never', 'Occasionally', 'Frequently'];

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

        if (managedCreate) {
            setInitialFetchDone(true);
            return;
        }

        const applyProfileResult = (p: Record<string, unknown>) => {
            const v = (key: string) => String(p[key] ?? p[key.charAt(0).toUpperCase() + key.slice(1)] ?? '');
            const vOpt = (key: string) => {
                const raw = v(key);
                return raw === '-' ? '' : raw;
            };
            setFormData(prev => ({
                ...prev,
                gender: v('gender') || prev.gender,
                dob: safeDate(String(p.dateOfBirth ?? p.DateOfBirth ?? '')) || prev.dob,
                height: String(p.height ?? p.Height ?? prev.height),
                complexion: v('complexion') || prev.complexion,
                religion: v('religion') || prev.religion,
                maritalStatus: v('maritalStatus') || prev.maritalStatus,
                qualificationLevel: v('qualificationLevel') || prev.qualificationLevel,
                occupation: sanitizeNameInput(String(v('occupation') || prev.occupation || '')),
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
                horoscopeDocument2: v('horoscopeDocument2') || prev.horoscopeDocument2,
                horoscopeDocument3: v('horoscopeDocument3') || prev.horoscopeDocument3,
                fatherName: v('fatherName') || prev.fatherName,
                fatherCountryOfResidence: vOpt('fatherCountryOfResidence') || prev.fatherCountryOfResidence,
                fatherOccupation: sanitizeNameInput(String(v('fatherOccupation') || prev.fatherOccupation || '')),
                fatherEthnicity: vOpt('fatherEthnicity') || prev.fatherEthnicity,
                fatherReligion: v('fatherReligion') || prev.fatherReligion,
                fatherCaste: vOpt('fatherCaste') || prev.fatherCaste,
                fatherRemarks: vOpt('fatherRemarks') || prev.fatherRemarks,
                motherName: v('motherName') || prev.motherName,
                motherCountryOfResidence: vOpt('motherCountryOfResidence') || prev.motherCountryOfResidence,
                motherOccupation: sanitizeNameInput(String(v('motherOccupation') || prev.motherOccupation || '')),
                motherEthnicity: vOpt('motherEthnicity') || prev.motherEthnicity,
                motherReligion: v('motherReligion') || prev.motherReligion,
                motherCaste: vOpt('motherCaste') || prev.motherCaste,
                motherRemarks: vOpt('motherRemarks') || prev.motherRemarks,
                partnerMinAge: String(p.partnerMinAge ?? p.PartnerMinAge ?? prev.partnerMinAge),
                partnerMaxAge: String(p.partnerMaxAge ?? p.PartnerMaxAge ?? prev.partnerMaxAge),
                partnerEatingHabits: vOpt('partnerEatingHabits') || prev.partnerEatingHabits,
                partnerDrinkingHabits: vOpt('partnerDrinkingHabits') || prev.partnerDrinkingHabits,
                partnerSmokingHabits: vOpt('partnerSmokingHabits') || prev.partnerSmokingHabits,
                partnerQualificationLevel: v('partnerQualificationLevel') || prev.partnerQualificationLevel,
                partnerReligion: v('partnerReligion') || prev.partnerReligion,
                partnerEthnicity: v('partnerEthnicity') || prev.partnerEthnicity,
                partnerCountryOfOrigin: vOpt('partnerCountryOfOrigin') || prev.partnerCountryOfOrigin,
                partnerCountryOfResidence: vOpt('partnerCountryOfResidence') || prev.partnerCountryOfResidence,
                partnerAdditionalRequirements: v('partnerAdditionalRequirements') || prev.partnerAdditionalRequirements,
                upload1: v('upload1') || prev.upload1,
                upload2: v('upload2') || prev.upload2,
                upload3: v('upload3') || prev.upload3,
                profilePhoto:
                    String(p.profilePhotoFromProfile ?? p.ProfilePhotoFromProfile ?? v('profilePhoto') ?? prev.profilePhoto),
                remarks: v('remarks') || prev.remarks,
            }));
        };

        const fetchProfile = async () => {
            try {
                const token = getStoredToken();
                if (!token) return;

                const profileUserId = managedEdit?.subUserId ?? Number(user.id);
                const requesterParam = managedEdit
                    ? `&requesterUserId=${managedEdit.parentUserId}`
                    : '';
                const response = await fetch(
                    `${API_BASE_URL}/Matrimonial/GetProfile?userId=${profileUserId}${requesterParam}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );

                if (!response.ok) return;
                const data = await response.json();
                const p = data?.result;
                if (!p || typeof p !== 'object') return;

                if (managedEdit) {
                    const phoneDigits = String(p.phoneNumber ?? p.PhoneNumber ?? '').replace(/\D/g, '');
                    const whatsappDigits = String(p.whatsApp ?? p.WhatsApp ?? phoneDigits).replace(/\D/g, '');
                    const gender = String(p.gender ?? p.Gender ?? '');
                    const dob = safeDate(String(p.dateOfBirth ?? p.DateOfBirth ?? ''));
                    setManagedBasic({
                        firstName: String(p.firstName ?? p.FirstName ?? '').trim(),
                        lastName: String(p.lastName ?? p.LastName ?? '').trim(),
                        nic: String(p.nic ?? p.Nic ?? '').trim(),
                        dob,
                        gender,
                        phone: phoneDigits,
                        whatsapp: whatsappDigits,
                        profilePhotoBase64: '',
                    });
                    const photo = String(p.profilePhoto ?? p.ProfilePhoto ?? '').trim();
                    if (photo) setManagedPhotoPreview(photo);
                }

                applyProfileResult(p as Record<string, unknown>);
            } catch (error) {
                console.error('Failed to fetch profile', error);
            }
        };

        if (!managedEdit) {
            setFormData(prev => ({
                ...prev,
                dob: safeDate(user.dob) || prev.dob,
                gender: user.gender || prev.gender,
            }));
        }

        fetchProfile();
        setInitialFetchDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, initialFetchDone, managedCreate, managedEdit?.subUserId, managedEdit?.parentUserId]);

    useEffect(() => {
        // If the user removes all residence countries, drop the now-orphaned city.
        // We deliberately do NOT clear when the typed value is missing from the
        // suggestion list - that list is incomplete for many regions and free
        // typing must remain valid (otherwise the city box wipes itself the
        // moment a user types a small town the dataset doesn't know about).
        if (!formData.countryOfResidence && formData.cityOfResidence) {
            setFormData((prev) => ({ ...prev, cityOfResidence: '' }));
        }
    }, [formData.countryOfResidence, formData.cityOfResidence]);

    const LETTERS_ONLY_FIELDS = new Set([
        'fatherName',
        'motherName',
        'occupation',
        'fatherOccupation',
        'motherOccupation',
    ]);

    /** Transient inline error per field (e.g. "Numbers are not allowed in Occupation."). */
    const [lettersOnlyErrors, setLettersOnlyErrors] = useState<Record<string, string | null>>({});

    const lettersOnlyLabel = (name: string): string => {
        switch (name) {
            case 'fatherName': return "Father's name";
            case 'motherName': return "Mother's name";
            case 'occupation': return 'Occupation';
            case 'fatherOccupation': return "Father's occupation";
            case 'motherOccupation': return "Mother's occupation";
            default: return 'This field';
        }
    };

    /** Block digits / symbols from being typed into letters-only fields BEFORE they enter the DOM value. */
    const handleLettersOnlyBeforeInput: React.FormEventHandler<HTMLInputElement> = (e) => {
        const target = e.target as HTMLInputElement;
        if (!LETTERS_ONLY_FIELDS.has(target.name)) return;
        const native = e.nativeEvent as InputEvent;
        const incoming = native.data;
        if (incoming == null) return;
        if (!/^[\p{L}\s'-]+$/u.test(incoming)) {
            e.preventDefault();
            setLettersOnlyErrors((prev) => ({
                ...prev,
                [target.name]: `${lettersOnlyLabel(target.name)} can only contain letters — numbers and symbols are not allowed.`,
            }));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        clearFieldError(name);
        let nextValue: string = value;
        // Letters-only fields: names + occupations (own / father / mother).
        // Father / Mother names are the only "name" inputs in this wizard;
        // own-name lives on AppUser and is edited from profile/page.tsx.
        if (LETTERS_ONLY_FIELDS.has(name)) {
            nextValue = sanitizeNameInput(value);
            // If sanitize had to strip something (e.g. pasted "Engineer123"),
            // surface a transient inline message so the user understands why.
            if (nextValue !== value) {
                setLettersOnlyErrors((prev) => ({
                    ...prev,
                    [name]: `${lettersOnlyLabel(name)} can only contain letters — numbers and symbols are not allowed.`,
                }));
            } else if (lettersOnlyErrors[name]) {
                setLettersOnlyErrors((prev) => ({ ...prev, [name]: null }));
            }
        }
        // Partner age fields must be digits only. type="number" still allows
        // "e", "+", "-", "." through, and pasting a string slips in - strip
        // anything that isn't a digit and cap at 3 chars (max 999, plenty).
        else if (name === 'partnerMinAge' || name === 'partnerMaxAge') {
            nextValue = value.replace(/\D+/g, '').slice(0, 3);
        }
        setFormData(prev => ({ ...prev, [name]: nextValue }));
    };

    /** Auto-clear letters-only validation messages a couple of seconds after the last bad keystroke. */
    useEffect(() => {
        const hasAny = Object.values(lettersOnlyErrors).some(Boolean);
        if (!hasAny) return;
        const id = window.setTimeout(() => setLettersOnlyErrors({}), 3000);
        return () => window.clearTimeout(id);
    }, [lettersOnlyErrors]);

    // Enforce sequential photo uploads: a gallery slot is only writable
    // once the prior slot already has a stored URL. The Main Profile Photo
    // is the gate for Gallery 1, Gallery 1 gates Gallery 2, etc.
    const photoPrerequisite = (fieldName: string): { ok: boolean; message?: string } => {
        switch (fieldName) {
            case 'upload1':
                if (!formData.profilePhoto) {
                    return { ok: false, message: 'Please upload your Main Profile Photo first.' };
                }
                break;
            case 'upload2':
                if (!formData.upload1) {
                    return { ok: false, message: 'Please upload Gallery Photo 1 before Gallery Photo 2.' };
                }
                break;
            case 'upload3':
                if (!formData.upload2) {
                    return { ok: false, message: 'Please upload Gallery Photo 2 before Gallery Photo 3.' };
                }
                break;
            case 'horoscopeDocument2':
                if (!formData.horoscopeDocument) {
                    return {
                        ok: false,
                        message: 'Upload the primary horoscope document first (step 3), then add an extra page here if needed.',
                    };
                }
                break;
            case 'horoscopeDocument3':
                if (!formData.horoscopeDocument2) {
                    return {
                        ok: false,
                        message: 'Upload horoscope page 2 before adding a third page.',
                    };
                }
                break;
        }
        return { ok: true };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        clearFieldError(fieldName);
        const gate = photoPrerequisite(fieldName);
        if (!gate.ok) {
            applyFieldErrors({ [fieldName]: gate.message || 'Please upload the previous photo first.' });
            // Reset so the user can retry once the prerequisite is satisfied.
            e.target.value = '';
            return;
        }
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            await uploadFile(file, fieldName);
        }
        // Allow selecting the same file again to re-upload/replace.
        e.target.value = '';
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
        clearFieldError(fieldName);
        setSubmitError('');

        try {
            const token = getStoredToken();
            if (!token) {
                applyFieldErrors({ [fieldName]: 'Please login again to upload documents.' });
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

                if (!isManagedFlow) {
                    // Immediately reflect key uploads in the user context (header avatar / profile pic).
                    if (fieldName === 'profilePhoto') {
                        updateUser({ profilePhoto: withCacheBuster(cleanUrl) });
                    }
                    if (fieldName === 'horoscopeDocument') {
                        updateUser({ horoscopeDocument: withCacheBuster(cleanUrl) });
                    }
                    if (fieldName === 'horoscopeDocument2') {
                        updateUser({ horoscopeDocument2: withCacheBuster(cleanUrl) });
                    }
                    if (fieldName === 'horoscopeDocument3') {
                        updateUser({ horoscopeDocument3: withCacheBuster(cleanUrl) });
                    }
                }

                if (!managedCreate) {
                    // S3 URL survives the user refreshing, closing the tab or jumping
                    // backwards in the wizard before the final submit. Without this the
                    // upload only lives in local React state until the very last step,
                    // which is what made the horoscope appear "lost" between pages.
                    if (
                        fieldName === 'horoscopeDocument' ||
                        fieldName === 'horoscopeDocument2' ||
                        fieldName === 'horoscopeDocument3' ||
                        fieldName === 'profilePhoto'
                    ) {
                        void persistFieldUpdate(fieldName, cleanUrl);
                    }
                }
            } else {
                const errorText = await response.text().catch(() => '');
                const statusHint = response.status === 401 ? ' (Unauthorized - please login again)' : '';
                applyFieldErrors({
                    [fieldName]: errorText
                        ? `Failed to upload file${statusHint}: ${errorText}`
                        : `Failed to upload file${statusHint}. Please try again.`,
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            applyFieldErrors({ [fieldName]: 'An error occurred during upload.' });
        } finally {
            setUploading(prev => ({ ...prev, [fieldName]: false }));
        }
    };

    const validateStep = (currentStep: number) => {
        const errors: Record<string, string> = {};

        if (currentStep === 1) {
            if (!formData.gender) errors.gender = 'Please select your gender.';
            if (!formData.height?.toString().trim()) errors.height = 'Please enter your height.';
            if (!formData.religion) errors.religion = 'Please select your religion.';
            if (!formData.maritalStatus) errors.maritalStatus = 'Please select your marital status.';
        } else if (currentStep === 2) {
            const userCountries = formData.countryOfResidence.split(',').map((s) => s.trim()).filter(Boolean);
            if (!formData.qualificationLevel) errors.qualificationLevel = 'Please select your highest qualification.';
            if (!formData.countryOfOrigin) errors.countryOfOrigin = 'Please select your country of origin.';
            if (userCountries.length === 0) errors.countryOfResidence = 'Please select at least one country of residence.';
            if (!formData.cityOfResidence?.trim()) errors.cityOfResidence = 'Please enter your city of residence.';
            if (!formData.residencyStatus) errors.residencyStatus = 'Please select your residency status.';
        } else if (currentStep === 3) {
            if (!formData.horoscope) errors.horoscope = 'Please select a horoscope matching option.';
        } else if (currentStep === 4) {
            if (!formData.fatherReligion) errors.fatherReligion = "Please select your father's religion.";
            if (!formData.motherReligion) errors.motherReligion = "Please select your mother's religion.";
        } else if (currentStep === 5) {
            const minRaw = formData.partnerMinAge.toString().trim();
            const maxRaw = formData.partnerMaxAge.toString().trim();
            if (!minRaw) errors.partnerMinAge = 'Please enter the minimum partner age.';
            if (!maxRaw) errors.partnerMaxAge = 'Please enter the maximum partner age.';
            if (!errors.partnerMinAge && !errors.partnerMaxAge) {
                const minAge = parseInt(minRaw, 10);
                const maxAge = parseInt(maxRaw, 10);
                if (Number.isNaN(minAge) || Number.isNaN(maxAge)) {
                    errors.partnerMinAge = 'Partner age must be a valid number.';
                    errors.partnerMaxAge = 'Partner age must be a valid number.';
                } else {
                    if (minAge < 18) errors.partnerMinAge = 'Minimum partner age must be at least 18.';
                    if (maxAge < 18) errors.partnerMaxAge = 'Maximum partner age must be at least 18.';
                    if (!errors.partnerMinAge && !errors.partnerMaxAge && maxAge <= minAge) {
                        errors.partnerMaxAge = 'Maximum partner age must be greater than minimum age.';
                    }
                }
            }
        }

        if (Object.keys(errors).length > 0) {
            applyFieldErrors(errors);
            return false;
        }

        setFieldErrors({});
        setSubmitError('');
        return true;
    };

    /**
     * Optional string fields that should never be persisted as empty - the
     * back office expects a literal "-" placeholder for "user did not fill
     * this in" so that blank cells are visually distinguishable from "still
     * loading" / "missing column" cases. Covers the parent details block
     * (Country / Ethnicity / Caste / Remarks) and the partner-preference
     * habit dropdowns (Eating / Drinking / Smoking) where the user picks
     * "Any" and the empty value would otherwise reach the DB as "".
     */
    const OPTIONAL_PLACEHOLDER_FIELDS = [
        'fatherCountryOfResidence',
        'fatherEthnicity',
        'fatherCaste',
        'fatherRemarks',
        'motherCountryOfResidence',
        'motherEthnicity',
        'motherCaste',
        'motherRemarks',
        'partnerEatingHabits',
        'partnerDrinkingHabits',
        'partnerSmokingHabits',
        'partnerCountryOfResidence',
        'partnerCountryOfOrigin',
    ] as const;

    const withOptionalPlaceholders = (data: typeof formData) => {
        const next: Record<string, string> = { ...data };
        for (const key of OPTIONAL_PLACEHOLDER_FIELDS) {
            const current = (next[key] ?? '').toString().trim();
            if (!current) {
                next[key] = '-';
            }
        }
        return next as typeof formData;
    };

    const buildProfilePayload = () => {
        // Parse age fields without a silent fallback - if they're blank or
        // invalid the step-5 validator will already have blocked the user;
        // the 0 default just mirrors the backend's "not specified" semantics
        // (the entity's int default) without lying about the value.
        const parsedMin = parseInt(formData.partnerMinAge, 10);
        const parsedMax = parseInt(formData.partnerMaxAge, 10);
        const uid =
            managedEdit?.subUserId ??
            (user?.id != null && String(user.id).trim() !== '' ? Number(user.id) : 0);
        const base = withOptionalPlaceholders(formData);
        return {
            userId: uid,
            ...base,
            // Ensure location & residency always serialize (never rely on sparse/dropped fields from spread).
            countryOfOrigin: String(formData.countryOfOrigin ?? '').trim(),
            countryOfResidence: String(formData.countryOfResidence ?? '').trim(),
            cityOfResidence: String(formData.cityOfResidence ?? '').trim(),
            residencyStatus: String(formData.residencyStatus ?? '').trim(),
            partnerCountryOfOrigin: String(formData.partnerCountryOfOrigin ?? '').trim(),
            partnerCountryOfResidence: String(formData.partnerCountryOfResidence ?? '').trim(),
            height: parseFloat(formData.height) || 0,
            partnerMinAge: Number.isFinite(parsedMin) ? parsedMin : 0,
            partnerMaxAge: Number.isFinite(parsedMax) ? parsedMax : 0,
            dateOfBirth: formData.dob ? `${formData.dob}T00:00:00` : null
        };
    };

    const buildManagedSubProfilePayload = () => {
        const profilePayload = buildProfilePayload();
        const { userId: _uid, ...profileFields } = profilePayload as Record<string, unknown>;
        return {
            parentUserId: managedParentUserId,
            ...(managedEdit ? { subUserId: managedEdit.subUserId } : {}),
            firstName: managedBasic.firstName.trim(),
            lastName: managedBasic.lastName.trim(),
            nic: managedBasic.nic.trim(),
            dateOfBirth: managedBasic.dob.length === 10 ? `${managedBasic.dob}T00:00:00` : managedBasic.dob,
            gender: managedBasic.gender,
            phone: managedBasic.phone,
            whatsApp: managedBasic.whatsapp || managedBasic.phone,
            profilePhotoBase64: managedBasic.profilePhotoBase64 || undefined,
            profile: profileFields,
        };
    };

    const validateManagedBasicFields = () => {
        const fn = managedBasic.firstName.trim();
        const ln = managedBasic.lastName.trim();
        const managedErrors: Record<string, string> = {};
        if (!fn) managedErrors.managedFirstName = 'First name is required.';
        if (!ln) managedErrors.managedLastName = 'Last name is required.';
        if (!managedBasic.nic.trim()) {
            managedErrors.managedNic = 'NIC or passport number is required.';
        } else {
            const nicErr = nicOrPassportFormatError(managedBasic.nic);
            if (nicErr) managedErrors.managedNic = nicErr;
        }
        if (!managedBasic.dob) managedErrors.managedDob = 'Date of birth is required.';
        if (!managedBasic.gender) managedErrors.managedGender = 'Gender is required.';
        const phoneErr = sriLankanPhoneFormatErrorIfInvalid(managedBasic.phone, 'Phone number');
        if (phoneErr) managedErrors.managedPhone = phoneErr;
        const whatsappErr = sriLankanPhoneFormatErrorIfInvalid(
            managedBasic.whatsapp || managedBasic.phone,
            'WhatsApp number',
        );
        if (whatsappErr) managedErrors.managedWhatsapp = whatsappErr;
        if (Object.keys(managedErrors).length > 0) {
            applyFieldErrors(managedErrors);
            return false;
        }
        return true;
    };

    const saveDraft = async () => {
        if (managedCreate) return true;
        if (managedEdit) {
            if (!managedParentUserId) {
                setSubmitError('Parent account is required.');
                return false;
            }
            try {
                const data = await matrimonialService.updateManagedSubProfile(buildManagedSubProfilePayload());
                if (isManagedProfileCreateResponseSuccess(data)) {
                    setSubmitError('');
                    return true;
                }
                setSubmitError(data.message || data.Message || 'Failed to save progress');
                return false;
            } catch (error: unknown) {
                setSubmitError(error instanceof Error ? error.message : 'Failed to save progress');
                return false;
            }
        }
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

    /**
     * Silently persist a single freshly-uploaded field (e.g. horoscopeDocument,
     * profilePhoto) to the matrimonial profile right after the upload completes.
     *
     * We hit the same UpdateProfile endpoint as saveDraft() and send the *full*
     * current payload with the new value spliced in - this matches the behaviour
     * of the wizard's "Next" button and avoids needing a brand-new partial-update
     * endpoint. The update is best-effort: failures are logged but never block
     * the user (the final submit will save again at the end of the wizard).
     */
    const persistFieldUpdate = async (fieldName: string, value: string) => {
        if (managedCreate) return;
        if (managedEdit) {
            try {
                const payload = buildManagedSubProfilePayload();
                payload.profile = { ...(payload.profile as Record<string, unknown>), [fieldName]: value };
                await matrimonialService.updateManagedSubProfile(payload);
            } catch (err) {
                console.warn(`Auto-save of ${fieldName} threw:`, err);
            }
            return;
        }
        if (!user) return;
        const token = getStoredToken();
        if (!token) return;
        try {
            const payload = { ...buildProfilePayload(), [fieldName]: value };
            const response = await fetch(`${API_BASE_URL}/Matrimonial/UpdateProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.warn(`Auto-save of ${fieldName} failed:`, errorText || response.status);
            }
        } catch (err) {
            console.warn(`Auto-save of ${fieldName} threw:`, err);
        }
    };

    const imageActionBtn: CSSProperties = {
        fontSize: '0.82rem',
        padding: '0.4rem 0.75rem',
        borderRadius: '6px',
        cursor: 'pointer',
        border: '1px solid #ccc',
        background: '#fff',
        color: '#333',
    };

    const clearUploadedField = async (
        fieldName:
            | 'horoscopeDocument'
            | 'horoscopeDocument2'
            | 'horoscopeDocument3'
            | 'profilePhoto'
            | 'upload1'
            | 'upload2'
            | 'upload3',
    ) => {
        if (fieldName === 'upload1' || fieldName === 'upload2' || fieldName === 'upload3') {
            const cascadeFields =
                fieldName === 'upload1'
                    ? (['upload1', 'upload2', 'upload3'] as const)
                    : fieldName === 'upload2'
                      ? (['upload2', 'upload3'] as const)
                      : (['upload3'] as const);
            const msg =
                fieldName === 'upload1'
                    ? 'Remove Gallery Photo 1? Photos 2 and 3 will be removed too, since they depend on this slot.'
                    : fieldName === 'upload2'
                      ? 'Remove Gallery Photo 2? Gallery Photo 3 will be removed too.'
                      : 'Remove Gallery Photo 3?';
            if (!window.confirm(msg)) return;

            setFormData((prev) => {
                const next = { ...prev };
                for (const f of cascadeFields) next[f] = '';
                return next;
            });
            setPreviewBusters((prev) => {
                const next = { ...prev };
                for (const f of cascadeFields) delete next[f];
                return next;
            });
            setSubmitError('');
            for (const f of cascadeFields) {
                await persistFieldUpdate(f, '');
            }
            return;
        }

        const msg =
            fieldName === 'profilePhoto'
                ? 'Remove your main profile photo? Gallery photos stay on your profile until you change them; you can upload a new main photo afterwards.'
                : fieldName === 'horoscopeDocument'
                  ? 'Remove the primary horoscope document? Any additional horoscope pages you uploaded will be removed too.'
                  : fieldName === 'horoscopeDocument2'
                    ? 'Remove horoscope page 2? Page 3 (if any) will also be removed.'
                    : 'Remove the additional horoscope page?';
        if (!window.confirm(msg)) return;

        if (fieldName === 'horoscopeDocument') {
            setFormData((prev) => ({
                ...prev,
                horoscopeDocument: '',
                horoscopeDocument2: '',
                horoscopeDocument3: '',
            }));
            setPreviewBusters((prev) => {
                const next = { ...prev };
                delete next.horoscopeDocument;
                delete next.horoscopeDocument2;
                delete next.horoscopeDocument3;
                return next;
            });
            setSubmitError('');
            updateUser({ horoscopeDocument: '', horoscopeDocument2: '', horoscopeDocument3: '' });
            setHoroscopeViewerSlot(null);
            await persistFieldUpdate('horoscopeDocument', '');
            await persistFieldUpdate('horoscopeDocument2', '');
            await persistFieldUpdate('horoscopeDocument3', '');
            return;
        }

        if (fieldName === 'horoscopeDocument2') {
            setFormData((prev) => ({ ...prev, horoscopeDocument2: '', horoscopeDocument3: '' }));
            setPreviewBusters((prev) => {
                const next = { ...prev };
                delete next.horoscopeDocument2;
                delete next.horoscopeDocument3;
                return next;
            });
            setSubmitError('');
            updateUser({ horoscopeDocument2: '', horoscopeDocument3: '' });
            setHoroscopeViewerSlot(null);
            await persistFieldUpdate('horoscopeDocument2', '');
            await persistFieldUpdate('horoscopeDocument3', '');
            return;
        }

        if (fieldName === 'horoscopeDocument3') {
            setFormData((prev) => ({ ...prev, horoscopeDocument3: '' }));
            setPreviewBusters((prev) => {
                const next = { ...prev };
                delete next.horoscopeDocument3;
                return next;
            });
            setSubmitError('');
            updateUser({ horoscopeDocument3: '' });
            setHoroscopeViewerSlot(null);
            await persistFieldUpdate('horoscopeDocument3', '');
            return;
        }

        setFormData((prev) => ({ ...prev, [fieldName]: '' }));
        setPreviewBusters((prev) => {
            const next = { ...prev };
            delete next[fieldName];
            return next;
        });
        setSubmitError('');

        if (fieldName === 'profilePhoto') {
            updateUser({ profilePhoto: '' });
        }

        await persistFieldUpdate(fieldName, '');
    };

    const handleNext = async () => {
        if (!validateStep(step)) return;
        // Don't move on while a file is still uploading - otherwise the
        // intermediate saveDraft below would persist an empty URL and the
        // upload that finishes seconds later would only live in local state.
        const uploadingField = Object.entries(uploading).find(([, isUploading]) => isUploading)?.[0];
        if (uploadingField) {
            applyFieldErrors({
                [uploadingField]: 'Please wait for the upload to finish before continuing.',
            });
            return;
        }
        const saved = await saveDraft();
        if (!saved) return;

        setStep(prev => prev + 1);
    };

    const handlePrev = () => {
        setStep(prev => prev - 1);
    };

    const handleStepClick = async (targetStep: number) => {
        if (targetStep === step) return;

        // Going forward requires current-step validation and auto-save.
        if (targetStep > step) {
            if (!validateStep(step)) return;
            const uploadingField = Object.entries(uploading).find(([, isUploading]) => isUploading)?.[0];
            if (uploadingField) {
                applyFieldErrors({
                    [uploadingField]: 'Please wait for the upload to finish before continuing.',
                });
                return;
            }
            const saved = await saveDraft();
            if (!saved) return;
        }

        setStep(targetStep);
    };

    const saveProfile = async () => {
        // Prevent accidental auto-saves (e.g., file inputs triggering form submit in some browsers)
        if (loading) return;

        // Check if uploads are pending
        const uploadingField = Object.entries(uploading).find(([, isUploading]) => isUploading)?.[0];
        if (uploadingField) {
            applyFieldErrors({
                [uploadingField]: 'Please wait for images to finish uploading.',
            });
            setStep(6);
            return;
        }

        // Defence-in-depth: re-run the partner age check on final submit so a
        // user who jumped backwards and re-entered step 5 from a sidebar /
        // stepper click can't bypass the rule.
        if (!validateStep(5)) {
            setStep(5);
            return;
        }

        if (managedCreate || managedEdit) {
            if (!validateManagedBasicFields()) return;

            setLoading(true);
            setSubmitError('');
            setFieldErrors({});
            try {
                if (managedCreate) {
                    const data = await matrimonialService.createManagedSubProfile(buildManagedSubProfilePayload());
                    if (isManagedProfileCreateResponseSuccess(data)) {
                        markManagedProfileDraftCompleted(managedCreate.parentUserId);
                        managedSkipDraftPersistRef.current = true;
                        setManagedDraftNotice(null);
                        setSubmitError('');
                        if (onComplete) onComplete();
                        if (onClose) onClose();
                    } else {
                        setSubmitError(data.message || data.Message || 'Failed to create managed profile');
                    }
                } else if (managedEdit) {
                    const data = await matrimonialService.updateManagedSubProfile(buildManagedSubProfilePayload());
                    if (isManagedProfileCreateResponseSuccess(data)) {
                        setSubmitError('');
                        if (onComplete) onComplete();
                        if (onClose) onClose();
                    } else {
                        setSubmitError(data.message || data.Message || 'Failed to update managed profile');
                    }
                }
            } catch (error: unknown) {
                setSubmitError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
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
                    updateUser({ horoscopeDocument: withCacheBuster(formData.horoscopeDocument) });
                }
                if (formData.horoscopeDocument2) {
                    updateUser({ horoscopeDocument2: withCacheBuster(formData.horoscopeDocument2) });
                }
                if (formData.horoscopeDocument3) {
                    updateUser({ horoscopeDocument3: withCacheBuster(formData.horoscopeDocument3) });
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

    const horoscopeLightboxSrc =
        horoscopeViewerSlot && formData[horoscopeViewerSlot]
            ? previewSrc(horoscopeViewerSlot, formData[horoscopeViewerSlot])
            : '';

    return (
        <div className="profile-completion-form">
            {bankPremiumAwaitingApproval && (
                <div
                    role="status"
                    style={{
                        marginBottom: '1.25rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: '1px solid #fcd34d',
                        color: '#92400e',
                        fontSize: '0.92rem',
                        lineHeight: 1.5,
                    }}
                >
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Premium payment â€” awaiting approval</strong>
                    Your bank transfer slip was received and is being reviewed. You can finish your profile below; premium
                    features will unlock once the payment is approved.
                </div>
            )}
            {managedDraftNotice && (
                <div
                    role="status"
                    style={{
                        marginBottom: '1.25rem',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                        border: '1px solid #93c5fd',
                        color: '#1e40af',
                        fontSize: '0.92rem',
                        lineHeight: 1.5,
                    }}
                >
                    {managedDraftNotice}
                </div>
            )}
            {isManagedFlow && (
                <div style={{ marginBottom: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)' }}>Basic details</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                        {managedEdit
                            ? 'Update the profile holder\u2019s basic details, then change any detailed sections below.'
                            : 'Enter the profile holder\u2019s basic details, then complete all profile sections below. No separate login is needed — you manage everything from your account.'}
                    </p>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>First name *</label>
                            <input
                                type="text"
                                maxLength={AUTH_FIELD_MAX_LENGTH}
                                value={managedBasic.firstName}
                                onChange={(e) => {
                                    clearFieldError('managedFirstName');
                                    setManagedBasic(p => ({ ...p, firstName: sanitizeNameInput(e.target.value) }));
                                }}
                                style={fieldInputStyle('managedFirstName')}
                            />
                            <FieldErrorMessage message={fieldErrors.managedFirstName} />
                        </div>
                        <div className="form-group">
                            <label>Last name *</label>
                            <input
                                type="text"
                                maxLength={AUTH_FIELD_MAX_LENGTH}
                                value={managedBasic.lastName}
                                onChange={(e) => {
                                    clearFieldError('managedLastName');
                                    setManagedBasic(p => ({ ...p, lastName: sanitizeNameInput(e.target.value) }));
                                }}
                                style={fieldInputStyle('managedLastName')}
                            />
                            <FieldErrorMessage message={fieldErrors.managedLastName} />
                        </div>
                        <div className="form-group">
                            <label>NIC / Passport *</label>
                            <input
                                type="text"
                                value={managedBasic.nic}
                                onChange={handleManagedNicChange}
                                placeholder="e.g. 901234567V or N1234567"
                                style={fieldInputStyle('managedNic')}
                            />
                            <FieldErrorMessage
                                message={
                                    fieldErrors.managedNic
                                    || (managedBasic.nic.trim() ? nicOrPassportFormatError(managedBasic.nic) || undefined : undefined)
                                }
                            />
                        </div>
                        <div className="form-group">
                            <label>Date of birth *</label>
                            <input
                                type="date"
                                value={managedBasic.dob}
                                disabled={managedDobGenderDisabled}
                                title={managedDobGenderTitle}
                                onChange={(e) => {
                                    clearFieldError('managedDob');
                                    const dob = e.target.value;
                                    setManagedBasic(p => ({ ...p, dob }));
                                    setFormData(prev => ({ ...prev, dob }));
                                }}
                                style={{
                                    ...(managedDobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                    ...fieldInputStyle('managedDob'),
                                }}
                            />
                            <FieldErrorMessage message={fieldErrors.managedDob} />
                        </div>
                        <div className="form-group">
                            <label>Gender *</label>
                            <select
                                value={managedBasic.gender}
                                disabled={managedDobGenderDisabled}
                                title={managedDobGenderTitle}
                                onChange={(e) => {
                                    clearFieldError('managedGender');
                                    const gender = e.target.value;
                                    setManagedBasic(p => ({ ...p, gender }));
                                    setFormData(prev => ({ ...prev, gender }));
                                }}
                                style={{
                                    ...(managedDobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                    ...fieldInputStyle('managedGender'),
                                }}
                            >
                                <option value="">Select</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                            <FieldErrorMessage message={fieldErrors.managedGender} />
                        </div>
                        <div className="form-group">
                            <label>Phone *</label>
                            <input
                                type="tel"
                                value={managedBasic.phone}
                                onChange={(e) => {
                                    clearFieldError('managedPhone');
                                    setManagedBasic(p => ({ ...p, phone: sanitizeSriLankanPhoneInput(e.target.value) }));
                                }}
                                style={fieldInputStyle('managedPhone')}
                            />
                            <FieldErrorMessage message={fieldErrors.managedPhone} />
                        </div>
                        <div className="form-group">
                            <label>WhatsApp</label>
                            <input
                                type="tel"
                                value={managedBasic.whatsapp}
                                onChange={(e) => {
                                    clearFieldError('managedWhatsapp');
                                    setManagedBasic(p => ({ ...p, whatsapp: sanitizeSriLankanPhoneInput(e.target.value) }));
                                }}
                                placeholder="Same as phone if blank"
                                style={fieldInputStyle('managedWhatsapp')}
                            />
                            <FieldErrorMessage message={fieldErrors.managedWhatsapp} />
                        </div>
                    </div>
                    {managedHasNicInput && (
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.75rem 0 0', lineHeight: 1.5 }}>
                            {managedNicLocksDobGender
                                ? 'Date of birth and gender are set from the NIC. Clear the ID field or use passport format to edit them manually.'
                                : 'For passport numbers, enter DOB and gender manually. A valid NIC auto-fills both fields and locks them.'}
                        </p>
                    )}
                </div>
            )}
            {!isPartnerPrefsOnly && (
            <div
                ref={wizardStepsAnchorRef}
                className="steps-indicator"
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '0 1rem' }}
            >
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
            )}

            <form onSubmit={(e) => e.preventDefault()}>
                {successMessage && <div style={{ color: '#2e7d32', marginBottom: '1rem', padding: '12px 16px', background: '#e8f5e9', borderRadius: '8px', fontWeight: 600, textAlign: 'center', fontSize: '1rem' }}>{successMessage}</div>}
                {submitError && Object.keys(fieldErrors).length === 0 && (
                    <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#ffebee', borderRadius: '4px' }}>{submitError}</div>
                )}

                {step === 1 && (
                    <div className="step-content" ref={activeStepContentRef}>
                        <h3>Personal Details</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Gender*</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required style={fieldInputStyle('gender')}>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                <FieldErrorMessage message={fieldErrors.gender} />
                            </div>
                            {/* DOB Removed */}
                            <div className="form-group">
                                <label>Height (cm)*</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} required placeholder="e.g. 175" style={fieldInputStyle('height')} />
                                <FieldErrorMessage message={fieldErrors.height} />
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
                                <select name="religion" value={formData.religion} onChange={handleChange} required style={fieldInputStyle('religion')}>
                                    <option value="">Select Religion</option>
                                    {MATRIMONIAL_RELIGION_OPTIONS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                <FieldErrorMessage message={fieldErrors.religion} />
                            </div>
                            <div className="form-group">
                                <label>Marital Status*</label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} required style={fieldInputStyle('maritalStatus')}>
                                    <option value="">Select Status</option>
                                    <option value="Never Married">Never Married</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                                <FieldErrorMessage message={fieldErrors.maritalStatus} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content" ref={activeStepContentRef}>
                        <h3>Education & Career</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Highest Qualification*</label>
                                <select name="qualificationLevel" value={formData.qualificationLevel} onChange={handleChange} required style={fieldInputStyle('qualificationLevel')}>
                                    <option value="">Select Qualification</option>
                                    {qualificationOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                <FieldErrorMessage message={fieldErrors.qualificationLevel} />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={formData.occupation}
                                    onChange={handleChange}
                                    onBeforeInput={handleLettersOnlyBeforeInput}
                                    placeholder="Current Job Title"
                                    autoComplete="organization-title"
                                    inputMode="text"
                                />
                                <span style={{ color: 'var(--text-light)', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                                    Letters only — numbers and symbols are not allowed.
                                </span>
                                {lettersOnlyErrors.occupation && (
                                    <span style={{ color: '#b91c1c', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                                        {lettersOnlyErrors.occupation}
                                    </span>
                                )}
                            </div>
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Location</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Country of Origin*</label>
                                <select name="countryOfOrigin" value={formData.countryOfOrigin} onChange={handleChange} required style={fieldInputStyle('countryOfOrigin')}>
                                    <option value="">Select Country</option>
                                    {countryOptions.map((country) => (
                                        <option key={country.isoCode} value={country.name}>{country.name}</option>
                                    ))}
                                </select>
                                <FieldErrorMessage message={fieldErrors.countryOfOrigin} />
                            </div>
                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="user-residence"
                                    label={<>Country of Residence*</>}
                                    hint="(select one or more)"
                                    value={formData.countryOfResidence}
                                    onChange={(v) => {
                                        clearFieldError('countryOfResidence');
                                        setFormData((prev) => ({ ...prev, countryOfResidence: v }));
                                    }}
                                    countries={countryOptions}
                                />
                                <FieldErrorMessage message={fieldErrors.countryOfResidence} />
                            </div>
                            <div className="form-group">
                                <label>City of Residence*</label>
                                <CityAutocomplete
                                    name="cityOfResidence"
                                    value={formData.cityOfResidence}
                                    onChange={(next) => {
                                        clearFieldError('cityOfResidence');
                                        setFormData((prev) => ({ ...prev, cityOfResidence: next }));
                                    }}
                                    cityGroups={residenceCityGroups}
                                    placeholder={selectedResidenceCountries.length > 0 ? 'Select or type city' : 'Select country first'}
                                    required
                                    disabled={selectedResidenceCountries.length === 0}
                                />
                                <FieldErrorMessage message={fieldErrors.cityOfResidence} />
                            </div>
                            <div className="form-group">
                                <label>Residency Status*</label>
                                <select name="residencyStatus" value={formData.residencyStatus} onChange={handleChange} required style={fieldInputStyle('residencyStatus')}>
                                    <option value="">Select Status</option>
                                    <option value="Citizen">Citizen</option>
                                    <option value="Student">Student</option>
                                    <option value="Permanent Residency">Permanent Residency</option>
                                    <option value="Work Permit">Work Permit</option>
                                    <option value="Refugee">Refugee</option>
                                </select>
                                <FieldErrorMessage message={fieldErrors.residencyStatus} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="step-content" ref={activeStepContentRef}>
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
                                    {drinkingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="eatingHabits" value={formData.eatingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    {eatingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="smokingHabits" value={formData.smokingHabits} onChange={handleChange}>
                                    <option value="">Select</option>
                                    {smokingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Horoscope Matching*</label>
                                <select name="horoscope" value={formData.horoscope} onChange={handleChange} required style={fieldInputStyle('horoscope')}>
                                    <option value="">Select</option>
                                    <option value="Required">Required</option>
                                    <option value="Not Required">Not Required</option>
                                </select>
                                <FieldErrorMessage message={fieldErrors.horoscope} />
                            </div>
                            {formData.horoscope === 'Required' && (
                                <>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label>Upload Horoscope Document</label>
                                    <input
                                        ref={horoscopeFileInputRef}
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={(e) => handleFileChange(e, 'horoscopeDocument')}
                                        disabled={uploading['horoscopeDocument']}
                                        style={formData.horoscopeDocument ? { display: 'none' } : undefined}
                                    />
                                    {uploading['horoscopeDocument'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                    <FieldErrorMessage message={fieldErrors.horoscopeDocument} />
                                    {formData.horoscopeDocument && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <img
                                                key={`${formData.horoscopeDocument}-${previewBusters['horoscopeDocument'] ?? 'n'}`}
                                                src={previewSrc('horoscopeDocument', formData.horoscopeDocument)}
                                                alt="Horoscope"
                                                onClick={() => setHoroscopeViewerSlot('horoscopeDocument')}
                                                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #ddd' }}
                                            />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => horoscopeFileInputRef.current?.click()}
                                                    disabled={uploading['horoscopeDocument']}
                                                    style={imageActionBtn}
                                                >
                                                    Replace file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void clearUploadedField('horoscopeDocument')}
                                                    disabled={uploading['horoscopeDocument']}
                                                    style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHoroscopeViewerSlot('horoscopeDocument')}
                                                    style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.25rem', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    View Full Image
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label>Additional horoscope page 2 (optional)</label>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#777', lineHeight: 1.45 }}>
                                        If your horoscope has a second page, upload it here. Upload the{' '}
                                        <strong>first page above</strong> before using this slot.
                                    </p>
                                    <input
                                        ref={horoscopeDocument2FileInputRef}
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={(e) => handleFileChange(e, 'horoscopeDocument2')}
                                        disabled={uploading['horoscopeDocument2'] || !formData.horoscopeDocument}
                                        style={formData.horoscopeDocument2 ? { display: 'none' } : undefined}
                                    />
                                    {!formData.horoscopeDocument ? (
                                        <small style={{ color: '#888', fontSize: '0.78rem', display: 'block' }}>
                                            Upload the primary horoscope first.
                                        </small>
                                    ) : null}
                                    {uploading['horoscopeDocument2'] && (
                                        <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>
                                    )}
                                    <FieldErrorMessage message={fieldErrors.horoscopeDocument2} />
                                    {formData.horoscopeDocument2 ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {!/\.pdf($|\?)/i.test(formData.horoscopeDocument2) &&
                                            /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(formData.horoscopeDocument2) ? (
                                                <img
                                                    key={`${formData.horoscopeDocument2}-${previewBusters['horoscopeDocument2'] ?? 'n'}`}
                                                    src={previewSrc('horoscopeDocument2', formData.horoscopeDocument2)}
                                                    alt="Horoscope page 2"
                                                    onClick={() => setHoroscopeViewerSlot('horoscopeDocument2')}
                                                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #ddd' }}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setHoroscopeViewerSlot('horoscopeDocument2')}
                                                    style={{ ...imageActionBtn, marginTop: '0.35rem' }}
                                                >
                                                    Open uploaded file
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => horoscopeDocument2FileInputRef.current?.click()}
                                                    disabled={uploading['horoscopeDocument2'] || !formData.horoscopeDocument}
                                                    style={imageActionBtn}
                                                >
                                                    Replace file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void clearUploadedField('horoscopeDocument2')}
                                                    disabled={uploading['horoscopeDocument2']}
                                                    style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label>Additional horoscope page 3 (optional)</label>
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: '#777', lineHeight: 1.45 }}>
                                        If your horoscope has a third page, upload it here. Upload{' '}
                                        <strong>page 2 above</strong> before using this slot.
                                    </p>
                                    <input
                                        ref={horoscopeDocument3FileInputRef}
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={(e) => handleFileChange(e, 'horoscopeDocument3')}
                                        disabled={uploading['horoscopeDocument3'] || !formData.horoscopeDocument2}
                                        style={formData.horoscopeDocument3 ? { display: 'none' } : undefined}
                                    />
                                    {!formData.horoscopeDocument2 ? (
                                        <small style={{ color: '#888', fontSize: '0.78rem', display: 'block' }}>
                                            Upload page 2 first.
                                        </small>
                                    ) : null}
                                    {uploading['horoscopeDocument3'] && (
                                        <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>
                                    )}
                                    <FieldErrorMessage message={fieldErrors.horoscopeDocument3} />
                                    {formData.horoscopeDocument3 ? (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {!/\.pdf($|\?)/i.test(formData.horoscopeDocument3) &&
                                            /\.(png|jpe?g|gif|webp|bmp|svg)($|\?)/i.test(formData.horoscopeDocument3) ? (
                                                <img
                                                    key={`${formData.horoscopeDocument3}-${previewBusters['horoscopeDocument3'] ?? 'n'}`}
                                                    src={previewSrc('horoscopeDocument3', formData.horoscopeDocument3)}
                                                    alt="Horoscope page 3"
                                                    onClick={() => setHoroscopeViewerSlot('horoscopeDocument3')}
                                                    style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #ddd' }}
                                                />
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setHoroscopeViewerSlot('horoscopeDocument3')}
                                                    style={{ ...imageActionBtn, marginTop: '0.35rem' }}
                                                >
                                                    Open uploaded file
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => horoscopeDocument3FileInputRef.current?.click()}
                                                    disabled={uploading['horoscopeDocument3'] || !formData.horoscopeDocument2}
                                                    style={imageActionBtn}
                                                >
                                                    Replace file
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void clearUploadedField('horoscopeDocument3')}
                                                    disabled={uploading['horoscopeDocument3']}
                                                    style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="step-content" ref={activeStepContentRef}>
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
                                    label={<>Country of Residence</>}
                                    hint="(optional - select one or more)"
                                    value={formData.fatherCountryOfResidence}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, fatherCountryOfResidence: v }))}
                                    countries={countryOptions}
                                />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input
                                    type="text"
                                    name="fatherOccupation"
                                    value={formData.fatherOccupation}
                                    onChange={handleChange}
                                    onBeforeInput={handleLettersOnlyBeforeInput}
                                    inputMode="text"
                                />
                                <span style={{ color: 'var(--text-light)', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                                    Letters only — numbers and symbols are not allowed.
                                </span>
                                {lettersOnlyErrors.fatherOccupation && (
                                    <span style={{ color: '#b91c1c', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                                        {lettersOnlyErrors.fatherOccupation}
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Ethnicity</label>
                                <select name="fatherEthnicity" value={formData.fatherEthnicity} onChange={handleChange}>
                                    <option value="">Select Ethnicity</option>
                                    {sriLankanEthnicities.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="fatherReligion" value={formData.fatherReligion} onChange={handleChange} required style={fieldInputStyle('fatherReligion')}>
                                    <option value="">Select</option>
                                    {MATRIMONIAL_RELIGION_OPTIONS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                <FieldErrorMessage message={fieldErrors.fatherReligion} />
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
                                    label={<>Country of Residence</>}
                                    hint="(optional - select one or more)"
                                    value={formData.motherCountryOfResidence}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, motherCountryOfResidence: v }))}
                                    countries={countryOptions}
                                />
                            </div>
                            <div className="form-group">
                                <label>Occupation</label>
                                <input
                                    type="text"
                                    name="motherOccupation"
                                    value={formData.motherOccupation}
                                    onChange={handleChange}
                                    onBeforeInput={handleLettersOnlyBeforeInput}
                                    inputMode="text"
                                />
                                <span style={{ color: 'var(--text-light)', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                                    Letters only — numbers and symbols are not allowed.
                                </span>
                                {lettersOnlyErrors.motherOccupation && (
                                    <span style={{ color: '#b91c1c', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                                        {lettersOnlyErrors.motherOccupation}
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Ethnicity</label>
                                <select name="motherEthnicity" value={formData.motherEthnicity} onChange={handleChange}>
                                    <option value="">Select Ethnicity</option>
                                    {sriLankanEthnicities.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Religion*</label>
                                <select name="motherReligion" value={formData.motherReligion} onChange={handleChange} required style={fieldInputStyle('motherReligion')}>
                                    <option value="">Select</option>
                                    {MATRIMONIAL_RELIGION_OPTIONS.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                <FieldErrorMessage message={fieldErrors.motherReligion} />
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
                    <div className="step-content" ref={activeStepContentRef}>
                        <h3>Partner Preferences</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Age Range (Years)*</label>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="partnerMinAge"
                                        value={formData.partnerMinAge}
                                        onChange={handleChange}
                                        placeholder="Min (18+)"
                                        maxLength={3}
                                        required
                                        style={{ width: '50%', ...fieldInputStyle('partnerMinAge') }}
                                    />
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="partnerMaxAge"
                                        value={formData.partnerMaxAge}
                                        onChange={handleChange}
                                        placeholder="Max (greater than Min)"
                                        maxLength={3}
                                        required
                                        style={{ width: '50%', ...fieldInputStyle('partnerMaxAge') }}
                                    />
                                </div>
                                <FieldErrorMessage message={fieldErrors.partnerMinAge} />
                                <FieldErrorMessage message={fieldErrors.partnerMaxAge} />
                                <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                    Minimum and maximum partner age must be at least 18. Maximum must be greater than minimum.
                                </small>
                            </div>
                            <div className="form-group">
                                <label>Eating Habits</label>
                                <select name="partnerEatingHabits" value={formData.partnerEatingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {eatingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Drinking Habits</label>
                                <select name="partnerDrinkingHabits" value={formData.partnerDrinkingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {drinkingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Smoking Habits</label>
                                <select name="partnerSmokingHabits" value={formData.partnerSmokingHabits} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {smokingHabitOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Min Qualification</label>
                                <select name="partnerQualificationLevel" value={formData.partnerQualificationLevel} onChange={handleChange}>
                                    <option value="">Any</option>
                                    {qualificationOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <OptionMultiSelect
                                    idPrefix="partner-religion"
                                    label="Religion (Preferred)"
                                    value={formData.partnerReligion}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, partnerReligion: v }))}
                                    options={MATRIMONIAL_RELIGION_OPTIONS}
                                    placeholder="Any"
                                />
                            </div>

                            <div className="form-group">
                                <OptionMultiSelect
                                    idPrefix="partner-ethnicity"
                                    label="Ethnicity (Preferred)"
                                    value={formData.partnerEthnicity}
                                    onChange={(v) => setFormData((prev) => ({ ...prev, partnerEthnicity: v }))}
                                    options={sriLankanEthnicities}
                                    placeholder="Any"
                                />
                            </div>

                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="partner-origin"
                                    label={<>Country of Origin (Preferred)</>}
                                    hint="(optional — select one or more; leave empty for any)"
                                    value={formData.partnerCountryOfOrigin}
                                    onChange={(v) =>
                                        setFormData((prev) => ({ ...prev, partnerCountryOfOrigin: v }))
                                    }
                                    countries={countryOptions}
                                />
                            </div>

                            <div className="form-group">
                                <CountryMultiSelect
                                    idPrefix="partner-residence"
                                    label={<>Country of Residence (Preferred)</>}
                                    hint="(optional — select one or more; leave empty for anywhere)"
                                    value={formData.partnerCountryOfResidence}
                                    onChange={(v) =>
                                        setFormData((prev) => ({ ...prev, partnerCountryOfResidence: v }))
                                    }
                                    countries={countryOptions}
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>Additional Requirements</label>
                                <textarea name="partnerAdditionalRequirements" value={formData.partnerAdditionalRequirements} onChange={handleChange} rows={3}></textarea>
                            </div>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="step-content" ref={activeStepContentRef}>
                        <h3>Profile Verification & Uploads</h3>
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <label>About yourself</label>
                                <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3}></textarea>
                            </div>


                            <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />
                                <h4>Profile Photos</h4>
                            </div>

                            <div className="form-group">
                                <label>Main Profile Photo</label>
                                <input
                                    ref={profilePhotoFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                    disabled={uploading['profilePhoto']}
                                    style={formData.profilePhoto ? { display: 'none' } : undefined}
                                />
                                {uploading['profilePhoto'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                <FieldErrorMessage message={fieldErrors.profilePhoto} />
                                {formData.profilePhoto && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('profilePhoto', formData.profilePhoto)} alt="Profile" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => profilePhotoFileInputRef.current?.click()}
                                                disabled={uploading['profilePhoto']}
                                                style={imageActionBtn}
                                            >
                                                Replace photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void clearUploadedField('profilePhoto')}
                                                disabled={uploading['profilePhoto']}
                                                style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 1</label>
                                <input
                                    ref={upload1FileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload1')}
                                    disabled={uploading['upload1'] || !formData.profilePhoto}
                                    title={!formData.profilePhoto ? 'Upload your Main Profile Photo first.' : undefined}
                                    style={formData.upload1 ? { display: 'none' } : undefined}
                                />
                                {!formData.profilePhoto && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload the Main Profile Photo first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload1'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                <FieldErrorMessage message={fieldErrors.upload1} />
                                {formData.upload1 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload1', formData.upload1)} alt="Gallery 1" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => upload1FileInputRef.current?.click()}
                                                disabled={uploading['upload1'] || !formData.profilePhoto}
                                                style={imageActionBtn}
                                            >
                                                Replace photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void clearUploadedField('upload1')}
                                                disabled={uploading['upload1']}
                                                style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 2</label>
                                <input
                                    ref={upload2FileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload2')}
                                    disabled={uploading['upload2'] || !formData.upload1}
                                    title={!formData.upload1 ? 'Upload Gallery Photo 1 first.' : undefined}
                                    style={formData.upload2 ? { display: 'none' } : undefined}
                                />
                                {!formData.upload1 && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload Gallery Photo 1 first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload2'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                <FieldErrorMessage message={fieldErrors.upload2} />
                                {formData.upload2 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload2', formData.upload2)} alt="Gallery 2" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => upload2FileInputRef.current?.click()}
                                                disabled={uploading['upload2'] || !formData.upload1}
                                                style={imageActionBtn}
                                            >
                                                Replace photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void clearUploadedField('upload2')}
                                                disabled={uploading['upload2']}
                                                style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 3</label>
                                <input
                                    ref={upload3FileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload3')}
                                    disabled={uploading['upload3'] || !formData.upload2}
                                    title={!formData.upload2 ? 'Upload Gallery Photo 2 first.' : undefined}
                                    style={formData.upload3 ? { display: 'none' } : undefined}
                                />
                                {!formData.upload2 && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload Gallery Photo 2 first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload3'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                <FieldErrorMessage message={fieldErrors.upload3} />
                                {formData.upload3 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload3', formData.upload3)} alt="Gallery 3" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button
                                                type="button"
                                                onClick={() => upload3FileInputRef.current?.click()}
                                                disabled={uploading['upload3'] || !formData.upload2}
                                                style={imageActionBtn}
                                            >
                                                Replace photo
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void clearUploadedField('upload3')}
                                                disabled={uploading['upload3']}
                                                style={{ ...imageActionBtn, borderColor: '#fca5a5', color: '#b91c1c', background: '#fef2f2' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: isPartnerPrefsOnly ? 'flex-end' : 'space-between' }}>
                    {!isPartnerPrefsOnly && (step > 1 ? (
                        <button type="button" className="btn btn-outline" onClick={handlePrev}>Previous</button>
                    ) : <div></div>)}

                    {isPartnerPrefsOnly ? (
                        <button type="button" className="btn btn-primary" disabled={loading} onClick={saveProfile}>
                            {loading ? 'Saving...' : 'Save Partner Preferences'}
                        </button>
                    ) : step < 6 ? (
                        <button type="button" className="btn btn-primary" onClick={handleNext}>Next</button>
                    ) : (
                        <button type="button" className="btn btn-primary" disabled={loading} onClick={saveProfile}>
                            {loading ? 'Saving...' : (managedCreate ? 'Create profile' : managedEdit ? 'Save changes' : 'Save Profile')}
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

            <HoroscopeLightbox
                key={horoscopeLightboxSrc || 'closed'}
                open={!!horoscopeLightboxSrc}
                src={horoscopeLightboxSrc}
                onClose={() => setHoroscopeViewerSlot(null)}
            />
        </div>
    );
}
