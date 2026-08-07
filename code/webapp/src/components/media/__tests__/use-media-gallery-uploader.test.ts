/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useMediaGalleryUploader } from '../use-media-gallery-uploader'

const mockUpload = vi.fn()
const mockUpdateAsset = vi.fn()
const mockDeleteAsset = vi.fn()

vi.mock('@/services/media-api', () => ({
  mediaApi: {
    upload: (...args: unknown[]) => mockUpload(...args),
    updateAsset: (...args: unknown[]) => mockUpdateAsset(...args),
    deleteAsset: (...args: unknown[]) => mockDeleteAsset(...args),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function makeAsset(overrides: Partial<{
  gallery_id: string
  asset_id: string
  url: string
  filename: string
  mime_type: string
  size: number
  position: number
  is_primary: boolean
}> = {}) {
  return {
    gallery_id: 'gallery-1',
    asset_id: 'asset-1',
    url: 'https://api.sushigo.local/storage/media/photo.jpg',
    filename: 'photo.jpg',
    mime_type: 'image/jpeg',
    size: 1024,
    position: 0,
    is_primary: true,
    ...overrides,
  }
}

function makeFile(name = 'photo.jpg', type = 'image/jpeg', size = 1024): File {
  const file = new File(['x'.repeat(size)], name, { type })
  return file
}

describe('useMediaGalleryUploader', () => {
  describe('initial state', () => {
    it('starts with no assets', () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      expect(result.current.assets).toEqual([])
    })

    it('starts with an undefined galleryId', () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      expect(result.current.galleryId).toBeUndefined()
    })

    it('starts with an undefined ownerToken', () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      expect(result.current.ownerToken).toBeUndefined()
    })

    it('starts with isUploading false', () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      expect(result.current.isUploading).toBe(false)
    })

    it('starts with no error', () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      expect(result.current.error).toBeNull()
    })
  })

  describe('uploadFiles', () => {
    it('uploads a file and adds it to assets', async () => {
      const asset = makeAsset()
      mockUpload.mockResolvedValue(asset)

      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })

      expect(result.current.assets).toEqual([asset])
    })

    it('generates an owner_token on the first upload and reuses it for the next one', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })

      const firstCallToken = mockUpload.mock.calls[0]?.[1]?.ownerToken
      const secondCallToken = mockUpload.mock.calls[1]?.[1]?.ownerToken
      expect(firstCallToken).toBeTruthy()
      expect(secondCallToken).toBe(firstCallToken)
    })

    it('reuses the gallery_id returned by the first upload for the second upload', async () => {
      const first = makeAsset({ asset_id: 'asset-1', gallery_id: 'gallery-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', gallery_id: 'gallery-1', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })

      expect(mockUpload.mock.calls[0]?.[1]?.mediaGalleryId).toBeUndefined()
      expect(mockUpload.mock.calls[1]?.[1]?.mediaGalleryId).toBe('gallery-1')
    })

    it('exposes galleryId once an asset exists', async () => {
      mockUpload.mockResolvedValue(makeAsset({ gallery_id: 'gallery-42' }))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })

      expect(result.current.galleryId).toBe('gallery-42')
    })

    it('rejects a disallowed file extension without calling the API', async () => {
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('malware.exe', 'application/octet-stream')])
      })

      expect(mockUpload).not.toHaveBeenCalled()
      expect(result.current.error).toContain('not a supported file type')
    })

    it('rejects a file over the 8000 KB limit without calling the API', async () => {
      const { result } = renderHook(() => useMediaGalleryUploader())
      const oversized = makeFile('big.jpg', 'image/jpeg')
      Object.defineProperty(oversized, 'size', { value: 8000 * 1024 + 1 })

      await act(async () => {
        await result.current.uploadFiles([oversized])
      })

      expect(mockUpload).not.toHaveBeenCalled()
      expect(result.current.error).toContain('exceeds the 8000 KB upload limit')
    })

    it('sets an error message when the upload API call fails', async () => {
      mockUpload.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.assets).toEqual([])
    })

    it('keeps uploading the rest of the batch after one file fails', async () => {
      mockUpload
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(makeAsset({ asset_id: 'asset-2' }))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })

      expect(mockUpload).toHaveBeenCalledTimes(2)
      expect(result.current.assets.map((a) => a.asset_id)).toEqual(['asset-2'])
      expect(result.current.error).toContain('Network error')
    })

    it('combines every validation error instead of only keeping the last one', async () => {
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([
          makeFile('bad1.exe', 'application/octet-stream'),
          makeFile('bad2.exe', 'application/octet-stream'),
        ])
      })

      expect(result.current.error).toContain('bad1.exe')
      expect(result.current.error).toContain('bad2.exe')
    })

    it('does nothing when given an empty file list', async () => {
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([])
      })

      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('fails loudly instead of issuing a predictable owner_token when crypto.randomUUID is unavailable', async () => {
      const originalRandomUUID = crypto.randomUUID
      // randomUUID lives on Crypto.prototype, so `delete crypto.randomUUID` is a no-op —
      // defineProperty shadows it with an own property instead.
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
      try {
        const { result } = renderHook(() => useMediaGalleryUploader())

        await act(async () => {
          await result.current.uploadFiles([makeFile()])
        })

        expect(mockUpload).not.toHaveBeenCalled()
        expect(result.current.error).toContain('secure random number generator')
      } finally {
        Object.defineProperty(crypto, 'randomUUID', { value: originalRandomUUID, configurable: true })
      }
    })
  })

  describe('removeAsset', () => {
    it('removes the asset from state on success', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1' }))
      mockDeleteAsset.mockResolvedValue(undefined)
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.removeAsset('asset-1')
      })

      expect(result.current.assets).toEqual([])
    })

    it('passes the owner_token used at upload time', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1' }))
      mockDeleteAsset.mockResolvedValue(undefined)
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      const usedToken = mockUpload.mock.calls[0]?.[1]?.ownerToken
      await act(async () => {
        await result.current.removeAsset('asset-1')
      })

      expect(mockDeleteAsset).toHaveBeenCalledWith('asset-1', usedToken)
    })

    it('promotes the lowest-position remaining asset to primary after the primary one is removed', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0, is_primary: true })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockDeleteAsset.mockResolvedValue(undefined)
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.removeAsset('asset-1')
      })

      expect(result.current.assets).toEqual([{ ...second, is_primary: true }])
    })

    it('does not touch is_primary when the removed asset was not primary', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0, is_primary: true })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockDeleteAsset.mockResolvedValue(undefined)
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.removeAsset('asset-2')
      })

      expect(result.current.assets).toEqual([first])
    })

    it('exposes galleryId as undefined again once the last asset is removed', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1', gallery_id: 'gallery-1' }))
      mockDeleteAsset.mockResolvedValue(undefined)
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.removeAsset('asset-1')
      })

      expect(result.current.galleryId).toBeUndefined()
    })

    it('sets an error message when the delete API call fails, keeping the asset in state', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1' }))
      mockDeleteAsset.mockRejectedValue(new Error('Forbidden'))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.removeAsset('asset-1')
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.assets).toHaveLength(1)
    })
  })

  describe('setPrimaryAsset', () => {
    it('marks the target asset primary and demotes the sibling locally', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0, is_primary: true })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockUpdateAsset.mockResolvedValue({ ...second, is_primary: true })

      const { result } = renderHook(() => useMediaGalleryUploader())
      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.setPrimaryAsset('asset-2')
      })

      const byId = Object.fromEntries(result.current.assets.map((a) => [a.asset_id, a]))
      expect(byId['asset-2']?.is_primary).toBe(true)
      expect(byId['asset-1']?.is_primary).toBe(false)
    })

    it('sets an error message when the API call fails', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1' }))
      mockUpdateAsset.mockRejectedValue(new Error('Forbidden'))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.setPrimaryAsset('asset-1')
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('moveAsset', () => {
    it('swaps positions with the left neighbor', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockUpdateAsset
        .mockResolvedValueOnce({ ...second, position: 0 })
        .mockResolvedValueOnce({ ...first, position: 1 })

      const { result } = renderHook(() => useMediaGalleryUploader())
      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.moveAsset('asset-2', 'left')
      })

      expect(result.current.assets.map((a) => a.asset_id)).toEqual(['asset-2', 'asset-1'])
    })

    it('ignores a second moveAsset call while the first is still in flight', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)

      let resolveFirstPatch: (value: typeof second) => void = () => {}
      mockUpdateAsset.mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirstPatch = resolve })
      )

      const { result } = renderHook(() => useMediaGalleryUploader())
      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })

      // Start a reorder but don't let its PATCH resolve yet.
      act(() => {
        void result.current.moveAsset('asset-2', 'left')
      })
      expect(result.current.isMutating).toBe(true)

      // A second call while the first is still pending must be a no-op — it must not
      // read the same pre-swap `assets` snapshot and race the in-flight PATCH.
      await act(async () => {
        await result.current.moveAsset('asset-2', 'left')
      })
      expect(mockUpdateAsset).toHaveBeenCalledTimes(1)

      await act(async () => {
        resolveFirstPatch({ ...second, position: 0 })
        await Promise.resolve()
      })
    })

    it('is a no-op when moving the first asset left', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1', position: 0 }))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.moveAsset('asset-1', 'left')
      })

      expect(mockUpdateAsset).not.toHaveBeenCalled()
    })

    it('is a no-op when moving the last asset right', async () => {
      mockUpload.mockResolvedValue(makeAsset({ asset_id: 'asset-1', position: 0 }))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      await act(async () => {
        await result.current.moveAsset('asset-1', 'right')
      })

      expect(mockUpdateAsset).not.toHaveBeenCalled()
    })

    it('sets an error message when the API call fails', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockUpdateAsset.mockRejectedValue(new Error('Conflict'))

      const { result } = renderHook(() => useMediaGalleryUploader())
      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.moveAsset('asset-2', 'left')
      })

      expect(result.current.error).toBeTruthy()
    })

    it('rolls back the first PATCH when the second one fails, instead of leaving mismatched positions server-side', async () => {
      const first = makeAsset({ asset_id: 'asset-1', position: 0 })
      const second = makeAsset({ asset_id: 'asset-2', position: 1, is_primary: false })
      mockUpload.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
      mockUpdateAsset
        .mockResolvedValueOnce({ ...second, position: 0 }) // asset-2 -> position 0 succeeds
        .mockRejectedValueOnce(new Error('Conflict')) // asset-1 -> position 1 fails
        .mockResolvedValueOnce({ ...second, position: 1 }) // rollback: asset-2 back to position 1

      const { result } = renderHook(() => useMediaGalleryUploader())
      await act(async () => {
        await result.current.uploadFiles([makeFile('a.jpg'), makeFile('b.jpg')])
      })
      await act(async () => {
        await result.current.moveAsset('asset-2', 'left')
      })

      expect(mockUpdateAsset).toHaveBeenCalledTimes(3)
      expect(mockUpdateAsset.mock.calls[2]?.[0]).toBe('asset-2')
      expect(mockUpdateAsset.mock.calls[2]?.[1]?.position).toBe(1)
      expect(result.current.error).toBeTruthy()
      // Local state is left untouched on failure — it was never updated to the
      // (now rolled-back) swapped positions in the first place.
      expect(result.current.assets.map((a) => a.position)).toEqual([0, 1])
    })
  })

  describe('clearError', () => {
    it('resets the error to null', async () => {
      mockUpload.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useMediaGalleryUploader())

      await act(async () => {
        await result.current.uploadFiles([makeFile()])
      })
      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
