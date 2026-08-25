import { describe, it, expect, vi, beforeEach } from 'vitest'
import { priceListApi, priceListAssignmentApi, variantPriceApi, pricingResolveApi } from '../pricing-api'

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

// ── priceListApi ─────────────────────────────────────────────────────────────

describe('priceListApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /pricing/price-lists without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await priceListApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-lists', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /pricing/price-lists with filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { is_active: true, per_page: 15, page: 2 }
            const result = await priceListApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-lists', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /pricing/price-lists/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'pl-1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await priceListApi.get('pl-1')

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-lists/pl-1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /pricing/price-lists', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'pl-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { code: 'STANDARD', name: 'Standard Pricing', priority: 0 }
            const result = await priceListApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/pricing/price-lists', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /pricing/price-lists/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'pl-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Updated Name' }
            const result = await priceListApi.update('pl-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/pricing/price-lists/pl-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /pricing/price-lists/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await priceListApi.delete('pl-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/pricing/price-lists/pl-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── priceListAssignmentApi ──────────────────────────────────────────────────

describe('priceListAssignmentApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /pricing/price-list-assignments without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await priceListAssignmentApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-list-assignments', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /pricing/price-list-assignments with filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { branch_id: 1, per_page: 100 }
            const result = await priceListAssignmentApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-list-assignments', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /pricing/price-list-assignments', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'pla-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = {
                price_list_id: 'pl-1',
                branch_id: 1,
                operating_unit_id: null,
                effective_from: '2026-01-01',
            }
            const result = await priceListAssignmentApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/pricing/price-list-assignments', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /pricing/price-list-assignments/:id without branch_id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'pla-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { effective_to: '2026-12-31', is_active: false }
            const result = await priceListAssignmentApi.update('pla-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/pricing/price-list-assignments/pla-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /pricing/price-list-assignments/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await priceListAssignmentApi.delete('pla-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/pricing/price-list-assignments/pla-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── variantPriceApi ──────────────────────────────────────────────────────────

describe('variantPriceApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /pricing/price-lists/:priceListId/variant-prices', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: {} } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await variantPriceApi.list('pl-1', { per_page: 100 })

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/price-lists/pl-1/variant-prices', {
                params: { per_page: 100 },
            })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /pricing/price-lists/:priceListId/variant-prices', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'vp-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { item_variant_id: 'iv-1', price: '129.5000', effective_from: '2026-01-01' }
            const result = await variantPriceApi.create('pl-1', data)

            expect(apiClient.post).toHaveBeenCalledWith('/pricing/price-lists/pl-1/variant-prices', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /pricing/price-lists/:priceListId/variant-prices/:id without item_variant_id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'vp-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { price: '99.9900' }
            const result = await variantPriceApi.update('pl-1', 'vp-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/pricing/price-lists/pl-1/variant-prices/vp-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /pricing/price-lists/:priceListId/variant-prices/:id', async () => {
            const mockResponse = { data: { status: 200, message: 'deleted' } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await variantPriceApi.delete('pl-1', 'vp-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/pricing/price-lists/pl-1/variant-prices/vp-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── pricingResolveApi ────────────────────────────────────────────────────────

describe('pricingResolveApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('resolve', () => {
        it('calls GET /pricing/resolve with the given context', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: {
                        item_variant_id: 'iv-1',
                        branch_id: 1,
                        operating_unit_id: null,
                        as_of: '2026-08-25',
                        resolved: true,
                        price: '129.5000',
                        price_list: { id: 'pl-1', code: 'STANDARD', name: 'Standard Pricing' },
                    },
                },
            }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { item_variant_id: 'iv-1', branch_id: 1 }
            const result = await pricingResolveApi.resolve(params)

            expect(apiClient.get).toHaveBeenCalledWith('/pricing/resolve', { params })
            expect(result).toEqual(mockResponse)
        })

        it('surfaces an explicit resolved:false result, not an error', async () => {
            const mockResponse = {
                data: {
                    status: 200,
                    data: {
                        item_variant_id: 'iv-1',
                        branch_id: 1,
                        operating_unit_id: null,
                        as_of: '2026-08-25',
                        resolved: false,
                        price: null,
                        price_list: null,
                    },
                },
            }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await pricingResolveApi.resolve({ item_variant_id: 'iv-1', branch_id: 1 })

            expect(result.data.data.resolved).toBe(false)
            expect(result.data.data.price).toBeNull()
        })
    })
})
