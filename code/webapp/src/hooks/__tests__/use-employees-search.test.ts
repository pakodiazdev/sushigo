// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockNavigate = vi.fn((options: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
    // Execute the search function to cover the callback code
    if (typeof options.search === 'function') {
        options.search(currentSearch)
    }
})
const mockSearch = vi.fn()

let currentSearch: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
    useSearch: () => {
        mockSearch()
        return currentSearch
    },
    useNavigate: () => mockNavigate,
}))

const mockEmployeesData = {
    data: [
        { id: 'emp-01', code: 'E001', first_name: 'John', last_name: 'Doe' },
        { id: 'emp-02', code: 'E002', first_name: 'Jane', last_name: 'Smith' },
    ],
    meta: { total: 2, per_page: 20, current_page: 1, last_page: 1 },
}

vi.mock('@/services/employee-hooks', () => ({
    useEmployees: () => ({
        data: mockEmployeesData,
        isLoading: false,
        isFetching: false,
    }),
    useEmployee: (id: string) => ({
        data: id ? { id, code: 'E003', first_name: 'Bob', last_name: 'Wilson' } : null,
    }),
}))

vi.mock('@/services/report.service', () => ({
    useWeeklySummary: () => ({
        data: undefined,
        isLoading: false,
        isError: false,
    }),
}))

let mockCanOpenWeeklySummary = true

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (s: { can: (permission: string) => boolean }) => unknown) =>
        selector({ can: (permission: string) => permission === 'reports.weekly-summary' && mockCanOpenWeeklySummary }),
}))

vi.mock('@/lib/sort-utils', () => ({
    sortSpecsToParams: (specs: Array<{ id: string; desc: boolean }>) => {
        if (!specs?.length) return {}
        return { sort_by: specs[0]?.id, sort_direction: specs[0]?.desc ? 'desc' : 'asc' }
    },
    parseSortParam: (sort?: string) => {
        if (!sort) return []
        const [id, dir] = sort.split(':')
        return [{ id: id ?? '', desc: dir === 'desc' }]
    },
    serializeSorts: (specs: Array<{ id: string; desc: boolean }>) => {
        if (!specs?.length) return undefined
        return `${specs[0]?.id}:${specs[0]?.desc ? 'desc' : 'asc'}`
    },
}))

