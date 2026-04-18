/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { CloseDayPanel } from '../CloseDayPanel'
import type { UseCloseDayPanelResult } from '../use-close-day-panel'

afterEach(() => {
  cleanup()
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePanel(overrides: Partial<UseCloseDayPanelResult> = {}): UseCloseDayPanelResult {
  return {
    isOpen: true,
    open: vi.fn(),
    close: vi.fn(),
    currentStep: 'confirm',
    hasPendingLunchReturns: false,
    goNext: vi.fn(),
    goBack: vi.fn(),
    lunchReturnEntries: [],
    updateLunchReturn: vi.fn(),
    closeTime: '22:00',
    setCloseTime: vi.fn(),
    summary: { checkOuts: [], absences: [] },
    confirm: vi.fn(),
    isSubmitting: false,
    overtimePending: [],
    clearOvertimePending: vi.fn(),
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CloseDayPanel', () => {
  describe('confirm step (no pending lunches)', () => {
    it('renders confirm step title', () => {
      const panel = makePanel()
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Confirmar cierre del día')).toBeDefined()
    })

    it('renders close time input with current value', () => {
      const panel = makePanel({ closeTime: '17:30' })
      const { container } = render(<CloseDayPanel panel={panel} />)
      const input = container.querySelector('input[type="time"]') as HTMLInputElement
      expect(input).not.toBeNull()
      expect(input.value).toBe('17:30')
    })

    it('calls setCloseTime when time input changes', () => {
      const panel = makePanel()
      const { container } = render(<CloseDayPanel panel={panel} />)
      const input = container.querySelector('input[type="time"]') as HTMLInputElement
      fireEvent.change(input, { target: { value: '18:30' } })
      expect(panel.setCloseTime).toHaveBeenCalledWith('18:30')
    })

    it('renders Confirmar cierre button', () => {
      const panel = makePanel()
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Confirmar cierre')).toBeDefined()
    })

    it('renders Cancelar button when no pending lunches', () => {
      const panel = makePanel({ hasPendingLunchReturns: false })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Cancelar')).toBeDefined()
    })

    it('calls confirm when Confirmar cierre is clicked', () => {
      const panel = makePanel()
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      fireEvent.click(getByText('Confirmar cierre'))
      expect(panel.confirm).toHaveBeenCalled()
    })

    it('calls close when Cancelar is clicked', () => {
      const panel = makePanel()
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      fireEvent.click(getByText('Cancelar'))
      expect(panel.close).toHaveBeenCalled()
    })

    it('shows Cerrando... when submitting', () => {
      const panel = makePanel({ isSubmitting: true })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Cerrando...')).toBeDefined()
    })

    it('renders check-out summary section', () => {
      const panel = makePanel({
        summary: {
          checkOuts: [{ employeeName: 'Carlos Mendoza' }],
          absences: [],
        },
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Salida')).toBeDefined()
      expect(getByText('Carlos Mendoza')).toBeDefined()
    })

    it('renders absence summary section', () => {
      const panel = makePanel({
        summary: {
          checkOuts: [],
          absences: [{ employeeName: 'Pedro Lopez' }],
        },
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Falta')).toBeDefined()
      expect(getByText('Pedro Lopez')).toBeDefined()
    })

    it('renders empty state when no check-outs or absences', () => {
      const panel = makePanel({
        summary: { checkOuts: [], absences: [] },
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText(/Todos los empleados ya tienen su registro completo/)).toBeDefined()
    })
  })

  describe('confirm step (with pending lunches - step 2)', () => {
    it('shows Paso 2 de 2 label', () => {
      const panel = makePanel({ hasPendingLunchReturns: true, currentStep: 'confirm' })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText(/Paso 2 de 2/)).toBeDefined()
    })

    it('renders Anterior button on step 2', () => {
      const panel = makePanel({ hasPendingLunchReturns: true, currentStep: 'confirm' })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Anterior')).toBeDefined()
    })

    it('calls goBack when Anterior is clicked', () => {
      const panel = makePanel({ hasPendingLunchReturns: true, currentStep: 'confirm' })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      fireEvent.click(getByText('Anterior'))
      expect(panel.goBack).toHaveBeenCalled()
    })
  })

  describe('lunch-returns step', () => {
    it('shows Paso 1 de 2 label', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [
          {
            attendanceId: 'att-001',
            employeeName: 'Carlos Mendoza',
            lunchStart: '2026-04-02T20:00:00Z',
            lunchStartDisplay: '14:00',
            preCalculatedReturn: '14:30',
            selectedReturn: '14:30',
          },
        ],
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText(/Paso 1 de 2/)).toBeDefined()
    })

    it('renders employee names in the table', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [
          {
            attendanceId: 'att-001',
            employeeName: 'Carlos Mendoza',
            lunchStart: '2026-04-02T20:00:00Z',
            lunchStartDisplay: '14:00',
            preCalculatedReturn: '14:30',
            selectedReturn: '14:30',
          },
          {
            attendanceId: 'att-002',
            employeeName: 'Maria Garcia',
            lunchStart: '2026-04-02T20:15:00Z',
            lunchStartDisplay: '14:15',
            preCalculatedReturn: '14:45',
            selectedReturn: '14:45',
          },
        ],
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Carlos Mendoza')).toBeDefined()
      expect(getByText('Maria Garcia')).toBeDefined()
    })

    it('renders time inputs for each entry', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [
          {
            attendanceId: 'att-001',
            employeeName: 'Carlos Mendoza',
            lunchStart: '2026-04-02T20:00:00Z',
            lunchStartDisplay: '14:00',
            preCalculatedReturn: '14:30',
            selectedReturn: '14:30',
          },
        ],
      })
      const { container } = render(<CloseDayPanel panel={panel} />)
      const timeInputs = container.querySelectorAll('input[type="time"]')
      expect(timeInputs).toHaveLength(1)
    })

    it('calls updateLunchReturn when time input changes', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [
          {
            attendanceId: 'att-001',
            employeeName: 'Carlos Mendoza',
            lunchStart: '2026-04-02T20:00:00Z',
            lunchStartDisplay: '14:00',
            preCalculatedReturn: '14:30',
            selectedReturn: '14:30',
          },
        ],
      })
      const { container } = render(<CloseDayPanel panel={panel} />)
      const input = container.querySelector('input[type="time"]') as HTMLInputElement
      fireEvent.change(input, { target: { value: '15:00' } })
      expect(panel.updateLunchReturn).toHaveBeenCalledWith('att-001', '15:00')
    })

    it('renders Siguiente button on step 1', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [],
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Siguiente')).toBeDefined()
    })

    it('calls goNext when Siguiente is clicked', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [],
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      fireEvent.click(getByText('Siguiente'))
      expect(panel.goNext).toHaveBeenCalled()
    })

    it('renders Cancelar (not Anterior) on step 1', () => {
      const panel = makePanel({
        currentStep: 'lunch-returns',
        hasPendingLunchReturns: true,
        lunchReturnEntries: [],
      })
      const { getByText } = render(<CloseDayPanel panel={panel} />)
      expect(getByText('Cancelar')).toBeDefined()
    })
  })
})
