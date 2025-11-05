import { apiClient } from '@/lib/api-client';

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface AuthResponse {
    status: number;
    data: {
        token: string;
        token_type: string;
        user: User;
    };
}

export interface ApiError {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
}

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    async register(data: RegisterData): Promise<AuthResponse> {
        const response = await apiClient.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    async logout(): Promise<void> {
        await apiClient.post('/auth/logout');
    },

    async getMe(): Promise<{ status: number; data: User }> {
        const response = await apiClient.get<{ status: number; data: User }>('/auth/me');
        return response.data;
    },
};
