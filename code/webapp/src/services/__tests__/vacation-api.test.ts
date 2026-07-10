import { describe, it, expect, vi, beforeEach } from 'vitest'
import { vacationApi } from '../vacation.service'

// ── Mock ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
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

  describe('createVacationRequest', () => {
    it('calls POST /vacation-requests with correct payload', async () => {
      const mockResponse = { data: { status: 201, data: { id: 'vr-001', status: 'PENDING' } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const payload = {
        employee_id: EMP_ID,
        dates: ['2026-08-10', '2026-08-11', '2026-08-12'],
        notes: 'Vacaciones familiares',
      }

      const result = await vacationApi.createVacationRequest(payload)

      expect(apiClient.post).toHaveBeenCalledWith('/vacation-requests', payload)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('approveRequest', () => {
    it('calls PATCH /vacation-requests/{id}/approve', async () => {
      const mockResponse = { data: { status: 200, data: { id: 'vr-001', status: 'APPROVED' } } }
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

      const result = await vacationApi.approveRequest('vr-001')

      expect(apiClient.patch).toHaveBeenCalledWith('/vacation-requests/vr-001/approve')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('rejectRequest', () => {
    it('calls PATCH /vacation-requests/{id}/reject', async () => {
      const mockResponse = { data: { status: 200, data: { id: 'vr-001', status: 'REJECTED' } } }
      vi.mocked(apiClient.patch).mockResolvedValue(mockResponse)

      const result = await vacationApi.rejectRequest('vr-001')

      expect(apiClient.patch).toHaveBeenCalledWith('/vacation-requests/vr-001/reject')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('listEmployeeVacationRequests', () => {
    it('calls GET /employees/{id}/vacation-requests without filters', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await vacationApi.listEmployeeVacationRequests(EMP_ID)

      expect(apiClient.get).toHaveBeenCalledWith(`/employees/${EMP_ID}/vacation-requests`)
      expect(result).toEqual(mockResponse)
    })

    it('appends query params when filters are provided', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      await vacationApi.listEmployeeVacationRequests(EMP_ID, {
        status: 'PENDING',
        per_page: 10,
        page: 2,
      })

      const calledUrl = vi.mocked(apiClient.get).mock.calls[0]![0]
      expect(calledUrl).toContain(`/employees/${EMP_ID}/vacation-requests?`)
      expect(calledUrl).toContain('status=PENDING')
      expect(calledUrl).toContain('per_page=10')
      expect(calledUrl).toContain('page=2')
    })
  })
})
