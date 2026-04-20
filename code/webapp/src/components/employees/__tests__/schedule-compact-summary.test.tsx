/**
 * @vitest-environment jsdom
 */
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ScheduleCompactSummary } from '../schedule-compact-summary'
import type { EmployeeSchedule } from '@/types/schedule'

// Mock the utils module
vi.mock('../schedule-section-utils', () => ({
    buildCompactSummaryLine: vi.fn(),
}))

import { buildCompactSummaryLine } from '../schedule-section-utils'

const mockBuildCompactSummaryLine = vi.mocked(buildCompactSummaryLine)

const createMockSchedule = (
    overrideCount: number = 0
): EmployeeSchedule => ({
    id: '1',
    employment_period_id: 'period-01',
    employment_period: {
        id: 'period-01',
        start_date: '2026-01-01',
        end_date: null,
        employee_id: 'emp-01',
        employee: { id: 'emp-01', name: 'Test Employee' },
        position: 'Waiter',
        employment_type: 'full-time',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    },
    effective_from: '2026-01-01',
    effective_to: null,
    days: [
        {
            day_of_week: 1,
            is_day_off: false,
            expected_start: '09:00',
            expected_end: '18:00',
            expected_lunch_start: '13:00',
            expected_lunch_end: '14:00',
            lunch_duration_minutes: 60,
        },
    ],
    active_overrides: Array.from({ length: overrideCount }, (_, i) => ({
        id: `override-${i}`,
        employment_period_id: 'period-01',
        day_of_week: 1,
        effective_from: '2026-04-01',
        effective_to: '2026-04-07',
        is_day_off: true,
        expected_start: null,
        expected_end: null,
        expected_lunch_start: null,
        expected_lunch_end: null,
        lunch_duration_minutes: null,
        note: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
    })),
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
})

describe('ScheduleCompactSummary', () => {
    beforeEach(() => {
        mockBuildCompactSummaryLine.mockReset()
    })

    afterEach(() => {
        cleanup()
    })

    it('renders nothing when summary line is empty', () => {
        mockBuildCompactSummaryLine.mockReturnValue('')
        const { container } = render(
            <ScheduleCompactSummary schedule={createMockSchedule()} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders summary line when available', () => {
        mockBuildCompactSummaryLine.mockReturnValue('🕐 L-V · 9:00 AM – 6:00 PM · 🍽 1h')
        render(<ScheduleCompactSummary schedule={createMockSchedule()} />)
        expect(screen.getByText('🕐 L-V · 9:00 AM – 6:00 PM · 🍽 1h')).toBeDefined()
    })

    it('does not show override badge when no overrides exist', () => {
        mockBuildCompactSummaryLine.mockReturnValue('🕐 L-V · 9:00 AM')
        render(<ScheduleCompactSummary schedule={createMockSchedule(0)} />)
        expect(screen.queryByText(/\+\d/)).toBeNull()
    })

    it('shows override count badge when overrides exist', () => {
        mockBuildCompactSummaryLine.mockReturnValue('🕐 L-V · 9:00 AM')
        render(<ScheduleCompactSummary schedule={createMockSchedule(3)} />)
        expect(screen.getByText('+3')).toBeDefined()
    })

    it('handles schedule with undefined active_overrides', () => {
        mockBuildCompactSummaryLine.mockReturnValue('🕐 L-V · 9:00 AM')
        const scheduleWithoutOverrides = createMockSchedule()
        scheduleWithoutOverrides.active_overrides = undefined as unknown as []
        render(<ScheduleCompactSummary schedule={scheduleWithoutOverrides} />)
        expect(screen.queryByText(/\+\d/)).toBeNull()
    })
})
