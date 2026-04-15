// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInitializeAfterReset = vi.fn()
const mockInvalidateQueries = vi.fn()

let mockIsAuthenticated = false
let mockIsAdmin = false
let mockDevLoginEnabled = false
let mockDevUsers: Array<{ id: number; name: string; email: string; roles: string[] }> | undefined = undefined
let mockIsLoadingDevUsers = false

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({
        user: mockIsAuthenticated ? { id: 1, name: 'User', email: 'u@test.com' } : null,
        isAuthenticated: mockIsAuthenticated,
        isAdmin: mockIsAdmin,
        token: mockIsAuthenticated ? 'tok-xxx' : null,
        initializeAfterReset: mockInitializeAfterReset,
    }),
}))

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: mockInvalidateQueries,
        getQueryCache: () => ({ getAll: () => [] }),
    }),
    useQuery: () => ({
        data: mockDevUsers,
        isLoading: mockIsLoadingDevUsers,
    }),
}))

vi.mock('../dev-login-enabled', () => ({
    isDevLoginEnabled: () => mockDevLoginEnabled,
}))

vi.mock('@/services/dev-api', () => ({
    listDevUsers: vi.fn(),
    loginAs: vi.fn(),
}))

// Import after mocks
import { loginAs } from '@/services/dev-api'
import { useDevDebugger } from '../use-dev-debugger'

