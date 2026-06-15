import { getStoredToken } from '../utils/authStorage';
import { isFamilyParentAccountType } from '../utils/matrimonialAccountTypes';
import { normalizePublicPackages, packagePrice, type PublicMatrimonialPackage } from '../utils/matrimonialPackages';
import { ensureCorsOriginRegistered } from '../utils/corsBootstrap';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://developerqa.openskylabz.com/api';

export interface MatrimonialRegisterRequest {
    firstName: string;
    lastName: string;
    nic: string;
    dateOfBirth: string; // ISO date string
    gender: string;
    phone: string;
    whatsApp?: string;
    email: string;
    password: string;
    accountType: string;
    profilePhotoBase64?: string;
    parentUserId?: number;
}

export interface MatrimonialRegisterResponse {
    statusCode: number;
    message: string;
    result: {
        /** Present until OTP verification completes; account is created only after VerifyCode succeeds. */
        registrationSessionId?: string;
        RegistrationSessionId?: string;
        userId?: number;
        email?: string;
        firstName?: string;
        lastName?: string;
        accountType?: string;
        message?: string;
        resumeVerification?: boolean;
        ResumeVerification?: boolean;
    };
}

/** Live totals for the homepage hero statistics panel */
export interface PublicHeroStats {
    verifiedProfilesCount: number;
    successStoriesCount: number;
    trustedMatchmakersCount: number;
}

export interface MatrimonialLoginRequest {
    email: string;
    password: string;
}

export interface MatrimonialLoginResponse {
    statusCode: number;
    message: string;
    result: {
        id: number;
        email?: string;
        firstName: string;
        lastName: string;
        mobileNumber?: string;
        phoneNumber?: string;
        username?: string;
        accessToken: string;
        status: number;
        userType?: number;

        // Matrimonial extra fields (API can return different casing)
        WhatsApp?: string;
        whatsApp?: string;
        whatsapp?: string;

        nic?: string;
        Nic?: string;
        nicNumber?: string;
        identityDocument?: string;
        IdentityDocument?: string;

        DateOfBirth?: string;
        dateofBirth?: string;
        dateOfBirth?: string;
        dob?: string;

        Gender?: string;
        gender?: string;

        AccountType?: string;
        accountType?: string;
        role?: string;

        ProfilePhoto?: string;
        profilePhoto?: string;

        HoroscopeDocument?: string;
        horoscopeDocument?: string;
        HoroscopeDocument2?: string;
        horoscopeDocument2?: string;
        HoroscopeDocument3?: string;
        horoscopeDocument3?: string;

        ParentUserId?: number | null;
        parentUserId?: number | null;

        matrimonialExtras?: Record<string, unknown>;
        MatrimonialExtras?: Record<string, unknown>;
    };
}

export interface RecoveryAccount {
    userId: number;
    fullName: string;
    email?: string | null;
    phoneNumber?: string | null;
    whatsApp?: string | null;
    verifiedBy?: 'Email' | 'Phone' | 'WhatsApp' | string;
}

export interface ForgotPasswordInitiateRequest {
    userId?: number;
    email?: string;
    phoneNumber?: string;
    whatsApp?: string;
    /** Matches forgot-password UI: email | phone | whatsapp */
    deliveryMethod: 'email' | 'phone' | 'whatsapp';
}

export interface ForgotPasswordResetRequest {
    userId: number;
    code: string;
    newPassword: string;
    confirmPassword: string;
}

