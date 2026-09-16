import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { getApiErrorMessage } from '@/lib/api-error'
import { stockTransferApi } from '../api/stock-transfer-api'
import type { StockTransferLinePreview } from '../types'

export interface UseStockTransferLinePreviewArgs {
  sourceLocationId: string
  itemVariantId: string
  entryUomId: string
  entryQuantity: number
}

/**
 * Non-authoritative source-availability preview for one Stock Transfer line
 * (#613): the source Location's current on-hand/available for the chosen
 * Variant, plus the normalized base-UOM quantity the line would move if
 * posted. Debounced and gated the same way the Opening Balance preview is
 * (#570) — a preview computed for a superseded quantity is never shown.
 * Indicative only: the authoritative check happens under lock at post time
 * (#573).
 */
export function useStockTransferLinePreview({
  sourceLocationId,
  itemVariantId,
  entryUomId,
  entryQuantity,
}: UseStockTransferLinePreviewArgs) {
  const debouncedQuantity = useDebouncedValue(entryQuantity, 400)
  const previewIsStale = entryQuantity !== debouncedQuantity

  const previewEnabled =
    sourceLocationId.length > 0 &&
    itemVariantId.length > 0 &&
    entryUomId.length > 0 &&
    Number.isFinite(debouncedQuantity) &&
    debouncedQuantity > 0

  const previewQuery = useQuery<StockTransferLinePreview, unknown>({
    queryKey: [
      'stock-transfer-line-preview',
      sourceLocationId,
      itemVariantId,
      entryUomId,
      debouncedQuantity,
    ],
    enabled: previewEnabled,
    retry: false,
    // Bypass the app's global 5-minute staleTime (#613): this reads a live
    // Stock balance, and nothing invalidates this query's own namespace when
    // a Transfer posts/reverses (those only invalidate the Existencias
    // dashboard's own query keys). Without this, reopening the form on the
    // same Location/Variant/UOM/quantity within that window could silently
    // show a pre-movement figure from the cache instead of a fresh read.
    staleTime: 0,
    queryFn: async () => {
      const response = await stockTransferApi.preview({
        source_location_id: sourceLocationId,
        item_variant_id: itemVariantId,
        entry_uom_id: entryUomId,
        entry_quantity: debouncedQuantity,
      })
      return response.data.data
    },
  })

  return {
    // Never expose a preview computed for superseded input.
    preview: previewIsStale ? undefined : previewQuery.data,
    previewLoading: previewEnabled && (previewQuery.isFetching || previewIsStale),
    previewErrorMessage:
      previewQuery.isError && !previewIsStale
        ? getApiErrorMessage(previewQuery.error, 'No se pudo calcular la disponibilidad en origen')
        : undefined,
  }
}
