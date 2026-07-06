import { describe, it, expect, vi, beforeEach } from 'vitest'
import { overtimeLftTiersApi } from '../overtime-lft-tiers-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('overtimeLftTiersApi.list', () => {
  it('calls GET /overtime/lft-tiers', async () => {
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await overtimeLftTiersApi.list()

    expect(apiClient.get).toHaveBeenCalledWith('/overtime/lft-tiers')
    expect(result).toEqual(mockResponse)
  })
})

describe('overtimeLftTiersApi.update', () => {
  it('calls PUT /overtime/lft-tiers with the payload', async () => {
    const payload = { tiers: [{ factor: 2, up_to_hours: 9 }, { factor: 3, up_to_hours: null }] }
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

    const result = await overtimeLftTiersApi.update(payload)

    expect(apiClient.put).toHaveBeenCalledWith('/overtime/lft-tiers', payload)
    expect(result).toEqual(mockResponse)
  })
})
