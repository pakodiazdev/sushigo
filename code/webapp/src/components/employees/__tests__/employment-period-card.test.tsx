/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EmploymentPeriodCard } from '../employment-period-card'
import type { EmploymentPeriod } from '@/types/employment-period'

describe('EmploymentPeriodCard', () => {
    const activePeriod: EmploymentPeriod = {
        id: 1,
        employee_id: 1,
        branch_id: 1,
        branch_name: 'Sucursal Centro',
        start_date: '2024-01-15',
        end_date: null,
        termination_reason: null,
        is_active: true,
    }

    const terminatedPeriod: EmploymentPeriod = {
        id: 2,
        employee_id: 1,
        branch_id: 2,
        branch_name: 'Sucursal Norte',
        start_date: '2023-01-10',
        end_date: '2023-12-31',
        termination_reason: 'Renuncia voluntaria',
        is_active: false,
    }

    afterEach(() => {
        cleanup()
    })

    it('renders branch name', () => {
        const { getByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        expect(getByText('Sucursal Centro')).toBeDefined()
    })

    it('renders start date formatted', () => {
        const { getByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        // The date will be formatted in Spanish locale
        expect(getByText(/ene 2024/i)).toBeDefined()
    })

    it('renders "Presente" for active period without end date', () => {
        const { getByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        expect(getByText(/Presente/)).toBeDefined()
    })

    it('renders end date for terminated period', () => {
        const { getByText } = render(<EmploymentPeriodCard period={terminatedPeriod} />)
        expect(getByText(/dic 2023/i)).toBeDefined()
    })

    it('renders "Activo" badge for active period', () => {
        const { getByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        expect(getByText('Activo')).toBeDefined()
    })

    it('renders "Terminado" badge for terminated period', () => {
        const { getByText } = render(<EmploymentPeriodCard period={terminatedPeriod} />)
        expect(getByText('Terminado')).toBeDefined()
    })

    it('shows termination reason when provided', () => {
        const { getByText } = render(<EmploymentPeriodCard period={terminatedPeriod} />)
        expect(getByText(/Motivo:/)).toBeDefined()
        expect(getByText(/Renuncia voluntaria/)).toBeDefined()
    })

    it('does not show termination reason for active period', () => {
        const { queryByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        expect(queryByText(/Motivo:/)).toBeNull()
    })

    it('applies success variant badge for active period', () => {
        const { getByText } = render(<EmploymentPeriodCard period={activePeriod} />)
        const badge = getByText('Activo')
        expect(badge.className).toContain('bg-green')
    })

    it('applies default variant badge for terminated period', () => {
        const { getByText } = render(<EmploymentPeriodCard period={terminatedPeriod} />)
        const badge = getByText('Terminado')
        expect(badge.className).toContain('bg-gray')
    })
})
