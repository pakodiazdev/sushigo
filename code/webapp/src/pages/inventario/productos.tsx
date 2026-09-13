import { useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { ImageOff, Plus } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import {
  ProductForm,
  ProductDetails,
  VariantForm,
  VariantDetails,
  isEffectivelyActive,
  useProductVariants,
  type VariantPanelMode,
  PurchasePresentationForm,
  useVariantPurchasePresentations,
  type PresentationPanelMode,
  PurchasePresentationTemplateManager,
} from '@/components/products'
import type { Product } from '@/types/inventory'
import { useProductsList, type ProductPanelMode } from './use-products-list'

export const Route = createFileRoute('/inventario/productos')({
  beforeLoad: requirePermission('items.view'),
  component: ProductsPage,
})

const PANEL_TITLE_BY_MODE: Record<ProductPanelMode, string> = {
  create: 'Nuevo producto',
  edit: 'Editar producto',
  detail: 'Detalle del producto',
}

const VARIANT_PANEL_TITLE_BY_MODE: Record<Exclude<VariantPanelMode, 'list'>, string> = {
  create: 'Nueva variante',
  edit: 'Editar variante',
  detail: 'Detalle de la variante',
}

const PRESENTATION_PANEL_TITLE_BY_MODE: Record<Exclude<PresentationPanelMode, 'list'>, string> = {
  assign: 'Asignar presentación de compra',
  edit: 'Editar presentación de compra',
}

// A nested Variant (or, one level deeper, Presentation) screen takes over the whole panel
// (title included) while active — see use-product-variants.ts's VariantPanelMode docblock
// and use-variant-purchase-presentations.ts's PresentationPanelMode docblock for why this
// extends the same panel instance instead of opening a second one.
export function resolvePanelTitle(
  panelMode: ProductPanelMode,
  variantMode: VariantPanelMode,
  presentationMode: PresentationPanelMode
): string {
  if (panelMode === 'detail' && variantMode === 'detail' && presentationMode !== 'list') {
    return PRESENTATION_PANEL_TITLE_BY_MODE[presentationMode]
  }
  if (panelMode === 'detail' && variantMode !== 'list') {
    return VARIANT_PANEL_TITLE_BY_MODE[variantMode]
  }
  return PANEL_TITLE_BY_MODE[panelMode]
}

export function ProductsPage() {
  // Focus returns to whichever control actually opened the panel — the New Product
  // button or the clicked table row — once it closes. `lastOpenerRef` is set at the
  // moment each opener fires (see `handleNewProductClick` / `handleRowClickTracked`
  // below) and restored in `handleClosePanel`.
  const newProductButtonRef = useRef<HTMLButtonElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)

  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    brandFilter,
    setBrandFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    clearFilters,
    brands,
    categories,
    products,
    totalPages,
    isLoading,
    isError,
    isForbidden,
    isRefetching,
    refetch,
    isPanelOpen,
    panelMode,
    selectedProduct,
    handleRowClick,
    handleNewProduct,
    handleEdit,
    cancelEdit,
    handleDelete,
    handleCreated,
    handleUpdated,
    closePanel,
  } = useProductsList({
    // Delete has no still-visible opener to return focus to (the row is gone after
    // refetch) — fall back to the New Product button, same graceful target
    // handleClosePanel would land on if delete had been a no-op cancel instead.
    onDeleted: () => newProductButtonRef.current?.focus(),
  })

  const {
    variants,
    isLoading: variantsLoading,
    isError: variantsError,
    refetch: refetchVariants,
    variantMode,
    selectedVariant,
    handleNewVariant,
    handleVariantClick,
    handleEditVariant,
    cancelEditVariant,
    handleBackToList,
    handleVariantCreated,
    handleVariantUpdated,
  } = useProductVariants(selectedProduct?.id ?? null, isPanelOpen)

  const {
    presentations,
    isLoading: presentationsLoading,
    isError: presentationsError,
    refetch: refetchPresentations,
    presentationMode,
    selectedPresentation,
    handleAssignPresentation,
    handlePresentationClick,
    handleBackToList: handleBackToPresentationList,
    handlePresentationSaved,
  } = useVariantPurchasePresentations(
    selectedProduct?.id ?? null,
    selectedVariant?.id ?? null,
    isPanelOpen && panelMode === 'detail' && variantMode === 'detail'
  )

  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false)

  const handleNewProductClick = () => {
    lastOpenerRef.current = newProductButtonRef.current
    handleNewProduct()
  }

  const handleRowClickTracked = (product: Product, event: React.SyntheticEvent<HTMLTableRowElement>) => {
    lastOpenerRef.current = event.currentTarget
    handleRowClick(product)
  }

  const handleClosePanel = () => {
    closePanel()
    lastOpenerRef.current?.focus()
  }

  const columns: Column<Product>[] = [
    {
      key: 'photo_url',
      header: '',
      width: '64px',
      render: (product) =>
        product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            className="h-10 w-10 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          </div>
        ),
    },
    {
      key: 'name',
      header: 'Nombre',
      render: (product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          {product.brand && (
            <div className="text-sm text-muted-foreground">{product.brand.name}</div>
          )}
        </div>
      ),
    },
    {
      key: 'inventory_category',
      header: 'Categoría',
      render: (product) => product.inventory_category?.name ?? '—',
    },
    {
      key: 'variants_count',
      header: 'Variantes',
      align: 'center',
      render: (product) => product.variants_count,
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (product) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isEffectivelyActive(product)
            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
            : 'bg-muted text-muted-foreground ring-border'
            }`}
        >
          {isEffectivelyActive(product) ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
  ]

  const panelTitle = resolvePanelTitle(panelMode, variantMode, presentationMode)

  return (
    <PageContainer>
      <PageHeader
        title="Productos"
        description="Gestiona tu catálogo de productos para reventa"
        action={
          // manager (items.view + items.manage-media only, no items.create) can reach
          // this page but its POST would only ever return 403 — hide the control
          // rather than offer an action it can't complete.
          <CanAccess permission="items.create">
            <Button ref={newProductButtonRef} onClick={handleNewProductClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </CanAccess>
        }
      />

      <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar productos…"
          className="flex-1"
        />

        <FilterSelect
          label="Marca"
          value={brandFilter}
          onChange={setBrandFilter}
          placeholder="Todas"
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
        />

        <FilterSelect
          label="Categoría"
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="Todas"
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />

        <FilterSelect
          label="Estado"
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Todos"
          options={[
            { value: 'active', label: 'Activo' },
            { value: 'inactive', label: 'Inactivo' },
          ]}
        />
      </div>

      <DataGrid
        data={products}
        columns={columns}
        onRowClick={handleRowClickTracked}
        loading={isLoading}
        error={isError}
        forbidden={isForbidden}
        onRetry={() => refetch()}
        isRefetching={isRefetching}
        emptyTitle={hasActiveFilters ? 'Sin resultados que coincidan con los filtros' : 'Aún no hay productos'}
        emptyDescription={
          hasActiveFilters
            ? 'Intenta con otros filtros o términos de búsqueda.'
            : 'Registra un producto para verlo aquí.'
        }
        emptyAction={
          hasActiveFilters ? (
            <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary hover:underline">
              Limpiar filtros
            </button>
          ) : (
            <CanAccess permission="items.create">
              <Button variant="outline" size="sm" onClick={handleNewProductClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear el primer producto
              </Button>
            </CanAccess>
          )
        }
        getRowId={(product) => product.id}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Single SlidePanel instance for the whole create → detail → edit flow — see
          use-products-list.ts's ProductPanelMode docblock. */}
      <SlidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={panelTitle}>
        {panelMode === 'create' && (
          <ProductForm onSuccess={handleCreated} onCancel={handleClosePanel} />
        )}
        {panelMode === 'edit' && selectedProduct && (
          <ProductForm product={selectedProduct} onSuccess={handleUpdated} onCancel={cancelEdit} />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'list' && (
          <ProductDetails
            product={selectedProduct}
            onEdit={handleEdit}
            onDelete={handleDelete}
            variants={variants}
            variantsLoading={variantsLoading}
            variantsError={variantsError}
            onNewVariant={handleNewVariant}
            onVariantClick={handleVariantClick}
            onRetryVariants={() => refetchVariants()}
          />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'create' && (
          <VariantForm
            productId={selectedProduct.id}
            onSuccess={handleVariantCreated}
            onCancel={handleBackToList}
          />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'edit' && selectedVariant && (
          <VariantForm
            productId={selectedProduct.id}
            variant={selectedVariant}
            onSuccess={handleVariantUpdated}
            onCancel={cancelEditVariant}
          />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'detail' && selectedVariant && presentationMode === 'list' && (
          <VariantDetails
            variant={selectedVariant}
            onEdit={handleEditVariant}
            onBack={handleBackToList}
            presentations={presentations}
            presentationsLoading={presentationsLoading}
            presentationsError={presentationsError}
            onAssignPresentation={handleAssignPresentation}
            onPresentationClick={handlePresentationClick}
            onManageTemplates={() => setIsTemplateManagerOpen(true)}
            onRetryPresentations={() => refetchPresentations()}
          />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'detail' && selectedVariant && presentationMode === 'assign' && (
          <PurchasePresentationForm
            productId={selectedProduct.id}
            variantId={selectedVariant.id}
            variantUom={selectedVariant.uom}
            assignedTemplateIds={presentations.map((p) => p.template?.id).filter((id): id is string => !!id)}
            onSuccess={handlePresentationSaved}
            onCancel={handleBackToPresentationList}
          />
        )}
        {panelMode === 'detail' && selectedProduct && variantMode === 'detail' && selectedVariant && presentationMode === 'edit' && selectedPresentation && (
          <PurchasePresentationForm
            productId={selectedProduct.id}
            variantId={selectedVariant.id}
            variantUom={selectedVariant.uom}
            presentation={selectedPresentation}
            assignedTemplateIds={presentations.map((p) => p.template?.id).filter((id): id is string => !!id)}
            onSuccess={handlePresentationSaved}
            onCancel={handleBackToPresentationList}
          />
        )}
      </SlidePanel>

      <PurchasePresentationTemplateManager
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
      />
    </PageContainer>
  )
}
