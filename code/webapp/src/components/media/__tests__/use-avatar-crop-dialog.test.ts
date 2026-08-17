// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { Area } from 'react-easy-crop'

const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

const mockRefreshUser = vi.fn()
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { refreshUser: () => Promise<void> }) => unknown) =>
    selector({ refreshUser: mockRefreshUser }),
}))

const mockUpload = vi.fn()
vi.mock('@/services/media-api', () => ({
  mediaApi: { upload: (...args: unknown[]) => mockUpload(...args) },
}))

const mockUpdateMyAvatar = vi.fn()
vi.mock('@/services/profile-api', () => ({
  profileApi: { updateMyAvatar: (...args: unknown[]) => mockUpdateMyAvatar(...args) },
}))

const mockCropImageToBlob = vi.fn()
vi.mock('@/lib/canvas-crop', () => ({
  cropImageToBlob: (...args: unknown[]) => mockCropImageToBlob(...args),
}))

vi.mock('@/lib/media-validation', () => ({
  generateOwnerToken: () => 'owner-token-1',
}))

import { useAvatarCropDialog } from '../use-avatar-crop-dialog'
import type { UseAvatarCropDialogResult } from '../use-avatar-crop-dialog'

function makeFile(name = 'photo.jpg'): File {
  return new File(['x'], name, { type: 'image/jpeg' })
}

const CROP_AREA: Area = { x: 0, y: 0, width: 100, height: 100 }

describe('useAvatarCropDialog', () => {
  afterEach(() => {
    vi.clearAllMocks()
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('creates an object URL for the given file and revokes it when the file changes to null', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()
    const file = makeFile()

    const { result, rerender } = renderHook<UseAvatarCropDialogResult, { f: File | null }>(
      ({ f }) => useAvatarCropDialog(f, vi.fn()),
      { initialProps: { f: file } }
    )

    expect(result.current.imageSrc).toBe('blob:mock-url')
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file)

    rerender({ f: null })

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(result.current.imageSrc).toBeNull()
  })

  it('cannot save until a crop has been completed', () => {
    const file = makeFile()
    const { result } = renderHook(() => useAvatarCropDialog(file, vi.fn()))

    expect(result.current.canSave).toBe(false)

    act(() => {
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })

    expect(result.current.canSave).toBe(true)
  })

  it('does nothing when handleSave is called before a crop has completed', async () => {
    const file = makeFile()
    const { result } = renderHook(() => useAvatarCropDialog(file, vi.fn()))

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockCropImageToBlob).not.toHaveBeenCalled()
  })

  it('crops, uploads, attaches, refreshes, and reports success on save', async () => {
    const file = makeFile()
    const onSaved = vi.fn()
    const blob = new Blob(['fake'], { type: 'image/jpeg' })
    mockCropImageToBlob.mockResolvedValueOnce(blob)
    mockUpload.mockResolvedValueOnce({ gallery_id: 'gallery-99', asset_id: 'asset-1' })
    mockUpdateMyAvatar.mockResolvedValueOnce({})
    mockRefreshUser.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useAvatarCropDialog(file, onSaved))

    act(() => {
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockCropImageToBlob).toHaveBeenCalledWith('blob:mock-url', CROP_AREA, 512)
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/jpeg' }),
      { context: 'avatar', ownerToken: 'owner-token-1' }
    )
    expect(mockUpdateMyAvatar).toHaveBeenCalledWith({ mediaGalleryId: 'gallery-99', ownerToken: 'owner-token-1' })
    expect(mockRefreshUser).toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalled()
    expect(onSaved).toHaveBeenCalled()
    expect(result.current.isSaving).toBe(false)
  })

  it('shows an error toast and does not call onSaved when the upload fails', async () => {
    const file = makeFile()
    const onSaved = vi.fn()
    mockCropImageToBlob.mockResolvedValueOnce(new Blob(['fake']))
    mockUpload.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAvatarCropDialog(file, onSaved))

    act(() => {
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockShowError).toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(mockUpdateMyAvatar).not.toHaveBeenCalled()
  })

  it('shows an error toast and does not call onSaved when attaching fails', async () => {
    const file = makeFile()
    const onSaved = vi.fn()
    mockCropImageToBlob.mockResolvedValueOnce(new Blob(['fake']))
    mockUpload.mockResolvedValueOnce({ gallery_id: 'gallery-99', asset_id: 'asset-1' })
    mockUpdateMyAvatar.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAvatarCropDialog(file, onSaved))

    act(() => {
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    expect(mockShowError).toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('treats the save as successful even when the post-save refresh fails', async () => {
    const file = makeFile()
    const onSaved = vi.fn()
    mockCropImageToBlob.mockResolvedValueOnce(new Blob(['fake']))
    mockUpload.mockResolvedValueOnce({ gallery_id: 'gallery-99', asset_id: 'asset-1' })
    mockUpdateMyAvatar.mockResolvedValueOnce({})
    mockRefreshUser.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAvatarCropDialog(file, onSaved))

    act(() => {
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })

    await act(async () => {
      await result.current.handleSave()
    })

    await waitFor(() => expect(mockShowSuccess).toHaveBeenCalled())
    expect(onSaved).toHaveBeenCalled()
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it('resets crop/zoom state when a new file is provided', () => {
    const first = makeFile('first.jpg')
    const second = makeFile('second.jpg')

    const { result, rerender } = renderHook<UseAvatarCropDialogResult, { f: File | null }>(
      ({ f }) => useAvatarCropDialog(f, vi.fn()),
      { initialProps: { f: first } }
    )

    act(() => {
      result.current.setZoom(2)
      result.current.onCropComplete(CROP_AREA, CROP_AREA)
    })
    expect(result.current.zoom).toBe(2)
    expect(result.current.canSave).toBe(true)

    rerender({ f: second })

    expect(result.current.zoom).toBe(1)
    expect(result.current.canSave).toBe(false)
  })
})
