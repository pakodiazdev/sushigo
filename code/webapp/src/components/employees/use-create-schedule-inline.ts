import { startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { scheduleApi } from '@/services/schedule-api'
import { DAY_LABELS, LUNCH_DURATION_OPTIONS } from '@/types/schedule'
import type { EmployeeSchedule } from '@/types/schedule'
import { todayDateCdmx } from '@/lib/datetime'
import { addDays } from '@/lib/week'
import { useApplicationClockStore } from '@/stores/clock.store'

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    effective_from: z.string().min(1, 'La fecha de vigencia es requerida'),
    expected_start: z.string().min(1, 'La hora de entrada es requerida'),
    expected_lunch_start: z.string().optional(),
    lunch_duration_minutes: z.string().optional(),
    expected_end: z.string().min(1, 'La hora de salida es requerida'),
    // One boolean per ISO day of week (1=Mon … 7=Sun)
    dow_1_off: z.boolean(),
    dow_2_off: z.boolean(),
    dow_3_off: z.boolean(),
    dow_4_off: z.boolean(),
    dow_5_off: z.boolean(),
    dow_6_off: z.boolean(),
    dow_7_off: z.boolean(),
  })
  .refine(
    (d) => !d.dow_1_off || !d.dow_2_off || !d.dow_3_off || !d.dow_4_off ||
      !d.dow_5_off || !d.dow_6_off || !d.dow_7_off,
    {
      message: 'Debe haber al menos un día laborable',
      path: ['dow_7_off'],
    }
  )

export type CreateScheduleSimpleValues = z.infer<typeof schema>

type DowKey = keyof Pick<
  CreateScheduleSimpleValues,
  'dow_1_off' | 'dow_2_off' | 'dow_3_off' | 'dow_4_off' | 'dow_5_off' | 'dow_6_off' | 'dow_7_off'
>

