// @vitest-environment jsdom
/**
 * media-api tests
 *
 * Tests for the Media Gallery API service (upload-first/attach-on-save pattern, #377/#378).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

// ─── Mock api-client ──────────────────────────────────────────────────────────

const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

import { mediaApi } from '../media-api'

afterEach(() => {
  vi.clearAllMocks()
})

const mockAsset = {
  gallery_id: '01JKABC0987654321ZYXWVUTS',
  asset_id: '01JKDEF0987654321ZYXWVUTS',
  url: 'https://api.sushigo.local/storage/media/photo.jpg',
  filename: 'photo.jpg',
  mime_type: 'image/jpeg',
  size: 204800,
  position: 0,
  is_primary: true,
}

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['fake-bytes'], name, { type })
}

// ─── upload ───────────────────────────────────────────────────────────────────

describe('mediaApi.upload', () => {
  it('posts a FormData payload to /media/upload without a manual Content-Type header', async () => {
    mockPost.mockResolvedValue({ data: { data: mockAsset } })

    await mediaApi.upload(makeFile(), { ownerToken: 'token-1' })

    expect(mockPost).toHaveBeenCalledWith(
      '/media/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': undefined } }
    )
  })

  it('includes the file, owner_token, and media_gallery_id fields in the FormData', async () => {
    mockPost.mockResolvedValue({ data: { data: mockAsset } })

    await mediaApi.upload(makeFile('roll.png', 'image/png'), {
      mediaGalleryId: 'gallery-123',
      ownerToken: 'token-1',
    })

    const sentFormData = mockPost.mock.calls[0]?.[1] as FormData
    expect(sentFormData.get('file')).toBeInstanceOf(File)
    expect(sentFormData.get('media_gallery_id')).toBe('gallery-123')
    expect(sentFormData.get('owner_token')).toBe('token-1')
  })

  it('omits media_gallery_id when starting a new gallery', async () => {
    mockPost.mockResolvedValue({ data: { data: mockAsset } })

    await mediaApi.upload(makeFile(), { ownerToken: 'token-1' })

    const sentFormData = mockPost.mock.calls[0]?.[1] as FormData
    expect(sentFormData.get('media_gallery_id')).toBeNull()
  })

  it('returns the created asset from response.data.data', async () => {
    mockPost.mockResolvedValue({ data: { data: mockAsset } })

    const result = await mediaApi.upload(makeFile(), { ownerToken: 'token-1' })

    expect(result).toEqual(mockAsset)
  })

  it('propagates errors from the API', async () => {
    mockPost.mockRejectedValue(new Error('Validation error'))

    await expect(mediaApi.upload(makeFile(), { ownerToken: 'token-1' })).rejects.toThrow('Validation error')
  })
})

// ─── updateAsset ────────────────────────────────────────────────────────────

describe('mediaApi.updateAsset', () => {
  it('calls PATCH /media/assets/:id with the payload', async () => {
    mockPatch.mockResolvedValue({ data: { data: mockAsset } })

    await mediaApi.updateAsset('01JKDEF0987654321ZYXWVUTS', { is_primary: true, owner_token: 'token-1' })

    expect(mockPatch).toHaveBeenCalledWith('/media/assets/01JKDEF0987654321ZYXWVUTS', {
      is_primary: true,
      owner_token: 'token-1',
    })
  })

  it('returns the updated asset', async () => {
    mockPatch.mockResolvedValue({ data: { data: mockAsset } })

    const result = await mediaApi.updateAsset('01JKDEF0987654321ZYXWVUTS', { position: 1 })

    expect(result).toEqual(mockAsset)
  })

  it('propagates errors from the API', async () => {
    mockPatch.mockRejectedValue(new Error('Not Found'))

    await expect(mediaApi.updateAsset('missing', { position: 1 })).rejects.toThrow('Not Found')
  })
})

// ─── deleteAsset ────────────────────────────────────────────────────────────

describe('mediaApi.deleteAsset', () => {
  it('calls DELETE /media/assets/:id with owner_token in the JSON body, not a query param', async () => {
    mockDelete.mockResolvedValue({ status: 200 })

    await mediaApi.deleteAsset('01JKDEF0987654321ZYXWVUTS', 'token-1')

    expect(mockDelete).toHaveBeenCalledWith('/media/assets/01JKDEF0987654321ZYXWVUTS', {
      data: { owner_token: 'token-1' },
    })
  })

  it('omits the data body when no owner_token is given', async () => {
    mockDelete.mockResolvedValue({ status: 200 })

    await mediaApi.deleteAsset('01JKDEF0987654321ZYXWVUTS')

    expect(mockDelete).toHaveBeenCalledWith('/media/assets/01JKDEF0987654321ZYXWVUTS', { data: undefined })
  })

  it('propagates errors from the API', async () => {
    mockDelete.mockRejectedValue(new Error('Forbidden'))

    await expect(mediaApi.deleteAsset('01JKDEF0987654321ZYXWVUTS', 'token-1')).rejects.toThrow('Forbidden')
  })
})
