// @vitest-environment jsdom
/**
 * Layout auth guard tests
 *
 * Validates that the Layout component correctly:
 * - Redirects unauthenticated users to /login from protected routes
 * - Redirects authenticated users away from /login to /
 * - Renders public routes without auth
 * - Shows loading spinner while auth initializes
 *
 * These tests replace the Cypress "Navegación y guards" suite
 * per the testing strategy: route guards belong in Vitest, not E2E.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Dependencies ─────��──────────────────────────────────────────────────

const mockNavigate = vi.fn()
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null as unknown,
  _hasHydrated: true,
  initializeAuth: vi.fn(),
}

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: mockNavigate }),
  useRouterState: () => ({ location: { pathname: mockPathname } }),
  Outlet: () => null,
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => mockAuthState,
}))

vi.mock('@/components/layout/Header', () => ({ default: () => null }))
vi.mock('@/components/layout/Sidebar', () => ({ default: () => null }))
vi.mock('@/components/ui/breadcrumbs', () => ({ Breadcrumbs: () => null }))

let mockPathname = '/dashboard'

// ─── Helpers ─────────────��────────────────────��───────────────────────────────

import { render, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import Layout from '../Layout'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function setAuthState(overrides: Partial<typeof mockAuthState>) {
  mockAuthState = { ...mockAuthState, ...overrides }
}

function setPath(path: string) {
  mockPathname = path
}

// ─── Tests ──────────────────��─────────────────────────────���───────────────────

describe('Layout — Auth Guards', () => {
  beforeEach(() => {
    mockPathname = '/dashboard'
    mockAuthState = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      _hasHydrated: true,
      initializeAuth: vi.fn(),
    }
  })

  describe('Unauthenticated user', () => {
    it('redirects to /login when accessing a protected route', () => {
      setPath('/dashboard')
      setAuthState({ isAuthenticated: false, isLoading: false })

      render(<Layout />)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
    })

    it('does NOT redirect when already on /login', () => {
      setPath('/login')
      setAuthState({ isAuthenticated: false, isLoading: false })

      render(<Layout />)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('does NOT redirect when on public routes', () => {
      const publicRoutes = ['/login', '/logout', '/reset-password', '/forgot-password']

      for (const route of publicRoutes) {
        vi.clearAllMocks()
        setPath(route)
        setAuthState({ isAuthenticated: false, isLoading: false })

        const { unmount } = render(<Layout />)

        expect(mockNavigate).not.toHaveBeenCalled()
        unmount()
      }
    })
  })

  describe('Authenticated user', () => {
    const fakeUser = { id: 1, name: 'Admin', email: 'admin@sushigo.com' }

    it('redirects to / when visiting /login while authenticated', () => {
      setPath('/login')
      setAuthState({ isAuthenticated: true, isLoading: false, user: fakeUser })

      render(<Layout />)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
    })

    it('does NOT redirect when on a protected route while authenticated', () => {
      setPath('/dashboard')
      setAuthState({ isAuthenticated: true, isLoading: false, user: fakeUser })

      render(<Layout />)

      expect(mockNavigate).not.toHaveBeenCalled()
    })
  })

  describe('Loading state', () => {
    it('does NOT redirect while auth is loading', () => {
      setPath('/dashboard')
      setAuthState({ isAuthenticated: false, isLoading: true })

      render(<Layout />)

      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('shows loading spinner on protected routes while loading', () => {
      setPath('/dashboard')
      setAuthState({ isAuthenticated: false, isLoading: true })

      const { container } = render(<Layout />)

      // Loader2 renders as an svg with animate-spin class
      expect(container.querySelector('.animate-spin')).not.toBeNull()
    })

    it('does NOT show loading spinner on public routes while loading', () => {
      setPath('/login')
      setAuthState({ isAuthenticated: false, isLoading: true })

      const { container } = render(<Layout />)

      expect(container.querySelector('.animate-spin')).toBeNull()
    })
  })

  describe('Hydration', () => {
    it('calls initializeAuth after hydration', () => {
      const initMock = vi.fn()
      setAuthState({ _hasHydrated: true, initializeAuth: initMock })

      render(<Layout />)

      expect(initMock).toHaveBeenCalled()
    })

    it('does NOT call initializeAuth before hydration', () => {
      const initMock = vi.fn()
      setAuthState({ _hasHydrated: false, initializeAuth: initMock })

      render(<Layout />)

      expect(initMock).not.toHaveBeenCalled()
    })
  })
})
