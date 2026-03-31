// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { EmploymentPeriodsSection } from '@/components/employees/employment-periods-section'
import type { EmploymentPeriod } from '@/types/employment-period'

const activePeriod: EmploymentPeriod = {
  id: 'period-001',
  branch_id: 1,
  branch_name: 'Sucursal Central',
  start_date: '2024-01-15',
  end_date: null,
  termination_reason: null,
  is_active: true,
}

const closedPeriod: EmploymentPeriod = {
  id: 'period-002',
  branch_id: 1,
  branch_name: 'Sucursal Norte',
  start_date: '2023-01-10',
  end_date: '2023-12-31',
  termination_reason: 'Renuncia voluntaria',
  is_active: false,
}

describe('EmploymentPeriodsSection', () => {
  afterEach(() => { cleanup() })

  describe('section title', () => {
    it('renders section heading', () => {
      const { getByText } = render(
        <EmploymentPeriodsSection periods={[]} />
      )
      expect(getByText('Periodos Laborales')).toBeDefined()
    })
  })

  describe('empty state', () => {
    it('shows empty state message when no periods', () => {
      const { getByText } = render(
        <EmploymentPeriodsSection periods={[]} />
      )
      expect(getByText('No hay periodos laborales registrados')).toBeDefined()
    })

    it('does not show empty state when there are periods', () => {
      const { queryByText } = render(
        <EmploymentPeriodsSection periods={[activePeriod]} />
      )
      expect(queryByText('No hay periodos laborales registrados')).toBeNull()
    })
  })

  describe('with periods', () => {
    it('renders a single period card', () => {
      const { getByText } = render(
        <EmploymentPeriodsSection periods={[activePeriod]} />
      )
      // EmploymentPeriodCard renders branch_name
      expect(getByText('Sucursal Central')).toBeDefined()
    })

    it('renders multiple period cards', () => {
      const { getByText } = render(
        <EmploymentPeriodsSection periods={[activePeriod, closedPeriod]} />
      )
      expect(getByText('Sucursal Central')).toBeDefined()
      expect(getByText('Sucursal Norte')).toBeDefined()
    })

    it('renders correct count of cards', () => {
      const periods = [activePeriod, closedPeriod]
      const { container } = render(
        <EmploymentPeriodsSection periods={periods} />
      )
      // Each EmploymentPeriodCard renders inside the list
      const cards = container.querySelectorAll('.space-y-3 > div')
      expect(cards.length).toBe(2)
    })
  })
})
