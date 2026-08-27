import { describe, it, expect, vi, beforeEach } from 'vitest'
import { replenishmentPolicyApi } from '../replenishment-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '@/lib/api-client'

describe('replenishmentPolicyApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists policies for a location', async () => {
    const response = { data: { status: 200, data: [], meta: null } }
    vi.mocked(apiClient.get).mockResolvedValue(response)

    const result = await replenishmentPolicyApi.list('loc-1')

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations/loc-1/replenishment-policies')
    expect(result).toEqual(response)
  })

  it('gets the resolved policy for a variant at a location', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 200, data: {}, meta: null } })

    await replenishmentPolicyApi.getResolved('loc-1', 'var-9')

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations/loc-1/replenishment-policies/var-9')
  })

  it('upserts a policy with a payload', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { status: 201, data: {}, meta: null } })

    await replenishmentPolicyApi.upsert('loc-1', 'var-9', { min_stock: 10, max_stock: 100, notes: null })

    expect(apiClient.put).toHaveBeenCalledWith('/inventory-locations/loc-1/replenishment-policies/var-9', {
      min_stock: 10,
      max_stock: 100,
      notes: null,
    })
  })

  it('removes a policy', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 })

    await replenishmentPolicyApi.remove('loc-1', 'var-9')

    expect(apiClient.delete).toHaveBeenCalledWith('/inventory-locations/loc-1/replenishment-policies/var-9')
  })
})
