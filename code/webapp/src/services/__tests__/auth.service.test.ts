import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../auth.service'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('login', () => {
        it('calls POST /auth/login with email credentials', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: {
                        token: 'jwt-token-123',
                        token_type: 'Bearer',
                        user: { id: 1, name: 'Admin', email: 'admin@test.com' },
                    },
                },
            }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const credentials = { email: 'admin@test.com', password: 'secret123' }
            const result = await authService.login(credentials)

            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials)
            expect(result).toEqual(mockResponse.data)
        })

        it('calls POST /auth/login with phone credentials', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: {
                        token: 'jwt-token-456',
                        token_type: 'Bearer',
                        user: { id: 2, name: 'User', email: 'user@test.com' },
                    },
                },
            }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const credentials = { phone: '5551234567', password: 'secret123' }
            const result = await authService.login(credentials)

            expect(apiClient.post).toHaveBeenCalledWith('/auth/login', credentials)
            expect(result).toEqual(mockResponse.data)
        })
    })

    describe('register', () => {
        it('calls POST /auth/register with user data', async () => {
            const mockResponse = {
                data: {
                    status: 201,
                    data: {
                        token: 'jwt-token-new',
                        token_type: 'Bearer',
                        user: { id: 3, name: 'New User', email: 'new@test.com' },
                    },
                },
            }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const registerData = {
                first_name: 'New',
                last_name: 'User',
                email: 'new@test.com',
                password: 'password123',
                password_confirmation: 'password123',
            }
            const result = await authService.register(registerData)

            expect(apiClient.post).toHaveBeenCalledWith('/auth/register', registerData)
            expect(result).toEqual(mockResponse.data)
        })
    })

    describe('logout', () => {
        it('calls POST /auth/logout', async () => {
            vi.mocked(apiClient.post).mockResolvedValue({})

            await authService.logout()

            expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')
        })
    })

    describe('getMe', () => {
        it('calls GET /auth/me and returns user data', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: {
                        id: 1,
                        name: 'Admin User',
                        email: 'admin@sushigo.com',
                        email_verified_at: '2026-01-01T00:00:00Z',
                        created_at: '2026-01-01T00:00:00Z',
                        updated_at: '2026-01-01T00:00:00Z',
                    },
                },
            }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await authService.getMe()

            expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
            expect(result).toEqual(mockResponse.data)
        })
    })
})
