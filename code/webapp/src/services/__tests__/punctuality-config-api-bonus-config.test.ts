import { describe, it, expect, vi, beforeEach } from 'vitest'
import { punctualityConfigApi } from '../punctuality-config-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('punctualityConfigApi.getBonusConfig', () => {
  it('calls GET /employees/:id/bonus-config', async () => {
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await punctualityConfigApi.getBonusConfig('emp-123')

    expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-123/bonus-config')
    expect(result).toEqual(mockResponse)
  })
})

describe('punctualityConfigApi.assignBonusConfig', () => {
  it('calls POST /employees/:id/bonus-config with payload', async () => {
    const payload = { bonus_group_id: 'grp-1', effective_from: '2026-05-01' }
    const mockResponse = { data: { status: 201, data: {} } }
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

    const result = await punctualityConfigApi.assignBonusConfig('emp-123', payload)

    expect(apiClient.post).toHaveBeenCalledWith('/employees/emp-123/bonus-config', payload)
    expect(result).toEqual(mockResponse)
  })
})
