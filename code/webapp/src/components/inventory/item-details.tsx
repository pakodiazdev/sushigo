import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Calendar,
  Tag,
  Edit,
  Trash2,
  Box,
  AlertCircle,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SlidePanel } from '@/components/ui/slide-panel'
import { itemVariantApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'

interface ItemDetailsProps {
  item: Item
  onEdit: () => void
  onDelete: () => void
  onViewVariants: () => void
}

export function ItemDetails({
  item,
  onEdit,
  onDelete,
  onViewVariants,
}: ItemDetailsProps) {
  // Fetch variants for this item
  const { data: variantsData } = useQuery({
    queryKey: ['item-variants', item.id],
    queryFn: () => itemVariantApi.list({ item_id: item.id }),
  })

  const variantsCount = variantsData?.data.data.length || 0

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'INSUMO':
        return {
          label: 'Insumo',
          description: 'Raw Material / Input',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
        }
      case 'PRODUCTO':
        return {
          label: 'Producto',
          description: 'Finished Product',
          color: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300',
        }
      case 'ACTIVO':
        return {
          label: 'Activo',
          description: 'Asset',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
        }
      default:
        return {
          label: type,
          description: '',
          color: 'bg-muted text-muted-foreground',
        }
    }
  }

  const typeInfo = getTypeInfo(item.type)

  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        {/* SKU Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Box className="h-5 w-5 text-muted-foreground" />
            <span className="rounded-md bg-muted px-3 py-1 font-mono text-sm font-medium text-foreground">
              {item.sku}
            </span>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
              : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
              }`}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Variants Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Variants</p>
                <p className="text-2xl font-semibold text-foreground">
                  {variantsCount}
                </p>
              </div>
            </div>
            {variantsCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewVariants}
              >
                View Variants
              </Button>
            )}
          </div>
        </Card>

        {/* Type Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Item Type</h3>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-start">
              <Tag className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div className="ml-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </span>
                <p className="mt-2 text-sm text-muted-foreground">{typeInfo.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Properties</h3>

          <div className="space-y-3">
            <PropertyItem
              icon={
                item.is_stocked ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                )
              }
              label="Inventory Tracking"
              value={item.is_stocked ? 'Enabled' : 'Disabled'}
              description={
                item.is_stocked
                  ? 'Stock levels are tracked for this item'
                  : 'This item is not tracked in inventory'
              }
            />

            <PropertyItem
              icon={
                item.is_perishable ? (
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                )
              }
              label="Perishable"
              value={item.is_perishable ? 'Yes' : 'No'}
              description={
                item.is_perishable
                  ? 'This item has an expiration date'
                  : 'This item does not expire'
              }
            />
          </div>
        </div>

        {/* Description */}
        {item.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Description</h3>
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start">
                <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <p className="ml-3 text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        {item.created_at && (
          <div className="space-y-2 border-t border-border pt-4">
            <InfoItem
              icon={<Calendar className="h-5 w-5" />}
              label="Created"
              value={new Date(item.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
            {item.updated_at && item.updated_at !== item.created_at && (
              <InfoItem
                icon={<Calendar className="h-5 w-5" />}
                label="Last Updated"
                value={new Date(item.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              />
            )}
          </div>
        )}
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-between">
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Item
          </Button>
        </div>
      </SlidePanel.Footer>
    </div>
  )
}

function PropertyItem({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode
  label: string
  value: string
  description: string
}) {
  return (
    <div className="flex items-start rounded-lg border border-border p-3">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}
