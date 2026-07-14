// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { VacationPolicySettings } from '@/types/attendance-payroll'

const mockGet = vi.fn()
const mockUpdate = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/vacation-policy-api', () => ({
  vacationPolicyApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { VacationPolicySection } from '../vacation-policy-section'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

function renderSection() {
  return render(<VacationPolicySection />, { wrapper: makeWrapper() })
}

const lftSettings: VacationPolicySettings = {
  active_rule_key: 'VacationsLFTMX',
  active_rule_label: 'LFT México 2022',
  tiers: [],
}

const customSettings: VacationPolicySettings = {
  active_rule_key: 'CustomCompanyPolicy',
  active_rule_label: 'Política de la empresa',
  tiers: [
    { id: '1', years_from: 1, days: 18, sort_order: 1 },
    { id: '2', years_from: 5, days: 25, sort_order: 2 },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue({ data: { data: lftSettings } })
})

afterEach(() => {
  cleanup()
})

describe('VacationPolicySection', () => {
  it('shows a loading message before settings resolve', () => {
    mockGet.mockReturnValue(new Promise(() => {}))
    renderSection()

    expect(screen.getByText('Cargando configuración...')).toBeDefined()
  })

  it('does not show the tiers editor when LFT is the active rule', async () => {
    renderSection()

    await waitFor(() => expect(screen.getByLabelText('LFT México 2022')).toBeDefined())
    expect(screen.queryByText('Agregar tramo')).toBeNull()
  })

  it('shows the tiers editor with existing rows when the custom policy is active', async () => {
    mockGet.mockResolvedValue({ data: { data: customSettings } })
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))
  })

  it('reveals the tiers editor when switching to the custom policy', async () => {
    renderSection()

    await waitFor(() => expect(screen.getByLabelText('Política personalizada')).toBeDefined())
    fireEvent.click(screen.getByLabelText('Política personalizada'))

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBeGreaterThan(0))
  })

  it('adds a new row when "Agregar tramo" is clicked', async () => {
    mockGet.mockResolvedValue({ data: { data: customSettings } })
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))
    fireEvent.click(screen.getByText('Agregar tramo'))

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(3))
  })

  it('submits the custom policy with its tiers', async () => {
    mockGet.mockResolvedValue({ data: { data: customSettings } })
    mockUpdate.mockResolvedValue({ data: { data: customSettings } })
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))

    const dayInputs = document.querySelectorAll('input[name$=".days"]')
    fireEvent.change(dayInputs[0]!, { target: { value: '20' } })

    const submitButton = screen.getByText('Guardar cambios').closest('button')
    await waitFor(() => expect(submitButton?.disabled).toBe(false))
    fireEvent.click(submitButton!)

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({
      active_rule_key: 'CustomCompanyPolicy',
      tiers: [
        { years_from: 1, days: 20 },
        { years_from: 5, days: 25 },
      ],
    }))
  })

  it('submits LFT without a tiers payload after switching back', async () => {
    mockGet.mockResolvedValue({ data: { data: customSettings } })
    mockUpdate.mockResolvedValue({ data: { data: lftSettings } })
    renderSection()

    await waitFor(() => expect(screen.getByLabelText('LFT México 2022')).toBeDefined())
    fireEvent.click(screen.getByLabelText('LFT México 2022'))

    const submitButton = screen.getByText('Guardar cambios').closest('button')
    await waitFor(() => expect(submitButton?.disabled).toBe(false))
    fireEvent.click(submitButton!)

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({
      active_rule_key: 'VacationsLFTMX',
      tiers: undefined,
    }))
  })
})
