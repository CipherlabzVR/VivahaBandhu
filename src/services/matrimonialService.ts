const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:5004/api';

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
        username?: string;
        accessToken: string;
        status: number;
        userType?: number;
    };
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
     * Get detailed profile by user ID
     */
    async getProfile(userId: number): Promise<any> {
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/GetProfile?userId=${userId}`, {
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
        try {
            const response = await fetch(`${API_BASE_URL}/Matrimonial/SendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ senderId, receiverId, content })
            });
            if (!response.ok) throw new Error('Failed to send message');
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
    }
};

