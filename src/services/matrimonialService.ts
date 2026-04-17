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
        userId: number;
        email: string;
        firstName: string;
        lastName: string;
        accountType: string;
        message: string;
    };
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
     * Login for matrimonial users (uses existing User/SignIn endpoint)
     */
    async login(data: MatrimonialLoginRequest): Promise<MatrimonialLoginResponse> {
        try {
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Login failed: ${response.statusText}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred during login');
        }
    },

    /**
     * Send verification code via selected method
     */
    async sendVerificationCode(userId: number, method: string): Promise<{ statusCode: number; message: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SendVerificationCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    method,
                }),
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
     * Verify the code
     */
    async verifyCode(userId: number, code: string): Promise<{ statusCode: number; message: string }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/VerifyCode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    code,
                }),
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

    async searchRecoveryAccounts(name: string): Promise<{ statusCode: number; message: string; result: RecoveryAccount[] }> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SearchRecoveryAccounts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to search accounts: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while searching accounts');
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to start forgot password: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while starting forgot password');
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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Failed to reset password: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred while resetting password');
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

    async activateMockSubscription(userId: number, mockReference: string): Promise<any> {
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
                    mockReference
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

