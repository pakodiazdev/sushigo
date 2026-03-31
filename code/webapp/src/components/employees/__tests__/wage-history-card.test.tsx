/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { WageHistoryCard } from '../wage-history-card'
import type { WageHistory } from '@/types/wage-history'

afterEach(() => {
    cleanup()
})

const mockActiveWage: WageHistory = {
    id: '1',
    hourly_rate: '150.00',
    weekly_scheduled_hours: 40,
    effective_from: '2024-01-15',
    effective_to: null,
    notes: 'Test wage note',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
}

const mockInactiveWage: WageHistory = {
    ...mockActiveWage,
    id: '2',
    effective_to: '2024-03-31',
}

describe('WageHistoryCard', () => {
    describe('wage calculation display', () => {
        it('calculates and displays weekly gross amount', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            // 150 * 40 = 6000
            expect(getByText(/\$6,000\.00\/semana/)).toBeDefined()
        })

        it('displays hourly rate', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            expect(getByText(/\$150\.00\/hora/)).toBeDefined()
        })

        it('displays weekly scheduled hours', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            expect(getByText('40 hrs/semana')).toBeDefined()
        })
    })

    describe('date display', () => {
        it('displays effective_from date in Spanish format', () => {
            const { container } = render(<WageHistoryCard wage={mockActiveWage} />)
            // Should contain formatted date (e.g., "15 ene 2024" or similar)
            expect(container.textContent).toContain('2024')
        })

        it('displays "Presente" when no effective_to date', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            expect(getByText(/Presente/)).toBeDefined()
        })

        it('displays effective_to date when wage is inactive', () => {
            const { container } = render(<WageHistoryCard wage={mockInactiveWage} />)
            // Should show the end date, not "Presente"
            expect(container.textContent).not.toContain('Presente')
        })
    })

    describe('status badge', () => {
        it('shows "Vigente" badge for active wage', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            expect(getByText('Vigente')).toBeDefined()
        })

        it('shows "Anterior" badge for inactive wage', () => {
            const { getByText } = render(<WageHistoryCard wage={mockInactiveWage} />)
            expect(getByText('Anterior')).toBeDefined()
        })
    })

    describe('notes display', () => {
        it('displays notes when provided', () => {
            const { getByText } = render(<WageHistoryCard wage={mockActiveWage} />)
            expect(getByText('Test wage note')).toBeDefined()
        })

        it('does not display notes section when notes is null', () => {
            const wageWithoutNotes = { ...mockActiveWage, notes: null }
            const { queryByText } = render(<WageHistoryCard wage={wageWithoutNotes} />)
            expect(queryByText('Test wage note')).toBeNull()
        })

        it('does not display notes section when notes is empty string', () => {
            const wageWithEmptyNotes = { ...mockActiveWage, notes: '' }
            const { container } = render(<WageHistoryCard wage={wageWithEmptyNotes} />)
            // The card should still render but without the notes paragraph
            expect(container.querySelector('p')?.textContent).not.toBe('')
        })
    })

    describe('different wage values', () => {
        it('handles string hourly_rate for currency calculation', () => {
            const wage = { ...mockActiveWage, hourly_rate: '200.50', weekly_scheduled_hours: 30 }
            const { getByText } = render(<WageHistoryCard wage={wage} />)
            // 200.50 * 30 = 6015
            expect(getByText(/\$6,015\.00\/semana/)).toBeDefined()
        })

        it('handles different weekly hours', () => {
            const wage = { ...mockActiveWage, weekly_scheduled_hours: 20 }
            const { getByText } = render(<WageHistoryCard wage={wage} />)
            expect(getByText('20 hrs/semana')).toBeDefined()
        })
    })
})
