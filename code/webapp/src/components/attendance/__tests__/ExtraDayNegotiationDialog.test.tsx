/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { ExtraDayNegotiationDialog } from '../ExtraDayNegotiationDialog'
import type { ExtraDayNegotiationDialogProps } from '../ExtraDayNegotiationDialog'
import type { TodayAttendanceEmployee } from '@/types/attendance'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const employee: TodayAttendanceEmployee = {
  id: 'emp-001',
  code: 'EMP001',
  user: {
    first_name: 'María',
    last_name: 'García',
  },
  roles: ['mesero'],
  daily_wage: null,
}

function makeProps(overrides: Partial<ExtraDayNegotiationDialogProps> = {}): ExtraDayNegotiationDialogProps {
  return {
    employee,
    date: '2026-04-20',
    registeredDailyWage: 200,
    isPending: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — rendering', () => {
  it('renders the dialog title', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps()} />)
    expect(getByText('Día extra express')).toBeDefined()
  })

  it('renders employee name', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps()} />)
    expect(getByText(/García, María/)).toBeDefined()
  })

  it('renders the date', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps()} />)
    expect(getByText('2026-04-20')).toBeDefined()
  })

  it('shows registered daily wage when provided', () => {
    const { getAllByText } = render(<ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />)
    expect(getAllByText(/\$200\.00/).length).toBeGreaterThan(0)
  })

  it('shows "(no configurado)" when daily wage is null', () => {
    const { getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: null })} />,
    )
    expect(getByText(/no configurado/)).toBeDefined()
  })

  it('renders the "Aprobar y continuar" submit button', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps()} />)
    expect(getByText('Aprobar y continuar')).toBeDefined()
  })

  it('renders the cancel button', () => {
    const { getAllByText } = render(<ExtraDayNegotiationDialog {...makeProps()} />)
    // There's both the X button and the text "Cancelar" button
    expect(getAllByText('Cancelar').length).toBeGreaterThan(0)
  })
})

// ── Cancel interactions ───────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — cancel', () => {
  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    const { getAllByText } = render(<ExtraDayNegotiationDialog {...makeProps({ onCancel })} />)
    fireEvent.click(getAllByText('Cancelar')[0]!)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when X button is clicked', () => {
    const onCancel = vi.fn()
    const { getByLabelText } = render(<ExtraDayNegotiationDialog {...makeProps({ onCancel })} />)
    fireEvent.click(getByLabelText('Cancelar'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn()
    const { getByLabelText } = render(<ExtraDayNegotiationDialog {...makeProps({ onCancel })} />)
    fireEvent.click(getByLabelText('Cerrar diálogo'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onCancel on Escape keydown', () => {
    const onCancel = vi.fn()
    render(<ExtraDayNegotiationDialog {...makeProps({ onCancel })} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('does NOT call onCancel on Escape when isPending', () => {
    const onCancel = vi.fn()
    render(<ExtraDayNegotiationDialog {...makeProps({ onCancel, isPending: true })} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does NOT call onCancel on backdrop click when isPending', () => {
    const onCancel = vi.fn()
    const { getByLabelText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ onCancel, isPending: true })} />,
    )
    fireEvent.click(getByLabelText('Cerrar diálogo'))
    expect(onCancel).not.toHaveBeenCalled()
  })
})

// ── Submit ────────────────────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — submit', () => {
  it('calls onConfirm with agreed_daily_wage, prima_percent and notes', async () => {
    const onConfirm = vi.fn()
    const { getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ onConfirm, registeredDailyWage: 200 })} />,
    )
    fireEvent.click(getByText('Aprobar y continuar'))
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        agreed_daily_wage: 200,
        prima_percent: 100,
        notes: '',
      }),
    )
  })

  it('includes notes in the payload when typed', async () => {
    const onConfirm = vi.fn()
    const { getByPlaceholderText, getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ onConfirm, registeredDailyWage: 200 })} />,
    )
    fireEvent.change(getByPlaceholderText(/Motivo del día extra/), {
      target: { value: 'Día de evento especial' },
    })
    fireEvent.click(getByText('Aprobar y continuar'))
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'Día de evento especial' }),
      ),
    )
  })

  it('shows validation error when notes exceed 500 chars', async () => {
    const { getByPlaceholderText, getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps()} />,
    )
    fireEvent.change(getByPlaceholderText(/Motivo del día extra/), {
      target: { value: 'a'.repeat(501) },
    })
    fireEvent.click(getByText('Aprobar y continuar'))
    await waitFor(() => expect(getByText('Máximo 500 caracteres')).toBeDefined())
  })
})

