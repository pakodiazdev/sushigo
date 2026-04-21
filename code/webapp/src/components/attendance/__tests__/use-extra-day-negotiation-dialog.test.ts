// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExtraDayNegotiationDialog } from '../use-extra-day-negotiation-dialog'

// ── Helpers ───────────────────────────────────────────────────────────────────

function render(registeredDailyWage: number | null) {
  return renderHook(
    ({ wage }: { wage: number | null }) => useExtraDayNegotiationDialog(wage),
    { initialProps: { wage: registeredDailyWage } },
  )
}

// ── Initial state ─────────────────────────────────────────────────────────────

describe('initial state — with registered wage', () => {
  it('defaults to registered mode', () => {
    const { result } = render(200)
    expect(result.current.salaryMode).toBe('registered')
  })

  it('initialises salaryAmountRaw from registeredDailyWage', () => {
    const { result } = render(200)
    expect(result.current.salaryAmountRaw).toBe('200.00')
  })

  it('initialises salaryPercentRaw to 100.00', () => {
    const { result } = render(200)
    expect(result.current.salaryPercentRaw).toBe('100.00')
  })

  it('effectiveSalary equals registeredDailyWage in registered mode', () => {
    const { result } = render(200)
    expect(result.current.effectiveSalary).toBe(200)
  })

  it('defaults to legal prima mode', () => {
    const { result } = render(200)
    expect(result.current.primaMode).toBe('legal')
  })

  it('effectivePrima equals effectiveSalary in legal mode', () => {
    const { result } = render(200)
    expect(result.current.effectivePrima).toBe(200)
  })

  it('total is salary + prima', () => {
    const { result } = render(200)
    expect(result.current.total).toBe(400)
  })

  it('finalPrimaPercent is 100 in legal mode', () => {
    const { result } = render(200)
    expect(result.current.finalPrimaPercent).toBe(100)
  })
})

describe('initial state — without registered wage (null)', () => {
  it('defaults to custom mode', () => {
    const { result } = render(null)
    expect(result.current.salaryMode).toBe('custom')
  })

  it('effectiveSalary is 0 when wage is null and amount is 0', () => {
    const { result } = render(null)
    expect(result.current.effectiveSalary).toBe(0)
  })
})

// ── Salary mode ───────────────────────────────────────────────────────────────

describe('setSalaryMode', () => {
  it('switches to custom mode', () => {
    const { result } = render(200)
    act(() => result.current.setSalaryMode('custom'))
    expect(result.current.salaryMode).toBe('custom')
  })

  it('switches back to registered mode', () => {
    const { result } = render(200)
    act(() => result.current.setSalaryMode('custom'))
    act(() => result.current.setSalaryMode('registered'))
    expect(result.current.salaryMode).toBe('registered')
  })

  it('effectiveSalary uses salaryAmountRaw in custom mode', () => {
    const { result } = render(200)
    act(() => result.current.setSalaryMode('custom'))
    act(() => result.current.handleSalaryAmountChange('150'))
    expect(result.current.effectiveSalary).toBe(150)
  })
})

// ── handleSalaryPercentChange ────────────────────────────────────────────────

describe('handleSalaryPercentChange', () => {
  it('updates salaryPercentRaw', () => {
    const { result } = render(200)
    act(() => result.current.handleSalaryPercentChange('50'))
    expect(result.current.salaryPercentRaw).toBe('50')
  })

  it('cross-updates salaryAmountRaw from percent when wage is available', () => {
    const { result } = render(200)
    act(() => result.current.handleSalaryPercentChange('50'))
    expect(result.current.salaryAmountRaw).toBe('100.00')
  })

  it('does not update salaryAmountRaw when wage is null', () => {
    const { result } = render(null)
    const before = result.current.salaryAmountRaw
    act(() => result.current.handleSalaryPercentChange('50'))
    expect(result.current.salaryAmountRaw).toBe(before)
  })

  it('treats non-numeric input as 0 for cross-field', () => {
    const { result } = render(200)
    act(() => result.current.handleSalaryPercentChange(''))
    expect(result.current.salaryAmountRaw).toBe('0.00')
  })
})

// ── handleSalaryAmountChange ─────────────────────────────────────────────────

