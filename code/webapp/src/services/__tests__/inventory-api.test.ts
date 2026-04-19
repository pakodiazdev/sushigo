import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  inventoryLocationApi,
  itemApi,
  itemVariantApi,
  stockApi,
  stockMovementApi,
} from '../inventory-api'

// ── Mock ───────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api-client'

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('inventoryLocationApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('calls GET /inventory-locations without params', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await inventoryLocationApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('calls GET /inventory-locations with filters', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { type: 'BRANCH', is_active: true, search: 'almacen' }
      const result = await inventoryLocationApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('get', () => {
    it('calls GET /inventory-locations/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 1 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await inventoryLocationApi.get(1)

      expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations/1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('create', () => {
    it('calls POST /inventory-locations', async () => {
      const mockResponse = { data: { status: 201, data: { id: 1 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = { name: 'Almacén Principal', type: 'MAIN' as const }
      const result = await inventoryLocationApi.create(data)

      expect(apiClient.post).toHaveBeenCalledWith('/inventory-locations', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('update', () => {
    it('calls PUT /inventory-locations/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 1 } } }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const data = { name: 'Almacén Actualizado' }
      const result = await inventoryLocationApi.update(1, data)

      expect(apiClient.put).toHaveBeenCalledWith('/inventory-locations/1', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('calls DELETE /inventory-locations/:id', async () => {
      const mockResponse = { data: { status: 204 } }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await inventoryLocationApi.delete(1)

      expect(apiClient.delete).toHaveBeenCalledWith('/inventory-locations/1')
      expect(result).toEqual(mockResponse)
    })
  })
})

// ── itemApi ──────────────────────────────────────────────────────────────────

describe('itemApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('calls GET /items without params', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await itemApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/items', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('calls GET /items with filters', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { type: 'SUPPLY', is_active: true }
      const result = await itemApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/items', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('get', () => {
    it('calls GET /items/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 1 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await itemApi.get(1)

      expect(apiClient.get).toHaveBeenCalledWith('/items/1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('create', () => {
    it('calls POST /items', async () => {
      const mockResponse = { data: { status: 201, data: { id: 1 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = { name: 'Atún', sku: 'ATN001', type: 'INSUMO' as const }
      const result = await itemApi.create(data)

      expect(apiClient.post).toHaveBeenCalledWith('/items', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('update', () => {
    it('calls PUT /items/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 1 } } }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const data = { name: 'Atún Aleta Amarilla' }
      const result = await itemApi.update(1, data)

      expect(apiClient.put).toHaveBeenCalledWith('/items/1', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('calls DELETE /items/:id', async () => {
      const mockResponse = { data: { status: 204 } }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await itemApi.delete(1)

      expect(apiClient.delete).toHaveBeenCalledWith('/items/1')
      expect(result).toEqual(mockResponse)
    })
  })
})

// ── itemVariantApi ───────────────────────────────────────────────────────────

describe('itemVariantApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('calls GET /item-variants without params', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await itemVariantApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/item-variants', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('calls GET /item-variants with item_id filter', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { item_id: 5 }
      const result = await itemVariantApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/item-variants', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('get', () => {
    it('calls GET /item-variants/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 10 } } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await itemVariantApi.get(10)

      expect(apiClient.get).toHaveBeenCalledWith('/item-variants/10')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('create', () => {
    it('calls POST /item-variants', async () => {
      const mockResponse = { data: { status: 201, data: { id: 10 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = { item_id: 1, code: 'ATN-500G', name: 'Atún 500g' }
      const result = await itemVariantApi.create(data)

      expect(apiClient.post).toHaveBeenCalledWith('/item-variants', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('update', () => {
    it('calls PUT /item-variants/:id', async () => {
      const mockResponse = { data: { status: 200, data: { id: 10 } } }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const data = { name: 'Atún Lata 500g' }
      const result = await itemVariantApi.update(10, data)

      expect(apiClient.put).toHaveBeenCalledWith('/item-variants/10', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('delete', () => {
    it('calls DELETE /item-variants/:id', async () => {
      const mockResponse = { data: { status: 204 } }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      const result = await itemVariantApi.delete(10)

      expect(apiClient.delete).toHaveBeenCalledWith('/item-variants/10')
      expect(result).toEqual(mockResponse)
    })
  })
})

// ── stockApi ─────────────────────────────────────────────────────────────────

describe('stockApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('calls GET /stock without params', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await stockApi.list()

      expect(apiClient.get).toHaveBeenCalledWith('/stock', { params: undefined })
      expect(result).toEqual(mockResponse)
    })

    it('calls GET /stock with location_id filter', async () => {
      const mockResponse = { data: { status: 200, data: [], meta: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { location_id: 1 }
      const result = await stockApi.list(params)

      expect(apiClient.get).toHaveBeenCalledWith('/stock', { params })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('byLocation', () => {
    it('calls GET /stock/by-location/:locationId', async () => {
      const mockResponse = {
        data: {
          status: 200,
          data: {
            inventory_location: { id: 1, name: 'Test' },
            summary: { total_variants: 10 },
            items: [],
          },
        },
      }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await stockApi.byLocation(1)

      expect(apiClient.get).toHaveBeenCalledWith('/stock/by-location/1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('byVariant', () => {
    it('calls GET /stock/by-variant/:variantId', async () => {
      const mockResponse = { data: { status: 200, data: {} } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await stockApi.byVariant(5)

      expect(apiClient.get).toHaveBeenCalledWith('/stock/by-variant/5')
      expect(result).toEqual(mockResponse)
    })
  })
})

// ── stockMovementApi ─────────────────────────────────────────────────────────

describe('stockMovementApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('openingBalance', () => {
    it('calls POST /inventory/opening-balance', async () => {
      const mockResponse = { data: { status: 201, data: { id: 1 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = {
        inventory_location_id: 1,
        item_variant_id: 10,
        quantity: 100,
        uom_id: 1,
        unit_cost: 25.5,
        notes: 'Balance inicial',
      }

      const result = await stockMovementApi.openingBalance(data)

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/opening-balance', data)
      expect(result).toEqual(mockResponse)
    })

    it('calls POST /inventory/opening-balance without optional fields', async () => {
      const mockResponse = { data: { status: 201, data: { id: 1 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = {
        inventory_location_id: 1,
        item_variant_id: 10,
        quantity: 50,
        uom_id: 1,
      }

      const result = await stockMovementApi.openingBalance(data)

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/opening-balance', data)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('stockOut', () => {
    it('calls POST /inventory/stock-out with SALE reason', async () => {
      const mockResponse = { data: { status: 201, data: { id: 2 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = {
        location_id: 1,
        variant_id: 10,
        qty: 5,
        uom_id: 1,
        reason: 'SALE' as const,
        sale_price: 150.0,
        notes: 'Venta mostrador',
      }

      const result = await stockMovementApi.stockOut(data)

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/stock-out', data)
      expect(result).toEqual(mockResponse)
    })

    it('calls POST /inventory/stock-out with CONSUMPTION reason', async () => {
      const mockResponse = { data: { status: 201, data: { id: 3 } } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const data = {
        location_id: 1,
        variant_id: 10,
        qty: 2,
        uom_id: 1,
        reason: 'CONSUMPTION' as const,
      }

      const result = await stockMovementApi.stockOut(data)

      expect(apiClient.post).toHaveBeenCalledWith('/inventory/stock-out', data)
      expect(result).toEqual(mockResponse)
    })
  })
})
