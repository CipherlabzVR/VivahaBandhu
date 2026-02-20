'use client';

import { useState, useEffect, MouseEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { matrimonialService } from '../services/matrimonialService';
import WelcomePopup from './WelcomePopup';
import Image from 'next/image';

interface ModalsProps {
    activeModal: 'login' | 'register' | 'subscription' | 'profile' | 'blog' | null;
    onClose: () => void;
    onSwitch: (modal: 'login' | 'register' | 'subscription' | 'profile' | 'blog') => void;
    selectedBlogId?: number | null;
    registerAsMatchmaker?: boolean;
}

export default function Modals({ activeModal, onClose, onSwitch, selectedBlogId = null, registerAsMatchmaker = false }: ModalsProps) {
    const { login } = useAuth();
    const router = useRouter();
    const [loginTab, setLoginTab] = useState<'login' | 'register'>('login');
    const [profileTab, setProfileTab] = useState('about');
    const [registerAccountType, setRegisterAccountType] = useState('Self');
    const [subscriptionOption, setSubscriptionOption] = useState('3 Months');
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
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [loginTermsAccepted, setLoginTermsAccepted] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Verification states
    const [showVerification, setShowVerification] = useState(false);
    const [registeredUserId, setRegisteredUserId] = useState<number | null>(null);
    const [verificationMethod, setVerificationMethod] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState('');
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

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!firstName) newErrors.firstName = 'First Name is required';
        if (!lastName) newErrors.lastName = 'Last Name is required';
        if (!nic) newErrors.nic = 'NIC/Passport is required';
        if (!dob) newErrors.dob = 'Date of Birth is required';
        if (!gender) newErrors.gender = 'Gender is required';
        if (!phone) newErrors.phone = 'Phone Number is required';
        if (!email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
        }
        if (!password) newErrors.password = 'Password is required';
        if (password && password.length < 6) newErrors.password = 'Password must be at least 6 characters';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setRegisterError(null);

        try {
            // Format date of birth to ISO string
            const dateOfBirth = new Date(dob).toISOString();

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
                setVerificationCode(''); // Reset verification code
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
                const user = {
                    id: response.result.id.toString(),
                    firstName: response.result.firstName,
                    lastName: response.result.lastName,
                    email: response.result.email || response.result.username || loginEmail,
                    phone: response.result.mobileNumber || '',
                };

                login(user);

                // Store token
                if (response.result.accessToken) {
                    localStorage.setItem('token', response.result.accessToken);
                }

                onClose();
                router.push('/profile');
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

    const parseNIC = (nicNumber: string) => {
        let year = "", dayText = "", gender = "";
        if (nicNumber.length === 10 && !isNaN(Number(nicNumber.substring(0, 9)))) {
            year = "19" + nicNumber.substring(0, 2);
            dayText = nicNumber.substring(2, 5);
        } else if (nicNumber.length === 12 && !isNaN(Number(nicNumber.substring(0, 12)))) {
            year = nicNumber.substring(0, 4);
            dayText = nicNumber.substring(4, 7);
        } else {
            return null;
        }

        let dayOfYear = parseInt(dayText);
        if (dayOfYear > 500) {
            gender = "Female";
            dayOfYear -= 500;
        } else {
            gender = "Male";
        }

        // Validate dayOfYear to be within 1-366 range
        if (dayOfYear < 1 || dayOfYear > 366) return null;

        const date = new Date(Number(year), 0); // Start at Jan 1st of the year
        date.setDate(dayOfYear); // Add days

        // Format to YYYY-MM-DD for input type="date"
        const formattedDate = date.toISOString().split('T')[0];
        return { dob: formattedDate, gender };
    };

    const handleNicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
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
        setVerificationMethod('');
        setVerificationCode('');
        setVerificationError(null);
        setSendCodeError(null);
        setCodeSent(false);
        setIsSendingCode(false);
        setIsVerifying(false);
        setShowVerification(false);
        // After welcome popup closes, redirect to homepage
        router.push('/');
    };

    const close = () => {
        // Don't reset welcome popup state if it should be shown
        // Only reset if welcome popup is not active
        if (!showWelcomePopup) {
            setShowVerification(false);
            setRegisteredUserId(null);
            setVerificationMethod('');
            setVerificationCode('');
            setVerificationError(null);
            setSendCodeError(null);
            setCodeSent(false);
            setIsSendingCode(false);
            setIsVerifying(false);
            setRegisteredFirstName('');
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
            if (response.statusCode === 200) {
                // Verification successful - login user and show welcome popup
                const newUser = {
                    id: registeredUserId.toString(),
                    firstName,
                    lastName,
                    email,
                    nic,
                    dob,
                    gender,
                    phone,
                    whatsapp: isWhatsAppSame ? phone : whatsapp,
                    accountType: registerAccountType,
                };

                login(newUser);
                
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
        setVerificationCode('');
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
            <div className={`modal-overlay ${activeModal === 'login' ? 'active' : ''}`} id="loginModal" onClick={handleOverlayClick}>
                <div className="modal">
                    <button className="modal-close" onClick={close}>✕</button>
                    <div className="modal-header">
                        <h2>Welcome Back</h2>
                        <p>Login to continue your journey</p>
                    </div>
                    <div className="modal-body">
                        <div className="login-tabs">
                            <button className={`login-tab ${loginTab === 'login' ? 'active' : ''}`} onClick={() => setLoginTab('login')}>Login</button>
                            <button className={`login-tab ${loginTab === 'register' ? 'active' : ''}`} onClick={() => setLoginTab('register')}>Register</button>
                        </div>

                        {loginTab === 'login' ? (
                            <div id="loginTab" className="tab-content active">
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
                                    <a href="#" style={{ color: 'var(--primary)' }}>Forgot Password?</a>
                                </p>
                                <div className="divider">
                                    <span>or continue with</span>
                                </div>
                                <div className="social-login">
                                    <button className="social-btn">G</button>
                                    <button className="social-btn">f</button>
                                </div>
                            </div>
                        ) : showVerification ? (
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
                                            <div className="code-input-wrapper">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <input
                                                        key={index}
                                                        type="text"
                                                        className="code-digit"
                                                        maxLength={1}
                                                        value={verificationCode[index] || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '');
                                                            if (value) {
                                                                const newCode = verificationCode.split('');
                                                                newCode[index] = value;
                                                                const updatedCode = newCode.join('').slice(0, 6);
                                                                setVerificationCode(updatedCode);
                                                                setVerificationError(null);

                                                                // Auto-focus next input
                                                                if (index < 5 && value) {
                                                                    const nextInput = document.querySelector(`.code-digit:nth-child(${index + 2})`) as HTMLInputElement;
                                                                    nextInput?.focus();
                                                                }
                                                            }
                                                        }}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                                                            if (pastedData.length > 0) {
                                                                setVerificationCode(pastedData);
                                                                setVerificationError(null);
                                                                // Focus the last filled input or the first empty one
                                                                const focusIndex = Math.min(pastedData.length - 1, 5);
                                                                const nextInput = document.querySelector(`.code-digit:nth-child(${focusIndex + 1})`) as HTMLInputElement;
                                                                nextInput?.focus();
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                                                                const prevInput = document.querySelector(`.code-digit:nth-child(${index})`) as HTMLInputElement;
                                                                prevInput?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            borderColor: verificationError ? '#ef4444' : (verificationCode[index] ? 'var(--primary)' : 'var(--cream-dark)')
                                                        }}
                                                        disabled={isVerifying}
                                                    />
                                                ))}
                                            </div>
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
                                                opacity: (verificationCode.length === 6 && !isVerifying) ? 1 : 0.5,
                                                cursor: (verificationCode.length === 6 && !isVerifying) ? 'pointer' : 'not-allowed',
                                                position: 'relative'
                                            }}
                                            disabled={verificationCode.length !== 6 || isVerifying}
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div id="registerTab" className="tab-content active" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                <p style={{ textAlign: 'center', marginBottom: '1rem' }}>Create a new account to get started</p>

                                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ borderColor: errors.lastName ? 'red' : '' }} />
                                        {errors.lastName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.lastName}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>National ID / Passport No *</label>
                                    <input type="text" placeholder="NIC or Passport Number" value={nic} onChange={handleNicChange} maxLength={12} style={{ borderColor: errors.nic ? 'red' : '' }} />
                                    {errors.nic && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.nic}</span>}
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Date of Birth *</label>
                                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ borderColor: errors.dob ? 'red' : '' }} />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ borderColor: errors.gender ? 'red' : '' }}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input type="tel" placeholder="+94 XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ borderColor: errors.phone ? 'red' : '' }} />
                                    {errors.phone && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp Number *</label>
                                    <input type="tel" placeholder="+94 XX XXX XXXX" disabled={isWhatsAppSame} value={isWhatsAppSame ? phone : whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                                    <div className="checkbox-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        <input
                                            type="checkbox"
                                            id="sameAsPhoneLogin"
                                            checked={isWhatsAppSame}
                                            onChange={(e) => {
                                                setIsWhatsAppSame(e.target.checked);
                                                if (e.target.checked) setWhatsapp(phone);
                                            }}
                                        />
                                        <label htmlFor="sameAsPhoneLogin" style={{ fontSize: '0.9rem' }}>Same as Phone Number</label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: errors.email ? 'red' : '' }} />
                                    {errors.email && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Password *</label>
                                    <input type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ borderColor: errors.password ? 'red' : '' }} />
                                    {errors.password && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.password}</span>}
                                </div>
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
            <div className={`modal-overlay ${activeModal === 'register' ? 'active' : ''}`} id="registerModal" onClick={handleOverlayClick}>
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
                                            <div className="code-input-wrapper">
                                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                                    <input
                                                        key={index}
                                                        type="text"
                                                        className="code-digit"
                                                        maxLength={1}
                                                        value={verificationCode[index] || ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value.replace(/\D/g, '');
                                                            if (value) {
                                                                const newCode = verificationCode.split('');
                                                                newCode[index] = value;
                                                                const updatedCode = newCode.join('').slice(0, 6);
                                                                setVerificationCode(updatedCode);
                                                                setVerificationError(null);

                                                                // Auto-focus next input
                                                                if (index < 5 && value) {
                                                                    const nextInput = document.querySelector(`.code-digit:nth-child(${index + 2})`) as HTMLInputElement;
                                                                    nextInput?.focus();
                                                                }
                                                            }
                                                        }}
                                                        onPaste={(e) => {
                                                            e.preventDefault();
                                                            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                                                            if (pastedData.length > 0) {
                                                                setVerificationCode(pastedData);
                                                                setVerificationError(null);
                                                                // Focus the last filled input or the first empty one
                                                                const focusIndex = Math.min(pastedData.length - 1, 5);
                                                                const nextInput = document.querySelector(`.code-digit:nth-child(${focusIndex + 1})`) as HTMLInputElement;
                                                                nextInput?.focus();
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
                                                                const prevInput = document.querySelector(`.code-digit:nth-child(${index})`) as HTMLInputElement;
                                                                prevInput?.focus();
                                                            }
                                                        }}
                                                        style={{
                                                            borderColor: verificationError ? '#ef4444' : (verificationCode[index] ? 'var(--primary)' : 'var(--cream-dark)')
                                                        }}
                                                        disabled={isVerifying}
                                                    />
                                                ))}
                                            </div>
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
                                                opacity: (verificationCode.length === 6 && !isVerifying) ? 1 : 0.5,
                                                cursor: (verificationCode.length === 6 && !isVerifying) ? 'pointer' : 'not-allowed',
                                                position: 'relative'
                                            }}
                                            disabled={verificationCode.length !== 6 || isVerifying}
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

                                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>First Name *</label>
                                        <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ borderColor: errors.firstName ? 'red' : '' }} />
                                        {errors.firstName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Last Name *</label>
                                        <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ borderColor: errors.lastName ? 'red' : '' }} />
                                        {errors.lastName && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.lastName}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>National ID / Passport No *</label>
                                    <input type="text" placeholder="NIC or Passport Number" value={nic} onChange={handleNicChange} maxLength={12} style={{ borderColor: errors.nic ? 'red' : '' }} />
                                    {errors.nic && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.nic}</span>}
                                </div>
                                <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Date of Birth *</label>
                                        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={{ borderColor: errors.dob ? 'red' : '' }} />
                                        {errors.dob && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.dob}</span>}
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>Gender *</label>
                                        <select value={gender} onChange={(e) => setGender(e.target.value)} style={{ borderColor: errors.gender ? 'red' : '' }}>
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        {errors.gender && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.gender}</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Phone Number *</label>
                                    <input type="tel" placeholder="+94 XX XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ borderColor: errors.phone ? 'red' : '' }} />
                                    {errors.phone && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone}</span>}
                                </div>
                                <div className="form-group">
                                    <label>WhatsApp Number *</label>
                                    <input type="tel" placeholder="+94 XX XXX XXXX" disabled={isWhatsAppSame} value={isWhatsAppSame ? phone : whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                                    <div className="checkbox-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                                        <input
                                            type="checkbox"
                                            id="sameAsPhone"
                                            checked={isWhatsAppSame}
                                            onChange={(e) => {
                                                setIsWhatsAppSame(e.target.checked);
                                                if (e.target.checked) setWhatsapp(phone);
                                            }}
                                        />
                                        <label htmlFor="sameAsPhone" style={{ fontSize: '0.9rem' }}>Same as Phone Number</label>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email Address *</label>
                                    <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: errors.email ? 'red' : '' }} />
                                    {errors.email && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</span>}
                                </div>
                                <div className="form-group">
                                    <label>Password *</label>
                                    <input type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ borderColor: errors.password ? 'red' : '' }} />
                                    {errors.password && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.password}</span>}
                                </div>
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
                        <h2>Upgrade to Premium</h2>
                        <p>Unlock all features and find your perfect match faster</p>
                    </div>
                    <div className="modal-body">
                        <div className="subscription-comparison">
                            <div className={`sub-option ${subscriptionOption === '1 Month' ? 'selected' : ''}`} onClick={() => setSubscriptionOption('1 Month')}>
                                <h4>1 Month</h4>
                                <div className="price">LKR 1,200<span>/mo</span></div>
                                <p>Basic access</p>
                            </div>
                            <div className={`sub-option recommended ${subscriptionOption === '3 Months' ? 'selected' : ''}`} onClick={() => setSubscriptionOption('3 Months')}>
                                <h4>3 Months</h4>
                                <div className="price">LKR 833<span>/mo</span></div>
                                <p>Save 30% • Most popular</p>
                            </div>
                            <div className={`sub-option ${subscriptionOption === '6 Months' ? 'selected' : ''}`} onClick={() => setSubscriptionOption('6 Months')}>
                                <h4>6 Months</h4>
                                <div className="price">LKR 650<span>/mo</span></div>
                                <p>Save 45%</p>
                            </div>
                        </div>

                        <div className="features-unlocked">
                            <h4>🔓 Features You&apos;ll Unlock</h4>
                            <div className="unlock-grid">
                                <div className="unlock-item"><span>✓</span> View unlimited profiles</div>
                                <div className="unlock-item"><span>✓</span> See contact details</div>
                                <div className="unlock-item"><span>✓</span> Send interest requests</div>
                                <div className="unlock-item"><span>✓</span> Chat with matches</div>
                                <div className="unlock-item"><span>✓</span> Advanced filters</div>
                                <div className="unlock-item"><span>✓</span> See who viewed you</div>
                                <div className="unlock-item"><span>✓</span> Profile highlights</div>
                                <div className="unlock-item"><span>✓</span> Priority support</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                                onClick={() => {
                                    // Simulate upgrade success
                                    onClose();
                                    router.push('/search');
                                }}
                            >
                                Continue to Payment
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
                <div className="modal" style={{ maxWidth: '900px' }}>
                    <button className="modal-close" onClick={close}>✕</button>

                    <div className="profile-detail-content">
                        {/* Profile Header */}
                        <div className="profile-detail-header">
                            <div className="profile-detail-photo">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300" alt="Profile" />
                                <span className="verified-badge-large">✓ Verified</span>
                            </div>
                            <div className="profile-detail-summary">
                                <h2>Shahan Madhumal M</h2>
                                <p className="profile-tagline">Looking for a caring and understanding life partner</p>
                                <div className="profile-key-info">
                                    <span>31 years</span>
                                    <span>5&apos; 4&quot; (162 cm)</span>
                                    <span>Kamagaya-shi, Japan</span>
                                </div>
                                <div className="profile-actions-row">
                                    <button className="btn btn-primary"><span>❤️</span> Express Interest</button>
                                    <button className="btn btn-outline"><span>💬</span> Message</button>
                                    <button className="btn btn-outline"><span>⭐</span> Shortlist</button>
                                </div>
                                <p className="match-score">92% Match with your preferences</p>
                            </div>
                        </div>

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
                                        <div className="info-item"><label>Full Name</label><span>Shahan Madhumal M</span></div>
                                        <div className="info-item"><label>Age</label><span>31 years</span></div>
                                        <div className="info-item"><label>Height</label><span>5&apos; 4&quot; (162 cm)</span></div>
                                        <div className="info-item"><label>Weight</label><span>65 kg</span></div>
                                        <div className="info-item"><label>Body Type</label><span>Average</span></div>
                                        <div className="info-item"><label>Complexion</label><span>Fair</span></div>
                                        <div className="info-item"><label>Marital Status</label><span>Never Married</span></div>
                                        <div className="info-item"><label>Mother Tongue</label><span>Sinhala</span></div>
                                    </div>
                                </div>
                                <div className="profile-section">
                                    <h3>Religion & Ethnicity</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Religion</label><span>Buddhist</span></div>
                                        <div className="info-item"><label>Caste</label><span>Govi</span></div>
                                        <div className="info-item"><label>Ethnicity</label><span>Sinhalese</span></div>
                                        <div className="info-item"><label>Horoscope</label><span>Required</span></div>
                                    </div>
                                </div>
                                <div className="profile-section">
                                    <h3>Education & Profession</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Education</label><span>Bachelor&apos;s Degree in Business</span></div>
                                        <div className="info-item"><label>Profession</label><span>Business Owner</span></div>
                                        <div className="info-item"><label>Annual Income</label><span>LKR 50-75 Lakhs</span></div>
                                        <div className="info-item"><label>Working Location</label><span>Japan</span></div>
                                    </div>
                                </div>
                                <div className="profile-section">
                                    <h3>Location</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Country</label><span>Japan</span></div>
                                        <div className="info-item"><label>City</label><span>Kamagaya-shi</span></div>
                                        <div className="info-item"><label>Hometown</label><span>Colombo, Sri Lanka</span></div>
                                        <div className="info-item"><label>Citizenship</label><span>Sri Lankan</span></div>
                                    </div>
                                </div>
                                <div className="profile-section">
                                    <h3>About Me</h3>
                                    <p className="about-text">I am a dedicated business owner currently residing in Japan. I value family traditions and am looking for a life partner who shares similar values. I enjoy traveling, reading, and spending quality time with loved ones. I believe in mutual respect, trust, and understanding as the foundation of a successful marriage.</p>
                                </div>
                            </div>
                        )}

                        {/* Family Tab */}
                        {profileTab === 'family' && (
                            <div className="profile-tab-content active">
                                <div className="profile-section">
                                    <h3>Family Details</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Family Type</label><span>Nuclear Family</span></div>
                                        <div className="info-item"><label>Family Status</label><span>Middle Class</span></div>
                                        <div className="info-item"><label>Family Values</label><span>Traditional</span></div>
                                        <div className="info-item"><label>Father&apos;s Occupation</label><span>Retired Government Officer</span></div>
                                        <div className="info-item"><label>Mother&apos;s Occupation</label><span>Homemaker</span></div>
                                        <div className="info-item"><label>Siblings</label><span>1 Brother, 1 Sister (Both Married)</span></div>
                                    </div>
                                </div>
                                <div className="profile-section">
                                    <h3>Family Location</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Native Place</label><span>Colombo</span></div>
                                        <div className="info-item"><label>Family Living In</label><span>Sri Lanka</span></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lifestyle Tab */}
                        {profileTab === 'lifestyle' && (
                            <div className="profile-tab-content active">
                                {/* ... content for habits, likes, dislikes, hobbies, traits ... */}
                                {/* Simplified for brevity but keeping structure */}
                                <div className="profile-section">
                                    <h3>Habits</h3>
                                    <div className="habits-grid">
                                        <div className="habit-item"><span className="habit-icon">🍽️</span><div className="habit-info"><label>Food Preference</label><span>Non-Vegetarian</span></div></div>
                                        <div className="habit-item"><span className="habit-icon">🚬</span><div className="habit-info"><label>Smoking</label><span>Non-Smoker</span></div></div>
                                        <div className="habit-item"><span className="habit-icon">🍺</span><div className="habit-info"><label>Drinking</label><span>Occasionally</span></div></div>
                                        <div className="habit-item"><span className="habit-icon">🏋️</span><div className="habit-info"><label>Exercise</label><span>Regular</span></div></div>
                                    </div>
                                </div>
                                {/* ... */}
                            </div>
                        )}

                        {/* Partner Tab */}
                        {profileTab === 'partner' && (
                            <div className="profile-tab-content active">
                                {/* ... partner preferences ... */}
                                <div className="profile-section">
                                    <h3>Basic Preferences</h3>
                                    <div className="info-grid">
                                        <div className="info-item"><label>Age</label><span>22 - 28 years</span></div>
                                        <div className="info-item"><label>Height</label><span>5&apos; 0&quot; - 5&apos; 6&quot;</span></div>
                                        <div className="info-item"><label>Marital Status</label><span>Never Married</span></div>
                                        <div className="info-item"><label>Body Type</label><span>Slim, Average</span></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Contact Section - Blur Logic */}
                        <div className="contact-section blurred-section">
                            <div className="contact-blur-overlay">
                                <span>🔒</span>
                                <h4>Upgrade to View Contact Details</h4>
                                <p>Subscribe to premium to view phone numbers and connect directly</p>
                                <button className="btn btn-primary" onClick={() => onSwitch('subscription')}>Upgrade Now</button>
                            </div>
                            <div className="contact-info-hidden">
                                <div className="contact-item">
                                    <span>📱</span>
                                    <div><label>Mobile</label><span>+81 XX XXX XXXX</span></div>
                                </div>
                                <div className="contact-item">
                                    <span>📧</span>
                                    <div><label>Email</label><span>sha***@gmail.com</span></div>
                                </div>
                            </div>
                        </div>

                    </div>
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
                                            src="https://images.unsplash.com/photo-1511285560982-1356c11d4606?w=1200" 
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
                                            src="https://images.unsplash.com/photo-1519225421980-715cb0202128?w=1200" 
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
                                            src="https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200" 
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
