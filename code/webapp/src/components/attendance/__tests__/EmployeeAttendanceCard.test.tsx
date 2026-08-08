/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import type { TodayAttendanceEmployee } from '@/types/attendance'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockRegisterLeaveDialog = vi.fn((_props: { isOpen: boolean; employee: TodayAttendanceEmployee | null; onClose: () => void }) => null)

vi.mock('../RegisterLeaveDialog', () => ({
    RegisterLeaveDialog: (props: { isOpen: boolean; employee: TodayAttendanceEmployee | null; onClose: () => void }) =>
        mockRegisterLeaveDialog(props),
}))

import {
    EmployeeAttendanceCard,
    PhaseBadge,
    TimeRow,
    LateRow,
    OvertimeAlert,
    RoleBadges,
    LeaveChip,
} from '../EmployeeAttendanceCard'
import { getPhaseCardClass } from '../attendance-helpers'
import type { TodayAttendanceRow, TodayAttendanceData, TodayScheduleDay, TodayLeave } from '@/types/attendance'

afterEach(() => {
    cleanup()
    mockRegisterLeaveDialog.mockClear()
    vi.useRealTimers()
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
    overtime_valuation_method: null,
    overtime_rate_applied: null,
    overtime_amount: null,
    requires_overtime_decision: false,
    ...overrides,
})

const workSchedule: TodayScheduleDay = {
    day_of_week: 1,
    is_day_off: false,
    expected_start: '09:00',
    expected_lunch_start: '13:00',
    expected_lunch_end: '14:00',
    lunch_duration_minutes: 60,
    expected_end: '17:00',
}

const restSchedule: TodayScheduleDay = {
    day_of_week: 7,
    is_day_off: true,
    expected_start: null,
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: null,
}

const mockRow: TodayAttendanceRow = {
    employee: {
        id: '01HZTEST00000001',
        code: 'EMP001',
        user: {
            first_name: 'John',
            last_name: 'Doe',
        },
        roles: ['cajero'],
        daily_wage: null,
    },
    attendance: null,
    schedule: null,
    today_leave: null,
    today_vacation: false,
}

