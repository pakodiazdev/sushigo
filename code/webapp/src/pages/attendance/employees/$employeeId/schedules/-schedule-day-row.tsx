import { useFormContext, useWatch } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { DAY_LABELS, LUNCH_DURATION_OPTIONS } from '@/types/schedule'
import type { CreateScheduleFormValues } from '@/types/schedule'

interface ScheduleDayRowProps {
  index: number
}

export function ScheduleDayRow({ index }: ScheduleDayRowProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<CreateScheduleFormValues>()

  const isDayOff = useWatch<CreateScheduleFormValues>({
    name: `days.${index}.is_day_off`,
  }) as boolean

  const dayOfWeek = useWatch<CreateScheduleFormValues>({
    name: `days.${index}.day_of_week`,
  }) as number

  const dayErrors = errors.days?.[index]

  return (
    <tr className="border-b last:border-0">
      {/* Day label */}
      <td className="py-2 pr-4 font-medium text-sm w-28">
        {DAY_LABELS[dayOfWeek]}
      </td>

      {/* Day-off toggle */}
      <td className="py-2 pr-4 w-28">
        <ToggleSwitch
          label=""
          checked={isDayOff}
          onChange={(val) => {
            setValue(`days.${index}.is_day_off`, val, { shouldValidate: true })
            if (val) {
              setValue(`days.${index}.expected_start`, '')
              setValue(`days.${index}.expected_lunch_start`, '')
              setValue(`days.${index}.lunch_duration_minutes`, '')
              setValue(`days.${index}.expected_end`, '')
            }
          }}
        />
      </td>

      {/* Expected start */}
      <td className="py-2 pr-2">
        <Input
          type="time"
          disabled={isDayOff}
          error={!!dayErrors?.expected_start}
          {...register(`days.${index}.expected_start`)}
          className="w-28"
        />
        {dayErrors?.expected_start && (
          <p className="text-xs text-red-600 mt-0.5">{dayErrors.expected_start.message}</p>
        )}
      </td>

      {/* Lunch start */}
      <td className="py-2 pr-2">
        <Input
          type="time"
          disabled={isDayOff}
          {...register(`days.${index}.expected_lunch_start`)}
          className="w-28"
        />
      </td>

      {/* Lunch duration select */}
      <td className="py-2 pr-2">
        <select
          disabled={isDayOff}
          {...register(`days.${index}.lunch_duration_minutes`)}
          className="h-9 w-32 rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {LUNCH_DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      {/* Expected end */}
      <td className="py-2">
        <Input
          type="time"
          disabled={isDayOff}
          error={!!dayErrors?.expected_end}
          {...register(`days.${index}.expected_end`)}
          className="w-28"
        />
        {dayErrors?.expected_end && (
          <p className="text-xs text-red-600 mt-0.5">{dayErrors.expected_end.message}</p>
        )}
      </td>
    </tr>
  )
}
