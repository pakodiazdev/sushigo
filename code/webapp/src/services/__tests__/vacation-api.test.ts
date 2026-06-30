import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vacationApi } from '../vacation.service'

// ── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
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

  describe('registerEntitlement', () => {
    it('calls POST /employees/:id/vacation-entitlements with year', async () => {
      const mockResponse = {
        data: {
          status: 201,
          data: {
            id: 1,
            year: 2026,
            entitled_days: 22,
            used_days: 0,
            remaining_days: 22,
            rule_key: 'VacationsLFTMX',
          },
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await vacationApi.registerEntitlement(EMP_ID, { year: 2026 })

      expect(apiClient.post).toHaveBeenCalledWith(
        `/employees/${EMP_ID}/vacation-entitlements`,
        { year: 2026 },
      )
      expect(result).toEqual(mockResponse)
    })
  })
})
