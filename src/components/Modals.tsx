'use client';

import { useState, useEffect, useRef, MouseEvent, useMemo, type ChangeEvent, type ReactNode, type CSSProperties, type Dispatch, type SetStateAction } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { matrimonialService, mapUserFieldsFromSignInResult, type RecoveryAccount, type ForgotPasswordInitiateRequest, type MatrimonialLoginResponse } from '../services/matrimonialService';
import { sanitizeNicInput, parseNicToDobAndGender } from '../utils/nicInput';
import { sanitizeNameInput, nameLettersOnlyError } from '../utils/nameInput';
import {
    sanitizeSriLankanPhoneInput,
    isValidSriLankanPhone,
    sriLankanPhoneFormatErrorIfInvalid,
    phonesAreSameSriLankanNumber,
    SL_PHONE_PLACEHOLDER,
    SL_PHONE_HINT,
    WHATSAPP_REQUIRED_MSG,
    WHATSAPP_SAME_AS_PHONE_MSG,
} from '../utils/sriLankanPhone';
import {
    type PublicMatrimonialPackage,
    canUserCheckoutSubscriptionPackage,
    isFreePackage,
    isUserCurrentPackage,
    normalizePublicPackages,
    packageId,
    packageName,
    packagePrice,
    publicPackagesAudienceParam,
    resolveCheckoutPlan,
    resolveUserCurrentPackage,
    userHasActivePremiumPlan,
} from '../utils/matrimonialPackages';
import SubscriptionPlanPicker from './SubscriptionPlanPicker';
import { AUTH_FIELD_MAX_LENGTH, PASSWORD_MAX_LENGTH } from '../constants/inputLimits';
import Link from 'next/link';
import WelcomePopup from './WelcomePopup';
import { HeartIcon, BookmarkIcon } from './icons/InteractionIcons';
import ProfileManagedBadge, { profileHasManagedBadge } from './ProfileManagedBadge';
import PremiumBadge from './PremiumBadge';
import { premiumBadgeLabelForProfile } from '../constants/subscription';
import { getDefaultAvatarDataUri } from '../utils/defaultAvatar';
import { setStoredToken, getStoredToken } from '../utils/authStorage';
import { PasswordVisibilityToggle, modalPasswordToggleStyle } from './PasswordVisibilityToggle';
import { showToast } from '../utils/toast';
import { REGISTER_MATRIMONIAL_ACCOUNT_TYPES } from '../utils/matrimonialAccountTypes';
import { useOwnedSubAccountsForBrowse } from '../hooks/useOwnedSubAccountsForBrowse';
import ManagedSubAccountActionPicker from './ManagedSubAccountActionPicker';
import {
    managedProfileUserIdForApi,
    useManagedSubAccountActionPicker,
} from '../hooks/useManagedSubAccountActionPicker';
import { canManageSubAccounts } from '../utils/managedSubAccounts';
import {
    matrimonialProfileUserId,
    isOwnMatrimonialProfile,
    profileVisitorActionsBlockedHint,
} from '../utils/profileVisitorActions';

/** @deprecated use matrimonialProfileUserId */
function viewerProfileUserId(p: Record<string, unknown> | null | undefined): number | null {
    return matrimonialProfileUserId(p);
}

/** Eating / drinking / smoking preference from API; blank or placeholder "-" → em dash */
function partnerPreferenceHabitDisplay(v: unknown): string {
    const s = v != null ? String(v).trim() : '';
    return s && s !== '-' ? s : '—';
}

