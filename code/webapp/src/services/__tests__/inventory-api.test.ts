import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    brandApi,
    inventoryCategoryApi,
    inventoryLocationApi,
    itemApi,
    itemVariantApi,
    productApi,
    productVariantApi,
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

        it('forwards the can_receive_purchases filter (#568)', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            await inventoryLocationApi.list({ can_receive_purchases: true })

            expect(apiClient.get).toHaveBeenCalledWith('/inventory-locations', {
                params: { can_receive_purchases: true },
            })
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

// ── productApi ───────────────────────────────────────────────────────────────

describe('productApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /inventory/products without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await productApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /inventory/products with brand/category/status/search filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = {
                search: 'Coca-Cola',
                brand_id: 'brand-ulid',
                inventory_category_id: 'cat-ulid',
                is_active: true,
            }
            const result = await productApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /inventory/products/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 42 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await productApi.get(42)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products/42')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /inventory/products', async () => {
            const mockResponse = { data: { status: 201, data: { id: 42 } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { name: 'Coca-Cola Original 600 ml', inventory_category_id: 'cat-ulid' }
            const result = await productApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/inventory/products', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /inventory/products/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 42 } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Coca-Cola Zero 600 ml' }
            const result = await productApi.update(42, data)

            expect(apiClient.put).toHaveBeenCalledWith('/inventory/products/42', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /inventory/products/:id', async () => {
            const mockResponse = { data: { status: 200 } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await productApi.delete(42)

            expect(apiClient.delete).toHaveBeenCalledWith('/inventory/products/42')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── productVariantApi ────────────────────────────────────────────────────────

describe('productVariantApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /inventory/products/:productId/variants without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await productVariantApi.list(42)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products/42/variants', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /inventory/products/:productId/variants with pagination params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { per_page: 10, page: 2 }
            const result = await productVariantApi.list(42, params)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products/42/variants', { params })
            expect(result).toEqual(mockResponse)
        })

        it('forwards a free-text search param', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { search: 'salmon', per_page: 20 }
            await productVariantApi.list('42', params)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products/42/variants', { params })
        })
    })

    describe('get', () => {
        it('calls GET /inventory/products/:productId/variants/:variantId', async () => {
            const mockResponse = { data: { status: 200, data: { id: 7 } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await productVariantApi.get(42, 7)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory/products/42/variants/7')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /inventory/products/:productId/variants', async () => {
            const mockResponse = { data: { status: 201, data: { id: 7 } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { name: 'Arroz Premium 1kg', code: 'ARR-KG', uom_id: '01UOM' }
            const result = await productVariantApi.create('42', data)

            expect(apiClient.post).toHaveBeenCalledWith('/inventory/products/42/variants', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /inventory/products/:productId/variants/:variantId', async () => {
            const mockResponse = { data: { status: 200, data: { id: 7 } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Arroz Premium 2kg', is_active: false }
            const result = await productVariantApi.update(42, 7, data)

            expect(apiClient.put).toHaveBeenCalledWith('/inventory/products/42/variants/7', data)
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── brandApi ─────────────────────────────────────────────────────────────────

describe('brandApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /brands without params', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await brandApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/brands', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /brands with is_active filter', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { is_active: true }
            const result = await brandApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/brands', { params })
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── inventoryCategoryApi ─────────────────────────────────────────────────────

describe('inventoryCategoryApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /inventory-categories without params', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await inventoryCategoryApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/inventory-categories', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /inventory-categories with is_active filter', async () => {
            const mockResponse = { data: { status: 200, data: [] } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { is_active: true }
            const result = await inventoryCategoryApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/inventory-categories', { params })
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
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-10',
                quantity: 100,
                uom_id: 'uom-01',
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
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-10',
                quantity: 50,
                uom_id: 'uom-01',
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
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-10',
                qty: 5,
                uom_id: 'uom-01',
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
                inventory_location_id: 'location-01',
                item_variant_id: 'variant-10',
                qty: 2,
                uom_id: 'uom-01',
                reason: 'CONSUMPTION' as const,
            }

            const result = await stockMovementApi.stockOut(data)

            expect(apiClient.post).toHaveBeenCalledWith('/inventory/stock-out', data)
            expect(result).toEqual(mockResponse)
        })
    })
})