const mockRowWithAttendance: TodayAttendanceRow = {
    employee: {
        id: '01HZTEST00000002',
        code: 'EMP002',
        user: {
            first_name: 'Jane',
            last_name: 'Smith',
        },
        roles: ['mesero', 'cocina'],
        daily_wage: null,
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
    today_leave: null,
    today_vacation: false,
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

    it('does not render an edit affordance when onEdit is not provided', () => {
        const { queryByRole } = render(<TimeRow icon="↗" label="Entrada" value="08:30" />)
        expect(queryByRole('button')).toBeNull()
    })

    it('renders an edit affordance and calls onEdit when clicked', () => {
        const onEdit = vi.fn()
        const { getByRole } = render(<TimeRow icon="↗" label="Entrada" value="08:30" onEdit={onEdit} />)

        fireEvent.click(getByRole('button', { name: 'Corregir entrada' }))

        expect(onEdit).toHaveBeenCalledTimes(1)
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

const defaultProps = {
    row: mockRow,
    onCheckIn: vi.fn(),
    onLunchStart: vi.fn(),
    onLunchReturn: vi.fn(),
    onCheckOut: vi.fn(),
    onOvertimeDecision: vi.fn(),
    onMarkDayStatus: vi.fn().mockResolvedValue(undefined),
}

describe('EmployeeAttendanceCard', () => {

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

    it('renders check-in button for pending employee on a work day', () => {
        const { getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} row={{ ...mockRow, schedule: workSchedule }} />
        )
        expect(getByText('Registrar entrada')).toBeDefined()
    })

    it('renders check-in button when schedule is null', () => {
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByText('Registrar entrada')).toBeDefined()
    })

    it('calls onCheckIn when check-in button is clicked', () => {
        const onCheckIn = vi.fn()

        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} onCheckIn={onCheckIn} />)

        const button = getByText('Registrar entrada')
        fireEvent.click(button)

        expect(onCheckIn).toHaveBeenCalledWith(mockRow)
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
            today_leave: null,
            today_vacation: false,
        }

        const { container } = render(<EmployeeAttendanceCard {...defaultProps} row={onLeaveRow} />)
        expect(container.innerHTML).toContain('Ausencia')
    })

    it('renders "Marcar falta" button for pending employees on a work day', () => {
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={{ ...mockRow, schedule: workSchedule }} />
        )
        expect(getByTestId('btn-mark-falta')).toBeDefined()
    })

    it('renders "Marcar falta" button when schedule is null', () => {
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} />)
        expect(getByTestId('btn-mark-falta')).toBeDefined()
    })

    it('opens confirm dialog when "Marcar falta" is clicked', () => {
        const { getByTestId, getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)

        fireEvent.click(getByTestId('btn-mark-falta'))

        expect(getByText('¿Confirmar falta?')).toBeDefined()
    })

    it('calls onMarkDayStatus with ABSENCE when confirm dialog is confirmed', () => {
        const onMarkDayStatus = vi.fn().mockResolvedValue(undefined)
        const { getByTestId, getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onMarkDayStatus={onMarkDayStatus} />
        )

        fireEvent.click(getByTestId('btn-mark-falta'))
        fireEvent.click(getByText('Confirmar falta'))

        expect(onMarkDayStatus).toHaveBeenCalledWith(mockRow.employee, 'ABSENCE')
    })

    it('does NOT call onMarkDayStatus when confirm dialog is cancelled', () => {
        const onMarkDayStatus = vi.fn()
        const { getByTestId, getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onMarkDayStatus={onMarkDayStatus} />
        )

        fireEvent.click(getByTestId('btn-mark-falta'))
        fireEvent.click(getByText('Cancelar'))

        expect(onMarkDayStatus).not.toHaveBeenCalled()
    })

    it('asks whether to justify the falta right after confirming it', async () => {
        const { getByTestId, getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)

        fireEvent.click(getByTestId('btn-mark-falta'))
        await act(async () => {
            fireEvent.click(getByText('Confirmar falta'))
        })

        expect(getByText('¿Deseas justificar la falta ahora?')).toBeDefined()
    })

    it('does not ask to justify the falta when the mutation fails', async () => {
        // A failed markDayStatus (e.g. a 422 because an Attendance record
        // already exists for that date) must not walk the card through the
        // justify-now? flow as if the absence had actually been recorded —
        // the row never became 'absent', so there's nothing to justify.
        const onMarkDayStatus = vi.fn().mockRejectedValue(new Error('422'))
        const { getByTestId, getByText, queryByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onMarkDayStatus={onMarkDayStatus} />
        )

        fireEvent.click(getByTestId('btn-mark-falta'))
        await act(async () => {
            fireEvent.click(getByText('Confirmar falta'))
        })

        expect(queryByText('¿Deseas justificar la falta ahora?')).toBeNull()
    })

    it('disables "Marcar falta" AND "Registrar entrada" while a mutation is already in flight, and shows a spinner', () => {
        // confirmFalta now awaits onMarkDayStatus before opening the justify-now?
        // dialog, so between the click and the mutation resolving the card would
        // otherwise still show its normal pending actions fully clickable —
        // letting the manager fire a second "Marcar falta" (a duplicate request)
        // or a conflicting "Registrar entrada" (a check-in racing the in-flight
        // absence write) for the same employee/date. The confirm-falta dialog is
        // already closed by this point (confirmFalta closes it synchronously
        // before awaiting), so it can never show a busy state — the spinner on
        // the button itself is the only feedback the manager gets.
        const { getByTestId, getByText, container } = render(
            <EmployeeAttendanceCard {...defaultProps} isMarkingDayStatus />
        )

        expect((getByTestId('btn-mark-falta') as HTMLButtonElement).disabled).toBe(true)
        expect((getByText('Registrar entrada') as HTMLButtonElement).disabled).toBe(true)
        expect(container.querySelector('.animate-spin')).not.toBeNull()
    })

    it('opens RegisterLeaveDialog when choosing to justify the falta right away', async () => {
        const { getByTestId, getByText } = render(<EmployeeAttendanceCard {...defaultProps} />)

        fireEvent.click(getByTestId('btn-mark-falta'))
        await act(async () => {
            fireEvent.click(getByText('Confirmar falta'))
        })
        fireEvent.click(getByText('Justificar ahora'))

        expect(mockRegisterLeaveDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({ isOpen: true, employee: mockRow.employee })
        )
    })

    it('calls onFaltaFlowComplete when declining to justify the falta right away', async () => {
        const onFaltaFlowComplete = vi.fn()
        const { getByTestId, getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onFaltaFlowComplete={onFaltaFlowComplete} />
        )

        fireEvent.click(getByTestId('btn-mark-falta'))
        await act(async () => {
            fireEvent.click(getByText('Confirmar falta'))
        })
        fireEvent.click(getByText('Ahora no'))

        expect(onFaltaFlowComplete).toHaveBeenCalledWith(mockRow.employee.id)
    })

    it('calls onFaltaFlowComplete when RegisterLeaveDialog closes', async () => {
        const onFaltaFlowComplete = vi.fn()
        const { getByTestId, getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} onFaltaFlowComplete={onFaltaFlowComplete} />
        )

        fireEvent.click(getByTestId('btn-mark-falta'))
        await act(async () => {
            fireEvent.click(getByText('Confirmar falta'))
        })
        fireEvent.click(getByText('Justificar ahora'))

        const calls = mockRegisterLeaveDialog.mock.calls
        const lastCall = calls[calls.length - 1]
        if (!lastCall) throw new Error('RegisterLeaveDialog was not called')
        lastCall[0].onClose()

        expect(onFaltaFlowComplete).toHaveBeenCalledWith(mockRow.employee.id)
    })

    it('crossfades: pending actions fade out and "Justificar falta" fades in when the row turns ABSENCE', () => {
        vi.useFakeTimers()

        const { getByTestId, queryByTestId, rerender } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRow} />
        )

        expect(getByTestId('btn-mark-falta')).toBeDefined()

        const absenceRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000010', check_in: null, day_status: 'ABSENCE' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        rerender(<EmployeeAttendanceCard {...defaultProps} row={absenceRow} />)

        // Still showing the old pending buttons, now fading out — not yet swapped
        const fadingOutContainer = getByTestId('btn-mark-falta').parentElement as HTMLElement
        expect(fadingOutContainer.className).toContain('animate-fade-out')
        expect(queryByTestId('btn-justify-absence')).toBeNull()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        // Swapped to the justify button, fading in
        expect(queryByTestId('btn-mark-falta')).toBeNull()
        const fadedInContainer = getByTestId('btn-justify-absence').parentElement as HTMLElement
        expect(fadedInContainer.className).toContain('animate-fade-in')
    })

    it('does not crossfade for a direct initial ABSENCE render (no prior pending state)', () => {
        const absenceRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000011', check_in: null, day_status: 'ABSENCE' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={absenceRow} />)

        expect(getByTestId('btn-justify-absence')).toBeDefined()
    })

    it('renders "Justificar falta" button when day_status is ABSENCE', () => {
        const absenceRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000009', check_in: null, day_status: 'ABSENCE' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={absenceRow} />)
        expect(getByTestId('btn-justify-absence')).toBeDefined()
    })

    it('does not render "Justificar falta" when canEdit is false', () => {
        const absenceRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000009', check_in: null, day_status: 'ABSENCE' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        const { queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={absenceRow} canEdit={false} />
        )
        expect(queryByTestId('btn-justify-absence')).toBeNull()
    })

    it('does not render "Justificar falta" for non-absence phases', () => {
        const { queryByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />)
        expect(queryByTestId('btn-justify-absence')).toBeNull()
    })

    it('opens RegisterLeaveDialog for the employee when "Justificar falta" is clicked', () => {
        const absenceRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000009', check_in: null, day_status: 'ABSENCE' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={absenceRow} />)

        expect(mockRegisterLeaveDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({ isOpen: false, employee: mockRow.employee })
        )

        fireEvent.click(getByTestId('btn-justify-absence'))

        expect(mockRegisterLeaveDialog).toHaveBeenLastCalledWith(
            expect.objectContaining({ isOpen: true, employee: mockRow.employee })
        )
    })

    it('shows "Descanso programado" indicator AND "Registrar entrada" button for rest-day employees', () => {
        const restDayRow: TodayAttendanceRow = { ...mockRow, schedule: restSchedule }
        const { container, queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={restDayRow} />
        )

        // Shows the rest-day chip
        expect(container.innerHTML).toContain('Descanso programado')
        // "Registrar entrada" is visible — clicking it opens the extra-day negotiation dialog
        expect(container.innerHTML).toContain('Registrar entrada')
        // "Marcar falta" is hidden on rest days (no absence to mark)
        expect(queryByTestId('btn-mark-falta')).toBeNull()
    })

    it('does not render action buttons for employees with attendance', () => {
        const { queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />
        )
        expect(queryByTestId('btn-mark-falta')).toBeNull()
    })

    it('renders lunch-start button for checked-in phase', () => {
        const checkedInRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({ id: '01HZATTEND000004' }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
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
            today_leave: null,
            today_vacation: false,
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
            today_leave: null,
            today_vacation: false,
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
            today_leave: null,
            today_vacation: false,
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
            today_leave: null,
            today_vacation: false,
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
            today_leave: null,
            today_vacation: false,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={rejectedRow} />)
        expect(getByText(/No pagadas/)).toBeDefined()
    })

    it('calls onWeeklySummary with the employee when the weekly summary button is clicked', () => {
        const onWeeklySummary = vi.fn()
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} onWeeklySummary={onWeeklySummary} />
        )

        fireEvent.click(getByTestId('btn-weekly-summary'))

        expect(onWeeklySummary).toHaveBeenCalledWith(mockRowWithAttendance.employee)
    })

    it('does not render the weekly summary button when onWeeklySummary is not provided', () => {
        const { queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />
        )
        expect(queryByTestId('btn-weekly-summary')).toBeNull()
    })

    it('calls onViewAudit with the employee and attendance id when the audit button is clicked', () => {
        const onViewAudit = vi.fn()
        const { getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} onViewAudit={onViewAudit} />
        )

        fireEvent.click(getByTestId('btn-view-audit'))

        expect(onViewAudit).toHaveBeenCalledWith(mockRowWithAttendance.employee, mockRowWithAttendance.attendance?.id)
    })

    it('does not render the audit button when there is no attendance record', () => {
        const { queryByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRow} onViewAudit={vi.fn()} />
        )
        expect(queryByTestId('btn-view-audit')).toBeNull()
    })

    it('shows pending authorization alert when canEdit is false and overtime decision is pending', () => {
        const pendingRow: TodayAttendanceRow = {
            employee: mockRow.employee,
            attendance: makeAttendance({
                id: '01HZATTEND000008',
                check_in: '2024-01-15T08:00:00Z',
                check_out: '2024-01-15T17:30:00Z',
                overtime_minutes: 30,
                requires_overtime_decision: true,
            }),
            schedule: null,
            today_leave: null,
            today_vacation: false,
        }
        const { getByText } = render(
            <EmployeeAttendanceCard {...defaultProps} row={pendingRow} canEdit={false} />
        )
        expect(getByText(/pendiente autorización/)).toBeDefined()
    })

    it('applies the exit animation class when isExiting is true', () => {
        const { container } = render(<EmployeeAttendanceCard {...defaultProps} isExiting />)
        const root = container.firstChild as HTMLElement
        expect(root.className).toContain('animate-card-exit')
        expect(root.className).toContain('pointer-events-none')
    })

    it('does not apply the exit animation class by default', () => {
        const { container } = render(<EmployeeAttendanceCard {...defaultProps} />)
        const root = container.firstChild as HTMLElement
        expect(root.className).not.toContain('animate-card-exit')
    })

    // ── Correction pencils (canCorrect) ─────────────────────────────────────────

    it('does not render correction pencils by default (canCorrect defaults to false)', () => {
        const { queryByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} />
        )
        expect(queryByRole('button', { name: /^Corregir/ })).toBeNull()
    })

    it('does not render correction pencils when canCorrect is true but canEdit is false', () => {
        const { queryByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} canEdit={false} canCorrect />
        )
        expect(queryByRole('button', { name: /^Corregir/ })).toBeNull()
    })

    it('renders a pencil next to every already-recorded event when canCorrect is true', () => {
        const { getByRole, queryByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} canCorrect />
        )

        expect(getByRole('button', { name: 'Corregir entrada' })).toBeDefined()
        expect(getByRole('button', { name: 'Corregir salida comida' })).toBeDefined()
        expect(getByRole('button', { name: 'Corregir regreso comida' })).toBeDefined()
        // check_out is null on this fixture — no pencil for a value that was never recorded
        expect(queryByRole('button', { name: 'Corregir salida' })).toBeNull()
    })

    it('calls onCheckIn with the row when the entrada pencil is clicked', () => {
        const onCheckIn = vi.fn()
        const { getByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} canCorrect onCheckIn={onCheckIn} />
        )

        fireEvent.click(getByRole('button', { name: 'Corregir entrada' }))

        expect(onCheckIn).toHaveBeenCalledWith(mockRowWithAttendance)
    })

    it('calls onLunchStart with the employee, attendance id and current value when the lunch-start pencil is clicked', () => {
        const onLunchStart = vi.fn()
        const { getByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} canCorrect onLunchStart={onLunchStart} />
        )

        fireEvent.click(getByRole('button', { name: 'Corregir salida comida' }))

        expect(onLunchStart).toHaveBeenCalledWith(
            mockRowWithAttendance.employee,
            mockRowWithAttendance.attendance?.id,
            mockRowWithAttendance.attendance?.lunch_start,
        )
    })

    it('calls onLunchReturn with the employee, attendance id and current value when the lunch-return pencil is clicked', () => {
        const onLunchReturn = vi.fn()
        const { getByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={mockRowWithAttendance} canCorrect onLunchReturn={onLunchReturn} />
        )

        fireEvent.click(getByRole('button', { name: 'Corregir regreso comida' }))

        expect(onLunchReturn).toHaveBeenCalledWith(
            mockRowWithAttendance.employee,
            mockRowWithAttendance.attendance?.id,
            mockRowWithAttendance.attendance?.lunch_end,
        )
    })

    it('calls onCheckOut with the employee, attendance id and current value when the salida pencil is clicked', () => {
        const onCheckOut = vi.fn()
        const doneRow: TodayAttendanceRow = {
            ...mockRowWithAttendance,
            attendance: makeAttendance({
                ...mockRowWithAttendance.attendance!,
                check_out: '2024-01-15T17:00:00Z',
            }),
        }
        const { getByRole } = render(
            <EmployeeAttendanceCard {...defaultProps} row={doneRow} canCorrect onCheckOut={onCheckOut} />
        )

        fireEvent.click(getByRole('button', { name: 'Corregir salida' }))

        expect(onCheckOut).toHaveBeenCalledWith(
            doneRow.employee,
            doneRow.attendance?.id,
            doneRow.attendance?.check_out,
        )
    })
})

