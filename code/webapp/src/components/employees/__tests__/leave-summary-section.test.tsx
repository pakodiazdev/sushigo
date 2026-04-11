/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LeaveSummarySection } from '@/components/employees/leave-summary-section'
import type { Leave, LeaveType } from '@/types/leave'
import type { TodayAttendanceEmployee } from '@/types/attendance'

// ── Mock hook return type ──────────────────────────────────────────────────────

interface MockHookReturn {
    monthlySummary: { name: string; count: number; code: string }[]
    recentLeaves: Leave[]
    isLoadingSummary: boolean
    showFullHistory: boolean
    openFullHistory: () => void
    closeFullHistory: () => void
    fullLeaves: Leave[]
    fullMeta: { current_page: number; last_page: number; total: number } | undefined
    isLoadingFull: boolean
    leaveTypes: LeaveType[]
    filters: Record<string, string | number | undefined>
    page: number
    setPage: (p: number) => void
    updateFilter: (key: string, value: string | number | undefined) => void
    pendingLeaveEmployee: TodayAttendanceEmployee | null
    openRegisterLeave: () => void
    closeRegisterLeave: () => void
    showRegisterLeave: boolean
    showRequestLeave: boolean
    openRequestLeave: () => void
    closeRequestLeave: () => void
    handleApprove: (leaveId: string) => void
    handleReject: (leaveId: string) => void
    isApproving: boolean
    isRejecting: boolean
}

// ── Mocks ──────────────────────────────────────────────────────────────────────

const defaultHookReturn: MockHookReturn = {
    monthlySummary: [],
    recentLeaves: [],
    isLoadingSummary: false,
    showFullHistory: false,
    openFullHistory: vi.fn(),
    closeFullHistory: vi.fn(),
    fullLeaves: [],
    fullMeta: undefined,
    isLoadingFull: false,
    leaveTypes: [],
    filters: {},
    page: 1,
    setPage: vi.fn(),
    updateFilter: vi.fn(),
    pendingLeaveEmployee: null,
    openRegisterLeave: vi.fn(),
    closeRegisterLeave: vi.fn(),
    showRegisterLeave: false,
    showRequestLeave: false,
    openRequestLeave: vi.fn(),
    closeRequestLeave: vi.fn(),
    handleApprove: vi.fn(),
    handleReject: vi.fn(),
    isApproving: false,
    isRejecting: false,
}

let currentHook = { ...defaultHookReturn }

vi.mock('@/components/employees/use-leave-summary-section', () => ({
    useLeaveSummarySection: () => currentHook,
}))

vi.mock('@/components/attendance', () => ({
    RegisterLeaveDialog: ({ isOpen, mode }: { isOpen: boolean; mode?: string }) =>
        isOpen ? <div data-testid={`register-leave-dialog${mode === 'request' ? '-request' : ''}`}>RegisterLeaveDialog</div> : null,
}))

const employee = { id: 'emp-1', first_name: 'Ana', last_name: 'López', code: 'E001' }

