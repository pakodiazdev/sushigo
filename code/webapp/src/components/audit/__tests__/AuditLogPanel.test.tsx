// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'

const mockList = vi.fn()

vi.mock('@/services/audit.service', () => ({
  auditApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

import { AuditLogPanel } from '../AuditLogPanel'

function renderWithClient(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuditLogPanel', () => {
  it('shows a loading message while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}))

    renderWithClient(<AuditLogPanel />)

    expect(screen.getByText('Cargando historial...')).toBeDefined()
  })

  it('shows an empty message when there are no logs', async () => {
    mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 0 } } })

    renderWithClient(<AuditLogPanel />)

    await waitFor(() => expect(screen.getByText('No hay cambios registrados.')).toBeDefined())
  })

  it('shows an error message when the request fails', async () => {
    mockList.mockRejectedValue(new Error('network error'))

    renderWithClient(<AuditLogPanel />)

    await waitFor(() =>
      expect(screen.getByText('Error al cargar el historial de auditoría.')).toBeDefined(),
    )
  })

  it('renders a row with action badge, user, diff and reason', async () => {
    mockList.mockResolvedValue({
      data: {
        status: 200,
        data: [{
          id: 1,
          auditable_type: 'App\\Models\\Attendance',
          auditable_id: 'att-1',
          action: 'UPDATE',
          old_values: { check_in: '08:15:00' },
          new_values: { check_in: '08:05:00' },
          user: 'Ana García',
          reason: 'Corrección de horario',
          created_at: '2026-07-03T15:05:30+00:00',
        }],
        meta: { total: 1 },
      },
    })

    renderWithClient(<AuditLogPanel filters={{ employee_id: 'emp-1' }} />)

    await waitFor(() => expect(screen.getByText('Modificación')).toBeDefined())
    expect(screen.getByText('Ana García')).toBeDefined()
    expect(screen.getByText('Corrección de horario')).toBeDefined()
    expect(screen.getByText(/check_in/)).toBeDefined()
    expect(mockList).toHaveBeenCalledWith({ employee_id: 'emp-1', page: 1 })
  })

  it('does not render pagination controls when there is only one page', async () => {
    mockList.mockResolvedValue({
      data: { status: 200, data: [makeLog(1)], meta: { total: 1, current_page: 1, last_page: 1, per_page: 15 } },
    })

    renderWithClient(<AuditLogPanel />)

    await waitFor(() => expect(screen.getByText('Modificación')).toBeDefined())
    expect(screen.queryByLabelText('Página siguiente')).toBeNull()
  })

  it('renders pagination controls and advances to the next page on click', async () => {
    mockList.mockResolvedValue({
      data: { status: 200, data: [makeLog(1)], meta: { total: 30, current_page: 1, last_page: 2, per_page: 15 } },
    })

    renderWithClient(<AuditLogPanel />)

    await waitFor(() => expect(screen.getByText('Página 1 de 2 · 30 registros')).toBeDefined())

    const prevButton = screen.getByLabelText('Página anterior')
    const nextButton = screen.getByLabelText('Página siguiente')
    expect(prevButton.hasAttribute('disabled')).toBe(true)
    expect(nextButton.hasAttribute('disabled')).toBe(false)

    fireEvent.click(nextButton)

    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ page: 2 }))
  })

  it('resets to page 1 when the filters change', async () => {
    mockList.mockResolvedValue({
      data: { status: 200, data: [makeLog(1)], meta: { total: 30, current_page: 2, last_page: 2, per_page: 15 } },
    })

    const { rerender } = renderWithClient(<AuditLogPanel filters={{ employee_id: 'emp-1' }} />)

    await waitFor(() => expect(mockList).toHaveBeenCalledWith({ employee_id: 'emp-1', page: 1 }))

    rerender(
      React.createElement(
        QueryClientProvider,
        { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        <AuditLogPanel filters={{ employee_id: 'emp-2' }} />,
      ),
    )

    await waitFor(() => expect(mockList).toHaveBeenLastCalledWith({ employee_id: 'emp-2', page: 1 }))
  })
})

function makeLog(id: number) {
  return {
    id,
    auditable_type: 'App\\Models\\Attendance',
    auditable_id: 'att-1',
    action: 'UPDATE' as const,
    old_values: { check_in: '08:15:00' },
    new_values: { check_in: '08:05:00' },
    user: 'Ana García',
    reason: null,
    created_at: '2026-07-03T15:05:30+00:00',
  }
}
