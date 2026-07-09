// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { OvertimeLftTier } from '@/types/attendance-payroll'

const mockList = vi.fn()
const mockUpdate = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/overtime-lft-tiers-api', () => ({
  overtimeLftTiersApi: {
    list: (...args: unknown[]) => mockList(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { OvertimeLftTiersSection } from '../overtime-lft-tiers-section'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

function renderSection() {
  return render(<OvertimeLftTiersSection />, { wrapper: makeWrapper() })
}

const fakeTiers: OvertimeLftTier[] = [
  { id: '1', factor: 2, up_to_hours: 9, sort_order: 1 },
  { id: '2', factor: 3, up_to_hours: null, sort_order: 2 },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ data: { data: fakeTiers } })
})

afterEach(() => {
  cleanup()
})

describe('OvertimeLftTiersSection', () => {
  it('shows a loading message before tiers resolve', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    renderSection()

    expect(screen.getByText('Cargando configuración...')).toBeDefined()
  })

  it('renders one row per existing tier once loaded', async () => {
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))
  })

  it('adds a new row when "Agregar tramo" is clicked', async () => {
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))
    fireEvent.click(screen.getByText('Agregar tramo'))

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(3))
  })

  it('disables the delete button when only one tier remains', async () => {
    mockList.mockResolvedValue({ data: { data: [fakeTiers[0]] } })
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(1))
    expect((screen.getByLabelText('Eliminar tramo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('removes a row when its delete button is clicked', async () => {
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))
    fireEvent.click(screen.getAllByLabelText('Eliminar tramo')[1]!)

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(1))
  })

  it('enables submit and calls update after a field changes', async () => {
    mockUpdate.mockResolvedValue({ data: { data: fakeTiers } })
    renderSection()

    await waitFor(() => expect(screen.getAllByLabelText('Eliminar tramo').length).toBe(2))

    const factorInputs = document.querySelectorAll('input[type="number"]')
    fireEvent.change(factorInputs[0]!, { target: { value: '2.5' } })

    const submitButton = screen.getByText('Guardar cambios').closest('button')
    await waitFor(() => expect(submitButton?.disabled).toBe(false))

    fireEvent.click(submitButton!)

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
  })
})
