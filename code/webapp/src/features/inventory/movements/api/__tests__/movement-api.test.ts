import { beforeEach, describe, expect, it, vi } from 'vitest'
import { movementApi } from '../movement-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

describe('movementApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists movements passing every ledger filter through as query params', () => {
    const params = {
      page: 2,
      per_page: 15,
      location_id: 'loc-ulid',
      item_variant_id: 'var-ulid',
      reason: 'TRANSFER' as const,
      status: 'POSTED' as const,
      date_from: '2026-08-01',
      date_to: '2026-08-31',
      search: 'DOC-77',
      source_type: 'receipt' as const,
    }

    movementApi.list(params)

    expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements', { params })
  })

  it('lists movements with no params', () => {
    movementApi.list()
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements', { params: undefined })
  })

  it('gets a single movement by its public id', () => {
    movementApi.get('mv-ulid')
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/movements/mv-ulid')
  })

  it('exposes no write operations', () => {
    expect(movementApi).not.toHaveProperty('create')
    expect(movementApi).not.toHaveProperty('update')
    expect(movementApi).not.toHaveProperty('delete')
    expect(movementApi).not.toHaveProperty('reverse')
  })
})