const mockLoginAs = vi.mocked(loginAs)

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDebugger() {
    return renderHook(() => useDevDebugger())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDevDebugger', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        localStorage.clear()
        mockIsAuthenticated = false
        mockIsAdmin = false
        mockDevLoginEnabled = false
        mockDevUsers = undefined
        mockIsLoadingDevUsers = false
        vi.unstubAllEnvs()
    })

    afterEach(() => {
        vi.unstubAllEnvs()
    })

    describe('initial state', () => {
        it('starts visible when VITE_DEV_DEBUGGER_START_HIDDEN is not "true"', () => {
            vi.stubEnv('VITE_DEV_DEBUGGER_START_HIDDEN', 'false')
            const { result } = renderDebugger()

            expect(result.current.isHidden).toBe(false)
            expect(result.current.isMinimized).toBe(false)
        })

        it('starts hidden when VITE_DEV_DEBUGGER_START_HIDDEN is "true"', () => {
            vi.stubEnv('VITE_DEV_DEBUGGER_START_HIDDEN', 'true')
            const { result } = renderDebugger()

            expect(result.current.isHidden).toBe(true)
        })

        it('exposes user, isAuthenticated, isAdmin and token from auth store', () => {
            mockIsAuthenticated = true
            mockIsAdmin = true
            const { result } = renderDebugger()

            expect(result.current.isAuthenticated).toBe(true)
            expect(result.current.isAdmin).toBe(true)
            expect(result.current.token).toBe('tok-xxx')
        })

        it('loads saved state from localStorage', () => {
            const saved = {
                position: { x: 50, y: 80 },
                expandedSections: { user: false, roles: true, queries: false, devLogin: false },
            }
            localStorage.setItem('dev_debugger_state', JSON.stringify(saved))

            const { result } = renderDebugger()

            expect(result.current.state.position).toEqual({ x: 50, y: 80 })
            expect(result.current.state.expandedSections.roles).toBe(true)
            expect(result.current.state.expandedSections.user).toBe(false)
        })

        it('falls back to default state when localStorage is empty', () => {
            const { result } = renderDebugger()

            expect(result.current.state.expandedSections.user).toBe(true)
            expect(result.current.state.expandedSections.roles).toBe(false)
            expect(result.current.state.expandedSections.devLogin).toBe(true)
        })

        it('falls back to default state when localStorage contains invalid JSON', () => {
            localStorage.setItem('dev_debugger_state', 'not-json{')

            const { result } = renderDebugger()

            expect(result.current.state.expandedSections.user).toBe(true)
        })
    })

    describe('toggleSection', () => {
        it('expands a collapsed section', () => {
            const { result } = renderDebugger()

            act(() => {
                result.current.toggleSection('roles')
            })

            expect(result.current.state.expandedSections.roles).toBe(true)
        })

        it('collapses an expanded section', () => {
            const { result } = renderDebugger()

            // 'user' starts expanded (true) by default
            act(() => {
                result.current.toggleSection('user')
            })

            expect(result.current.state.expandedSections.user).toBe(false)
        })

        it('persists state change to localStorage', () => {
            const { result } = renderDebugger()

            act(() => {
                result.current.toggleSection('queries')
            })

            const saved = JSON.parse(localStorage.getItem('dev_debugger_state') ?? '{}')
            expect(saved.expandedSections.queries).toBe(true)
        })
    })

    describe('toggleMinimized', () => {
        it('sets isMinimized to true then false', () => {
            const { result } = renderDebugger()

            act(() => {
                result.current.toggleMinimized()
            })
            expect(result.current.isMinimized).toBe(true)

            act(() => {
                result.current.toggleMinimized()
            })
            expect(result.current.isMinimized).toBe(false)
        })
    })

    describe('refreshQueries', () => {
        it('calls queryClient.invalidateQueries()', () => {
            const { result } = renderDebugger()

            act(() => {
                result.current.refreshQueries()
            })

            expect(mockInvalidateQueries).toHaveBeenCalledTimes(1)
        })
    })

    describe('devLoginSectionVisible', () => {
        it('is false when user is already authenticated', () => {
            mockIsAuthenticated = true
            mockDevLoginEnabled = true
            mockDevUsers = [{ id: 1, name: 'A', email: 'a@t.com', roles: ['admin'] }]

            const { result } = renderDebugger()

            expect(result.current.devLoginSectionVisible).toBe(false)
        })

        it('is false when dev login is not enabled', () => {
            mockIsAuthenticated = false
            mockDevLoginEnabled = false
            mockDevUsers = [{ id: 1, name: 'A', email: 'a@t.com', roles: ['admin'] }]

            const { result } = renderDebugger()

            expect(result.current.devLoginSectionVisible).toBe(false)
        })

        it('is true while loading even if devUsers is undefined', () => {
            mockIsAuthenticated = false
            mockDevLoginEnabled = true
            mockIsLoadingDevUsers = true
            mockDevUsers = undefined

            const { result } = renderDebugger()

            expect(result.current.devLoginSectionVisible).toBe(true)
        })

        it('is true when not authenticated, enabled, and users are loaded', () => {
            mockIsAuthenticated = false
            mockDevLoginEnabled = true
            mockDevUsers = [{ id: 1, name: 'A', email: 'a@t.com', roles: ['admin'] }]

            const { result } = renderDebugger()

            expect(result.current.devLoginSectionVisible).toBe(true)
        })

        it('is false when devUsers is null (feature disabled server-side)', () => {
            mockIsAuthenticated = false
            mockDevLoginEnabled = true
            mockDevUsers = undefined // null would be falsy → same effect
            mockIsLoadingDevUsers = false

            const { result } = renderDebugger()

            expect(result.current.devLoginSectionVisible).toBe(false)
        })
    })

    describe('handleDevLogin', () => {
        it('calls loginAs and initializeAfterReset on success, then reloads', async () => {
            const devUser = { id: 3, name: 'Staff', email: 's@t.com', roles: ['inventory-manager'] }
            const authResult = {
                token: 'tok-xyz',
                token_type: 'Bearer',
                user: { id: 3, name: 'Staff', email: 's@t.com' },
            }
            mockLoginAs.mockResolvedValueOnce(authResult)

            // Mock window.location.reload
            const reloadMock = vi.fn()
            Object.defineProperty(window, 'location', {
                value: { reload: reloadMock },
                writable: true,
                configurable: true,
            })

            const { result } = renderDebugger()

            await act(async () => {
                await result.current.handleDevLogin(devUser)
            })

            expect(mockLoginAs).toHaveBeenCalledWith(3)
            expect(mockInitializeAfterReset).toHaveBeenCalledWith(authResult.user, authResult.token)
            expect(reloadMock).toHaveBeenCalledTimes(1)
        })

        it('does not call initializeAfterReset when loginAs returns null', async () => {
            const devUser = { id: 99, name: 'Gone', email: 'g@t.com', roles: [] }
            mockLoginAs.mockResolvedValueOnce(null)

            const { result } = renderDebugger()

            await act(async () => {
                await result.current.handleDevLogin(devUser)
            })

            expect(mockInitializeAfterReset).not.toHaveBeenCalled()
        })

        it('clears loggingInUserId after the request completes', async () => {
            const devUser = { id: 7, name: 'U', email: 'u@t.com', roles: [] }
            mockLoginAs.mockResolvedValueOnce(null)

            const { result } = renderDebugger()

            await act(async () => {
                await result.current.handleDevLogin(devUser)
            })

            expect(result.current.loggingInUserId).toBeNull()
        })
    })

    describe('shortcutLabel', () => {
        it('returns Cmd+Shift+D on macOS', () => {
            Object.defineProperty(navigator, 'platform', {
                value: 'MacIntel',
                writable: true,
                configurable: true,
            })

            const { result } = renderDebugger()

            expect(result.current.shortcutLabel).toBe('Cmd+Shift+D')
        })
    })
})