// ── LeaveChip ─────────────────────────────────────────────────────────────────

const makeLeave = (overrides: Partial<TodayLeave> = {}): TodayLeave => ({
    id: '01LEAVEID000000001',
    time_mode: 'OPEN_ENDED',
    calculation_mode: 'FIXED_PERCENTAGE',
    is_paid: true,
    starts_at: null,
    ends_at: null,
    note: null,
    ...overrides,
})

// 2026-04-13T12:00:00Z  →  noon UTC  (used as "now" for time-based label tests)
const NOW_MS = new Date('2026-04-13T12:00:00Z').getTime()

// ISO strings for a SCHEDULED leave that runs 09:00–14:00 CDMX (UTC-6)
// = 2026-04-13T15:00:00Z .. 2026-04-13T20:00:00Z
const STARTS_AT = '2026-04-13T15:00:00+00:00'  // 15:00 UTC = 09:00 CDMX
const ENDS_AT   = '2026-04-13T20:00:00+00:00'  // 20:00 UTC = 14:00 CDMX

describe('LeaveChip — OPEN_ENDED leave', () => {
    it('renders "Permiso aprobado (todo el día)" chip', () => {
        const { getByTestId, getByText } = render(
            <LeaveChip leave={makeLeave({ time_mode: 'OPEN_ENDED' })} nowMs={NOW_MS} />
        )
        expect(getByTestId('leave-chip-full-day')).toBeDefined()
        expect(getByText(/Permiso aprobado \(todo el día\)/)).toBeDefined()
    })
})

