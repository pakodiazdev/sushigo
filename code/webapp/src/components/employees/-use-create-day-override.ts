import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '@/services/schedule-api'
import type { ScheduleDay } from '@/types/schedule'
import { LUNCH_DURATION_OPTIONS } from '@/types/schedule'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Alcance temporal de un ajuste de día:
 *   single_date  → solo la fecha indicada (excepción puntual)
 *   range        → rango con fecha de fin (excepción temporal)
 *   indefinite   → desde la fecha indicada, sin fin (cambio permanente de ese día)
 */
export type OverrideScope = 'single_date' | 'range' | 'indefinite'

export interface EditDayValues {
  is_day_off: boolean
  expected_start: string
  expected_lunch_start: string
  lunch_duration_minutes: string // string for select
  expected_end: string
}

// ── Schema ────────────────────────────────────────────────────────────────────

const editDaySchema = z.object({
  is_day_off: z.boolean(),
  expected_start: z.string(),
  expected_lunch_start: z.string(),
  lunch_duration_minutes: z.string(),
  expected_end: z.string(),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

export function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function dayToEditValues(day: ScheduleDay): EditDayValues {
  return {
    is_day_off: day.is_day_off,
    expected_start: day.expected_start ?? '',
    expected_lunch_start: day.expected_lunch_start ?? '',
    lunch_duration_minutes: day.lunch_duration_minutes != null ? String(day.lunch_duration_minutes) : '',
    expected_end: day.expected_end ?? '',
  }
}

/**
 * Find the closest previous working day (by day_of_week, wrapping around)
 * to use as a template when creating an override for a rest day.
 */
export function findNearestWorkingDay(dow: number, allDays: ScheduleDay[]): ScheduleDay | null {
  const working = allDays.filter((d) => !d.is_day_off && d.expected_start && d.expected_end)
  if (!working.length) return null
  // Build candidate order: the 6 days before `dow`, descending, wrapping 1-7
  const candidates = Array.from({ length: 6 }, (_, i) => ((dow - 2 - i + 7) % 7) + 1)
  return candidates.map((d) => working.find((w) => w.day_of_week === d)).find(Boolean) ?? null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateDayOverride(employeeId: string, periodId: string | null) {
  const queryClient = useQueryClient()

  // Which day_of_week is in edit mode (null = none)
  const [editingDow, setEditingDow] = useState<number | null>(null)
  // Whether the scope dialog is open
  const [scopeOpen, setScopeOpen] = useState(false)

  const editForm = useForm<EditDayValues>({
    resolver: zodResolver(editDaySchema),
    mode: 'onChange',
    defaultValues: {
      is_day_off: false,
      expected_start: '',
      expected_lunch_start: '',
      lunch_duration_minutes: '',
      expected_end: '',
    },
  })

  const mutation = useMutation({
    mutationFn: ({
      scope,
      effectiveFrom,
      effectiveTo,
      note,
    }: {
      scope: OverrideScope
      effectiveFrom: string
      effectiveTo: string | null
      note: string
    }) => {
      const currentValues = editForm.getValues()

      if (!periodId || !editingDow || !currentValues) {
        return Promise.reject(new Error('Missing required state'))
      }

      const isDayOff = currentValues.is_day_off
      const lunchDuration = isDayOff || !currentValues.lunch_duration_minutes
        ? null
        : Number(currentValues.lunch_duration_minutes)

      const lunchStart = isDayOff ? null : (currentValues.expected_lunch_start || null)
      const lunchEnd = lunchStart && lunchDuration
        ? addMinutesToTime(lunchStart, lunchDuration)
        : null

      // Resolve effective_to based on scope
      // single_date  → same-day range (from = to)
      // range        → explicit end date chosen by user
      // indefinite   → no end date (permanent per-day adjustment)
      let resolvedTo: string | null = null // indefinite default
      if (scope === 'single_date') {
        resolvedTo = effectiveFrom
      } else if (scope === 'range') {
        resolvedTo = effectiveTo
      }

      return scheduleApi.createDayOverride(periodId, {
        day_of_week: editingDow,
        effective_from: effectiveFrom,
        effective_to: resolvedTo,
        is_day_off: isDayOff,
        expected_start: isDayOff ? null : (currentValues.expected_start || null),
        expected_lunch_start: lunchStart,
        expected_lunch_end: lunchEnd,
        lunch_duration_minutes: lunchDuration,
        expected_end: isDayOff ? null : (currentValues.expected_end || null),
        note: note || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'current-schedule'] })
      setScopeOpen(false)
      setEditingDow(null)
      editForm.reset()
    },
  })

  function startEdit(day: ScheduleDay, allDays?: ScheduleDay[], prefillValues?: EditDayValues) {
    setEditingDow(day.day_of_week)

    // When explicit pre-fill values are given (e.g. pre-loading from an active
    // permanent override), use them directly without any template logic.
    if (prefillValues) {
      editForm.reset(prefillValues)
      return
    }

    // When editing a rest day, pre-fill times from the nearest previous working
    // day so the user gets a sensible starting point instead of empty fields.
    if (day.is_day_off && allDays) {
      const template = findNearestWorkingDay(day.day_of_week, allDays)
      if (template) {
        editForm.reset({
          is_day_off: false,
          expected_start:         template.expected_start ?? '',
          expected_lunch_start:   template.expected_lunch_start ?? '',
          lunch_duration_minutes: template.lunch_duration_minutes != null
            ? String(template.lunch_duration_minutes)
            : '',
          expected_end:           template.expected_end ?? '',
        })
        return
      }
    }

    editForm.reset(dayToEditValues(day))
  }

  function cancelEdit() {
    setEditingDow(null)
    editForm.reset()
  }

  function openScopeDialog() {
    setScopeOpen(true)
  }

  function closeScopeDialog() {
    setScopeOpen(false)
  }

  function updateEditField<K extends keyof EditDayValues>(field: K, value: EditDayValues[K]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editForm.setValue(field, value as any, { shouldValidate: true })
  }

  function toggleDayOff(val: boolean) {
    const prev = editForm.getValues()
    editForm.reset({
      ...prev,
      is_day_off: val,
      expected_start: val ? '' : prev.expected_start,
      expected_lunch_start: val ? '' : prev.expected_lunch_start,
      lunch_duration_minutes: val ? '' : prev.lunch_duration_minutes,
      expected_end: val ? '' : prev.expected_end,
    })
  }

  const watchedValues = editForm.watch()
  const editValues: EditDayValues | null = editingDow !== null ? watchedValues : null

  // Check if there are validation errors for current edit values
  const editErrors = editValues && !editValues.is_day_off
    ? {
        expected_start: !editValues.expected_start ? 'Requerido' : null,
        expected_end: !editValues.expected_end ? 'Requerido' : null,
      }
    : { expected_start: null, expected_end: null }

  const hasEditErrors = !!(editErrors.expected_start || editErrors.expected_end)

  return {
    // Edit state
    editingDow,
    editValues,
    editErrors,
    hasEditErrors,
    startEdit,
    cancelEdit,
    updateEditField,
    toggleDayOff,
    openScopeDialog,
    // Scope dialog
    scopeOpen,
    closeScopeDialog,
    // Mutation
    submit: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    // Helpers
    lunchOptions: LUNCH_DURATION_OPTIONS,
  }
}
