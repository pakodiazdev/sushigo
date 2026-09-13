import { Barcode, Package, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CanAccess } from '@/components/auth'
import { DetailStatus } from '@/components/ui/detail-status'
import type { ProductVariant } from '@/types/inventory'

interface ProductVariantsProps {
  variants: ProductVariant[]
  isLoading: boolean
  isError: boolean
  onNewVariant: () => void
  onVariantClick: (variant: ProductVariant) => void
  onRetry?: () => void
}

/**
 * The embedded Variant catalog shown inline in a Product's detail view — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.1 ("Variant catalog").
 * Selecting a card, or "+ New Variant", is handled by the parent products page, which takes the
 * whole SlidePanel over with a nested Variant screen (see use-product-variants.ts).
 */
export function ProductVariants({
  variants,
  isLoading,
  isError,
  onNewVariant,
  onVariantClick,
  onRetry,
}: Readonly<ProductVariantsProps>) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Variantes</p>
            <p className="text-lg font-semibold text-foreground">
              {isLoading || isError ? '—' : variants.length}
            </p>
          </div>
        </div>
        {/* manager (items.view + items.manage-media only) can reach this panel but its
            POST would only ever return 403 — hide the control it can't complete. */}
        <CanAccess permission="items.create">
          <Button type="button" variant="outline" size="sm" onClick={onNewVariant} className="gap-1">
            <Plus className="h-4 w-4" />
            Nueva variante
          </Button>
        </CanAccess>
      </div>

      {isLoading && (
        <DetailStatus kind="loading" title="Cargando variantes…" className="py-6" />
      )}

      {!isLoading && isError && (
        <DetailStatus
          kind="error"
          title="No se pudieron cargar las variantes"
          description="Ocurrió un problema al obtenerlas. Intenta de nuevo."
          onRetry={onRetry}
          className="py-6"
        />
      )}

      {!isLoading && !isError && variants.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aún no hay variantes. Agrega la primera para que este producto sea vendible.
        </p>
      )}

      {!isLoading && !isError && variants.length > 0 && (
        <ul className="space-y-2">
          {variants.map((variant) => (
            <li key={variant.id}>
              <button
                type="button"
                onClick={() => onVariantClick(variant)}
                className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{variant.name}</p>
                  <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <span>{variant.code}</span>
                    {variant.barcode && (
                      <span className="flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        {variant.barcode}
                      </span>
                    )}
                    {variant.uom && <span>{variant.uom.symbol}</span>}
                  </p>
                </div>
                <span
                  className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${variant.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                    }`}
                >
                  {variant.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
