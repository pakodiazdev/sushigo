import { describe, it, expect, vi, beforeEach } from 'vitest'
import { overtimeBankApi } from '../overtime-bank-api'

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

describe('overtimeBankApi.getBank', () => {
  it('calls GET /employees/{employeeId}/overtime-bank', async () => {
    const mockResponse = { data: { status: 200, data: [], meta: { balance_minutes: 0, balance_formatted: '0:00' } } }
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

    const result = await overtimeBankApi.getBank('emp-123')

    expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-123/overtime-bank')
    expect(result).toEqual(mockResponse)
  })
})
