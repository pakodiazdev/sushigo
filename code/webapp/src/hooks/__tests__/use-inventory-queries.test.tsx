/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useInventoryLocationsSelect,
  useItemsSelect,
  useItemVariantsSelect,
  useUnitsOfMeasureSelect,
  useOperatingUnitsSelect,
  inventoryQueryKeys,
  toSelectOptions,
  findById,
} from '../use-inventory-queries'
import * as inventoryApi from '@/services/inventory-api'
import * as apiClient from '@/lib/api-client'

// Mock the inventory API
vi.mock('@/services/inventory-api', () => ({
  inventoryLocationApi: {
    list: vi.fn(),
  },
  itemApi: {
    list: vi.fn(),
  },
  itemVariantApi: {
    list: vi.fn(),
  },
}))

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('Inventory Query Hooks', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  describe('useInventoryLocationsSelect', () => {
    it('should fetch and sort locations by priority', async () => {
      const mockLocations = [
        { id: 1, name: 'Kitchen', priority: 50 },
        { id: 2, name: 'Main Storage', priority: 100 },
        { id: 3, name: 'Bar', priority: 75 },
      ]

      vi.mocked(inventoryApi.inventoryLocationApi.list).mockResolvedValue({
        data: { data: mockLocations },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.inventoryLocationApi.list>>)

      const { result } = renderHook(() => useInventoryLocationsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should be sorted by priority descending
      const data = result.current.data!
      expect(data[0]!.name).toBe('Main Storage')
      expect(data[1]!.name).toBe('Bar')
      expect(data[2]!.name).toBe('Kitchen')
    })

    it('should sort by name when priorities are equal', async () => {
      const mockLocations = [
        { id: 1, name: 'Zone B', priority: 100 },
        { id: 2, name: 'Zone A', priority: 100 },
      ]

      vi.mocked(inventoryApi.inventoryLocationApi.list).mockResolvedValue({
        data: { data: mockLocations },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.inventoryLocationApi.list>>)

      const { result } = renderHook(() => useInventoryLocationsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const sortedData = result.current.data!
      expect(sortedData[0]!.name).toBe('Zone A')
      expect(sortedData[1]!.name).toBe('Zone B')
    })

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useInventoryLocationsSelect(false), { wrapper })

      expect(result.current.isFetching).toBe(false)
      expect(inventoryApi.inventoryLocationApi.list).not.toHaveBeenCalled()
    })
  })

  describe('useItemsSelect', () => {
    it('should fetch items', async () => {
      const mockItems = [
        { id: 1, name: 'Salmon' },
        { id: 2, name: 'Rice' },
      ]

      vi.mocked(inventoryApi.itemApi.list).mockResolvedValue({
        data: { data: mockItems },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.itemApi.list>>)

      const { result } = renderHook(() => useItemsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockItems)
    })

    it('should return empty array when no data', async () => {
      vi.mocked(inventoryApi.itemApi.list).mockResolvedValue({
        data: { data: null },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.itemApi.list>>)

      const { result } = renderHook(() => useItemsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])
    })

    it('excludes PRODUCTO-type items server-side (before pagination) — this picker only feeds the legacy global Variant page, and Product variants must be created via /inventory/products/{id}/variants instead (#429)', async () => {
      // Filtering must happen server-side, not client-side after the fact: a client-side filter
      // on a single paginated page would silently drop eligible INSUMO/ACTIVO rows that land on
      // a later page once an installation has more than 100 active items.
      const mockItems = [
        { id: 1, name: 'Salmon', type: 'INSUMO' },
        { id: 3, name: 'Rice Cooker', type: 'ACTIVO' },
      ]

      vi.mocked(inventoryApi.itemApi.list).mockResolvedValue({
        data: { data: mockItems },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.itemApi.list>>)

      const { result } = renderHook(() => useItemsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(inventoryApi.itemApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'INSUMO,ACTIVO' })
      )
      expect(result.current.data).toEqual(mockItems)
    })
  })

  describe('useItemVariantsSelect', () => {
    it('should fetch variants', async () => {
      const mockVariants = [
        { id: 1, name: 'Salmon 100g', item_id: 1 },
        { id: 2, name: 'Salmon 500g', item_id: 1 },
      ]

      vi.mocked(inventoryApi.itemVariantApi.list).mockResolvedValue({
        data: { data: mockVariants },
      } as unknown as Awaited<ReturnType<typeof inventoryApi.itemVariantApi.list>>)

      const { result } = renderHook(() => useItemVariantsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockVariants)
    })
  })

  describe('useUnitsOfMeasureSelect', () => {
    it('should fetch units of measure', async () => {
      const mockUoms = [
        { id: 1, name: 'Kilogram', abbreviation: 'kg' },
        { id: 2, name: 'Gram', abbreviation: 'g' },
      ]

      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        data: { data: mockUoms },
      })

      const { result } = renderHook(() => useUnitsOfMeasureSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUoms)
      expect(apiClient.apiClient.get).toHaveBeenCalledWith('/units-of-measure', {
        params: { is_active: true, per_page: 100 },
      })
    })
  })

  describe('useOperatingUnitsSelect', () => {
    it('should fetch operating units', async () => {
      const mockUnits = [
        { id: 1, name: 'Main Branch', type: 'BRANCH' },
        { id: 2, name: 'Kitchen', type: 'KITCHEN' },
      ]

      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        data: { data: mockUnits },
      })

      const { result } = renderHook(() => useOperatingUnitsSelect(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockUnits)
      expect(apiClient.apiClient.get).toHaveBeenCalledWith('/operating-units', {
        params: { per_page: 100, page: 1 },
      })
    })

    it('should fetch every page of operating units', async () => {
      // ListOperatingUnitsController returns Laravel's paginator directly — last_page sits at
      // the response root, not under a `meta` wrapper.
      const firstPage = [{ id: 1, name: 'Main Branch', type: 'BRANCH' }]
      const secondPage = [{ id: 2, name: 'Kitchen', type: 'KITCHEN' }]
      vi.mocked(apiClient.apiClient.get)
        .mockResolvedValueOnce({
          data: { data: firstPage, current_page: 1, last_page: 2, total: 2 },
        })
        .mockResolvedValueOnce({
          data: { data: secondPage, current_page: 2, last_page: 2, total: 2 },
        })

      const { result } = renderHook(() => useOperatingUnitsSelect(), { wrapper })

      await waitFor(() => expect(result.current.data).toEqual([...firstPage, ...secondPage]))
      expect(apiClient.apiClient.get).toHaveBeenNthCalledWith(1, '/operating-units', {
        params: { per_page: 100, page: 1 },
      })
      expect(apiClient.apiClient.get).toHaveBeenNthCalledWith(2, '/operating-units', {
        params: { per_page: 100, page: 2 },
      })
    })

    it('does not filter out inactive units — LocationForm must keep showing an already-assigned unit even if it has since gone inactive', async () => {
      const mockUnits = [
        { id: 1, name: 'Main Branch', type: 'BRANCH', is_active: true },
        { id: 2, name: 'Retired Kiosk', type: 'KITCHEN', is_active: false },
      ]

      vi.mocked(apiClient.apiClient.get).mockResolvedValue({
        data: { data: mockUnits },
      })

      const { result } = renderHook(() => useOperatingUnitsSelect(), { wrapper })

      await waitFor(() => expect(result.current.data).toEqual(mockUnits))
      const params = vi.mocked(apiClient.apiClient.get).mock.calls[0]![1] as { params: Record<string, unknown> }
      expect(params.params).not.toHaveProperty('is_active')
    })
  })
})

