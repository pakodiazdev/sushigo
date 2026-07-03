import { describe, it, expect, vi, beforeEach } from 'vitest'
import { overtimeConfigApi } from '../overtime.service'

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

describe('overtimeConfigApi.getOvertimeConfig', () => {
  it('calls GET /employees/:id/overtime-config', async () => {
    const mockResponse = { data: { status: 200, data: [] } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await overtimeConfigApi.getOvertimeConfig('emp-123')

    expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-123/overtime-config')
    expect(result).toEqual(mockResponse)
  })
})

describe('overtimeConfigApi.setOvertimeConfig', () => {
  it('calls POST /employees/:id/overtime-config with payload', async () => {
    const payload = { valuation_method: 'AGREED_RATE' as const, hourly_rate: 90, effective_from: '2026-05-01' }
    const mockResponse = { data: { status: 201, data: {} } }
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

    const result = await overtimeConfigApi.setOvertimeConfig('emp-123', payload)

    expect(apiClient.post).toHaveBeenCalledWith('/employees/emp-123/overtime-config', payload)
    expect(result).toEqual(mockResponse)
  })
})
