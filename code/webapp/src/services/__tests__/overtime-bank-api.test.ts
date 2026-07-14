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

describe('overtimeBankApi.createManualMovement', () => {
  it('calls POST /employees/{employeeId}/overtime-bank/movements', async () => {
    const payload = { date: '2026-07-13', movement_type: 'USED' as const, minutes: 60, reason: 'Time off' }
    const mockResponse = {
      data: {
        status: 201,
        data: {
          id: 'mov-1',
          date: '2026-07-13',
          movement_type: 'USED',
          origin: 'MANUAL',
          minutes: 60,
          valuation_method: null,
          applied_rate: null,
          amount: null,
          authorized_by: 'Admin',
          authorized_at: '2026-07-13T18:00:00Z',
          reason: 'Time off',
        },
      },
    }
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

    const result = await overtimeBankApi.createManualMovement('emp-123', payload)

    expect(apiClient.post).toHaveBeenCalledWith('/employees/emp-123/overtime-bank/movements', payload)
    expect(result).toEqual(mockResponse)
  })
})
