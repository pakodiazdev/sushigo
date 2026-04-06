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
import type { TodayAttendanceRow } from '@/types/attendance'

afterEach(() => {
    cleanup()
})

// ── Helper Functions ───────────────────────────────────────────────────────────

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
    attendance: {
        id: '01HZATTEND000001',
        check_in: '2024-01-15T08:00:00Z',
        lunch_start: '2024-01-15T12:00:00Z',
        lunch_end: '2024-01-15T12:30:00Z',
        check_out: null,
        day_status: 'WORKED',
        entry_late_seconds: 900, // 15 min late
        entry_late_minutes: 15,
        is_entry_deductible: false,
        overtime_minutes: 30,
        requires_overtime_decision: false,
    },
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
        // Look for the badge text specifically
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
})
