import { useSearch, useNavigate } from '@tanstack/react-router'
import { useEmployees, useEmployee } from '@/services/employee-hooks'
import { sortSpecsToParams, parseSortParam, serializeSorts } from '@/lib/sort-utils'
import type { SortSpec } from '@/components/ui/data-grid'
import type { Employee, EmployeeFilters, EmployeePositionRole } from '@/types/employee'

export interface EmployeesSearch {
  page?: number
  per_page?: number
  sort?: string
  search?: string
  role?: string
  status?: string
  form?: 'new' | string
}

export function useEmployeesSearch() {
  const search = useSearch({ from: '/employees' })
  const navigate = useNavigate({ from: '/employees' })

  // State derived from URL
  const sorting = parseSortParam(search.sort)
  const page = search.page ?? 1
  const perPage = search.per_page ?? 20
  const isFormOpen = !!search.form

  const activeFilters: EmployeeFilters = {
    page,
    per_page: perPage,
    search: search.search,
    role: (search.role as EmployeePositionRole) ?? undefined,
    is_active: search.status === 'active' ? true
             : search.status === 'inactive' ? false
             : undefined,
    status: search.status === 'baja' ? 'baja' : undefined,
    ...sortSpecsToParams(sorting),
  }

  const { data, isLoading, isFetching } = useEmployees(activeFilters)

  // Fetch individual employee when editing (fallback if not in current page)
  const editingId = search.form && search.form !== 'new' ? search.form : ''
  const employeeQuery = useEmployee(editingId)
  const selectedEmployee = search.form === 'new'
    ? null
    : data?.data?.find((e: Employee) => e.id === search.form) ?? employeeQuery.data ?? null

  // Navigation helpers
  const setSearch = (updates: Partial<EmployeesSearch>) => {
    navigate({
      search: (prev) => {
        const next = { ...prev, ...updates }
        for (const key in next) {
          if (next[key as keyof EmployeesSearch] === undefined) {
            delete next[key as keyof EmployeesSearch]
          }
        }
        return next
      }
    })
  }

  const handleFilterChange = (key: string, value: any) => {
    setSearch({ [key]: value === '' ? undefined : value, page: undefined })
  }

  const handleSortChange = (newSorts: SortSpec[]) => {
    setSearch({ sort: serializeSorts(newSorts), page: undefined })
  }

  const handlePerPageChange = (pp: number) => {
    setSearch({ per_page: pp === 20 ? undefined : pp, page: undefined })
  }

  const handlePageChange = (p: number) => {
    setSearch({ page: p === 1 ? undefined : p })
  }

  const handleNewEmployee = () => setSearch({ form: 'new' })

  const handleEditEmployee = (item: Employee) => setSearch({ form: item.id })

  const handleCloseForm = () => {
    navigate({
      search: (prev) => {
        const { form: _form, ...rest } = prev
        return rest
      }
    })
  }

  return {
    // Data
    data,
    isLoading,
    isFetching,
    selectedEmployee,
    // Derived state
    sorting,
    page,
    perPage,
    isFormOpen,
    // Search param values (for inputs)
    searchText: search.search || '',
    roleFilter: search.role || '',
    statusFilter: search.status,
    // Handlers
    handleFilterChange,
    handleSortChange,
    handlePerPageChange,
    handlePageChange,
    handleNewEmployee,
    handleEditEmployee,
    handleCloseForm,
  }
}
