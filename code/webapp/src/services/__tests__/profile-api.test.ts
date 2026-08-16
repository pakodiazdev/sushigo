// @vitest-environment jsdom
/**
 * profile-api tests
 *
 * Tests for the self-service profile API service (#420).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

// ─── Mock api-client ──────────────────────────────────────────────────────────

const mockPatch = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}))

import { profileApi } from '../profile-api'

afterEach(() => {
  vi.clearAllMocks()
})

const mockUser = {
  id: 1,
  name: 'Ana García',
  email: 'ana@sushigo.com',
  avatar_url: 'https://api.sushigo.local/storage/media/avatar.jpg',
  email_verified_at: null,
  is_active: true,
  meta: null,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
}

describe('profileApi.updateMyAvatar', () => {
  it('PATCHes /auth/me/avatar with media_gallery_id and owner_token', async () => {
    mockPatch.mockResolvedValue({ data: { status: 200, data: mockUser } })

    const result = await profileApi.updateMyAvatar({
      mediaGalleryId: '01JKABC0987654321ZYXWVUTS',
      ownerToken: 'token-1',
    })

    expect(mockPatch).toHaveBeenCalledWith('/auth/me/avatar', {
      media_gallery_id: '01JKABC0987654321ZYXWVUTS',
      owner_token: 'token-1',
    })
    expect(result).toEqual(mockUser)
  })

  it('omits owner_token from the payload when not provided', async () => {
    mockPatch.mockResolvedValue({ data: { status: 200, data: mockUser } })

    await profileApi.updateMyAvatar({ mediaGalleryId: '01JKABC0987654321ZYXWVUTS' })

    expect(mockPatch).toHaveBeenCalledWith('/auth/me/avatar', {
      media_gallery_id: '01JKABC0987654321ZYXWVUTS',
      owner_token: undefined,
    })
  })
})
