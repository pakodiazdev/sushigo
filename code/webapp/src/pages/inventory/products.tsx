import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
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
} from '@/components/products'
import type { Product } from '@/types/inventory'
import { useProductsList, type ProductPanelMode } from './use-products-list'

export const Route = createFileRoute('/inventory/products')({
  component: ProductsPage,
})

const PANEL_TITLE_BY_MODE: Record<ProductPanelMode, string> = {
  create: 'New Product',
  edit: 'Edit Product',
  detail: 'Product Detail',
}

const VARIANT_PANEL_TITLE_BY_MODE: Record<Exclude<VariantPanelMode, 'list'>, string> = {
  create: 'New Variant',
  edit: 'Edit Variant',
  detail: 'Variant Detail',
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
    brands,
    categories,
    products,
    totalPages,
    isLoading,
    isError,
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
      header: 'Name',
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
      header: 'Category',
      render: (product) => product.inventory_category?.name ?? '—',
    },
    {
      key: 'variants_count',
      header: 'Variants',
      align: 'center',
      render: (product) => product.variants_count,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (product) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${isEffectivelyActive(product)
            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
            : 'bg-muted text-muted-foreground ring-border'
            }`}
        >
          {isEffectivelyActive(product) ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  // A nested Variant screen takes over the whole panel (title included) while active — see
  // use-product-variants.ts's VariantPanelMode docblock for why this extends the same panel
  // instance instead of opening a second one.
  const panelTitle =
    panelMode === 'detail' && variantMode !== 'list'
      ? VARIANT_PANEL_TITLE_BY_MODE[variantMode]
      : PANEL_TITLE_BY_MODE[panelMode]

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage your resale product catalog"
        action={
          // manager (items.view + items.manage-media only, no items.create) can reach
          // this page but its POST would only ever return 403 — hide the control
          // rather than offer an action it can't complete.
          <CanAccess permission="items.create">
            <Button ref={newProductButtonRef} onClick={handleNewProductClick} className="gap-2">
              <Plus className="h-4 w-4" />
              New Product
            </Button>
          </CanAccess>
        }
      />

      <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search products…"
          className="flex-1"
        />

        <FilterSelect
          label="Brand"
          value={brandFilter}
          onChange={setBrandFilter}
          options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
        />

        <FilterSelect
          label="Category"
          value={categoryFilter}
          onChange={setCategoryFilter}
          options={categories.map((category) => ({ value: category.id, label: category.name }))}
        />

        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
      </div>

      <DataGrid
        data={products}
        columns={columns}
        onRowClick={handleRowClickTracked}
        loading={isLoading}
        // Distinguishes "the request failed" from "the catalog has no matching rows" —
        // useProductsList already toasts the error, this keeps the grid itself from
        // implying the catalog is empty when it's actually unreachable.
        emptyMessage={isError ? 'Failed to load products. Please try again.' : undefined}
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
        {panelMode === 'detail' && selectedProduct && variantMode === 'detail' && selectedVariant && (
          <VariantDetails variant={selectedVariant} onEdit={handleEditVariant} onBack={handleBackToList} />
        )}
      </SlidePanel>
    </PageContainer>
  )
}