describe('LeaveChip — SCHEDULED leave', () => {
    it('shows "Llega a las" when starts_at is in the future', () => {
        // NOW_MS = 12:00 UTC, starts_at = 15:00 UTC  → starts_at > now → "Llega a las"
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: STARTS_AT,
            ends_at: ENDS_AT,
            is_paid: true,
        })
        const { getByText } = render(<LeaveChip leave={leave} nowMs={NOW_MS} />)
        expect(getByText(/Llega a las/)).toBeDefined()
        expect(getByText(/c\/g/)).toBeDefined()
    })

    it('shows "Salió a las" when ends_at is in the past', () => {
        // NOW_MS_AFTER = 21:00 UTC, ends_at = 20:00 UTC  → ends_at < now → "Salió a las"
        const nowMsAfter = new Date('2026-04-13T21:00:00Z').getTime()
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: STARTS_AT,
            ends_at: ENDS_AT,
            is_paid: false,
        })
        const { getByText } = render(<LeaveChip leave={leave} nowMs={nowMsAfter} />)
        expect(getByText(/Salió a las/)).toBeDefined()
        expect(getByText(/s\/g/)).toBeDefined()
    })

    it('shows "Permiso c/g hasta" when leave is ongoing', () => {
        // NOW_MS_DURING = 17:00 UTC (between 15:00 and 20:00)
        const nowMsDuring = new Date('2026-04-13T17:00:00Z').getTime()
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: STARTS_AT,
            ends_at: ENDS_AT,
            is_paid: true,
        })
        const { getByText } = render(<LeaveChip leave={leave} nowMs={nowMsDuring} />)
        expect(getByText(/Permiso c\/g hasta/)).toBeDefined()
    })

    it('shows "Permiso s/g hasta" for unpaid ongoing leave', () => {
        const nowMsDuring = new Date('2026-04-13T17:00:00Z').getTime()
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: STARTS_AT,
            ends_at: ENDS_AT,
            is_paid: false,
        })
        const { getByText } = render(<LeaveChip leave={leave} nowMs={nowMsDuring} />)
        expect(getByText(/Permiso s\/g hasta/)).toBeDefined()
    })

    it('shows "horario no disponible" fallback when timestamps are null', () => {
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: null,
            ends_at: null,
            is_paid: true,
        })
        const { getByText } = render(<LeaveChip leave={leave} nowMs={NOW_MS} />)
        expect(getByText(/horario no disponible/)).toBeDefined()
    })

    it('uses "leave-chip-scheduled" testid', () => {
        const leave = makeLeave({
            time_mode: 'SCHEDULED',
            starts_at: STARTS_AT,
            ends_at: ENDS_AT,
        })
        const { getByTestId } = render(<LeaveChip leave={leave} nowMs={NOW_MS} />)
        expect(getByTestId('leave-chip-scheduled')).toBeDefined()
    })
})

