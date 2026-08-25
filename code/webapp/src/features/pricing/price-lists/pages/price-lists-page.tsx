import { useRef } from 'react'
import { Plus } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { CanAccess } from '@/components/auth'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { SlidePanel } from '@/components/ui/slide-panel'
import { SearchInput } from '@/components/ui/search-input'
import { FilterSelect } from '@/components/ui/filter-select'
import {
  PriceListForm,
  PriceListDetails,
  AssignmentForm,
  VariantPriceForm,
} from '../components'
import { usePriceListAssignments } from '../hooks/use-price-list-assignments'
import { usePriceListVariantPrices } from '../hooks/use-price-list-variant-prices'
import { usePriceLists } from '../hooks/use-price-lists'
import type { PriceList } from '../types'
import { resolvePanelTitle } from './price-list-panel-title'

export function PriceListsPage() {
  const newPriceListButtonRef = useRef<HTMLButtonElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)

  const {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priceLists,
    totalPages,
    isLoading,
    isError,
    isPanelOpen,
    panelMode,
    selectedPriceList,
    handleRowClick,
    handleNewPriceList,
    handleEdit,
    cancelEdit,
    handleDelete,
    handleCreated,
    handleUpdated,
    closePanel,
  } = usePriceLists({
    onDeleted: () => newPriceListButtonRef.current?.focus(),
  })

  const {
    assignments,
    isLoading: assignmentsLoading,
    isError: assignmentsError,
    assignmentMode,
    selectedAssignment,
    handleNewAssignment,
    handleAssignmentClick,
    handleBackToList: handleBackFromAssignment,
    handleAssignmentSaved,
  } = usePriceListAssignments(selectedPriceList?.id ?? null, isPanelOpen)

  const {
    variantPrices,
    variantDetailsById,
    isLoading: variantPricesLoading,
    isError: variantPricesError,
    variantPriceMode,
    selectedVariantPrice,
    handleNewVariantPrice,
    handleVariantPriceClick,
    handleBackToList: handleBackFromVariantPrice,
    handleVariantPriceSaved,
  } = usePriceListVariantPrices(selectedPriceList?.id ?? null, isPanelOpen)

  // Assignments and Variant Prices are sibling sections inside the same detail screen (both
  // direct children of a Price List — see doc/architecture/pricing/pricing-architecture.en.md
  // §1) but share one SlidePanel instance, so opening one nested form must back the other one
  // out of its own create/edit state first — otherwise both could independently be "active"
  // and the panelTitle/body resolution below would have two takeovers to choose between.
  const handleNewAssignmentTracked = () => {
    handleBackFromVariantPrice()
    handleNewAssignment()
  }
  const handleAssignmentClickTracked = (assignment: Parameters<typeof handleAssignmentClick>[0]) => {
    handleBackFromVariantPrice()
    handleAssignmentClick(assignment)
  }
  const handleNewVariantPriceTracked = () => {
    handleBackFromAssignment()
    handleNewVariantPrice()
  }
  const handleVariantPriceClickTracked = (variantPrice: Parameters<typeof handleVariantPriceClick>[0]) => {
    handleBackFromAssignment()
    handleVariantPriceClick(variantPrice)
  }

  const handleNewPriceListClick = () => {
    lastOpenerRef.current = newPriceListButtonRef.current
    handleNewPriceList()
  }

  const handleRowClickTracked = (priceList: PriceList, event: React.SyntheticEvent<HTMLTableRowElement>) => {
    lastOpenerRef.current = event.currentTarget
    handleRowClick(priceList)
  }

  const handleClosePanel = () => {
    closePanel()
    lastOpenerRef.current?.focus()
  }

  const columns: Column<PriceList>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (priceList) => <span className="font-medium">{priceList.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      render: (priceList) => priceList.name,
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      render: (priceList) => priceList.priority,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (priceList) => (
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${priceList.is_active
            ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800/50'
            : 'bg-muted text-muted-foreground ring-border'
            }`}
        >
          {priceList.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ]

  const isNestedTakeover = assignmentMode !== 'list' || variantPriceMode !== 'list'
  const panelTitle = resolvePanelTitle(panelMode, assignmentMode, variantPriceMode)

  return (
    <PageContainer>
      <PageHeader
        title="Price Lists"
        description="Manage branch-aware Product Variant prices, outside the Product catalog"
        action={
          <CanAccess permission="price_lists.create">
            <Button ref={newPriceListButtonRef} onClick={handleNewPriceListClick} className="gap-2">
              <Plus className="h-4 w-4" />
              New Price List
            </Button>
          </CanAccess>
        }
      />

      <div className="mb-6 mt-6 flex flex-col gap-4 sm:flex-row">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search price lists…"
          className="flex-1"
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
        data={priceLists}
        columns={columns}
        onRowClick={handleRowClickTracked}
        loading={isLoading}
        emptyMessage={isError ? 'Failed to load price lists. Please try again.' : undefined}
        getRowId={(priceList) => priceList.id}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Single SlidePanel instance for the whole create → detail → edit flow, plus the
          Assignment/Variant Price nested takeovers — mirrors inventory/products.tsx. */}
      <SlidePanel isOpen={isPanelOpen} onClose={handleClosePanel} title={panelTitle}>
        {panelMode === 'create' && (
          <PriceListForm onSuccess={handleCreated} onCancel={handleClosePanel} />
        )}
        {panelMode === 'edit' && selectedPriceList && (
          <PriceListForm priceList={selectedPriceList} onSuccess={handleUpdated} onCancel={cancelEdit} />
        )}
        {panelMode === 'detail' && selectedPriceList && !isNestedTakeover && (
          <PriceListDetails
            priceList={selectedPriceList}
            onEdit={handleEdit}
            onDelete={handleDelete}
            assignments={assignments}
            assignmentsLoading={assignmentsLoading}
            assignmentsError={assignmentsError}
            onNewAssignment={handleNewAssignmentTracked}
            onAssignmentClick={handleAssignmentClickTracked}
            variantPrices={variantPrices}
            variantDetailsById={variantDetailsById}
            variantPricesLoading={variantPricesLoading}
            variantPricesError={variantPricesError}
            onNewVariantPrice={handleNewVariantPriceTracked}
            onVariantPriceClick={handleVariantPriceClickTracked}
          />
        )}
        {panelMode === 'detail' && selectedPriceList && assignmentMode !== 'list' && (
          <AssignmentForm
            priceListId={selectedPriceList.id}
            assignment={assignmentMode === 'edit' ? selectedAssignment : null}
            onSuccess={handleAssignmentSaved}
            onCancel={handleBackFromAssignment}
            onDeleted={handleAssignmentSaved}
          />
        )}
        {panelMode === 'detail' && selectedPriceList && variantPriceMode !== 'list' && (
          <VariantPriceForm
            priceListId={selectedPriceList.id}
            variantPrice={variantPriceMode === 'edit' ? selectedVariantPrice : null}
            onSuccess={handleVariantPriceSaved}
            onCancel={handleBackFromVariantPrice}
          />
        )}
      </SlidePanel>
    </PageContainer>
  )
}
