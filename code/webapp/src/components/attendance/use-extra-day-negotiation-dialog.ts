import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'

// ── Schema ────────────────────────────────────────────────────────────────────

export const extraDayFormSchema = z.object({
  salary_mode:    z.enum(['registered', 'custom']),
  salary_percent: z.string(),
  salary_amount:  z.string(),
  prima_mode:     z.enum(['legal', 'custom']),
  prima_percent:  z.string(),
  prima_amount:   z.string(),
  notes:          z.string().max(500, 'Máximo 500 caracteres').optional(),
})

export type ExtraDayFormValues = z.infer<typeof extraDayFormSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface ExtraDayNegotiationDialogState {
  // Form binding (react-hook-form)
  register: UseFormRegister<ExtraDayFormValues>
  handleSubmit: ReturnType<typeof useForm<ExtraDayFormValues>>['handleSubmit']
  errors: FieldErrors<ExtraDayFormValues>
  // Watched field values (exposed so the component stays purely presentational)
  salaryMode: 'registered' | 'custom'
  salaryAmountRaw: string
  salaryPercentRaw: string
  primaMode: 'legal' | 'custom'
  primaPercentRaw: string
  primaAmountRaw: string
  // Derived totals
  effectiveSalary: number
  effectivePrima: number
  total: number
  // Setters
  setSalaryMode: (mode: 'registered' | 'custom') => void
  setPrimaMode: (mode: 'legal' | 'custom') => void
  // Cross-field change handlers
  handleSalaryPercentChange: (val: string) => void
  handleSalaryAmountChange: (val: string) => void
  handlePrimaPercentChange: (val: string) => void
  handlePrimaAmountChange: (val: string) => void
  finalPrimaPercent: number
}

/**
 * Logic hook for ExtraDayNegotiationDialog.
 *
 * All form fields (salary/prima modes, amounts, percent, notes) are owned by a
 * single react-hook-form instance.  Derived totals (effectiveSalary, etc.) are
 * computed from watched values so the component stays purely presentational.
 *
 * ## Why raw string values (no toFixed on the active input)?
 * Formatting the field the user is currently editing (e.g. binding
 * `value={n.toFixed(2)}`) resets the cursor to the end on every keystroke.
 * The fix: setValue updates only the *companion* cross-field, never the active
 * one — the active input keeps the exact string the user typed.
 */
export function useExtraDayNegotiationDialog(
  registeredDailyWage: number | null,
): ExtraDayNegotiationDialogState {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExtraDayFormValues>({
    resolver: zodResolver(extraDayFormSchema),
    defaultValues: {
      salary_mode:    registeredDailyWage === null ? 'custom' : 'registered',
      salary_percent: '100.00',
      salary_amount:  (registeredDailyWage ?? 0).toFixed(2),
      prima_mode:     'legal',
      prima_percent:  '100.00',
      prima_amount:   (registeredDailyWage ?? 0).toFixed(2),
      notes:          '',
    },
  })

  // Watch all fields used for derived computations and cross-field sync.
  const salaryMode       = watch('salary_mode')
  const salaryAmountRaw  = watch('salary_amount')
  const salaryPercentRaw = watch('salary_percent')
  const primaMode        = watch('prima_mode')
  const primaPercentRaw  = watch('prima_percent')
  const primaAmountRaw   = watch('prima_amount')

  // Derived numeric values.
  const salaryAmount = Number.parseFloat(salaryAmountRaw) || 0
  const primaAmount  = Number.parseFloat(primaAmountRaw)  || 0
  const primaPercent = Number.parseFloat(primaPercentRaw) || 0

  const effectiveSalary = salaryMode === 'registered' ? (registeredDailyWage ?? 0) : salaryAmount
  const effectivePrima  = primaMode  === 'legal'      ? effectiveSalary            : primaAmount
  // Nota: El 7° día (1/6) ya está incluido en el salario semanal del empleado.
  // En un día de descanso trabajado, solo se paga salario + prima (no otro 1/6).
  const total           = effectiveSalary + effectivePrima

  // Sync raw values when registeredDailyWage prop arrives (e.g. first load).
  useEffect(() => {
    if (registeredDailyWage !== null) {
      setValue('salary_amount',  registeredDailyWage.toFixed(2))
      setValue('salary_percent', '100.00')
      setValue('salary_mode',    'registered')
    }
  }, [registeredDailyWage, setValue])

  // Sync prima fields when effectiveSalary changes while in 'legal' mode.
  useEffect(() => {
    if (primaMode === 'legal') {
      setValue('prima_amount',  effectiveSalary.toFixed(2))
      setValue('prima_percent', '100.00')
    }
  }, [effectiveSalary, primaMode, setValue])

  // ── Salary handlers ──────────────────────────────────────────────────────────

  function handleSalaryPercentChange(val: string) {
    // Keep raw string in the active field — no formatting to avoid cursor jump.
    setValue('salary_percent', val)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      const pct = Number.parseFloat(val) || 0
      // Cross-field: format only the companion amount.
      setValue('salary_amount', ((registeredDailyWage * pct) / 100).toFixed(2))
    }
  }

  function handleSalaryAmountChange(val: string) {
    setValue('salary_amount', val)
    if (registeredDailyWage !== null && registeredDailyWage > 0) {
      const amt = Number.parseFloat(val) || 0
      setValue('salary_percent', ((amt / registeredDailyWage) * 100).toFixed(2))
    }
  }

  // ── Prima handlers ───────────────────────────────────────────────────────────

  function handlePrimaPercentChange(val: string) {
    setValue('prima_percent', val)
    const pct = Number.parseFloat(val) || 0
    setValue('prima_amount', ((effectiveSalary * pct) / 100).toFixed(2))
  }

  function handlePrimaAmountChange(val: string) {
    setValue('prima_amount', val)
    if (effectiveSalary > 0) {
      const amt = Number.parseFloat(val) || 0
      setValue('prima_percent', ((amt / effectiveSalary) * 100).toFixed(2))
    }
  }

  const finalPrimaPercent = primaMode === 'legal' ? 100 : primaPercent

  return {
    register,
    handleSubmit,
    errors,
    salaryMode,
    salaryAmountRaw,
    salaryPercentRaw,
    primaMode,
    primaPercentRaw,
    primaAmountRaw,
    effectiveSalary,
    effectivePrima,
    total,
    setSalaryMode: (mode) => setValue('salary_mode', mode),
    setPrimaMode:  (mode) => setValue('prima_mode',  mode),
    handleSalaryPercentChange,
    handleSalaryAmountChange,
    handlePrimaPercentChange,
    handlePrimaAmountChange,
    finalPrimaPercent,
  }
}
