// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUseExtraDayRequestForm = vi.fn()

vi.mock('../use-extra-day-request-form', () => ({
  useExtraDayRequestForm: (...args: unknown[]) => mockUseExtraDayRequestForm(...args),
}))

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({ isOpen, children, title, onClose }: { isOpen: boolean; children: React.ReactNode; title: string; onClose: () => void }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'slide-panel' },
      React.createElement('h2', null, title),
      React.createElement('button', { 'data-testid': 'panel-close', onClick: onClose }),
      children,
    ) : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, type }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    React.createElement('button', { disabled, onClick, type }, children),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
}))

vi.mock('@/components/ui/form-fields', () => ({
  FormField: ({ children, label, error }: { children: React.ReactNode; label: string; error?: string }) =>
    React.createElement('div', null,
      React.createElement('label', null, label),
      children,
      error ? React.createElement('p', { 'data-testid': 'field-error' }, error) : null,
    ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => React.createElement('textarea', props),
}))

vi.mock('@/lib/format', () => ({
  formatCurrency: (v: number) => `$${v.toFixed(2)}`,
}))

vi.mock('lucide-react', () => ({
  Loader2: () => React.createElement('span', { 'data-testid': 'loader' }),
}))

import { ExtraDayRequestForm } from '../extra-day-request-form'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeForm(overrides = {}) {
  return {
    register: () => ({}),
    formState: { errors: {} },
    watch: () => 100,
    reset: vi.fn(),
    ...overrides,
  }
}

function defaultHookResult(overrides = {}) {
  return {
    form: makeForm(),
    isLoadingWages: false,
    hasNoWage: false,
    registeredDailyWage: 400,
    prima: 400,
    total: 1200,
    handleSubmit: vi.fn((e) => e.preventDefault?.()),
    isPending: false,
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ExtraDayRequestForm — visibility', () => {
  it('renders nothing when isOpen is false', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={false} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.queryByTestId('slide-panel')).toBeNull()
  })

  it('renders the panel when isOpen is true', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByTestId('slide-panel')).toBeDefined()
  })

  it('shows "Solicitar día extra" as panel title', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Solicitar día extra')).toBeDefined()
  })
})

describe('ExtraDayRequestForm — submit button states', () => {
  it('shows "Enviar solicitud" button', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Enviar solicitud')).toBeDefined()
  })

  it('disables submit when isPending', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ isPending: true }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Enviar solicitud').closest('button')?.disabled).toBe(true)
  })

  it('shows loader inside submit button when isPending', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ isPending: true }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByTestId('loader')).toBeDefined()
  })

  it('disables submit when hasNoWage', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ hasNoWage: true, registeredDailyWage: 0 }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Enviar solicitud').closest('button')?.disabled).toBe(true)
  })

  it('disables submit while loading wages', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ isLoadingWages: true }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Enviar solicitud').closest('button')?.disabled).toBe(true)
  })
})

describe('ExtraDayRequestForm — wage data present', () => {
  it('shows the estimated total section', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText('Estimado propuesto')).toBeDefined()
  })

  it('shows formatted prima amount', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ prima: 400 }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getAllByText('$400.00').length).toBeGreaterThan(0)
  })
})

describe('ExtraDayRequestForm — no wage warning', () => {
  it('shows no-wage warning when hasNoWage is true', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ hasNoWage: true, registeredDailyWage: 0 }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText(/No tienes historial de salario/)).toBeDefined()
  })

  it('does not show no-wage warning when wage data is present', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.queryByText(/No tienes historial de salario/)).toBeNull()
  })
})

describe('ExtraDayRequestForm — loading wages state', () => {
  it('hides total estimate section while loading wages', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ isLoadingWages: true }))
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.queryByText('Estimado propuesto')).toBeNull()
  })
})

describe('ExtraDayRequestForm — approval warning', () => {
  it('shows the manager approval warning', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-1" />)
    expect(screen.getByText(/Esta solicitud requiere aprobación del Manager/)).toBeDefined()
  })
})

describe('ExtraDayRequestForm — hook binding', () => {
  it('passes the correct employeeId to useExtraDayRequestForm', () => {
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult())
    render(<ExtraDayRequestForm isOpen={true} onClose={vi.fn()} employeeId="emp-99" />)
    expect(mockUseExtraDayRequestForm).toHaveBeenCalledWith('emp-99', expect.any(Function))
  })
})

describe('ExtraDayRequestForm — close resets form', () => {
  it('calls form.reset() and onClose when Cancel button is clicked', () => {
    const mockReset = vi.fn()
    const onClose = vi.fn()
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ form: makeForm({ reset: mockReset }) }))
    render(<ExtraDayRequestForm isOpen={true} onClose={onClose} employeeId="emp-1" />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(mockReset).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls form.reset() and onClose when SlidePanel close button is triggered', () => {
    const mockReset = vi.fn()
    const onClose = vi.fn()
    mockUseExtraDayRequestForm.mockReturnValue(defaultHookResult({ form: makeForm({ reset: mockReset }) }))
    render(<ExtraDayRequestForm isOpen={true} onClose={onClose} employeeId="emp-1" />)
    fireEvent.click(screen.getByTestId('panel-close'))
    expect(mockReset).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
