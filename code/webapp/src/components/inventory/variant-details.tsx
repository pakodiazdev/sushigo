import { useQuery } from '@tanstack/react-query'
import {
  Package,
  Ruler,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
  Edit,
  Trash2,
} from 'lucide-react'
import { SlidePanel } from '@/components/ui/slide-panel'
import { Button } from '@/components/ui/button'
import { stockApi } from '@/services/inventory-api'
import type { ItemVariant } from '@/types/inventory'

interface VariantDetailsProps {
  variant: ItemVariant
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function VariantDetails({ variant, onEdit, onDelete }: VariantDetailsProps) {
  // Fetch current stock for this variant
  const { data: stockData } = useQuery({
    queryKey: ['stock-by-variant', variant.id],
    queryFn: () => stockApi.byVariant(variant.id),
  })

  const currentStock = stockData?.data.data || null

  return (
    <>
      <SlidePanel.Header>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Variant Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete information and stock status
            </p>
          </div>
        </div>
      </SlidePanel.Header>

      <SlidePanel.Body>
        <div className="space-y-6">
          {/* Code & Status */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm bg-slate-100 px-3 py-1.5 rounded font-semibold">
              {variant.code}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                variant.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {variant.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Name */}
          <div>
            <h3 className="text-xl font-semibold">{variant.name}</h3>
            {variant.item && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Package className="h-3 w-3" />
                {variant.item.name} ({variant.item.sku})
              </p>
            )}
          </div>

          {/* Current Stock Summary */}
          {currentStock && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Current Stock</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">On Hand</div>
                  <div className="font-semibold text-lg">{currentStock.on_hand || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reserved</div>
                  <div className="font-semibold text-lg">{currentStock.reserved || 0}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Available</div>
                  <div className="font-semibold text-lg text-green-600">
                    {currentStock.available || 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Unit of Measure */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ruler className="h-4 w-4 text-gray-600" />
              <h4 className="font-semibold">Unit of Measure</h4>
            </div>
            {variant.uom ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{variant.uom.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="font-medium">{variant.uom.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{variant.uom.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precision:</span>
                  <span className="font-medium">{variant.uom.precision} decimals</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No unit of measure set</p>
            )}
          </div>

          {/* Stock Levels */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stock Levels
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={TrendingDown}
                label="Min Stock"
                value={variant.min_stock.toString()}
                iconColor="text-red-600"
              />
              <InfoItem
                icon={TrendingUp}
                label="Max Stock"
                value={variant.max_stock.toString()}
                iconColor="text-green-600"
              />
            </div>
          </div>

          {/* Cost Information */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={DollarSign}
                label="Last Unit Cost"
                value={`$${variant.last_unit_cost.toFixed(2)}`}
              />
              <InfoItem
                icon={DollarSign}
                label="Avg Unit Cost"
                value={`$${variant.avg_unit_cost.toFixed(2)}`}
                hint="Weighted average"
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2 pt-4 border-t">
            {variant.created_at && (
              <InfoItem
                icon={Calendar}
                label="Created"
                value={new Date(variant.created_at).toLocaleDateString()}
              />
            )}
            {variant.updated_at && (
              <InfoItem
                icon={Calendar}
                label="Last Updated"
                value={new Date(variant.updated_at).toLocaleDateString()}
              />
            )}
          </div>
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onEdit}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="flex-1"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </SlidePanel.Footer>
    </>
  )
}

// Helper component for info items
function InfoItem({
  icon: Icon,
  label,
  value,
  hint,
  iconColor = 'text-gray-600',
}: {
  icon: React.ElementType
  label: string
  value: string
  hint?: string
  iconColor?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`h-4 w-4 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="font-medium truncate">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    </div>
  )
}