describe('handleSalaryAmountChange', () => {
  it('updates salaryAmountRaw', () => {
    const { result } = render(200)
    act(() => result.current.handleSalaryAmountChange('150'))
    expect(result.current.salaryAmountRaw).toBe('150')
  })

  it('cross-updates salaryPercentRaw from amount when wage is available', () => {
    const { result } = render(200)
    act(() => result.current.handleSalaryAmountChange('100'))
    expect(result.current.salaryPercentRaw).toBe('50.00')
  })

  it('does not update salaryPercentRaw when wage is null', () => {
    const { result } = render(null)
    act(() => result.current.handleSalaryAmountChange('100'))
    // percent stays at the default '100.00' (no cross-update without a base wage)
    expect(result.current.salaryPercentRaw).toBe('100.00')
  })
})

// ── Prima mode ────────────────────────────────────────────────────────────────

describe('setPrimaMode', () => {
  it('switches to custom prima mode', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    expect(result.current.primaMode).toBe('custom')
  })

  it('finalPrimaPercent reflects primaPercentRaw in custom mode', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaPercentChange('50'))
    expect(result.current.finalPrimaPercent).toBe(50)
  })

  it('effectivePrima uses primaAmountRaw in custom mode', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaAmountChange('80'))
    expect(result.current.effectivePrima).toBe(80)
  })
})

// ── handlePrimaPercentChange ─────────────────────────────────────────────────

describe('handlePrimaPercentChange', () => {
  it('updates primaPercentRaw', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaPercentChange('75'))
    expect(result.current.primaPercentRaw).toBe('75')
  })

  it('cross-updates primaAmountRaw based on effectiveSalary', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaPercentChange('50'))
    expect(result.current.primaAmountRaw).toBe('100.00')
  })
})

// ── handlePrimaAmountChange ──────────────────────────────────────────────────

describe('handlePrimaAmountChange', () => {
  it('updates primaAmountRaw', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaAmountChange('60'))
    expect(result.current.primaAmountRaw).toBe('60')
  })

  it('cross-updates primaPercentRaw when effectiveSalary > 0', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaAmountChange('100'))
    expect(result.current.primaPercentRaw).toBe('50.00')
  })

  it('does not update primaPercentRaw when effectiveSalary is 0', () => {
    const { result } = render(null)
    act(() => result.current.setPrimaMode('custom'))
    const before = result.current.primaPercentRaw
    act(() => result.current.handlePrimaAmountChange('100'))
    expect(result.current.primaPercentRaw).toBe(before)
  })
})

// ── Sync effects ──────────────────────────────────────────────────────────────

describe('sync on registeredDailyWage prop change', () => {
  it('updates salaryAmountRaw when wage changes from null to a value', () => {
    const { result, rerender } = renderHook(
      ({ wage }: { wage: number | null }) => useExtraDayNegotiationDialog(wage),
      { initialProps: { wage: null as number | null } },
    )
    rerender({ wage: 300 })
    expect(result.current.salaryAmountRaw).toBe('300.00')
  })

  it('switches back to registered mode when wage becomes available', () => {
    const { result, rerender } = renderHook(
      ({ wage }: { wage: number | null }) => useExtraDayNegotiationDialog(wage),
      { initialProps: { wage: null as number | null } },
    )
    rerender({ wage: 300 })
    expect(result.current.salaryMode).toBe('registered')
  })
})

describe('sync prima when effectiveSalary changes in legal mode', () => {
  it('primaAmountRaw tracks effectiveSalary in legal mode', () => {
    const { result } = render(200)
    // switch to custom salary mode and change the amount
    act(() => result.current.setSalaryMode('custom'))
    act(() => result.current.handleSalaryAmountChange('300'))
    // prima is still in legal mode → should sync
    expect(result.current.primaAmountRaw).toBe('300.00')
  })

  it('primaAmountRaw does NOT change when prima mode is custom', () => {
    const { result } = render(200)
    act(() => result.current.setPrimaMode('custom'))
    act(() => result.current.handlePrimaAmountChange('50'))
    act(() => result.current.setSalaryMode('custom'))
    act(() => result.current.handleSalaryAmountChange('300'))
    // custom prima should stay at 50
    expect(result.current.primaAmountRaw).toBe('50')
  })
})

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a number with dollar sign and 2 decimals', () => {
    const { result } = render(200)
    expect(result.current.formatCurrency(1234.5)).toBe('$1234.50')
  })

  it('formats zero', () => {
    const { result } = render(null)
    expect(result.current.formatCurrency(0)).toBe('$0.00')
  })
})
