// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { OvertimePayConfig } from '@/types/attendance-payroll'
import type { UseFormReturn } from 'react-hook-form'
import type { SetConfigFormValues } from '../use-overtime-config-section'

const mockSetShowForm = vi.fn()
const mockOnSubmit = vi.fn()
const mockWatch = vi.fn(() => 'LFT_PROPORTIONAL')

const fakeConfig: OvertimePayConfig = {
  id: 'cfg-1', valuation_method: 'AGREED_RATE', lft_factor: null, hourly_rate: 90,
  effective_from: '2026-01-01', effective_to: null,
}

const baseHook = {
  current: null,
  configs: [],
  isLoadingConfigs: false,
  showForm: false,
  setShowForm: mockSetShowForm,
  form: {
    register: vi.fn(() => ({})),
    watch: mockWatch,
    handleSubmit: (fn: (v: SetConfigFormValues) => void) => (e: React.FormEvent) => {
      e.preventDefault()
      fn({ valuation_method: 'LFT_PROPORTIONAL', lft_factor: '2.00', hourly_rate: '', effective_from: '2026-05-01' })
    },
    formState: { errors: {} },
  } as unknown as UseFormReturn<SetConfigFormValues>,
  onSubmit: mockOnSubmit,
  isPending: false,
}

vi.mock('../use-overtime-config-section', () => ({
  useOvertimeConfigSection: vi.fn(() => baseHook),
}))

import { OvertimeConfigSection } from '../overtime-config-section'
import * as sectionHook from '../use-overtime-config-section'

beforeEach(() => {
  vi.clearAllMocks()
  mockWatch.mockReturnValue('LFT_PROPORTIONAL')
  vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue(baseHook)
})

afterEach(() => {
  cleanup()
})

describe('OvertimeConfigSection', () => {
  it('shows "Sin configuración de horas extra" when no current config', () => {
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Sin configuración de horas extra')).toBeTruthy()
  })

  it('shows "Configurar" button when no current config', () => {
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByRole('button', { name: /configurar/i })).toBeTruthy()
  })

  it('clicking "Configurar" calls setShowForm(true)', () => {
    render(<OvertimeConfigSection employeeId="emp-1" />)
    fireEvent.click(screen.getByRole('button', { name: /configurar/i }))
    expect(mockSetShowForm).toHaveBeenCalledWith(true)
  })

  it('shows the config form when showForm is true', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, showForm: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByLabelText(/método de valoración/i)).toBeTruthy()
    expect(screen.getByLabelText(/fecha de vigencia/i)).toBeTruthy()
  })

  it('shows lft_factor field when method is LFT_PROPORTIONAL', () => {
    mockWatch.mockReturnValue('LFT_PROPORTIONAL')
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, showForm: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByLabelText(/factor lft/i)).toBeTruthy()
  })

  it('shows hourly_rate field when method is AGREED_RATE', () => {
    mockWatch.mockReturnValue('AGREED_RATE')
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, showForm: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByLabelText(/tarifa por hora/i)).toBeTruthy()
  })

  it('shows current config card with method and rate', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig],
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Tarifa acordada')).toBeTruthy()
    expect(screen.getByText('Activo')).toBeTruthy()
  })

  it('shows "Cambiar configuración" button when a config exists', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig],
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByRole('button', { name: /cambiar configuración/i })).toBeTruthy()
  })

  it('shows loading spinner when isLoadingConfigs is true', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, isLoadingConfigs: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows history for past configs (slice(1))', () => {
    const pastConfig: OvertimePayConfig = {
      ...fakeConfig, id: 'cfg-2', effective_from: '2025-01-01', effective_to: '2025-12-31',
    }
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig, pastConfig],
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Historial')).toBeTruthy()
  })

  it('clicking Cancelar in the form calls setShowForm(false)', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, showForm: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(mockSetShowForm).toHaveBeenCalledWith(false)
  })

  it('shows spinner on submit button when isPending is true', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({ ...baseHook, showForm: true, isPending: true })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows validation error for lft_factor when present', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook,
      showForm: true,
      form: {
        ...baseHook.form,
        formState: { errors: { lft_factor: { message: 'El factor LFT es requerido', type: 'custom' } } },
      } as unknown as typeof baseHook.form,
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText('El factor LFT es requerido')).toBeTruthy()
  })

  it('shows validation error for effective_from when present', () => {
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook,
      showForm: true,
      form: {
        ...baseHook.form,
        formState: { errors: { effective_from: { message: 'La fecha de vigencia es requerida', type: 'required' } } },
      } as unknown as typeof baseHook.form,
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText('La fecha de vigencia es requerida')).toBeTruthy()
  })

  it('history shows dash when effective_to is null', () => {
    const pastConfig: OvertimePayConfig = {
      ...fakeConfig, id: 'cfg-2', effective_from: '2025-01-01', effective_to: null,
    }
    vi.mocked(sectionHook.useOvertimeConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig, pastConfig],
    })
    render(<OvertimeConfigSection employeeId="emp-1" />)
    expect(screen.getByText(/→\s*—/)).toBeTruthy()
  })
})
