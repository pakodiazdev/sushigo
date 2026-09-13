import { useState } from 'react'

/**
 * Shared page/search/Tipo/Estado filter state for list pages whose result set narrows on a
 * type + status combination (Insumos, Ubicaciones) — every setter resets to page 1 since a
 * filter change narrows/widens the result set (mirrors use-products-list.ts). Extracted to
 * stop this identical wrapper from being duplicated verbatim across pages (SonarCloud
 * new-code duplication finding on PR #625).
 */
export function useTypeStatusListFilters() {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value)
    setCurrentPage(1)
  }
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(searchQuery || typeFilter || statusFilter)
  const clearFilters = () => {
    handleSearchQueryChange('')
    handleTypeFilterChange('')
    handleStatusFilterChange('')
  }

  return {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery: handleSearchQueryChange,
    typeFilter,
    setTypeFilter: handleTypeFilterChange,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    hasActiveFilters,
    clearFilters,
  }
}
