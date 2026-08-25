import { Building2, Edit, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { SearchInput } from '@/components/ui/search-input'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SupplierForm, SupplierOfferingForm } from '../components'
import { useSuppliersPage } from '../hooks/use-suppliers-page'
import type { Supplier } from '../types'

export function SuppliersPage() {
  const page = useSuppliersPage()

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Proveedor',
      render: (supplier) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <div><p className="font-medium">{supplier.name}</p><p className="text-xs text-muted-foreground">{supplier.code}</p></div>
        </div>
      ),
    },
    { key: 'contact_name', header: 'Contacto', render: (supplier) => supplier.contact_name || '—' },
    { key: 'offerings_count', header: 'Ofertas', render: (supplier) => supplier.offerings_count ?? 0 },
    {
      key: 'is_active',
      header: 'Estado',
      render: (supplier) => <StatusBadge active={supplier.is_active} />,
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Proveedores"
        description="Catálogo de proveedores y sus cotizaciones por presentación de compra"
        action={page.canManage ? <Button onClick={page.openNewSupplier} className="gap-2"><Plus className="h-4 w-4" />Nuevo proveedor</Button> : undefined}
      />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput value={page.search} onChange={page.setSearch} placeholder="Buscar por nombre o código..." className="flex-1" />
        <FilterSelect label="Estado" value={page.status} onChange={page.setStatus} placeholder="Todos" options={[{ value: 'active', label: 'Activos' }, { value: 'inactive', label: 'Inactivos' }]} />
      </div>
      <DataGrid data={page.suppliers} columns={columns} loading={page.suppliersLoading} onRowClick={page.openSupplier} />

      <SlidePanel isOpen={Boolean(page.selectedSupplier) && !page.supplierFormOpen} onClose={page.closeSupplier} title="Detalle del proveedor">
        {page.selectedSupplier && (
          <div className="flex h-full flex-col">
            <SlidePanel.Body className="flex-1 space-y-6">
              <section className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="text-lg font-semibold">{page.selectedSupplier.name}</h3><p className="text-sm text-muted-foreground">{page.selectedSupplier.code}</p></div>
                  <StatusBadge active={page.selectedSupplier.is_active} />
                </div>
                <p className="text-sm">{page.selectedSupplier.contact_name || 'Sin contacto registrado'}</p>
                <p className="text-sm text-muted-foreground">{page.selectedSupplier.email || 'Sin correo'} · {page.selectedSupplier.phone || 'Sin teléfono'}</p>
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><h4 className="font-semibold">Ofertas de compra</h4><p className="text-xs text-muted-foreground">Precios de referencia; el costo real se registra en la recepción.</p></div>
                  {page.canManage && page.selectedSupplier.is_active && <Button size="sm" onClick={page.openNewOffering}><Plus className="mr-1 h-4 w-4" />Oferta</Button>}
                </div>
                {page.offeringsLoading && <p className="text-sm text-muted-foreground">Cargando ofertas…</p>}
                <div className="space-y-2">
                  {page.offerings.map((offering) => (
                    <button key={offering.id} type="button" onClick={() => page.openOffering(offering)} className="w-full rounded-md border p-3 text-left hover:bg-muted/50">
                      <div className="flex justify-between gap-3"><span className="font-medium">{offering.presentation.variant?.product?.name ?? 'Producto no disponible'} · {offering.presentation.variant?.name ?? 'Variante no disponible'}</span><StatusBadge active={offering.is_active} /></div>
                      <p className="mt-1 text-sm text-muted-foreground">{offering.presentation.template?.name ?? 'Presentación no disponible'} · {offering.currency} {offering.quoted_price.toLocaleString('es-MX')} · mín. {offering.minimum_order_quantity}</p>
                    </button>
                  ))}
                  {!page.offeringsLoading && page.offerings.length === 0 && <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Aún no hay ofertas registradas.</p>}
                </div>
              </section>
            </SlidePanel.Body>
            {page.canManage && <SlidePanel.Footer><div className="flex justify-between"><Button variant="outline" onClick={page.openSupplierEdit}><Edit className="mr-2 h-4 w-4" />Editar</Button>{page.selectedSupplier.is_active && <Button variant="destructive" onClick={page.deactivateSelectedSupplier}>Desactivar</Button>}</div></SlidePanel.Footer>}
          </div>
        )}
      </SlidePanel>

      <SlidePanel isOpen={page.supplierFormOpen} onClose={page.closeSupplierForm} title={page.selectedSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}>
        <SupplierForm supplier={page.selectedSupplier} onSuccess={page.refreshSupplier} onCancel={page.closeSupplierForm} />
      </SlidePanel>
      <SlidePanel isOpen={page.offeringFormOpen} onClose={page.closeOfferingForm} title={page.selectedOffering ? 'Editar oferta' : 'Nueva oferta'}>
        {page.selectedSupplier && <SupplierOfferingForm supplierId={page.selectedSupplier.id} offering={page.selectedOffering} onSuccess={page.refreshOfferings} onCancel={page.closeOfferingForm} />}
      </SlidePanel>
    </PageContainer>
  )
}

function StatusBadge({ active }: Readonly<{ active: boolean }>) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${active ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>{active ? 'Activo' : 'Inactivo'}</span>
}
