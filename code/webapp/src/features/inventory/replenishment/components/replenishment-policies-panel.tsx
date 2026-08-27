import { AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocationReplenishmentPolicies } from '../hooks/use-location-replenishment-policies'
import { ReplenishmentPolicyForm } from './replenishment-policy-form'

/** One row of the embedding Stock/Location summary, plus its resolved policy (#439). */
export interface ReplenishmentPanelItem {
  item_variant_id: string
  item_variant_code: string
  item_variant_name: string
  min_stock: number | null
  max_stock: number | null
  is_low_stock: boolean
}

interface ReplenishmentPoliciesPanelProps {
  readonly locationId: string
  readonly items: readonly ReplenishmentPanelItem[]
}

/**
 * Minimal per-Inventory-Location replenishment management (#439), rendered in
 * the Stock Dashboard's per-location detail. Each variant that has stock here
 * gets an inline reorder-point / ceiling editor; clearing a threshold removes
 * the policy so the pair stops being eligible for low-stock alerts.
 */
export function ReplenishmentPoliciesPanel({ locationId, items }: ReplenishmentPoliciesPanelProps) {
  const { editingVariantId, startEditing, cancelEditing, save, clear, isSaving, isClearing } =
    useLocationReplenishmentPolicies(locationId)

  return (
    <div className="border-t border-gray-200 pt-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        Replenishment thresholds
      </h4>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stock at this location yet — thresholds are configured per variant that has stock here.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isConfigured = item.min_stock !== null || item.max_stock !== null
            const isEditing = editingVariantId === item.item_variant_id

            return (
              <div
                key={item.item_variant_id}
                className="rounded-lg bg-gray-50 p-3"
                data-testid={`replenishment-row-${item.item_variant_code}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {item.item_variant_code}
                      {item.is_low_stock && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" /> Low
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{item.item_variant_name}</div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {isConfigured
                          ? `Reorder ${item.min_stock ?? 0} · Ceiling ${item.max_stock ?? 0}`
                          : 'No threshold set'}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => startEditing(item.item_variant_id)}>
                        {isConfigured ? 'Edit' : 'Set'}
                      </Button>
                      {isConfigured && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isClearing}
                          onClick={() => clear(item.item_variant_id)}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-3">
                    <ReplenishmentPolicyForm
                      defaultValues={{
                        min_stock: item.min_stock ?? 0,
                        max_stock: item.max_stock ?? 0,
                        notes: '',
                      }}
                      isSaving={isSaving}
                      onCancel={cancelEditing}
                      onSubmit={(values) => save(item.item_variant_id, values)}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
