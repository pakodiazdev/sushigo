import { createFileRoute, Link } from '@tanstack/react-router'
import { MapPin, Package, Grid3x3 } from 'lucide-react'

export const Route = createFileRoute('/inventory/')({
  component: InventoryIndexPage,
})

function InventoryIndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona ubicaciones, items, variantes y movimientos de stock
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/inventory/locations"
          className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all hover:border-primary/50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Ubicaciones</h3>
              <p className="text-sm text-muted-foreground">
                Gestionar ubicaciones de almacenamiento
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/inventory/items"
          className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all hover:border-primary/50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Items</h3>
              <p className="text-sm text-muted-foreground">
                Gestionar productos e insumos
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/inventory/item-variants"
          className="group relative overflow-hidden rounded-lg border bg-card p-6 hover:shadow-lg transition-all hover:border-primary/50"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Grid3x3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Variantes</h3>
              <p className="text-sm text-muted-foreground">
                Gestionar variantes de productos
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
