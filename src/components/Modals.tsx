'use client';

import { useState, useEffect, MouseEvent, useMemo, type ChangeEvent, type ReactNode, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { matrimonialService, type RecoveryAccount } from '../services/matrimonialService';
import { sanitizeNicInput } from '../utils/nicInput';
import {
    sanitizeSriLankanPhoneInput,
    isValidSriLankanPhone,
    sriLankanPhoneFormatErrorIfInvalid,
    phonesAreSameSriLankanNumber,
    SL_PHONE_PLACEHOLDER,
    WHATSAPP_REQUIRED_MSG,
    WHATSAPP_SAME_AS_PHONE_MSG,
} from '../utils/sriLankanPhone';
import { PREMIUM_SUBSCRIPTION_LKR } from '../constants/subscription';
import WelcomePopup from './WelcomePopup';
import Image from 'next/image';

interface ModalsProps {
    activeModal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null;
    onClose: () => void;
    onSwitch: (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog') => void;
    selectedBlogId?: number | null;
    registerAsMatchmaker?: boolean;
    selectedProfile?: any | null;
}

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

/** Aligns with typical ASP.NET Identity PasswordOptions (length, upper, lower, digit, special). */
function checkPasswordPolicy(password: string) {
    return {
        minLength: password.length >= 6,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasDigit: /\d/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
}

function passwordPassesPolicy(password: string): boolean {
    const c = checkPasswordPolicy(password);
    return c.minLength && c.hasUpper && c.hasLower && c.hasDigit && c.hasSpecial;
}

/** Unicode letters, spaces, hyphens, apostrophes — no digits or other symbols. */
const NAME_LETTERS_ONLY = /^[\p{L}\s'-]+$/u;

function nameLettersOnlyError(value: string, fieldLabel: 'First name' | 'Last name'): string | undefined {
    const t = value.trim();
    if (!t) return undefined;
    if (!NAME_LETTERS_ONLY.test(t)) {
        return `${fieldLabel} may only contain letters (no numbers or symbols).`;
    }
    return undefined;
}

type PwdChecks = ReturnType<typeof checkPasswordPolicy>;

function RegisterPasswordFields({
    idPrefix,
    password,
    confirmPassword,
    onPasswordChange,
    onConfirmChange,
    errors,
    pwdChecks,
    showPassword,
    onToggleShowPassword,
    showConfirmPassword,
    onToggleShowConfirmPassword,
}: {
    idPrefix: string;
    password: string;
    confirmPassword: string;
    onPasswordChange: (v: string) => void;
    onConfirmChange: (v: string) => void;
    errors: { [key: string]: string };
    pwdChecks: PwdChecks;
    showPassword: boolean;
    onToggleShowPassword: () => void;
    showConfirmPassword: boolean;
    onToggleShowConfirmPassword: () => void;
}) {
    const ruleRow = (ok: boolean, text: string) => (
        <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem', marginBottom: '0.2rem', fontSize: '0.8rem', color: ok ? '#047857' : '#6b7280' }}>
            <span style={{ flexShrink: 0 }}>{ok ? '✓' : '○'}</span>
            <span>{text}</span>
        </li>
    );

    const toggleBtnStyle: CSSProperties = {
        position: 'absolute',
        right: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '4px',
        fontSize: '1rem',
        lineHeight: 1,
        color: 'var(--text-light)',
    };

    return (
        <>
            <div className="form-group">
                <label htmlFor={`${idPrefix}-password`}>Password *</label>
                <div style={{ position: 'relative' }}>
                    <input
                        id={`${idPrefix}-password`}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        style={{ borderColor: errors.password ? 'red' : '', width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        style={toggleBtnStyle}
                        onClick={onToggleShowPassword}
                        tabIndex={-1}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword ? '🙈' : '👁'}
                    </button>
                </div>
                <ul style={{ listStyle: 'none', padding: '0.5rem 0 0', margin: 0, borderTop: '1px solid #eee', marginTop: '0.35rem' }}>
                    {ruleRow(pwdChecks.minLength, 'At least 6 characters')}
                    {ruleRow(pwdChecks.hasUpper, 'One uppercase letter (A–Z)')}
                    {ruleRow(pwdChecks.hasLower, 'One lowercase letter (a–z)')}
                    {ruleRow(pwdChecks.hasDigit, 'One number (0–9)')}
                    {ruleRow(pwdChecks.hasSpecial, 'One special character (e.g. !@#$%)')}
                </ul>
                {errors.password && <span style={{ color: 'red', fontSize: '0.8rem', display: 'block', marginTop: '0.35rem' }}>{errors.password}</span>}
            </div>
            <div className="form-group">
                <label htmlFor={`${idPrefix}-confirm`}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                    <input
                        id={`${idPrefix}-confirm`}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => onConfirmChange(e.target.value)}
                        style={{ borderColor: errors.confirmPassword ? 'red' : '', width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        style={toggleBtnStyle}
                        onClick={onToggleShowConfirmPassword}
                        tabIndex={-1}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                        {showConfirmPassword ? '🙈' : '👁'}
                    </button>
                </div>
                {errors.confirmPassword && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.confirmPassword}</span>}
            </div>
        </>
    );
}

const EMPTY_VERIFY_DIGITS = (): string[] => ['', '', '', '', '', ''];

function normalizeVerifyDigits(prev: string[]): string[] {
    return Array.from({ length: 6 }, (_, i) => {
        const c = (prev[i] ?? '').replace(/\D/g, '');
        return c.slice(-1) || '';
    });
}

function VerificationCodeInputs({
    digits,
    setDigits,
    verificationError,
    isVerifying,
    onClearError,
}: {
    digits: string[];
    setDigits: Dispatch<SetStateAction<string[]>>;
    verificationError: string | null;
    isVerifying: boolean;
    onClearError: () => void;
}) {
    const cell = (i: number) => digits[i] ?? '';

    const setDigit = (index: number, raw: string) => {
        const v = raw.replace(/\D/g, '').slice(-1) || '';
        setDigits((prev) => {
            const next = normalizeVerifyDigits(prev);
            next[index] = v;
            return next;
        });
        onClearError();
    };

    return (
        <div className="code-input-wrapper">
            {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    className="code-digit"
                    maxLength={1}
                    value={cell(index)}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') {
                            setDigit(index, '');
                            return;
                        }
                        setDigit(index, raw);
                        if (index < 5) {
                            const wrapper = e.target.closest('.code-input-wrapper');
                            const inputs = wrapper?.querySelectorAll<HTMLInputElement>('.code-digit');
                            inputs?.[index + 1]?.focus();
                        }
                    }}
                    onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (!pasted) return;
                        const chars = pasted.split('');
                        setDigits(Array.from({ length: 6 }, (_, i) => chars[i] || ''));
                        onClearError();
                        const focusIndex = Math.min(pasted.length - 1, 5);
                        const wrapper = e.currentTarget.closest('.code-input-wrapper');
                        const inputs = wrapper?.querySelectorAll<HTMLInputElement>('.code-digit');
                        inputs?.[focusIndex]?.focus();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                            if (cell(index)) {
                                e.preventDefault();
                                setDigit(index, '');
                            } else if (index > 0) {
                                e.preventDefault();
                                setDigit(index - 1, '');
                                const wrapper = (e.target as HTMLElement).closest('.code-input-wrapper');
                                const inputs = wrapper?.querySelectorAll<HTMLInputElement>('.code-digit');
                                inputs?.[index - 1]?.focus();
                            }
                        }
                    }}
                    style={{
                        borderColor: verificationError ? '#ef4444' : (cell(index) ? 'var(--primary)' : 'var(--cream-dark)'),
                    }}
                    disabled={isVerifying}
                />
            ))}
        </div>
    );
}

