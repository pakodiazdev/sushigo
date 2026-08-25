import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supplierApi, supplierOfferingApi } from '../supplier-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

describe('supplierApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists suppliers with filters', () => {
    const params = { search: 'mar', is_active: true }
    supplierApi.list(params)
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/suppliers', { params })
  })

  it('creates and updates suppliers', () => {
    const payload = { code: 'MAR', name: 'Mar del Norte' }
    supplierApi.create(payload)
    supplierApi.update('supplier-id', { is_active: false })
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/suppliers', payload)
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/suppliers/supplier-id', { is_active: false })
  })

  it('gets and deletes a supplier', () => {
    supplierApi.get('supplier-id')
    supplierApi.delete('supplier-id')
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/suppliers/supplier-id')
    expect(apiClient.delete).toHaveBeenCalledWith('/inventory/suppliers/supplier-id')
  })
})

describe('supplierOfferingApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses supplier-scoped offering endpoints', () => {
    const payload = {
      variant_purchase_presentation_id: 'presentation-id',
      quoted_price: 480.25,
      currency: 'MXN',
    }
    supplierOfferingApi.list('supplier-id', { is_active: true })
    supplierOfferingApi.create('supplier-id', payload)
    supplierOfferingApi.update('supplier-id', 'offering-id', { quoted_price: 450 })

    expect(apiClient.get).toHaveBeenCalledWith('/inventory/suppliers/supplier-id/offerings', {
      params: { is_active: true },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/suppliers/supplier-id/offerings', payload)
    expect(apiClient.put).toHaveBeenCalledWith(
      '/inventory/suppliers/supplier-id/offerings/offering-id',
      { quoted_price: 450 },
    )
  })

  it('deletes an offering inside its supplier scope', () => {
    supplierOfferingApi.delete('supplier-id', 'offering-id')
    expect(apiClient.delete).toHaveBeenCalledWith('/inventory/suppliers/supplier-id/offerings/offering-id')
  })
})
