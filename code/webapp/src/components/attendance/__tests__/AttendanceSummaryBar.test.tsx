/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { Users } from 'lucide-react'
import {
    AttendanceSummaryBar,
    SummaryStat,
    OvertimeWarning,
} from '../AttendanceSummaryBar'
import type { AttendanceSummary, AttendanceFilter } from '../AttendanceSummaryBar'

afterEach(() => {
    cleanup()
})

// ── SummaryStat Tests ──────────────────────────────────────────────────────────

describe('SummaryStat', () => {
    it('renders label and value', () => {
        const { getByText } = render(
            <SummaryStat
                label="Total empleados"
                value={10}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-gray-600"
            />
        )

        expect(getByText('Total empleados')).toBeDefined()
        expect(getByText('10')).toBeDefined()
    })

    it('applies the correct color class to the value', () => {
        const { container } = render(
            <SummaryStat
                label="Pendientes"
                value={5}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-yellow-600"
            />
        )

        expect(container.innerHTML).toContain('text-yellow-600')
    })

    it('renders value as 0 correctly', () => {
        const { getByText } = render(
            <SummaryStat
                label="Completados"
                value={0}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-green-600"
            />
        )
        expect(getByText('0')).toBeDefined()
    })

    it('calls onClick when clicked', () => {
        const onClick = vi.fn()
        const { getByRole } = render(
            <SummaryStat
                label="Pendientes"
                value={5}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-yellow-600"
                onClick={onClick}
            />
        )

        fireEvent.click(getByRole('button'))
        expect(onClick).toHaveBeenCalledOnce()
    })

    it('reflects active state via aria-pressed', () => {
        const { getByRole } = render(
            <SummaryStat
                label="Pendientes"
                value={5}
                icon={<Users className="h-4 w-4" />}
                colorClass="text-yellow-600"
                active
            />
        )

        expect(getByRole('button').getAttribute('aria-pressed')).toBe('true')
    })
})

// ── OvertimeWarning Tests ──────────────────────────────────────────────────────

describe('OvertimeWarning', () => {
    it('renders nothing when count is 0', () => {
        const { container } = render(<OvertimeWarning count={0} />)
        expect(container.innerHTML).toBe('')
    })

    it('renders warning with count when positive (singular)', () => {
        const { getByText } = render(<OvertimeWarning count={1} />)

        expect(getByText('1')).toBeDefined()
        expect(getByText(/empleado tiene/)).toBeDefined()
    })

    it('renders warning with count when positive (plural)', () => {
        const { getByText } = render(<OvertimeWarning count={3} />)

        expect(getByText('3')).toBeDefined()
        expect(getByText(/empleados tienen/)).toBeDefined()
    })

    it('applies warning colors', () => {
        const { container } = render(<OvertimeWarning count={2} />)

        expect(container.innerHTML).toContain('bg-yellow-50')
        expect(container.innerHTML).toContain('text-yellow')
    })
})

// ── AttendanceSummaryBar Tests ─────────────────────────────────────────────────

describe('AttendanceSummaryBar', () => {
    const defaultSummary: AttendanceSummary = {
        total: 10,
        pending: 3,
        checkedIn: 4,
        atLunch: 5,
        done: 2,
        absent: 1,
        withOvertime: 1,
    }

    it('renders total employees count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('Total empleados')).toBeDefined()
        expect(getByText('10')).toBeDefined()
    })

    it('renders pending count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('Pendientes')).toBeDefined()
        expect(getByText('3')).toBeDefined()
    })

    it('renders checked-in count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('En trabajo')).toBeDefined()
        expect(getByText('4')).toBeDefined()
    })

    it('renders at-lunch count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('En comida')).toBeDefined()
        expect(getByText('5')).toBeDefined()
    })

    it('renders done count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('Completados')).toBeDefined()
        expect(getByText('2')).toBeDefined()
    })

    it('renders absent count', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        const label = getByText('Ausentes')
        expect(label).toBeDefined()
        const value = label.parentElement?.querySelector('p')
        expect(value?.textContent).toBe('1')
    })

    it('applies grid-cols-3 sm:grid-cols-6 so 6 cards fit evenly', () => {
        const { container } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        const grid = container.firstChild as HTMLElement
        expect(grid?.className).toContain('grid-cols-3')
        expect(grid?.className).toContain('sm:grid-cols-6')
    })

    it.each<[string, AttendanceFilter]>([
        ['Total empleados', 'total'],
        ['Pendientes', 'pending'],
        ['En trabajo', 'checkedIn'],
        ['En comida', 'atLunch'],
        ['Completados', 'done'],
        ['Ausentes', 'absent'],
    ])('clicking "%s" calls onFilterChange with "%s"', (label, filter) => {
        const onFilterChange = vi.fn()
        const { getByText } = render(
            <AttendanceSummaryBar summary={defaultSummary} onFilterChange={onFilterChange} />
        )

        fireEvent.click(getByText(label))
        expect(onFilterChange).toHaveBeenCalledWith(filter)
    })

    it('marks the active tab as pressed and the rest as not pressed', () => {
        const { getByText } = render(
            <AttendanceSummaryBar summary={defaultSummary} activeFilter="absent" />
        )

        expect(getByText('Ausentes').closest('button')?.getAttribute('aria-pressed')).toBe('true')
        expect(getByText('Pendientes').closest('button')?.getAttribute('aria-pressed')).toBe('false')
    })

    it('has no active tab when activeFilter is not provided', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText('Total empleados').closest('button')?.getAttribute('aria-pressed')).toBe('false')
    })

    it('renders overtime warning when employees have overtime', () => {
        const { getByText } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        expect(getByText(/overtime pendiente de autorización/)).toBeDefined()
    })

    it('does not render overtime warning when no employees have overtime', () => {
        const noOvertimeSummary: AttendanceSummary = {
            ...defaultSummary,
            withOvertime: 0,
        }
        const { queryByText } = render(<AttendanceSummaryBar summary={noOvertimeSummary} />)

        expect(queryByText(/overtime pendiente/)).toBeNull()
    })

    it('applies correct styles for the grid', () => {
        const { container } = render(<AttendanceSummaryBar summary={defaultSummary} />)

        const grid = container.firstChild as HTMLElement
        expect(grid?.className).toContain('grid')
        expect(grid?.className).toContain('gap-3')
    })

    it('handles zero counts gracefully', () => {
        const zeroSummary: AttendanceSummary = {
            total: 0,
            pending: 0,
            checkedIn: 0,
            atLunch: 0,
            done: 0,
            absent: 0,
            withOvertime: 0,
        }
        const { getAllByText } = render(<AttendanceSummaryBar summary={zeroSummary} />)

        // All zero values should be rendered
        const zeros = getAllByText('0')
        expect(zeros.length).toBeGreaterThanOrEqual(6)
    })
})
