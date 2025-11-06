import { useQuery } from '@tanstack/react-query'
import { 
  MapPin, 
  Package, 
  Calendar, 
  Tag, 
  Building2,
  Edit,
  Trash2,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SlidePanel } from '@/components/ui/slide-panel'
import { stockApi } from '@/services/inventory-api'
import type { InventoryLocation } from '@/types/inventory'

interface LocationDetailsProps {
  location: InventoryLocation
  onEdit: () => void
  onDelete: () => void
}

export function LocationDetails({
  location,
  onEdit,
  onDelete,
}: LocationDetailsProps) {
  // Fetch stock summary for this location
  const { data: stockData } = useQuery({
    queryKey: ['stock-by-location', location.id],
    queryFn: () => stockApi.byLocation(location.id),
  })

  const summary = stockData?.data.data.summary

  return (
    <div className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        {/* Quick Stats */}
        {summary && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Variants</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {summary.total_variants}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Value</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${summary.total_inventory_value.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Location Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Location Information</h3>

          <div className="space-y-3">
            <InfoItem
              icon={<Building2 className="h-5 w-5" />}
              label="Operating Unit"
              value={location.operating_unit?.name || 'N/A'}
            />

            <InfoItem
              icon={<Tag className="h-5 w-5" />}
              label="Type"
              value={
                <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                  {location.type}
                </span>
              }
            />

            <InfoItem
              icon={<TrendingUp className="h-5 w-5" />}
              label="Priority"
              value={location.priority}
            />

            <InfoItem
              icon={<MapPin className="h-5 w-5" />}
              label="Primary Location"
              value={
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    location.is_primary
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {location.is_primary ? 'Yes' : 'No'}
                </span>
              }
            />

            <InfoItem
              icon={<Package className="h-5 w-5" />}
              label="Status"
              value={
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                    location.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {location.is_active ? 'Active' : 'Inactive'}
                </span>
              }
            />

            {location.notes && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Notes</p>
                <p className="mt-1 text-sm text-gray-600">{location.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stock Summary */}
        {summary && summary.total_variants > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Stock Summary</h3>
            <div className="space-y-2 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">On Hand</span>
                <span className="font-medium text-gray-900">
                  {summary.total_on_hand.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Reserved</span>
                <span className="font-medium text-gray-900">
                  {summary.total_reserved.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
                <span className="font-medium text-gray-700">Available</span>
                <span className="font-semibold text-gray-900">
                  {summary.total_available.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        {location.created_at && (
          <div className="space-y-2 border-t border-gray-200 pt-4">
            <InfoItem
              icon={<Calendar className="h-5 w-5" />}
              label="Created"
              value={new Date(location.created_at).toLocaleDateString()}
            />
            {location.updated_at && (
              <InfoItem
                icon={<Calendar className="h-5 w-5" />}
                label="Last Updated"
                value={new Date(location.updated_at).toLocaleDateString()}
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
            Edit Location
          </Button>
        </div>
      </SlidePanel.Footer>
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
