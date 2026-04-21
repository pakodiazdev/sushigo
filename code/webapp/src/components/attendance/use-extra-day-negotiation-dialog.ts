import { useState, useEffect } from 'react'

export interface ExtraDayNegotiationDialogState {
  salaryMode: 'registered' | 'custom'
  /** Raw string bound directly to the input — prevents cursor-jump on controlled inputs. */
  salaryAmountRaw: string
  salaryPercentRaw: string
  primaMode: 'legal' | 'custom'
  primaPercentRaw: string
  primaAmountRaw: string
  effectiveSalary: number
  effectivePrima: number
  total: number
  setSalaryMode: (mode: 'registered' | 'custom') => void
  setPrimaMode: (mode: 'legal' | 'custom') => void
  handleSalaryPercentChange: (val: string) => void
  handleSalaryAmountChange: (val: string) => void
  handlePrimaPercentChange: (val: string) => void
  handlePrimaAmountChange: (val: string) => void
  formatCurrency: (amount: number) => string
  finalPrimaPercent: number
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

/**
 * Logic hook for ExtraDayNegotiationDialog.
 *
 * Owns all salary/prima state, derived totals and change handlers.
 * When registeredDailyWage is null, defaults to custom mode so the
 * submit button is immediately usable.
 *
 * ## Why raw string state?
 * Storing numbers and binding `value={n.toFixed(2)}` causes React to replace
 * the input value on every keystroke, which resets the cursor to the end of
 * the string.  By storing the raw string the user typed and only formatting
 * (toFixed) the *companion* cross-field value, the active input stays as-is
 * while the paired field still shows a clean formatted number.
 */
export function useExtraDayNegotiationDialog(
  registeredDailyWage: number | null,
): ExtraDayNegotiationDialogState {
  // Default to 'custom' when no registered wage is available so the dialog
  // is usable immediately (effectiveSalary > 0 enables the submit button).
  const [salaryMode, setSalaryMode] = useState<'registered' | 'custom'>(
    registeredDailyWage === null ? 'custom' : 'registered',
  )

  // Raw strings bound to the inputs — never formatted on the field being edited.
  const [salaryPercentRaw, setSalaryPercentRaw] = useState('100.00')
  const [salaryAmountRaw, setSalaryAmountRaw] = useState(
    () => (registeredDailyWage ?? 0).toFixed(2),
  )

  const [primaMode, setPrimaMode] = useState<'legal' | 'custom'>('legal')
  const [primaPercentRaw, setPrimaPercentRaw] = useState('100.00')
  const [primaAmountRaw, setPrimaAmountRaw] = useState(
    () => (registeredDailyWage ?? 0).toFixed(2),
  )

  // Derived numeric values used for computations and summary display.
  const salaryAmount = Number.parseFloat(salaryAmountRaw) || 0
  const primaAmount  = Number.parseFloat(primaAmountRaw)  || 0
  const primaPercent = Number.parseFloat(primaPercentRaw) || 0

  const effectiveSalary = salaryMode === 'registered' ? (registeredDailyWage ?? 0) : salaryAmount
  const effectivePrima  = primaMode === 'legal' ? effectiveSalary : primaAmount
  // Nota: El 7° día (1/6) ya está incluido en el salario semanal del empleado.
  // En un día de descanso trabajado, solo se paga salario + prima (no otro 1/6).
  const total           = effectiveSalary + effectivePrima

  // Sync raw strings when registeredDailyWage prop changes (e.g. first load).
  useEffect(() => {
    if (registeredDailyWage !== null) {
      setSalaryAmountRaw(registeredDailyWage.toFixed(2))
      setSalaryPercentRaw('100.00')
      setSalaryMode('registered')
    }
  }, [registeredDailyWage])

  // Sync prima raw strings when effective salary changes while in 'legal' mode.
  useEffect(() => {
    if (primaMode === 'legal') {
      setPrimaAmountRaw(effectiveSalary.toFixed(2))
      setPrimaPercentRaw('100.00')
    }
  }, [effectiveSalary, primaMode])

  // ── Salary handlers ──────────────────────────────────────────────────────────

  function handleSalaryPercentChange(val: string) {
    // Keep the raw string the user typed — no toFixed here.
    setSalaryPercentRaw(val)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      const pct = Number.parseFloat(val) || 0
      // Cross-field: format the companion amount nicely.
      setSalaryAmountRaw(((registeredDailyWage * pct) / 100).toFixed(2))
    }
  }

  function handleSalaryAmountChange(val: string) {
    setSalaryAmountRaw(val)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      const amt = Number.parseFloat(val) || 0
      setSalaryPercentRaw(((amt / registeredDailyWage) * 100).toFixed(2))
    }
  }

  // ── Prima handlers ───────────────────────────────────────────────────────────

  function handlePrimaPercentChange(val: string) {
    setPrimaPercentRaw(val)
    const pct = Number.parseFloat(val) || 0
    setPrimaAmountRaw(((effectiveSalary * pct) / 100).toFixed(2))
  }

  function handlePrimaAmountChange(val: string) {
    setPrimaAmountRaw(val)
    if (effectiveSalary > 0) {
      const amt = Number.parseFloat(val) || 0
      setPrimaPercentRaw(((amt / effectiveSalary) * 100).toFixed(2))
    }
  }

  const finalPrimaPercent = primaMode === 'legal' ? 100 : primaPercent

  return {
    salaryMode,
    salaryAmountRaw,
    salaryPercentRaw,
    primaMode,
    primaPercentRaw,
    primaAmountRaw,
    effectiveSalary,
    effectivePrima,
    total,
    setSalaryMode,
    setPrimaMode,
    handleSalaryPercentChange,
    handleSalaryAmountChange,
    handlePrimaPercentChange,
    handlePrimaAmountChange,
    formatCurrency,
    finalPrimaPercent,
  }
}
