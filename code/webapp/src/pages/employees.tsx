import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { DataGrid } from '@/components/ui/data-grid'
import { EmployeeForm, EmployeeFilters, getEmployeeColumns } from '@/components/employees'
import { useEmployeesSearch, type EmployeesSearch } from '@/hooks/use-employees-search'

export const Route = createFileRoute('/employees')({
  component: EmployeesPage,
  validateSearch: (search: Record<string, unknown>): EmployeesSearch => ({
    page: Number(search.page) || undefined,
    per_page: Number(search.per_page) || undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
    search: typeof search.search === 'string' ? search.search : undefined,
    role: typeof search.role === 'string' ? search.role : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    form: typeof search.form === 'string' ? search.form : undefined,
  }),
})

export function EmployeesPage() {
  const {
    data, isLoading, isFetching, selectedEmployee,
    sorting, page, perPage, isFormOpen,
    searchText, roleFilter, statusFilter,
    handleFilterChange, handleSortChange, handlePerPageChange,
    handlePageChange, handleNewEmployee, handleEditEmployee, handleCloseForm,
  } = useEmployeesSearch()

  const columns = getEmployeeColumns(handleEditEmployee)

  return (
    <PageContainer>
      <PageHeader
        title="Empleados"
        description="Gestiona los empleados de tu negocio"
      />

      <div className="mt-6 space-y-4">
        <EmployeeFilters
          search={searchText}
          role={roleFilter}
          status={statusFilter}
          onFilterChange={handleFilterChange}
          onNew={handleNewEmployee}
        />

        <DataGrid
          data={data?.data || []}
          columns={columns}
          loading={isLoading || isFetching}
          emptyMessage="No se encontraron empleados"
          sorting={sorting}
          onSortChange={handleSortChange}
          perPage={perPage}
          onPerPageChange={handlePerPageChange}
          totalResults={data?.meta?.total}
          pagination={data?.meta ? {
            currentPage: page,
            totalPages: data.meta.last_page,
            onPageChange: handlePageChange,
          } : undefined}
        />
      </div>

      <EmployeeForm
        employee={selectedEmployee}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSuccess={handleCloseForm}
        onCreated={handleEditEmployee}
      />
    </PageContainer>
  )
}
