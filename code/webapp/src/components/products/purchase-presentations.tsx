import { Barcode, Boxes, Loader2, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CanAccess } from '@/components/auth'
import { useCanAccess } from '@/hooks/use-can-access'
import type { VariantPurchasePresentation } from '@/types/inventory'

interface PurchasePresentationsProps {
  presentations: VariantPurchasePresentation[]
  isLoading: boolean
  isError: boolean
  onAssignPresentation: () => void
  onPresentationClick: (presentation: VariantPurchasePresentation) => void
  onManageTemplates: () => void
}

/**
 * The embedded Purchase Presentation list shown inside a Variant's detail screen — see
 * doc/architecture/product-catalog/product-catalog-architecture.en.md §5.1 ("Purchase
 * presentations") and §5.2 (PresentationList state). Mirrors product-variants.tsx one level
 * deeper: selecting a row, "+ Assign template", or "Manage templates" is handled by the
 * parent products page, which takes the whole SlidePanel over with a nested screen (see
 * use-variant-purchase-presentations.ts).
 */
export function PurchasePresentations({
  presentations,
  isLoading,
  isError,
  onAssignPresentation,
  onPresentationClick,
  onManageTemplates,
}: Readonly<PurchasePresentationsProps>) {
  // The edit form's PUT route requires items.update — a viewer-only role (e.g. manager, which
  // only has items.view) would otherwise get a clickable row that always ends in a 403 on
  // submit. Render the row as a non-interactive summary instead of gating the click itself, so
  // the same fields stay visible without implying they're editable.
  const canEditPresentation = useCanAccess({ permission: 'items.update' })

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Boxes className="h-5 w-5 text-primary" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-muted-foreground">Purchase Presentations</p>
            <p className="text-lg font-semibold text-foreground">
              {isLoading || isError ? '—' : presentations.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Reachable to anyone who can view templates — create/edit/delete inside the
              manager itself are gated per-action on purchase_presentation_templates.manage. */}
          <CanAccess permission="purchase_presentation_templates.view">
            <Button type="button" variant="ghost" size="sm" onClick={onManageTemplates} className="gap-1">
              <Settings className="h-4 w-4" />
              Manage templates
            </Button>
          </CanAccess>
          {/* manager (items.view + items.manage-media only) can reach this panel but its
              POST would only ever return 403 — hide the control it can't complete. */}
          <CanAccess permission="items.update">
            <Button type="button" variant="outline" size="sm" onClick={onAssignPresentation} className="gap-1">
              <Plus className="h-4 w-4" />
              Assign template
            </Button>
          </CanAccess>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!isLoading && isError && (
        <p className="text-sm text-muted-foreground">
          Failed to load purchase presentations. Please try again.
        </p>
      )}

      {!isLoading && !isError && presentations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No purchase presentations yet. Assign a template to define how this Variant is bought.
        </p>
      )}

      {!isLoading && !isError && presentations.length > 0 && (
        <ul className="space-y-2">
          {presentations.map((presentation) => {
            const rowContent = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {presentation.template?.name ?? 'Unknown template'}
                  </p>
                  <p className="flex flex-wrap items-center gap-2 truncate text-xs text-muted-foreground">
                    {presentation.template && (
                      <span>
                        {presentation.template.package_type} · ×{presentation.template.base_unit_quantity}
                      </span>
                    )}
                    {presentation.package_barcode && (
                      <span className="flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        {presentation.package_barcode}
                      </span>
                    )}
                  </p>
                </div>
                <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
                  {presentation.is_default && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      Default
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${presentation.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                      }`}
                  >
                    {presentation.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </>
            )

            return (
              <li key={presentation.id}>
                {canEditPresentation ? (
                  <button
                    type="button"
                    onClick={() => onPresentationClick(presentation)}
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