describe('EmployeeAttendanceCard — full-day leave hides action buttons', () => {
    it('hides "Registrar entrada" and "Marcar falta" for OPEN_ENDED leave', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            today_leave: makeLeave({ time_mode: 'OPEN_ENDED' }),
        }
        const { queryByTestId, queryByText } = render(
            <EmployeeAttendanceCard {...defaultProps} row={row} />
        )
        expect(queryByText('Registrar entrada')).toBeNull()
        expect(queryByTestId('btn-mark-falta')).toBeNull()
    })

    it('shows the leave chip on the card', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            today_leave: makeLeave({ time_mode: 'OPEN_ENDED' }),
        }
        const { getByTestId } = render(<EmployeeAttendanceCard {...defaultProps} row={row} />)
        expect(getByTestId('leave-chip-full-day')).toBeDefined()
    })

    it('keeps action buttons for SCHEDULED leave (partial day)', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            today_leave: makeLeave({
                time_mode: 'SCHEDULED',
                starts_at: STARTS_AT,
                ends_at: ENDS_AT,
            }),
        }
        const { getByText, getByTestId } = render(
            <EmployeeAttendanceCard {...defaultProps} row={row} />
        )
        expect(getByText('Registrar entrada')).toBeDefined()
        expect(getByTestId('btn-mark-falta')).toBeDefined()
    })
})

describe('EmployeeAttendanceCard — approved vacation without an Attendance record hides action buttons', () => {
    it('hides "Registrar entrada" and "Marcar falta" for a pending row with today_vacation true', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            today_vacation: true,
        }
        const { queryByTestId, queryByText } = render(
            <EmployeeAttendanceCard {...defaultProps} row={row} />
        )
        expect(queryByText('Registrar entrada')).toBeNull()
        expect(queryByTestId('btn-mark-falta')).toBeNull()
    })

    it('shows the "Vacaciones aprobadas" chip on the card', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            today_vacation: true,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={row} />)
        expect(getByText('Vacaciones aprobadas')).toBeDefined()
    })

    it('keeps the checked-in UI once the employee actually checks in, even if today_vacation is still true', () => {
        const row: TodayAttendanceRow = {
            ...mockRow,
            attendance: makeAttendance({ id: '01HZATTEND000012', check_in: '2024-01-15T08:00:00Z' }),
            today_vacation: true,
        }
        const { getByText } = render(<EmployeeAttendanceCard {...defaultProps} row={row} />)
        expect(getByText('Salir a comer')).toBeDefined()
    })
})
