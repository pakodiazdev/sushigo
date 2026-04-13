/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import {
    EmployeeAttendanceCard,
    PhaseBadge,
    TimeRow,
    LateRow,
    OvertimeAlert,
    RoleBadges,
} from '../EmployeeAttendanceCard'
import { getPhaseCardClass } from '../attendance-helpers'
import type { TodayAttendanceRow, TodayAttendanceData } from '@/types/attendance'

afterEach(() => {
    cleanup()
})

// ── Fixtures ───────────────────────────────────────────────────────────────────

const makeAttendance = (overrides: Partial<TodayAttendanceData> = {}): TodayAttendanceData => ({
    id: '01HZATTEND000001',
    check_in: '2024-01-15T08:00:00Z',
    lunch_start: null,
    lunch_end: null,
    check_out: null,
    day_status: 'WORKED',
    entry_late_seconds: 0,
    entry_late_minutes: 0,
    is_entry_deductible: false,
    overtime_minutes: 0,
    overtime_authorized: false,
    overtime_authorized_at: null,
    requires_overtime_decision: false,
    ...overrides,
})

const mockRow: TodayAttendanceRow = {
    employee: {
        id: '01HZTEST00000001',
        code: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        roles: ['cajero'],
    },
    attendance: null,
    schedule: null,
}

const mockRowWithAttendance: TodayAttendanceRow = {
    employee: {
        id: '01HZTEST00000002',
        code: 'EMP002',
        first_name: 'Jane',
        last_name: 'Smith',
        roles: ['mesero', 'cocina'],
    },
    attendance: makeAttendance({
        id: '01HZATTEND000001',
        check_in: '2024-01-15T08:00:00Z',
        lunch_start: '2024-01-15T12:00:00Z',
        lunch_end: '2024-01-15T12:30:00Z',
        entry_late_seconds: 900,
        entry_late_minutes: 15,
        overtime_minutes: 30,
    }),
    schedule: null,
}

// ── getPhaseCardClass Tests ────────────────────────────────────────────────────

describe('getPhaseCardClass', () => {
    it('returns correct class for pending phase', () => {
        const result = getPhaseCardClass('pending')
        expect(result).toContain('border-muted')
    })

    it('returns correct class for checked-in phase', () => {
        const result = getPhaseCardClass('checked-in')
        expect(result).toContain('border-blue')
    })

    it('returns correct class for at-lunch phase', () => {
        const result = getPhaseCardClass('at-lunch')
        expect(result).toContain('border-orange')
    })

    it('returns correct class for done phase', () => {
        const result = getPhaseCardClass('done')
        expect(result).toContain('border-green')
    })

    it('returns correct class for day-off phase', () => {
        const result = getPhaseCardClass('day-off')
        expect(result).toContain('border-indigo')
    })

    it('returns correct class for absence phase', () => {
        const result = getPhaseCardClass('absence')
        expect(result).toContain('border-red')
    })
})

// ── PhaseBadge Tests ───────────────────────────────────────────────────────────

describe('PhaseBadge', () => {
    it('renders correct label for pending phase', () => {
        const { getByText } = render(<PhaseBadge phase="pending" />)
        expect(getByText(/Sin registro/)).toBeDefined()
    })

    it('renders correct label for checked-in phase', () => {
        const { getByText } = render(<PhaseBadge phase="checked-in" />)
        expect(getByText(/En trabajo/)).toBeDefined()
    })

    it('renders correct label for at-lunch phase', () => {
        const { getByText } = render(<PhaseBadge phase="at-lunch" />)
        expect(getByText(/Comida/)).toBeDefined()
    })

    it('renders correct label for done phase', () => {
        const { getByText } = render(<PhaseBadge phase="done" />)
        expect(getByText(/Completo/)).toBeDefined()
    })

    it('renders correct label for on-leave phase', () => {
        const { getByText } = render(<PhaseBadge phase="on-leave" />)
        expect(getByText(/Ausencia/)).toBeDefined()
    })

    it('renders correct label for returned phase', () => {
        const { getByText } = render(<PhaseBadge phase="returned" />)
        expect(getByText(/Regresó/)).toBeDefined()
    })

    it('renders correct label for day-off phase', () => {
        const { getByText } = render(<PhaseBadge phase="day-off" />)
        expect(getByText(/Descanso/)).toBeDefined()
    })

    it('renders correct label for absence phase', () => {
        const { getByText } = render(<PhaseBadge phase="absence" />)
        expect(getByText(/Falta/)).toBeDefined()
    })
})

