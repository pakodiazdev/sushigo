// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { WageSummary } from '@/components/employees/wage-summary'

// Mock the useWageCalculations hook with all fields used by the component
vi.mock('@/components/employees/use-wage-calculations', () => ({
  useWageCalculations: ({ weeklySalary, weeklyHours }: { weeklySalary: number; weeklyHours: number }) => {
    if (weeklySalary <= 0) return null
    const weeklyWorkPortion = weeklySalary * (6 / 7)
    const weeklyRestPortion = weeklySalary * (1 / 7)
    const dailySalary = weeklySalary / 7
    const hourlyRatePrecise = weeklyWorkPortion / weeklyHours
    const monthlyTotal = weeklySalary * (365 / 7 / 12)
    const annualTotal = weeklySalary * (365 / 7)
    const sdi = dailySalary * 1.0452
    return {
      weeklyWorkPortion,
      weeklyRestPortion,
      weeklyTotal: weeklySalary,
      dailySalary,
      hourlyRatePrecise,
      monthlyTotal,
      annualTotal,
      aguinaldoAnnual: dailySalary * 15,
      primaVacacionalAnnual: dailySalary * 12 * 0.25,
      factorIntegracion: 1.0452,
      sdi,
      imssEmpleadoSemanal: weeklySalary * 0.02375,
      isrBrutoSemanal: 10,
      subsidioEmpleoSemanal: 5,
      isrNetoSemanal: 5,
      totalDeduccionesSemanal: weeklySalary * 0.02375 + 5,
      sueldoNetoSemanal: weeklySalary - weeklySalary * 0.02375 - 5,
      sueldoNetoMensual: (weeklySalary - weeklySalary * 0.02375 - 5) * (365 / 7 / 12),
      imssPatronMensual: sdi * 0.2045 * 30,
      infonavitMensual: sdi * 0.05 * 30,
      retiroCesantiaMensual: sdi * 0.0515 * 30,
      porcentajeCuotasPatronales: 30.6,
      totalCuotasPatronalesMensual: sdi * 0.307 * 30,
      costoDiarioEmpresa: dailySalary * 1.3,
      costoSemanalEmpresa: weeklySalary * 1.3,
      costoMensualEmpresa: monthlyTotal * 1.3,
      costoAnualEmpresa: annualTotal * 1.3,
    }
  },
}))

// Mock InfoTooltip to avoid icon issues
vi.mock('@/components/ui/info-tooltip', () => ({
  InfoTooltip: ({ text }: { text: string }) => <span data-tooltip={text} />,
}))

describe('WageSummary', () => {
  afterEach(() => { cleanup() })

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(container).toBeDefined()
    })

    it('shows the section title', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText(/Desglose de tu sueldo semanal/)).toBeDefined()
    })

    it('shows total semanal acordado label', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText('Total semanal acordado:')).toBeDefined()
    })

    it('shows salario diario label', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText('Salario diario')).toBeDefined()
    })

    it('shows tarifa por hora label', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText('Tarifa por hora')).toBeDefined()
    })

    it('shows proyección mensual', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText('Proyección mensual')).toBeDefined()
    })

    it('shows proyección anual', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText('Proyección anual')).toBeDefined()
    })

    it('shows weekly hours in label', () => {
      const { getAllByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      const matches = getAllByText(/48 hrs/)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('shows LFT section title', () => {
      const { getByText } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      expect(getByText(/Prestaciones de ley/)).toBeDefined()
    })
  })

  describe('null rendering', () => {
    it('returns null when weeklySalary is 0', () => {
      const { container } = render(
        <WageSummary weeklySalary={0} weeklyHours={48} />
      )
      // Container should be empty or have no meaningful content
      expect(container.firstChild).toBeNull()
    })
  })

  describe('currency formatting', () => {
    it('shows formatted MXN currency values', () => {
      const { container } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      // MXN formatting shows $ sign
      const text = container.textContent ?? ''
      expect(text).toContain('$')
    })
  })

  describe('styling', () => {
    it('has emerald border styling', () => {
      const { container } = render(
        <WageSummary weeklySalary={2400} weeklyHours={48} />
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper?.className).toContain('border-emerald-200')
    })
  })
})
