import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleApi } from '@/services/schedule-api'
import type { ScheduleDay } from '@/types/schedule'
import { LUNCH_DURATION_OPTIONS } from '@/types/schedule'

// ── Types ─────────────────────────────────────────────────────────────────────

export type OverrideScope = 'single_date' | 'range' | 'indefinite'

export interface EditDayValues {
  is_day_off: boolean
  expected_start: string
  expected_lunch_start: string
  lunch_duration_minutes: string // string for select
  expected_end: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function dayToEditValues(day: ScheduleDay): EditDayValues {
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
function findNearestWorkingDay(dow: number, allDays: ScheduleDay[]): ScheduleDay | null {
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
  // Draft values for the day being edited
  const [editValues, setEditValues] = useState<EditDayValues | null>(null)
  // Whether the scope dialog is open
  const [scopeOpen, setScopeOpen] = useState(false)

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
      if (!periodId || !editingDow || !editValues) {
        return Promise.reject(new Error('Missing required state'))
      }

      const isDayOff = editValues.is_day_off
      const lunchDuration = isDayOff || !editValues.lunch_duration_minutes
        ? null
        : Number(editValues.lunch_duration_minutes)

      const lunchStart = isDayOff ? null : (editValues.expected_lunch_start || null)
      const lunchEnd = lunchStart && lunchDuration
        ? addMinutesToTime(lunchStart, lunchDuration)
        : null

      // Resolve effective_to based on scope
      let resolvedTo: string | null = null
      if (scope === 'single_date') {
        resolvedTo = effectiveFrom
      } else if (scope === 'range') {
        resolvedTo = effectiveTo
      } else {
        resolvedTo = null // indefinite
      }

      return scheduleApi.createDayOverride(periodId, {
        day_of_week: editingDow,
        effective_from: effectiveFrom,
        effective_to: resolvedTo,
        is_day_off: isDayOff,
        expected_start: isDayOff ? null : (editValues.expected_start || null),
        expected_lunch_start: lunchStart,
        expected_lunch_end: lunchEnd,
        lunch_duration_minutes: lunchDuration,
        expected_end: isDayOff ? null : (editValues.expected_end || null),
        note: note || null,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'current-schedule'] })
      setScopeOpen(false)
      setEditingDow(null)
      setEditValues(null)
    },
  })

  function startEdit(day: ScheduleDay, allDays?: ScheduleDay[]) {
    setEditingDow(day.day_of_week)

    // When editing a rest day, pre-fill times from the nearest previous working
    // day so the user gets a sensible starting point instead of empty fields.
    if (day.is_day_off && allDays) {
      const template = findNearestWorkingDay(day.day_of_week, allDays)
      if (template) {
        setEditValues({
          is_day_off: false,
          expected_start:          template.expected_start ?? '',
          expected_lunch_start:    template.expected_lunch_start ?? '',
          lunch_duration_minutes:  template.lunch_duration_minutes != null
            ? String(template.lunch_duration_minutes)
            : '',
          expected_end:            template.expected_end ?? '',
        })
        return
      }
    }

    setEditValues(dayToEditValues(day))
  }

  function cancelEdit() {
    setEditingDow(null)
    setEditValues(null)
  }

  function openScopeDialog() {
    setScopeOpen(true)
  }

  function closeScopeDialog() {
    setScopeOpen(false)
  }

  function updateEditField<K extends keyof EditDayValues>(field: K, value: EditDayValues[K]) {
    setEditValues((prev) => prev ? { ...prev, [field]: value } : prev)
  }

  function toggleDayOff(val: boolean) {
    setEditValues((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        is_day_off: val,
        expected_start: val ? '' : prev.expected_start,
        expected_lunch_start: val ? '' : prev.expected_lunch_start,
        lunch_duration_minutes: val ? '' : prev.lunch_duration_minutes,
        expected_end: val ? '' : prev.expected_end,
      }
    })
  }

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
