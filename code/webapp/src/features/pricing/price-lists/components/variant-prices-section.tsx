import { Loader2, Plus, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useCanAccess } from '@/hooks/use-can-access'
import type { ItemVariant } from '@/types/inventory'
import type { VariantPrice } from '../types'

interface VariantPricesSectionProps {
  variantPrices: VariantPrice[]
  variantDetailsById: Record<string, ItemVariant>
  isLoading: boolean
  isError: boolean
  onNewVariantPrice: () => void
  onVariantPriceClick: (variantPrice: VariantPrice) => void
}

/** "ItemName — VariantName" when the parent Item's name is known, else just "VariantName". */
function variantLabel(variant: ItemVariant): string {
  return [variant.item?.name, variant.name].filter(Boolean).join(' — ')
}

/**
 * The embedded Variant Prices list shown inline in a Price List's detail view — sibling to
 * AssignmentsSection. VariantPriceResource never returns a nested Variant name/code (only its
 * bare id), so rows fall back to the id while `variantDetailsById`'s batch lookup is still in
 * flight — see use-price-list-variant-prices.ts.
 */
export function VariantPricesSection({
  variantPrices,
  variantDetailsById,
  isLoading,
  isError,
  onNewVariantPrice,
  onVariantPriceClick,
}: Readonly<VariantPricesSectionProps>) {
  const canUpdatePriceList = useCanAccess({ permission: 'price_lists.update' })
  const canViewItems = useCanAccess({ permission: 'items.view' })
  const canEditVariantPrice = canUpdatePriceList && canViewItems

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Variant Prices</p>
            <p className="text-lg font-semibold text-foreground">
              {isLoading || isError ? '—' : variantPrices.length}
            </p>
          </div>
        </div>
        {canEditVariantPrice && (
          <Button type="button" variant="outline" size="sm" onClick={onNewVariantPrice} className="gap-1">
            <Plus className="h-4 w-4" />
            New Price
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-muted-foreground">Failed to load variant prices. Please try again.</p>
      )}

      {!isLoading && !isError && variantPrices.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No prices yet. Add a Variant price so this list can resolve to something.
        </p>
      )}

      {!isLoading && !isError && variantPrices.length > 0 && (
        <ul className="space-y-2">
          {variantPrices.map((variantPrice) => {
            const variant = variantDetailsById[variantPrice.item_variant_id]
            const rowContent = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {variant ? variantLabel(variant) : variantPrice.item_variant_id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {variantPrice.price} · {variantPrice.effective_from} → {variantPrice.effective_to ?? 'no end date'}
                  </p>
                </div>
                <span
                  className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${variantPrice.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                    }`}
                >
                  {variantPrice.is_active ? 'Active' : 'Inactive'}
                </span>
              </>
            )

            return (
              <li key={variantPrice.id}>
                {canEditVariantPrice ? (
                  <button
                    type="button"
                    onClick={() => onVariantPriceClick(variantPrice)}
                    className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left">
                    {rowContent}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
