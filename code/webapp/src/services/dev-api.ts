import { apiClient } from '@/lib/api-client';
import type { AuthResponse } from './auth.service';

export interface DevUser {
    id: number;
    name: string;
    email: string;
    roles: string[];
}

interface DevUsersResponse {
    status: number;
    data: DevUser[];
}

export async function listDevUsers(): Promise<DevUser[] | null> {
    try {
        const response = await apiClient.get<DevUsersResponse>('/dev/users');
        return response.data.data;
    } catch {
        // Feature disabled or unavailable — fail silently
        return null;
    }
}

export async function loginAs(userId: number): Promise<AuthResponse['data'] | null> {
    try {
        const response = await apiClient.post<AuthResponse>('/dev/login', { user_id: userId });
        return response.data.data;
    } catch {
        // Feature disabled or unavailable — fail silently
        return null;
    }
}
