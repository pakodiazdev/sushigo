// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'

const mockList = vi.fn()

vi.mock('@/services/audit.service', () => ({
  auditApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}))

import { AuditLogDialog } from '../AuditLogDialog'

function renderWithClient(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    React.createElement(QueryClientProvider, { client: qc }, ui),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue({ data: { status: 200, data: [], meta: { total: 0 } } })
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = 'unset'
})

describe('AuditLogDialog', () => {
  it('renders the given title and default description', async () => {
    renderWithClient(
      <AuditLogDialog
        isOpen
        onClose={vi.fn()}
        title="Auditoría — Mendoza, Carlos"
        filters={{ employee_id: 'emp-1' }}
      />,
    )

    expect(screen.getByText('Auditoría — Mendoza, Carlos')).toBeDefined()
    expect(screen.getByText('Historial de cambios y auditoría')).toBeDefined()
    await waitFor(() => expect(mockList).toHaveBeenCalledWith({ employee_id: 'emp-1', page: 1 }))
  })

  it('renders a custom description when provided', () => {
    renderWithClient(
      <AuditLogDialog
        isOpen
        onClose={vi.fn()}
        title="Auditoría"
        description="Historial personalizado"
        filters={{}}
      />,
    )

    expect(screen.getByText('Historial personalizado')).toBeDefined()
  })
})
