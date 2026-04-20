import { useState, useEffect } from 'react'

export interface ExtraDayNegotiationDialogState {
  salaryMode: 'registered' | 'custom'
  salaryAmount: number
  salaryPercent: number
  primaMode: 'legal' | 'custom'
  primaPercent: number
  primaAmount: number
  effectiveSalary: number
  seventhDay: number
  effectivePrima: number
  total: number
  setSalaryMode: (mode: 'registered' | 'custom') => void
  setPrimaMode: (mode: 'legal' | 'custom') => void
  setPrimaPercent: (pct: number) => void
  setPrimaAmount: (amt: number) => void
  handleSalaryPercentChange: (val: string) => void
  handleSalaryAmountChange: (val: string) => void
  handlePrimaPercentChange: (val: string) => void
  handlePrimaAmountChange: (val: string) => void
  formatCurrency: (amount: number) => string
  finalPrimaPercent: number
}

/**
 * Logic hook for ExtraDayNegotiationDialog.
 *
 * Owns all salary/prima state, derived totals and change handlers.
 * When registeredDailyWage is null, defaults to custom mode so the
 * submit button is immediately usable.
 */
export function useExtraDayNegotiationDialog(
  registeredDailyWage: number | null,
): ExtraDayNegotiationDialogState {
  // Default to 'custom' when no registered wage is available so the dialog
  // is usable immediately (effectiveSalary > 0 enables the submit button).
  const [salaryMode, setSalaryMode] = useState<'registered' | 'custom'>(
    registeredDailyWage != null ? 'registered' : 'custom',
  )
  const [salaryAmount, setSalaryAmount] = useState<number>(registeredDailyWage ?? 0)
  const [salaryPercent, setSalaryPercent] = useState<number>(100)

  const [primaMode, setPrimaMode] = useState<'legal' | 'custom'>('legal')
  const [primaPercent, setPrimaPercent] = useState<number>(100)
  const [primaAmount, setPrimaAmount] = useState<number>(registeredDailyWage ?? 0)

  // Effective salary = registered wage (if mode = registered) or custom amount
  const effectiveSalary = salaryMode === 'registered' ? (registeredDailyWage ?? 0) : salaryAmount

  // Seventh-day part (1/6 of the daily wage, automatic per LFT)
  const seventhDay = effectiveSalary / 6

  // Effective prima = 100% of salary (legal) or custom
  const effectivePrima = primaMode === 'legal' ? effectiveSalary : primaAmount

  const total = effectiveSalary + seventhDay + effectivePrima

  // Sync salary state when registeredDailyWage prop changes
  useEffect(() => {
    if (registeredDailyWage !== null) {
      setSalaryAmount(registeredDailyWage)
      setSalaryPercent(100)
      setSalaryMode('registered')
    }
  }, [registeredDailyWage])

  // Sync prima amount when effective salary changes
  useEffect(() => {
    if (primaMode === 'legal') {
      setPrimaAmount(effectiveSalary)
      setPrimaPercent(100)
    }
  }, [effectiveSalary, primaMode])

  function handleSalaryPercentChange(val: string) {
    const pct = parseFloat(val) || 0
    setSalaryPercent(pct)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      setSalaryAmount((registeredDailyWage * pct) / 100)
    }
  }

  function handleSalaryAmountChange(val: string) {
    const amt = parseFloat(val) || 0
    setSalaryAmount(amt)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      setSalaryPercent((amt / registeredDailyWage) * 100)
    }
  }

  function handlePrimaPercentChange(val: string) {
    const pct = parseFloat(val) || 0
    setPrimaPercent(pct)
    setPrimaAmount((effectiveSalary * pct) / 100)
  }

  function handlePrimaAmountChange(val: string) {
    const amt = parseFloat(val) || 0
    setPrimaAmount(amt)
    if (effectiveSalary > 0) {
      setPrimaPercent((amt / effectiveSalary) * 100)
    }
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`
  }

  const finalPrimaPercent = primaMode === 'legal' ? 100 : primaPercent

  return {
    salaryMode,
    salaryAmount,
    salaryPercent,
    primaMode,
    primaPercent,
    primaAmount,
    effectiveSalary,
    seventhDay,
    effectivePrima,
    total,
    setSalaryMode,
    setPrimaMode,
    setPrimaPercent,
    setPrimaAmount,
    handleSalaryPercentChange,
    handleSalaryAmountChange,
    handlePrimaPercentChange,
    handlePrimaAmountChange,
    formatCurrency,
    finalPrimaPercent,
  }
}
