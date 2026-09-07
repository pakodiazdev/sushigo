import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stockTransferApi } from '../stock-transfer-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

describe('stockTransferApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists transfers passing every filter through as query params', () => {
    const params = {
      page: 2,
      per_page: 15,
      status: 'POSTED' as const,
      source_location_id: 'src-ulid',
      destination_location_id: 'dst-ulid',
      date_from: '2026-09-01',
      date_to: '2026-09-30',
      search: 'TR-1',
    }

    stockTransferApi.list(params)

    expect(apiClient.get).toHaveBeenCalledWith('/inventory/transfers', { params })
  })

  it('gets a single transfer by its public id', () => {
    stockTransferApi.get('tr-ulid')
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/transfers/tr-ulid')
  })

  it('creates a draft transfer', () => {
    const payload = {
      source_location_id: 'src',
      destination_location_id: 'dst',
      reference: 'TR-9',
      transfer_date: '2026-09-05',
      notes: null,
      lines: [{ item_variant_id: 'v1', entry_uom_id: 'u1', entry_quantity: 12 }],
    }

    stockTransferApi.create(payload)

    expect(apiClient.post).toHaveBeenCalledWith('/inventory/transfers', payload)
  })

  it('updates a draft transfer', () => {
    const payload = {
      source_location_id: 'src',
      destination_location_id: 'dst',
      reference: null,
      transfer_date: '2026-09-05',
      notes: null,
      lines: [{ item_variant_id: 'v1', entry_uom_id: 'u1', entry_quantity: 3 }],
    }

    stockTransferApi.update('tr-ulid', payload)

    expect(apiClient.put).toHaveBeenCalledWith('/inventory/transfers/tr-ulid', payload)
  })

  it('deletes a draft transfer', () => {
    stockTransferApi.delete('tr-ulid')
    expect(apiClient.delete).toHaveBeenCalledWith('/inventory/transfers/tr-ulid')
  })

  it('posts a transfer', () => {
    stockTransferApi.post('tr-ulid')
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/transfers/tr-ulid/post')
  })

  it('reverses a transfer with an optional reason', () => {
    stockTransferApi.reverse('tr-ulid', { reason: 'Error' })
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/transfers/tr-ulid/reverse', { reason: 'Error' })
  })
})
