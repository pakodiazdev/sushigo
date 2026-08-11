import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dishApi, dishCategoryApi, dishExtraGroupApi, dishExtraOptionApi } from '../dishes-api'

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

// ── dishApi ──────────────────────────────────────────────────────────────────

describe('dishApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /dishes without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await dishApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/dishes', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /dishes with filters', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { dish_category_id: 'cat-1', is_active: true, search: 'roll' }
            const result = await dishApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/dishes', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('get', () => {
        it('calls GET /dishes/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'd-1' } } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await dishApi.get('d-1')

            expect(apiClient.get).toHaveBeenCalledWith('/dishes/d-1')
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /dishes', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'd-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { name: 'California Roll', dish_category_id: 'cat-1', base_price: 120 }
            const result = await dishApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/dishes', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /dishes/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'd-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { name: 'Updated Roll' }
            const result = await dishApi.update('d-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/dishes/d-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /dishes/:id', async () => {
            const mockResponse = { data: { status: 204 } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await dishApi.delete('d-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/dishes/d-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── dishCategoryApi ──────────────────────────────────────────────────────────

describe('dishCategoryApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('list', () => {
        it('calls GET /dish-categories without params', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const result = await dishCategoryApi.list()

            expect(apiClient.get).toHaveBeenCalledWith('/dish-categories', { params: undefined })
            expect(result).toEqual(mockResponse)
        })

        it('calls GET /dish-categories with is_active filter', async () => {
            const mockResponse = { data: { status: 200, data: [], meta: null } }
            vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

            const params = { is_active: true }
            const result = await dishCategoryApi.list(params)

            expect(apiClient.get).toHaveBeenCalledWith('/dish-categories', { params })
            expect(result).toEqual(mockResponse)
        })
    })

    describe('create', () => {
        it('calls POST /dish-categories', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'cat-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { name: 'Rollos' }
            const result = await dishCategoryApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/dish-categories', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /dish-categories/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'cat-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { position: 1 }
            const result = await dishCategoryApi.update('cat-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/dish-categories/cat-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /dish-categories/:id', async () => {
            const mockResponse = { data: { status: 204 } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await dishCategoryApi.delete('cat-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/dish-categories/cat-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── dishExtraGroupApi ────────────────────────────────────────────────────────

describe('dishExtraGroupApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('create', () => {
        it('calls POST /dish-extra-groups', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'group-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { dish_id: 'd-1', name: 'Elige tu salsa', selection_type: 'SINGLE' as const }
            const result = await dishExtraGroupApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/dish-extra-groups', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /dish-extra-groups/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'group-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { is_required: true }
            const result = await dishExtraGroupApi.update('group-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/dish-extra-groups/group-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /dish-extra-groups/:id', async () => {
            const mockResponse = { data: { status: 204 } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await dishExtraGroupApi.delete('group-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/dish-extra-groups/group-1')
            expect(result).toEqual(mockResponse)
        })
    })
})

// ── dishExtraOptionApi ───────────────────────────────────────────────────────

describe('dishExtraOptionApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('create', () => {
        it('calls POST /dish-extra-options', async () => {
            const mockResponse = { data: { status: 201, data: { id: 'opt-1' } } }
            vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

            const data = { dish_extra_group_id: 'group-1', name: 'Soya', price_delta: 0 }
            const result = await dishExtraOptionApi.create(data)

            expect(apiClient.post).toHaveBeenCalledWith('/dish-extra-options', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('update', () => {
        it('calls PUT /dish-extra-options/:id', async () => {
            const mockResponse = { data: { status: 200, data: { id: 'opt-1' } } }
            vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

            const data = { price_delta: 10 }
            const result = await dishExtraOptionApi.update('opt-1', data)

            expect(apiClient.put).toHaveBeenCalledWith('/dish-extra-options/opt-1', data)
            expect(result).toEqual(mockResponse)
        })
    })

    describe('delete', () => {
        it('calls DELETE /dish-extra-options/:id', async () => {
            const mockResponse = { data: { status: 204 } }
            vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

            const result = await dishExtraOptionApi.delete('opt-1')

            expect(apiClient.delete).toHaveBeenCalledWith('/dish-extra-options/opt-1')
            expect(result).toEqual(mockResponse)
        })
    })
})
