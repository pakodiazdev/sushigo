// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockCurrentBranch = vi.fn()
const mockAvailableBranches = vi.fn()

vi.mock('@/stores/auth.store', () => ({
    useAuthStore: (selector: (s: { currentBranch: unknown; availableBranches: unknown[] }) => unknown) =>
        selector({
            currentBranch: mockCurrentBranch(),
            availableBranches: mockAvailableBranches(),
        }),
}))

import { useEmployeeDetailActions } from '../use-employee-detail-actions'
import type { Employee, EmployeePositionRole } from '@/types/employee'

// ── Test data ─────────────────────────────────────────────────────────────────

const mockEmployee: Employee = {
    id: 'emp-01',
    code: 'EMP-001',
    first_name: 'Juan',
    last_name: 'Perez',
    email: 'juan@test.com',
    phone: '5551234567',
    phone_country: 'MX',
    roles: ['cook'] as EmployeePositionRole[],
    is_active: true,
    attendance_exempt: false,
    has_active_period: true,
    has_user: false,
    meta: null,
    employment_periods: [
        {
            id: '1',
            branch_id: 1,
            branch_name: 'Central',
            start_date: '2025-01-01',
            end_date: null,
            termination_reason: null,
            is_active: true,
        },
    ],
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useEmployeeDetailActions', () => {
    const onDeactivate = vi.fn()
    const onRehire = vi.fn()
    const onToggleActive = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockCurrentBranch.mockReturnValue({ id: 1, name: 'Central' })
        mockAvailableBranches.mockReturnValue([{ id: 1, name: 'Central' }])
    })

    const defaultParams = {
        employee: mockEmployee,
        isDeactivating: false,
        isRehiring: false,
        isTogglingActive: false,
        onDeactivate,
        onRehire,
        onToggleActive,
    }

    it('initializes with all dialogs closed', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        expect(result.current.showDeactivateForm).toBe(false)
        expect(result.current.showRehireForm).toBe(false)
        expect(result.current.showToggleConfirm).toBe(false)
    })

    it('returns effectiveBranch from currentBranch', () => {
        mockCurrentBranch.mockReturnValue({ id: 1, name: 'Central' })

        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        expect(result.current.effectiveBranch).toEqual({ id: 1, name: 'Central' })
    })

    it('falls back to first available branch when currentBranch is null', () => {
        mockCurrentBranch.mockReturnValue(null)
        mockAvailableBranches.mockReturnValue([{ id: 2, name: 'Norte' }])

        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        expect(result.current.effectiveBranch).toEqual({ id: 2, name: 'Norte' })
    })

    it('detects hasActivePeriod from employee.has_active_period', () => {
        const { result } = renderHook(() =>
            useEmployeeDetailActions({
                ...defaultParams,
                employee: { ...mockEmployee, has_active_period: true },
            }),
        )

        expect(result.current.hasActivePeriod).toBe(true)
    })

    it('detects hasActivePeriod from employment_periods if has_active_period is undefined', () => {
        const employeeWithPeriods: Employee = {
            ...mockEmployee,
            has_active_period: undefined,
            employment_periods: [
                {
                    id: '1',
                    branch_id: 1,
                    branch_name: 'Central',
                    start_date: '2025-01-01',
                    end_date: null,
                    termination_reason: null,
                    is_active: true,
                },
            ],
        }

        const { result } = renderHook(() =>
            useEmployeeDetailActions({ ...defaultParams, employee: employeeWithPeriods }),
        )

        expect(result.current.hasActivePeriod).toBe(true)
    })

    it('isLoading is true when any mutation is pending', () => {
        const { result: r1 } = renderHook(() =>
            useEmployeeDetailActions({ ...defaultParams, isDeactivating: true }),
        )
        expect(r1.current.isLoading).toBe(true)

        const { result: r2 } = renderHook(() =>
            useEmployeeDetailActions({ ...defaultParams, isRehiring: true }),
        )
        expect(r2.current.isLoading).toBe(true)

        const { result: r3 } = renderHook(() =>
            useEmployeeDetailActions({ ...defaultParams, isTogglingActive: true }),
        )
        expect(r3.current.isLoading).toBe(true)
    })

    // ── Dialog state tests ────────────────────────────────────────────────────────

    it('openDeactivateForm opens deactivate dialog and closes rehire', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openRehireForm()
        })
        expect(result.current.showRehireForm).toBe(true)

        act(() => {
            result.current.openDeactivateForm()
        })
        expect(result.current.showDeactivateForm).toBe(true)
        expect(result.current.showRehireForm).toBe(false)
    })

    it('openRehireForm opens rehire dialog and closes deactivate', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openDeactivateForm()
        })
        expect(result.current.showDeactivateForm).toBe(true)

        act(() => {
            result.current.openRehireForm()
        })
        expect(result.current.showRehireForm).toBe(true)
        expect(result.current.showDeactivateForm).toBe(false)
    })

    it('closeDeactivateForm closes deactivate dialog', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openDeactivateForm()
            result.current.closeDeactivateForm()
        })

        expect(result.current.showDeactivateForm).toBe(false)
    })

    it('closeRehireForm closes rehire dialog', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openRehireForm()
            result.current.closeRehireForm()
        })

        expect(result.current.showRehireForm).toBe(false)
    })

    it('openToggleConfirm and closeToggleConfirm toggle confirm dialog', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openToggleConfirm()
        })
        expect(result.current.showToggleConfirm).toBe(true)

        act(() => {
            result.current.closeToggleConfirm()
        })
        expect(result.current.showToggleConfirm).toBe(false)
    })

    // ── Handler tests ─────────────────────────────────────────────────────────────

    it('handleDeactivateSubmit calls onDeactivate with values', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.handleDeactivateSubmit({
                end_date: '2026-04-15',
                termination_reason: 'Renuncia',
            })
        })

        expect(onDeactivate).toHaveBeenCalledWith('2026-04-15', 'Renuncia')
    })

    it('handleDeactivateSubmit passes undefined reason when empty', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.handleDeactivateSubmit({
                end_date: '2026-04-15',
                termination_reason: '',
            })
        })

        expect(onDeactivate).toHaveBeenCalledWith('2026-04-15', undefined)
    })

    it('handleRehireSubmit calls onRehire with values and branch id', () => {
        mockCurrentBranch.mockReturnValue({ id: 3, name: 'Sur' })

        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.handleRehireSubmit({ start_date: '2026-04-15' })
        })

        expect(onRehire).toHaveBeenCalledWith('2026-04-15', 3)
    })

    it('handleRehireSubmit does nothing if no effectiveBranch', () => {
        mockCurrentBranch.mockReturnValue(null)
        mockAvailableBranches.mockReturnValue([])

        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.handleRehireSubmit({ start_date: '2026-04-15' })
        })

        expect(onRehire).not.toHaveBeenCalled()
    })

    it('handleToggleActive calls onToggleActive and closes confirm dialog', () => {
        const { result } = renderHook(() => useEmployeeDetailActions(defaultParams))

        act(() => {
            result.current.openToggleConfirm()
            result.current.handleToggleActive()
        })

        expect(onToggleActive).toHaveBeenCalled()
        expect(result.current.showToggleConfirm).toBe(false)
    })
})
