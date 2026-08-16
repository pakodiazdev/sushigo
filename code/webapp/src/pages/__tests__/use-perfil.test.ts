// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

const mockRefreshUser = vi.fn()
const mockUser = { id: 1, name: 'Ana García', email: 'ana@sushigo.com', avatar_url: null }
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { user: typeof mockUser; refreshUser: () => Promise<void> }) => unknown) =>
    selector({ user: mockUser, refreshUser: mockRefreshUser }),
}))

const mockUseMyEmployee = vi.fn()
vi.mock('@/services/employee-hooks', () => ({
  useMyEmployee: () => mockUseMyEmployee(),
}))

const mockUpdateMyAvatar = vi.fn()
vi.mock('@/services/profile-api', () => ({
  profileApi: { updateMyAvatar: (...args: unknown[]) => mockUpdateMyAvatar(...args) },
}))

afterEach(() => {
  vi.clearAllMocks()
})

import { usePerfilPage } from '../use-perfil'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  return { wrapper }
}

const employee = {
  user: { first_name: 'Ana', last_name: 'García' },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePerfilPage', () => {
  it('derives displayName from the employee and avatarUrl from the auth store user', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    expect(result.current.displayName).toBe('Ana García')
    expect(result.current.avatarUrl).toBeNull()
    expect(result.current.email).toBe('ana@sushigo.com')
  })

  it('falls back to the auth store user name when no employee is linked', () => {
    mockUseMyEmployee.mockReturnValue({ data: undefined, isLoading: false })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    expect(result.current.displayName).toBe('Ana García')
  })

  it('ignores an avatar change with no gallery id', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAvatarChange(undefined, undefined)
    })

    expect(mockUpdateMyAvatar).not.toHaveBeenCalled()
  })

  it('attaches the new avatar and refreshes the auth store on success', async () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    mockUpdateMyAvatar.mockResolvedValueOnce({ ...mockUser, avatar_url: 'https://example.com/new.jpg' })
    mockRefreshUser.mockResolvedValueOnce(undefined)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAvatarChange('01JKGALLERY0000000000000', 'token-1')
    })

    await waitFor(() =>
      expect(mockUpdateMyAvatar).toHaveBeenCalledWith({
        mediaGalleryId: '01JKGALLERY0000000000000',
        ownerToken: 'token-1',
      }),
    )
    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled())
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled())
  })

  it('shows an error toast and does not refresh the store when the attach fails', async () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    mockUpdateMyAvatar.mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAvatarChange('01JKGALLERY0000000000000', 'token-1')
    })

    await waitFor(() => expect(mockShowError).toHaveBeenCalled())
    expect(mockRefreshUser).not.toHaveBeenCalled()
  })
})
