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
const mockUser: {
  id: number
  name: string
  email: string
  avatar_url: string | null
  avatar_gallery: { id: string; assets: Array<{ asset_id: string; is_primary: boolean }> } | null
} = { id: 1, name: 'Ana García', email: 'ana@sushigo.com', avatar_url: null, avatar_gallery: null }
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
  mockUser.avatar_gallery = null
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

  it('ignores an in-gallery asset change before the first attach has succeeded', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAssetsChange()
    })

    expect(mockRefreshUser).not.toHaveBeenCalled()
  })

  it('refreshes the auth store on a later in-gallery asset change (set-primary/remove/reorder)', async () => {
    // These don't change galleryId/ownerToken, so onAvatarChange's own effect never
    // re-fires for them — MediaGalleryUploader's onAssetsChange is what must trigger
    // the refresh instead, once the initial attach has actually succeeded.
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    mockUpdateMyAvatar.mockResolvedValueOnce({ ...mockUser, avatar_url: 'https://example.com/new.jpg' })
    mockRefreshUser.mockResolvedValue(undefined)
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAvatarChange('01JKGALLERY0000000000000', 'token-1')
    })
    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled())
    mockRefreshUser.mockClear()

    act(() => {
      result.current.onAssetsChange()
    })

    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled())
  })

  it('derives initialGalleryId/initialAssets from the auth store users avatar_gallery, so a returning user can manage their existing gallery', () => {
    mockUser.avatar_gallery = { id: 'gallery-99', assets: [{ asset_id: 'asset-1', is_primary: true }] }
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    expect(result.current.initialGalleryId).toBe('gallery-99')
    expect(result.current.initialAssets).toEqual([{ asset_id: 'asset-1', is_primary: true }])
  })

  it('leaves initialGalleryId/initialAssets undefined when there is no existing avatar gallery', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()

    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    expect(result.current.initialGalleryId).toBeUndefined()
    expect(result.current.initialAssets).toBeUndefined()
  })

  it('marks attachFailed after the attach mutation fails', async () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    mockUpdateMyAvatar.mockRejectedValueOnce(new Error('Network error'))
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    expect(result.current.attachFailed).toBe(false)

    act(() => {
      result.current.onAvatarChange('01JKGALLERY0000000000000', 'token-1')
    })

    await waitFor(() => expect(result.current.attachFailed).toBe(true))
  })

  it('retries the same gallery/token on retryAttach, since onChange will not re-fire on its own', async () => {
    // The uploader's onChange effect is keyed on [galleryId, ownerToken] — neither
    // changes between the failed attempt and a retry, so usePerfilPage must retain
    // and resubmit the same params itself.
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    mockUpdateMyAvatar.mockRejectedValueOnce(new Error('Network error'))
    mockUpdateMyAvatar.mockResolvedValueOnce({ ...mockUser, avatar_url: 'https://example.com/new.jpg' })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAvatarChange('01JKGALLERY0000000000000', 'token-1')
    })
    await waitFor(() => expect(result.current.attachFailed).toBe(true))

    act(() => {
      result.current.retryAttach()
    })

    await waitFor(() =>
      expect(mockUpdateMyAvatar).toHaveBeenNthCalledWith(2, {
        mediaGalleryId: '01JKGALLERY0000000000000',
        ownerToken: 'token-1',
      }),
    )
    await waitFor(() => expect(result.current.attachFailed).toBe(false))
  })

  it('refreshes the auth store on an in-gallery asset change for a returning user, even though their hydrated gallery never ran the attach mutation', async () => {
    // MediaGalleryUploader intentionally does not fire onAvatarChange for its own
    // hydrated initial state (see media-gallery-uploader.tsx), so
    // updateAvatarMutation never becomes isSuccess for a returning user unless they
    // upload again — onAssetsChange must still refresh the header for their
    // reorder/set-primary/remove actions on the already-attached gallery.
    mockUser.avatar_gallery = { id: 'gallery-99', assets: [{ asset_id: 'asset-1', is_primary: true }] }
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.onAssetsChange()
    })

    await waitFor(() => expect(mockRefreshUser).toHaveBeenCalled())
    expect(mockUpdateMyAvatar).not.toHaveBeenCalled()
  })

  it('does nothing when retryAttach is called with no prior failed attempt', () => {
    mockUseMyEmployee.mockReturnValue({ data: employee, isLoading: false })
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => usePerfilPage(), { wrapper })

    act(() => {
      result.current.retryAttach()
    })

    expect(mockUpdateMyAvatar).not.toHaveBeenCalled()
  })
})
