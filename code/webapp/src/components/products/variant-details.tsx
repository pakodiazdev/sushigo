import { ArrowLeft, Barcode, Edit, Ruler, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CanAccess } from '@/components/auth'
import type { ProductVariant, VariantPurchasePresentation } from '@/types/inventory'
import { PurchasePresentations } from './purchase-presentations'

interface VariantDetailsProps {
  variant: ProductVariant
  onEdit: () => void
  onBack: () => void
  presentations: VariantPurchasePresentation[]
  presentationsLoading: boolean
  presentationsError: boolean
  onAssignPresentation: () => void
  onPresentationClick: (presentation: VariantPurchasePresentation) => void
  onManageTemplates: () => void
}

// No Delete action here — the catalog's own design principle is "deactivate, don't delete"
// (doc/architecture/product-catalog/product-catalog-architecture.en.md §2); deactivating a
// Variant is done through Edit's Active checkbox, matching Product's own pattern. Purchase
// Presentations (#427) follow the same principle via their own is_active toggle.
export function VariantDetails({
  variant,
  onEdit,
  onBack,
  presentations,
  presentationsLoading,
  presentationsError,
  onAssignPresentation,
  onPresentationClick,
  onManageTemplates,
}: Readonly<VariantDetailsProps>) {
  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <Button variant="ghost" onClick={onBack} className="-ml-2 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Product
        </Button>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
            <Tag className="h-3.5 w-3.5" />
            {variant.code}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${variant.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
          >
            {variant.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">{variant.name}</h2>
          {variant.description && (
            <p className="mt-1 text-sm text-muted-foreground">{variant.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {variant.barcode && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              {variant.barcode}
            </div>
          )}
          {variant.uom && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              {variant.uom.name} ({variant.uom.symbol})
            </div>
          )}
        </div>

        {(variant.track_lot || variant.track_serial) && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {variant.track_lot && (
              <span className="rounded-md bg-muted px-2 py-1">Tracks lot numbers</span>
            )}
            {variant.track_serial && (
              <span className="rounded-md bg-muted px-2 py-1">Tracks serial numbers</span>
            )}
          </div>
        )}

        <PurchasePresentations
          presentations={presentations}
          isLoading={presentationsLoading}
          isError={presentationsError}
          onAssignPresentation={onAssignPresentation}
          onPresentationClick={onPresentationClick}
          onManageTemplates={onManageTemplates}
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        {/* manager (items.view + items.manage-media only) can reach this panel but its
            PUT would only ever return 403 — hide Edit rather than offering an action it
            can't complete, matching ProductDetails' own gating. */}
        <div className="flex justify-end">
          <CanAccess permission="items.update">
            <Button onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Variant
            </Button>
          </CanAccess>
        </div>
      </SlidePanel.Footer>
    </div>
  )
}