// ── TimeRow Tests ──────────────────────────────────────────────────────────────

describe('TimeRow', () => {
    it('renders label and value', () => {
        const { getByText } = render(<TimeRow icon="↗" label="Entrada" value="08:30" />)

        expect(getByText('Entrada')).toBeDefined()
        expect(getByText('08:30')).toBeDefined()
    })

    it('renders icon', () => {
        const { getByText } = render(<TimeRow icon="↗" label="Test" value="12:00" />)
        expect(getByText('↗')).toBeDefined()
    })
})

// ── LateRow Tests ──────────────────────────────────────────────────────────────

describe('LateRow', () => {
    it('renders late indicator with label and value', () => {
        const { getByText } = render(<LateRow label="Tardanza" value="15 min" deductible={false} />)

        expect(getByText('Tardanza')).toBeDefined()
        expect(getByText('15 min')).toBeDefined()
    })

    it('shows deductible badge when deductible is true', () => {
        const { getByText } = render(<LateRow label="Tardanza" value="15 min" deductible={true} />)
        expect(getByText('deducible')).toBeDefined()
    })

    it('applies red color for late indicator', () => {
        const { container } = render(<LateRow label="Tardanza" value="15 min" deductible={false} />)
        expect(container.innerHTML).toContain('bg-red-50')
        expect(container.innerHTML).toContain('text-red-700')
    })
})

// ── OvertimeAlert Tests ────────────────────────────────────────────────────────

describe('OvertimeAlert', () => {
    it('renders overtime alert with minutes', () => {
        const { getByText } = render(<OvertimeAlert overtimeMinutes={30} />)
        expect(getByText(/Overtime/)).toBeDefined()
        expect(getByText(/30/)).toBeDefined()
    })

    it('applies warning colors for overtime', () => {
        const { container } = render(<OvertimeAlert overtimeMinutes={30} />)
        expect(container.innerHTML).toContain('bg-yellow-50')
        expect(container.innerHTML).toContain('text-yellow')
    })
})

// ── RoleBadges Tests ───────────────────────────────────────────────────────────

describe('RoleBadges', () => {
    it('renders all roles as badges', () => {
        const { getByText } = render(<RoleBadges roles={['cajero', 'mesero', 'cocina']} />)

        expect(getByText('cajero')).toBeDefined()
        expect(getByText('mesero')).toBeDefined()
        expect(getByText('cocina')).toBeDefined()
    })

    it('renders null when no roles', () => {
        const { container } = render(<RoleBadges roles={[]} />)
        expect(container.innerHTML).toBe('')
    })
})

// ── EmployeeAttendanceCard Tests ───────────────────────────────────────────────

