import { AlertTriangle, Edit, ImageOff, Tag, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CanAccess } from '@/components/auth'
import type { Product, ProductVariant } from '@/types/inventory'
import { isEffectivelyActive } from './product-status'
import { ProductVariants } from './product-variants'

interface ProductDetailsProps {
  product: Product
  onEdit: () => void
  onDelete: () => void
  variants: ProductVariant[]
  variantsLoading: boolean
  variantsError: boolean
  onNewVariant: () => void
  onVariantClick: (variant: ProductVariant) => void
}

export function ProductDetails({
  product,
  onEdit,
  onDelete,
  variants,
  variantsLoading,
  variantsError,
  onNewVariant,
  onVariantClick,
}: Readonly<ProductDetailsProps>) {
  const effectivelyActive = isEffectivelyActive(product)

  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          {product.inventory_category && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
              <Tag className="h-3.5 w-3.5" />
              {product.inventory_category.name}
            </span>
          )}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${effectivelyActive
              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
          >
            {effectivelyActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <div
            data-testid="product-details-no-photo"
            className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-input text-muted-foreground"
          >
            <ImageOff className="h-8 w-8" />
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-foreground">{product.name}</h2>
          {product.brand && (
            <p className="mt-1 text-sm text-muted-foreground">{product.brand.name}</p>
          )}
        </div>

        {product.warnings.length > 0 && (
          <div
            data-testid="product-details-warnings"
            className="space-y-2 rounded-lg bg-amber-50 p-4 dark:bg-amber-950/30"
          >
            {product.warnings.map((warning) => (
              <div key={warning} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {product.description && (
          <p className="text-sm text-muted-foreground">{product.description}</p>
        )}

        <ProductVariants
          variants={variants}
          isLoading={variantsLoading}
          isError={variantsError}
          onNewVariant={onNewVariant}
          onVariantClick={onVariantClick}
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        {/* manager (items.view + items.manage-media only) can reach this panel but its
            PUT/DELETE would only ever return 403 — hide the controls it can't complete
            instead of offering them. */}
        <div className="flex justify-between">
          <CanAccess permission="items.delete">
            <Button variant="outline-danger" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </CanAccess>
          <CanAccess permission="items.update">
            <Button onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Product
            </Button>
          </CanAccess>
        </div>
      </SlidePanel.Footer>
    </div>
  )
}