describe('inventoryQueryKeys', () => {
  it('should generate correct query keys', () => {
    expect(inventoryQueryKeys.all).toEqual(['inventory'])
    expect(inventoryQueryKeys.locations()).toEqual(['inventory', 'locations'])
    expect(inventoryQueryKeys.locationsList({ type: 'MAIN' })).toEqual([
      'inventory',
      'locations',
      'list',
      { type: 'MAIN' },
    ])
    expect(inventoryQueryKeys.items()).toEqual(['inventory', 'items'])
    expect(inventoryQueryKeys.itemsList()).toEqual(['inventory', 'items', 'list', undefined])
    expect(inventoryQueryKeys.variants()).toEqual(['inventory', 'variants'])
    expect(inventoryQueryKeys.unitsOfMeasure()).toEqual(['inventory', 'units-of-measure'])
    expect(inventoryQueryKeys.operatingUnits()).toEqual(['operating-units'])
  })
})

describe('helper functions', () => {
  describe('toSelectOptions', () => {
    it('should convert entities to select options', () => {
      const items = [
        { id: 1, name: 'Item A' },
        { id: 2, name: 'Item B' },
      ]

      const options = toSelectOptions(items)

      expect(options).toEqual([
        { value: 1, label: 'Item A' },
        { value: 2, label: 'Item B' },
      ])
    })

    it('should use custom label function', () => {
      const items = [
        { id: 1, name: 'Item A', code: 'A001' },
        { id: 2, name: 'Item B', code: 'B001' },
      ]

      const options = toSelectOptions(items, (item) => `${item.code} - ${item.name}`)

      expect(options).toEqual([
        { value: 1, label: 'A001 - Item A' },
        { value: 2, label: 'B001 - Item B' },
      ])
    })
  })

  describe('findById', () => {
    it('should find item by id', () => {
      const items = [
        { id: 1, name: 'Item A' },
        { id: 2, name: 'Item B' },
      ]

      expect(findById(items, 2)).toEqual({ id: 2, name: 'Item B' })
    })

    it('should return undefined for non-existent id', () => {
      const items = [{ id: 1, name: 'Item A' }]

      expect(findById(items, 999)).toBeUndefined()
    })
  })
})