describe('EmployeeAttendanceCard', () => {
    const defaultProps = {
        row: mockRow,
        onCheckIn: vi.fn(),
        onLunchStart: vi.fn(),
        onLunchReturn: vi.fn(),
        onCheckOut: vi.fn(),
        onOvertimeDecision: vi.fn(),
        onRegisterLeave: vi.fn(),
        onMarkDayStatus: vi.fn(),
    }

    it('renders employee name', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByText('Doe, John')).toBeDefined()
    })

    it('renders employee code', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByText('EMP001')).toBeDefined()
    })

    it('renders phase badge', () => {
        const { container } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(container.innerHTML).toContain('Sin registro')
    })

    it('renders check-in button for pending phase', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByText('Registrar entrada')).toBeDefined()
    })

    it('calls onCheckIn when check-in button is clicked', () => {
        const onCheckIn = vi.fn()

        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} onCheckIn={onCheckIn} />)

        const button = getByText('Registrar entrada')
        fireEvent.click(button)

        expect(onCheckIn).toHaveBeenCalledWith(mockRow.employee)
    })

    it('displays role badges', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />)

        expect(getByText('mesero')).toBeDefined()
        expect(getByText('cocina')).toBeDefined()
    })

    it('renders on-leave phase badge for LEAVE day_status', () => {
        const onLeaveRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000003',
                check_in: '2024-01-15T08:00:00Z',
                day_status: 'LEAVE',
            }),
            schedule: null,
        }

        const { container } = render(<EmployeeAttendanceCard {...defaultProps} row={onLeaveRow} />)
        expect(container.innerHTML).toContain('Ausencia')
    })

    it('renders register-leave button for pending employees', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByText('Registrar ausencia')).toBeDefined()
    })

    it('calls onRegisterLeave when register-leave button is clicked', () => {
        const onRegisterLeave = vi.fn()
        const { getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onRegisterLeave={onRegisterLeave} />
        )

        fireEvent.click(getByText('Registrar ausencia'))
        expect(onRegisterLeave).toHaveBeenCalledWith(mockRow.employee)
    })

    it('renders "Marcar día" dropdown trigger for pending employees', () => {
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByTestId('btn-mark-day')).toBeDefined()
    })

    it('shows Descanso and Falta options when Marcar día is clicked', () => {
        const { getByTestId, getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)

        fireEvent.click(getByTestId('btn-mark-day'))

        expect(getByText('Descanso')).toBeDefined()
        expect(getByText('Falta')).toBeDefined()
    })

    it('calls onMarkDayStatus with DAY_OFF when Descanso is clicked', () => {
        const onMarkDayStatus = vi.fn()
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} onMarkDayStatus={onMarkDayStatus} />
        )

        fireEvent.click(getByTestId('btn-mark-day'))
        fireEvent.click(getByTestId('mark-day-off'))

        expect(onMarkDayStatus).toHaveBeenCalledWith(mockRow.employee, 'DAY_OFF')
    })

    it('calls onMarkDayStatus with ABSENCE when Falta is clicked', () => {
        const onMarkDayStatus = vi.fn()
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} onMarkDayStatus={onMarkDayStatus} />
        )

        fireEvent.click(getByTestId('btn-mark-day'))
        fireEvent.click(getByTestId('mark-absence'))

        expect(onMarkDayStatus).toHaveBeenCalledWith(mockRow.employee, 'ABSENCE')
    })

    it('does not render Marcar día dropdown for employees with attendance', () => {
        const { queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />
        )
        expect(queryByTestId('btn-mark-day')).toBeNull()
    })

    it('renders lunch-start button for checked-in phase', () => {
        const checkedInRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000004' }),
            schedule: null,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={checkedInRow} />)
        expect(getByText('Salir a comer')).toBeDefined()
    })

    it('calls onLunchStart when lunch button is clicked', () => {
        const onLunchStart = vi.fn()
        const checkedInRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000004' }),
            schedule: null,
        }
        const { getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} row={checkedInRow} onLunchStart={onLunchStart} />
        )
        fireEvent.click(getByText('Salir a comer'))
        expect(onLunchStart).toHaveBeenCalledWith(checkedInRow.employee, '01HZATTEND000004')
    })

    it('shows overtime decision button when requires_overtime_decision is true', () => {
        const overtimeRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000005',
                check_in: '2024-01-15T08:00:00Z',
                check_out: '2024-01-15T17:30:00Z',
                overtime_minutes: 30,
                requires_overtime_decision: true,
            }),
            schedule: null,
        }
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={overtimeRow} />)
        expect(getByTestId('btn-overtime-decision')).toBeDefined()
    })

    it('calls onOvertimeDecision when overtime button is clicked', () => {
        const onOvertimeDecision = vi.fn()
        const overtimeRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000005',
                check_in: '2024-01-15T08:00:00Z',
                check_out: '2024-01-15T17:30:00Z',
                overtime_minutes: 30,
                requires_overtime_decision: true,
            }),
            schedule: null,
        }
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={overtimeRow} onOvertimeDecision={onOvertimeDecision} />
        )
        fireEvent.click(getByTestId('btn-overtime-decision'))
        expect(onOvertimeDecision).toHaveBeenCalledWith(overtimeRow.employee, '01HZATTEND000005')
    })

    it('shows authorized badge when overtime was authorized', () => {
        const authorizedRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000006',
                check_in: '2024-01-15T08:00:00Z',
                check_out: '2024-01-15T17:30:00Z',
                overtime_minutes: 30,
                overtime_authorized: true,
                overtime_authorized_at: '2024-01-15T18:00:00Z',
                requires_overtime_decision: false,
            }),
            schedule: null,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={authorizedRow} />)
        expect(getByText(/Pagadas/)).toBeDefined()
    })

    it('shows rejected badge when overtime was rejected', () => {
        const rejectedRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000007',
                check_in: '2024-01-15T08:00:00Z',
                check_out: '2024-01-15T17:30:00Z',
                overtime_minutes: 30,
                overtime_authorized: false,
                overtime_authorized_at: '2024-01-15T18:00:00Z',
                requires_overtime_decision: false,
            }),
            schedule: null,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={rejectedRow} />)
        expect(getByText(/No pagadas/)).toBeDefined()
    })
})
