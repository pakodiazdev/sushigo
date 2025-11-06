import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MapPin,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { stockApi, inventoryLocationApi } from '@/services/inventory-api'
import type { Stock, InventoryLocation } from '@/types/inventory'

export const Route = createFileRoute('/stock-dashboard')({
  component: StockDashboardPage,
})

interface StockSummary {
  total_variants: number
  total_items_on_hand: number
  total_items_reserved: number
  total_items_available: number
  total_inventory_value: number
  low_stock_items: number
}

export function StockDashboardPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<number>(0)

  // Fetch all stock
  const { data: stockData, isLoading: stockLoading, refetch: refetchStock } = useQuery({
    queryKey: ['stock-all'],
    queryFn: () => stockApi.list({ per_page: 500 }),
  })

  // Fetch locations for filter
  const { data: locationsData } = useQuery({
    queryKey: ['inventory-locations-dashboard'],
    queryFn: () => inventoryLocationApi.list({ is_active: true, per_page: 100 }),
  })

  // Fetch selected location details if one is selected
  const { data: locationStockData, isLoading: locationLoading } = useQuery({
    queryKey: ['stock-by-location', selectedLocationId],
    queryFn: () => stockApi.byLocation(selectedLocationId),
    enabled: selectedLocationId > 0,
  })

  const locations = locationsData?.data.data || []
  const allStock = stockData?.data.data || []

  // Calculate summary statistics
  const summary: StockSummary = {
    total_variants: allStock.length,
    total_items_on_hand: allStock.reduce((sum, s) => sum + s.on_hand, 0),
    total_items_reserved: allStock.reduce((sum, s) => sum + s.reserved, 0),
    total_items_available: allStock.reduce((sum, s) => sum + (s.on_hand - s.reserved), 0),
    total_inventory_value: allStock.reduce(
      (sum, s) => sum + s.on_hand * s.weighted_avg_cost,
      0
    ),
    low_stock_items: allStock.filter(
      (s) => s.item_variant && s.on_hand < (s.item_variant.min_stock || 0)
    ).length,
  }

  // Get low stock items
  const lowStockItems = allStock.filter(
    (s) => s.item_variant && s.on_hand < (s.item_variant.min_stock || 0)
  )

  // Location summary cards
  const locationSummaryCards = locations.slice(0, 4).map((location: InventoryLocation) => {
    const locationStocks = allStock.filter(
      (s) => s.inventory_location_id === location.id
    )
    const totalValue = locationStocks.reduce(
      (sum, s) => sum + s.on_hand * s.weighted_avg_cost,
      0
    )
    const totalItems = locationStocks.reduce((sum, s) => sum + s.on_hand, 0)

    return {
      location,
      totalValue,
      totalItems,
      variantCount: locationStocks.length,
    }
  })

  // DataGrid columns for low stock alerts
  const lowStockColumns: Column<Stock>[] = [
    {
      key: 'item_variant',
      header: 'Variant',
      render: (stock) => (
        <div>
          <div className="font-medium">{stock.item_variant?.code}</div>
          <div className="text-sm text-muted-foreground">
            {stock.item_variant?.name}
          </div>
        </div>
      ),
    },
    {
      key: 'inventory_location',
      header: 'Location',
      render: (stock) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{stock.inventory_location?.name}</span>
        </div>
      ),
    },
    {
      key: 'on_hand',
      header: 'Stock',
      render: (stock) => (
        <div className="text-center">
          <div className="text-red-600 font-bold">{stock.on_hand}</div>
          <div className="text-xs text-muted-foreground">
            Min: {stock.item_variant?.min_stock || 0}
          </div>
        </div>
      ),
    },
    {
      key: 'weighted_avg_cost',
      header: 'Unit Cost',
      render: (stock) => (
        <span className="font-mono text-sm">
          ${stock.weighted_avg_cost.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Total Value',
      render: (stock) => (
        <span className="font-mono font-medium">
          ${(stock.on_hand * stock.weighted_avg_cost).toFixed(2)}
        </span>
      ),
    },
  ]

  const isLoading = stockLoading || (selectedLocationId > 0 && locationLoading)

  return (
    <PageContainer>
      <PageHeader
        title="Stock Dashboard"
        description="Overview of inventory levels and valuation"
        action={
          <Button
            onClick={() => refetchStock()}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Variants"
          value={summary.total_variants.toString()}
          icon={Package}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="Items Available"
          value={summary.total_items_available.toLocaleString()}
          subtitle={`${summary.total_items_on_hand.toLocaleString()} on hand, ${summary.total_items_reserved.toLocaleString()} reserved`}
          icon={TrendingUp}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Inventory Value"
          value={`$${summary.total_inventory_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Total weighted avg cost"
          icon={DollarSign}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={summary.low_stock_items.toString()}
          subtitle="Items below minimum"
          icon={AlertTriangle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Location Filter */}
      <div className="mb-6">
        <FilterSelect
          label="Filter by Location"
          value={selectedLocationId.toString()}
          onChange={(value) => setSelectedLocationId(Number(value))}
          options={locations.map((loc: InventoryLocation) => ({
            value: loc.id.toString(),
            label: `${loc.name} (${loc.type})`,
          }))}
          placeholder="All Locations"
        />
      </div>

      {/* Location Detail View */}
      {selectedLocationId > 0 && locationStockData?.data.data && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {locationStockData.data.data.inventory_location.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Type: {locationStockData.data.data.inventory_location.type} |
                Priority: {locationStockData.data.data.inventory_location.priority}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLocationId(0)}
            >
              Clear Filter
            </Button>
          </div>

          {/* Location Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Variants</div>
              <div className="text-2xl font-bold text-blue-900">
                {locationStockData.data.data.summary.total_variants}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">On Hand</div>
              <div className="text-2xl font-bold text-green-900">
                {locationStockData.data.data.summary.total_on_hand.toLocaleString()}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Available</div>
              <div className="text-2xl font-bold text-yellow-900">
                {locationStockData.data.data.summary.total_available.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Value</div>
              <div className="text-2xl font-bold text-purple-900">
                ${locationStockData.data.data.summary.total_inventory_value.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Location Stock Items */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stock Items
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {locationStockData.data.data.items.map((item) => (
                <div
                  key={item.item_variant_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.item_variant_code}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.item_variant_name} ({item.item_sku})
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">On Hand</div>
                      <div className="font-semibold">{item.on_hand}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Available</div>
                      <div className="font-semibold text-green-600">
                        {item.available}
                      </div>
                    </div>
                    <div className="text-center min-w-[100px]">
                      <div className="text-xs text-muted-foreground">Value</div>
                      <div className="font-mono font-semibold">
                        ${item.total_value.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Summary Cards (when no filter selected) */}
      {selectedLocationId === 0 && locationSummaryCards.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Stock by Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {locationSummaryCards.map(({ location, totalValue, totalItems, variantCount }) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocationId(location.id)}
                className="text-left p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold">{location.name}</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {location.type}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Variants:</span>
                    <span className="font-medium">{variantCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{totalItems.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-mono font-semibold text-purple-600">
                      ${totalValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Low Stock Alerts ({lowStockItems.length})
          </h3>
          <DataGrid
            data={lowStockItems}
            columns={lowStockColumns}
            loading={isLoading}
            emptyMessage="No low stock items"
          />
        </div>
      )}

      {/* No Stock Message */}
      {!isLoading && allStock.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Stock Data
          </h3>
          <p className="text-gray-500 mb-4">
            Start by registering opening balances for your inventory items
          </p>
        </div>
      )}
    </PageContainer>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor,
}: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`rounded-lg p-3 ${bgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
