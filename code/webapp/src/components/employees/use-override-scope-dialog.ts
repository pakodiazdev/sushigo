import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { OverrideScope } from './-use-create-day-override'
import type { ScheduleDayOverride } from '@/types/schedule'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the next calendar date (local) that falls on the given ISO day-of-week (1=Mon … 7=Sun). */
export function nextDateForDow(dow: number): string {
  const jsTarget = dow === 7 ? 0 : dow
  const today = new Date()
  const daysAhead = (jsTarget - today.getDay() + 7) % 7 // 0 = today, >0 = next occurrence
  const result = new Date(today)
  result.setDate(today.getDate() + daysAhead)
  const y = result.getFullYear()
  const m = String(result.getMonth() + 1).padStart(2, '0')
  const d = String(result.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Detect existing overrides that overlap with the proposed [newFrom, newTo] range.
 * null newTo means indefinite (treated as +∞ via sentinel '9999-12-31').
 */
export function detectConflicts(
  newFrom: string,
  newTo: string | null,
  existing: ScheduleDayOverride[],
): ScheduleDayOverride[] {
  const INF = '9999-12-31'
  const newToStr = newTo ?? INF
  return existing.filter((o) => {
    const oToStr = o.effective_to ?? INF
    return newFrom <= oToStr && o.effective_from <= newToStr
  })
}

// ── Schema ────────────────────────────────────────────────────────────────────

const overrideScopeSchema = z
  .object({
    scope: z.enum(['single_date', 'range', 'indefinite']),
    effectiveFrom: z.string().min(1, 'La fecha es requerida'),
    effectiveTo: z.string(),
    note: z.string().max(255),
  })
  .refine(
    (data) =>
      data.scope !== 'range' || (!!data.effectiveTo && data.effectiveTo >= data.effectiveFrom),
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['effectiveTo'],
    },
  )

export type OverrideScopeFormValues = z.infer<typeof overrideScopeSchema>

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOverrideScopeDialog(
  dayOfWeek: number,
  existingOverrides: ScheduleDayOverride[],
  onSubmit: (params: {
    scope: OverrideScope
    effectiveFrom: string
    effectiveTo: string | null
    note: string
  }) => void,
) {
  const [step, setStep] = useState<'form' | 'conflicts'>('form')
  const [conflicts, setConflicts] = useState<ScheduleDayOverride[]>([])

  const form = useForm<OverrideScopeFormValues>({
    resolver: zodResolver(overrideScopeSchema),
    mode: 'onChange',
    defaultValues: {
      scope: 'single_date' as const,
      effectiveFrom: nextDateForDow(dayOfWeek),
      effectiveTo: '',
      note: '',
    },
  })

  const scope = form.watch('scope')
  const effectiveFrom = form.watch('effectiveFrom')

  function handleValidSubmit(values: OverrideScopeFormValues) {
    const resolvedTo =
      values.scope === 'single_date' ? values.effectiveFrom : (values.effectiveTo || null)
    const found = detectConflicts(values.effectiveFrom, resolvedTo, existingOverrides)
    if (found.length > 0) {
      setConflicts(found)
      setStep('conflicts')
    } else {
      onSubmit({
        scope: values.scope,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || null,
        note: values.note ?? '',
      })
    }
  }

  function handleConfirmConflicts() {
    const values = form.getValues()
    onSubmit({
      scope: values.scope,
      effectiveFrom: values.effectiveFrom,
      effectiveTo: values.effectiveTo || null,
      note: values.note ?? '',
    })
  }

  function backToForm() {
    setStep('form')
  }

  return {
    register: form.register,
    errors: form.formState.errors,
    isValid: form.formState.isValid,
    scope,
    effectiveFrom,
    step,
    conflicts,
    handlePrimaryClick: form.handleSubmit(handleValidSubmit),
    handleConfirmConflicts,
    backToForm,
  }
}