function makeLeave(overrides: Partial<Leave> = {}): Leave {
    return {
        id: 'leave-1',
        employee_id: 'emp-1',
        leave_type: { id: 1, name: 'Incapacidad', code: 'MEDICAL', calculation_mode: 'FIXED_PERCENTAGE' as const },
        start_date: '2026-04-05',
        end_date: '2026-04-05',
        status: 'APPROVED',
        resolved_pay_percentage: 0,
        resolved_rest_day_factor: 'NONE',
        time_mode: null,
        scheduled_start_time: null,
        scheduled_end_time: null,
        actual_start_time: null,
        actual_end_time: null,
        actual_duration_minutes: null,
        computed_duration_minutes: null,
        notes: null,
        requested_by: 'Admin',
        approved_by: null,
        approved_at: null,
        created_at: '2026-04-05T00:00:00+00:00',
        ...overrides,
    }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LeaveSummarySection', () => {
    beforeEach(() => {
        currentHook = { ...defaultHookReturn, openFullHistory: vi.fn(), openRegisterLeave: vi.fn(), openRequestLeave: vi.fn(), closeFullHistory: vi.fn() }
    })

    afterEach(() => {
        cleanup()
    })

    it('renders section header with Ausencias title', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('Ausencias')).toBeDefined()
    })

    it('renders Registrar and Ver historial buttons', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('Registrar')).toBeDefined()
        expect(screen.getByText('Ver historial')).toBeDefined()
    })

    it('shows empty message when no leaves this month', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('Sin ausencias este mes')).toBeDefined()
    })

    it('renders monthly summary badges when present', () => {
        currentHook = {
            ...currentHook,
            monthlySummary: [
                { name: 'Incapacidad', count: 2, code: 'MEDICAL' },
                { name: 'Personal', count: 1, code: 'PERSONAL' },
            ],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        expect(screen.getByText('2 Incapacidad')).toBeDefined()
        expect(screen.getByText('1 Personal')).toBeDefined()
    })

    it('renders recent leaves with type name and status', () => {
        currentHook = {
            ...currentHook,
            recentLeaves: [
                makeLeave({ id: 'l1', status: 'APPROVED', resolved_pay_percentage: 100 }),
                makeLeave({
                    id: 'l2',
                    leave_type: { id: 2, name: 'Personal', code: 'PERSONAL', calculation_mode: 'FIXED_PERCENTAGE' as const },
                    status: 'PENDING',
                    resolved_pay_percentage: 0,
                }),
            ],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        expect(screen.getByText('Últimas ausencias')).toBeDefined()
        expect(screen.getByText('Incapacidad')).toBeDefined()
        expect(screen.getByText('Personal')).toBeDefined()
        expect(screen.getByText('Aprobada')).toBeDefined()
        expect(screen.getByText('Pendiente')).toBeDefined()
    })

    it('calls openFullHistory when Ver historial button is clicked', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        fireEvent.click(screen.getByText('Ver historial'))
        expect(currentHook.openFullHistory).toHaveBeenCalled()
    })

    it('calls openRegisterLeave when Registrar button is clicked', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        fireEvent.click(screen.getByText('Registrar'))
        expect(currentHook.openRegisterLeave).toHaveBeenCalled()
    })

    it('renders pay badge with 100% for full pay', () => {
        currentHook = {
            ...currentHook,
            recentLeaves: [makeLeave({ resolved_pay_percentage: 100 })],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('100%')).toBeDefined()
    })

    it('renders pay badge Sin goce for 0% pay', () => {
        currentHook = {
            ...currentHook,
            recentLeaves: [makeLeave({ resolved_pay_percentage: 0 })],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('Sin goce')).toBeDefined()
    })

    it('renders partial pay percentage', () => {
        currentHook = {
            ...currentHook,
            recentLeaves: [makeLeave({ resolved_pay_percentage: 50 })],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('50%')).toBeDefined()
    })

    it('renders loading skeleton when isLoadingSummary is true', () => {
        currentHook = { ...currentHook, isLoadingSummary: true }

        const { container } = render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        const skeletons = container.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not show Últimas ausencias when recentLeaves is empty', () => {
        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.queryByText('Últimas ausencias')).toBeNull()
    })

    it('opens RegisterLeaveDialog when pendingLeaveEmployee is set', () => {
        currentHook = {
            ...currentHook,
            pendingLeaveEmployee: { id: 'emp-1', code: 'E001', first_name: 'Ana', last_name: 'López', roles: [] },
            showRegisterLeave: true,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByTestId('register-leave-dialog')).toBeDefined()
    })

    // ── FullHistoryDialog tests ────────────────────────────────────────────────

    it('renders full history dialog when showFullHistory is true', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [
                makeLeave({ id: 'l1', notes: 'Cita médica' }),
                makeLeave({ id: 'l2', status: 'PENDING', start_date: '2026-03-10', end_date: '2026-03-12', notes: null }),
            ],
            fullMeta: { current_page: 1, last_page: 2, total: 25 },
            isLoadingFull: false,
            leaveTypes: [
                { id: 1, code: 'MEDICAL', name: 'Incapacidad', calculation_mode: 'FIXED_PERCENTAGE' as const, default_pay_percentage: 0, default_rest_day_factor: 'NONE' as const, counts_for_bonus: false },
            ],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        expect(screen.getByText('Historial de ausencias')).toBeDefined()
        expect(screen.getByText('Cita médica')).toBeDefined()
        expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0)
        expect(screen.getByText('25 ausencias')).toBeDefined()
        expect(screen.getByText('1 / 2')).toBeDefined()
    })

    it('renders loading skeleton in dialog when isLoadingFull is true', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            isLoadingFull: true,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        // Dialog renders via portal into document.body
        const skeletons = document.body.querySelectorAll('.animate-pulse')
        expect(skeletons.length).toBeGreaterThan(0)
    })

    it('renders empty state in dialog when no leaves match filters', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [],
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('No se encontraron ausencias')).toBeDefined()
    })

    it('renders filter selects in dialog', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [],
            isLoadingFull: false,
            leaveTypes: [
                { id: 1, code: 'MEDICAL', name: 'Incapacidad', calculation_mode: 'FIXED_PERCENTAGE' as const, default_pay_percentage: 0, default_rest_day_factor: 'NONE' as const, counts_for_bonus: false },
                { id: 2, code: 'PERSONAL', name: 'Falta personal', calculation_mode: 'FIXED_PERCENTAGE' as const, default_pay_percentage: 0, default_rest_day_factor: 'NONE' as const, counts_for_bonus: false },
            ],
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        // Status filter
        const selects = screen.getAllByRole('combobox')
        expect(selects.length).toBe(2)
    })

    it('renders date range for multi-day leave in dialog', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [makeLeave({ id: 'l1', start_date: '2026-03-10', end_date: '2026-03-15' })],
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        // Multi-day should show "10 mar — 15 mar" (or similar locale-formatted)
        const table = screen.getByRole('table')
        expect(table).toBeDefined()
    })

    it('calls closeFullHistory when dialog close button is clicked', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [],
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        // Multiple elements with aria-label="Cerrar" — get the button inside the dialog header
        const closeButtons = screen.getAllByLabelText('Cerrar')
        // Click the X button (not the backdrop)
        const xButton = closeButtons.find(el => el.tagName === 'BUTTON' && el.querySelector('svg'))
        fireEvent.click(xButton!)
        expect(currentHook.closeFullHistory).toHaveBeenCalled()
    })

    it('does not render pagination when only one page', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [makeLeave()],
            fullMeta: { current_page: 1, last_page: 1, total: 1 },
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        expect(screen.queryByText('1 / 1')).toBeNull()
    })

    it('renders all status badge variants', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [
                makeLeave({ id: 'l1', status: 'APPROVED' }),
                makeLeave({ id: 'l2', status: 'REJECTED' }),
                makeLeave({ id: 'l3', status: 'CANCELLED' }),
            ],
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)

        expect(screen.getAllByText('Aprobada').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Rechazada').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Cancelada').length).toBeGreaterThan(0)
    })

    it('renders singular label for 1 total leave', () => {
        currentHook = {
            ...currentHook,
            showFullHistory: true,
            fullLeaves: [makeLeave()],
            fullMeta: { current_page: 1, last_page: 2, total: 1 },
            isLoadingFull: false,
        }

        render(<LeaveSummarySection employeeId="emp-1" employee={employee} />)
        expect(screen.getByText('1 ausencia')).toBeDefined()
    })
})
