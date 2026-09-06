import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { useQuery } from '@tanstack/react-query'
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MapPin,
  BarChart3,
  RefreshCw,
  PackagePlus,
} from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { SlidePanel } from '@/components/ui/slide-panel'
import { OpeningBalanceForm } from '@/components/inventory'
import { useAuthStore } from '@/stores/auth.store'
import { stockApi, inventoryLocationApi } from '@/services/inventory-api'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import type { Stock, InventoryLocation } from '@/types/inventory'
import { ReplenishmentPoliciesPanel } from '@/features/inventory/replenishment'

export const Route = createFileRoute('/inventario/existencias')({
  beforeLoad: requirePermission('stock.view'),
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

const currency = (value: number) =>
  `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Derive the dashboard summary from the assignment-aware row set (#571). Every
 * row is one assigned Variant — a never-received one carries zero balances and
 * `stock_id: null`, so it counts toward `total_variants` and (when a policy
 * makes it low) `low_stock_items` while contributing 0 to on-hand and value.
 */
export function computeStockSummary(allStock: Stock[]): StockSummary {
  return {
    total_variants: allStock.length,
    total_items_on_hand: allStock.reduce((sum, s) => sum + s.on_hand, 0),
    total_items_reserved: allStock.reduce((sum, s) => sum + s.reserved, 0),
    total_items_available: allStock.reduce((sum, s) => sum + (s.on_hand - s.reserved), 0),
    total_inventory_value: allStock.reduce(
      (sum, s) => sum + s.on_hand * s.weighted_avg_cost,
      0
    ),
    low_stock_items: allStock.filter((s) => s.is_low_stock).length,
  }
}

export function StockDashboardPage() {
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false)
  const openingBalanceTriggerRef = useRef<HTMLButtonElement>(null)

  // The route stays stock.view so read-only users still see stock. The Opening
  // Balance action needs stock.manage (the posting endpoints authorize on it),
  // but the form's Location and Variant pickers read /inventory-locations and
  // /item-variants, which require inventory_locations.view and items.view — so
  // the trigger is gated on all three, never shown for a role that could open
  // the panel only to hit 403s on both selects (#570). Admin/super-admin bypass
  // every check in `can()`.
  const canOpenOpeningBalance = useAuthStore(
    (s) => s.can('stock.manage') && s.can('inventory_locations.view') && s.can('items.view')
  )

  const closeOpeningBalance = () => {
    setIsOpeningBalanceOpen(false)
    // Restore focus to the button that opened the panel (accessibility).
    openingBalanceTriggerRef.current?.focus()
  }

  // Existencias is spined on the managed Variant-to-Location assignment (#569),
  // not on Stock (#571): this list already includes every assigned Variant,
  // with a never-received one projected as zero (`stock_id: null`). The summary
  // and low-stock alerts are computed client-side over the whole row set, so
  // every page is fetched up front — a tenant with more assigned pairs than one
  // page holds must not silently understate its totals.
  const { data: stockData, isLoading: stockLoading, refetch: refetchStock } = useQuery({
    queryKey: ['stock-all'],
    queryFn: () => fetchAllPages((page) => stockApi.list({ per_page: 200, page })),
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
    enabled: selectedLocationId.length > 0,
  })

  const locations = locationsData?.data.data || []
  const allStock = stockData?.data.data || []

  // Summary — one row per assigned Variant, so `total_variants` is the managed
  // assortment size, not just the count of materialized Stock rows. Low-stock
  // is the backend's resolved per-location verdict (#439); a projected zero row
  // qualifies when a live policy exists (#571).
  const summary = computeStockSummary(allStock)

  const lowStockItems = allStock.filter((s) => s.is_low_stock)

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
      header: 'Variante',
      render: (stock) => (
        <div>
          <div className="font-medium">{stock.item_variant?.code}</div>
          <div className="text-sm text-muted-foreground">
            {stock.item_variant?.name}
            {stock.stock_id === null && (
              <span className="ml-1 text-xs text-muted-foreground">· nunca recibido</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'inventory_location',
      header: 'Ubicación',
      render: (stock) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>{stock.inventory_location?.name}</span>
        </div>
      ),
    },
    {
      key: 'on_hand',
      header: 'Existencia',
      render: (stock) => (
        <div className="text-center">
          <div className="text-red-600 font-bold">{stock.on_hand}</div>
          <div className="text-xs text-muted-foreground">
            Mín: {stock.min_stock ?? 0}
          </div>
        </div>
      ),
    },
    {
      key: 'weighted_avg_cost',
      header: 'Costo unitario',
      render: (stock) => (
        <span className="font-mono text-sm">
          {stock.stock_id === null ? '—' : `$${stock.weighted_avg_cost.toFixed(2)}`}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Valor total',
      render: (stock) => (
        <span className="font-mono font-medium">
          {currency(stock.on_hand * stock.weighted_avg_cost)}
        </span>
      ),
    },
  ]

  const isLoading = stockLoading || (selectedLocationId.length > 0 && locationLoading)

  return (
    <PageContainer>
      <PageHeader
        title="Existencias"
        description="Surtido gestionado por Ubicación y valuación del inventario"
        action={
          <div className="flex gap-2">
            {canOpenOpeningBalance && (
              <Button
                ref={openingBalanceTriggerRef}
                onClick={() => setIsOpeningBalanceOpen(true)}
                className="gap-2"
              >
                <PackagePlus className="h-4 w-4" />
                Registrar saldo inicial
              </Button>
            )}
            <Button
              onClick={() => refetchStock()}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Variantes asignadas"
          value={summary.total_variants.toString()}
          icon={Package}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
        />
        <SummaryCard
          title="Unidades disponibles"
          value={summary.total_items_available.toLocaleString('es-MX')}
          subtitle={`${summary.total_items_on_hand.toLocaleString('es-MX')} en existencia, ${summary.total_items_reserved.toLocaleString('es-MX')} reservadas`}
          icon={TrendingUp}
          iconColor="text-green-600"
          bgColor="bg-green-50"
        />
        <SummaryCard
          title="Valor del inventario"
          value={currency(summary.total_inventory_value)}
          subtitle="Costo promedio ponderado"
          icon={DollarSign}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <SummaryCard
          title="Alertas de stock bajo"
          value={summary.low_stock_items.toString()}
          subtitle="Por debajo del mínimo configurado"
          icon={AlertTriangle}
          iconColor="text-red-600"
          bgColor="bg-red-50"
        />
      </div>

      {/* Location Filter */}
      <div className="mb-6">
        <FilterSelect
          label="Filtrar por Ubicación"
          value={selectedLocationId.toString()}
          onChange={setSelectedLocationId}
          options={locations.map((loc: InventoryLocation) => ({
            value: loc.id.toString(),
            label: `${loc.name} (${loc.type})`,
          }))}
          placeholder="Todas las Ubicaciones"
        />
      </div>

      {/* Location Detail View */}
      {selectedLocationId.length > 0 && locationStockData?.data.data && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {locationStockData.data.data.inventory_location.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tipo: {locationStockData.data.data.inventory_location.type} |
                Prioridad: {locationStockData.data.data.inventory_location.priority}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLocationId('')}
            >
              Quitar filtro
            </Button>
          </div>

          {/* Location Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Variantes</div>
              <div className="text-2xl font-bold text-blue-900">
                {locationStockData.data.data.summary.total_variants}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">En existencia</div>
              <div className="text-2xl font-bold text-green-900">
                {locationStockData.data.data.summary.total_on_hand.toLocaleString('es-MX')}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Disponible</div>
              <div className="text-2xl font-bold text-yellow-900">
                {locationStockData.data.data.summary.total_available.toLocaleString('es-MX')}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Valor total</div>
              <div className="text-2xl font-bold text-purple-900">
                {currency(locationStockData.data.data.summary.total_inventory_value)}
              </div>
            </div>
          </div>

          {/* Location Stock Items */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Variantes en esta Ubicación
            </h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {locationStockData.data.data.items.map((item) => (
                <div
                  key={item.assignment_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {item.item_variant_code}
                      {item.stock_id === null && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          nunca recibido
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.item_variant_name} ({item.item_sku})
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Existencia</div>
                      <div className="font-semibold">{item.on_hand}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Disponible</div>
                      <div className="font-semibold text-green-600">
                        {item.available}
                      </div>
                    </div>
                    <div className="text-center min-w-[100px]">
                      <div className="text-xs text-muted-foreground">Valor</div>
                      <div className="font-mono font-semibold">
                        {currency(item.total_value)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-location replenishment thresholds (#439) */}
          <div className="mt-4">
            <ReplenishmentPoliciesPanel
              locationId={selectedLocationId}
              items={locationStockData.data.data.items.map((item) => ({
                item_variant_id: item.item_variant_id,
                item_variant_code: item.item_variant_code,
                item_variant_name: item.item_variant_name,
                min_stock: item.min_stock,
                max_stock: item.max_stock,
                is_low_stock: item.is_low_stock,
              }))}
            />
          </div>
        </div>
      )}

      {/* Location Summary Cards (when no filter selected) */}
      {selectedLocationId.length === 0 && locationSummaryCards.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Existencias por Ubicación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {locationSummaryCards.map(({ location, totalValue, totalItems, variantCount }) => (
              <button
                key={location.id}
                type="button"
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
                    <span className="text-muted-foreground">Variantes:</span>
                    <span className="font-medium">{variantCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unidades:</span>
                    <span className="font-medium">{totalItems.toLocaleString('es-MX')}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-mono font-semibold text-purple-600">
                      {currency(totalValue)}
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
            Alertas de stock bajo ({lowStockItems.length})
          </h3>
          <DataGrid
            data={lowStockItems}
            columns={lowStockColumns}
            getRowId={(stock) => stock.assignment_id}
            loading={isLoading}
            emptyMessage="Sin alertas de stock bajo"
          />
        </div>
      )}

      {/* Empty assortment message */}
      {!isLoading && allStock.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin surtido configurado
          </h3>
          <p className="text-gray-500 mb-4">
            Asigna Variantes a una Ubicación para verlas aquí, incluso antes de la primera recepción.
          </p>
          {canOpenOpeningBalance && (
            <Button
              onClick={() => setIsOpeningBalanceOpen(true)}
              className="gap-2"
            >
              <PackagePlus className="h-4 w-4" />
              Registrar saldo inicial
            </Button>
          )}
        </div>
      )}

      {canOpenOpeningBalance && (
        <SlidePanel
          isOpen={isOpeningBalanceOpen}
          onClose={closeOpeningBalance}
          title="Registrar saldo inicial"
          size="md"
        >
          <OpeningBalanceForm
            preselectedLocationId={selectedLocationId || undefined}
            onSuccess={closeOpeningBalance}
            onCancel={closeOpeningBalance}
          />
        </SlidePanel>
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
}: Readonly<SummaryCardProps>) {
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
