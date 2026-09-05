import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage, isApiError } from '@/lib/api-error'
import { useInventoryLocationsSelect, useItemVariantsSelect } from '@/hooks/use-inventory-queries'
import { useAuthStore } from '@/stores/auth.store'
import { movementApi } from '../api/movement-api'
import { movementQueryKeys } from '../api/query-keys'
import type {
  MovementReason,
  MovementSourceType,
  MovementStatus,
  StockMovement,
} from '../types'

const PAGE_SIZE = 15

interface LocationOption {
  id: string
  name: string
}
interface VariantOption {
  id: string
  code: string
  name: string
}

/**
 * Merge the full catalog options (empty for a caller without the catalog
 * permission) with the distinct refs actually present in the movements on
 * screen, deduped by id and sorted by name — so a `stock.view`-only user can
 * still filter by whatever Locations/Variants their ledger shows, and the list
 * only grows as they page.
 */
function mergeOptions<T extends { id: string; name: string }>(
  catalog: T[],
  seen: Array<T | null | undefined>
): T[] {
  const byId = new Map<string, T>()
  for (const entry of [...catalog, ...seen]) {
    if (entry && !byId.has(entry.id)) byId.set(entry.id, entry)
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export interface MovementsSearch {
  page?: number
  location_id?: string
  item_variant_id?: string
  reason?: MovementReason
  status?: MovementStatus
  date_from?: string
  date_to?: string
  search?: string
  source_type?: MovementSourceType
  /** Public id of the movement whose detail panel is open — deep-linkable. */
  movement?: string
}

const ROUTE_ID = '/inventario/movimientos'

/**
 * Ledger list + filters + deep-linked detail, all driven off the URL search
 * params so every filter combination and the open row are shareable by copying
 * the address bar (#574). Mirrors `useEmployeesSearch`'s URL-state pattern.
 */
export function useMovementsPage() {
  const search = useSearch({ from: ROUTE_ID }) as MovementsSearch
  const navigate = useNavigate({ from: ROUTE_ID })
  const { showError } = useToast()

  const page = search.page ?? 1

  const listParams = {
    page,
    per_page: PAGE_SIZE,
    location_id: search.location_id || undefined,
    item_variant_id: search.item_variant_id || undefined,
    reason: search.reason || undefined,
    status: search.status || undefined,
    date_from: search.date_from || undefined,
    date_to: search.date_to || undefined,
    search: search.search || undefined,
    source_type: search.source_type || undefined,
  }

  const movementsQuery = useQuery({
    queryKey: movementQueryKeys.list(listParams),
    queryFn: () => movementApi.list(listParams),
    // The ledger is an audit view of an append-only history: a Stock or Receipt
    // write elsewhere adds movements/reversals this list must show, and nothing
    // cross-domain invalidates `stock-movements`. The app's global 5-minute
    // staleTime + `refetchOnWindowFocus: false` would otherwise serve a stale
    // page — override both here so re-opening or tabbing back to the ledger
    // always reflects the current history.
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const movements = movementsQuery.data?.data.data ?? []
  const totalPages = movementsQuery.data?.data.meta.last_page ?? 1
  const totalResults = movementsQuery.data?.data.meta.total ?? 0

  const isForbidden = isApiError(movementsQuery.error) && movementsQuery.error.response?.status === 403

  // A filter change can shrink the result set below the page the user was on —
  // clamp back to page 1. Gate on `isSuccess` (not merely "done fetching"): a
  // failed page-N request leaves `data` undefined so `totalPages` falls back to
  // 1, and clamping then would strand the user on page 1 and fire a second
  // request instead of letting them retry page N once the error clears.
  useEffect(() => {
    if (movementsQuery.isSuccess && page > totalPages) {
      setSearch({ page: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementsQuery.isSuccess, page, totalPages])

  useEffect(() => {
    if (movementsQuery.isError && !isForbidden) {
      showError(getApiErrorMessage(movementsQuery.error, 'No fue posible cargar los movimientos'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementsQuery.isError])

  const selectedId = search.movement ?? null

  const detailQuery = useQuery({
    queryKey: selectedId ? movementQueryKeys.detail(selectedId) : movementQueryKeys.detail('none'),
    queryFn: () => movementApi.get(selectedId as string),
    enabled: Boolean(selectedId),
    // A movement is immutable except for the POSTED -> REVERSED transition;
    // reopening its detail should reflect a reversal posted since — refetch.
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const selectedMovement: StockMovement | null = detailQuery.data?.data.data ?? null

  useEffect(() => {
    if (detailQuery.isError) {
      showError(getApiErrorMessage(detailQuery.error, 'No fue posible cargar el movimiento'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.isError])

  // Filter option sources. The ledger route only requires `stock.view`, but the
  // Location and Variant catalog endpoints that feed these dropdowns need
  // `inventory_locations.view|receipts.manage` and `items.view` respectively —
  // only fire each query when the caller actually holds that permission, so a
  // `stock.view`-only user gets no doomed 403s. That user's dropdowns are then
  // seeded from the movements on screen instead (see `mergeOptions` below), so
  // the Location/Variant filters still work for whatever their ledger contains.
  // Both select hooks page through the full catalog up front (`fetchAllPages` —
  // the repo's standard select hooks), so a Location or Variant ordered past the
  // first page stays selectable rather than depending on the merge fallback.
  const canViewLocations = useAuthStore(
    (state) => state.can('inventory_locations.view') || state.can('receipts.manage')
  )
  const canViewVariants = useAuthStore((state) => state.can('items.view'))

  const locationsQuery = useInventoryLocationsSelect(canViewLocations)
  const variantsQuery = useItemVariantsSelect(canViewVariants)

  const locationOptions: LocationOption[] = mergeOptions(
    (locationsQuery.data ?? []).map((loc) => ({ id: loc.id, name: loc.name })),
    movements.flatMap((movement) => [movement.from_location, movement.to_location])
  )
  const variantOptions: VariantOption[] = mergeOptions(
    (variantsQuery.data ?? []).map((variant) => ({
      id: variant.id,
      code: variant.code,
      name: variant.name,
    })),
    movements.map((movement) =>
      movement.variant
        ? { id: movement.variant.id, code: movement.variant.code, name: movement.variant.name }
        : null
    )
  )

  function setSearch(updates: Partial<MovementsSearch>) {
    navigate({
      search: (prev: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...prev, ...updates }
        for (const key of Object.keys(next)) {
          if (next[key] === undefined || next[key] === '') {
            delete next[key]
          }
        }
        return next
      },
    })
  }

  const setFilter = (key: keyof MovementsSearch, value: string | undefined) => {
    setSearch({ [key]: value || undefined, page: undefined })
  }

  const setPage = (next: number) => setSearch({ page: next === 1 ? undefined : next })

  const openMovement = (id: string) => setSearch({ movement: id })
  const closeMovement = () => setSearch({ movement: undefined })

  const clearFilters = () =>
    setSearch({
      location_id: undefined,
      item_variant_id: undefined,
      reason: undefined,
      status: undefined,
      date_from: undefined,
      date_to: undefined,
      search: undefined,
      source_type: undefined,
      page: undefined,
    })

  const hasActiveFilters = Boolean(
    search.location_id ||
      search.item_variant_id ||
      search.reason ||
      search.status ||
      search.date_from ||
      search.date_to ||
      search.search ||
      search.source_type
  )

  return {
    // list
    movements,
    isLoading: movementsQuery.isLoading,
    isError: movementsQuery.isError,
    isForbidden,
    page,
    totalPages,
    totalResults,
    setPage,
    // filters
    filters: {
      location_id: search.location_id ?? '',
      item_variant_id: search.item_variant_id ?? '',
      reason: search.reason ?? '',
      status: search.status ?? '',
      date_from: search.date_from ?? '',
      date_to: search.date_to ?? '',
      search: search.search ?? '',
      source_type: search.source_type ?? '',
    },
    setFilter,
    clearFilters,
    hasActiveFilters,
    locationOptions,
    variantOptions,
    // detail
    selectedId,
    selectedMovement,
    isDetailLoading: Boolean(selectedId) && detailQuery.isLoading,
    isDetailOpen: Boolean(selectedId),
    openMovement,
    closeMovement,
  }
}