const DOW_KEYS: DowKey[] = [
  'dow_1_off', 'dow_2_off', 'dow_3_off', 'dow_4_off', 'dow_5_off', 'dow_6_off', 'dow_7_off',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the next Monday in YYYY-MM-DD format.
 * If today is Monday, returns today.
 */
export function getNextMonday(): string {
  const businessDate = useApplicationClockStore.getState().clockState?.business_date
  const today = businessDate ?? todayDateCdmx()
  const dayOfWeek = new Date(today + 'T00:00:00').getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  // If today is Monday (1), daysUntilMonday = 0
  // If today is Sunday (0), daysUntilMonday = 1
  // If today is Tuesday (2), daysUntilMonday = 6
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7 || 7
  return addDays(today, daysUntilMonday)
}

/**
 * Extracts default form values from an existing schedule.
 * Uses the first working day (by day_of_week order) as the reference for work hours.
 *
 * In 'edit' mode the schedule's own effective_from is kept (correcting the active
 * schedule in place); in 'create' mode it defaults to next Monday (replacing it).
 */
function extractDefaultsFromSchedule(
  schedule: EmployeeSchedule,
  mode: 'create' | 'edit' = 'create',
): Partial<CreateScheduleSimpleValues> {
  // Sort days by day_of_week and find the first working day to extract times
  const sortedDays = [...schedule.days].sort((a, b) => a.day_of_week - b.day_of_week)
  const workingDay = sortedDays.find(d => !d.is_day_off)

  return {
    effective_from: mode === 'edit' ? schedule.effective_from : getNextMonday(),
    expected_start: workingDay?.expected_start ?? '13:00',
    expected_lunch_start: workingDay?.expected_lunch_start ?? '',
    lunch_duration_minutes: workingDay?.lunch_duration_minutes == null
      ? ''
      : String(workingDay.lunch_duration_minutes),
    expected_end: workingDay?.expected_end ?? '22:00',
    dow_1_off: schedule.days.find(d => d.day_of_week === 1)?.is_day_off ?? false,
    dow_2_off: schedule.days.find(d => d.day_of_week === 2)?.is_day_off ?? false,
    dow_3_off: schedule.days.find(d => d.day_of_week === 3)?.is_day_off ?? false,
    dow_4_off: schedule.days.find(d => d.day_of_week === 4)?.is_day_off ?? false,
    dow_5_off: schedule.days.find(d => d.day_of_week === 5)?.is_day_off ?? false,
    dow_6_off: schedule.days.find(d => d.day_of_week === 6)?.is_day_off ?? true,
    dow_7_off: schedule.days.find(d => d.day_of_week === 7)?.is_day_off ?? true,
  }
}

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function buildPayload(values: CreateScheduleSimpleValues) {
  const lunchStart = values.expected_lunch_start || null
  const lunchMinutes = values.lunch_duration_minutes ? Number(values.lunch_duration_minutes) : null
  const lunchEnd = lunchStart && lunchMinutes ? addMinutesToTime(lunchStart, lunchMinutes) : null

  const restDayCount = DOW_KEYS.filter((k) => values[k]).length
  const workingDays = 7 - restDayCount

  const days = DOW_KEYS.map((key, idx) => {
    const dow = idx + 1
    const isOff = values[key]
    const effectiveLunchMinutes: number | null = (!isOff && lunchStart) ? lunchMinutes : null
    return {
      day_of_week: dow,
      is_day_off: isOff,
      expected_start: isOff ? null : values.expected_start,
      expected_lunch_start: isOff ? null : lunchStart,
      expected_lunch_end: isOff ? null : lunchEnd,
      lunch_duration_minutes: effectiveLunchMinutes,
      expected_end: isOff ? null : values.expected_end,
    }
  })

  return {
    effective_from: values.effective_from,
    workday_type: 'FULL' as const,
    working_days_per_week: workingDays,
    days,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateScheduleInline(
  employeeId: string,
  periodId: string | null,
  onSuccess: () => void,
  currentSchedule?: EmployeeSchedule | null,
  periodStartDate?: string,
  editScheduleId?: string,
) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const mode: 'create' | 'edit' = editScheduleId ? 'edit' : 'create'

  // Build default values: from current schedule if exists, otherwise sensible defaults
  const baseDefaults: CreateScheduleSimpleValues = {
    effective_from: '',
    expected_start: '13:00',
    expected_lunch_start: '',
    lunch_duration_minutes: '',
    expected_end: '22:00',
    dow_1_off: false,
    dow_2_off: false,
    dow_3_off: false,
    dow_4_off: false,
    dow_5_off: false,
    dow_6_off: true,  // Saturday off by default
    dow_7_off: true,  // Sunday off by default
  }

  const defaultValues = currentSchedule
    ? { ...baseDefaults, ...extractDefaultsFromSchedule(currentSchedule, mode) }
    : { ...baseDefaults, effective_from: periodStartDate ?? getNextMonday() }

  const form = useForm<CreateScheduleSimpleValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const mutation = useMutation({
    mutationFn: (values: CreateScheduleSimpleValues) => {
      if (mode === 'edit') {
        if (!editScheduleId) return Promise.reject(new Error('Sin horario'))
        return scheduleApi.update(editScheduleId, buildPayload(values))
      }
      if (!periodId) return Promise.reject(new Error('Sin período laboral'))
      return scheduleApi.createPayload(periodId, buildPayload(values))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'current-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['schedule-history', periodId] })
      form.reset()
      showSuccess(mode === 'edit' ? 'Horario actualizado correctamente' : 'Horario creado correctamente')
      startTransition(() => onSuccess())
    },
    onError: () => {
      showError(
        mode === 'edit'
          ? 'Error al actualizar el horario. Verifica los datos e intenta de nuevo.'
          : 'Error al crear el horario. Verifica los datos e intenta de nuevo.'
      )
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return {
    form,
    onSubmit,
    isPending: mutation.isPending,
    isError: mutation.isError,
    dowKeys: DOW_KEYS,
    dayLabels: DAY_LABELS,
    lunchOptions: LUNCH_DURATION_OPTIONS,
    mode,
  }
}
