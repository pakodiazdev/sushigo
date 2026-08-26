import { beforeEach, describe, expect, it, vi } from 'vitest'
import { receiptApi } from '../receipt-api'

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

describe('receiptApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists receipts with status and supplier filters', () => {
    const params = { status: 'DRAFT' as const, supplier_id: 'supplier-id' }
    receiptApi.list(params)
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/receipts', { params })
  })

  it('gets a single receipt by id', () => {
    receiptApi.get('receipt-id')
    expect(apiClient.get).toHaveBeenCalledWith('/inventory/receipts/receipt-id')
  })

  it('creates a draft receipt', () => {
    const payload = {
      supplier_id: 'supplier-id',
      destination_location_id: 'location-id',
      receipt_date: '2026-08-25',
      lines: [
        {
          variant_purchase_presentation_id: 'presentation-id',
          received_packages: 10,
          gross_amount: '4800',
        },
      ],
    }
    receiptApi.create(payload)
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/receipts', payload)
  })

  it('updates a draft receipt', () => {
    const payload = {
      supplier_id: 'supplier-id',
      destination_location_id: 'location-id',
      receipt_date: '2026-08-25',
      lines: [{ variant_purchase_presentation_id: 'presentation-id', received_packages: 12 }],
    }
    receiptApi.update('receipt-id', payload)
    expect(apiClient.put).toHaveBeenCalledWith('/inventory/receipts/receipt-id', payload)
  })

  it('deletes a draft receipt', () => {
    receiptApi.delete('receipt-id')
    expect(apiClient.delete).toHaveBeenCalledWith('/inventory/receipts/receipt-id')
  })

  it('posts a receipt', () => {
    receiptApi.post('receipt-id')
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/receipts/receipt-id/post')
  })

  it('reverses a posted receipt, optionally with a reason', () => {
    receiptApi.reverse('receipt-id', { reason: 'Wrong supplier' })
    expect(apiClient.post).toHaveBeenCalledWith('/inventory/receipts/receipt-id/reverse', {
      reason: 'Wrong supplier',
    })
  })
})