// ── Pending state ─────────────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — isPending', () => {
  it('shows "Registrando…" on the submit button when isPending', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps({ isPending: true })} />)
    expect(getByText('Registrando…')).toBeDefined()
  })

  it('disables the submit button when isPending', () => {
    const { getByText } = render(<ExtraDayNegotiationDialog {...makeProps({ isPending: true })} />)
    const btn = getByText('Registrando…').closest('button') as HTMLButtonElement | null
    expect(btn?.disabled).toBe(true)
  })

  it('disables cancel button when isPending', () => {
    const { getAllByText } = render(<ExtraDayNegotiationDialog {...makeProps({ isPending: true })} />)
    const cancelBtn = getAllByText('Cancelar')[0]!.closest('button') as HTMLButtonElement | null
    expect(cancelBtn?.disabled).toBe(true)
  })
})

// ── Salary / prima modes ──────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — salary modes', () => {
  it('shows salary custom inputs when "Salario negociado" radio is selected', () => {
    const { getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />,
    )
    fireEvent.click(getByText('Salario negociado'))
    // Label text for custom salary inputs appears
    expect(getByText('% del salario')).toBeDefined()
    expect(getByText('Monto ($)')).toBeDefined()
  })

  it('defaults to "registered" radio when wage is provided', () => {
    render(<ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />)
    // Portal renders to document.body, so query from there
    const radios = document.querySelectorAll('input[name="salary_mode"]')
    const registered = Array.from(radios).find(r => (r as HTMLInputElement).value === 'registered') as HTMLInputElement
    expect(registered.checked).toBe(true)
  })

  it('defaults to "custom" radio when wage is null', () => {
    render(<ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: null })} />)
    const radios = document.querySelectorAll('input[name="salary_mode"]')
    const custom = Array.from(radios).find(r => (r as HTMLInputElement).value === 'custom') as HTMLInputElement
    expect(custom.checked).toBe(true)
  })
})

describe('ExtraDayNegotiationDialog — prima modes', () => {
  it('shows prima custom inputs when "Negociada" radio is selected', () => {
    const { getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />,
    )
    fireEvent.click(getByText('Negociada'))
    // Label text for custom prima inputs appears
    expect(getByText('% de prima')).toBeDefined()
  })

  it('defaults to "legal" prima radio', () => {
    render(<ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />)
    const radios = document.querySelectorAll('input[name="prima_mode"]')
    const legal = Array.from(radios).find(r => (r as HTMLInputElement).value === 'legal') as HTMLInputElement
    expect(legal.checked).toBe(true)
  })
})

// ── Totals summary ────────────────────────────────────────────────────────────

describe('ExtraDayNegotiationDialog — totals', () => {
  it('shows salary and prima in the summary', () => {
    const { getAllByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />,
    )
    // $200.00 appears multiple times (registered wage label + summary rows)
    expect(getAllByText('$200.00').length).toBeGreaterThan(0)
  })

  it('shows total as salary + prima', () => {
    const { getByText } = render(
      <ExtraDayNegotiationDialog {...makeProps({ registeredDailyWage: 200 })} />,
    )
    expect(getByText('$400.00')).toBeDefined()
  })
})
