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
  const [searchQuery, setSearchQueryState] = useState('')
  const [typeFilter, setTypeFilterState] = useState('')
  const [statusFilter, setStatusFilterState] = useState('')

  const setSearchQuery = (value: string) => {
    setSearchQueryState(value)
    setCurrentPage(1)
  }
  const setTypeFilter = (value: string) => {
    setTypeFilterState(value)
    setCurrentPage(1)
  }
  const setStatusFilter = (value: string) => {
    setStatusFilterState(value)
    setCurrentPage(1)
  }

  const hasActiveFilters = Boolean(searchQuery || typeFilter || statusFilter)
  const clearFilters = () => {
    setSearchQuery('')
    setTypeFilter('')
    setStatusFilter('')
  }

  return {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    hasActiveFilters,
    clearFilters,
  }
}