function parentUserIdFromLoginResult(r: MatrimonialLoginResponse['result'] | undefined): number | undefined {
    if (!r) return undefined;
    const raw = r.parentUserId ?? r.ParentUserId;
    if (raw == null) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Parse "try again in N minute(s)" from API lockout messages (matrimonial sign-in / 2FA). */
function parseLockoutMinutesFromMessage(msg: string): number | null {
    const m = msg.match(/try\s+again\s+in\s+(\d+)\s+minute/i);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

/** MM:SS (e.g. 01:00 → 00:00) for lockout + verify-code resend cooldowns. */
function formatSecondsMmSs(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** Map User/SignIn API error text to field-level or general login messages. */
function applySignInMessageToLoginErrors(
    raw: string,
    setLoginEmailError: (v: string | null) => void,
    setLoginPasswordError: (v: string | null) => void,
    setLoginError: (v: string | null) => void,
    setLoginLockoutUntilMs: (v: number | null) => void,
) {
    const msg = raw.trim();
    const lower = msg.toLowerCase();
    setLoginEmailError(null);
    setLoginPasswordError(null);
    setLoginLockoutUntilMs(null);

    if (!msg) {
        setLoginError('Sign-in failed. Please try again.');
        return;
    }

    if (/\battempt(s)?\s+remaining\b/i.test(lower)) {
        setLoginError(msg);
        return;
    }

    if (/too\s+many\s+incorrect\s+password/i.test(lower)) {
        const mins = parseLockoutMinutesFromMessage(msg);
        if (mins != null) {
            setLoginLockoutUntilMs(Date.now() + mins * 60 * 1000);
        }
        setLoginError(msg);
        return;
    }

    if (/invalid\s*email\s*or\s*password|incorrect\s*email\s*or\s*password/i.test(lower)) {
        setLoginError('Email or password is incorrect. Please try again.');
        return;
    }

    if (
        /password\s*not\s*matched|password\s*not\s*match|incorrect\s*password|wrong\s*password|invalid\s*credentials|invalid\s*password/i.test(
            msg,
        )
    ) {
        setLoginPasswordError('Incorrect password. Try again or use Forgot password.');
        return;
    }

    if (
        /user\s*null|^user null$|no\s*account|account\s*not\s*found|user\s*not\s*found|unknown\s*user|email\s*not\s*found/i.test(
            lower,
        )
    ) {
        setLoginEmailError('No account found with this email address.');
        return;
    }

    if (/email\s*not\s*confirmed|not\s*confirmed|confirm\s*your\s*email|verify\s*(your\s*)?email/i.test(msg)) {
        setLoginError('Please verify your email before signing in.');
        return;
    }

    if (/inactive|disabled|suspended|not\s*active/i.test(lower)) {
        setLoginError('This account is not active. Please contact support if you need help.');
        return;
    }

    if (/company\s*not\s*found/i.test(lower)) {
        setLoginError('Your account cannot sign in from this app. Please contact support.');
        return;
    }

    if (/too\s*many|try\s*again\s*in|lockout|locked|failed\s*verification\s*attempts/i.test(lower)) {
        const mins = parseLockoutMinutesFromMessage(msg);
        if (mins != null) {
            setLoginLockoutUntilMs(Date.now() + mins * 60 * 1000);
        }
        setLoginError(msg);
        return;
    }

    if (/two-factor|2fa|authentication\s*required|verification\s*code/i.test(lower)) {
        setLoginError(
            msg.length > 400 ? 'Additional verification is required. Please try again or contact support.' : msg,
        );
        return;
    }

    if (/invalid\s*column|syntax\s*error|internal\s*server|database|500\b|\bsql\b/i.test(lower)) {
        setLoginError('A server error occurred. Please try again later or contact support.');
        return;
    }

    setLoginError(msg.length > 280 ? 'Sign-in failed. Please try again.' : msg);
}

/** Forgot-password verify step (code sent) — survives modal close / refresh within TTL. */
const MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY = 'cbass_matrimonial_forgot_verify_v1';
const MATRIMONIAL_FORGOT_VERIFY_TTL_MS = 15 * 60 * 1000;
/** Minimum wait before sending or resending verification codes (registration verify + forgot password). */
const VERIFY_CODE_RESEND_COOLDOWN_MS = 60_000;

type PersistedForgotVerifyV1 = {
    v: 1;
    userId: number;
    sentVia: string;
    successMessage: string;
    savedAt: number;
    selectedAccount: RecoveryAccount | null;
    initiatePayload?: ForgotPasswordInitiateRequest;
    resendUnlockAtMs?: number;
};

function clearForgotVerifyPersisted(): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.removeItem(MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

function readForgotVerifyPersisted(): PersistedForgotVerifyV1 | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedForgotVerifyV1;
        if (
            parsed.v !== 1 ||
            typeof parsed.userId !== 'number' ||
            typeof parsed.sentVia !== 'string' ||
            typeof parsed.successMessage !== 'string' ||
            typeof parsed.savedAt !== 'number'
        ) {
            sessionStorage.removeItem(MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY);
            return null;
        }
        if (Date.now() - parsed.savedAt > MATRIMONIAL_FORGOT_VERIFY_TTL_MS) {
            sessionStorage.removeItem(MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function writeForgotVerifyPersisted(snapshot: {
    userId: number;
    sentVia: string;
    successMessage: string;
    selectedAccount: RecoveryAccount | null;
    initiatePayload?: ForgotPasswordInitiateRequest | null;
    resendUnlockAtMs?: number | null;
}): void {
    if (typeof window === 'undefined') return;
    try {
        const payload: PersistedForgotVerifyV1 = {
            v: 1,
            userId: snapshot.userId,
            sentVia: snapshot.sentVia,
            successMessage: snapshot.successMessage,
            savedAt: Date.now(),
            selectedAccount: snapshot.selectedAccount,
        };
        if (snapshot.initiatePayload != null) {
            payload.initiatePayload = snapshot.initiatePayload;
        }
        if (snapshot.resendUnlockAtMs != null) {
            payload.resendUnlockAtMs = snapshot.resendUnlockAtMs;
        }
        sessionStorage.setItem(MATRIMONIAL_FORGOT_VERIFY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
        /* quota / private mode */
    }
}

interface ModalsProps {
    activeModal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | 'verify' | null;
    onClose: () => void;
    onSwitch: (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog') => void;
    selectedBlogId?: number | null;
    registerAsMatchmaker?: boolean;
    selectedProfile?: any | null;
}

/** Client-side email checks for forgot-password (clear messages before calling the API). */
function getForgotPasswordEmailValidationError(raw: string): string | null {
    const t = raw.trim();
    if (!t) return null;
    if (!t.includes('@')) {
        return 'Email must include @ (example: you@gmail.com).';
    }
    if ((t.match(/@/g) || []).length !== 1) {
        return 'Use exactly one @ in your email address.';
    }
    const [local, domain] = t.split('@');
    if (!local?.length) {
        return 'Enter the part before @ (your name or mailbox).';
    }
    if (!domain?.length) {
        return 'Enter the part after @ (for example gmail.com).';
    }
    if (!domain.includes('.')) {
        return 'The domain after @ must include a dot (example: gmail.com).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(t)) {
        return 'That email doesn’t look valid. Check for typos or extra spaces.';
    }
    return null;
}

/** Display label for forgot-password delivery (API may return Email, email, whatsapp, …). */
function formatForgotDeliveryChannel(label: string | undefined | null): string {
    if (label == null || String(label).trim() === '') return 'your selected method';
    const s = String(label).trim().toLowerCase();
    if (s === 'email') return 'Email';
    if (s === 'whatsapp') return 'WhatsApp';
    if (s === 'phone') return 'Phone';
    return String(label).trim();
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
    if (password.length > PASSWORD_MAX_LENGTH) return false;
    const c = checkPasswordPolicy(password);
    return c.minLength && c.hasUpper && c.hasLower && c.hasDigit && c.hasSpecial;
}

type PwdChecks = ReturnType<typeof checkPasswordPolicy>;

function getPasswordStrength(password: string, checks: PwdChecks): { level: number; label: string; color: string } {
    if (!password) return { level: 0, label: '', color: '#e5e7eb' };
    const passed = [checks.minLength, checks.hasUpper, checks.hasLower, checks.hasDigit, checks.hasSpecial].filter(Boolean).length;
    if (passed <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (passed === 2) return { level: 2, label: 'Fair', color: '#ffa20d' };
    if (passed <= 4) return { level: 3, label: 'Good', color: '#eab308' };
    return { level: 4, label: 'Strong', color: '#22c55e' };
}

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
                        maxLength={PASSWORD_MAX_LENGTH}
                        style={{ borderColor: errors.password ? 'red' : '', width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                        autoComplete="new-password"
                    />
                    <PasswordVisibilityToggle
                        passwordVisible={showPassword}
                        onToggle={onToggleShowPassword}
                        tabIndex={-1}
                        style={modalPasswordToggleStyle}
                    />
                </div>
                {(() => {
                    const strength = getPasswordStrength(password, pwdChecks);
                    if (!password) return null;
                    return (
                        <div style={{ marginTop: '0.45rem', marginBottom: '0.1rem' }}>
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }} role="meter" aria-label={`Password strength: ${strength.label}`} aria-valuenow={strength.level} aria-valuemin={0} aria-valuemax={4}>
                                {[1, 2, 3, 4].map((bar) => (
                                    <div
                                        key={bar}
                                        style={{
                                            flex: 1,
                                            height: '5px',
                                            borderRadius: '3px',
                                            backgroundColor: bar <= strength.level ? strength.color : '#e5e7eb',
                                            transition: 'background-color 0.25s ease',
                                        }}
                                    />
                                ))}
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: strength.color, letterSpacing: '0.02em' }}>
                                {strength.label}
                            </span>
                        </div>
                    );
                })()}
                <ul style={{ listStyle: 'none', padding: '0.5rem 0 0', margin: 0, borderTop: '1px solid #eee', marginTop: '0.35rem' }}>
                    {ruleRow(pwdChecks.minLength, 'At least 6 characters')}
                    {ruleRow(password.length <= PASSWORD_MAX_LENGTH, `No more than ${PASSWORD_MAX_LENGTH} characters`)}
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
                        maxLength={PASSWORD_MAX_LENGTH}
                        style={{ borderColor: errors.confirmPassword ? 'red' : '', width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                        autoComplete="new-password"
                    />
                    <PasswordVisibilityToggle
                        passwordVisible={showConfirmPassword}
                        onToggle={onToggleShowConfirmPassword}
                        tabIndex={-1}
                        ariaLabelWhenHidden="Show confirm password"
                        ariaLabelWhenVisible="Hide confirm password"
                        style={modalPasswordToggleStyle}
                    />
                </div>
                {errors.confirmPassword && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.confirmPassword}</span>}
            </div>
        </>
    );
}

const PENDING_REG_CONTINUE_PHRASE = 'Complete verification';

function RegisterErrorBox({
    message,
    onContinuePending,
    continueLoading,
}: {
    message: string;
    onContinuePending: () => void;
    continueLoading: boolean;
}) {
    const boxStyle: CSSProperties = {
        color: '#b91c1c',
        fontSize: '0.9rem',
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#ffe6e6',
        borderRadius: '4px',
    };
    const lower = message.toLowerCase();
    if (!lower.includes('already in progress') || !message.includes(PENDING_REG_CONTINUE_PHRASE)) {
        return <div style={boxStyle}>{message}</div>;
    }
    const idx = message.indexOf(PENDING_REG_CONTINUE_PHRASE);
    const before = message.slice(0, idx);
    const after = message.slice(idx + PENDING_REG_CONTINUE_PHRASE.length);
    return (
        <div style={boxStyle}>
            {before}
            <button
                type="button"
                onClick={onContinuePending}
                disabled={continueLoading}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    color: '#b45309',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: continueLoading ? 'wait' : 'pointer',
                    font: 'inherit',
                }}
            >
                {PENDING_REG_CONTINUE_PHRASE}
            </button>
            {after}
        </div>
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
    const { login, user, updateUser } = useAuth();
    const { subAccounts, ownedIds } = useOwnedSubAccountsForBrowse();
    const managedActionPicker = useManagedSubAccountActionPicker(user?.accountType, subAccounts);
    const router = useRouter();
    const pathname = usePathname();
    const [loginTab, setLoginTab] = useState<'login' | 'register'>('login');
    const [profileTab, setProfileTab] = useState('about');
    const [galleryLightboxSrc, setGalleryLightboxSrc] = useState<string | null>(null);
    const [registerAccountType, setRegisterAccountType] = useState('Self');
    const [subscriptionPackages, setSubscriptionPackages] = useState<PublicMatrimonialPackage[]>([]);
    const [subscriptionPackagesLoading, setSubscriptionPackagesLoading] = useState(false);
    const [selectedSubscriptionPackageId, setSelectedSubscriptionPackageId] = useState<number | null>(null);
    const [showFreePlanConfirmModal, setShowFreePlanConfirmModal] = useState(false);
    const [isSwitchingToFreePlan, setIsSwitchingToFreePlan] = useState(false);

    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    useEffect(() => {
        if (activeModal !== 'subscription') return;

        let cancelled = false;
        setSubscriptionPackagesLoading(true);
        const audience = publicPackagesAudienceParam(user?.accountType);

        matrimonialService
            .getPublicPackages(audience)
            .then((res) => {
                if (cancelled) return;
                const list = normalizePublicPackages(res?.result ?? res?.Result);
                setSubscriptionPackages(list);
                const currentPlan = resolveUserCurrentPackage(list, user);
                const defaultPick = userHasActivePremiumPlan(user)
                    ? list.find((p) => isFreePackage(p)) ?? currentPlan ?? list[0]
                    : currentPlan ??
                      list.find((p) => !isFreePackage(p) && (p.isPopular ?? p.IsPopular)) ??
                      list.find((p) => !isFreePackage(p)) ??
                      list[0];
                setSelectedSubscriptionPackageId(defaultPick ? packageId(defaultPick) : null);
            })
            .catch(() => {
                if (!cancelled) {
                    setSubscriptionPackages([]);
                    setSelectedSubscriptionPackageId(null);
                }
            })
            .finally(() => {
                if (!cancelled) setSubscriptionPackagesLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [activeModal, user?.accountType, user?.isSubscribed, user?.matchmakerTier]);

    const selectedSubscriptionPackage = useMemo(
        () =>
            subscriptionPackages.find((p) => packageId(p) === selectedSubscriptionPackageId) ??
            subscriptionPackages[0] ??
            null,
        [subscriptionPackages, selectedSubscriptionPackageId]
    );

    const selectedCanCheckout = useMemo(
        () =>
            selectedSubscriptionPackage
                ? canUserCheckoutSubscriptionPackage(selectedSubscriptionPackage, subscriptionPackages, user)
                : false,
        [selectedSubscriptionPackage, subscriptionPackages, user]
    );

    const selectedIsCurrentPlan = useMemo(
        () =>
            selectedSubscriptionPackage
                ? isUserCurrentPackage(selectedSubscriptionPackage, subscriptionPackages, user)
                : false,
        [selectedSubscriptionPackage, subscriptionPackages, user]
    );

    const switchManagerAccountToFreePlan = async (): Promise<boolean> => {
        if (!user?.id || !user.isSubscribed) {
            return true;
        }
        try {
            const res = await matrimonialService.cancelSubscription(Number(user.id));
            if (res?.statusCode !== 200 && res?.statusCode !== 1) {
                showToast(res?.message || 'Could not switch to the free plan.', 'error');
                return false;
            }
            const r = (res?.result ?? {}) as Record<string, unknown>;
            updateUser?.({
                isSubscribed: false,
                subscriptionCancelled: false,
                subscriptionExpiresAt: undefined,
                subscriptionIsLifetime: false,
                ...(canManageSubAccounts(user.accountType)
                    ? { matchmakerTier: undefined, matchmakerCanAddClients: false }
                    : {}),
            });
            showToast(
                res?.message ||
                    (canManageSubAccounts(user.accountType)
                        ? 'You are on the free plan. Premium features and managed profiles are disabled until you pay again.'
                        : 'You are on the free plan. Premium features are disabled until you pay again.'),
                'success'
            );
            if (canManageSubAccounts(user.accountType)) {
                window.dispatchEvent(new CustomEvent('sub-accounts-changed'));
            }
            return true;
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : 'Could not switch to the free plan.', 'error');
            return false;
        }
    };

    const PREMIUM_PLAN_LOCK_NOTICE =
        'You are on a premium plan. To change packages, switch to the free plan first. Paid plan changes are not available while your subscription is active.';

    const freePlanSwitchNeedsWarning = userHasActivePremiumPlan(user);

    const freePlanWarningMessage = useMemo(() => {
        const manager = canManageSubAccounts(user?.accountType);
        return manager
            ? 'Continuing on the free plan will disable all premium features immediately. Your managed profiles will be disabled. You will need to pay again to re-enable premium and restore them.'
            : 'Continuing on the free plan will disable all premium features immediately. You will need to pay again to re-enable premium.';
    }, [user?.accountType]);

    const completeFreePlanSwitch = async (): Promise<boolean> => {
        const ok = await switchManagerAccountToFreePlan();
        if (!ok) return false;
        setShowFreePlanConfirmModal(false);
        onClose();
        router.push('/search');
        return true;
    };

    const requestFreePlanSwitch = () => {
        if (freePlanSwitchNeedsWarning) {
            setShowFreePlanConfirmModal(true);
            return;
        }
        void completeFreePlanSwitch();
    };

    const handleConfirmFreePlanSwitch = async () => {
        try {
            setIsSwitchingToFreePlan(true);
            await completeFreePlanSwitch();
        } finally {
            setIsSwitchingToFreePlan(false);
        }
    };

    const [profileAccessMessage, setProfileAccessMessage] = useState<string | null>(null);
    const [isProfileLockedByDailyLimit, setIsProfileLockedByDailyLimit] = useState(false);
    const [interactionFavoriteIds, setInteractionFavoriteIds] = useState<number[]>([]);
    const [interactionShortlistIds, setInteractionShortlistIds] = useState<number[]>([]);
    const [expressInterestLoading, setExpressInterestLoading] = useState(false);
    const [shortlistLoading, setShortlistLoading] = useState(false);

    useEffect(() => {
        if (initialSelectedProfile) {
            setSelectedProfile(initialSelectedProfile);
            setProfileAccessMessage(null);
            setIsProfileLockedByDailyLimit(false);
            if (activeModal === 'profile' && initialSelectedProfile.userId) {
                const fetchDetailedProfile = async () => {
                    setIsLoadingProfile(true);
                    try {
                        const viewAsOthers = Boolean(initialSelectedProfile.viewAsOthers);
                        const isOwnProfile =
                            isOwnMatrimonialProfile(user, initialSelectedProfile);
                        // Owner preview: omit requester so the API applies visitor masking (no daily-view charge).
                        const requesterForFetch =
                            viewAsOthers && isOwnProfile
                                ? undefined
                                : user?.id
                                  ? Number(user.id)
                                  : undefined;
                        const applyViewLimit = !(viewAsOthers && isOwnProfile);

                        const res = await matrimonialService.getProfile(
                            initialSelectedProfile.userId,
                            requesterForFetch,
                            applyViewLimit
                        );
                        if (res.statusCode === 200 && res.result) {
                            setIsProfileLockedByDailyLimit(false);
                            setSelectedProfile((prev: any) => ({
                                ...prev,
                                ...res.result,
                                userId:
                                    prev?.userId ??
                                    res.result.userId ??
                                    res.result.UserId ??
                                    viewerProfileUserId(res.result),
                                viewAsOthers: prev?.viewAsOthers,
                                disableVisitorActions: prev?.disableVisitorActions,
                                firstName: prev?.firstName || res.result.firstName,
                                lastName: prev?.lastName || res.result.lastName,
                                profilePhoto: prev?.profilePhoto || res.result.profilePhoto,
                                dateOfBirth: res.result.dateOfBirth ?? res.result.DateOfBirth ?? prev?.dateOfBirth,
                                educationLevel: res.result.qualificationLevel || prev?.educationLevel,
                                aboutMe: res.result.remarks || res.result.Remarks || prev?.aboutMe,
                                bio: res.result.remarks || res.result.Remarks || prev?.bio,
                                diet: res.result.eatingHabits || prev?.diet,
                                smoking: res.result.smokingHabits || prev?.smoking,
                                drinking: res.result.drinkingHabits || prev?.drinking,
                                partnerPreferences: res.result.partnerAdditionalRequirements || prev?.partnerPreferences,
                            }));
                        } else if (res?.message) {
                            setProfileAccessMessage(res.message);
                            if (String(res.message).toLowerCase().includes('daily profile view limit')) {
                                setIsProfileLockedByDailyLimit(true);
                                showToast('Subscribe to keep viewing full profiles today.', 'info');
                            }
                        }
                    } catch (error) {
                        console.error("Failed to load detailed profile", error);
                        if (error instanceof Error && error.message) {
                            setProfileAccessMessage(error.message);
                            if (error.message.toLowerCase().includes('daily profile view limit')) {
                                setIsProfileLockedByDailyLimit(true);
                                showToast('Subscribe to keep viewing full profiles today.', 'info');
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
            setGalleryLightboxSrc(null);
        }
    }, [activeModal, initialSelectedProfile, user?.id]);

    useEffect(() => {
        if (activeModal !== 'profile') {
            setInteractionFavoriteIds([]);
            setInteractionShortlistIds([]);
            return;
        }
        const targetId = viewerProfileUserId(selectedProfile);
        if (!user?.id || !targetId || ownedIds.has(targetId)) {
            setInteractionFavoriteIds([]);
            setInteractionShortlistIds([]);
            return;
        }
        let cancelled = false;
        matrimonialService
            .getUserInteractions(Number(user.id))
            .then((res) => {
                if (cancelled) return;
                const fav = res?.result?.Favorites ?? res?.result?.favorites ?? [];
                const favoriteIds = (Array.isArray(fav) ? fav : [])
                    .map((x: unknown) => (typeof x === 'number' ? x : Number((x as any)?.favoriteProfileId ?? (x as any)?.profileId ?? (x as any)?.id)))
                    .filter((x: number) => Number.isFinite(x));
                const short = res?.result?.Shortlists ?? res?.result?.shortlists ?? [];
                const shortlistIds = (Array.isArray(short) ? short : [])
                    .map((x: unknown) =>
                        typeof x === 'number'
                            ? x
                            : Number((x as any)?.shortlistedProfileId ?? (x as any)?.profileId ?? (x as any)?.id)
                    )
                    .filter((x: number) => Number.isFinite(x));
                setInteractionFavoriteIds(favoriteIds);
                setInteractionShortlistIds(shortlistIds);
            })
            .catch(() => {
                if (!cancelled) {
                    setInteractionFavoriteIds([]);
                    setInteractionShortlistIds([]);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [activeModal, user?.id, selectedProfile, ownedIds]);

    const interestTargetUserId = useMemo(
        () => viewerProfileUserId(selectedProfile),
        [selectedProfile]
    );
    const isInterestExpressed =
        interestTargetUserId !== null && interactionFavoriteIds.includes(interestTargetUserId);
    const isShortlisted =
        interestTargetUserId !== null && interactionShortlistIds.includes(interestTargetUserId);

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
    /** Unchecked = session-only auth (cleared when the browser session ends). */
    const [loginRememberMe, setLoginRememberMe] = useState(false);
    const [registerRememberMe, setRegisterRememberMe] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [verificationResumeHint, setVerificationResumeHint] = useState<string | null>(null);
    const [continuePendingLoading, setContinuePendingLoading] = useState(false);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginSuccessHint, setLoginSuccessHint] = useState<string | null>(null);
    const [loginEmailError, setLoginEmailError] = useState<string | null>(null);
    const [loginPasswordError, setLoginPasswordError] = useState<string | null>(null);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    /** Wall-clock deadline when API reports a temporary lockout ("try again in N minute(s)"). */
    const [loginLockoutUntilMs, setLoginLockoutUntilMs] = useState<number | null>(null);
    const [loginLockoutTick, setLoginLockoutTick] = useState(0);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
    const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotMode, setForgotMode] = useState<'contact' | 'search'>('contact');
    const [forgotContactMethod, setForgotContactMethod] = useState<'email' | 'phone' | 'whatsapp'>('email');
    const [forgotSearchDeliveryMethod, setForgotSearchDeliveryMethod] = useState<'email' | 'phone' | 'whatsapp'>('email');
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
    const [forgotLastInitiatePayload, setForgotLastInitiatePayload] = useState<ForgotPasswordInitiateRequest | null>(null);
    const [forgotResendUnlockAtMs, setForgotResendUnlockAtMs] = useState<number | null>(null);
    const [forgotResendTick, setForgotResendTick] = useState(0);

    const forgotResendSecondsLeft = useMemo(() => {
        if (forgotStep !== 'verify' || forgotResendUnlockAtMs == null) return 0;
        return Math.max(0, Math.ceil((forgotResendUnlockAtMs - Date.now()) / 1000));
    }, [forgotStep, forgotResendUnlockAtMs, forgotResendTick]);

    useEffect(() => {
        if (forgotStep !== 'verify' || forgotResendUnlockAtMs == null || Date.now() >= forgotResendUnlockAtMs) {
            return;
        }
        const id = window.setInterval(() => setForgotResendTick((x) => x + 1), 1000);
        return () => window.clearInterval(id);
    }, [forgotStep, forgotResendUnlockAtMs]);

    const loginLockoutRemainingSec = useMemo(() => {
        if (loginLockoutUntilMs == null) return 0;
        return Math.max(0, Math.ceil((loginLockoutUntilMs - Date.now()) / 1000));
    }, [loginLockoutUntilMs, loginLockoutTick]);

    useEffect(() => {
        if (loginLockoutUntilMs == null || Date.now() >= loginLockoutUntilMs) return;
        const id = window.setInterval(() => setLoginLockoutTick((x) => x + 1), 1000);
        return () => window.clearInterval(id);
    }, [loginLockoutUntilMs]);

    useEffect(() => {
        if (loginLockoutUntilMs == null) return;
        if (loginLockoutRemainingSec > 0) return;
        setLoginLockoutUntilMs(null);
        setLoginError(null);
    }, [loginLockoutUntilMs, loginLockoutRemainingSec]);

    useEffect(() => {
        if (activeModal !== 'login') return;
        const snap = readForgotVerifyPersisted();
        if (!snap) return;
        setForgotRecoveryUserId(snap.userId);
        setForgotSentVia(snap.sentVia);
        setForgotSuccess(snap.successMessage);
        setForgotSelectedAccount(snap.selectedAccount);
        setForgotLastInitiatePayload(snap.initiatePayload ?? null);
        const unlock = snap.resendUnlockAtMs;
        setForgotResendUnlockAtMs(unlock != null && Date.now() < unlock ? unlock : null);
        setForgotStep('verify');
        setShowForgotPassword(true);
        setForgotError(null);
        setForgotCode('');
        setForgotNewPassword('');
        setForgotConfirmPassword('');
        writeForgotVerifyPersisted({
            userId: snap.userId,
            sentVia: snap.sentVia,
            successMessage: snap.successMessage,
            selectedAccount: snap.selectedAccount,
            initiatePayload: snap.initiatePayload ?? null,
            resendUnlockAtMs: unlock != null && Date.now() < unlock ? unlock : null,
        });
    }, [activeModal]);

    // Verification states
    const [showVerification, setShowVerification] = useState(false);
    /** Existing user verification (e.g. standalone verify modal). */
    const [registeredUserId, setRegisteredUserId] = useState<number | null>(null);
    /** Pending registration — account exists only after VerifyCode succeeds. */
    const [registrationSessionId, setRegistrationSessionId] = useState<string | null>(null);
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
    /** Next allowed send/resend for registration / verify-account OTP (shared across channels). */
    const [verifyResendUnlockAtMs, setVerifyResendUnlockAtMs] = useState<number | null>(null);
    const [verifyResendTick, setVerifyResendTick] = useState(0);
    const [showWelcomePopup, setShowWelcomePopup] = useState(false);
    const [registeredFirstName, setRegisteredFirstName] = useState('');

    const verifyResendSecondsLeft = useMemo(() => {
        if (verifyResendUnlockAtMs == null) return 0;
        return Math.max(0, Math.ceil((verifyResendUnlockAtMs - Date.now()) / 1000));
    }, [verifyResendUnlockAtMs, verifyResendTick]);

    useEffect(() => {
        if (verifyResendUnlockAtMs == null || Date.now() >= verifyResendUnlockAtMs) return;
        const id = window.setInterval(() => setVerifyResendTick((x) => x + 1), 1000);
        return () => window.clearInterval(id);
    }, [verifyResendUnlockAtMs]);

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
        else if (firstName.trim().length > AUTH_FIELD_MAX_LENGTH) {
            newErrors.firstName = `First name cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters`;
        } else {
            const fnErr = nameLettersOnlyError(firstName, 'First name');
            if (fnErr) newErrors.firstName = fnErr;
        }
        if (!lastName.trim()) newErrors.lastName = 'Last Name is required';
        else if (lastName.trim().length > AUTH_FIELD_MAX_LENGTH) {
            newErrors.lastName = `Last name cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters`;
        } else {
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
        } else if (email.length > AUTH_FIELD_MAX_LENGTH) {
            newErrors.email = `Email cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters`;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!password) newErrors.password = 'Password is required';
        else if (password.length > PASSWORD_MAX_LENGTH) {
            newErrors.password = `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`;
        } else if (!passwordPassesPolicy(password)) {
            newErrors.password = 'Password must satisfy all requirements below';
        }
        if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
        else if (confirmPassword.length > PASSWORD_MAX_LENGTH) {
            newErrors.confirmPassword = `Password cannot exceed ${PASSWORD_MAX_LENGTH} characters`;
        } else if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFirstNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        // Strip digits/symbols on input so "John9" or pasted "John 123" can never
        // be entered. nameLettersOnlyError() is kept as a backstop on submit.
        const v = sanitizeNameInput(e.target.value);
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
        const v = sanitizeNameInput(e.target.value);
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

    const handleContinuePendingVerification = async () => {
        if (!email.trim()) {
            setRegisterError('Enter the same email you used when you started registration, then tap “Complete verification”.');
            return;
        }
        setContinuePendingLoading(true);
        setRegisterError(null);
        try {
            const response = await matrimonialService.getPendingRegistrationSession({
                email: email.trim(),
                nic: nic.trim() || undefined,
            });
            const resultAny = response.result as Record<string, unknown> | undefined;
            const regSid = resultAny?.registrationSessionId ?? resultAny?.RegistrationSessionId;
            const statusCode = response.statusCode;
            const ok =
                (statusCode === 200 || statusCode === 1) &&
                !!regSid &&
                !!resultAny;

            if (!ok) {
                setRegisterError(
                    response.message ||
                        'No pending registration found. Check your email and National ID match your signup, or start again.',
                );
                return;
            }

            const resumeFn = (resultAny.firstName ?? resultAny.FirstName) as string | undefined;
            setRegisteredFirstName(resumeFn && resumeFn.trim().length > 0 ? resumeFn.trim() : firstName);
            setRegistrationSessionId(String(regSid));
            setRegisteredUserId(null);
            setShowVerification(true);
            setCodeSent(false);
            setVerificationMethod('');
            setVerificationDigits(EMPTY_VERIFY_DIGITS());
            setVerificationError(null);
            setSendCodeError(null);
            setVerifyResendUnlockAtMs(null);
            setVerifyResendTick(0);
            setVerificationResumeHint(
                response.message ||
                    'Continue where you left off. Choose a method to receive a code if you need a new one.',
            );
            setVerifyResendUnlockAtMs(null);
            setVerifyResendTick(0);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Could not resume registration.';
            setRegisterError(msg);
        } finally {
            setContinuePendingLoading(false);
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
            });

            console.log('Registration response:', response);

            // Check if registration was successful
            // Handle different response formats: statusCode can be 200, or result might have userId or id
            const resultAny = response.result as Record<string, unknown>;
            const regSid = resultAny?.registrationSessionId ?? resultAny?.RegistrationSessionId;
            const statusCode = response.statusCode;
            const hasResult = !!response.result;

            console.log('Registration check - statusCode:', statusCode, 'hasResult:', hasResult, 'registrationSessionId:', regSid);

            const isSuccess =
                (statusCode === 200 || statusCode === 1 || (hasResult && regSid)) &&
                hasResult &&
                !!regSid;

            if (isSuccess) {
                // Pending registration — verify OTP before account is created on server
                console.log('Registration pending verification, session:', regSid);
                const resumeVerification =
                    resultAny?.resumeVerification === true || resultAny?.ResumeVerification === true;
                const resumeFn = (resultAny?.firstName ?? resultAny?.FirstName) as string | undefined;
                setRegisteredFirstName(
                    resumeFn && String(resumeFn).trim().length > 0 ? String(resumeFn).trim() : firstName,
                );
                setRegistrationSessionId(String(regSid));
                setRegisteredUserId(null);
                setShowVerification(true);
                setCodeSent(false); // Reset code sent state - user must select method first
                setVerificationMethod(''); // Reset verification method
                setVerificationDigits(EMPTY_VERIFY_DIGITS()); // Reset verification code
                setVerifyResendUnlockAtMs(null);
                setVerifyResendTick(0);
                setVerificationError(null); // Reset errors
                setSendCodeError(null); // Reset send code errors
                setRegisterError(null);
                if (resumeVerification && response.message) {
                    setVerificationResumeHint(response.message);
                } else {
                    setVerificationResumeHint(null);
                }
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
        setLoginSuccessHint(null);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let hasError = false;

        if (!loginEmail.trim()) {
            setLoginEmailError('Email is required.');
            hasError = true;
        } else if (loginEmail.trim().length > AUTH_FIELD_MAX_LENGTH) {
            setLoginEmailError(`Email cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters.`);
            hasError = true;
        } else if (!emailRegex.test(loginEmail.trim())) {
            setLoginEmailError('Please enter a valid email address.');
            hasError = true;
        } else {
            setLoginEmailError(null);
        }

        if (!loginPassword) {
            setLoginPasswordError('Password is required.');
            hasError = true;
        } else if (loginPassword.length < 6) {
            setLoginPasswordError('Password must be at least 6 characters.');
            hasError = true;
        } else if (loginPassword.length > PASSWORD_MAX_LENGTH) {
            setLoginPasswordError(`Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`);
            hasError = true;
        } else {
            setLoginPasswordError(null);
        }

        if (hasError) return;

        setIsLoading(true);
        setLoginError(null);
        setLoginLockoutUntilMs(null);
        setLoginEmailError(null);
        setLoginPasswordError(null);

        try {
            const response = await matrimonialService.login({
                email: loginEmail.trim(),
                password: loginPassword,
            });

            const statusOk = Number(response.statusCode) === 200 || Number(response.statusCode) === 1;
            if (statusOk && response.result) {
                // Login successful
                console.log('Login API response:', response.result);
                const loginParentId = parentUserIdFromLoginResult(response.result);
                const signInExtras = mapUserFieldsFromSignInResult(response.result as unknown as Record<string, unknown>);
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
                    horoscopeDocument2:
                        response.result.HoroscopeDocument2 || response.result.horoscopeDocument2 || '',
                    horoscopeDocument3:
                        response.result.HoroscopeDocument3 || response.result.horoscopeDocument3 || '',
                    isVerified: response.result.status === 1,
                    ...(loginParentId !== undefined ? { parentUserId: loginParentId } : {}),
                    ...signInExtras,
                };

                login(user, loginRememberMe);

                if (response.result.accessToken) {
                    setStoredToken(response.result.accessToken, loginRememberMe);
                }

                onClose();
                router.push('/');
                // Force a page reload to ensure state is clean
                setTimeout(() => {
                    window.location.href = '/';
                }, 100);
            } else {
                const msg = String(response.message || (response as { Message?: string }).Message || '').trim();
                applySignInMessageToLoginErrors(
                    msg,
                    setLoginEmailError,
                    setLoginPasswordError,
                    setLoginError,
                    setLoginLockoutUntilMs,
                );
            }
        } catch (error) {
            console.error('Login error:', error);
            const raw = error instanceof Error ? error.message.trim() : '';
            const lower = raw.toLowerCase();
            if (
                error instanceof TypeError ||
                lower.includes('failed to fetch') ||
                lower.includes('networkerror') ||
                lower.includes('load failed') ||
                lower === 'network request failed' ||
                lower.includes('network error')
            ) {
                setLoginEmailError(null);
                setLoginPasswordError(null);
                setLoginLockoutUntilMs(null);
                setLoginError('Cannot reach the server. Check your internet connection and try again.');
            } else {
                applySignInMessageToLoginErrors(
                    raw,
                    setLoginEmailError,
                    setLoginPasswordError,
                    setLoginError,
                    setLoginLockoutUntilMs,
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const resetForgotPasswordState = (options?: { discardPersistedSession?: boolean }) => {
        const discardPersisted = options?.discardPersistedSession !== false;
        if (discardPersisted) {
            clearForgotVerifyPersisted();
        }
        setShowForgotPassword(false);
        setForgotMode('contact');
        setForgotContactMethod('email');
        setForgotSearchDeliveryMethod('email');
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
        setShowForgotNewPassword(false);
        setShowForgotConfirmPassword(false);
        setShowLoginPassword(false);
        setForgotError(null);
        setForgotSuccess(null);
        setForgotStep('entry');
        setIsForgotSubmitting(false);
        setForgotLastInitiatePayload(null);
        setForgotResendUnlockAtMs(null);
        setForgotResendTick(0);
        setLoginError(null);
        setLoginLockoutUntilMs(null);
        setLoginLockoutTick(0);
        setLoginEmailError(null);
        setLoginPasswordError(null);
    };

    const handleSearchRecoveryAccounts = async () => {
        const raw = forgotSearchName.trim();
        setForgotSearchResults([]);

        if (raw.length > AUTH_FIELD_MAX_LENGTH) {
            setForgotError(`Name cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters.`);
            return;
        }

        if (raw.length < 2) {
            setForgotError('Enter at least 2 letters of a first or last name to search.');
            return;
        }

        const lettersOnlyErr = nameLettersOnlyError(raw, 'Name');
        if (lettersOnlyErr) {
            setForgotError(lettersOnlyErr);
            return;
        }

        const letterCount = (raw.match(/\p{L}/gu) ?? []).length;
        if (letterCount < 2) {
            setForgotError('Enter at least 2 letters (numbers and symbols are not allowed).');
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);
        setForgotSelectedAccount(null);

        try {
            const response = await matrimonialService.searchRecoveryAccounts(raw);
            const accounts = Array.isArray(response?.result) ? response.result : [];
            setForgotSearchResults(accounts);

            if (accounts.length === 0) {
                setForgotError(
                    'No account matched that name. Try a different spelling, or use registered email / phone / WhatsApp above.'
                );
            }
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Could not search accounts. Check your connection and try again.');
            setForgotSearchResults([]);
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleInitiateForgotByContact = async () => {
        let payload: ForgotPasswordInitiateRequest;

        if (forgotContactMethod === 'email') {
            const emailVal = forgotContactEmail.trim();
            if (!emailVal) {
                setForgotError('Enter the email address you used when you registered.');
                return;
            }
            const emailFmtErr = getForgotPasswordEmailValidationError(emailVal);
            if (emailFmtErr) {
                setForgotError(emailFmtErr);
                return;
            }
            if (emailVal.length > AUTH_FIELD_MAX_LENGTH) {
                setForgotError(`Email cannot exceed ${AUTH_FIELD_MAX_LENGTH} characters.`);
                return;
            }
            payload = { email: emailVal, deliveryMethod: forgotContactMethod };
        } else if (forgotContactMethod === 'phone') {
            const phoneVal = forgotContactPhone.trim();
            if (!phoneVal) {
                setForgotError('Enter the mobile number saved on your profile.');
                return;
            }
            const phoneFmtErr = sriLankanPhoneFormatErrorIfInvalid(phoneVal, 'Phone number');
            if (phoneFmtErr) {
                setForgotError(phoneFmtErr);
                return;
            }
            payload = { phoneNumber: phoneVal, deliveryMethod: forgotContactMethod };
        } else {
            const waVal = forgotContactWhatsApp.trim();
            if (!waVal) {
                setForgotError('Enter the WhatsApp number saved on your profile.');
                return;
            }
            const waFmtErr = sriLankanPhoneFormatErrorIfInvalid(waVal, 'WhatsApp number');
            if (waFmtErr) {
                setForgotError(waFmtErr);
                return;
            }
            payload = { whatsApp: waVal, deliveryMethod: forgotContactMethod };
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);

        try {
            const response = await matrimonialService.initiateForgotPassword(payload);
            const statusOk = response?.statusCode === 200 || response?.statusCode === 201;
            const userId = response?.result?.userId;
            const sentVia = formatForgotDeliveryChannel(response?.result?.sentVia ?? forgotContactMethod);

            if (!statusOk || !userId) {
                setForgotError(response?.message || 'We couldn’t send a code. Check what you entered and try again.');
                return;
            }

            const successMsg = `We sent a 6-digit code to ${sentVia}. It expires in 10 minutes — enter it below.`;
            const unlockAt = Date.now() + VERIFY_CODE_RESEND_COOLDOWN_MS;
            setForgotRecoveryUserId(Number(userId));
            setForgotSentVia(sentVia);
            setForgotStep('verify');
            setForgotSuccess(successMsg);
            setForgotLastInitiatePayload(payload);
            setForgotResendUnlockAtMs(unlockAt);
            writeForgotVerifyPersisted({
                userId: Number(userId),
                sentVia,
                successMessage: successMsg,
                selectedAccount: null,
                initiatePayload: payload,
                resendUnlockAtMs: unlockAt,
            });
        } catch (error) {
            setForgotError(
                error instanceof Error ? error.message : 'We couldn’t send a verification code. Try again in a moment.'
            );
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
            const initiatePayload: ForgotPasswordInitiateRequest = {
                userId: account.userId,
                deliveryMethod: forgotSearchDeliveryMethod,
            };
            const response = await matrimonialService.initiateForgotPassword(initiatePayload);
            const statusOk = response?.statusCode === 200 || response?.statusCode === 201;
            const userId = response?.result?.userId;
            const sentVia = formatForgotDeliveryChannel(response?.result?.sentVia ?? forgotSearchDeliveryMethod);

            if (!statusOk || !userId) {
                setForgotError(response?.message || 'We couldn’t send a code for this account. Try another delivery method or contact support.');
                return;
            }

            const successMsg = `We sent a 6-digit code to ${sentVia}. It expires in 10 minutes — enter it below.`;
            const unlockAt = Date.now() + VERIFY_CODE_RESEND_COOLDOWN_MS;
            setForgotRecoveryUserId(Number(userId));
            setForgotSentVia(sentVia);
            setForgotStep('verify');
            setForgotSuccess(successMsg);
            setForgotLastInitiatePayload(initiatePayload);
            setForgotResendUnlockAtMs(unlockAt);
            writeForgotVerifyPersisted({
                userId: Number(userId),
                sentVia,
                successMessage: successMsg,
                selectedAccount: account,
                initiatePayload: initiatePayload,
                resendUnlockAtMs: unlockAt,
            });
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'We couldn’t send a verification code. Try again shortly.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleForgotResendCode = async () => {
        if (
            forgotStep !== 'verify' ||
            forgotLastInitiatePayload == null ||
            forgotResendSecondsLeft > 0 ||
            isForgotSubmitting
        ) {
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);

        try {
            const response = await matrimonialService.initiateForgotPassword(forgotLastInitiatePayload);
            const statusOk = response?.statusCode === 200 || response?.statusCode === 201;
            const userId = response?.result?.userId;
            const sentVia = formatForgotDeliveryChannel(
                response?.result?.sentVia ?? forgotLastInitiatePayload.deliveryMethod,
            );

            if (!statusOk || !userId) {
                setForgotError(response?.message || 'We couldn’t resend the code. Try again shortly.');
                return;
            }

            const successMsg = `We sent a new 6-digit code to ${sentVia}. It expires in 10 minutes — enter it below.`;
            const unlockAt = Date.now() + VERIFY_CODE_RESEND_COOLDOWN_MS;
            setForgotRecoveryUserId(Number(userId));
            setForgotSentVia(sentVia);
            setForgotSuccess(successMsg);
            setForgotResendUnlockAtMs(unlockAt);
            writeForgotVerifyPersisted({
                userId: Number(userId),
                sentVia,
                successMessage: successMsg,
                selectedAccount: forgotSelectedAccount,
                initiatePayload: forgotLastInitiatePayload,
                resendUnlockAtMs: unlockAt,
            });
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'We couldn’t resend the verification code.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const handleForgotPasswordReset = async () => {
        if (!forgotRecoveryUserId) {
            setForgotError('Your reset session expired. Close this window and start “Forgot password” again.');
            return;
        }

        const codeDigits = forgotCode.replace(/\D/g, '');
        if (!codeDigits || codeDigits.length !== 6) {
            setForgotError('Enter the 6-digit code we sent (numbers only).');
            return;
        }

        if (!forgotNewPassword || forgotNewPassword.length < 6) {
            setForgotError('Choose a new password with at least 6 characters.');
            return;
        }

        if (forgotNewPassword.length > PASSWORD_MAX_LENGTH || forgotConfirmPassword.length > PASSWORD_MAX_LENGTH) {
            setForgotError(`Password cannot exceed ${PASSWORD_MAX_LENGTH} characters.`);
            return;
        }

        if (forgotNewPassword !== forgotConfirmPassword) {
            setForgotError('New password and confirmation must match exactly.');
            return;
        }

        setIsForgotSubmitting(true);
        setForgotError(null);
        setForgotSuccess(null);

        try {
            const response = await matrimonialService.resetForgotPasswordWithCode({
                userId: forgotRecoveryUserId,
                code: codeDigits,
                newPassword: forgotNewPassword,
                confirmPassword: forgotConfirmPassword,
            });

            if (response.statusCode === 200 || response.statusCode === 1) {
                const msg =
                    response.message ||
                    'Your password was updated. Sign in with your email and new password.';
                resetForgotPasswordState();
                setLoginTab('login');
                setLoginSuccessHint(msg);
                setLoginPassword('');
            } else {
                setForgotError(response.message || 'Your password could not be updated. Try again.');
            }
        } catch (error) {
            setForgotError(error instanceof Error ? error.message : 'Your password could not be updated. Try again.');
        } finally {
            setIsForgotSubmitting(false);
        }
    };

    const parseNIC = parseNicToDobAndGender;

    /** Valid NIC: DOB/gender come from ID and are locked. Passport / partial NIC: editable after ID field has input. */
    const hasNicInput = nic.trim().length > 0;
    const nicLocksDobGender = !!parseNIC(nic);
    const dobGenderDisabled = !hasNicInput || nicLocksDobGender;

    const dobGenderTitle = !hasNicInput
        ? 'Enter National ID / Passport number first'
        : nicLocksDobGender
          ? 'Locked — values match your NIC. Clear or change ID to edit manually.'
          : 'Enter manually for passport; a valid NIC replaces these from your ID and locks them.';

    const handleNicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = sanitizeNicInput(e.target.value);
        setNic(value);
        if (!value.trim()) {
            setDob('');
            setGender('');
            return;
        }
        const result = parseNIC(value);
        if (result) {
            setDob(result.dob);
            setGender(result.gender);
        }
    };

    /** Clear every user-entered field on the registration form (name, NIC, DOB, gender, contacts, email, password, terms, …). */
    const resetRegistrationForm = () => {
        setFirstName('');
        setLastName('');
        setNic('');
        setDob('');
        setGender('');
        setPhone('');
        setWhatsapp('');
        setIsWhatsAppSame(false);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setShowRegisterPassword(false);
        setShowRegisterConfirmPassword(false);
        setRegisterAccountType(registerAsMatchmaker ? 'Matchmaker' : 'Self');
        setTermsAccepted(false);
        setLoginTermsAccepted(false);
        setRegisterRememberMe(false);
        setErrors({});
        setRegisterError(null);
    };

    const handleWelcomePopupClose = () => {
        setShowWelcomePopup(false);
        // Reset all registration/verification state after welcome popup closes
        setRegisteredUserId(null);
        setRegistrationSessionId(null);
        setRegisteredFirstName('');
        setVerificationMethod('');
        setVerificationDigits(EMPTY_VERIFY_DIGITS());
        setVerificationError(null);
        setSendCodeError(null);
        setCodeSent(false);
        setIsSendingCode(false);
        setIsVerifying(false);
        setShowVerification(false);
        setVerifyResendUnlockAtMs(null);
        setVerifyResendTick(0);
        // Wipe the registration form so a returning visitor starts fresh.
        resetRegistrationForm();
        // User is usually already on `/` after verify (modal closed). Avoid router + full reload (double load).
        if (pathname !== '/') {
            router.replace('/');
        }
    };

    // Clear the registration form whenever the user transitions from signed-in to signed-out (logout).
    const wasLoggedInRef = useRef<boolean>(!!user);
    useEffect(() => {
        if (wasLoggedInRef.current && !user) {
            resetRegistrationForm();
        }
        wasLoggedInRef.current = !!user;
    }, [user]);

    const close = () => {
        // Don't reset welcome popup state if it should be shown
        // Only reset if welcome popup is not active
        if (!showWelcomePopup) {
            if (forgotStep === 'verify' && forgotRecoveryUserId != null) {
                writeForgotVerifyPersisted({
                    userId: forgotRecoveryUserId,
                    sentVia: forgotSentVia,
                    successMessage:
                        forgotSuccess ??
                        `We sent a 6-digit code to ${forgotSentVia || 'your selected method'}. It expires in 10 minutes — enter it below.`,
                    selectedAccount: forgotSelectedAccount,
                    initiatePayload: forgotLastInitiatePayload,
                    resendUnlockAtMs: forgotResendUnlockAtMs,
                });
            }
            resetForgotPasswordState({ discardPersistedSession: false });
            setShowVerification(false);
            setRegisteredUserId(null);
            setRegistrationSessionId(null);
            setVerificationMethod('');
            setVerificationDigits(EMPTY_VERIFY_DIGITS());
            setVerificationError(null);
            setSendCodeError(null);
            setCodeSent(false);
            setIsSendingCode(false);
            setIsVerifying(false);
            setRegisteredFirstName('');
            setConfirmPassword('');
            setShowRegisterPassword(false);
            setShowRegisterConfirmPassword(false);
            setShowLoginPassword(false);
            setVerificationResumeHint(null);
            setVerifyResendUnlockAtMs(null);
            setVerifyResendTick(0);
            setShowFreePlanConfirmModal(false);
            setIsSwitchingToFreePlan(false);
        }
        onClose();
    };

    const handleOverlayClick = (e: MouseEvent) => {
        if (e.target === e.currentTarget) close();
    };

    const handleExpressInterest = () => {
        const blockedHint = profileVisitorActionsBlockedHint(user, selectedProfile, ownedIds);
        if (blockedHint) {
            showToast(blockedHint, 'info');
            return;
        }
        if (selectedProfile?.viewAsOthers) return;
        const targetProfileUserId = matrimonialProfileUserId(selectedProfile);
        if (!targetProfileUserId) return;

        if (!user) {
            onSwitch('login');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }

        managedActionPicker.runWithManagedAccount('interest', async (managedProfileUserId) => {
            setExpressInterestLoading(true);
            try {
                const res = await matrimonialService.toggleFavorite(
                    Number(user.id),
                    targetProfileUserId,
                    managedProfileUserIdForApi(managedProfileUserId)
                );
                if (res.statusCode === 200) {
                    setInteractionFavoriteIds((prev) => {
                        const has = prev.includes(targetProfileUserId);
                        return has ? prev.filter((id) => id !== targetProfileUserId) : [...prev, targetProfileUserId];
                    });
                    showToast('Interest updated successfully', 'success');
                } else {
                    showToast(res?.message || res?.Message || 'Could not update interest. Try again.', 'error');
                }
            } catch {
                showToast('Could not update interest. Try again.', 'error');
            } finally {
                setExpressInterestLoading(false);
            }
        });
    };

    const handleToggleShortlist = () => {
        const blockedHint = profileVisitorActionsBlockedHint(user, selectedProfile, ownedIds);
        if (blockedHint) {
            showToast(blockedHint, 'info');
            return;
        }
        if (selectedProfile?.viewAsOthers || isProfileLockedByDailyLimit) return;
        const targetProfileUserId = viewerProfileUserId(selectedProfile);
        if (!targetProfileUserId) return;

        if (!user) {
            onSwitch('login');
            return;
        }
        if (user.isVerified === false) {
            window.dispatchEvent(new CustomEvent('open-verify-modal'));
            return;
        }

        managedActionPicker.runWithManagedAccount('save', async (managedProfileUserId) => {
            setShortlistLoading(true);
            try {
                const res = await matrimonialService.toggleShortlist(
                    Number(user.id),
                    targetProfileUserId,
                    managedProfileUserIdForApi(managedProfileUserId)
                );
                if (res.statusCode === 200) {
                    setInteractionShortlistIds((prev) => {
                        const has = prev.includes(targetProfileUserId);
                        return has ? prev.filter((id) => id !== targetProfileUserId) : [...prev, targetProfileUserId];
                    });
                    showToast(isShortlisted ? 'Removed from shortlist.' : 'Added to shortlist.', 'success');
                } else {
                    showToast(res?.message || res?.Message || 'Could not update shortlist. Try again.', 'error');
                }
            } catch {
                showToast('Could not update shortlist. Try again.', 'error');
            } finally {
                setShortlistLoading(false);
            }
        });
    };

    const handleOpenMessage = () => {
        const blockedHint = profileVisitorActionsBlockedHint(user, selectedProfile, ownedIds);
        if (blockedHint) {
            showToast(blockedHint, 'info');
            return;
        }
        if (selectedProfile?.viewAsOthers || isProfileLockedByDailyLimit) return;
        if (!user) {
            onSwitch('login');
            return;
        }
        const canMessage = Boolean(selectedProfile?.canMessage ?? selectedProfile?.CanMessage);
        if (!canMessage) {
            setProfileAccessMessage('Messaging needs an active subscription.');
            return;
        }
        const targetUserId = matrimonialProfileUserId(selectedProfile);
        if (!targetUserId) return;
        managedActionPicker.runWithManagedAccount('message', (managedProfileUserId) => {
            onClose();
            const managedQuery = managedProfileUserIdForApi(managedProfileUserId);
            router.push(
                managedQuery != null
                    ? `/messages?userId=${targetUserId}&managedProfileUserId=${managedQuery}`
                    : `/messages?userId=${targetUserId}`
            );
        });
    };

    const handleSendVerificationCode = async (method: string) => {
        if (!registrationSessionId && !registeredUserId) {
            setSendCodeError('Verification session not found. Please try registering again.');
            return;
        }

        if (verifyResendSecondsLeft > 0) {
            setSendCodeError(`Please wait ${formatSecondsMmSs(verifyResendSecondsLeft)} before requesting another code.`);
            return;
        }

        setIsSendingCode(true);
        setSendCodeError(null);
        setVerificationError(null);

        try {
            const response = registrationSessionId
                ? await matrimonialService.sendVerificationCode({ registrationSessionId, method })
                : await matrimonialService.sendVerificationCode({ userId: registeredUserId!, method });
            if (response.statusCode === 200 || response.statusCode === 1) {
                setVerificationMethod(method);
                setCodeSent(true);
                setSendCodeError(null);
                setVerificationDigits(EMPTY_VERIFY_DIGITS());
                setVerificationError(null);
                setVerifyResendUnlockAtMs(Date.now() + VERIFY_CODE_RESEND_COOLDOWN_MS);
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
        if (!registrationSessionId && !registeredUserId) {
            setVerificationError('Verification session not found. Please try registering again.');
            return;
        }

        if (!verificationCode || verificationCode.length !== 6) {
            setVerificationError('Please enter a valid 6-digit verification code');
            return;
        }

        setIsVerifying(true);
        setVerificationError(null);

        try {
            const response = registrationSessionId
                ? await matrimonialService.verifyCode({ registrationSessionId, code: verificationCode })
                : await matrimonialService.verifyCode({ userId: registeredUserId!, code: verificationCode });
            if (response.statusCode === 200 || response.statusCode === 1) {
                // Verification successful.
                // Ensure we have a token for authorized APIs (uploads, profile updates).
                const existingToken = typeof window !== 'undefined' ? getStoredToken() : null;

                const vr = response.result as Record<string, unknown> | undefined;
                const createdUserId = vr?.userId ?? vr?.UserId;
                const resolvedUserId =
                    registrationSessionId && createdUserId != null
                        ? Number(createdUserId)
                        : registeredUserId;

                const fallbackUser = user || undefined;
                let userToLogin = {
                    id: (resolvedUserId ?? registeredUserId ?? '').toString(),
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
                    horoscopeDocument2: fallbackUser?.horoscopeDocument2,
                    horoscopeDocument3: fallbackUser?.horoscopeDocument3,
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

                    setStoredToken(token, registerRememberMe);

                    const r = loginResponse.result;
                    const loginParentId = parentUserIdFromLoginResult(r);
                    const signInExtras = mapUserFieldsFromSignInResult(r as unknown as Record<string, unknown>);
                    userToLogin = {
                        id: (r.id ?? resolvedUserId ?? registeredUserId).toString(),
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
                        horoscopeDocument:
                            r.HoroscopeDocument || r.horoscopeDocument || userToLogin.horoscopeDocument,
                        horoscopeDocument2:
                            r.HoroscopeDocument2 || r.horoscopeDocument2 || userToLogin.horoscopeDocument2,
                        horoscopeDocument3:
                            r.HoroscopeDocument3 || r.horoscopeDocument3 || userToLogin.horoscopeDocument3,
                        isVerified: r.status === 1 ? true : userToLogin.isVerified,
                        ...(loginParentId !== undefined ? { parentUserId: loginParentId } : {}),
                        ...signInExtras,
                    };
                }

                login(userToLogin, registerRememberMe);

                // Ensure firstName is set for welcome popup (use firstName from form if registeredFirstName is not set)
                const firstNameToUse = registeredFirstName || firstName;
                if (firstNameToUse) {
                    setRegisteredFirstName(firstNameToUse);
                }

                // Close the verification modal first
                setVerificationResumeHint(null);
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

    /** Resend OTP using the same channel the user already chose (Email / Phone / WhatsApp). */
    const handleResendCode = () => {
        const method = verificationMethod.trim();
        if (!method) {
            setSendCodeError('Choose how to receive your code first, or use “Change method”.');
            return;
        }
        void handleSendVerificationCode(method);
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
            <div className={`modal-overlay ${activeModal === 'login' || activeModal === 'verify' ? 'active' : ''}`} id="loginModal">
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
                            <div id="verificationTab" className="tab-content active verification-screen">
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
                                    {verificationResumeHint && (
                                        <p style={{ textAlign: 'center', marginBottom: '1.25rem', marginTop: '-1rem', padding: '0.65rem 0.75rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', color: '#9a3412', fontSize: '0.88rem', lineHeight: 1.45 }}>
                                            {verificationResumeHint}
                                        </p>
                                    )}
                                </div>

                                {!codeSent ? (
                                    <div className="verification-methods">
                                        {verifyResendSecondsLeft > 0 && (
                                            <p
                                                style={{
                                                    textAlign: 'center',
                                                    color: 'var(--text-light)',
                                                    fontSize: '0.88rem',
                                                    marginBottom: '1rem',
                                                }}
                                                aria-live="polite"
                                            >
                                                Next code in{' '}
                                                <strong
                                                    style={{
                                                        fontVariantNumeric: 'tabular-nums',
                                                        color: 'var(--text-dark)',
                                                        fontSize: '1.15rem',
                                                        letterSpacing: '0.04em',
                                                    }}
                                                >
                                                    {formatSecondsMmSs(verifyResendSecondsLeft)}
                                                </strong>
                                            </p>
                                        )}
                                        <div className="verification-method-card"
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('Email')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
                                            }}
                                            >
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
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('Phone')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
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
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('WhatsApp')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
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
                                            {verifyResendSecondsLeft > 0 ? (
                                                <>
                                                    <p
                                                        style={{ fontSize: '0.88rem', color: 'var(--text-light)', margin: '0 0 0.6rem' }}
                                                        aria-live="polite"
                                                    >
                                                        Next code in{' '}
                                                        <strong
                                                            style={{
                                                                fontVariantNumeric: 'tabular-nums',
                                                                color: 'var(--text-dark)',
                                                                fontSize: '1.15rem',
                                                                letterSpacing: '0.04em',
                                                            }}
                                                        >
                                                            {formatSecondsMmSs(verifyResendSecondsLeft)}
                                                        </strong>
                                                    </p>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="resend-button"
                                                            aria-disabled="true"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--primary)',
                                                                cursor: 'not-allowed',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '500',
                                                                opacity: 0.45,
                                                            }}
                                                        >
                                                            Resend Code
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="resend-button"
                                                            aria-disabled="true"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--text-light)',
                                                                cursor: 'not-allowed',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '500',
                                                                opacity: 0.45,
                                                            }}
                                                        >
                                                            Change Method
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
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
                                                            opacity: isSendingCode ? 0.5 : 1,
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
                                                            opacity: (isSendingCode || isVerifying) ? 0.5 : 1,
                                                        }}
                                                    >
                                                        Change Method
                                                    </button>
                                                </div>
                                            )}
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
                                                onClick={() => resetForgotPasswordState()}
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
                                                                setForgotSearchResults([]);
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
                                                                setForgotSearchResults([]);
                                                                setForgotError(null);
                                                                setForgotSuccess(null);
                                                            }}
                                                        />
                                                        Search by name
                                                    </label>
                                                </div>

                                                {forgotMode === 'contact' ? (
                                                    <>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                                                            Choose how you want to receive the recovery code:
                                                        </p>
                                                        {/* Method picker */}
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                                            {(['email', 'phone', 'whatsapp'] as const).map((m) => {
                                                                const label = m === 'email' ? '📧 Email' : m === 'phone' ? '📞 Phone' : '💬 WhatsApp';
                                                                const active = forgotContactMethod === m;
                                                                return (
                                                                    <button
                                                                        key={m}
                                                                        type="button"
                                                                        onClick={() => { setForgotContactMethod(m); setForgotError(null); setForgotSuccess(null); }}
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '0.45rem 0.25rem',
                                                                            borderRadius: '6px',
                                                                            border: active ? '2px solid var(--primary)' : '1px solid #d1d5db',
                                                                            background: active ? 'var(--primary)' : '#fff',
                                                                            color: active ? '#fff' : '#374151',
                                                                            fontWeight: active ? 700 : 400,
                                                                            fontSize: '0.8rem',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease',
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Input for selected method only */}
                                                        {forgotContactMethod === 'email' && (
                                                            <div className="form-group">
                                                                <label>Registered Email Address</label>
                                                                <input
                                                                    type="email"
                                                                    value={forgotContactEmail}
                                                                    onChange={(e) => { setForgotContactEmail(e.target.value); setForgotError(null); }}
                                                                    placeholder="your@email.com"
                                                                    autoComplete="email"
                                                                    maxLength={AUTH_FIELD_MAX_LENGTH}
                                                                />
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'block', marginTop: '0.25rem' }}>
                                                                    Same email as on your profile — complete address with @ (example: name@gmail.com).
                                                                </span>
                                                            </div>
                                                        )}
                                                        {forgotContactMethod === 'phone' && (
                                                            <div className="form-group">
                                                                <label>Registered Phone Number</label>
                                                                <input
                                                                    type="tel"
                                                                    value={forgotContactPhone}
                                                                    onChange={(e) => { setForgotContactPhone(sanitizeSriLankanPhoneInput(e.target.value)); setForgotError(null); }}
                                                                    placeholder={SL_PHONE_PLACEHOLDER}
                                                                />
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'block', marginTop: '0.25rem' }}>
                                                                    Same mobile as on your profile. {SL_PHONE_HINT}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {forgotContactMethod === 'whatsapp' && (
                                                            <div className="form-group">
                                                                <label>Registered WhatsApp Number</label>
                                                                <input
                                                                    type="tel"
                                                                    value={forgotContactWhatsApp}
                                                                    onChange={(e) => { setForgotContactWhatsApp(sanitizeSriLankanPhoneInput(e.target.value)); setForgotError(null); }}
                                                                    placeholder={SL_PHONE_PLACEHOLDER}
                                                                />
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', display: 'block', marginTop: '0.25rem' }}>
                                                                    Same WhatsApp as on your profile. {SL_PHONE_HINT}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                                                            onClick={handleInitiateForgotByContact}
                                                            disabled={isForgotSubmitting}
                                                        >
                                                            {isForgotSubmitting ? 'Validating...' : `Send Code via ${forgotContactMethod === 'email' ? 'Email' : forgotContactMethod === 'phone' ? 'Phone' : 'WhatsApp'}`}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '0.75rem' }}>
                                                            Choose how you want to receive the recovery code, then search your account by name.
                                                        </p>
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                                            {(['email', 'phone', 'whatsapp'] as const).map((m) => {
                                                                const label = m === 'email' ? '📧 Email' : m === 'phone' ? '📞 Phone' : '💬 WhatsApp';
                                                                const active = forgotSearchDeliveryMethod === m;
                                                                return (
                                                                    <button
                                                                        key={m}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setForgotSearchDeliveryMethod(m);
                                                                            setForgotError(null);
                                                                            setForgotSuccess(null);
                                                                        }}
                                                                        style={{
                                                                            flex: 1,
                                                                            padding: '0.45rem 0.25rem',
                                                                            borderRadius: '6px',
                                                                            border: active ? '2px solid var(--primary)' : '1px solid #d1d5db',
                                                                            background: active ? 'var(--primary)' : '#fff',
                                                                            color: active ? '#fff' : '#374151',
                                                                            fontWeight: active ? 700 : 400,
                                                                            fontSize: '0.8rem',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease',
                                                                        }}
                                                                    >
                                                                        {label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="form-group">
                                                            <label>Type your name</label>
                                                            <input
                                                                type="text"
                                                                value={forgotSearchName}
                                                                onChange={(e) => {
                                                                    setForgotSearchName(sanitizeNameInput(e.target.value));
                                                                    setForgotSearchResults([]);
                                                                    setForgotError(null);
                                                                    setForgotSuccess(null);
                                                                }}
                                                                placeholder="First name or full name"
                                                                maxLength={AUTH_FIELD_MAX_LENGTH}
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
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showForgotNewPassword ? 'text' : 'password'}
                                                            value={forgotNewPassword}
                                                            onChange={(e) => setForgotNewPassword(e.target.value)}
                                                            placeholder="New password"
                                                            autoComplete="new-password"
                                                            maxLength={PASSWORD_MAX_LENGTH}
                                                            style={{ width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                                                        />
                                                        <PasswordVisibilityToggle
                                                            passwordVisible={showForgotNewPassword}
                                                            onToggle={() => setShowForgotNewPassword((v) => !v)}
                                                            ariaLabelWhenHidden="Show new password"
                                                            ariaLabelWhenVisible="Hide new password"
                                                            style={modalPasswordToggleStyle}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Confirm Password</label>
                                                    <div style={{ position: 'relative' }}>
                                                        <input
                                                            type={showForgotConfirmPassword ? 'text' : 'password'}
                                                            value={forgotConfirmPassword}
                                                            onChange={(e) => setForgotConfirmPassword(e.target.value)}
                                                            placeholder="Confirm password"
                                                            autoComplete="new-password"
                                                            maxLength={PASSWORD_MAX_LENGTH}
                                                            style={{ width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                                                        />
                                                        <PasswordVisibilityToggle
                                                            passwordVisible={showForgotConfirmPassword}
                                                            onToggle={() => setShowForgotConfirmPassword((v) => !v)}
                                                            ariaLabelWhenHidden="Show confirm password"
                                                            ariaLabelWhenVisible="Hide confirm password"
                                                            style={modalPasswordToggleStyle}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', justifyContent: 'center' }}
                                                    onClick={handleForgotPasswordReset}
                                                    disabled={isForgotSubmitting}
                                                >
                                                    {isForgotSubmitting ? 'Resetting...' : 'Reset Password'}
                                                </button>

                                                <div style={{ textAlign: 'center', marginTop: '1.15rem' }}>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', margin: '0 0 0.35rem' }}>
                                                        Didn&apos;t receive the code?
                                                    </p>
                                                    {forgotResendSecondsLeft > 0 ? (
                                                        <>
                                                            <p
                                                                style={{ fontSize: '0.88rem', color: 'var(--text-light)', margin: '0 0 0.6rem' }}
                                                                aria-live="polite"
                                                            >
                                                                Next code in{' '}
                                                                <strong
                                                                    style={{
                                                                        fontVariantNumeric: 'tabular-nums',
                                                                        color: 'var(--text-dark)',
                                                                        fontSize: '1.15rem',
                                                                        letterSpacing: '0.04em',
                                                                    }}
                                                                >
                                                                    {formatSecondsMmSs(forgotResendSecondsLeft)}
                                                                </strong>
                                                            </p>
                                                            <button
                                                                type="button"
                                                                disabled
                                                                aria-disabled="true"
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'var(--primary)',
                                                                    cursor: 'not-allowed',
                                                                    textDecoration: 'underline',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 500,
                                                                    opacity: 0.45,
                                                                    padding: 0,
                                                                }}
                                                            >
                                                                Resend code
                                                            </button>
                                                        </>
                                                    ) : forgotLastInitiatePayload ? (
                                                        <button
                                                            type="button"
                                                            onClick={handleForgotResendCode}
                                                            disabled={isForgotSubmitting}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--primary)',
                                                                cursor: isForgotSubmitting ? 'not-allowed' : 'pointer',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                fontWeight: 500,
                                                                opacity: isForgotSubmitting ? 0.55 : 1,
                                                                padding: 0,
                                                            }}
                                                        >
                                                            {isForgotSubmitting ? 'Sending...' : 'Resend code'}
                                                        </button>
                                                    ) : (
                                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-light)', margin: 0 }}>
                                                            Use &quot;Back to Login&quot; and open Forgot password again to request a new code.
                                                        </p>
                                                    )}
                                                </div>
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
                                    <form
                                        style={{ margin: 0 }}
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            void handleLogin();
                                        }}
                                    >
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                placeholder="Enter your email"
                                                value={loginEmail}
                                                onChange={(e) => {
                                                    setLoginEmail(e.target.value);
                                                    setLoginEmailError(null);
                                                    setLoginError(null);
                                                    setLoginLockoutUntilMs(null);
                                                }}
                                                style={{ borderColor: loginEmailError ? 'red' : '' }}
                                                autoComplete="username"
                                                maxLength={AUTH_FIELD_MAX_LENGTH}
                                            />
                                            {loginEmailError && (
                                                <span style={{ color: 'red', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                                                    {loginEmailError}
                                                </span>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label>Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showLoginPassword ? 'text' : 'password'}
                                                    placeholder="Enter your password"
                                                    value={loginPassword}
                                                    onChange={(e) => {
                                                        setLoginPassword(e.target.value);
                                                        setLoginPasswordError(null);
                                                        setLoginError(null);
                                                        setLoginLockoutUntilMs(null);
                                                    }}
                                                    style={{ borderColor: loginPasswordError ? 'red' : '', width: '100%', paddingRight: '2.75rem', boxSizing: 'border-box' }}
                                                    autoComplete="current-password"
                                                    maxLength={PASSWORD_MAX_LENGTH}
                                                />
                                                <PasswordVisibilityToggle
                                                    passwordVisible={showLoginPassword}
                                                    onToggle={() => setShowLoginPassword((v) => !v)}
                                                    style={modalPasswordToggleStyle}
                                                />
                                            </div>
                                            {loginPasswordError && (
                                                <span style={{ color: 'red', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                                                    {loginPasswordError}
                                                </span>
                                            )}
                                        </div>
                                        <div className="checkbox-group">
                                            <input
                                                type="checkbox"
                                                id="remember"
                                                checked={loginRememberMe}
                                                onChange={(e) => setLoginRememberMe(e.target.checked)}
                                            />
                                            <label htmlFor="remember">Remember me</label>
                                        </div>
                                        {loginSuccessHint && (
                                            <div
                                                style={{
                                                    color: '#166534',
                                                    fontSize: '0.85rem',
                                                    marginBottom: '1rem',
                                                    padding: '0.6rem 0.75rem',
                                                    backgroundColor: '#dcfce7',
                                                    borderRadius: '6px',
                                                    borderLeft: '3px solid #22c55e',
                                                }}
                                            >
                                                {loginSuccessHint}
                                            </div>
                                        )}
                                        {loginError && (
                                            <div style={{
                                                color: '#b91c1c',
                                                fontSize: '0.85rem',
                                                marginBottom: '1rem',
                                                padding: '0.6rem 0.75rem',
                                                backgroundColor: '#fee2e2',
                                                borderRadius: '6px',
                                                borderLeft: '3px solid #ef4444',
                                            }}>
                                                {loginLockoutUntilMs != null && loginLockoutRemainingSec > 0 ? (
                                                    <>
                                                        <strong style={{ display: 'block', color: '#991b1b', marginBottom: '0.35rem' }}>
                                                            Account temporarily locked
                                                        </strong>
                                                        <span style={{ display: 'block' }}>{loginError}</span>
                                                        <span
                                                            style={{
                                                                display: 'block',
                                                                marginTop: '0.5rem',
                                                                fontWeight: 600,
                                                                fontVariantNumeric: 'tabular-nums',
                                                                letterSpacing: '0.02em',
                                                                color: '#7f1d1d',
                                                            }}
                                                            aria-live="polite"
                                                        >
                                                            Time remaining: {formatSecondsMmSs(loginLockoutRemainingSec)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    loginError
                                                )}
                                            </div>
                                        )}
                                        <button
                                            className="btn btn-primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            type="submit"
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
                                                    setLoginSuccessHint(null);
                                                    setShowForgotPassword(true);
                                                    setForgotError(null);
                                                    setForgotSuccess(null);
                                                }}
                                            >
                                                Forgot Password?
                                            </a>
                                        </p>
                                    </form>
                                )}
                            </div>
                        ) : (
                            <div id="registerTab" className="tab-content active">
                                <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Create a new account to get started</p>

                                <form
                                    style={{ margin: 0 }}
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (isLoading) return;
                                        if (!loginTermsAccepted) {
                                            setRegisterError(
                                                'Please agree to the Terms of Service and Privacy Policy to continue.',
                                            );
                                            return;
                                        }
                                        void handleRegister();
                                    }}
                                >
                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={handleFirstNameChange} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={handleLastNameChange} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.lastName ? 'red' : '' }} />
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
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            disabled={dobGenderDisabled}
                                            title={dobGenderTitle}
                                            style={{
                                                borderColor: errors.dob ? 'red' : '',
                                                ...(dobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                            }}
                                        />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            disabled={dobGenderDisabled}
                                            title={dobGenderTitle}
                                            style={{
                                                borderColor: errors.gender ? 'red' : '',
                                                ...(dobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                            }}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                                    {!hasNicInput && 'Enter National ID or passport number first — then date of birth and gender.'}
                                    {hasNicInput && nicLocksDobGender &&
                                        'Date of birth and gender are set from your NIC. Clear the ID field or use passport format to change them manually.'}
                                    {hasNicInput && !nicLocksDobGender &&
                                        'Enter DOB and gender manually for passport. Typing a valid NIC updates both fields from your ID and locks them.'}
                                </p>
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
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.email ? 'red' : '' }} />
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
                                            {REGISTER_MATRIMONIAL_ACCOUNT_TYPES.map(type => (
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
                                        id="registerRememberLoginTab"
                                        checked={registerRememberMe}
                                        onChange={(e) => setRegisterRememberMe(e.target.checked)}
                                    />
                                    <label htmlFor="registerRememberLoginTab">Remember me on this device</label>
                                </div>
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="termsLogin"
                                        checked={loginTermsAccepted}
                                        onChange={(e) => setLoginTermsAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="termsLogin">
                                        I agree to the{' '}
                                        <Link href="/terms-of-service" className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
                                            Terms of Service
                                        </Link>
                                        {' '}and{' '}
                                        <Link href="/privacy-policy" className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
                                            Privacy Policy
                                        </Link>
                                    </label>
                                </div>
                                {registerError && (
                                    <RegisterErrorBox
                                        message={registerError}
                                        onContinuePending={handleContinuePendingVerification}
                                        continueLoading={continuePendingLoading}
                                    />
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        opacity: (loginTermsAccepted && !isLoading) ? 1 : 0.5,
                                        cursor: isLoading ? 'wait' : (loginTermsAccepted ? 'pointer' : 'not-allowed'),
                                    }}
                                    type="submit"
                                    disabled={isLoading}
                                    aria-disabled={!loginTermsAccepted || isLoading}
                                >
                                    {isLoading ? 'Registering...' : 'Create Free Account →'}
                                </button>
                                </form>
                                <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-light)', fontSize: '0.9rem' }}>
                                    Already have an account?{' '}
                                    <a
                                        href="#"
                                        style={{ color: 'var(--primary)' }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setLoginTab('login');
                                        }}
                                    >
                                        Login
                                    </a>
                                </p>
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
                                    {verificationResumeHint && (
                                        <p style={{ textAlign: 'center', marginBottom: '1.25rem', marginTop: '-1rem', padding: '0.65rem 0.75rem', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', color: '#9a3412', fontSize: '0.88rem', lineHeight: 1.45 }}>
                                            {verificationResumeHint}
                                        </p>
                                    )}
                                </div>

                                {!codeSent ? (
                                    <div className="verification-methods">
                                        {verifyResendSecondsLeft > 0 && (
                                            <p
                                                style={{
                                                    textAlign: 'center',
                                                    color: 'var(--text-light)',
                                                    fontSize: '0.88rem',
                                                    marginBottom: '1rem',
                                                }}
                                                aria-live="polite"
                                            >
                                                Next code in{' '}
                                                <strong
                                                    style={{
                                                        fontVariantNumeric: 'tabular-nums',
                                                        color: 'var(--text-dark)',
                                                        fontSize: '1.15rem',
                                                        letterSpacing: '0.04em',
                                                    }}
                                                >
                                                    {formatSecondsMmSs(verifyResendSecondsLeft)}
                                                </strong>
                                            </p>
                                        )}
                                        <div className="verification-method-card"
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('Email')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
                                            }}
                                            >
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
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('Phone')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
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
                                            onClick={() =>
                                                !isSendingCode &&
                                                verifyResendSecondsLeft === 0 &&
                                                handleSendVerificationCode('WhatsApp')
                                            }
                                            style={{
                                                cursor:
                                                    isSendingCode || verifyResendSecondsLeft > 0 ? 'not-allowed' : 'pointer',
                                                opacity: isSendingCode || verifyResendSecondsLeft > 0 ? 0.6 : 1,
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
                                            {verifyResendSecondsLeft > 0 ? (
                                                <>
                                                    <p
                                                        style={{ fontSize: '0.88rem', color: 'var(--text-light)', margin: '0 0 0.6rem' }}
                                                        aria-live="polite"
                                                    >
                                                        Next code in{' '}
                                                        <strong
                                                            style={{
                                                                fontVariantNumeric: 'tabular-nums',
                                                                color: 'var(--text-dark)',
                                                                fontSize: '1.15rem',
                                                                letterSpacing: '0.04em',
                                                            }}
                                                        >
                                                            {formatSecondsMmSs(verifyResendSecondsLeft)}
                                                        </strong>
                                                    </p>
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="resend-button"
                                                            aria-disabled="true"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--primary)',
                                                                cursor: 'not-allowed',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '500',
                                                                opacity: 0.45,
                                                            }}
                                                        >
                                                            Resend Code
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="resend-button"
                                                            aria-disabled="true"
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                color: 'var(--text-light)',
                                                                cursor: 'not-allowed',
                                                                textDecoration: 'underline',
                                                                fontSize: '0.9rem',
                                                                fontWeight: '500',
                                                                opacity: 0.45,
                                                            }}
                                                        >
                                                            Change Method
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
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
                                                            opacity: isSendingCode ? 0.5 : 1,
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
                                                            opacity: (isSendingCode || isVerifying) ? 0.5 : 1,
                                                        }}
                                                    >
                                                        Change Method
                                                    </button>
                                                </div>
                                            )}
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

                                <form
                                    style={{ margin: 0 }}
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (isLoading) return;
                                        if (!termsAccepted) {
                                            setRegisterError(
                                                'Please agree to the Terms of Service and Privacy Policy to continue.',
                                            );
                                            return;
                                        }
                                        void handleRegister();
                                    }}
                                >
                                <div className="form-row flex-col sm:flex-row flex sm:gap-4">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={handleFirstNameChange} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={handleLastNameChange} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.lastName ? 'red' : '' }} />
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
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                            disabled={dobGenderDisabled}
                                            title={dobGenderTitle}
                                            style={{
                                                borderColor: errors.dob ? 'red' : '',
                                                ...(dobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                            }}
                                        />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                            disabled={dobGenderDisabled}
                                            title={dobGenderTitle}
                                            style={{
                                                borderColor: errors.gender ? 'red' : '',
                                                ...(dobGenderDisabled ? { backgroundColor: '#f8fafc', cursor: 'not-allowed' } : {}),
                                            }}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                                    {!hasNicInput && 'Enter National ID or passport number first — then date of birth and gender.'}
                                    {hasNicInput && nicLocksDobGender &&
                                        'Date of birth and gender are set from your NIC. Clear the ID field or use passport format to change them manually.'}
                                    {hasNicInput && !nicLocksDobGender &&
                                        'Enter DOB and gender manually for passport. Typing a valid NIC updates both fields from your ID and locks them.'}
                                </p>
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
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={AUTH_FIELD_MAX_LENGTH} style={{ borderColor: errors.email ? 'red' : '' }} />
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
                                            {REGISTER_MATRIMONIAL_ACCOUNT_TYPES.map(type => (
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
                                        id="registerRememberStandalone"
                                        checked={registerRememberMe}
                                        onChange={(e) => setRegisterRememberMe(e.target.checked)}
                                    />
                                    <label htmlFor="registerRememberStandalone">Remember me on this device</label>
                                </div>
                                <div className="checkbox-group">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                    />
                                    <label htmlFor="terms">
                                        I agree to the{' '}
                                        <Link href="/terms-of-service" className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
                                            Terms of Service
                                        </Link>
                                        {' '}and{' '}
                                        <Link href="/privacy-policy" className="font-medium text-primary underline underline-offset-2 hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
                                            Privacy Policy
                                        </Link>
                                    </label>
                                </div>
                                {registerError && (
                                    <RegisterErrorBox
                                        message={registerError}
                                        onContinuePending={handleContinuePendingVerification}
                                        continueLoading={continuePendingLoading}
                                    />
                                )}
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'center',
                                        opacity: (termsAccepted && !isLoading) ? 1 : 0.5,
                                        cursor: isLoading ? 'wait' : (termsAccepted ? 'pointer' : 'not-allowed'),
                                    }}
                                    type="submit"
                                    disabled={isLoading}
                                    aria-disabled={!termsAccepted || isLoading}
                                >
                                    {isLoading ? 'Registering...' : 'Create Free Account →'}
                                </button>
                                </form>
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
                        <h2>{user?.accountType === 'Matchmaker' ? 'Matchmaker Plans' : 'Choose Subscription Plan'}</h2>
                        <p>{user?.accountType === 'Matchmaker'
                            ? 'Compare Free, Gold, and Diamond — same plans as on our homepage pricing section.'
                            : 'Compare Free and Premium — same plans and features as on our homepage pricing section.'}</p>
                    </div>
                    <div className="modal-body">
                        {subscriptionPackagesLoading ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>Loading plans…</p>
                        ) : subscriptionPackages.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-light)' }}>
                                No plans are available right now. Please try again later.
                            </p>
                        ) : (
                            <>
                                <SubscriptionPlanPicker
                                    packages={subscriptionPackages}
                                    selectedPackageId={selectedSubscriptionPackageId}
                                    onSelectPackage={setSelectedSubscriptionPackageId}
                                    isMatchmaker={user?.accountType === 'Matchmaker'}
                                    user={user}
                                    currentPackageLabel="Your current package"
                                />

                                <div style={{ marginTop: '1.5rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                                        disabled={
                                            !selectedSubscriptionPackage ||
                                            selectedIsCurrentPlan ||
                                            (!!selectedSubscriptionPackage &&
                                                !isFreePackage(selectedSubscriptionPackage) &&
                                                !selectedCanCheckout)
                                        }
                                        onClick={async () => {
                                            if (!selectedSubscriptionPackage || selectedIsCurrentPlan) return;
                                            if (isFreePackage(selectedSubscriptionPackage)) {
                                                requestFreePlanSwitch();
                                                return;
                                            }
                                            if (!canUserCheckoutSubscriptionPackage(selectedSubscriptionPackage, subscriptionPackages, user)) {
                                                showToast('You already have premium. Switch to the free plan first to change packages.', 'info');
                                                return;
                                            }
                                            onClose();
                                            const plan = resolveCheckoutPlan(selectedSubscriptionPackage);
                                            const amt = packagePrice(selectedSubscriptionPackage);
                                            router.push(
                                                `/subscription/checkout?plan=${encodeURIComponent(plan)}&amount=${amt}`
                                            );
                                        }}
                                    >
                                        {selectedIsCurrentPlan
                                            ? 'Current plan'
                                            : selectedSubscriptionPackage && isFreePackage(selectedSubscriptionPackage)
                                              ? 'Continue on Free plan'
                                              : userHasActivePremiumPlan(user)
                                                ? 'Switch to free plan to change'
                                                : 'Continue to Payment'}
                                    </button>
                                    <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                        🔒 Secure payment • Plans and prices are managed in backoffice
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showFreePlanConfirmModal ? (
                <div
                    className="modal-overlay modal-overlay--stacked active"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="free-plan-confirm-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isSwitchingToFreePlan) {
                            setShowFreePlanConfirmModal(false);
                        }
                    }}
                >
                    <div className="modal" style={{ maxWidth: '480px', width: '95%' }}>
                        <button
                            type="button"
                            className="modal-close"
                            onClick={() => !isSwitchingToFreePlan && setShowFreePlanConfirmModal(false)}
                            aria-label="Close"
                            disabled={isSwitchingToFreePlan}
                        >
                            ✕
                        </button>
                        <div className="modal-header">
                            <h2 id="free-plan-confirm-title" style={{ color: '#92400e' }}>
                                Continue on the free plan?
                            </h2>
                        </div>
                        <div className="modal-body">
                            <p
                                style={{
                                    marginBottom: '1rem',
                                    fontSize: '0.88rem',
                                    color: '#92400e',
                                    background: '#fffbeb',
                                    padding: '0.75rem 0.9rem',
                                    borderRadius: '8px',
                                    border: '1px solid #fcd34d',
                                    lineHeight: 1.5,
                                }}
                            >
                                {PREMIUM_PLAN_LOCK_NOTICE}
                            </p>
                            <p style={{ marginBottom: '1rem', color: '#374151', lineHeight: 1.55 }}>
                                {freePlanWarningMessage}
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setShowFreePlanConfirmModal(false)}
                                    disabled={isSwitchingToFreePlan}
                                >
                                    Keep premium
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmFreePlanSwitch()}
                                    disabled={isSwitchingToFreePlan}
                                    style={{
                                        padding: '0.6rem 1.1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #b45309',
                                        background: isSwitchingToFreePlan ? '#fde68a' : 'white',
                                        color: '#92400e',
                                        fontWeight: 600,
                                        cursor: isSwitchingToFreePlan ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isSwitchingToFreePlan ? 'Switching…' : 'Yes, continue on free plan'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Profile Detail Modal */}
            <div className={`modal-overlay profile-detail-modal ${activeModal === 'profile' ? 'active' : ''}`} id="profileDetailModal" onClick={handleOverlayClick}>
                <div className="modal" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
                    <button className="modal-close" onClick={close}>✕</button>

                    {selectedProfile ? (
                        <div className="profile-detail-content">
                            {selectedProfile.viewAsOthers && (
                                <div
                                    role="status"
                                    style={{
                                        marginBottom: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '10px',
                                        background: '#eff6ff',
                                        border: '1px solid #bfdbfe',
                                        color: '#1e3a8a',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.45,
                                    }}
                                >
                                    <strong>Public preview</strong>
                                    {' — '}
                                    This is how your profile looks to other members on browse and search (your edit screens are unchanged).
                                </div>
                            )}
                            {(selectedProfile.usesMatchmakerPeekMode || selectedProfile.UsesMatchmakerPeekMode) && (
                                <div
                                    role="status"
                                    style={{
                                        marginBottom: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '10px',
                                        background: '#fef9c3',
                                        border: '1px solid #fde047',
                                        color: '#713f12',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.45,
                                    }}
                                >
                                    <strong>Basic matchmaker preview</strong>
                                    {' — '}
                                    You are seeing limited profile details without contact information. Upgrade to Matchmaker Gold or
                                    Diamond for full profiles, messaging, and client accounts.
                                    {typeof selectedProfile.remainingMatchmakerFullProfileViews === 'number' ||
                                    typeof selectedProfile.RemainingMatchmakerFullProfileViews === 'number'
                                        ? (
                                            <>
                                                {' '}
                                                Full-detail views remaining today:{' '}
                                                <strong>
                                                    {selectedProfile.remainingMatchmakerFullProfileViews ??
                                                        selectedProfile.RemainingMatchmakerFullProfileViews}
                                                </strong>.
                                            </>
                                        )
                                        : null}
                                </div>
                            )}
                            {isProfileLockedByDailyLimit && (
                                <div
                                    role="alert"
                                    style={{
                                        marginBottom: '1.25rem',
                                        padding: '1.1rem 1.25rem',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #fdf8f3 0%, #fff7ed 100%)',
                                        border: '2px solid var(--primary-light, #e9c46a)',
                                        boxShadow: '0 4px 18px rgba(217, 119, 6, 0.12)',
                                    }}
                                >
                                    <strong style={{ display: 'block', fontSize: '1.05rem', color: '#92400e', marginBottom: '0.45rem' }}>
                                        You&apos;ve reached today&apos;s free profile views
                                    </strong>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', color: '#78350f', lineHeight: 1.5 }}>
                                        Free members can open up to <strong>10 profiles per day</strong>. Subscribe to unlock unlimited
                                        views, full details, contact information, and messaging.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '0.85rem 1rem', fontWeight: 600 }}
                                        onClick={() => onSwitch('subscription')}
                                    >
                                        Subscribe to see more
                                    </button>
                                </div>
                            )}
                            {/* Profile Header */}
                            <div className="profile-detail-header">
                                <div
                                    className="profile-detail-photo"
                                    style={(selectedProfile.isPremium || selectedProfile.IsPremium) ? {
                                        // Match .profile-detail-photo img (15px corners); avoid 50% ellipse vs rectangular photo.
                                        borderRadius: '15px',
                                        overflow: 'hidden',
                                        boxShadow: '0 0 0 4px #fde68a, 0 0 0 6px #d97706, 0 8px 24px rgba(217, 119, 6, 0.45)',
                                        transition: 'box-shadow 0.2s',
                                    } : undefined}
                                >
                                    <img
                                        src={selectedProfile.profilePhoto || getDefaultAvatarDataUri({
                                            firstName: selectedProfile.firstName,
                                            lastName: selectedProfile.lastName,
                                            gender: selectedProfile.gender,
                                        })}
                                        alt={`${selectedProfile.firstName || 'User'}'s Profile`}
                                    />
                                    {selectedProfile.isVerified && <span className="verified-badge-large">✓ Verified</span>}
                                </div>
                                <div className="profile-detail-summary">
                                    <h2>{selectedProfile.firstName || ''} {selectedProfile.lastName || ''}</h2>
                                    {((selectedProfile.isPremium || selectedProfile.IsPremium) || profileHasManagedBadge(selectedProfile)) && (
                                        <div style={{ marginTop: '6px', marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(selectedProfile.isPremium || selectedProfile.IsPremium) && (
                                                <PremiumBadge
                                                    variant="full"
                                                    label={premiumBadgeLabelForProfile(selectedProfile, user)}
                                                />
                                            )}
                                            {profileHasManagedBadge(selectedProfile) && (
                                                <ProfileManagedBadge profile={selectedProfile} variant="full" />
                                            )}
                                        </div>
                                    )}
                                    <p className="profile-tagline">{selectedProfile.bio || 'Looking for a caring and understanding life partner'}</p>
                                    <div className="profile-key-info">
                                        <span>{selectedProfile.age ? `${selectedProfile.age} years` : 'Age Not Specified'}</span>
                                        <span>{selectedProfile.height || 'Height Not Specified'}</span>
                                        <span>{selectedProfile.cityOfResidence || 'Location Not Specified'}</span>
                                    </div>
                                    <div className="profile-actions-row">
                                        {isProfileLockedByDailyLimit && (
                                            <p style={{ fontSize: '0.85rem', color: '#92400e', margin: '0 0 0.5rem 0', width: '100%' }}>
                                                Upgrade to keep browsing full profiles today.
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={isProfileLockedByDailyLimit || expressInterestLoading}
                                            style={
                                                isProfileLockedByDailyLimit
                                                    ? { opacity: 0.65, cursor: 'not-allowed' }
                                                    : undefined
                                            }
                                            onClick={() => {
                                                void handleExpressInterest();
                                            }}
                                        >
                                            <HeartIcon filled={isInterestExpressed} size={16} style={{ marginRight: '0.4rem', verticalAlign: '-3px' }} />{' '}
                                            {expressInterestLoading
                                                ? 'Please wait…'
                                                : isInterestExpressed
                                                  ? 'Interest expressed'
                                                  : 'Express Interest'}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            disabled={isProfileLockedByDailyLimit}
                                            style={
                                                isProfileLockedByDailyLimit
                                                    ? { opacity: 0.65, cursor: 'not-allowed' }
                                                    : undefined
                                            }
                                            onClick={handleOpenMessage}
                                        >
                                            <span>💬</span> Message
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            disabled={isProfileLockedByDailyLimit || shortlistLoading}
                                            style={
                                                isProfileLockedByDailyLimit
                                                    ? { opacity: 0.65, cursor: 'not-allowed' }
                                                    : undefined
                                            }
                                            onClick={() => {
                                                void handleToggleShortlist();
                                            }}
                                        >
                                            <BookmarkIcon
                                                filled={isShortlisted}
                                                size={16}
                                                style={{ marginRight: '0.4rem', verticalAlign: '-3px' }}
                                            />{' '}
                                            {shortlistLoading
                                                ? 'Please wait…'
                                                : isShortlisted
                                                  ? 'Shortlisted'
                                                  : 'Shortlist'}
                                        </button>
                                    </div>
                                    {profileAccessMessage && !isProfileLockedByDailyLimit && (
                                        <div style={{ marginTop: '0.75rem', color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {profileAccessMessage}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!isProfileLockedByDailyLimit && (() => {
                                // Collect any additional gallery photos uploaded by the user.
                                const galleryPhotos: string[] = [
                                    selectedProfile.upload1 || selectedProfile.Upload1 || '',
                                    selectedProfile.upload2 || selectedProfile.Upload2 || '',
                                    selectedProfile.upload3 || selectedProfile.Upload3 || '',
                                ].filter((src) => typeof src === 'string' && src.trim() !== '');
                                if (galleryPhotos.length === 0) return null;
                                return (
                                    <div className="profile-section" style={{ marginTop: '1.25rem' }}>
                                        <h3>Photos</h3>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                gap: '0.75rem',
                                            }}
                                        >
                                            {galleryPhotos.map((src, idx) => (
                                                <button
                                                    key={`${src}-${idx}`}
                                                    type="button"
                                                    onClick={() => setGalleryLightboxSrc(src)}
                                                    aria-label={`View photo ${idx + 1} larger`}
                                                    style={{
                                                        padding: 0,
                                                        border: '1px solid #eee',
                                                        borderRadius: '8px',
                                                        background: '#fafafa',
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                        aspectRatio: '1 / 1',
                                                    }}
                                                >
                                                    <img
                                                        src={src}
                                                        alt={`${selectedProfile.firstName || 'User'}'s photo ${idx + 1}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                            display: 'block',
                                                        }}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

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
                                            <div className="info-item"><label>Eating Habits</label><span>{partnerPreferenceHabitDisplay(selectedProfile.partnerEatingHabits ?? selectedProfile.PartnerEatingHabits)}</span></div>
                                            <div className="info-item"><label>Drinking Habits</label><span>{partnerPreferenceHabitDisplay(selectedProfile.partnerDrinkingHabits ?? selectedProfile.PartnerDrinkingHabits)}</span></div>
                                            <div className="info-item"><label>Smoking Habits</label><span>{partnerPreferenceHabitDisplay(selectedProfile.partnerSmokingHabits ?? selectedProfile.PartnerSmokingHabits)}</span></div>
                                            <div className="info-item"><label>Religion</label><span>{selectedProfile.partnerReligion || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Education</label><span>{selectedProfile.partnerQualificationLevel || 'Not Specified'}</span></div>
                                            <div className="info-item"><label>Country of Origin</label><span><CountryResidenceDisplay value={selectedProfile.partnerCountryOfOrigin ?? selectedProfile.PartnerCountryOfOrigin} /></span></div>
                                            <div className="info-item"><label>Country of Residence</label><span><CountryResidenceDisplay value={selectedProfile.partnerCountryOfResidence ?? selectedProfile.PartnerCountryOfResidence} /></span></div>
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Additional Requirements</h3>
                                        <p className="about-text">{selectedProfile.partnerPreferences || 'This user has not specified their additional partner preferences yet.'}</p>
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

            {/* Gallery photo lightbox (sits above the profile modal) */}
            {galleryLightboxSrc && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Photo viewer"
                    onClick={() => setGalleryLightboxSrc(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem',
                    }}
                >
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setGalleryLightboxSrc(null); }}
                        aria-label="Close photo viewer"
                        style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'rgba(255,255,255,0.95)',
                            color: '#111',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        ✕
                    </button>
                    <img
                        src={galleryLightboxSrc}
                        alt="Profile photo enlarged"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            background: '#000',
                        }}
                    />
                </div>
            )}

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

            <ManagedSubAccountActionPicker
                open={managedActionPicker.open}
                subAccounts={subAccounts}
                accountType={user?.accountType}
                action={managedActionPicker.action}
                selectedId={managedActionPicker.selectedId}
                onSelect={managedActionPicker.setSelectedId}
                onConfirm={() => void managedActionPicker.confirmPicker()}
                onCancel={managedActionPicker.cancelPicker}
            />
        </>
    );
}
