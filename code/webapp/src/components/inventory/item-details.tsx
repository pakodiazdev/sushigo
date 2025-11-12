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
          color: 'bg-blue-100 text-blue-800',
        }
      case 'PRODUCTO':
        return {
          label: 'Producto',
          description: 'Finished Product',
          color: 'bg-green-100 text-green-800',
        }
      case 'ACTIVO':
        return {
          label: 'Activo',
          description: 'Asset',
          color: 'bg-purple-100 text-purple-800',
        }
      default:
        return {
          label: type,
          description: '',
          color: 'bg-gray-100 text-gray-800',
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
            <Box className="h-5 w-5 text-gray-400" />
            <span className="rounded-md bg-gray-100 px-3 py-1 font-mono text-sm font-medium text-gray-900">
              {item.sku}
            </span>
          </div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.is_active
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
              }`}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Variants Summary */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                <Package className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Variants</p>
                <p className="text-2xl font-semibold text-gray-900">
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
          <h3 className="text-sm font-semibold text-gray-900">Item Type</h3>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start">
              <Tag className="mt-0.5 h-5 w-5 text-gray-400" />
              <div className="ml-3">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${typeInfo.color}`}
                >
                  {typeInfo.label}
                </span>
                <p className="mt-2 text-sm text-gray-600">{typeInfo.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Properties</h3>

          <div className="space-y-3">
            <PropertyItem
              icon={
                item.is_stocked ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
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
                  <CheckCircle className="h-5 w-5 text-gray-400" />
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
            <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-start">
                <FileText className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                <p className="ml-3 text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        {item.created_at && (
          <div className="space-y-2 border-t border-gray-200 pt-4">
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
    <div className="flex items-start rounded-lg border border-gray-200 p-3">
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <span className="text-sm font-semibold text-gray-900">{value}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
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
      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-gray-400">
        {icon}
      </div>
      <div className="ml-3 flex-1">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-0.5 text-sm text-gray-900">{value}</p>
      </div>
    </div>
  )
}