/** Human-readable birthday for profile detail (API: dateOfBirth / DateOfBirth). */
const formatBirthdayDisplay = (val: string | undefined | null): string => {
    const iso = toDateOnly(val);
    if (!iso) return '';
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return '';
    const [y, m, d] = parts;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[m - 1]} ${d}, ${y}`;
};

/** Comma-separated countries (multi PR) shown as chips when more than one. */
function CountryResidenceDisplay({ value }: { value?: string | null }): ReactNode {
    const raw = (value || '').trim();
    if (!raw) return <>Not Specified</>;
    const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return <>Not Specified</>;
    if (parts.length === 1) return <>{parts[0]}</>;
    return (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            {parts.map((c) => (
                <span
                    key={c}
                    style={{
                        background: '#eef2ff',
                        color: 'var(--primary)',
                        padding: '0.2rem 0.7rem',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                    }}
                >
                    {c}
                </span>
            ))}
        </span>
    );
}

export default function Modals({ activeModal, onClose, onSwitch, selectedBlogId = null, registerAsMatchmaker = false, selectedProfile: initialSelectedProfile = null }: ModalsProps) {
    const { login, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [loginTab, setLoginTab] = useState<'login' | 'register'>('login');
    const [profileTab, setProfileTab] = useState('about');
    const [registerAccountType, setRegisterAccountType] = useState('Self');
    const [subscriptionOption, setSubscriptionOption] = useState('Free');

    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileAccessMessage, setProfileAccessMessage] = useState<string | null>(null);
    const [isProfileLockedByDailyLimit, setIsProfileLockedByDailyLimit] = useState(false);

    useEffect(() => {
        if (initialSelectedProfile) {
            setSelectedProfile(initialSelectedProfile);
            setProfileAccessMessage(null);
            setIsProfileLockedByDailyLimit(false);
            if (activeModal === 'profile' && initialSelectedProfile.userId) {
                const fetchDetailedProfile = async () => {
                    setIsLoadingProfile(true);
                    try {
                        const res = await matrimonialService.getProfile(
                            initialSelectedProfile.userId,
                            user?.id ? Number(user.id) : undefined,
                            true
                        );
                        if (res.statusCode === 200 && res.result) {
                            setIsProfileLockedByDailyLimit(false);
                            setSelectedProfile((prev: any) => ({
                                ...prev,
                                ...res.result,
                                firstName: prev?.firstName || res.result.firstName,
                                lastName: prev?.lastName || res.result.lastName,
                                profilePhoto: prev?.profilePhoto || res.result.profilePhoto,
                                dateOfBirth: res.result.dateOfBirth ?? res.result.DateOfBirth ?? prev?.dateOfBirth,
                                educationLevel: res.result.qualificationLevel || prev?.educationLevel,
                                aboutMe: res.result.remarks || prev?.aboutMe,
                                diet: res.result.eatingHabits || prev?.diet,
                                smoking: res.result.smokingHabits || prev?.smoking,
                                drinking: res.result.drinkingHabits || prev?.drinking,
                                partnerPreferences: res.result.partnerAdditionalRequirements || prev?.partnerPreferences,
                            }));
                        } else if (res?.message) {
                            setProfileAccessMessage(res.message);
                            if (String(res.message).toLowerCase().includes('daily profile view limit reached')) {
                                setIsProfileLockedByDailyLimit(true);
                            }
                        }
                    } catch (error) {
                        console.error("Failed to load detailed profile", error);
                        if (error instanceof Error && error.message) {
                            setProfileAccessMessage(error.message);
                            if (error.message.toLowerCase().includes('daily profile view limit reached')) {
                                setIsProfileLockedByDailyLimit(true);
                            }
                        }
                    } finally {
                        setIsLoadingProfile(false);
                    }
                };
                fetchDetailedProfile();
            }
        } else {
            setSelectedProfile(null);
            setProfileAccessMessage(null);
            setIsProfileLockedByDailyLimit(false);
        }
    }, [activeModal, initialSelectedProfile, user?.id]);
    const [isWhatsAppSame, setIsWhatsAppSame] = useState(false);
    const [nic, setNic] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loginTermsAccepted, setLoginTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotMode, setForgotMode] = useState<'contact' | 'search'>('contact');
    const [forgotContactEmail, setForgotContactEmail] = useState('');
    const [forgotContactPhone, setForgotContactPhone] = useState('');
    const [forgotContactWhatsApp, setForgotContactWhatsApp] = useState('');
    const [forgotSearchName, setForgotSearchName] = useState('');
    const [forgotSearchResults, setForgotSearchResults] = useState<RecoveryAccount[]>([]);
    const [forgotSelectedAccount, setForgotSelectedAccount] = useState<RecoveryAccount | null>(null);
    const [forgotRecoveryUserId, setForgotRecoveryUserId] = useState<number | null>(null);
    const [forgotSentVia, setForgotSentVia] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [forgotNewPassword, setForgotNewPassword] = useState('');
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
    const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
    const [forgotStep, setForgotStep] = useState<'entry' | 'verify'>('entry');
    const [profilePhotoBase64, setProfilePhotoBase64] = useState('');
    const [photoPreview, setPhotoPreview] = useState('');

    // Verification states
    const [showVerification, setShowVerification] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState<number | null>(null);
    const [verificationMethod, setVerificationMethod] = useState<string>('');
    const [verificationDigits, setVerificationDigits] = useState<string[]>(EMPTY_VERIFY_DIGITS);
    const verificationCode = useMemo(() => verificationDigits.join(''), [verificationDigits]);
    const verificationComplete = useMemo(
        () => verificationDigits.length === 6 && verificationDigits.every((d) => /^\d$/.test(d)),
        [verificationDigits]
    );
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [sendCodeError, setSendCodeError] = useState<string | null>(null);
    const [isSendingCode, setIsSendingCode] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [registeredFirstName, setRegisteredFirstName] = useState('');

    // When opening register as matchmaker, lock account type to Matchmaker
    useEffect(() => {
        if (activeModal === 'register' && registerAsMatchmaker) {
            setRegisterAccountType('Matchmaker');
        }
    }, [activeModal, registerAsMatchmaker]);

    // When opening verify modal, set the registered user ID from the logged-in user
    useEffect(() => {
        if (activeModal === 'verify' && user) {
            setRegisteredUserId(Number(user.id));
            setRegisteredFirstName(user.firstName);
            // We don't need to set showVerification to true because we use activeModal === 'verify' in the render
        }
    }, [activeModal, user]);

    const pwdChecks = useMemo(() => checkPasswordPolicy(password), [password]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!firstName.trim()) newErrors.firstName = 'First Name is required';
        else {
            const fnErr = nameLettersOnlyError(firstName, 'First name');
            if (fnErr) newErrors.firstName = fnErr;
        }
        if (!lastName.trim()) newErrors.lastName = 'Last Name is required';
        else {
            const lnErr = nameLettersOnlyError(lastName, 'Last name');
            if (lnErr) newErrors.lastName = lnErr;
        }
        if (!nic) newErrors.nic = 'NIC/Passport is required';
        if (!dob) newErrors.dob = 'Date of Birth is required';
        if (!gender) newErrors.gender = 'Gender is required';
        if (!phone.trim()) newErrors.phone = 'Phone Number is required';
        else {
            const pe = sriLankanPhoneFormatErrorIfInvalid(phone, 'Phone number');
            if (pe) newErrors.phone = pe;
        }
        if (!isWhatsAppSame) {
            if (!whatsapp.trim()) {
                newErrors.whatsapp = WHATSAPP_REQUIRED_MSG;
            } else {
                const we = sriLankanPhoneFormatErrorIfInvalid(whatsapp, 'WhatsApp number');
                if (we) {
                    newErrors.whatsapp = we;
                } else if (
                    isValidSriLankanPhone(phone) &&
                    isValidSriLankanPhone(whatsapp) &&
                    phonesAreSameSriLankanNumber(phone, whatsapp)
                ) {
                    newErrors.whatsapp = WHATSAPP_SAME_AS_PHONE_MSG;
                }
            }
        }
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!password) newErrors.password = 'Password is required';
        else if (!passwordPassesPolicy(password)) {
            newErrors.password = 'Password must satisfy all requirements below';
        }
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFirstNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setFirstName(v);
        setErrors((prev) => {
            const next = { ...prev };
            const err = nameLettersOnlyError(v, 'First name');
            if (err) next.firstName = err;
            else delete next.firstName;
            return next;
        });
    };

    const handleLastNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setLastName(v);
        setErrors((prev) => {
            const next = { ...prev };
            const err = nameLettersOnlyError(v, 'Last name');
            if (err) next.lastName = err;
            else delete next.lastName;
            return next;
        });
    };

    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        const v = sanitizeSriLankanPhoneInput(e.target.value);
        setPhone(v);
        if (isWhatsAppSame) setWhatsapp(v);
        setErrors((prev) => {
            const next = { ...prev };
            if (!v.trim() || isValidSriLankanPhone(v)) delete next.phone;
            if (
                !isWhatsAppSame &&
                whatsapp.trim() &&
                isValidSriLankanPhone(v) &&
                isValidSriLankanPhone(whatsapp) &&
                phonesAreSameSriLankanNumber(v, whatsapp)
            ) {
                next.whatsapp = WHATSAPP_SAME_AS_PHONE_MSG;
            } else if (
                !isWhatsAppSame &&
                whatsapp.trim() &&
                isValidSriLankanPhone(whatsapp) &&
                !phonesAreSameSriLankanNumber(v, whatsapp) &&
                prev.whatsapp === WHATSAPP_SAME_AS_PHONE_MSG
            ) {
                delete next.whatsapp;
            }
            return next;
        });
    };

    const handleWhatsappChange = (e: ChangeEvent<HTMLInputElement>) => {
        const v = sanitizeSriLankanPhoneInput(e.target.value);
        setWhatsapp(v);
        setErrors((prev) => {
            const next = { ...prev };
            if (!v.trim()) {
                delete next.whatsapp;
                return next;
            }
            if (!isValidSriLankanPhone(v)) {
                return next;
            }
            if (
                !isWhatsAppSame &&
                isValidSriLankanPhone(phone) &&
                phonesAreSameSriLankanNumber(phone, v)
            ) {
                next.whatsapp = WHATSAPP_SAME_AS_PHONE_MSG;
            } else {
                delete next.whatsapp;
            }
            return next;
        });
    };

    const handleWhatsAppSameToggle = (checked: boolean) => {
        setIsWhatsAppSame(checked);
        if (checked) {
            setWhatsapp(phone);
            setErrors((prev) => {
                const next = { ...prev };
                delete next.whatsapp;
                return next;
            });
        } else {
            setErrors((prev) => {
                const next = { ...prev };
                if (
                    whatsapp.trim() &&
                    isValidSriLankanPhone(phone) &&
                    isValidSriLankanPhone(whatsapp) &&
                    phonesAreSameSriLankanNumber(phone, whatsapp)
                ) {
                    next.whatsapp = WHATSAPP_SAME_AS_PHONE_MSG;
                } else if (prev.whatsapp === WHATSAPP_SAME_AS_PHONE_MSG) {
                    delete next.whatsapp;
                }
                return next;
            });
        }
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setRegisterError(null);

        try {
            // Send date as YYYY-MM-DDT00:00:00 without timezone to avoid browser timezone shifts.
            const dateOfBirth = dob.length === 10 ? `${dob}T00:00:00` : dob;

            // Call the API
            const response = await matrimonialService.register({
                firstName,
                lastName,
                nic,
                dateOfBirth,
                gender,
                phone,
                whatsApp: isWhatsAppSame ? phone : whatsapp,
                email,
                password,
                accountType: registerAccountType,
                profilePhotoBase64: registerAccountType === 'Self' ? profilePhotoBase64 : undefined,
            });

            console.log('Registration response:', response);

            // Check if registration was successful
            // Handle different response formats: statusCode can be 200, or result might have userId or id
            const resultAny = response.result as Record<string, unknown>;
            const userId = resultAny?.userId || resultAny?.id;
            const statusCode = response.statusCode;
            const hasResult = !!response.result;

            console.log('Registration check - statusCode:', statusCode, 'hasResult:', hasResult, 'userId:', userId);

            // Check for success (statusCode 200 or if result exists with userId)
            const isSuccess = (statusCode === 200 || statusCode === 1 || (hasResult && userId)) && hasResult && userId;

            if (isSuccess) {
                // Registration successful - show verification screen
                console.log('Registration successful! Setting verification screen, userId:', userId);
                setRegisteredFirstName(firstName);
                setRegisteredUserId(Number(userId));
                setShowVerification(true);
                setCodeSent(false); // Reset code sent state - user must select method first
                setVerificationMethod(''); // Reset verification method
                setVerificationDigits(EMPTY_VERIFY_DIGITS()); // Reset verification code
                setVerificationError(null); // Reset errors
                setSendCodeError(null); // Reset send code errors
                setRegisterError(null);
                // IMPORTANT: Don't close modal or redirect - wait for verification
                // The verification screen will be shown in the modal
                // User must select a verification method - no code is sent automatically
            } else {
                console.error('Registration failed or missing userId. Response:', response);
                setRegisterError(response.message || 'Registration failed. Please try again.');
                setShowVerification(false); // Ensure verification screen is not shown on error
            }
        } catch (error) {
            // Extract error message properly
            let errorMessage = 'Registration failed. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
                // Only log to console if it's not an expected API error
                if (!(error as any).isApiError) {
                    console.error('Registration error:', error);
                }
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            setRegisterError(errorMessage);
            setShowVerification(false); // Ensure verification screen is not shown on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!loginEmail || !loginPassword) {
            setLoginError('Please enter both email and password');
            return;
        }

        setIsLoading(true);
        setLoginError(null);

        try {
            const response = await matrimonialService.login({
                email: loginEmail,
                password: loginPassword,
            });

            if (response.statusCode === 200 && response.result) {
                // Login successful
                console.log('Login API response:', response.result);
                const user = {
                    id: response.result.id.toString(),
                    firstName: response.result.firstName,
                    lastName: response.result.lastName,
                    email: response.result.email || response.result.username || loginEmail,
                    phone: response.result.mobileNumber || response.result.phoneNumber || '',
                    whatsapp: response.result.WhatsApp || response.result.whatsApp || response.result.whatsapp || '',
                    nic: response.result.nic || response.result.Nic || response.result.nicNumber || response.result.identityDocument || response.result.IdentityDocument || '',
                    dob: toDateOnly(response.result.DateOfBirth || response.result.dateofBirth || response.result.dateOfBirth || response.result.dob),
                    gender: response.result.Gender || response.result.gender || '',
                    accountType: response.result.AccountType || response.result.accountType || response.result.role || 'Free Member',
                    profilePhoto: response.result.ProfilePhoto || response.result.profilePhoto || '',
                    horoscopeDocument: response.result.HoroscopeDocument || response.result.horoscopeDocument || '',
                    isVerified: response.result.status === 1,
                };

                login(user);

                // Store token
                if (response.result.accessToken) {
                    localStorage.setItem('token', response.result.accessToken);
                }

                onClose();
                router.push('/');
                // Force a page reload to ensure state is clean
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
            } else {
                setLoginError(response.message || 'Login failed. Please check your credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoginError(error instanceof Error ? error.message : 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForgotPasswordState = () => {
        setShowForgotPassword(false);
        setForgotMode('contact');
        setForgotContactEmail('');
        setForgotContactPhone('');
        setForgotContactWhatsApp('');
        setForgotSearchName('');
        setForgotSearchResults([]);
        setForgotSelectedAccount(null);
        setForgotRecoveryUserId(null);
        setForgotSentVia('');
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        setForgotError(null);
        setForgotSuccess(null);
        setForgotStep('entry');
        setIsForgotSubmitting(false);
    };

    const handleSearchRecoveryAccounts = async () => {
        if (forgotSearchName.trim().length < 2) {
            setForgotError('Please type at least 2 characters to search by name.');
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);
        setForgotSelectedAccount(null);

        try {
            const response = await matrimonialService.searchRecoveryAccounts(forgotSearchName.trim());
            const accounts = Array.isArray(response?.result) ? response.result : [];
            setForgotSearchResults(accounts);

            if (accounts.length === 0) {
                setForgotError('No matching account found. Try a different name.');
            }
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Failed to search accounts.');
            setForgotSearchResults([]);
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleInitiateForgotByContact = async () => {
        const payload = {
            email: forgotContactEmail.trim() || undefined,
            phoneNumber: forgotContactPhone.trim() || undefined,
            whatsApp: forgotContactWhatsApp.trim() || undefined,
        };

        if (!payload.email && !payload.phoneNumber && !payload.whatsApp) {
            setForgotError('Enter your registered email, phone number, or WhatsApp number to continue.');
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);

        try {
            const response = await matrimonialService.initiateForgotPassword(payload);
            const userId = response?.result?.userId;
            const sentVia = response?.result?.sentVia || 'Email';

            if (!userId) {
                setForgotError(response.message || 'Could not start password recovery.');
                return;
            }

            setForgotRecoveryUserId(Number(userId));
            setForgotSentVia(sentVia);
            setForgotStep('verify');
            setForgotSuccess(`A verification code was sent via ${sentVia}.`);
            alert(`A verification code has been sent via ${sentVia}.`);
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Could not verify your account details.');
            alert(error instanceof Error ? error.message : 'Could not verify your account details.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleInitiateForgotBySelectedAccount = async (account: RecoveryAccount) => {
        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);
        setForgotSelectedAccount(account);

        try {
            const response = await matrimonialService.initiateForgotPassword({ userId: account.userId });
            const userId = response?.result?.userId;
            const sentVia = response?.result?.sentVia || account.verifiedBy || 'Email';

            if (!userId) {
                setForgotError(response.message || 'Could not start password recovery.');
                return;
            }

            setForgotRecoveryUserId(Number(userId));
            setForgotSentVia(String(sentVia));
            setForgotStep('verify');
            setForgotSuccess(`A verification code was sent via ${sentVia}.`);
            alert(`Code sent via ${sentVia} to the selected account.`);
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Could not send verification code.');
            alert(error instanceof Error ? error.message : 'Could not send verification code.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleForgotPasswordReset = async () => {
        if (!forgotRecoveryUserId) {
            setForgotError('Recovery session is missing. Please restart forgot password.');
            return;
        }

        if (!forgotCode || forgotCode.length !== 6) {
            setForgotError('Enter the 6-digit verification code.');
            return;
        }

        if (!forgotNewPassword || forgotNewPassword.length < 6) {
            setForgotError('New password must be at least 6 characters.');
            return;
        }

        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('Confirm password does not match.');
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);

        try {
            const response = await matrimonialService.resetForgotPasswordWithCode({
                userId: forgotRecoveryUserId,
                code: forgotCode,
                newPassword: forgotNewPassword,
                confirmPassword: forgotConfirmPassword,
            });

            if (response.statusCode === 200 || response.statusCode === 1) {
                setForgotSuccess(response.message || 'Password reset successfully.');
                alert('Password reset successfully. Please login with your new password.');
                resetForgotPasswordState();
                setLoginTab('login');
            } else {
                setForgotError(response.message || 'Failed to reset password.');
            }
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Failed to reset password.');
            alert(error instanceof Error ? error.message : 'Failed to reset password.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const parseNIC = (nicNumber: string) => {
        const normalizedNIC = nicNumber.trim().toUpperCase();
        const currentYear = new Date().getFullYear();
        let year = '';
        let dayText = '';
        let gender = '';

        // Old NIC: 9 digits + V/X
        if (/^\d{9}[VX]$/.test(normalizedNIC)) {
            year = `19${normalizedNIC.substring(0, 2)}`;
            dayText = normalizedNIC.substring(2, 5);
        }
        // New NIC: 12 digits, first 4 digits are year
        else if (/^\d{12}$/.test(normalizedNIC)) {
            const parsedYear = Number(normalizedNIC.substring(0, 4));
            // Restrict to realistic years to avoid parsing passport/other IDs as NIC
            if (parsedYear < 1900 || parsedYear > currentYear) return null;
            year = normalizedNIC.substring(0, 4);
            dayText = normalizedNIC.substring(4, 7);
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

        // Sri Lankan NIC always counts February as 29 days even in non-leap
        // years, so use a fixed leap year for the month/day extraction.
        const refDate = new Date(Date.UTC(2000, 0, 1));
        refDate.setUTCDate(dayOfYear);
        const month = String(refDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(refDate.getUTCDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        return { dob: formattedDate, gender };
    };

    const handleNicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = sanitizeNicInput(e.target.value);
        setNic(value);
        const result = parseNIC(value);
        if (result) {
            setDob(result.dob);
            setGender(result.gender);
        }
    };

    const handleWelcomePopupClose = () => {
        setShowWelcomePopup(false);
        // Reset all registration/verification state after welcome popup closes
        setRegisteredUserId(null);
        setRegisteredFirstName('');
        setProfilePhotoBase64('');
        setPhotoPreview('');
        setVerificationMethod('');
        setVerificationDigits(EMPTY_VERIFY_DIGITS());
        setVerificationError(null);
        setSendCodeError(null);
        setCodeSent(false);
        setIsSendingCode(false);
        setIsVerifying(false);
        setShowVerification(false);
        // User is usually already on `/` after verify (modal closed). Avoid router + full reload (double load).
        if (pathname !== '/') {
            router.replace('/');
        }
    };

    const close = () => {
        // Don't reset welcome popup state if it should be shown
        // Only reset if welcome popup is not active
        if (!showWelcomePopup) {
            resetForgotPasswordState();
            setShowVerification(false);
            setRegisteredUserId(null);
            setVerificationMethod('');
            setVerificationDigits(EMPTY_VERIFY_DIGITS());
            setVerificationError(null);
            setSendCodeError(null);
            setCodeSent(false);
            setIsSendingCode(false);
            setIsVerifying(false);
            setRegisteredFirstName('');
            setProfilePhotoBase64('');
            setPhotoPreview('');
            setConfirmPassword('');
            setShowRegisterPassword(false);
            setShowRegisterConfirmPassword(false);
        }
        onClose();
    };

    const handleOverlayClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) close();
    };

    const handleSendVerificationCode = async (method: string) => {
        if (!registeredUserId) {
            setSendCodeError('User ID not found');
            return;
        }

        setIsSendingCode(true);
        setSendCodeError(null);
        setVerificationError(null);

        try {
            const response = await matrimonialService.sendVerificationCode(registeredUserId, method);
            if (response.statusCode === 200 || response.statusCode === 1) {
                setVerificationMethod(method);
                setCodeSent(true);
                setSendCodeError(null);
            } else {
                setSendCodeError(response.message || 'Failed to send verification code');
            }
        } catch (error) {
            console.error('Send verification code error:', error);
            setSendCodeError(error instanceof Error ? error.message : 'Failed to send verification code');
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleVerifyCode = async () => {
        if (!registeredUserId) {
            setVerificationError('User ID not found');
            return;
        }

        if (!verificationCode || verificationCode.length !== 6) {
            setVerificationError('Please enter a valid 6-digit verification code');
            return;
        }

        setIsVerifying(true);
        setVerificationError(null);

        try {
            const response = await matrimonialService.verifyCode(registeredUserId, verificationCode);
            if (response.statusCode === 200 || response.statusCode === 1) {
                // Verification successful.
                // Ensure we have a token for authorized APIs (uploads, profile updates).
                const existingToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

                const fallbackUser = user || undefined;
                let userToLogin = {
                    id: registeredUserId.toString(),
                    firstName: firstName || fallbackUser?.firstName || '',
                    lastName: lastName || fallbackUser?.lastName || '',
                    email: email || fallbackUser?.email || '',
                    nic: nic || fallbackUser?.nic,
                    dob: dob || fallbackUser?.dob,
                    gender: gender || fallbackUser?.gender,
                    phone: phone || fallbackUser?.phone,
                    whatsapp: (isWhatsAppSame ? phone : whatsapp) || fallbackUser?.whatsapp,
                    accountType: registerAccountType || fallbackUser?.accountType,
                    profilePhoto: fallbackUser?.profilePhoto,
                    horoscopeDocument: fallbackUser?.horoscopeDocument,
                    isVerified: true,
                };

                if (!existingToken) {
                    if (!email || !password) {
                        setVerificationError('Account verified, but session is missing. Please login again to continue.');
                        return;
                    }

                    const loginResponse = await matrimonialService.login({ email, password });
                    const token = loginResponse?.result?.accessToken;
                    const loginOk = (loginResponse.statusCode === 200 || loginResponse.statusCode === 1) && !!token;

                    if (!loginOk) {
                        setVerificationError(loginResponse?.message || 'Account verified, but login failed. Please login and continue.');
                        return;
                    }

                    localStorage.setItem('token', token);

                    const r = loginResponse.result;
                    userToLogin = {
                        id: (r.id ?? registeredUserId).toString(),
                        firstName: r.firstName || userToLogin.firstName,
                        lastName: r.lastName || userToLogin.lastName,
                        email: r.email || r.username || userToLogin.email,
                        phone: r.mobileNumber || r.phoneNumber || userToLogin.phone,
                        whatsapp: r.WhatsApp || r.whatsApp || r.whatsapp || userToLogin.whatsapp,
                        nic: r.nic || r.Nic || r.nicNumber || r.identityDocument || r.IdentityDocument || userToLogin.nic,
                        dob: toDateOnly(r.DateOfBirth || r.dateofBirth || r.dateOfBirth || r.dob) || userToLogin.dob,
                        gender: r.Gender || r.gender || userToLogin.gender,
                        accountType: r.AccountType || r.accountType || r.role || userToLogin.accountType,
                        profilePhoto: r.ProfilePhoto || r.profilePhoto || userToLogin.profilePhoto,
                        horoscopeDocument: r.HoroscopeDocument || r.horoscopeDocument || userToLogin.horoscopeDocument,
                        isVerified: r.status === 1 ? true : userToLogin.isVerified,
                    };
                }

                login(userToLogin);

                // Ensure firstName is set for welcome popup (use firstName from form if registeredFirstName is not set)
                const firstNameToUse = registeredFirstName || firstName;
                if (firstNameToUse) {
                    setRegisteredFirstName(firstNameToUse);
                }

                // Close the verification modal first
                setShowVerification(false);

                // Show welcome popup immediately (before closing modal to preserve state)
                setShowWelcomePopup(true);

                // Close modal after popup is shown
                setTimeout(() => {
                    onClose();
                }, 50);
            } else {
                setVerificationError(response.message || 'Verification failed');
            }
        } catch (error) {
            console.error('Verify code error:', error);
            setVerificationError(error instanceof Error ? error.message : 'Verification failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendCode = () => {
        setCodeSent(false);
        setVerificationDigits(EMPTY_VERIFY_DIGITS());
        setVerificationError(null);
        setSendCodeError(null);
    };

    return (
        <>
            {/* Welcome Popup */}
            {showWelcomePopup && (registeredFirstName || firstName) && (
                <WelcomePopup
                    firstName={registeredFirstName || firstName}
                    onClose={handleWelcomePopupClose}
                />
            )}

            {/* Login Modal */}
            <div className={`modal-overlay ${activeModal === 'login' || activeModal === 'verify' ? 'active' : ''}`} id="loginModal" onClick={handleOverlayClick}>
                <div className="modal">
                    <button className="modal-close" onClick={close}>✕</button>
                    <div className="modal-header">
                        <h2>{activeModal === 'verify' ? 'Verify Account' : 'Welcome Back'}</h2>
                        <p>{activeModal === 'verify' ? 'Please verify your account to continue' : 'Login to continue your journey'}</p>
                    </div>
                    <div className="modal-body">
                        {activeModal !== 'verify' && !showVerification && (
                            <div className="login-tabs">
                                <button className={`login-tab ${loginTab === 'login' ? 'active' : ''}`} onClick={() => { setLoginTab('login'); setShowForgotPassword(false); }}>Login</button>
                                <button className={`login-tab ${loginTab === 'register' ? 'active' : ''}`} onClick={() => { setLoginTab('register'); setShowForgotPassword(false); }}>Register</button>
                            </div>
                        )}

                        {activeModal === 'verify' || showVerification ? (
                            <div id="verificationTab" className="tab-content active verification-screen" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                <div className="verification-header">
                                    <div className="verification-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                                        </svg>
                                    </div>
                                    <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-dark)' }}>Verify Your Account</h3>
                                    <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                        {!codeSent ? 'Select a verification method to receive your code' : `We've sent a 6-digit code to your ${verificationMethod.toLowerCase()}`}
                                    </p>
                                </div>

                                {!codeSent ? (
                                    <div className="verification-methods">
                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('Email')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon email-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>Email</h4>
                                                <p>{email}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'Email' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('Phone')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon phone-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>Phone</h4>
                                                <p>{phone}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'Phone' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('WhatsApp')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon whatsapp-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>WhatsApp</h4>
                                                <p>{isWhatsAppSame ? phone : whatsapp}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'WhatsApp' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>
                                        {sendCodeError && !codeSent && (
                                            <div className="error-message" style={{
                                                color: '#ef4444',
                                                fontSize: '0.85rem',
                                                marginTop: '1rem',
                                                textAlign: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: '#fef2f2',
                                                borderRadius: '8px',
                                                border: '1px solid #fecaca'
                                            }}>
                                                {sendCodeError}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="verification-code-section">
                                        <div className="code-input-container">
                                            <VerificationCodeInputs
                                                digits={verificationDigits}
                                                setDigits={setVerificationDigits}
                                                verificationError={verificationError}
                                                isVerifying={isVerifying}
                                                onClearError={() => setVerificationError(null)}
                                            />
                                            {verificationError && (
                                                <div className="error-message" style={{
                                                    color: '#ef4444',
                                                    fontSize: '0.85rem',
                                                    marginTop: '1rem',
                                                    textAlign: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: '#fef2f2',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fecaca'
                                                }}>
                                                    {verificationError}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="btn btn-primary verify-button"
                                            style={{
                                                width: '100%',
                                                justifyContent: 'center',
                                                padding: '1rem',
                                                fontSize: '1rem',
                                                marginTop: '1.5rem',
                                                opacity: (verificationComplete && !isVerifying) ? 1 : 0.5,
                                                cursor: (verificationComplete && !isVerifying) ? 'pointer' : 'not-allowed',
                                                position: 'relative'
                                            }}
                                            disabled={!verificationComplete || isVerifying}
                                            onClick={handleVerifyCode}
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <div className="spinner-small" style={{ marginRight: '0.5rem' }}></div>
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    Verify Account
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.5rem' }}>
                                                        <path d="M5 12l5 5 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>

                                        <div className="resend-section" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                                Didn't receive the code?
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleResendCode}
                                                    className="resend-button"
                                                    disabled={isSendingCode}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--primary)',
                                                        cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                        textDecoration: 'underline',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        opacity: isSendingCode ? 0.5 : 1
                                                    }}
                                                >
                                                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCodeSent(false);
                                                        setVerificationDigits(EMPTY_VERIFY_DIGITS());
                                                        setVerificationError(null);
                                                        setSendCodeError(null);
                                                    }}
                                                    className="resend-button"
                                                    disabled={isSendingCode || isVerifying}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-light)',
                                                        cursor: (isSendingCode || isVerifying) ? 'not-allowed' : 'pointer',
                                                        textDecoration: 'underline',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        opacity: (isSendingCode || isVerifying) ? 0.5 : 1
                                                    }}
                                                >
                                                    Change Method
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : loginTab === 'login' ? (
                            <div id="loginTab" className="tab-content active">
                                {showForgotPassword ? (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <h3 style={{ margin: 0 }}>Forgot Password</h3>
                                            <button
                                                type="button"
                                                onClick={resetForgotPasswordState}
                                                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                                            >
                                                Back to Login
                                            </button>
                                        </div>

                                        {forgotStep === 'entry' ? (
                                            <>
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <input
                                                            type="radio"
                                                            checked={forgotMode === 'contact'}
                                                            onChange={() => {
                                                                setForgotMode('contact');
                                                                setForgotError(null);
                                                                setForgotSuccess(null);
                                                            }}
                                                        />
                                                        Use registered contact
                                                    </label>
                                                    <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                        <input
                                                            type="radio"
                                                            checked={forgotMode === 'search'}
                                                            onChange={() => {
                                                                setForgotMode('search');
                                                                setForgotError(null);
                                                                setForgotSuccess(null);
                                                            }}
                                                        />
                                                        Search by name
                                                    </label>
                                                </div>

                                                {forgotMode === 'contact' ? (
                                                    <>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                                            Enter the same email, phone number, or WhatsApp used during registration.
                                                            If details are wrong, recovery cannot continue.
                                                        </p>
                                                        <div className="form-group">
                                                            <label>Registered Email</label>
                                                            <input type="email" value={forgotContactEmail} onChange={(e) => setForgotContactEmail(e.target.value)} placeholder="your@email.com" />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Registered Phone Number</label>
                                                            <input type="text" value={forgotContactPhone} onChange={(e) => setForgotContactPhone(sanitizeSriLankanPhoneInput(e.target.value))} placeholder={SL_PHONE_PLACEHOLDER} />
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Registered WhatsApp Number</label>
                                                            <input type="text" value={forgotContactWhatsApp} onChange={(e) => setForgotContactWhatsApp(sanitizeSriLankanPhoneInput(e.target.value))} placeholder={SL_PHONE_PLACEHOLDER} />
                                                        </div>
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ width: '100%', justifyContent: 'center' }}
                                                            onClick={handleInitiateForgotByContact}
                                                            disabled={isForgotSubmitting}
                                                        >
                                                            {isForgotSubmitting ? 'Validating...' : 'Send Recovery Code'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                                            Search your account by name, choose your profile, and we will send the code automatically to your verified method.
                                                        </p>
                                                        <div className="form-group">
                                                            <label>Type your name</label>
                                                            <input
                                                                type="text"
                                                                value={forgotSearchName}
                                                                onChange={(e) => setForgotSearchName(e.target.value)}
                                                                placeholder="First name or full name"
                                                            />
                                                        </div>
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ width: '100%', justifyContent: 'center', marginBottom: '1rem' }}
                                                            onClick={handleSearchRecoveryAccounts}
                                                            disabled={isForgotSubmitting}
                                                        >
                                                            {isForgotSubmitting ? 'Searching...' : 'Search Account'}
                                                        </button>

                                                        {forgotSearchResults.length > 0 && (
                                                            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '8px', padding: '0.5rem' }}>
                                                                {forgotSearchResults.map((account) => (
                                                                    <div key={account.userId} style={{ borderBottom: '1px solid #f0f0f0', padding: '0.6rem 0' }}>
                                                                        <div style={{ fontWeight: 600 }}>{account.fullName}</div>
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                                            {account.email || account.phoneNumber || account.whatsApp || 'No contact details'}
                                                                        </div>
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '0.2rem' }}>
                                                                            Verified by: {account.verifiedBy || 'Email'}
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleInitiateForgotBySelectedAccount(account)}
                                                                            disabled={isForgotSubmitting}
                                                                            className="btn btn-outline"
                                                                            style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem' }}
                                                                        >
                                                                            Use this account
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>
                                                    Enter the 6-digit code sent via <strong>{forgotSentVia}</strong>, then set your new password.
                                                </p>
                                                {forgotSelectedAccount && (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                                        Account: <strong>{forgotSelectedAccount.fullName}</strong>
                                                    </div>
                                                )}
                                                <div className="form-group">
                                                    <label>Verification Code</label>
                                                    <input
                                                        type="text"
                                                        maxLength={6}
                                                        value={forgotCode}
                                                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                                                        placeholder="6-digit code"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>New Password</label>
                                                    <input
                                                        type="password"
                                                        value={forgotNewPassword}
                                                        onChange={(e) => setForgotNewPassword(e.target.value)}
                                                        placeholder="New password"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Confirm Password</label>
                                                    <input
                                                        type="password"
                                                        value={forgotConfirmPassword}
                                                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                                        placeholder="Confirm password"
                                                    />
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    onClick={handleForgotPasswordReset}
                                                    disabled={isForgotSubmitting}
                                                >
                                                    {isForgotSubmitting ? 'Resetting...' : 'Reset Password'}
                                                </button>
                                            </>
                                        )}

                                        {forgotError && (
                                            <div style={{ color: '#b91c1c', backgroundColor: '#fee2e2', borderRadius: '6px', padding: '0.6rem', marginTop: '1rem', fontSize: '0.9rem' }}>
                                                {forgotError}
                                            </div>
                                        )}
                                        {forgotSuccess && (
                                            <div style={{ color: '#166534', backgroundColor: '#dcfce7', borderRadius: '6px', padding: '0.6rem', marginTop: '1rem', fontSize: '0.9rem' }}>
                                                {forgotSuccess}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Email / Account ID</label>
                                            <input type="email" placeholder="Enter your email or account ID" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Password</label>
                                            <input type="password" placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                                        </div>
                                        <div className="checkbox-group">
                                            <input type="checkbox" id="remember" />
                                            <label htmlFor="remember">Remember me</label>
                                        </div>
                                        {loginError && (
                                            <div style={{
                                                color: 'red',
                                                fontSize: '0.9rem',
                                                marginBottom: '1rem',
                                                padding: '0.5rem',
                                                backgroundColor: '#ffe6e6',
                                                borderRadius: '4px'
                                            }}>
                                                {loginError}
                                            </div>
                                        )}
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            onClick={handleLogin}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Logging in...' : 'Login'}
                                        </button>
                                        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                                            <a
                                                href="#"
                                                style={{ color: 'var(--primary)' }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowForgotPassword(true);
                                                    setForgotError(null);
                                                    setForgotSuccess(null);
                                                }}
                                            >
                                                Forgot Password?
                                            </a>
                                        </p>
                                        <div className="divider">
                                            <span>or continue with</span>
                                        </div>
                                        <div className="social-login">
                                            <button className="social-btn">G</button>
                                            <button className="social-btn">f</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div id="registerTab" className="tab-content active" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Create a new account to get started</p>

                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={handleFirstNameChange} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={handleLastNameChange} style={{ borderColor: errors.lastName ? 'red' : '' }} />
                                        {errors.lastName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.lastName}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>National ID / Passport No *</label>
                                    <input type="text" placeholder="NIC or Passport Number" value={nic} onChange={handleNicChange} maxLength={12} style={{ borderColor: errors.nic ? 'red' : '' }} />
                                    {errors.nic && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.nic}</span>}
                                </div>
                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Date of Birth *</label>
                                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ borderColor: errors.dob ? 'red' : '' }} disabled={!!parseNIC(nic)} />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ borderColor: errors.gender ? 'red' : '' }} disabled={!!parseNIC(nic)}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input type="tel" placeholder={SL_PHONE_PLACEHOLDER} value={phone} onChange={handlePhoneChange} style={{ borderColor: errors.phone ? 'red' : '' }} />
                                    {errors.phone && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp Number *</label>
                                    <input type="tel" placeholder={SL_PHONE_PLACEHOLDER} disabled={isWhatsAppSame} value={isWhatsAppSame ? phone : whatsapp} onChange={handleWhatsappChange} style={{ borderColor: errors.whatsapp ? 'red' : '' }} />
                                    {errors.whatsapp && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.whatsapp}</span>}
                                    <div className="checkbox-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        <input
                                            type="checkbox"
                                            id="sameAsPhoneLogin"
                                            checked={isWhatsAppSame}
                                            onChange={(e) => handleWhatsAppSameToggle(e.target.checked)}
                                        />
                                        <label htmlFor="sameAsPhoneLogin" style={{ fontSize: '0.9rem' }}>Same as Phone Number</label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: errors.email ? 'red' : '' }} />
                                    {errors.email && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</span>}
                                </div>
                                <RegisterPasswordFields
                                    idPrefix="reg-login-tab"
                                    password={password}
                                    confirmPassword={confirmPassword}
                                    onPasswordChange={setPassword}
                                    onConfirmChange={setConfirmPassword}
                                    errors={errors}
                                    pwdChecks={pwdChecks}
                                    showPassword={showRegisterPassword}
                                    onToggleShowPassword={() => setShowRegisterPassword((v) => !v)}
                                    showConfirmPassword={showRegisterConfirmPassword}
                                    onToggleShowConfirmPassword={() => setShowRegisterConfirmPassword((v) => !v)}
                                />
                                <div className="form-group">
                                    <label>I am registering as *</label>
                                    {registerAsMatchmaker ? (
                                        <div className="account-types">
                                            <div className="account-type selected" style={{ cursor: 'default', opacity: 1 }}>
                                                <span>👤</span>
                                                Matchmaker
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="account-types">
                                            {['Self', 'Father', 'Mother', 'Relation', 'Matchmaker'].map(type => (
                                                <div key={type} className={`account-type ${registerAccountType === type ? 'selected' : ''}`} onClick={() => setRegisterAccountType(type)}>
                                                    <span>👤</span>
                                                    {type}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {registerAccountType === 'Self' && (
                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label>Profile Photo</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px dashed var(--cream-dark)', padding: '1rem', borderRadius: '8px' }}>
                                            {photoPreview ? (
                                                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                                    <Image src={photoPreview} alt="Preview" fill style={{ objectFit: 'cover', borderRadius: '50%' }} />
                                                    <button type="button" onClick={() => { setProfilePhotoBase64(''); setPhotoPreview(''); }} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>✕</button>
                                                </div>
                                            ) : (
                                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--cream-light)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="var(--text-light)" />
                                                    </svg>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" id="profilePhoto" style={{ display: 'none' }} onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        const base64String = reader.result as string;
                                                        setPhotoPreview(base64String);
                                                        setProfilePhotoBase64(base64String);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                            <label htmlFor="profilePhoto" className="btn btn-outline" style={{ cursor: 'pointer', padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto', display: 'inline-block', textAlign: 'center' }}>
                                                {photoPreview ? 'Change Photo' : 'Upload Photo'}
                                            </label>
                                        </div>
                                    </div>
                                )}
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="termsLogin"
                                        checked={loginTermsAccepted}
                                        onChange={(e) => setLoginTermsAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="termsLogin">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
                                </div>
                                {registerError && (
                                    <div style={{
                                        color: 'red',
                                        fontSize: '0.9rem',
                                        marginBottom: '1rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#ffe6e6',
                                        borderRadius: '4px'
                                    }}>
                                        {registerError}
                                    </div>
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        opacity: (loginTermsAccepted && !isLoading) ? 1 : 0.5,
                                        cursor: (loginTermsAccepted && !isLoading) ? 'pointer' : 'not-allowed'
                                    }}
                                    disabled={!loginTermsAccepted || isLoading}
                                    onClick={handleRegister}
                                >
                                    {isLoading ? 'Registering...' : 'Create Free Account →'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Register Modal */}
            <div className={`modal-overlay ${activeModal === 'register' ? 'active' : ''}`} id="registerModal">
                <div className="modal">
                    <button className="modal-close" onClick={close}>✕</button>
                    <div className="modal-header">
                        <h2>Create Account</h2>
                        <p>Start your journey to find your perfect match</p>
                    </div>
                    <div className="modal-body">
                        {showVerification ? (
                            <div className="verification-screen">
                                <div className="register-steps">
                                    <div className="reg-step completed">
                                        <span className="reg-step-num">✓</span>
                                    </div>
                                    <div className="reg-step-line"></div>
                                    <div className={`reg-step ${codeSent ? 'completed' : 'active'}`}>
                                        <span className="reg-step-num">{codeSent ? '✓' : '2'}</span>
                                    </div>
                                    <div className="reg-step-line"></div>
                                    <div className={`reg-step ${codeSent ? 'active' : ''}`}>
                                        <span className="reg-step-num">3</span>
                                    </div>
                                </div>

                                <div className="verification-header">
                                    <div className="verification-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                                        </svg>
                                    </div>
                                    <h3 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.3rem', fontWeight: '600', color: 'var(--text-dark)' }}>Verify Your Account</h3>
                                    <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                        {!codeSent ? 'Select a verification method to receive your code' : `We've sent a 6-digit code to your ${verificationMethod.toLowerCase()}`}
                                    </p>
                                </div>

                                {!codeSent ? (
                                    <div className="verification-methods">
                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('Email')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon email-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>Email</h4>
                                                <p>{email}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'Email' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('Phone')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon phone-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>Phone</h4>
                                                <p>{phone}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'Phone' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="verification-method-card"
                                            onClick={() => !isSendingCode && handleSendVerificationCode('WhatsApp')}
                                            style={{
                                                cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode ? 0.6 : 1
                                            }}>
                                            <div className="method-icon whatsapp-icon">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" fill="currentColor" />
                                                </svg>
                                            </div>
                                            <div className="method-content">
                                                <h4>WhatsApp</h4>
                                                <p>{isWhatsAppSame ? phone : whatsapp}</p>
                                            </div>
                                            {isSendingCode && verificationMethod === 'WhatsApp' && (
                                                <div className="method-loader">
                                                    <div className="spinner"></div>
                                                </div>
                                            )}
                                        </div>
                                        {sendCodeError && !codeSent && (
                                            <div className="error-message" style={{
                                                color: '#ef4444',
                                                fontSize: '0.85rem',
                                                marginTop: '1rem',
                                                textAlign: 'center',
                                                padding: '0.75rem',
                                                backgroundColor: '#fef2f2',
                                                borderRadius: '8px',
                                                border: '1px solid #fecaca'
                                            }}>
                                                {sendCodeError}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="verification-code-section">
                                        <div className="code-input-container">
                                            <VerificationCodeInputs
                                                digits={verificationDigits}
                                                setDigits={setVerificationDigits}
                                                verificationError={verificationError}
                                                isVerifying={isVerifying}
                                                onClearError={() => setVerificationError(null)}
                                            />
                                            {verificationError && (
                                                <div className="error-message" style={{
                                                    color: '#ef4444',
                                                    fontSize: '0.85rem',
                                                    marginTop: '1rem',
                                                    textAlign: 'center',
                                                    padding: '0.75rem',
                                                    backgroundColor: '#fef2f2',
                                                    borderRadius: '8px',
                                                    border: '1px solid #fecaca'
                                                }}>
                                                    {verificationError}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            className="btn btn-primary verify-button"
                                            style={{
                                                width: '100%',
                                                justifyContent: 'center',
                                                padding: '1rem',
                                                fontSize: '1rem',
                                                marginTop: '1.5rem',
                                                opacity: (verificationComplete && !isVerifying) ? 1 : 0.5,
                                                cursor: (verificationComplete && !isVerifying) ? 'pointer' : 'not-allowed',
                                                position: 'relative'
                                            }}
                                            disabled={!verificationComplete || isVerifying}
                                            onClick={handleVerifyCode}
                                        >
                                            {isVerifying ? (
                                                <>
                                                    <div className="spinner-small" style={{ marginRight: '0.5rem' }}></div>
                                                    Verifying...
                                                </>
                                            ) : (
                                                <>
                                                    Verify Account
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '0.5rem' }}>
                                                        <path d="M5 12l5 5 10-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </>
                                            )}
                                        </button>

                                        <div className="resend-section" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
                                                Didn't receive the code?
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                                <button
                                                    type="button"
                                                    onClick={handleResendCode}
                                                    className="resend-button"
                                                    disabled={isSendingCode}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--primary)',
                                                        cursor: isSendingCode ? 'not-allowed' : 'pointer',
                                                        textDecoration: 'underline',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        opacity: isSendingCode ? 0.5 : 1
                                                    }}
                                                >
                                                    {isSendingCode ? 'Sending...' : 'Resend Code'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCodeSent(false);
                                                        setVerificationDigits(EMPTY_VERIFY_DIGITS());
                                                        setVerificationError(null);
                                                        setSendCodeError(null);
                                                    }}
                                                    className="resend-button"
                                                    disabled={isSendingCode || isVerifying}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--text-light)',
                                                        cursor: (isSendingCode || isVerifying) ? 'not-allowed' : 'pointer',
                                                        textDecoration: 'underline',
                                                        fontSize: '0.9rem',
                                                        fontWeight: '500',
                                                        opacity: (isSendingCode || isVerifying) ? 0.5 : 1
                                                    }}
                                                >
                                                    Change Method
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="register-steps">
                                    <div className="reg-step active">
                                        <span className="reg-step-num">1</span>
                                    </div>
                                    <div className="reg-step-line"></div>
                                    <div className="reg-step">
                                        <span className="reg-step-num">2</span>
                                    </div>
                                    <div className="reg-step-line"></div>
                                    <div className="reg-step">
                                        <span className="reg-step-num">3</span>
                                    </div>
                                </div>

                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={handleFirstNameChange} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={handleLastNameChange} style={{ borderColor: errors.lastName ? 'red' : '' }} />
                                        {errors.lastName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.lastName}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>National ID / Passport No *</label>
                                    <input type="text" placeholder="NIC or Passport Number" value={nic} onChange={handleNicChange} maxLength={12} style={{ borderColor: errors.nic ? 'red' : '' }} />
                                    {errors.nic && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.nic}</span>}
                                </div>
                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Date of Birth *</label>
                                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ borderColor: errors.dob ? 'red' : '' }} disabled={!!parseNIC(nic)} />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ borderColor: errors.gender ? 'red' : '' }} disabled={!!parseNIC(nic)}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input type="tel" placeholder={SL_PHONE_PLACEHOLDER} value={phone} onChange={handlePhoneChange} style={{ borderColor: errors.phone ? 'red' : '' }} />
                                    {errors.phone && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp Number *</label>
                                    <input type="tel" placeholder={SL_PHONE_PLACEHOLDER} disabled={isWhatsAppSame} value={isWhatsAppSame ? phone : whatsapp} onChange={handleWhatsappChange} style={{ borderColor: errors.whatsapp ? 'red' : '' }} />
                                    {errors.whatsapp && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.whatsapp}</span>}
                                    <div className="checkbox-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        <input
                                            type="checkbox"
                                            id="sameAsPhone"
                                            checked={isWhatsAppSame}
                                            onChange={(e) => handleWhatsAppSameToggle(e.target.checked)}
                                        />
                                        <label htmlFor="sameAsPhone" style={{ fontSize: '0.9rem' }}>Same as Phone Number</label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: errors.email ? 'red' : '' }} />
                                    {errors.email && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</span>}
                                </div>
                                <RegisterPasswordFields
                                    idPrefix="reg-modal"
                                    password={password}
                                    confirmPassword={confirmPassword}
                                    onPasswordChange={setPassword}
                                    onConfirmChange={setConfirmPassword}
                                    errors={errors}
                                    pwdChecks={pwdChecks}
                                    showPassword={showRegisterPassword}
                                    onToggleShowPassword={() => setShowRegisterPassword((v) => !v)}
                                    showConfirmPassword={showRegisterConfirmPassword}
                                    onToggleShowConfirmPassword={() => setShowRegisterConfirmPassword((v) => !v)}
                                />
                                <div className="form-group">
                                    <label>I am registering as *</label>
                                    {registerAsMatchmaker ? (
                                        <div className="account-types">
                                            <div className="account-type selected" style={{ cursor: 'default', opacity: 1 }}>
                                                <span>👤</span>
                                                Matchmaker
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="account-types">
                                            {['Self', 'Father', 'Mother', 'Relation', 'Matchmaker'].map(type => (
                                                <div key={type} className={`account-type ${registerAccountType === type ? 'selected' : ''}`} onClick={() => setRegisterAccountType(type)}>
                                                    <span>👤</span>
                                                    {type}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="terms">I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></label>
                                </div>
                                {registerError && (
                                    <div style={{
                                        color: 'red',
                                        fontSize: '0.9rem',
                                        marginBottom: '1rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#ffe6e6',
                                        borderRadius: '4px'
                                    }}>
                                        {registerError}
                                    </div>
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        opacity: (termsAccepted && !isLoading) ? 1 : 0.5,
                                        cursor: (termsAccepted && !isLoading) ? 'pointer' : 'not-allowed'
                                    }}
                                    disabled={!termsAccepted || isLoading}
                                    onClick={handleRegister}
                                >
                                    {isLoading ? 'Registering...' : 'Create Free Account →'}
                                </button>
                                {registerError && (
                                    <div style={{
                                        color: 'red',
                                        fontSize: '0.9rem',
                                        marginTop: '1rem',
                                        padding: '0.5rem',
                                        backgroundColor: '#ffe6e6',
                                        borderRadius: '4px'
                                    }}>
                                        {registerError}
                                    </div>
                                )}
                                <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                    Already have an account? <a href="#" style={{ color: 'var(--primary)' }} onClick={(e) => { e.preventDefault(); onSwitch('login'); }}>Login</a>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Subscription Modal */}
            <div className={`modal-overlay subscription-modal ${activeModal === 'subscription' ? 'active' : ''}`} id="subscriptionModal" onClick={handleOverlayClick}>
                <div className="modal">
                    <button className="modal-close" onClick={close}>✕</button>
                    <div className="modal-header">
                        <h2>Choose Subscription Plan</h2>
                        <p>Both plans now include the same full feature set</p>
                    </div>
                    <div className="modal-body">
                        <div className="subscription-comparison">
                            <div className={`sub-option ${subscriptionOption === 'Free' ? 'selected' : ''}`} onClick={() => setSubscriptionOption('Free')}>
                                <h4>Free</h4>
                                <div className="price">LKR 0<span>/mo</span></div>
                                <p>10 profile views/day</p>
                            </div>
                            <div className={`sub-option ${subscriptionOption === 'Premium' ? 'selected recommended' : ''}`} onClick={() => setSubscriptionOption('Premium')}>
                                <h4>Premium</h4>
                                <div className="price">LKR {PREMIUM_SUBSCRIPTION_LKR.toLocaleString('en-LK')}<span>/mo</span></div>
                                <p>Unlimited access + chat</p>
                            </div>
                        </div>

                        <div className="features-unlocked">
                            <h4>{subscriptionOption === 'Free' ? '📋 Free Plan Includes' : '🔓 Premium Unlocks'}</h4>
                            <div className="unlock-grid">
                                {subscriptionOption === 'Free' ? (
                                    <>
                                        <div className="unlock-item"><span>✓</span> Create Profile</div>
                                        <div className="unlock-item"><span>✓</span> Add Photos</div>
                                        <div className="unlock-item"><span>✓</span> Search Profiles</div>
                                        <div className="unlock-item"><span>✓</span> Send Interest</div>
                                        <div className="unlock-item"><span>✓</span> View 10 Profiles / Day</div>
                                        <div className="unlock-item" style={{ opacity: 0.45 }}><span>✕</span> View Contact Info</div>
                                        <div className="unlock-item" style={{ opacity: 0.45 }}><span>✕</span> Direct Chat</div>
                                        <div className="unlock-item" style={{ opacity: 0.45 }}><span>✕</span> Unlimited Profile Views</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="unlock-item"><span>✓</span> Unlimited Profile Views</div>
                                        <div className="unlock-item"><span>✓</span> View Contact Info</div>
                                        <div className="unlock-item"><span>✓</span> Direct Chat</div>
                                        <div className="unlock-item"><span>✓</span> Create Profile</div>
                                        <div className="unlock-item"><span>✓</span> Add Photos</div>
                                        <div className="unlock-item"><span>✓</span> Search Profiles</div>
                                        <div className="unlock-item"><span>✓</span> Send Interest</div>
                                        <div className="unlock-item"><span>✓</span> Priority Support</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                                onClick={() => {
                                    onClose();
                                    if (subscriptionOption === 'Free') {
                                        router.push('/search');
                                        return;
                                    }
                                    router.push(`/subscription/checkout?plan=premium&amount=${PREMIUM_SUBSCRIPTION_LKR}`);
                                }}
                            >
                                {subscriptionOption === 'Free' ? 'Continue with Free Plan' : 'Continue to Payment'}
                            </button>
                            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                🔒 Secure payment • Cancel anytime
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Detail Modal */}
            <div className={`modal-overlay profile-detail-modal ${activeModal === 'profile' ? 'active' : ''}`} id="profileDetailModal" onClick={handleOverlayClick}>
                <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <button className="modal-close" onClick={close}>✕</button>

                    {selectedProfile ? (
                        <div className="profile-detail-content">
                            {/* Profile Header */}
                            <div className="profile-detail-header">
                                <div className="profile-detail-photo">
                                    <img
                                        src={selectedProfile.profilePhoto || (selectedProfile.gender === 'Female' ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400' : 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400')}
                                        alt={`${selectedProfile.firstName || 'User'}'s Profile`}
                                    />
                                    {selectedProfile.isVerified && <span className="verified-badge-large">✓ Verified</span>}
                                </div>
                                <div className="profile-detail-summary">
                                    <h2>{selectedProfile.firstName || ''} {selectedProfile.lastName || ''}</h2>
                                    <p className="profile-tagline">{selectedProfile.bio || 'Looking for a caring and understanding life partner'}</p>
                                    <div className="profile-key-info">
                                        <span>{selectedProfile.age ? `${selectedProfile.age} years` : 'Age Not Specified'}</span>
                                        <span>{selectedProfile.height || 'Height Not Specified'}</span>
                                        <span>{selectedProfile.cityOfResidence || 'Location Not Specified'}</span>
                                    </div>
                                    <div className="profile-actions-row">
                                        {user && (selectedProfile.userId ? String(user.id) === String(selectedProfile.userId) : false) ? (
                                            <div style={{ color: 'var(--primary)', fontWeight: 500, padding: '0.75rem', backgroundColor: '#fdf8f3', borderRadius: '8px', textAlign: 'center', width: '100%', border: '1px solid var(--primary-light)' }}>
                                                ✨ This is your profile
                                            </div>
                                        ) : (
                                            <>
                                                <button className="btn btn-primary" onClick={() => onSwitch('subscription')}><span>❤️</span> Express Interest</button>
                                                <button className="btn btn-outline" onClick={() => {
                                                    if (!user) {
                                                        onSwitch('login');
                                                    } else {
                                                        const canMessage = Boolean(selectedProfile?.canMessage ?? selectedProfile?.CanMessage);
                                                        if (!canMessage) {
                                                            setProfileAccessMessage('Messaging needs an active subscription.');
                                                            return;
                                                        }
                                                        onClose();
                                                        router.push(`/messages?userId=${selectedProfile.userId || selectedProfile.id}`);
                                                    }
                                                }}><span>💬</span> Message</button>
                                                <button className="btn btn-outline" onClick={() => onSwitch('login')}><span>⭐</span> Shortlist</button>
                                            </>
                                        )}
                                    </div>
                                    {profileAccessMessage && (
                                        <div style={{ marginTop: '0.75rem', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {profileAccessMessage}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isProfileLockedByDailyLimit && (
                                <>
                                    {/* Profile Tabs */}
                                    <div className="profile-detail-tabs">
                                        <button className={`profile-tab ${profileTab === 'about' ? 'active' : ''}`} onClick={() => setProfileTab('about')}>About</button>
                                        <button className={`profile-tab ${profileTab === 'family' ? 'active' : ''}`} onClick={() => setProfileTab('family')}>Family</button>
                                        <button className={`profile-tab ${profileTab === 'lifestyle' ? 'active' : ''}`} onClick={() => setProfileTab('lifestyle')}>Lifestyle</button>
                                        <button className={`profile-tab ${profileTab === 'partner' ? 'active' : ''}`} onClick={() => setProfileTab('partner')}>Partner Preferences</button>
                                    </div>

                                    {/* About Tab */}
                                    {profileTab === 'about' && (
                                        <div className="profile-tab-content active">
                                            <div className="profile-section">
                                                <h3>Basic Information</h3>
                                                <div className="info-grid">
                                                    <div className="info-item"><label>Full Name</label><span>{selectedProfile.firstName || ''} {selectedProfile.lastName || ''}</span></div>
                                                    <div className="info-item"><label>Age</label><span>{selectedProfile.age ? `${selectedProfile.age} years` : 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Date of Birth</label><span>{formatBirthdayDisplay(selectedProfile.dateOfBirth ?? selectedProfile.DateOfBirth) || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Gender</label><span>{selectedProfile.gender || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Height</label><span>{selectedProfile.height || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Complexion</label><span>{selectedProfile.complexion || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Marital Status</label><span>{selectedProfile.maritalStatus || 'Not Specified'}</span></div>
                                                </div>
                                            </div>
                                            <div className="profile-section">
                                                <h3>Religion & Ethnicity</h3>
                                                <div className="info-grid">
                                                    <div className="info-item"><label>Religion</label><span>{selectedProfile.religion || 'Not Specified'}</span></div>
                                                </div>
                                            </div>
                                            <div className="profile-section">
                                                <h3>Education & Profession</h3>
                                                <div className="info-grid">
                                                    <div className="info-item"><label>Education</label><span>{selectedProfile.educationLevel || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Profession</label><span>{selectedProfile.occupation || 'Not Specified'}</span></div>
                                                </div>
                                            </div>
                                            <div className="profile-section">
                                                <h3>Location</h3>
                                                <div className="info-grid">
                                                    <div className="info-item"><label>Country of Origin</label><span>{selectedProfile.countryOfOrigin || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Country of Residence</label><span><CountryResidenceDisplay value={selectedProfile.countryOfResidence} /></span></div>
                                                    <div className="info-item"><label>City of Residence</label><span>{selectedProfile.cityOfResidence || 'Not Specified'}</span></div>
                                                    <div className="info-item"><label>Residency Status</label><span>{selectedProfile.residencyStatus || 'Not Specified'}</span></div>
                                                </div>
                                            </div>
                                            <div className="profile-section">
                                                <h3>About Me</h3>
                                                <p className="about-text">{selectedProfile.aboutMe || 'This user has not provided an about me section yet.'}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Family Tab */}
                                    {profileTab === 'family' && (
                                <div className="profile-tab-content active">
                                    <div className="profile-section">
                                        <h3>Family Information</h3>
                                        <div className="info-grid">
                                            <div className="info-item"><label>Father&apos;s Name</label><span>{(selectedProfile.fatherName || selectedProfile.FatherName || '').trim() || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Mother&apos;s Name</label><span>{(selectedProfile.motherName || selectedProfile.MotherName || '').trim() || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Father's Occupation</label><span>{selectedProfile.fatherOccupation || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Mother's Occupation</label><span>{selectedProfile.motherOccupation || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Father's Religion</label><span>{selectedProfile.fatherReligion || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Mother's Religion</label><span>{selectedProfile.motherReligion || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Father&apos;s Country</label><span><CountryResidenceDisplay value={selectedProfile.fatherCountryOfResidence} /></span></div>
                                            <div className="info-item"><label>Mother&apos;s Country</label><span><CountryResidenceDisplay value={selectedProfile.motherCountryOfResidence} /></span></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                                    {/* Lifestyle Tab */}
                                    {profileTab === 'lifestyle' && (
                                <div className="profile-tab-content active">
                                    <div className="profile-section">
                                        <h3>Habits & Hobbies</h3>
                                        <div className="habits-grid">
                                            <div className="habit-item"><span className="habit-icon">🍽️</span><div className="habit-info"><label>Diet</label><span>{selectedProfile.diet || 'Not Specified'}</span></div></div>
                                            <div className="habit-item"><span className="habit-icon">🚬</span><div className="habit-info"><label>Smoking</label><span>{selectedProfile.smoking || 'Not Specified'}</span></div></div>
                                            <div className="habit-item"><span className="habit-icon">🍺</span><div className="habit-info"><label>Drinking</label><span>{selectedProfile.drinking || 'Not Specified'}</span></div></div>
                                        </div>
                                        <div style={{ marginTop: '1.5rem' }}>
                                            <h4>Hobbies</h4>
                                            <p className="about-text">{selectedProfile.hobbies || 'Not specified'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                                    {/* Partner Tab */}
                                    {profileTab === 'partner' && (
                                <div className="profile-tab-content active">
                                    <div className="profile-section">
                                        <h3>Basic Preferences</h3>
                                        <div className="info-grid">
                                            <div className="info-item"><label>Age Range</label><span>{selectedProfile.partnerMinAge && selectedProfile.partnerMaxAge ? `${selectedProfile.partnerMinAge} - ${selectedProfile.partnerMaxAge} years` : 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Religion</label><span>{selectedProfile.partnerReligion || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Education</label><span>{selectedProfile.partnerQualificationLevel || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Country</label><span>{selectedProfile.partnerCountryOfResidence || 'Not Specified'}</span></div>
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Additional Requirements</h3>
                                        <p className="about-text">{selectedProfile.partnerPreferences || 'This user has not specified their additional partner preferences yet.'}</p>
                                    </div>
                                </div>
                            )}

                                    {/* Contact Section - Subscription gated */}
                                    {selectedProfile?.canViewContact || selectedProfile?.CanViewContact ? (
                                <div className="contact-section">
                                    <div className="contact-info-hidden" style={{ filter: 'none' }}>
                                        <div className="contact-item">
                                            <span>📱</span>
                                            <div><label>Mobile</label><span>{selectedProfile.phoneNumber || selectedProfile.PhoneNumber || 'Not available'}</span></div>
                                        </div>
                                        <div className="contact-item">
                                            <span>💬</span>
                                            <div><label>WhatsApp</label><span>{selectedProfile.whatsApp || selectedProfile.WhatsApp || 'Not available'}</span></div>
                                        </div>
                                        <div className="contact-item">
                                            <span>📧</span>
                                            <div><label>Email</label><span>{selectedProfile.email || selectedProfile.Email || 'Not available'}</span></div>
                                        </div>
                                    </div>
                                </div>
                                    ) : (
                                <div className="contact-section blurred-section">
                                    <div className="contact-blur-overlay">
                                        <span>🔒</span>
                                        <h4>Upgrade to View Contact Details</h4>
                                        <p>Subscribe to unlock contact details and unlimited messaging.</p>
                                        <button className="btn btn-primary" onClick={() => onSwitch('subscription')}>Upgrade Now</button>
                                    </div>
                                    <div className="contact-info-hidden">
                                        <div className="contact-item">
                                            <span>📱</span>
                                            <div><label>Mobile</label><span>{selectedProfile.phoneNumber || selectedProfile.PhoneNumber || '+94 XX XXX XXXX'}</span></div>
                                        </div>
                                        <div className="contact-item">
                                            <span>📧</span>
                                            <div><label>Email</label><span>{selectedProfile.email || selectedProfile.Email || 'us***@gmail.com'}</span></div>
                                        </div>
                                        <div className="contact-item">
                                            <span>🔢</span>
                                            <div>
                                                <label>Daily profile views left</label>
                                                <span>{selectedProfile.remainingDailyProfileViews ?? selectedProfile.RemainingDailyProfileViews ?? 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem', display: 'block' }}></div>
                            <p>Loading profile details...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Blog Detail Modal */}
            <div className={`modal-overlay blog-modal ${activeModal === 'blog' ? 'active' : ''}`} id="blogModal" onClick={handleOverlayClick}>
                <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <button className="modal-close" onClick={close}>✕</button>
                    {selectedBlogId && (
                        <div className="blog-detail-content">
                            {selectedBlogId === 1 && (
                                <>
                                    <div className="blog-detail-header">
                                        <span className="blog-detail-category">Relationships</span>
                                        <h2>How to Discuss Important Topics Before Marriage</h2>
                                        <div className="blog-detail-meta">
                                            <span>Published on March 15, 2024</span>
                                            <span>•</span>
                                            <span>5 min read</span>
                                        </div>
                                    </div>
                                    <div className="blog-detail-image">
                                        <img
                                            src="/blog1.png"
                                            alt="How to Discuss Important Topics Before Marriage"
                                            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                        />
                                    </div>
                                    <div className="blog-detail-body">
                                        <p className="blog-intro">
                                            Before taking the big step into marriage, it's crucial to have open and honest conversations about important topics that will affect your life together. These discussions help build a strong foundation for your relationship and prevent misunderstandings later.
                                        </p>
                                        <h3>Financial Planning</h3>
                                        <p>
                                            Money matters are often a source of conflict in marriages. Discuss your financial goals, spending habits, debts, savings, and how you plan to manage finances together. Be transparent about your income, expenses, and financial expectations. Decide whether you'll have joint or separate accounts, and how you'll handle major financial decisions.
                                        </p>
                                        <h3>Family Expectations</h3>
                                        <p>
                                            Understanding each other's family values and expectations is essential. Discuss how often you'll visit family, your role in family events, and how you'll handle family conflicts. Talk about traditions you want to maintain and new ones you'd like to create together. Understanding cultural and religious expectations is particularly important in Sri Lankan marriages.
                                        </p>
                                        <h3>Career and Life Goals</h3>
                                        <p>
                                            Share your career aspirations and life goals. Discuss how you'll support each other's professional growth, whether you plan to relocate for work, and how you'll balance career and family life. Talk about your vision for the future, including where you want to live, lifestyle preferences, and long-term plans.
                                        </p>
                                        <h3>Children and Parenting</h3>
                                        <p>
                                            If you plan to have children, discuss your views on parenting, education, discipline, and how you'll share responsibilities. Talk about how many children you want, when you'd like to start a family, and your approach to raising them. Understanding each other's parenting philosophy early can prevent conflicts later.
                                        </p>
                                        <h3>Communication and Conflict Resolution</h3>
                                        <p>
                                            Establish how you'll communicate and resolve conflicts. Discuss your communication styles, what makes you feel heard, and how you prefer to handle disagreements. Agree on healthy ways to express concerns and work through problems together.
                                        </p>
                                        <p className="blog-conclusion">
                                            Remember, these conversations are ongoing. As you grow together, your perspectives may change, and it's important to keep the lines of communication open. Taking time to discuss these topics before marriage shows maturity and commitment to building a strong, lasting partnership.
                                        </p>
                                    </div>
                                </>
                            )}
                            {selectedBlogId === 2 && (
                                <>
                                    <div className="blog-detail-header">
                                        <span className="blog-detail-category">Wedding</span>
                                        <h2>Top 5 Buddhist Wedding Traditions in Sri Lanka</h2>
                                        <div className="blog-detail-meta">
                                            <span>Published on March 10, 2024</span>
                                            <span>•</span>
                                            <span>7 min read</span>
                                        </div>
                                    </div>
                                    <div className="blog-detail-image">
                                        <img
                                            src="/blog2.png"
                                            alt="Top 5 Buddhist Wedding Traditions in Sri Lanka"
                                            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                        />
                                    </div>
                                    <div className="blog-detail-body">
                                        <p className="blog-intro">
                                            Buddhist weddings in Sri Lanka are rich with tradition and cultural significance. These ceremonies blend religious rituals with local customs, creating a beautiful and meaningful celebration of marriage.
                                        </p>
                                        <h3>1. Poruwa Ceremony</h3>
                                        <p>
                                            The Poruwa ceremony is the centerpiece of a Sinhalese Buddhist wedding. The couple stands on a beautifully decorated wooden platform called the Poruwa, which symbolizes their union. The ceremony includes rituals like exchanging betel leaves, tying the little fingers together, and pouring water from a conch shell, all performed by an elder or a Buddhist monk.
                                        </p>
                                        <h3>2. Nekath (Auspicious Time)</h3>
                                        <p>
                                            The wedding date and time are carefully chosen based on astrological calculations (Nekath). This ensures the marriage begins at an auspicious moment, believed to bring good fortune and harmony to the couple's life together.
                                        </p>
                                        <h3>3. Jayamangala Gatha</h3>
                                        <p>
                                            The Jayamangala Gatha, or verses of joy, are chanted during the ceremony. These eight verses from Buddhist scriptures are believed to bring blessings and protection to the newlyweds. The chanting creates a sacred atmosphere and invokes blessings for a happy and prosperous marriage.
                                        </p>
                                        <h3>4. Exchange of Rings</h3>
                                        <p>
                                            While the Poruwa ceremony is the traditional marriage ritual, many modern couples also exchange rings. This is often done after the Poruwa ceremony, symbolizing their commitment to each other in a way that combines traditional and contemporary practices.
                                        </p>
                                        <h3>5. Blessing by Elders</h3>
                                        <p>
                                            After the ceremony, the couple receives blessings from parents and elders. They offer betel leaves to the elders as a sign of respect, and in return, receive blessings and well-wishes for their married life. This tradition emphasizes the importance of family and respect for elders in Sri Lankan culture.
                                        </p>
                                        <p className="blog-conclusion">
                                            These traditions connect couples to their cultural heritage while celebrating their union. Whether you follow all traditions or adapt them to your preferences, understanding their significance adds depth and meaning to your special day.
                                        </p>
                                    </div>
                                </>
                            )}
                            {selectedBlogId === 3 && (
                                <>
                                    <div className="blog-detail-header">
                                        <span className="blog-detail-category">Safety</span>
                                        <h2>Online Matrimony Safety Tips</h2>
                                        <div className="blog-detail-meta">
                                            <span>Published on March 5, 2024</span>
                                            <span>•</span>
                                            <span>6 min read</span>
                                        </div>
                                    </div>
                                    <div className="blog-detail-image">
                                        <img
                                            src="https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200"
                                            alt="Online Matrimony Safety Tips"
                                            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                        />
                                    </div>
                                    <div className="blog-detail-body">
                                        <p className="blog-intro">
                                            While online matrimonial platforms offer convenience and a wide pool of potential matches, it's essential to prioritize your safety. Here are important tips to protect yourself while searching for your life partner online.
                                        </p>
                                        <h3>Verify Profile Authenticity</h3>
                                        <p>
                                            Always look for verified profiles. Reputable matrimonial sites verify user identities through documents like NIC, passport, or other official IDs. Verified profiles have a higher level of trust and authenticity. Be cautious of profiles that seem too good to be true or have incomplete information.
                                        </p>
                                        <h3>Protect Personal Information</h3>
                                        <p>
                                            Never share sensitive personal information like your home address, financial details, or passwords in initial conversations. Share information gradually as you build trust. Use the platform's messaging system initially rather than sharing personal contact details immediately.
                                        </p>
                                        <h3>Video Calls Before Meeting</h3>
                                        <p>
                                            Before arranging an in-person meeting, have video calls to verify the person matches their profile photos and to get a better sense of their personality. This helps ensure you're talking to the person in the profile and allows you to assess compatibility in a safe environment.
                                        </p>
                                        <h3>Meet in Public Places</h3>
                                        <p>
                                            When you're ready to meet in person, always choose a public place for the first few meetings. Inform a family member or friend about your meeting plans, including the location and time. Consider bringing a trusted friend or family member along, especially for the first meeting.
                                        </p>
                                        <h3>Trust Your Instincts</h3>
                                        <p>
                                            If something feels off or makes you uncomfortable, trust your instincts. Be wary of people who pressure you for quick decisions, ask for money, or avoid answering direct questions. A genuine person will respect your pace and boundaries.
                                        </p>
                                        <h3>Report Suspicious Behavior</h3>
                                        <p>
                                            If you encounter suspicious profiles or behavior, report them to the platform immediately. This helps protect other users and maintains the safety of the community. Most platforms have reporting mechanisms for fake profiles, harassment, or inappropriate behavior.
                                        </p>
                                        <p className="blog-conclusion">
                                            Remember, your safety is paramount. Take your time, verify information, and proceed at a pace that feels comfortable. A genuine connection will develop naturally when both parties are honest and respectful.
                                        </p>
                                    </div>
                                </>
                            )}
                            {selectedBlogId === 4 && (
                                <>
                                    <div className="blog-detail-header">
                                        <span className="blog-detail-category">Dating</span>
                                        <h2>First Meeting Tips for Arranged Marriages</h2>
                                        <div className="blog-detail-meta">
                                            <span>Published on March 1, 2024</span>
                                            <span>•</span>
                                            <span>5 min read</span>
                                        </div>
                                    </div>
                                    <div className="blog-detail-image">
                                        <img
                                            src="/blog4.png"
                                            alt="First Meeting Tips for Arranged Marriages"
                                            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
                                        />
                                    </div>
                                    <div className="blog-detail-body">
                                        <p className="blog-intro">
                                            The first meeting in an arranged marriage setting can be both exciting and nerve-wracking. Here are practical tips to help you make a great first impression and have meaningful conversations that help you understand if there's a potential match.
                                        </p>
                                        <h3>Be Yourself</h3>
                                        <p>
                                            Authenticity is key. While it's natural to want to make a good impression, being genuine helps both of you make an informed decision. Present yourself honestly, including your interests, values, and lifestyle. Remember, you're looking for someone who accepts you for who you are.
                                        </p>
                                        <h3>Dress Appropriately</h3>
                                        <p>
                                            Choose attire that is comfortable, clean, and appropriate for the setting. Whether it's a formal meeting with families or a casual coffee, dress in a way that reflects your personality while showing respect for the occasion. Avoid overly casual or revealing clothing.
                                        </p>
                                        <h3>Prepare Thoughtful Questions</h3>
                                        <p>
                                            Come prepared with questions that help you understand the person's values, goals, and lifestyle. Ask about their career aspirations, family values, hobbies, and what they're looking for in a life partner. Avoid overly personal or sensitive topics in the first meeting.
                                        </p>
                                        <h3>Listen Actively</h3>
                                        <p>
                                            Good communication involves both speaking and listening. Pay attention to what the other person says, and show genuine interest in their responses. This helps you understand their personality, values, and whether your goals align. Ask follow-up questions to show you're engaged.
                                        </p>
                                        <h3>Be Respectful and Polite</h3>
                                        <p>
                                            Show respect to the person you're meeting and any family members present. Use polite language, maintain eye contact, and be courteous. Even if you don't feel a connection, treat the meeting with respect and kindness.
                                        </p>
                                        <h3>Discuss Important Topics</h3>
                                        <p>
                                            While keeping the conversation light, try to touch on important topics like career goals, family expectations, lifestyle preferences, and values. This helps you assess compatibility early on. However, avoid making it feel like an interview - keep the conversation natural and flowing.
                                        </p>
                                        <h3>Take Your Time</h3>
                                        <p>
                                            Don't feel pressured to make an immediate decision. It's perfectly fine to take time to reflect after the meeting. Discuss your thoughts with family members or trusted friends. A decision as important as marriage deserves careful consideration.
                                        </p>
                                        <p className="blog-conclusion">
                                            Remember, the first meeting is just the beginning. Whether it leads to further meetings or not, approach it with an open mind and positive attitude. Every meeting is a learning experience that brings you closer to finding the right life partner.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
