import { getStoredToken } from '../utils/authStorage';
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
    async getRecentProfiles(count: number = 4): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetRecentProfiles?count=${count}`, {
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
    async getRecentPremiumProfiles(count: number = 4): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetRecentPremiumProfiles?count=${count}`, {
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
     * Send a matrimonial message
     */
    async sendMessage(senderId: number, receiverId: number, content: string): Promise<any> {
        if (!senderId || !receiverId) {
            throw new Error('Invalid sender or receiver ID');
        }
        try {
            const token = getStoredToken();
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    SenderId: senderId,
                    ReceiverId: receiverId,
                    Content: content
                })
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
    async getConversation(userId: number, otherUserId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetConversation?userId=${userId}&otherUserId=${otherUserId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error('Failed to fetch conversation');
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async toggleFavorite(userId: number, profileId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ToggleFavorite?userId=${userId}&profileId=${profileId}`, {
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

    async toggleShortlist(userId: number, profileId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/ToggleShortlist?userId=${userId}&profileId=${profileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getInterestNotifications(userId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetInterestNotifications?userId=${userId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
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

    /**
     * Get sub-accounts for a parent user
     */
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
     * Cancel the current user's premium subscription. The user remains registered and
     * can re-subscribe later; only the SUBSCRIPTION_ACTIVE flag is cleared.
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
     * Persist the user's notification preferences (currently only the
     * "email me when someone shows interest" toggle) to the server.
     */
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

    async activateMockSubscription(userId: number, mockReference: string, subscriptionPlan?: string): Promise<any> {
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
                    ...(subscriptionPlan ? { subscriptionPlan } : {})
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

    /** Active membership packages for pricing page (no auth). */
    async getPublicPackages(): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetPublicPackages`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
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
     * Register this site's origin with the backend CORS allowlist (called from the landing page).
     */
    async saveCorsLink(webLink: string, isActive: boolean = true): Promise<void> {
        try {
            await fetch(`${API_BASE_URL}/AppSetting/SaveCorsLink`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ webLink, isActive }),
            });
        } catch {
            // Non-blocking: landing page must render even if registration fails (offline, CORS during dev, etc.)
        }
    },

    async submitBankTransfer(userId: number, amount: number, paySlipBase64: string, remarks?: string): Promise<any> {
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
                    remarks
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
    }
};

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

    const subscriptionExpiresAt =
        accountType === 'Matchmaker'
            ? toIsoExpiry(mx.MatchmakerSubscriptionUntilUtc ?? mx.matchmakerSubscriptionUntilUtc)
            : toIsoExpiry(mx.SelfPremiumSubscriptionUntilUtc ?? mx.selfPremiumSubscriptionUntilUtc);

    const maxCli = mx.MatchmakerMaxClientProfiles ?? mx.matchmakerMaxClientProfiles;
    const cntCli = mx.MatchmakerClientProfileCount ?? mx.matchmakerClientProfileCount;
    const canAdd = mx.MatchmakerCanAddClients ?? mx.matchmakerCanAddClients;
    const remViews = mx.MatchmakerDailyFullProfileViewsRemaining ?? mx.matchmakerDailyFullProfileViewsRemaining;

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
    };
}

