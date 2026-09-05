import { createFileRoute } from '@tanstack/react-router'
import { MovementsPage } from '@/features/inventory/movements'
import { requirePermission } from '@/lib/route-guards'
import type { MovementsSearch } from '@/features/inventory/movements/hooks/use-movements-page'

const REASONS = new Set([
  'TRANSFER',
  'RETURN',
  'SALE',
  'ADJUSTMENT',
  'CONSUMPTION',
  'OPENING_BALANCE',
  'COUNT_VARIANCE',
  'PURCHASE_RECEIPT',
  'PURCHASE_RECEIPT_REVERSAL',
])
const STATUSES = new Set(['DRAFT', 'POSTED', 'REVERSED'])

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** A hand-crafted `?page=-2` / `?page=1.5` must degrade to page 1, not 422 the API. */
function positiveIntOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export const Route = createFileRoute('/inventario/movimientos')({
  // The immutable ledger is a pure read — reuse stock.view, the same gate the
  // Stock dashboard and query endpoints carry (#574).
  beforeLoad: requirePermission('stock.view'),
  component: MovementsPage,
  validateSearch: (search: Record<string, unknown>): MovementsSearch => {
    const reason = str(search.reason)
    const status = str(search.status)
    const sourceType = str(search.source_type)

    return {
      page: positiveIntOrUndefined(search.page),
      location_id: str(search.location_id),
      item_variant_id: str(search.item_variant_id),
      reason: reason && REASONS.has(reason) ? (reason as MovementsSearch['reason']) : undefined,
      status: status && STATUSES.has(status) ? (status as MovementsSearch['status']) : undefined,
      date_from: str(search.date_from),
      date_to: str(search.date_to),
      search: str(search.search),
      source_type: sourceType === 'receipt' ? 'receipt' : undefined,
      movement: str(search.movement),
    }
  },
})
