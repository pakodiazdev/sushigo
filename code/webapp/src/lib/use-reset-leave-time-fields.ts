import { useEffect } from 'react'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

interface LeaveTimeFields {
  time_mode?: string | null
  scheduled_start_time?: string | null
  scheduled_end_time?: string | null
}

// Shared by the self-service leave-request form and the admin direct-leave dialog — both reset the same PROPORTIONAL_HOURS-only fields the same way.
export function useResetLeaveTimeFields<T extends FieldValues & LeaveTimeFields>(
  form: UseFormReturn<T>,
  isProportionalHours: boolean,
  watchedTimeMode: string | null | undefined
): void {
  useEffect(() => {
    if (!isProportionalHours) {
      form.setValue('time_mode' as Path<T>, null as T[Path<T>])
      form.setValue('scheduled_start_time' as Path<T>, null as T[Path<T>])
      form.setValue('scheduled_end_time' as Path<T>, null as T[Path<T>])
      form.clearErrors(['time_mode', 'scheduled_start_time', 'scheduled_end_time'] as Path<T>[])
    }
  }, [isProportionalHours, form])

  useEffect(() => {
    if (watchedTimeMode !== 'SCHEDULED') {
      form.setValue('scheduled_end_time' as Path<T>, null as T[Path<T>])
      form.clearErrors('scheduled_end_time' as Path<T>)
    }
  }, [watchedTimeMode, form])
}
