import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AxiosResponse } from 'axios'

// Mock apiClient before importing the module under test
vi.mock('@/lib/api-client', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

vi.mock('@/lib/api-error', () => ({
    isApiError: vi.fn(),
}))

// Import after mocks are registered
import { apiClient } from '@/lib/api-client'
import { isApiError } from '@/lib/api-error'
import { listDevUsers, loginAs } from '../dev-api'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockIsApiError = vi.mocked(isApiError)

function make404Error() {
    return { response: { status: 404 }, isAxiosError: true }
}

function make500Error() {
    return { response: { status: 500 }, isAxiosError: true }
}

describe('listDevUsers', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns the data array on a successful response', async () => {
        const users = [
            { id: 1, name: 'Admin', email: 'admin@test.com', roles: ['admin'] },
            { id: 2, name: 'Staff', email: 'staff@test.com', roles: ['inventory-manager'] },
        ]
        mockGet.mockResolvedValueOnce({
            data: { status: 200, data: users },
        } as AxiosResponse)

        const result = await listDevUsers()

        expect(mockGet).toHaveBeenCalledWith('/dev/users')
        expect(result).toEqual(users)
    })

    it('returns null when the API responds with 404', async () => {
        const err = make404Error()
        mockGet.mockRejectedValueOnce(err)
        mockIsApiError.mockReturnValueOnce(true)

        const result = await listDevUsers()

        expect(result).toBeNull()
    })

    it('rethrows errors that are not 404', async () => {
        const err = make500Error()
        mockGet.mockRejectedValueOnce(err)
        mockIsApiError.mockReturnValueOnce(true)

        await expect(listDevUsers()).rejects.toEqual(err)
    })

    it('rethrows non-API errors (network failure)', async () => {
        const networkErr = new Error('Network Error')
        mockGet.mockRejectedValueOnce(networkErr)
        mockIsApiError.mockReturnValueOnce(false)

        await expect(listDevUsers()).rejects.toThrow('Network Error')
    })
})

describe('loginAs', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns auth data on a successful login', async () => {
        const authData = {
            token: 'tok-abc123',
            token_type: 'Bearer',
            user: { id: 5, name: 'Test User', email: 'test@test.com' },
        }
        mockPost.mockResolvedValueOnce({
            data: { status: 200, data: authData },
        } as AxiosResponse)

        const result = await loginAs(5)

        expect(mockPost).toHaveBeenCalledWith('/dev/login', { user_id: 5 })
        expect(result).toEqual(authData)
    })

    it('returns null when the API responds with 404', async () => {
        const err = make404Error()
        mockPost.mockRejectedValueOnce(err)
        mockIsApiError.mockReturnValueOnce(true)

        const result = await loginAs(99)

        expect(result).toBeNull()
    })

    it('rethrows errors that are not 404', async () => {
        const err = make500Error()
        mockPost.mockRejectedValueOnce(err)
        mockIsApiError.mockReturnValueOnce(true)

        await expect(loginAs(1)).rejects.toEqual(err)
    })

    it('rethrows non-API errors (network failure)', async () => {
        const networkErr = new Error('Network Error')
        mockPost.mockRejectedValueOnce(networkErr)
        mockIsApiError.mockReturnValueOnce(false)

        await expect(loginAs(1)).rejects.toThrow('Network Error')
    })
})
