import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vacationApi } from '../vacation.service'

// ── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ─────────────────────────────────────────────────────────────────────

const EMP_ID = '01HTEST001'

describe('vacationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEntitlements', () => {
    it('calls GET /employees/:id/vacation-entitlements', async () => {
      const mockResponse = { data: { status: 200, data: [] } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await vacationApi.getEntitlements(EMP_ID)

      expect(apiClient.get).toHaveBeenCalledWith(`/employees/${EMP_ID}/vacation-entitlements`)
      expect(result).toEqual(mockResponse)
    })
  })
})
