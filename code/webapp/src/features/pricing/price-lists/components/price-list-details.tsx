import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CanAccess } from '@/components/auth'
import type { ItemVariant } from '@/types/inventory'
import type { PriceList, PriceListAssignment, VariantPrice } from '../types'
import { AssignmentsSection } from './assignments-section'
import { VariantPricesSection } from './variant-prices-section'
import { ResolvedPricePreview } from './resolved-price-preview'

interface PriceListDetailsProps {
  priceList: PriceList
  onEdit: () => void
  onDelete: () => void
  assignments: PriceListAssignment[]
  assignmentsLoading: boolean
  assignmentsError: boolean
  onNewAssignment: () => void
  onAssignmentClick: (assignment: PriceListAssignment) => void
  variantPrices: VariantPrice[]
  variantDetailsById: Record<string, ItemVariant>
  variantPricesLoading: boolean
  variantPricesError: boolean
  onNewVariantPrice: () => void
  onVariantPriceClick: (variantPrice: VariantPrice) => void
}

export function PriceListDetails({
  priceList,
  onEdit,
  onDelete,
  assignments,
  assignmentsLoading,
  assignmentsError,
  onNewAssignment,
  onAssignmentClick,
  variantPrices,
  variantDetailsById,
  variantPricesLoading,
  variantPricesError,
  onNewVariantPrice,
  onVariantPriceClick,
}: Readonly<PriceListDetailsProps>) {
  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {priceList.code}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priceList.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
          >
            {priceList.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground">{priceList.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Priority {priceList.priority}</p>
          {priceList.description && (
            <p className="mt-2 text-sm text-muted-foreground">{priceList.description}</p>
          )}
        </div>

        <AssignmentsSection
          assignments={assignments}
          isLoading={assignmentsLoading}
          isError={assignmentsError}
          onNewAssignment={onNewAssignment}
          onAssignmentClick={onAssignmentClick}
        />

        <VariantPricesSection
          variantPrices={variantPrices}
          variantDetailsById={variantDetailsById}
          isLoading={variantPricesLoading}
          isError={variantPricesError}
          onNewVariantPrice={onNewVariantPrice}
          onVariantPriceClick={onVariantPriceClick}
        />

        <CanAccess permission="items.view">
          <ResolvedPricePreview />
        </CanAccess>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-between">
          <CanAccess permission="price_lists.delete">
            <Button variant="outline-danger" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </CanAccess>
          <CanAccess permission="price_lists.update">
            <Button onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Price List
            </Button>
          </CanAccess>
        </div>
      </SlidePanel.Footer>
    </div>
  )
}
