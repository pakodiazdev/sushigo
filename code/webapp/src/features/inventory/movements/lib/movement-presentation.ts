import type {
  MovementDirection,
  MovementReason,
  MovementSourceRef,
  MovementStatus,
  StockMovementSummary,
} from '../types'

export const reasonLabels: Record<MovementReason, string> = {
  TRANSFER: 'Traspaso',
  RETURN: 'Devolución',
  SALE: 'Venta',
  ADJUSTMENT: 'Ajuste',
  CONSUMPTION: 'Consumo',
  OPENING_BALANCE: 'Saldo inicial',
  COUNT_VARIANCE: 'Diferencia de conteo',
  PURCHASE_RECEIPT: 'Recepción de compra',
  PURCHASE_RECEIPT_REVERSAL: 'Reversa de recepción',
}

export const statusLabels: Record<MovementStatus, string> = {
  DRAFT: 'Borrador',
  POSTED: 'Publicado',
  REVERSED: 'Revertido',
}

export const statusBadgeClasses: Record<MovementStatus, string> = {
  POSTED:
    'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50',
  REVERSED:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50',
  DRAFT: 'bg-muted text-muted-foreground ring-border',
}

interface DirectionPresentation {
  label: string
  /** Screen-reader description of the physical stock effect. */
  srLabel: string
  badgeClass: string
  /** '↓' inbound, '↑' outbound, '↔' both, '±' single-location adjustment. */
  glyph: string
}

export const directionPresentation: Record<MovementDirection, DirectionPresentation> = {
  entry: {
    label: 'Entrada',
    srLabel: 'Entrada de existencia hacia una ubicación',
    badgeClass:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/50',
    glyph: '↓',
  },
  exit: {
    label: 'Salida',
    srLabel: 'Salida de existencia desde una ubicación',
    badgeClass:
      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800/50',
    glyph: '↑',
  },
  transfer: {
    label: 'Traspaso',
    srLabel: 'Traspaso de existencia entre dos ubicaciones',
    badgeClass:
      'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-800/50',
    glyph: '↔',
  },
  adjustment: {
    label: 'Ajuste',
    srLabel: 'Ajuste de existencia en una sola ubicación',
    badgeClass:
      'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-800/50',
    glyph: '±',
  },
}

export const reversalBadgeClass =
  'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800/50'

/**
 * The Location a row's quantity physically affects, for the ledger table's
 * single "Ubicación" column: destination for an entry, source for an exit,
 * "origen → destino" for a transfer.
 */
export function movementLocationLabel(movement: StockMovementSummary): string {
  const from = movement.from_location?.name
  const to = movement.to_location?.name

  if (from && to) return `${from} → ${to}`
  if (to) return to
  if (from) return from
  return '—'
}

export function formatMovementTimestamp(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX')
}

/**
 * "Origen" line for the detail panel: the source-document type, followed by its
 * public id when one survives (null for a manual movement or a hard-deleted
 * source).
 */
export function formatMovementSource(source: MovementSourceRef | null): string {
  if (!source) return 'Movimiento manual'
  if (!source.id) return source.type
  return `${source.type} · ${source.id}`
}
