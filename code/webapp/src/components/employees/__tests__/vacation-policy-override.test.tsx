// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { Employee } from '@/types/employee'

const mockUpdateOverride = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/employee-vacation-policy-api', () => ({
  employeeVacationPolicyApi: {
    updateOverride: (...args: unknown[]) => mockUpdateOverride(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { VacationPolicyOverride } from '../vacation-policy-override'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const baseEmployee = {
  id: 'emp-001',
  vacation_entitlement_rule_key: null,
  vacation_entitlement_custom_table: null,
} as Pick<Employee, 'id' | 'vacation_entitlement_rule_key' | 'vacation_entitlement_custom_table'>

function renderOverride(employee = baseEmployee) {
  return render(<VacationPolicyOverride employee={employee} />, { wrapper: makeWrapper() })
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('VacationPolicyOverride', () => {
  it('starts unchecked and hides the tiers editor when there is no override', () => {
    renderOverride()

    const toggle = screen.getByLabelText('Política contractual') as HTMLInputElement
    expect(toggle.checked).toBe(false)
    expect(screen.queryByText('Agregar tramo')).toBeNull()
  })

  it('shows the tiers editor pre-filled when an override already exists', () => {
    renderOverride({
      id: 'emp-001',
      vacation_entitlement_rule_key: 'ContractualPolicy',
      vacation_entitlement_custom_table: [{ years_from: 1, days: 30 }],
    })

    const toggle = screen.getByLabelText('Política contractual') as HTMLInputElement
    expect(toggle.checked).toBe(true)
    expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(1)
  })

  it('reveals the tiers editor when the toggle is turned on', () => {
    renderOverride()

    fireEvent.click(screen.getByLabelText('Política contractual'))

    expect(screen.getAllByLabelText('Eliminar tramo').length).toBeGreaterThan(0)
  })

  it('submits the override with rule_key and tiers when enabled', async () => {
    mockUpdateOverride.mockResolvedValue({
      data: { data: { rule_key: 'ContractualPolicy', tiers: [{ years_from: 1, days: 30 }], active_rule_label: 'Política contractual' } },
    })
    renderOverride()

    fireEvent.click(screen.getByLabelText('Política contractual'))

    const submitButton = screen.getByText('Guardar cambios').closest('button')
    await waitFor(() => expect(submitButton?.disabled).toBe(false))
    fireEvent.click(submitButton!)

    await waitFor(() => expect(mockUpdateOverride).toHaveBeenCalledWith('emp-001', {
      rule_key: 'ContractualPolicy',
      tiers: [{ years_from: 1, days: 12 }],
    }))
  })

  it('submits rule_key null when turning the override off', async () => {
    mockUpdateOverride.mockResolvedValue({
      data: { data: { rule_key: null, tiers: [], active_rule_label: 'LFT México 2022' } },
    })
    renderOverride({
      id: 'emp-001',
      vacation_entitlement_rule_key: 'ContractualPolicy',
      vacation_entitlement_custom_table: [{ years_from: 1, days: 30 }],
    })

    fireEvent.click(screen.getByLabelText('Política contractual'))

    const submitButton = screen.getByText('Guardar cambios').closest('button')
    await waitFor(() => expect(submitButton?.disabled).toBe(false))
    fireEvent.click(submitButton!)

    await waitFor(() => expect(mockUpdateOverride).toHaveBeenCalledWith('emp-001', {
      rule_key: null,
      tiers: undefined,
    }))
  })
})