export const matrimonialService = {
    /**
     * Register a new matrimonial user
     */
    async register(data: MatrimonialRegisterRequest): Promise<MatrimonialRegisterResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/Register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    nic: data.nic,
                    dateOfBirth: data.dateOfBirth,
                    gender: data.gender,
                    phone: data.phone,
                    whatsApp: data.whatsApp || data.phone,
                    email: data.email,
                    password: data.password,
                    accountType: data.accountType,
                    profilePhotoBase64: data.profilePhotoBase64,
                    parentUserId: data.parentUserId,
                }),
            });

            if (!response.ok) {
                let errorMessage = `Registration failed: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    // Handle ErrorResponse format: { statusCode, message }
                    errorMessage = errorData.message || errorData.Message || errorMessage;
                } catch (parseError) {
                    // If JSON parsing fails, use the default message
                    // Silently handle parse errors
                }
                // Create error object without throwing immediately to avoid console noise
                const error = new Error(errorMessage);
                // Set a custom property to identify this as an API error
                (error as any).isApiError = true;
                throw error;
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred during registration');
        }
    },

    /**
     * Resume a pending registration: returns registrationSessionId when an unverified session exists for this email/NIC.
     */
    async getPendingRegistrationSession(params: { email: string; nic?: string }): Promise<MatrimonialRegisterResponse> {
        const response = await fetch(`${API_BASE_URL}/Matrimonial/GetPendingRegistrationSession`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: params.email.trim(),
                nic: params.nic?.trim() ?? '',
            }),
        });

        let data: MatrimonialRegisterResponse;
        try {
            data = await response.json();
        } catch {
            throw new Error('Invalid response from server.');
        }

        if (!response.ok) {
            const msg = data?.message || `Request failed: ${response.statusText}`;
            const err = new Error(msg);
            (err as Error & { isApiError?: boolean }).isApiError = true;
            throw err;
        }

        return data;
    },

    /**
     * Login for matrimonial users (uses existing User/SignIn endpoint)
     */
    async login(data: MatrimonialLoginRequest): Promise<MatrimonialLoginResponse> {
        const response = await fetch(`${API_BASE_URL}/User/SignIn`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
            }),
        });

        let body: Record<string, unknown> = {};
        try {
            body = (await response.json()) as Record<string, unknown>;
        } catch {
            body = {};
        }

        const apiMsg = String(body.message ?? body.Message ?? '').trim();

        if (!response.ok) {
            const fallback =
                apiMsg ||
                (response.status === 401
                    ? 'Invalid email or password.'
                    : `Sign-in failed (${response.status}). Please try again.`);
            throw new Error(fallback);
        }

        return body as unknown as MatrimonialLoginResponse;
    },

    /**
     * Send verification code via selected method (existing user **or** pending registration session).
     */
    async sendVerificationCode(params: {
        method: string;
        userId?: number;
        registrationSessionId?: string;
    }): Promise<{ statusCode: number; message: string }> {
        try {
            const body: Record<string, unknown> = { method: params.method };
            if (params.registrationSessionId) {
                body.registrationSessionId = params.registrationSessionId;
            } else if (params.userId != null && params.userId > 0) {
                body.userId = params.userId;
            }

            const response = await fetch(`${API_BASE_URL}/Matrimonial/SendVerificationCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to send verification code: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while sending verification code');
        }
    },

    /**
     * Verify the code (existing user **or** complete pending registration and create the account).
     */
    async verifyCode(params: {
        code: string;
        userId?: number;
        registrationSessionId?: string;
    }): Promise<{ statusCode: number; message: string; result?: { userId?: number; verified?: boolean } }> {
        try {
            const body: Record<string, unknown> = { code: params.code };
            if (params.registrationSessionId) {
                body.registrationSessionId = params.registrationSessionId;
            } else if (params.userId != null && params.userId > 0) {
                body.userId = params.userId;
            }

            const response = await fetch(`${API_BASE_URL}/Matrimonial/VerifyCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Verification failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred during verification');
        }
    },

    async requestPhoneChangeOtp(newPhone: string): Promise<{ statusCode: number; message: string; result?: { maskedPhone?: string } }> {
        try {
            const token = getStoredToken();
            if (!token) {
                throw new Error('Please sign in again.');
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/RequestPhoneChangeOtp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ newPhone }),
            });
            const data = (await response.json().catch(() => ({}))) as { message?: string; statusCode?: number };
            if (!response.ok) {
                throw new Error(data.message || `Failed to send code (${response.status})`);
            }
            return data as { statusCode: number; message: string; result?: { maskedPhone?: string } };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while sending the phone verification code.');
        }
    },

    async confirmPhoneChange(code: string): Promise<{ statusCode: number; message: string; result?: { phoneNumber?: string; userId?: number } }> {
        try {
            const token = getStoredToken();
            if (!token) {
                throw new Error('Please sign in again.');
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ConfirmPhoneChange`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code }),
            });
            const data = (await response.json().catch(() => ({}))) as { message?: string; statusCode?: number };
            if (!response.ok) {
                throw new Error(data.message || `Verification failed (${response.status})`);
            }
            return data as { statusCode: number; message: string; result?: { phoneNumber?: string; userId?: number } };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while confirming the phone number.');
        }
    },

    async searchRecoveryAccounts(name: string): Promise<{ statusCode: number; message: string; result: RecoveryAccount[] }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SearchRecoveryAccounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            const payload = (await response.json().catch(() => ({}))) as { message?: string };

            if (!response.ok) {
                throw new Error(payload.message?.trim() || `Could not search accounts (${response.status}).`);
            }

            return payload as { statusCode: number; message: string; result: RecoveryAccount[] };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while searching accounts.');
        }
    },

    async initiateForgotPassword(data: ForgotPasswordInitiateRequest): Promise<{ statusCode: number; message: string; result?: { userId: number; sentVia: string } }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/InitiateForgotPassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const payload = (await response.json().catch(() => ({}))) as { message?: string; statusCode?: number; result?: { userId: number; sentVia: string } };

            if (!response.ok) {
                throw new Error(payload.message?.trim() || `Could not send verification code (${response.status}).`);
            }

            return payload as { statusCode: number; message: string; result?: { userId: number; sentVia: string } };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while starting forgot password.');
        }
    },

    async resetForgotPasswordWithCode(data: ForgotPasswordResetRequest): Promise<{ statusCode: number; message: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ResetForgotPasswordWithCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const payload = (await response.json().catch(() => ({}))) as { message?: string; statusCode?: number };

            if (!response.ok) {
                throw new Error(payload.message?.trim() || `Could not update password (${response.status}).`);
            }

            return payload as { statusCode: number; message: string };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while resetting password.');
        }
    },

    /**
     * Get recent registered profiles
     */
    async getRecentProfiles(count: number = 4, viewerUserId?: number): Promise<any> {
        try {
            const viewerQuery =
                viewerUserId != null && Number.isFinite(viewerUserId) && viewerUserId > 0
                    ? `&viewerUserId=${viewerUserId}`
                    : '';
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetRecentProfiles?count=${count}${viewerQuery}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch recent profiles: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while fetching recent profiles');
        }
    },

    /**
     * Recent profiles that currently have an active subscription (premium).
     */
    async getRecentPremiumProfiles(count: number = 4, viewerUserId?: number): Promise<any> {
        try {
            const viewerQuery =
                viewerUserId != null && Number.isFinite(viewerUserId) && viewerUserId > 0
                    ? `&viewerUserId=${viewerUserId}`
                    : '';
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetRecentPremiumProfiles?count=${count}${viewerQuery}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch premium profiles: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while fetching premium profiles');
        }
    },

    /**
     * Get matched profiles for a user based on their partner preferences
     */
    async getMatchedProfiles(userId: number, count: number = 4): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetMatchedProfiles?userId=${userId}&count=${count}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch matched profiles: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while fetching matched profiles');
        }
    },

    /**
     * Search profiles with filters
     */
    async searchProfiles(filters: any): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SearchProfiles`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(filters)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return {
                    statusCode: response.status || 0,
                    message: errorData.message || `Failed to search profiles: ${response.statusText}`,
                    result: {
                        profiles: [],
                        totalCount: 0,
                    },
                };
            }
            return await response.json();
        } catch (error) {
            const fallbackMessage =
                error instanceof Error
                    ? error.message
                    : 'Unable to reach server. Please check your internet connection and try again.';
            return {
                statusCode: 0,
                message: fallbackMessage,
                result: {
                    profiles: [],
                    totalCount: 0,
                },
            };
        }
    },

    /**
     * Get detailed profile by user ID
     */
    async getProfile(userId: number, requesterUserId?: number, applyViewLimit: boolean = false): Promise<any> {
        try {
            const query = new URLSearchParams({
                userId: String(userId),
                ...(requesterUserId ? { requesterUserId: String(requesterUserId) } : {}),
                applyViewLimit: String(applyViewLimit),
            });

            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetProfile?${query.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to fetch profile: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while fetching the profile');
        }
    },

    /**
     * Turn matrimonial direct chat on or off (persisted; blocks others from sending when off).
     */
    async setMatrimonialChatEnabled(userId: number, isMatrimonialChatEnabled: boolean): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SetMatrimonialChatEnabled`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    UserId: userId,
                    IsMatrimonialChatEnabled: isMatrimonialChatEnabled,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    (data as { message?: string }).message || 'Failed to update chat preference'
                );
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Premium only: show or hide phone / WhatsApp / email from viewers who would normally see them.
     */
    async setMatrimonialShowContactInformation(userId: number, showContactInformation: boolean): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SetMatrimonialShowContactInformation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    UserId: userId,
                    ShowContactInformation: showContactInformation,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    (data as { message?: string }).message || 'Failed to update contact visibility'
                );
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Persist browse visibility and profile-photo visibility preferences.
     */
    async setMatrimonialPrivacyPreferences(
        userId: number,
        showInBrowse: boolean,
        photoVisibility: 'everyone' | 'premium',
    ): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SetMatrimonialPrivacyPreferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    UserId: userId,
                    ShowInBrowse: showInBrowse,
                    PhotoVisibility: photoVisibility,
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(
                    (data as { message?: string }).message || 'Failed to update privacy preferences'
                );
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    async sendMessage(
        senderId: number,
        receiverId: number,
        content: string,
        managedProfileUserId?: number | null
    ): Promise<any> {
        if (!senderId || !receiverId) {
            throw new Error('Invalid sender or receiver ID');
        }
        try {
            const token = getStoredToken();
            const body: Record<string, unknown> = {
                SenderId: senderId,
                ReceiverId: receiverId,
                Content: content,
            };
            const managedId = managedProfileUserId != null ? Number(managedProfileUserId) : null;
            if (managedId != null && Number.isFinite(managedId) && managedId > 0) {
                body.ManagedProfileUserId = managedId;
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to send message');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /** Send horoscope document(s) as a structured message in an existing conversation. */
    async shareHoroscope(
        senderId: number,
        receiverId: number,
        managedProfileUserId?: number | null
    ): Promise<any> {
        if (!senderId || !receiverId) {
            throw new Error('Invalid sender or receiver ID');
        }
        try {
            const token = getStoredToken();
            const body: Record<string, unknown> = {
                SenderId: senderId,
                ReceiverId: receiverId,
            };
            const managedId = managedProfileUserId != null ? Number(managedProfileUserId) : null;
            if (managedId != null && Number.isFinite(managedId) && managedId > 0) {
                body.ManagedProfileUserId = managedId;
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ShareHoroscope`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to share horoscope');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get inbox conversations
     */
    async getInbox(userId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetInbox?userId=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch inbox');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get single conversation
     */
    async getConversation(userId: number, otherUserId: number, managedProfileUserId?: number | null): Promise<any> {
        try {
            const params = new URLSearchParams({
                userId: String(userId),
                otherUserId: String(otherUserId),
            });
            const managedId = managedProfileUserId != null ? Number(managedProfileUserId) : null;
            if (managedId != null && Number.isFinite(managedId) && managedId > 0) {
                params.set('managedProfileUserId', String(managedId));
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetConversation?${params.toString()}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch conversation');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async toggleFavorite(
        userId: number,
        profileId: number,
        managedProfileUserId?: number | null
    ): Promise<any> {
        try {
            const params = new URLSearchParams({
                userId: String(userId),
                profileId: String(profileId),
            });
            const managedId =
                managedProfileUserId != null ? Number(managedProfileUserId) : null;
            if (managedId != null && Number.isFinite(managedId) && managedId > 0) {
                params.set('managedProfileUserId', String(managedId));
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ToggleFavorite?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /** When the viewer already favourites the sender, call instead of ToggleFavorite so the sender still gets "interest back" notifications. */
    async notifyInterestBack(actorUserId: number, originalInterestSenderUserId: number): Promise<any> {
        try {
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/NotifyInterestBack?actorUserId=${actorUserId}&originalInterestSenderUserId=${originalInterestSenderUserId}`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' } }
            );
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async toggleShortlist(
        userId: number,
        profileId: number,
        managedProfileUserId?: number | null
    ): Promise<any> {
        try {
            const params = new URLSearchParams({
                userId: String(userId),
                profileId: String(profileId),
            });
            const managedId =
                managedProfileUserId != null ? Number(managedProfileUserId) : null;
            if (managedId != null && Number.isFinite(managedId) && managedId > 0) {
                params.set('managedProfileUserId', String(managedId));
            }
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ToggleShortlist?${params.toString()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getInterestNotifications(userId: number, options?: { unreadOnly?: boolean }): Promise<any> {
        try {
            const unreadOnly = options?.unreadOnly === true;
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/GetInterestNotifications?userId=${userId}${unreadOnly ? '&unreadOnly=true' : ''}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getUserInteractions(userId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetUserInteractions?userId=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async deleteMessage(messageId: number, userId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/DeleteMessage?messageId=${messageId}&userId=${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete message');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getSubAccounts(parentUserId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetSubAccounts?parentUserId=${parentUserId}`, {
                method: 'GET',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) throw new Error('Failed to fetch sub-accounts');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getManagedSubAccountsActivity(parentUserId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetManagedSubAccountsActivity?parentUserId=${parentUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
            });
            if (!response.ok) throw new Error('Failed to fetch managed profile activity');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async createManagedSubProfile(payload: Record<string, unknown>): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/CreateManagedSubProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to create managed profile');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    async updateManagedSubProfile(payload: Record<string, unknown>): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/UpdateManagedSubProfile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || data?.Message || 'Failed to update managed profile');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Delete a sub-account (managed/client profile) created under the given parent user.
     * Removes related matrimonial profile, messages, favourites, shortlists and notifications.
     */
    async deleteSubAccount(parentUserId: number, subUserId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/DeleteSubAccount?parentUserId=${parentUserId}&subUserId=${subUserId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to delete sub-account: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cancel the current user's premium subscription. If the paid period is still
     * ongoing the cancel takes effect at the period end: premium features stay usable
     * until then and the user can reactivate before the end date.
     */
    async cancelSubscription(userId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/CancelSubscription?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to cancel subscription');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Undo a cancel-at-period-end while the paid period is still ongoing.
     * If the period has already expired the backend asks the user to subscribe again.
     */
    async reactivateSubscription(userId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ReactivateSubscription?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to reactivate subscription');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Persist the user's notification preferences (currently only the
     * "email me when someone shows interest" toggle) to the server.
     */
    /** One-click unsubscribe from interest emails using the token from an email link. */
    async unsubscribeInterestEmails(userId: number, token: string): Promise<any> {
        try {
            const params = new URLSearchParams({
                userId: String(userId),
                token,
            });
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/UnsubscribeInterestEmails?${params.toString()}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.message || data.Message || 'Could not unsubscribe');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    async updateNotificationPreferences(userId: number, emailOnInterest: boolean): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/UpdateNotificationPreferences?userId=${userId}&emailOnInterest=${emailOnInterest}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update preferences');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Permanently delete the calling user's own account and all associated data
     * (profile, messages, favourites, shortlists, notifications, managed sub-accounts).
     * IRREVERSIBLE — caller MUST confirm with the user first.
     */
    async deleteOwnAccount(userId: number): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/DeleteOwnAccount?userId=${userId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete account');
            }
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async purchaseAdditionalFamilySubAccountSlot(userId: number, mockReference?: string): Promise<any> {
        try {
            const token = getStoredToken();
            const params = new URLSearchParams({ userId: String(userId) });
            if (mockReference) params.append('mockReference', mockReference);
            const response = await fetch(`${API_BASE_URL}/Matrimonial/PurchaseAdditionalFamilySubAccountSlot?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data?.message || 'Failed to purchase additional sub-account slot');
            }
            return data;
        } catch (error) {
            throw error;
        }
    },

    async activateMockSubscription(
        userId: number,
        mockReference: string,
        subscriptionPlan?: string,
        amount?: number,
    ): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ActivateMockSubscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    userId,
                    mockReference,
                    ...(subscriptionPlan ? { subscriptionPlan } : {}),
                    ...(amount != null && Number.isFinite(amount) ? { amount } : {}),
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to activate mock subscription');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get matrimonial dashboard statistics
     */
    async getDashboardStats(): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetMatrimonialDashboardStats`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch dashboard stats');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async submitContactForm(payload: {
        firstName?: string;
        lastName?: string;
        email: string;
        message: string;
        sourcePath?: string;
    }): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SubmitContactForm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    FirstName: payload.firstName ?? '',
                    LastName: payload.lastName ?? '',
                    Email: payload.email,
                    Message: payload.message,
                    SourcePath: payload.sourcePath ?? '/contact',
                }),
            });
            return await response.json();
        } catch {
            return { statusCode: 0, message: 'Network error' };
        }
    },

    /** Active membership packages for pricing page (no auth). */
    async getPublicPackages(audience: 'user' | 'matchmaker' | 'sub_account' = 'user'): Promise<any> {
        try {
            const response = await fetch(
                `${API_BASE_URL}/Matrimonial/GetPublicPackages?audience=${encodeURIComponent(audience)}`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                }
            );
            if (!response.ok) {
                return { statusCode: response.status, result: [] };
            }
            return await response.json();
        } catch {
            return { statusCode: 0, result: [] };
        }
    },

    /** Public hero counters — verified profiles, active success stories, active matchmaker users */
    async getPublicHeroStats(): Promise<{
        statusCode: number;
        result?: Partial<PublicHeroStats>;
        Result?: Partial<PublicHeroStats>;
    }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetPublicHeroStats`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                return { statusCode: response.status };
            }
            return await response.json();
        } catch {
            return { statusCode: 0 };
        }
    },

    /**
     * Register this site's origin with the backend CORS allowlist.
     * Uses window.location.origin (actual host/port), not NEXT_PUBLIC_SITE_URL.
     */
    async saveCorsLink(_webLink?: string, _isActive: boolean = true): Promise<void> {
        await ensureCorsOriginRegistered();
    },

    async submitBankTransfer(
        userId: number,
        amount: number,
        paySlipBase64: string,
        remarks?: string,
        paymentPurpose?: 'premium' | 'sub_account' | 'matchmaker',
    ): Promise<any> {
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SubmitBankTransfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    userId,
                    amount,
                    paySlipBase64,
                    remarks,
                    paymentPurpose,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to submit bank transfer');
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getMatchmakerPackages(): Promise<PublicMatrimonialPackage[]> {
        const res = await this.getPublicPackages('matchmaker');
        const list = normalizePublicPackages(res?.result ?? res?.Result);
        return [...list].sort((a, b) => {
            const popA = (a.isPopular ?? a.IsPopular) ? 1 : 0;
            const popB = (b.isPopular ?? b.IsPopular) ? 1 : 0;
            if (popB !== popA) return popB - popA;
            return packagePrice(a) - packagePrice(b);
        });
    },

    async getSubAccountPackages(): Promise<PublicMatrimonialPackage[]> {
        const res = await this.getPublicPackages('sub_account');
        const list = normalizePublicPackages(res?.result ?? res?.Result);
        return [...list].sort((a, b) => {
            const popA = (a.isPopular ?? a.IsPopular) ? 1 : 0;
            const popB = (b.isPopular ?? b.IsPopular) ? 1 : 0;
            if (popB !== popA) return popB - popA;
            return packagePrice(a) - packagePrice(b);
        });
    },

    async getActiveSubAccountPackage(): Promise<{ price: number; validityMonths?: number } | null> {
        const res = await this.getPublicPackages('sub_account');
        const pkgs = res?.result ?? res?.Result ?? [];
        return parseActiveSubAccountPackage(Array.isArray(pkgs) ? pkgs : []);
    },
};

/** Picks the active sub-account package shown on the website (backoffice-configured). */
export function parseActiveSubAccountPackage(pkgs: any[]): { price: number; validityMonths?: number } | null {
    if (!Array.isArray(pkgs) || pkgs.length === 0) return null;
    const sorted = [...pkgs]
        .filter((p) => p?.isActive ?? p?.IsActive ?? true)
        .sort((a, b) => {
            const popA = (a?.isPopular ?? a?.IsPopular) ? 1 : 0;
            const popB = (b?.isPopular ?? b?.IsPopular) ? 1 : 0;
            if (popB !== popA) return popB - popA;
            return (a?.sortOrder ?? a?.SortOrder ?? 0) - (b?.sortOrder ?? b?.SortOrder ?? 0);
        });
    const pkg = sorted[0];
    if (!pkg) return null;
    const price = Number(pkg.price ?? pkg.Price);
    if (!Number.isFinite(price) || price < 0) return null;
    const lifetime = !!(pkg.isLifetimeValidity ?? pkg.IsLifetimeValidity);
    const monthsRaw = pkg.validityMonths ?? pkg.ValidityMonths;
    const months = monthsRaw != null ? Number(monthsRaw) : undefined;
    return {
        price,
        validityMonths: !lifetime && months != null && Number.isFinite(months) && months > 0 ? months : undefined,
    };
}

/** Maps matrimonialExtras from `/User/SignIn` onto client `User` fields. */
export function mapUserFieldsFromSignInResult(r: Record<string, unknown> | undefined): {
    isSubscribed?: boolean;
    isPremiumSelfSubscribed?: boolean;
    matchmakerTier?: string;
    matchmakerMaxClientProfiles?: number;
    matchmakerClientProfileCount?: number;
    matchmakerCanAddClients?: boolean;
    matchmakerDailyFullProfileViewsRemaining?: number;
    subscriptionExpiresAt?: string;
    subscriptionIsLifetime?: boolean;
    subscriptionCancelled?: boolean;
    isFamilyParentAccount?: boolean;
    familySubAccountSlotsPurchased?: number;
    familySubAccountSlotsConsumed?: number;
    familySubAccountSlotsMaxTotal?: number;
    familySubAccountAdditionalAmountLkr?: number;
    familySubAccountPackageValidityMonths?: number;
} {
    if (!r || typeof r !== 'object') {
        return {};
    }
    const accountType = String(r.AccountType ?? r.accountType ?? r.role ?? '');
    const mxRaw = r.MatrimonialExtras ?? r.matrimonialExtras;
    if (!mxRaw || typeof mxRaw !== 'object') {
        return {};
    }
    const mx = mxRaw as Record<string, unknown>;
    const tierRaw = mx.MatchmakerTier ?? mx.matchmakerTier ?? 'FREE';
    const tier = String(tierRaw || 'FREE');
    const mmPaid =
        tier.toUpperCase() === 'GOLD' || tier.toUpperCase() === 'DIAMOND';
    const isPremiumSelf = !!(mx.IsPremiumSubscribed ?? mx.isPremiumSubscribed);

    const toIsoExpiry = (raw: unknown): string | undefined => {
        if (raw == null || raw === '') return undefined;
        const d = new Date(String(raw));
        return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const subscriptionIsLifetime =
        accountType === 'Matchmaker'
            ? (mx.MatchmakerSubscriptionIsLifetime ?? mx.matchmakerSubscriptionIsLifetime) === true
            : (mx.SelfPremiumSubscriptionIsLifetime ?? mx.selfPremiumSubscriptionIsLifetime) === true;

    const subscriptionExpiresAt = subscriptionIsLifetime
        ? undefined
        : accountType === 'Matchmaker'
            ? toIsoExpiry(mx.MatchmakerSubscriptionUntilUtc ?? mx.matchmakerSubscriptionUntilUtc)
            : toIsoExpiry(mx.SelfPremiumSubscriptionUntilUtc ?? mx.selfPremiumSubscriptionUntilUtc);

    const subscriptionCancelled =
        accountType === 'Matchmaker'
            ? (mx.MatchmakerSubscriptionCancelled ?? mx.matchmakerSubscriptionCancelled) === true
            : (mx.SelfPremiumSubscriptionCancelled ?? mx.selfPremiumSubscriptionCancelled) === true;

    const maxCli = mx.MatchmakerMaxClientProfiles ?? mx.matchmakerMaxClientProfiles;
    const cntCli = mx.MatchmakerClientProfileCount ?? mx.matchmakerClientProfileCount;
    const canAdd = mx.MatchmakerCanAddClients ?? mx.matchmakerCanAddClients;
    const remViews = mx.MatchmakerDailyFullProfileViewsRemaining ?? mx.matchmakerDailyFullProfileViewsRemaining;

    const isFamilyParent =
        (mx.IsFamilyParentAccount ?? mx.isFamilyParentAccount) === true ||
        isFamilyParentAccountType(accountType);
    const famPurchased = mx.FamilySubAccountSlotsPurchased ?? mx.familySubAccountSlotsPurchased;
    const famConsumed = mx.FamilySubAccountSlotsConsumed ?? mx.familySubAccountSlotsConsumed;
    const famMaxTotal = mx.FamilySubAccountSlotsMaxTotal ?? mx.familySubAccountSlotsMaxTotal;
    const famExtraCost = mx.FamilySubAccountAdditionalAmountLkr ?? mx.familySubAccountAdditionalAmountLkr;
    const famValidity = mx.FamilySubAccountPackageValidityMonths ?? mx.familySubAccountPackageValidityMonths;

    return {
        isPremiumSelfSubscribed: isPremiumSelf,
        matchmakerTier: tier,
        matchmakerMaxClientProfiles: maxCli != null ? Number(maxCli) : undefined,
        matchmakerClientProfileCount: cntCli != null ? Number(cntCli) : undefined,
        matchmakerCanAddClients:
            typeof canAdd === 'boolean' ? canAdd : typeof canAdd === 'string'
                ? canAdd === 'true'
                : undefined,
        matchmakerDailyFullProfileViewsRemaining:
            remViews != null && remViews !== '' ? Number(remViews) : undefined,
        isSubscribed:
            accountType === 'Matchmaker'
                ? mmPaid
                : isPremiumSelf,
        subscriptionExpiresAt,
        subscriptionIsLifetime,
        subscriptionCancelled,
        isFamilyParentAccount: isFamilyParent,
        familySubAccountSlotsPurchased: famPurchased != null && famPurchased !== '' ? Number(famPurchased) : undefined,
        familySubAccountSlotsConsumed: famConsumed != null && famConsumed !== '' ? Number(famConsumed) : undefined,
        familySubAccountSlotsMaxTotal: famMaxTotal != null && famMaxTotal !== '' ? Number(famMaxTotal) : undefined,
        familySubAccountAdditionalAmountLkr: famExtraCost != null && famExtraCost !== '' ? Number(famExtraCost) : undefined,
        familySubAccountPackageValidityMonths: famValidity != null && famValidity !== '' ? Number(famValidity) : undefined,
    };
}