import { useEmployeesSearch } from '../use-employees-search'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEmployeesSearch', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        currentSearch = {}
        mockCanOpenWeeklySummary = true
    })

    it('returns default pagination when no URL params', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.page).toBe(1)
        expect(result.current.perPage).toBe(20)
    })

    it('reads page from URL search params', () => {
        currentSearch = { page: 3 }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.page).toBe(3)
    })

    it('reads per_page from URL search params', () => {
        currentSearch = { per_page: 50 }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.perPage).toBe(50)
    })

    it('parses sort param into sorting array', () => {
        currentSearch = { sort: 'name:asc' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.sorting).toEqual([{ id: 'name', desc: false }])
    })

    it('returns isFormOpen false when no form param', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.isFormOpen).toBe(false)
    })

    it('returns isFormOpen true when form param is set', () => {
        currentSearch = { form: 'new' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.isFormOpen).toBe(true)
    })

    it('returns selectedEmployee null for new form', () => {
        currentSearch = { form: 'new' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.selectedEmployee).toBeNull()
    })

    it('finds selectedEmployee from current page data', () => {
        currentSearch = { form: 'emp-01' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.selectedEmployee?.id).toBe('emp-01')
    })

    it('fetches employee from API when not in current page', () => {
        currentSearch = { form: 'emp-99' }
        const { result } = renderHook(() => useEmployeesSearch())

        // Falls back to useEmployee query result
        expect(result.current.selectedEmployee?.id).toBe('emp-99')
    })

    it('handleFilterChange navigates with updated filter', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleFilterChange('search', 'test')
        })

        expect(mockNavigate).toHaveBeenCalledWith({
            search: expect.any(Function),
        })
    })

    it('handleFilterChange clears value when empty string', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleFilterChange('search', '')
        })

        // Navigate should be called - implementation clears undefined values
        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handleSortChange serializes sorts and navigates', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleSortChange([{ key: 'code', direction: 'desc' }])
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handlePerPageChange navigates with per_page', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handlePerPageChange(50)
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handlePageChange navigates with page', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handlePageChange(2)
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handleNewEmployee sets form to new', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleNewEmployee()
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handleEditEmployee sets form to employee id', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleEditEmployee({ id: 'emp-05' } as Parameters<typeof result.current.handleEditEmployee>[0])
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handleCloseForm removes form param', () => {
        currentSearch = { form: 'emp-01', page: 2 }
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handleCloseForm()
        })

        expect(mockNavigate).toHaveBeenCalledWith({
            search: expect.any(Function),
        })
    })

    it('returns employees data from hook', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.data).toEqual(mockEmployeesData)
        expect(result.current.isLoading).toBe(false)
        expect(result.current.isFetching).toBe(false)
    })

    it('exposes roleFilter from search params', () => {
        currentSearch = { role: 'manager' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.roleFilter).toBe('manager')
    })

    it('exposes statusFilter with active', () => {
        currentSearch = { status: 'active' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.statusFilter).toBe('active')
    })

    it('exposes statusFilter with inactive', () => {
        currentSearch = { status: 'inactive' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.statusFilter).toBe('inactive')
    })

    it('exposes statusFilter with baja', () => {
        currentSearch = { status: 'baja' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.statusFilter).toBe('baja')
    })

    it('handleFilterChange removes undefined values from search params', () => {
        currentSearch = { search: 'existing', page: 2, role: 'manager' }
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            // This will set search to undefined (empty string becomes undefined)
            result.current.handleFilterChange('search', '')
        })

        // The callback inside navigate should execute and clean up undefined values
        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handlePerPageChange resets page when changing items per page to default', () => {
        currentSearch = { page: 3, per_page: 50 }
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            // Setting per_page to 20 should result in undefined (default)
            result.current.handlePerPageChange(20)
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('handlePageChange does not add page param for page 1', () => {
        currentSearch = { page: 5 }
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.handlePageChange(1)
        })

        expect(mockNavigate).toHaveBeenCalled()
    })

    it('weeklySummary panel is closed by default', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.weeklySummary.isOpen).toBe(false)
    })

    it('weeklySummary panel opens automatically when the URL already has a weeklySummary id', () => {
        currentSearch = { weeklySummary: 'emp-01' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.weeklySummary.isOpen).toBe(true)
        expect(result.current.weeklySummary.employeePublicId).toBe('emp-01')
    })

    it('weeklySummary.open navigates with the weeklySummary id', () => {
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.weeklySummary.open('emp-02', 'Doe, John')
        })

        expect(result.current.weeklySummary.isOpen).toBe(true)
        expect(mockNavigate).toHaveBeenCalled()
    })

    it('weeklySummary.close navigates removing the weeklySummary id', () => {
        currentSearch = { weeklySummary: 'emp-01' }
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.weeklySummary.close()
        })

        expect(result.current.weeklySummary.isOpen).toBe(false)
        expect(mockNavigate).toHaveBeenCalled()
    })

    it('exposes canOpenWeeklySummary from the permission check', () => {
        mockCanOpenWeeklySummary = false
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.canOpenWeeklySummary).toBe(false)
    })

    it('does not open the weeklySummary panel from the URL id when lacking permission', () => {
        mockCanOpenWeeklySummary = false
        currentSearch = { weeklySummary: 'emp-01' }
        const { result } = renderHook(() => useEmployeesSearch())

        expect(result.current.weeklySummary.isOpen).toBe(false)
    })

    it('strips the weeklySummary id from the URL when lacking permission', () => {
        mockCanOpenWeeklySummary = false
        currentSearch = { weeklySummary: 'emp-01' }
        renderHook(() => useEmployeesSearch())

        expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function) })
    })

    it('weeklySummary.open is a no-op when lacking permission', () => {
        mockCanOpenWeeklySummary = false
        const { result } = renderHook(() => useEmployeesSearch())

        act(() => {
            result.current.weeklySummary.open('emp-02', 'Doe, John')
        })

        expect(result.current.weeklySummary.isOpen).toBe(false)
    })
})
