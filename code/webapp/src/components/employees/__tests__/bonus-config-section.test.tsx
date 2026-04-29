// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { EmployeeBonusConfig, PunctualityBonusGroup } from '@/types/punctuality'
import type { UseFormReturn } from 'react-hook-form'
import type { AssignFormValues } from '../use-bonus-config-section'

const mockSetShowForm = vi.fn()
const mockOnSubmit = vi.fn()

const fakeGroup: PunctualityBonusGroup = {
  id: 'grp-1', name: 'Grupo $110', weekly_bonus_amount: 110,
  working_days_divisor: 6, daily_bonus_amount: 18.33, is_active: true,
}

const fakeConfig: EmployeeBonusConfig = {
  id: 'cfg-1', bonus_group_id: 'grp-1', bonus_group_name: 'Grupo $110',
  weekly_bonus_amount: 110, daily_bonus_amount: 18.33,
  effective_from: '2026-01-01', effective_to: null,
}

const baseHook = {
  current: null,
  configs: [],
  groups: [fakeGroup],
  isLoadingConfigs: false,
  isLoadingGroups: false,
  showForm: false,
  setShowForm: mockSetShowForm,
  form: {
    register: vi.fn(() => ({})),
    handleSubmit: (fn: (v: AssignFormValues) => void) => (e: React.FormEvent) => {
      e.preventDefault()
      fn({ bonus_group_id: 'grp-1', effective_from: '2026-05-01' })
    },
    formState: { errors: {} },
  } as unknown as UseFormReturn<AssignFormValues>,
  onSubmit: mockOnSubmit,
  isPending: false,
}

vi.mock('../use-bonus-config-section', () => ({
  useBonusConfigSection: vi.fn(() => baseHook),
}))

import { BonusConfigSection } from '../bonus-config-section'
import * as sectionHook from '../use-bonus-config-section'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue(baseHook)
})

afterEach(() => {
  cleanup()
})

describe('BonusConfigSection', () => {
  it('shows "Sin grupo de bono asignado" when no current config', () => {
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Sin grupo de bono asignado')).toBeTruthy()
  })

  it('shows "Asignar grupo" button when no current config', () => {
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByRole('button', { name: /asignar grupo/i })).toBeTruthy()
  })

  it('clicking "Asignar grupo" calls setShowForm(true)', () => {
    render(<BonusConfigSection employeeId="emp-1" />)
    fireEvent.click(screen.getByRole('button', { name: /asignar grupo/i }))
    expect(mockSetShowForm).toHaveBeenCalledWith(true)
  })

  it('shows the assignment form when showForm is true', () => {
    vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue({
      ...baseHook, showForm: true,
    })
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByLabelText(/grupo de bono/i)).toBeTruthy()
    expect(screen.getByLabelText(/fecha de vigencia/i)).toBeTruthy()
  })

  it('shows current assignment card when a config exists', () => {
    vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig],
    })
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Grupo $110')).toBeTruthy()
    expect(screen.getByText('Activo')).toBeTruthy()
  })

  it('shows "Cambiar grupo" button when a config exists', () => {
    vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig],
    })
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByRole('button', { name: /cambiar grupo/i })).toBeTruthy()
  })

  it('shows loading spinner when isLoadingConfigs is true', () => {
    vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue({
      ...baseHook, isLoadingConfigs: true,
    })
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows history for past configs (slice(1))', () => {
    const pastConfig: EmployeeBonusConfig = {
      ...fakeConfig, id: 'cfg-2', effective_from: '2025-01-01', effective_to: '2025-12-31',
    }
    vi.mocked(sectionHook.useBonusConfigSection).mockReturnValue({
      ...baseHook, current: fakeConfig, configs: [fakeConfig, pastConfig],
    })
    render(<BonusConfigSection employeeId="emp-1" />)
    expect(screen.getByText('Historial')).toBeTruthy()
  })
})
