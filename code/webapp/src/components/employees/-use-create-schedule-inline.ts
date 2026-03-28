import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-provider'
import { scheduleApi } from '@/services/schedule-api'
import { DAY_LABELS, LUNCH_DURATION_OPTIONS } from '@/types/schedule'

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    effective_from:          z.string().min(1, 'La fecha de vigencia es requerida'),
    expected_start:          z.string().min(1, 'La hora de entrada es requerida'),
    expected_lunch_start:    z.string().optional(),
    lunch_duration_minutes:  z.string().optional(),
    expected_end:            z.string().min(1, 'La hora de salida es requerida'),
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

function addMinutesToTime(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildPayload(values: CreateScheduleSimpleValues) {
  const lunchStart   = values.expected_lunch_start || null
  const lunchMinutes = values.lunch_duration_minutes ? Number(values.lunch_duration_minutes) : null
  const lunchEnd     = lunchStart && lunchMinutes ? addMinutesToTime(lunchStart, lunchMinutes) : null

  const restDayCount = DOW_KEYS.filter((k) => values[k]).length
  const workingDays  = 7 - restDayCount

  const days = DOW_KEYS.map((key, idx) => {
    const dow    = idx + 1
    const isOff  = values[key]
    return {
      day_of_week:            dow,
      is_day_off:             isOff,
      expected_start:         isOff ? null : values.expected_start,
      expected_lunch_start:   isOff ? null : lunchStart,
      expected_lunch_end:     isOff ? null : lunchEnd,
      lunch_duration_minutes: isOff ? null : lunchMinutes,
      expected_end:           isOff ? null : values.expected_end,
    }
  })

  return {
    effective_from:         values.effective_from,
    workday_type:           'FULL' as const,
    working_days_per_week:  workingDays,
    days,
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCreateScheduleInline(
  employeeId: string,
  periodId: string | null,
  onSuccess: () => void,
  initialEffectiveFrom?: string,
) {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const form = useForm<CreateScheduleSimpleValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      effective_from:         initialEffectiveFrom ?? '',
      expected_start:         '13:00',
      expected_lunch_start:   '',
      lunch_duration_minutes: '',
      expected_end:           '22:00',
      dow_1_off: false,
      dow_2_off: false,
      dow_3_off: false,
      dow_4_off: false,
      dow_5_off: false,
      dow_6_off: true,  // Saturday off by default
      dow_7_off: true,  // Sunday off by default
    },
  })

  const mutation = useMutation({
    mutationFn: (values: CreateScheduleSimpleValues) => {
      if (!periodId) return Promise.reject(new Error('Sin período laboral'))
      return scheduleApi.createPayload(periodId, buildPayload(values))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees', employeeId, 'current-schedule'] })
      showSuccess('Horario creado correctamente')
      form.reset()
      onSuccess()
    },
    onError: () => {
      showError('Error al crear el horario. Verifica los datos e intenta de nuevo.')
    },
  })

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values))

  return {
    form,
    onSubmit,
    isPending: mutation.isPending,
    isError:   mutation.isError,
    dowKeys:   DOW_KEYS,
    dayLabels: DAY_LABELS,
    lunchOptions: LUNCH_DURATION_OPTIONS,
  }
}
