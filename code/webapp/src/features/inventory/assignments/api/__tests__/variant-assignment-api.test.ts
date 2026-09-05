import { describe, it, expect, vi, beforeEach } from 'vitest'
import { variantAssignmentApi } from '../variant-assignment-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

import { apiClient } from '@/lib/api-client'

describe('variantAssignmentApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists variant assignments for a location with default params', async () => {
    const response = { data: { status: 200, data: [], meta: { current_page: 1, total: 0 } } }
    vi.mocked(apiClient.get).mockResolvedValue(response)

    const result = await variantAssignmentApi.list('loc-1')

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations/loc-1/variant-assignments', {
      params: {},
    })
    expect(result).toEqual(response)
  })

  it('passes state, search and pagination through as query params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { status: 200, data: [], meta: {} } })

    await variantAssignmentApi.list('loc-1', { state: 'unassigned', search: 'rice', per_page: 25 })

    expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations/loc-1/variant-assignments', {
      params: { state: 'unassigned', search: 'rice', per_page: 25 },
    })
  })

  it('assigns a variant to a location', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ data: { status: 201 } })

    await variantAssignmentApi.assign('loc-1', 'var-9')

    expect(apiClient.put).toHaveBeenCalledWith('/inventory-locations/loc-1/variant-assignments/var-9')
  })

  it('unassigns a variant from a location', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 })

    await variantAssignmentApi.unassign('loc-1', 'var-9')

    expect(apiClient.delete).toHaveBeenCalledWith('/inventory-locations/loc-1/variant-assignments/var-9')
  })
})
