import { describe, it, expect, vi, beforeEach } from 'vitest'
import { punctualityConfigApi } from '../punctuality-config-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('punctualityConfigApi.listRanges', () => {
  it('calls GET /punctuality/ranges', async () => {
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await punctualityConfigApi.listRanges()

    expect(apiClient.get).toHaveBeenCalledWith('/punctuality/ranges')
    expect(result).toEqual(mockResponse)
  })
})

describe('punctualityConfigApi.updateRanges', () => {
  it('calls PUT /punctuality/ranges with the payload', async () => {
    const payload = { ranges: [{ min_seconds: 0, bonus_percentage: 100 }] }
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

    const result = await punctualityConfigApi.updateRanges(payload)

    expect(apiClient.put).toHaveBeenCalledWith('/punctuality/ranges', payload)
    expect(result).toEqual(mockResponse)
  })
})
