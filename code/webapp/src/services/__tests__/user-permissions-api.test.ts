import { describe, it, expect, vi, beforeEach } from 'vitest'
import { userPermissionsApi } from '../user-permissions-api'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('userPermissionsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPermissions', () => {
    it('calls GET /employees/:id/permissions', async () => {
      const mockResponse = {
        data: {
          status: 200,
          data: {
            user_id: 1,
            permissions: [
              { name: 'view-employees', source: 'role' },
              { name: 'edit-employees', source: 'direct' },
            ],
          },
        },
      }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await userPermissionsApi.getPermissions('emp-01HABC')

      expect(apiClient.get).toHaveBeenCalledWith('/employees/emp-01HABC/permissions')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('syncPermissions', () => {
    it('calls PUT /employees/:id/permissions with grant/revoke payload', async () => {
      const mockResponse = {
        data: {
          status: 200,
          data: {
            user_id: 1,
            permissions: [
              { name: 'view-employees', source: 'role' },
              { name: 'manage-inventory', source: 'direct' },
            ],
          },
        },
      }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const payload = {
        grant: ['manage-inventory'],
        revoke: ['edit-employees'],
      }
      const result = await userPermissionsApi.syncPermissions('emp-01HABC', payload)

      expect(apiClient.put).toHaveBeenCalledWith('/employees/emp-01HABC/permissions', payload)
      expect(result).toEqual(mockResponse)
    })

    it('handles empty grant/revoke arrays', async () => {
      const mockResponse = {
        data: {
          status: 200,
          data: {
            user_id: 1,
            permissions: [],
          },
        },
      }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const payload = { grant: [], revoke: [] }
      const result = await userPermissionsApi.syncPermissions('emp-01XYZ', payload)

      expect(apiClient.put).toHaveBeenCalledWith('/employees/emp-01XYZ/permissions', payload)
      expect(result).toEqual(mockResponse)
    })
  })
})
