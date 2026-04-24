// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import type { Employee } from '@/types/employee'

// ── UI mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/slide-panel', () => ({
  SlidePanel: ({ isOpen, children, title }: { isOpen: boolean; children: React.ReactNode; title: string }) =>
    isOpen ? <div data-testid="slide-panel"><div data-testid="panel-title">{title}</div>{children}</div> : null,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, className }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    type?: string
    className?: string
  }) => (
    <button
      type={(type ?? 'button') as 'button' | 'submit' | 'reset'}
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid={type === 'submit' ? 'submit-btn' : 'cancel-btn'}
    >
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/form-fields', () => ({
  FormField: ({ children, label, error }: { children: React.ReactNode; label: string; error?: string }) => (
    <div>
      <label>{label}</label>
      {children}
      {error && <p data-testid="field-error">{error}</p>}
    </div>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}))

// ── Hook mock ─────────────────────────────────────────────────────────────────

const mockSetValue = vi.fn()
const mockRegister = vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() }))
const mockHandleSubmit = vi.fn()

const defaultHookReturn = {
  form: {
    register: mockRegister,
    watch: vi.fn((field: string) => field === 'salary_type' ? 'registered' : 'legal'),
    setValue: mockSetValue,
    handleSubmit: vi.fn(),
    formState: { errors: {} },
  },
  isLoadingWages: false,
  hasNoWage: false,
  registeredDailyWage: 800,
  salaryDay: 800,
  seventhDay: 800,
  prima: 800,
  total: 2400,
  handleSubmit: mockHandleSubmit,
  isPending: false,
}

vi.mock('../use-extra-day-form', () => ({
  useExtraDayForm: () => mockUseExtraDayFormReturn,
}))

let mockUseExtraDayFormReturn = { ...defaultHookReturn }

import { ExtraDayForm } from '../extra-day-form'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employee = {
  id: 'emp-1',
  first_name: 'Ana',
  last_name: 'López',
} as unknown as Employee

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  employee,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExtraDayForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseExtraDayFormReturn = {
      ...defaultHookReturn,
      form: {
        register: vi.fn((name: string) => ({ name, onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() })),
        watch: vi.fn((field: string) => field === 'salary_type' ? 'registered' : 'legal'),
        setValue: mockSetValue,
        handleSubmit: vi.fn(),
        formState: { errors: {} },
      },
      handleSubmit: mockHandleSubmit,
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('does not render when isOpen=false', () => {
    render(<ExtraDayForm {...baseProps} isOpen={false} />)
    expect(screen.queryByTestId('slide-panel')).toBeNull()
  })

  it('renders panel with employee name in title', () => {
    render(<ExtraDayForm {...baseProps} />)
    expect(screen.getByTestId('panel-title').textContent).toContain('Ana López')
  })

  it('shows registered daily wage label', () => {
    render(<ExtraDayForm {...baseProps} />)
    expect(screen.getByText('Salario registrado')).toBeTruthy()
  })

  it('shows salary custom input only when salary_type is custom', () => {
    mockUseExtraDayFormReturn = {
      ...mockUseExtraDayFormReturn,
      form: {
        ...mockUseExtraDayFormReturn.form,
        watch: vi.fn((field: string) => field === 'salary_type' ? 'custom' : 'legal'),
      },
    }

    render(<ExtraDayForm {...baseProps} />)

    // salary_pct input is rendered when salary_type=custom
    const numberInputs = screen.getAllByRole('spinbutton')
    expect(numberInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('does not show salary_pct input when salary_type is registered', () => {
    render(<ExtraDayForm {...baseProps} />)
    // With salary_type=registered and prima_type=legal, no number inputs for pct
    const numberInputs = screen.queryAllByRole('spinbutton')
    expect(numberInputs).toHaveLength(0)
  })

  it('shows prima custom input only when prima_type is custom', () => {
    mockUseExtraDayFormReturn = {
      ...mockUseExtraDayFormReturn,
      form: {
        ...mockUseExtraDayFormReturn.form,
        watch: vi.fn((field: string) => field === 'salary_type' ? 'registered' : 'custom'),
      },
    }

    render(<ExtraDayForm {...baseProps} />)

    const numberInputs = screen.getAllByRole('spinbutton')
    expect(numberInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('shows summary section with Total label', () => {
    render(<ExtraDayForm {...baseProps} />)
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('Resumen del día')).toBeTruthy()
  })

  it('shows no-wage error when hasNoWage=true', () => {
    mockUseExtraDayFormReturn = { ...mockUseExtraDayFormReturn, hasNoWage: true }

    render(<ExtraDayForm {...baseProps} />)

    expect(screen.getByText(/no tiene historial de salario/)).toBeTruthy()
  })

  it('hides no-wage error when hasNoWage=false', () => {
    render(<ExtraDayForm {...baseProps} />)
    expect(screen.queryByText(/no tiene historial de salario/)).toBeNull()
  })

  it('disables submit button when hasNoWage=true', () => {
    mockUseExtraDayFormReturn = { ...mockUseExtraDayFormReturn, hasNoWage: true }

    render(<ExtraDayForm {...baseProps} />)

    expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables submit button when isPending=true', () => {
    mockUseExtraDayFormReturn = { ...mockUseExtraDayFormReturn, isPending: true }

    render(<ExtraDayForm {...baseProps} />)

    expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('disables submit button while wages are loading', () => {
    mockUseExtraDayFormReturn = { ...mockUseExtraDayFormReturn, isLoadingWages: true }

    render(<ExtraDayForm {...baseProps} />)

    expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables submit button when ready', () => {
    render(<ExtraDayForm {...baseProps} />)
    expect((screen.getByTestId('submit-btn') as HTMLButtonElement).disabled).toBe(false)
  })

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<ExtraDayForm {...baseProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('cancel-btn'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('resets salary_pct to 100 when salary_type radio changes to registered', () => {
    mockUseExtraDayFormReturn = {
      ...mockUseExtraDayFormReturn,
      form: {
        ...mockUseExtraDayFormReturn.form,
        watch: vi.fn((field: string) => field === 'salary_type' ? 'custom' : 'legal'),
      },
    }
    const setValueSpy = vi.fn()
    mockUseExtraDayFormReturn.form.setValue = setValueSpy

    render(<ExtraDayForm {...baseProps} />)

    // Click the "registered" radio
    const registeredRadio = screen.getByDisplayValue('registered')
    fireEvent.click(registeredRadio)

    expect(setValueSpy).toHaveBeenCalledWith('salary_type', 'registered')
    expect(setValueSpy).toHaveBeenCalledWith('salary_pct', 100)
  })

  it('resets prima_pct to 100 when prima_type radio changes to legal', () => {
    mockUseExtraDayFormReturn = {
      ...mockUseExtraDayFormReturn,
      form: {
        ...mockUseExtraDayFormReturn.form,
        watch: vi.fn((field: string) => field === 'salary_type' ? 'registered' : 'custom'),
      },
    }
    const setValueSpy = vi.fn()
    mockUseExtraDayFormReturn.form.setValue = setValueSpy

    render(<ExtraDayForm {...baseProps} />)

    const legalRadio = screen.getByDisplayValue('legal')
    fireEvent.click(legalRadio)

    expect(setValueSpy).toHaveBeenCalledWith('prima_type', 'legal')
    expect(setValueSpy).toHaveBeenCalledWith('prima_pct', 100)
  })
})
