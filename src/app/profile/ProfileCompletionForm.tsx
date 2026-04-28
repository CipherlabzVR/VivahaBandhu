'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Country, City } from 'country-state-city';
import { getStoredToken } from '../../utils/authStorage';
import { sanitizeNameInput } from '../../utils/nameInput';
import HoroscopeLightbox from '../../components/HoroscopeLightbox';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

type CountryOption = { name: string; isoCode: string };

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
                                ×
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

    useEffect(() => {
        if (horoscopePopupOpen) setHoroscopePopupOpen(false);
    }, [step]);

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
                        // Strip the "-" placeholder we save for empty optional
                        // parent fields, so the UI shows the empty placeholder
                        // ("Select Ethnicity" / no chips) rather than a literal
                        // hyphen pre-filled in the controls.
                        const vOpt = (key: string) => {
                            const raw = v(key);
                            return raw === '-' ? '' : raw;
                        };
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
                            fatherCountryOfResidence: vOpt('fatherCountryOfResidence') || prev.fatherCountryOfResidence,
                            fatherOccupation: v('fatherOccupation') || prev.fatherOccupation,
                            fatherEthnicity: vOpt('fatherEthnicity') || prev.fatherEthnicity,
                            fatherReligion: v('fatherReligion') || prev.fatherReligion,
                            fatherCaste: vOpt('fatherCaste') || prev.fatherCaste,
                            fatherRemarks: vOpt('fatherRemarks') || prev.fatherRemarks,
                            motherName: v('motherName') || prev.motherName,
                            motherCountryOfResidence: vOpt('motherCountryOfResidence') || prev.motherCountryOfResidence,
                            motherOccupation: v('motherOccupation') || prev.motherOccupation,
                            motherEthnicity: vOpt('motherEthnicity') || prev.motherEthnicity,
                            motherReligion: v('motherReligion') || prev.motherReligion,
                            motherCaste: vOpt('motherCaste') || prev.motherCaste,
                            motherRemarks: vOpt('motherRemarks') || prev.motherRemarks,
                            partnerMinAge: p.partnerMinAge || p.PartnerMinAge || prev.partnerMinAge,
                            partnerMaxAge: p.partnerMaxAge || p.PartnerMaxAge || prev.partnerMaxAge,
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
        // If the user removes all residence countries, drop the now-orphaned city.
        // We deliberately do NOT clear when the typed value is missing from the
        // suggestion list - that list is incomplete for many regions and free
        // typing must remain valid (otherwise the city box wipes itself the
        // moment a user types a small town the dataset doesn't know about).
        if (!formData.countryOfResidence && formData.cityOfResidence) {
            setFormData((prev) => ({ ...prev, cityOfResidence: '' }));
        }
    }, [formData.countryOfResidence, formData.cityOfResidence]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        let nextValue: string = value;
        // Name fields must accept letters only (no digits / symbols).
        // Father / Mother names are the only "name" inputs in this wizard;
        // own-name lives on AppUser and is edited from profile/page.tsx.
        if (name === 'fatherName' || name === 'motherName') {
            nextValue = sanitizeNameInput(value);
        }
        // Partner age fields must be digits only. type="number" still allows
        // "e", "+", "-", "." through, and pasting a string slips in - strip
        // anything that isn't a digit and cap at 3 chars (max 999, plenty).
        else if (name === 'partnerMinAge' || name === 'partnerMaxAge') {
            nextValue = value.replace(/\D+/g, '').slice(0, 3);
        }
        setFormData(prev => ({ ...prev, [name]: nextValue }));
    };

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
        }
        return { ok: true };
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const gate = photoPrerequisite(fieldName);
        if (!gate.ok) {
            setSubmitError(gate.message || 'Please upload the previous photo first.');
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

                // Persist key file fields to the matrimonial profile *immediately* so the
                // S3 URL survives the user refreshing, closing the tab or jumping
                // backwards in the wizard before the final submit. Without this the
                // upload only lives in local React state until the very last step,
                // which is what made the horoscope appear "lost" between pages.
                if (fieldName === 'horoscopeDocument' || fieldName === 'profilePhoto') {
                    void persistFieldUpdate(fieldName, cleanUrl);
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
        }
        if (currentStep === 4) {
            // Country of Residence, Ethnicity and Caste for parents are now
            // optional - the backend payload substitutes "-" for any blanks
            // so the database still gets a placeholder rather than an empty
            // string. Religion remains required for matchmaking accuracy.
            if (!formData.fatherReligion || !formData.motherReligion) {
                setSubmitError('Please select Religion for both parents (*)');
                return false;
            }
        }
        if (currentStep === 5) {
            // Partner age range: both required, Min must be at least 18, and
            // Max must be strictly greater than Min so the range is meaningful.
            const minRaw = formData.partnerMinAge.toString().trim();
            const maxRaw = formData.partnerMaxAge.toString().trim();
            if (!minRaw || !maxRaw) {
                setSubmitError('Please enter both Minimum and Maximum partner age (cannot be blank).');
                return false;
            }
            const minAge = parseInt(minRaw, 10);
            const maxAge = parseInt(maxRaw, 10);
            if (Number.isNaN(minAge) || Number.isNaN(maxAge)) {
                setSubmitError('Partner age must be a valid number.');
                return false;
            }
            if (minAge < 18) {
                setSubmitError('Minimum partner age must be at least 18.');
                return false;
            }
            if (maxAge <= minAge) {
                setSubmitError('Maximum partner age must be greater than Minimum age.');
                return false;
            }
        }
        // Add more validation as needed
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
        return {
            userId: user?.id,
            ...withOptionalPlaceholders(formData),
            height: parseFloat(formData.height) || 0,
            partnerMinAge: Number.isFinite(parsedMin) ? parsedMin : 0,
            partnerMaxAge: Number.isFinite(parsedMax) ? parsedMax : 0,
            dateOfBirth: formData.dob ? `${formData.dob}T00:00:00` : null
        };
    };

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

    const handleNext = async () => {
        if (!validateStep(step)) return;
        // Don't move on while a file is still uploading - otherwise the
        // intermediate saveDraft below would persist an empty URL and the
        // upload that finishes seconds later would only live in local state.
        if (Object.values(uploading).some(Boolean)) {
            setSubmitError('Please wait for the upload to finish before continuing.');
            return;
        }
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
            if (Object.values(uploading).some(Boolean)) {
                setSubmitError('Please wait for the upload to finish before continuing.');
                return;
            }
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

        // Defence-in-depth: re-run the partner age check on final submit so a
        // user who jumped backwards and re-entered step 5 from a sidebar /
        // stepper click can't bypass the rule.
        if (!validateStep(5)) {
            setStep(5);
            window.scrollTo(0, 0);
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
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Gender*</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required>
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            {/* DOB Removed */}
                            <div className="form-group">
                                <label>Height (cm)*</label>
                                <input type="number" name="height" value={formData.height} onChange={handleChange} required placeholder="e.g. 175" />
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
                                    {qualificationOptions.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
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
                                <CityAutocomplete
                                    name="cityOfResidence"
                                    value={formData.cityOfResidence}
                                    onChange={(next) => setFormData((prev) => ({ ...prev, cityOfResidence: next }))}
                                    cityGroups={residenceCityGroups}
                                    placeholder={selectedResidenceCountries.length > 0 ? 'Select or type city' : 'Select country first'}
                                    required
                                    disabled={selectedResidenceCountries.length === 0}
                                />
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
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={(e) => handleFileChange(e, 'horoscopeDocument')}
                                        disabled={uploading['horoscopeDocument']}
                                    />
                                    {uploading['horoscopeDocument'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                    {formData.horoscopeDocument && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <img
                                                src={previewSrc('horoscopeDocument', formData.horoscopeDocument)}
                                                alt="Horoscope"
                                                onClick={() => setHoroscopePopupOpen(true)}
                                                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid #ddd' }}
                                            />
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setHoroscopePopupOpen(true)}
                                                    style={{ background: 'none', border: 'none', padding: 0, marginTop: '0.25rem', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                                                >
                                                    View Full Image
                                                </button>
                                            </div>
                                        </div>
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
                                    label={<>Country of Residence</>}
                                    hint="(optional - select one or more)"
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
                                    label={<>Country of Residence</>}
                                    hint="(optional - select one or more)"
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
                                        style={{ width: '50%' }}
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
                                        style={{ width: '50%' }}
                                    />
                                </div>
                                <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                    Minimum age must be at least 18. Maximum must be greater than Minimum.
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
                                    options={sriLankanReligions}
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

                            <div className="form-group">
                                <label>Main Profile Photo*</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                    disabled={uploading['profilePhoto']}
                                />
                                {uploading['profilePhoto'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.profilePhoto && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('profilePhoto', formData.profilePhoto)} alt="Profile" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 1</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload1')}
                                    disabled={uploading['upload1'] || !formData.profilePhoto}
                                    title={!formData.profilePhoto ? 'Upload your Main Profile Photo first.' : undefined}
                                />
                                {!formData.profilePhoto && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload the Main Profile Photo first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload1'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload1 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload1', formData.upload1)} alt="Gallery 1" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 2</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload2')}
                                    disabled={uploading['upload2'] || !formData.upload1}
                                    title={!formData.upload1 ? 'Upload Gallery Photo 1 first.' : undefined}
                                />
                                {!formData.upload1 && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload Gallery Photo 1 first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload2'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload2 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload2', formData.upload2)} alt="Gallery 2" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Gallery Photo 3</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileChange(e, 'upload3')}
                                    disabled={uploading['upload3'] || !formData.upload2}
                                    title={!formData.upload2 ? 'Upload Gallery Photo 2 first.' : undefined}
                                />
                                {!formData.upload2 && (
                                    <small style={{ color: '#888', fontSize: '0.78rem' }}>
                                        Upload Gallery Photo 2 first to unlock this slot.
                                    </small>
                                )}
                                {uploading['upload3'] && <span style={{ fontSize: '0.8rem', color: 'blue' }}>Uploading...</span>}
                                {formData.upload3 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <img src={previewSrc('upload3', formData.upload3)} alt="Gallery 3" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>
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
                open={horoscopePopupOpen && !!formData.horoscopeDocument}
                src={previewSrc('horoscopeDocument', formData.horoscopeDocument)}
                onClose={() => setHoroscopePopupOpen(false)}
            />
        </div>
    );
}
